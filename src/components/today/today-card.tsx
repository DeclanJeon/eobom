"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CHECKIN_REACTIONS, type CheckinReaction } from "@/lib/checkin";
import type { ChapterBackground } from "@/lib/bible/chapter-background";
import type { BibleReference } from "@/lib/bible/types";
import { ScriptureDetailModal } from "./scripture-detail-modal";
import { ReactionModal } from "./reaction-modal";
export type TodayCardContent =
  | {
      kind: "scripture";
      display: string;
      text?: string;
      verses?: Array<{ verse: number; text: string }>;
      ref?: BibleReference;
      chapterBg?: ChapterBackground | null;
      sourceLabel?: string;
      /** 설계 05§6+§13 — 행동 context 근거 문구 */
      reason?: string;
      pastContext?: {
        label: string;
        display: string;
        excerpt?: string;
        scriptureRefs?: string[];
      } | null;
      background?: string;
      story?: { title: string; body: string[]; closing: string } | null;
    }
  | {
      kind: "memory";
      label: string; // "약 37일 전의 나"
      display: string;
      excerpt?: string;
      entryId: string;
      /** 설계 05§13 — "왜 이게 나왔지?"에 대한 조용한 답변 */
      reason?: string;
    }
  | {
      kind: "prompt"; // 화 20초 질문 / 목 작은 실천
      display: string;
      hint?: string;
    }
  | {
      kind: "gratitude"; // 주일 — 이번 주 감사
      display: string;
      items: string[];
    }
  | {
      kind: "review"; // 토 — 이번 주 돌아보기 (기존 회고 링크만, 신규 AI 금지)
      display: string;
      href: string;
    };

export type TodayCardProps = {
  cardKey: string;
  surface: string;
  dateKey: string;
  identityKey?: string;
  content: TodayCardContent;
  initialReaction?: string | null;
  initialOneLine?: string | null;
  initialEntryId?: string | null;
  /** "더 쓰고 싶다면" 목적지 — 성구 시드 또는 기록 수정 */
  writeHref: string;
};

/**
 * 오늘의 카드 (B1·C4·G1).
 * - 카드를 본 것 = 완료. 리액션·한 줄은 전적으로 선택 (완료/미응답 UI 금지).
 * - 리액션은 본문보다 낮은 위계로 배치.
 * - impression: mount 시 세션당 1회 (identity/surface/dateKey/cardKey 멱등, B4).
 */
export function TodayCard({
  cardKey,
  surface,
  dateKey,
  identityKey,
  content,
  initialReaction,
  initialOneLine,
  initialEntryId,
  writeHref,
}: TodayCardProps) {
  const [reaction, setReaction] = useState<string | null>(initialReaction ?? null);
  const [oneLine, setOneLine] = useState(initialOneLine ?? "");
  const [savedEntryId, setSavedEntryId] = useState<string | null>(initialEntryId ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const impressionSent = useRef(false);
  const [scriptureModalOpen, setScriptureModalOpen] = useState(false);
  const [reactionModalOpen, setReactionModalOpen] = useState(false);
  const [selectedReactionLabel, setSelectedReactionLabel] = useState("");


  useEffect(() => {
    if (impressionSent.current) return;
    const storageKey = `eobom-imp:${identityKey ?? "session"}:${surface}:${dateKey}:${cardKey}`;
    try {
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, "1");
    } catch {
      /* storage unavailable — still log once per mount */
    }
    fetch("/api/today/impression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardKey, surface }),
    }).catch(() => {});
  }, [cardKey, dateKey, identityKey, surface]);
  async function save(body: { reaction?: string | null; oneLine?: string | null }) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/today/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardKey, surface, ...body }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "저장에 실패했습니다.");
      }
      const data = (await res.json()) as {
        checkin: { reaction: string | null; entryId: string | null };
      };
      if (data.checkin.reaction) setReaction(data.checkin.reaction);
      if (data.checkin.entryId) setSavedEntryId(data.checkin.entryId);
      setFlash("마음에 남겼어요");
      setTimeout(() => setFlash(""), 1600);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function choose(code: CheckinReaction) {
    // 같은 반응 재선택 = 해제
    const next = reaction === code ? null : code;
    const didSave = await save({ reaction: next });
    if (!didSave) return;
    setReaction(next);
    if (next) {
      setSelectedReactionLabel(CHECKIN_REACTIONS.find((item) => item.code === next)?.label ?? "마음에 남은 말씀");
      setReactionModalOpen(true);
    } else {
      setSelectedReactionLabel("");
    }
  }

  const isMemory = content.kind === "memory";
  const isReview = content.kind === "review";
  const showResponses = !isReview && content.kind !== "gratitude";

  return (
    <section className="mb-10 rounded-2xl border border-border/70 bg-secondary/30 px-5 py-8 md:mb-12 md:px-10 md:py-12">
      <p className="text-label-sm text-accent-gold-ink">
        {isMemory
          ? content.label
          : content.kind === "prompt"
            ? "오늘의 질문"
            : content.kind === "gratitude"
              ? "이번 주 감사"
              : content.kind === "review"
                ? "이번 주 돌아보기"
                : "오늘 함께 읽을 말씀"}
      </p>
      <p className="chip-gold mt-3 inline-flex">{content.display}</p>
      <div className="mt-4 max-w-2xl">
        {isMemory ? (
          <>
            <p className="font-journal text-xl leading-relaxed text-primary md:text-2xl">
              {content.display}
            </p>
            {content.excerpt ? (
              <p className="mt-3 text-body-md text-text-muted line-clamp-3">{content.excerpt}</p>
            ) : null}
            {content.reason ? (
              <details className="mt-4 rounded-xl border border-border/20 bg-card/40 px-3 py-2">
                <summary className="cursor-pointer list-none text-label-xs text-text-muted">
                  왜 이 기록이 나왔나요?
                </summary>
                <p className="mt-2 text-body-sm leading-relaxed text-text-muted">{content.reason}</p>
              </details>
            ) : null}
          </>
        ) : content.kind === "scripture" ? (
          <>
            {content.verses && content.verses.length > 0 ? (
              <div
                className="writing-margin mt-4 space-y-4 md:space-y-3"
                aria-label="성경 본문 절별 읽기"
              >
                {content.verses.map((v) => (
                  <div key={v.verse} className="flex gap-2.5 md:gap-3">
                    <span className="mt-1 min-w-5 shrink-0 text-right font-mono text-[11px] leading-5 text-text-muted/55 md:min-w-6 md:text-label-xs">
                      {v.verse}
                    </span>
                    <p className="flex-1 font-journal text-body-md leading-[1.85] text-primary md:text-body-lg">
                      {v.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : content.text ? (
              <p className="font-journal text-xl leading-relaxed text-primary md:text-2xl">
                {content.text}
              </p>
            ) : null}
            {content.pastContext ? (
              <div className="mt-5 rounded-xl border border-border/50 bg-card/40 px-4 py-3">
                <p className="text-label-xs text-text-muted">{content.pastContext.label}</p>
                <p className="mt-1 font-journal text-body-md leading-relaxed text-primary">
                  {content.pastContext.display}
                </p>
                {content.pastContext.excerpt ? (
                  <p className="mt-1 text-body-sm leading-relaxed text-text-muted">
                    {content.pastContext.excerpt}
                  </p>
                ) : null}
                {content.pastContext.scriptureRefs?.length ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-label-xs text-leaf">
                      그때 함께 읽은 말씀 보기
                    </summary>
                    <p className="mt-2 text-label-xs text-text-muted">
                      {content.pastContext.scriptureRefs.join(" · ")}
                    </p>
                  </details>
                ) : null}
              </div>
            ) : null}
            {/* 03§10 progressive disclosure — single CTA: verse only in hero, rest behind Dialog */}
            {content.chapterBg || content.reason || content.ref || content.background || content.story ? (
              <>
                <button
                  type="button"
                  onClick={() => setScriptureModalOpen(true)}
                  className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-white px-5 py-2 text-label-sm font-medium text-primary shadow-sm transition-all duration-300 ease-out hover:scale-[1.02] hover:border-leaf/40 hover:shadow-md active:scale-[0.98]"
                >
                  말씀 더 보기
                  <span aria-hidden className="text-[11px]">→</span>
                </button>
                <ScriptureDetailModal open={scriptureModalOpen} onOpenChange={setScriptureModalOpen} content={content} cardKey={cardKey} />
              </>
            ) : null}
          </>
        ) : content.kind === "prompt" ? (
          <>
            <p className="font-journal text-xl leading-relaxed text-primary md:text-2xl">
              {content.display}
            </p>
            {content.hint ? (
              <p className="mt-3 text-body-md text-text-muted">{content.hint}</p>
            ) : null}
          </>
        ) : content.kind === "gratitude" ? (
          <ul className="mt-4 space-y-2">
            {content.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-body-md text-primary">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-gold" />
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <Link
            href={content.href}
            className="cta-secondary mt-4 inline-flex min-h-11 items-center px-5 py-2"
          >
            {content.display} 보기 →
          </Link>
        )}
      </div>

      {/* 선택 리액션 — 낮은 위계 (B1). 회고·감사 카드는 제외 */}
      {showResponses ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {CHECKIN_REACTIONS.map((r) => {
            const active = reaction === r.code;
            return (
              <button
                key={r.code}
                type="button"
                disabled={saving}
                onClick={() => choose(r.code)}
                aria-pressed={active}
                className={`min-h-11 rounded-full border px-4 py-2 text-label-sm transition ${
                  active
                    ? "border-accent-gold/50 bg-accent-gold/10 text-accent-gold-ink"
                    : "border-border bg-white/70 text-text-muted hover:border-leaf/40 hover:text-primary"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {showResponses ? (
        <div className="mt-4 flex items-center gap-3">
          <Link
            href={savedEntryId ? `/entries/${savedEntryId}/edit` : writeHref}
            className="min-h-11 inline-flex items-center text-label-sm text-leaf hover:text-primary"
          >
            {savedEntryId ? "이어서 쓰기 →" : "더 쓰고 싶다면 →"}
          </Link>
          {flash ? <span className="text-label-sm text-accent-gold-ink">{flash}</span> : null}
        </div>
      ) : null}
      {showResponses ? (
        <ReactionModal
          open={reactionModalOpen}
          reactionLabel={selectedReactionLabel}
          note={oneLine}
          saving={saving}
          error={error}
          onOpenChange={setReactionModalOpen}
          onNoteChange={setOneLine}
          onSave={async () => {
            if (!oneLine.trim()) return;
            const didSave = await save({ oneLine: oneLine.trim() });
            if (didSave) setReactionModalOpen(false);
          }}
          onNext={() => {
            setReactionModalOpen(false);
            window.location.assign(`/today?next=${Date.now()}`);
          }}
        />
      ) : null}
      {error ? (
        <p className="mt-2 text-label-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
