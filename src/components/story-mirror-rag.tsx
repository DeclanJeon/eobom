"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { SurfaceCard, SoftBadge } from "@/components/ui-blocks";
import { StoryNarrativeCard } from "@/components/story-narrative-card";
import { buildStoryDetailHref } from "@/lib/story-mirror/story-links";
import type { StoryConnection } from "@/lib/mimo";

type Candidate = {
  chunkId: string;
  title: string;
  workTitle: string;
  locator: string | null;
  excerpt: string | null;
};

type Connection = {
  chunkId: string;
  title: string | null;
  workTitle: string | null;
  locator: string | null;
  connection: string;
  differentPerspective?: string | null;
};

type RagRunListItem = {
  id: string;
  createdAt: string;
  summary: string | null;
  connectionCount: number;
  corpusVersion: string;
};

type Status =
  | "idle"
  | "retrieving"
  | "streaming"
  | "complete"
  | "insufficient"
  | "error"
  | "denied";

type SseData = { event: string; data: unknown };

function parseBlock(block: string): SseData | null {
  let event = "";
  let data = "";
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data = line.slice(5).trim();
  }
  if (!event) return null;
  let parsed: unknown = undefined;
  try {
    parsed = data ? JSON.parse(data) : undefined;
  } catch {
    parsed = undefined;
  }
  return { event, data: parsed };
}

export function StoryMirrorRag({
  consented,
  initialRun,
  seedInput,
  seedLabel,
  storyConnections,
}: {
  consented: boolean;
  initialRun?: {
    id: string;
    createdAt: string;
    summary: string;
    connections: Connection[];
  } | null;
  seedInput?: string | null;
  seedLabel?: string | null;
  storyConnections?: StoryConnection[] | null;
}) {
  const [input, setInput] = useState(seedInput ?? "");
  const [showRefine, setShowRefine] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [summary, setSummary] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [viewingPast, setViewingPast] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<RagRunListItem[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const initRef = useRef(false);

  const reset = useCallback(() => {
    setCandidates([]);
    setConnections([]);
    setSummary("");
    setErrorMsg("");
    setViewingPast(false);
    setActiveRunId(null);
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (initialRun && status === "idle") {
      setSummary(initialRun.summary ?? "");
      setConnections(initialRun.connections ?? []);
      setStatus("complete");
      setViewingPast(true);
      setActiveRunId(initialRun.id);
    }
  }, [initialRun, status]);

  const toggleHistory = useCallback(async () => {
    if (historyOpen) {
      setHistoryOpen(false);
      return;
    }
    setHistoryOpen(true);
    if (history) return;
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/story-mirror/rag/runs", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as {
          runs: Array<{
            id: string;
            createdAt: string;
            summary: string | null;
            connectionCount: number;
            corpusVersion: string;
          }>;
        };
        setHistory(data.runs ?? []);
      }
    } catch {
      // ignore history fetch errors
    } finally {
      setHistoryLoading(false);
    }
  }, [historyOpen, history]);

  const openRun = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/story-mirror/rag/runs/${id}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        run: { summary: string; connections: Connection[] };
      };
      setSummary(data.run.summary ?? "");
      setConnections(data.run.connections ?? []);
      setCandidates([]);
      setErrorMsg("");
      setStatus("complete");
      setViewingPast(true);
      setActiveRunId(id);
    } catch {
      // ignore
    }
  }, []);

  const runConnection = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || status === "retrieving" || status === "streaming") return;

    reset();
    setStatus("retrieving");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/story-mirror/rag/runs/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: trimmed, locale: "ko" }),
        signal: controller.signal,
      });

      if (res.status === 403) {
        setStatus("denied");
        return;
      }
      if (!res.ok || !res.body) {
        setStatus("error");
        setErrorMsg("이야기를 불러오지 못했습니다.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const block = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const ev = parseBlock(block);
          if (!ev) continue;

          if (ev.event === "retrieval") {
            const d = ev.data as { candidates: Candidate[] };
            setCandidates(d.candidates ?? []);
            setStatus("streaming");
          } else if (ev.event === "delta") {
            setStatus("streaming");
          } else if (ev.event === "complete") {
            const d = ev.data as {
              summary: string;
              connections: Connection[];
            };
            setSummary(d.summary ?? "");
            setConnections(d.connections ?? []);
            setStatus("complete");
          } else if (ev.event === "insufficientEvidence") {
            setStatus("insufficient");
          } else if (ev.event === "error") {
            setStatus("error");
            const d = ev.data as { message?: string };
            setErrorMsg(d?.message ?? "이야기 생성 중 문제가 생겼어요.");
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setStatus("error");
      setErrorMsg("연결이 끊겼어요. 다시 시도해 주세요.");
    }
  }, [status, reset]);

  const submit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      void runConnection(input);
    },
    [input, runConnection]
  );

  const autoRanRef = useRef(false);
  useEffect(() => {
    if (autoRanRef.current) return;
    autoRanRef.current = true;
    // 회고는 있으나 사전 연결(storyConnections)이 없으면, 회고 내용을 바탕으로
    // RAG 연결을 자동 생성한다. 사용자가 직접 입력할 필요가 없다.
    if (
      seedInput &&
      consented &&
      status === "idle" &&
      (!storyConnections || storyConnections.length === 0)
    ) {
      void runConnection(seedInput);
    }
  }, [seedInput, consented, status, storyConnections, runConnection]);
  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
  }, []);

  if (!consented) {
    return (
      <SurfaceCard className="text-center">
        <p className="text-headline-sm text-primary">이야기 거울 연결을 켜주세요</p>
        <p className="mt-2 text-body-md text-text-muted">

          당신의 회고를 바탕으로 고전·성경 속 이야기와 연결해 드립니다.
          먼저 외부 생성(AI) 동의를 켜주세요.
        </p>
        <div className="mt-4 flex justify-center">
          <a href="/me/settings" className="cta-primary">
            설정에서 동의하기
          </a>
        </div>
      </SurfaceCard>
    );
  }

  if (!seedInput && !initialRun) {
    return (
      <SurfaceCard className="text-center">
        <p className="text-headline-sm text-primary">연결할 회고가 아직 없어요</p>
        <p className="mt-2 text-body-md text-text-muted">
          회고를 남기시면, 그 속 마음을 고전 속 이야기와 잇는 연결을 만들어 드립니다.
        </p>
        <div className="mt-4 flex justify-center">
          <a href="/lookback" className="cta-primary">회고 생성하기</a>
        </div>
      </SurfaceCard>
    );
  }

  const busy = status === "retrieving" || status === "streaming";

  return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-line bg-white/60 p-3 text-label-sm text-text-muted">
          <span className="text-accent-gold-ink">{seedLabel}</span> 회고를 바탕으로
          닮은 이야기를 찾아요.
        </div>

        {!showRefine && status === "idle" && storyConnections && storyConnections.length > 0 ? (
          <section className="space-y-4">
            <p className="text-label-md text-text-muted">회고에서 닿은 이야기</p>
            {storyConnections.map((sc, i) => (
              <StoryNarrativeCard
                key={i}
                source={sc.source}
                title={sc.story}
                connection={sc.connection}
                differentPerspective={sc.differentPerspective}
              />
            ))}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setShowRefine(true)}
                className="cta-secondary"
              >
                다른 마음으로 다시 찾기
              </button>
            </div>
          </section>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label htmlFor="rag-input" className="block text-label-md text-primary">
              회고를 바탕으로 닮은 이야기를 찾아요. 필요하면 다듬어 보세요.
            </label>
            <textarea
              id="rag-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="회고 내용이 그대로 담겨 있어요. 다른 마음을 잇고 싶다면 수정해 보세요."
              className="w-full rounded-2xl border border-line bg-white/95 p-4 text-body-md text-primary outline-none transition ring-accent-gold/30 focus:ring-2"
            />
            <div className="flex items-center gap-3">
              {!busy ? (
                <button type="submit" className="cta-primary" disabled={!input.trim()}>
                  이야기 찾기
                </button>
              ) : (
                <button type="button" onClick={stop} className="cta-secondary">
                  멈추기
                </button>
              )}
              <span className="text-label-xs text-text-muted">{input.length}/4000</span>
              {showRefine ? (
                <button
                  type="button"
                  onClick={() => setShowRefine(false)}
                  className="text-label-xs text-text-muted underline"
                >
                  닫기
                </button>
              ) : null}
            </div>
          </form>
        )}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={toggleHistory}
          className="text-label-sm text-accent-gold-ink hover:underline"
        >
          지난 연결{history ? ` (${history.length})` : ""} 보기
        </button>
      </div>

      {historyOpen && (
        <div className="space-y-2">
          {historyLoading && (
            <p className="text-label-sm text-text-muted">불러오는 중…</p>
          )}
          {history && history.length === 0 && (
            <p className="text-label-sm text-text-muted">
              아직 저장된 연결이 없어요.
            </p>
          )}
          {history?.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => openRun(r.id)}
              className="w-full rounded-xl border border-line bg-white/80 p-3 text-left transition hover:border-accent-gold/40"
            >
              <p className="line-clamp-2 text-body-sm text-primary">
                {r.summary ?? "(요약 없음)"}
              </p>
              <p className="mt-1 text-label-xs text-text-muted">
                {new Date(r.createdAt).toLocaleDateString("ko-KR")} · 연결{" "}
                {r.connectionCount}건
              </p>
            </button>
          ))}
          {history && history.length > 0 && (
            <button
              type="button"
              onClick={toggleHistory}
              className="text-label-xs text-text-muted underline"
            >
              닫기
            </button>
          )}
        </div>
      )}

      {candidates.length > 0 && (
        <div>
          <p className="mb-2 text-label-sm text-text-muted">함께 둘러본 이야기</p>
          <div className="flex flex-wrap gap-2">
            {candidates.map((c) => (
              <SoftBadge key={c.chunkId}>
                {c.title}
                {c.workTitle ? ` · ${c.workTitle}` : ""}
              </SoftBadge>
            ))}
          </div>
        </div>
      )}

      {busy && (
        <SurfaceCard className="text-center">
          <p className="text-body-md text-text-muted">
            {status === "retrieving"
              ? "관련된 이야기를 찾고 있어요…"
              : "당신의 이야기를 고전과 잇고 있어요…"}
          </p>
        </SurfaceCard>
      )}

      {status === "complete" && (
        <div className="space-y-4">
          {viewingPast && (
            <p className="text-label-xs text-text-muted">
              지난 연결 · 저장된 기록
            </p>
          )}
          {summary && (
            <SurfaceCard tone="dark">
              <p className="text-body-lg text-primary">{summary}</p>
            </SurfaceCard>
          )}
          {connections.map((conn, i) => {
            const source = conn.workTitle
              ? `${conn.workTitle}${conn.locator ? ` · ${conn.locator}` : ""}`
              : null;
            return (
              <StoryNarrativeCard
                key={`${conn.chunkId}-${i}`}
                href={buildStoryDetailHref(conn.chunkId, {
                  connection: conn.connection,
                  differentPerspective: conn.differentPerspective,
                  sourceLabel: source,
                })}
                source={source}
                title={conn.title ?? "이야기"}
                connection={conn.connection}
                differentPerspective={conn.differentPerspective}
              />
            );
          })}
          <div className="flex justify-center">
            <button type="button" onClick={reset} className="cta-secondary">
              다시 쓰기
            </button>
          </div>
        </div>
      )}

      {status === "insufficient" && (
        <SurfaceCard className="text-center">
          <p className="text-headline-sm text-primary">
            아직 연결할 이야기를 찾지 못했어요
          </p>
          <p className="mt-2 text-body-md text-text-muted">
            조금 더 구체적으로, 누구에게·어떤 상황에서 그런 마음이 들었는지 적어보세요.
          </p>
        </SurfaceCard>
      )}

      {status === "error" && (
        <SurfaceCard className="text-center">
          <p className="text-headline-sm text-primary">잠시 멈춰 있어요</p>
          <p className="mt-2 text-body-md text-text-muted">
            {errorMsg || "이야기 생성 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요."}
          </p>
        </SurfaceCard>
      )}

      {status === "denied" && (
        <SurfaceCard className="text-center">
          <p className="text-headline-sm text-primary">동의가 필요해요</p>
          <p className="mt-2 text-body-md text-text-muted">
            이야기 거울 연결을 사용하려면 외부 생성(AI) 동의가 필요합니다.
          </p>
          <div className="mt-4 flex justify-center">
            <a href="/me/settings" className="cta-primary">
              설정에서 동의하기
            </a>
          </div>
        </SurfaceCard>
      )}
    </div>
  );
}
