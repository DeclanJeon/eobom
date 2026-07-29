"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import { SurfaceCard, SoftBadge } from "@/components/ui-blocks";

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

export function StoryMirrorRag({ consented }: { consented: boolean }) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [summary, setSummary] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setCandidates([]);
    setConnections([]);
    setSummary("");
    setErrorMsg("");
  }, []);

  const submit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || status === "retrieving" || status === "streaming") return;

      reset();
      setStatus("retrieving");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/story-mirror/rag/runs/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: text, locale: "ko" }),
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
    },
    [input, status, reset]
  );

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

  const busy = status === "retrieving" || status === "streaming";

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-3">
        <label htmlFor="rag-input" className="block text-label-md text-primary">
          지금 마음에 걸리는 이야기를 적어보세요
        </label>
        <textarea
          id="rag-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          maxLength={4000}
          placeholder="요즘 반복되는 감정, 막막한 순간, 마음에 남는 상황을 자유롭게 적어보세요."
          className="w-full rounded-2xl border border-line bg-white/95 p-4 text-body-md text-primary outline-none transition focus:border-accent-gold/40"
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
        </div>
      </form>

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
          {summary && (
            <SurfaceCard tone="dark">
              <p className="text-body-lg text-primary">{summary}</p>
            </SurfaceCard>
          )}
          {connections.map((conn, i) => (
            <SurfaceCard key={`${conn.chunkId}-${i}`} className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-headline-sm text-primary">
                  {conn.title ?? "이야기"}
                </h3>
                {conn.workTitle && (
                  <span className="shrink-0 text-label-xs text-text-muted">
                    {conn.workTitle}
                    {conn.locator ? ` · ${conn.locator}` : ""}
                  </span>
                )}
              </div>
              <p className="text-body-md text-text-muted">{conn.connection}</p>
              {conn.differentPerspective && (
                <p className="rounded-xl bg-chalk p-3 text-body-sm text-text-muted">
                  다른 시선 · {conn.differentPerspective}
                </p>
              )}
            </SurfaceCard>
          ))}
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
