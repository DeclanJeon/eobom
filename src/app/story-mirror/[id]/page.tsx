/**
 * /story-mirror/[id] — 이야기 거울 상세 페이지
 *
 * 단일 StoryCard의 상세 정보와 매칭 근거를 표시한다.
 */

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SurfaceCard } from "@/components/ui-blocks";
import { getCardDetail } from "@/lib/story-mirror/db";
import { parseJsonArray } from "@/lib/utils";
import { notFound } from "next/navigation";
import { StoryMirrorFeedback } from "@/components/story-mirror-feedback";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const card = await getCardDetail(id);
  if (!card) return { title: "이야기 거울" };
  return { title: `${card.name} · 이야기 거울` };
}

export default async function StoryMirrorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const card = await getCardDetail(id);

  if (!card || card.reviewStatus !== "published") {
    notFound();
  }

  const themes = parseJsonArray(card.themes);
  const emotions = parseJsonArray(card.emotions);
  const situations = parseJsonArray(card.situations);
  const warnings = parseJsonArray(card.contentWarnings);
  const counterPatterns = parseJsonArray(card.counterPatterns);

  return (
    <AppShell wide bare>
      <div className="mb-6">
        <Link
          href="/story-mirror"
          className="text-label-sm text-leaf transition hover:text-primary"
        >
          ← 이야기 거울
        </Link>
      </div>

      <article className="max-w-2xl">
        {/* Header */}
        <header className="mb-8">
          <p className="text-eyebrow text-accent-gold-ink">
            {card.work.title}
            {card.work.author ? ` · ${card.work.author}` : ""}
          </p>
          <h1 className="mt-2 text-display-lg text-primary md:text-4xl">
            {card.name}
          </h1>
          {card.work.era && (
            <p className="mt-1 text-label-md text-text-muted">
              {card.work.era}
            </p>
          )}
        </header>

        {/* Content Warnings */}
        {warnings.length > 0 && (
          <div className="mb-6 rounded-xl border border-safety/30 bg-safety/5 p-4">
            <p className="text-label-sm font-medium text-safety">
              콘텐츠 주의
            </p>
            <p className="mt-1 text-body-sm text-text-muted">
              {warnings.join(", ")}
            </p>
          </div>
        )}

        {/* Summary */}
        <section className="mb-8">
          <h2 className="text-headline-sm text-primary">어떤 이야기인가</h2>
          <p className="mt-2 text-body-md leading-relaxed text-ink">
            {card.summary}
          </p>
          {card.arc && (
            <p className="mt-2 text-label-sm text-text-muted">{card.arc}</p>
          )}
        </section>

        {/* Themes & Emotions */}
        <section className="mb-8">
          <h2 className="text-headline-sm text-primary">주제와 감정</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {themes.map((t) => (
              <span
                key={t}
                className="rounded-full bg-chalk px-3 py-1 text-label-sm text-ink"
              >
                {t}
              </span>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {emotions.map((e) => (
              <span
                key={e}
                className="rounded-full bg-mist px-3 py-1 text-label-sm text-ink"
              >
                {e}
              </span>
            ))}
          </div>
          {situations.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {situations.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-line px-3 py-1 text-label-sm text-text-muted"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Counter Patterns */}
        {counterPatterns.length > 0 && (
          <section className="mb-8">
            <h2 className="text-headline-sm text-primary">다른 흐름</h2>
            <p className="mt-2 text-body-md text-text-muted">
              이 이야기에서는 또한{" "}
              {counterPatterns.join(", ")}의 흐름도 나타납니다.
            </p>
          </section>
        )}

        {/* Passages */}
        {card.passages.length > 0 && (
          <section className="mb-8">
            <h2 className="text-headline-sm text-primary">
              다시 읽어볼 구절
            </h2>
            <div className="mt-3 space-y-3">
              {card.passages.map((p) => (
                <blockquote
                  key={p.id}
                  className="border-l-2 border-accent-gold pl-4"
                >
                  <p className="text-body-md italic text-ink">{p.text}</p>
                  <cite className="mt-1 block text-label-sm text-text-muted">
                    — {p.locator}
                    {p.citationAllowed && (
                      <a
                        href={p.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-leaf hover:text-primary"
                      >
                        원문 보기
                      </a>
                    )}
                  </cite>
                </blockquote>
              ))}
            </div>
          </section>
        )}

        {/* Source */}
        <section className="mb-8 rounded-xl bg-chalk p-4">
          <h2 className="text-headline-sm text-primary">출처</h2>
          <div className="mt-2 space-y-1 text-label-sm text-text-muted">
            <p>
              작품: {card.work.title}
              {card.work.titleOriginal
                ? ` (${card.work.titleOriginal})`
                : ""}
            </p>
            {card.work.author && <p>저자: {card.work.author}</p>}
            {card.work.translator && (
              <p>번역: {card.work.translator}</p>
            )}
            <p>권리: {card.work.rightsBasis}</p>
            <a
              href={card.work.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-leaf hover:text-primary"
            >
              원문 보기 →
            </a>
          </div>
        </section>

        {/* Disclaimer */}
        <p className="mb-6 text-label-sm text-text-muted">
          이 이야기는 판정이나 처방이 아닙니다. 사용자의 경험과 겹치는 부분을
          발견할 수 있는 읽을 거리만 제공합니다.
        </p>

        <SurfaceCard className="border-l-4 border-l-clay">
          <h2 className="text-headline-sm text-primary">나의 회고에서 찾기</h2>
          <p className="mt-2 text-body-md text-text-muted">
            이 이야기와 겹치는 주제가 내 묵상 기록에서 어떻게 나타나는지 확인할 수 있습니다.
          </p>
          <Link
            href="/reviews/new"
            className="mt-3 inline-flex items-center gap-1 text-label-md text-leaf hover:text-primary"
          >
            회고 만들기 →
          </Link>
        </SurfaceCard>

        {/* Feedback */}
        <StoryMirrorFeedback cardId={card.id} />
      </article>
    </AppShell>
  );
}
