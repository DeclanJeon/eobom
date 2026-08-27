"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CHECKIN_REACTIONS, type CheckinReaction } from "@/lib/checkin";
import { TINY_ACTION_CATALOG } from "@/lib/tiny-action";
import { StoryApplicationCard } from "@/components/story-application-card";
import type { ChapterBackground } from "@/lib/bible/chapter-background";
import type { BibleReference } from "@/lib/bible/types";
import { PassageAnnotationList } from "@/components/scripture/passage-annotation-list";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  // 설계 05§11 — still_hold(아직 비슷해요) 선택 후에만 tiny action을 제안한다(opt-in).
  const [tinyActionOffered, setTinyActionOffered] = useState(false);
  const [tinyActionDone, setTinyActionDone] = useState(false);
  const [storyRevealed, setStoryRevealed] = useState(false);
  // B4: 카드 노출 계측 — 서버 컴포넌트 렌더 금지, mount 후 세션당 1회
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function choose(code: CheckinReaction) {
    // 같은 반응 재선택 = 해제
    const next = reaction === code ? null : code;
    setReaction(next);
    if (next === "still_hold" && content.kind === "memory") {
      setTinyActionOffered(true);
    }
    void save({ reaction: next });
  }

  async function chooseTinyAction(catalogId: string) {
    const entryId = savedEntryId ?? (content.kind === "memory" ? content.entryId : null);
    setTinyActionDone(true);
    try {
      await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalogId, sourceEntryId: entryId ?? undefined }),
      });
    } catch {
      /* 제안 실패는 흐름을 깨지 않는다 — 다음 follow-up에서 자연 재노출 */
    }
  }

  function saveOneLine() {
    const trimmed = oneLine.trim();
    if (!trimmed) return;
    void save({ oneLine: trimmed });
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
            {/* 03§10 progressive disclosure — single CTA: verse only in hero, rest behind Sheet */}
            {content.chapterBg || content.reason || content.ref || content.background || content.story ? (
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="mt-5 inline-flex min-h-11 items-center rounded-full border border-border bg-white px-5 py-2 text-label-sm font-medium text-primary transition hover:border-leaf/40"
                  >
                    말씀 더 보기
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="bottom"
                  className="mx-auto flex max-h-[85vh] w-full max-w-lg flex-col gap-0 overflow-hidden rounded-t-2xl border-border p-0"
                >
                  <SheetHeader className="shrink-0 border-b border-border px-5 py-4 pr-12 text-left">
                    <SheetTitle className="text-headline-sm text-primary">말씀 더 보기</SheetTitle>
                    <SheetDescription className="text-body-sm text-text-muted">
                      문맥과 연결된 성구를 천천히 살펴보세요.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-5 py-5">
                    <div className="space-y-6">
                      {content.chapterBg ? (
                        <div className="space-y-4">
                          {content.chapterBg.guide ? (
                            <>
                              <p className="text-label-md font-semibold text-primary">{content.chapterBg.guide.title}</p>
                              {content.chapterBg.guide.background ? (
                                <p className="text-body-sm leading-relaxed text-text-muted">
                                  <span className="font-semibold text-primary">장면의 배경</span> — {content.chapterBg.guide.background}
                                </p>
                              ) : null}
                              {content.chapterBg.guide.content ? (
                                <p className="rounded-xl bg-secondary/30 px-3 py-3 text-body-sm leading-relaxed text-text-muted">
                                  <span className="font-semibold text-primary">이 장의 내용</span> — {content.chapterBg.guide.content}
                                </p>
                              ) : null}
                              {content.chapterBg.guide.observation.length ? (
                                <div>
                                  <p className="text-label-sm font-semibold text-primary">읽을 때 볼 점</p>
                                  <ul className="mt-2 space-y-1.5 text-body-sm leading-relaxed text-text-muted">
                                    {content.chapterBg.guide.observation.map((item, index) => (
                                      <li key={index} className="flex gap-2">
                                        <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-accent-gold" />
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                              {content.chapterBg.guide.characters.length ? (
                                <div>
                                  <p className="text-label-sm font-semibold text-primary">등장인물</p>
                                  <ul className="mt-2 space-y-1 text-body-sm leading-relaxed text-text-muted">
                                    {content.chapterBg.guide.characters.slice(0, 8).map((character) => (
                                      <li key={character}>· {character}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                              {content.chapterBg.publicCommentary?.text ? (
                                <div>
                                  <p className="text-label-sm font-semibold text-primary">공개 고전 주석 원문</p>
                                  <p className="mt-2 text-body-sm leading-relaxed text-text-muted">
                                    {content.chapterBg.publicCommentary.text}
                                  </p>
                                  <p className="mt-2 text-label-xs text-text-muted">Matthew Henry · Public Domain · CCEL/CrossWire</p>
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <>
                              <p className="text-body-sm leading-relaxed text-text-muted">{content.chapterBg.overview}</p>
                              {(content.chapterBg.historical || content.chapterBg.literary || content.chapterBg.theological) && (
                                <div className="space-y-2 border-t border-border/20 pt-3 text-body-sm leading-relaxed text-text-muted">
                                  {content.chapterBg.historical ? (
                                    <p>
                                      <span className="font-semibold text-primary">역사</span> — {content.chapterBg.historical}
                                    </p>
                                  ) : null}
                                  {content.chapterBg.literary ? (
                                    <p>
                                      <span className="font-semibold text-primary">문학</span> — {content.chapterBg.literary}
                                    </p>
                                  ) : null}
                                  {content.chapterBg.theological ? (
                                    <p>
                                      <span className="font-semibold text-primary">신학</span> — {content.chapterBg.theological}
                                    </p>
                                  ) : null}
                                </div>
                              )}
                            </>
                          )}
                          {content.chapterBg.keyVerses.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {content.chapterBg.keyVerses.map((kv) => (
                                <span key={kv.reference} className="chip-gold px-2 py-1 text-xs">
                                  {kv.reference}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {content.chapterBg.cautions.length > 0 ? (
                            <p className="text-label-xs leading-relaxed text-text-muted">주의: {content.chapterBg.cautions.join(" · ")}</p>
                          ) : null}
                        </div>
                      ) : content.background ? (
                        <p className="text-body-md leading-relaxed text-text-muted">{content.background}</p>
                      ) : null}
                      {content.reason ? (
                        <div className="rounded-xl border border-border/20 bg-card/40 px-3 py-3">
                          <p className="text-label-sm font-semibold text-primary">왜 이 말씀이 나왔나요?</p>
                          <p className="mt-2 text-body-sm leading-relaxed text-text-muted">{content.reason}</p>
                        </div>
                      ) : null}
                      {content.ref ? (
                        <div>
                          <p className="text-label-sm font-semibold text-primary">연결된 성구</p>
                          <div className="mt-3">
                            <PassageAnnotationList
                              code={content.ref.code}
                              chapter={content.ref.chapter}
                              startVerse={content.ref.startVerse}
                              endVerse={content.ref.endVerse}
                            />
                          </div>
                        </div>
                      ) : null}
                      {content.story ? (
                        storyRevealed ? (
                          <StoryApplicationCard
                            title={content.story.title}
                            body={content.story.body}
                            closing={content.story.closing}
                            onReadClick={() => {}}
                            onWriteClick={() => document.getElementById(`one-line-${cardKey}`)?.focus()}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setStoryRevealed(true)}
                            className="inline-flex min-h-11 items-center rounded-full border border-border bg-white px-5 py-2 text-label-sm font-medium text-primary transition hover:border-accent-gold/40"
                          >
                            이 말씀의 이야기
                          </button>
                        )
                      ) : null}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
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

      {/* Tiny Action 제안 — still_hold 선택 후에만 (설계 05§11, opt-in) */}
      {isMemory && tinyActionOffered && !tinyActionDone && reaction === "still_hold" ? (
        <div className="mt-5 rounded-xl border border-clay/30 bg-card/40 px-4 py-4">
          <p className="text-label-md font-medium text-primary">이번 주 하나만 해본다면?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TINY_ACTION_CATALOG.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void chooseTinyAction(item.id)}
                className="min-h-11 rounded-full border border-border bg-white px-4 py-2 text-label-sm text-primary transition hover:border-accent-gold/40"
              >
                {item.label}
              </button>
            ))}
            <Link
              href={writeHref}
              className="inline-flex min-h-11 items-center rounded-full border border-border bg-white px-4 py-2 text-label-sm text-primary transition hover:border-accent-gold/40"
            >
              직접 적기
            </Link>
            <button
              type="button"
              onClick={() => setTinyActionDone(true)}
              className="min-h-11 rounded-full px-3 py-2 text-label-sm text-text-muted"
            >
              지금은 괜찮아요
            </button>
          </div>
        </div>
      ) : null}

      {showResponses ? (
        <div className="mt-4 max-w-xl">
          <label htmlFor={`one-line-${cardKey}`} className="sr-only">
            왜 마음에 남았나요? (선택)
          </label>
          <div className="flex gap-2">
            <input
              id={`one-line-${cardKey}`}
              value={oneLine}
              onChange={(e) => setOneLine(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveOneLine();
              }}
              placeholder="왜 마음에 남았나요? (선택)"
              maxLength={500}
              className="min-h-11 flex-1 rounded-xl border border-border bg-white/80 px-4 py-2 text-body-md text-primary placeholder:text-text-muted focus:border-leaf focus:outline-none"
            />
            <button
              type="button"
              disabled={saving || !oneLine.trim()}
              onClick={saveOneLine}
              className="cta-secondary min-h-11 px-4 py-2 text-label-sm"
            >
              남기기
            </button>
          </div>
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
      {error ? (
        <p className="mt-2 text-label-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
