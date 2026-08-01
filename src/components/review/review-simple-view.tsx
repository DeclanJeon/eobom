import Link from "next/link";
import { SurfaceCard } from "@/components/ui-blocks";
import type { SimpleReviewView } from "@/lib/review-display";
import { formatDateShort } from "@/lib/utils";

/**
 * 회고 상세 — 4블록 단순 요약.
 * 모바일: 세로 스택
 * 태블릿: 요약 + 2열
 * 데스크톱: 요약 + 최대 3열
 */
export function ReviewSimpleView({
  periodStart,
  periodEnd,
  entryCount,
  view,
  boundary,
}: {
  periodStart: Date | string;
  periodEnd: Date | string;
  entryCount?: number;
  view: SimpleReviewView;
  boundary: string;
}) {
  const meta = [
    `${formatDateShort(periodStart)} – ${formatDateShort(periodEnd)}`,
    entryCount ? `기록 ${entryCount}개` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const hasStories = view.stories.length > 0;
  const hasScriptures = view.scriptures.length > 0;
  const hasCompanions = view.companions.length > 0;
  const blockCount =
    Number(hasStories) + Number(hasScriptures) + Number(hasCompanions);

  return (
    <div className="mx-auto w-full max-w-reading space-y-6 md:space-y-8">
      <section className="surface-card-dark rounded-3xl p-6 md:p-8">
        <p className="text-label-sm text-on-dark-muted">이 기간의 요약</p>
        <h1 className="mt-3 text-display-lg leading-tight text-white md:text-4xl">
          {view.headline}
        </h1>
        {meta ? (
          <p className="mt-3 text-label-md text-on-dark-muted">{meta}</p>
        ) : null}
        <p className="mt-5 font-serif text-body-lg leading-relaxed text-white/90">
          {view.summary}
        </p>
      </section>

      {blockCount > 0 ? (
        <div
          className={
            blockCount >= 3
              ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              : blockCount === 2
                ? "grid gap-4 md:grid-cols-2"
                : "grid gap-4"
          }
        >
          {hasStories ? (
            <SurfaceCard className="border-l-4 border-l-insight/50">
              <h2 className="text-headline-sm text-primary">연관 이야깃거리</h2>
              <p className="mt-1 text-label-sm text-text-muted">
                비슷한 마음을 살았던 이야기
              </p>
              <ul className="mt-4 space-y-4">
                {view.stories.map((story, idx) => {
                  const body = (
                    <>
                      <p className="text-label-md text-primary">{story.title}</p>
                      {story.source ? (
                        <p className="mt-0.5 text-label-xs text-text-muted">
                          {story.source}
                        </p>
                      ) : null}
                      <p className="mt-1 text-body-sm leading-relaxed text-text-muted">
                        {story.line}
                      </p>
                    </>
                  );
                  return (
                    <li key={`${story.title}-${idx}`}>
                      {story.href ? (
                        <Link
                          href={story.href}
                          className="block rounded-xl transition hover:bg-surface-low/80"
                        >
                          {body}
                          <span className="mt-2 inline-block text-label-xs text-leaf">
                            이야기 더 읽기 →
                          </span>
                        </Link>
                      ) : (
                        body
                      )}
                    </li>
                  );
                })}
              </ul>
            </SurfaceCard>
          ) : null}

          {hasScriptures ? (
            <SurfaceCard className="border-l-4 border-l-reflection/50">
              <h2 className="text-headline-sm text-primary">도움될 성구</h2>
              <p className="mt-1 text-label-sm text-text-muted">
                다시 머물면 좋은 본문
              </p>
              <ul className="mt-4 space-y-4">
                {view.scriptures.map((s) => (
                  <li key={s.ref}>
                    <span className="chip-gold">{s.ref}</span>
                    <p className="mt-2 text-body-sm leading-relaxed text-text-muted">
                      {s.why}
                    </p>
                  </li>
                ))}
              </ul>
            </SurfaceCard>
          ) : null}

          {hasCompanions ? (
            <SurfaceCard
              className={
                blockCount >= 3
                  ? "border-l-4 border-l-companion/50 md:col-span-2 xl:col-span-1"
                  : "border-l-4 border-l-companion/50"
              }
            >
              <h2 className="text-headline-sm text-primary">함께하면 좋은 사람</h2>
              <p className="mt-1 text-label-sm text-text-muted">
                이 시기에 곁에 두면 도움이 되는 관계
              </p>
              <ul className="mt-4 space-y-4">
                {view.companions.map((c, idx) => (
                  <li key={`${c.role}-${idx}`}>
                    <p className="text-label-md text-primary">{c.role}</p>
                    <p className="mt-1 text-body-sm leading-relaxed text-text-muted">
                      {c.why}
                    </p>
                  </li>
                ))}
              </ul>
            </SurfaceCard>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link href="/story-mirror" className="cta-secondary">
          이야기 더 보기
        </Link>
        <Link href="/story-mirror/visualize" className="cta-secondary">
          이미지로 기억하기
        </Link>
        <Link href="/entries/new" className="cta-primary">
          새 묵상 남기기
        </Link>
      </div>

      <p className="text-label-sm leading-relaxed text-text-muted">{boundary}</p>
    </div>
  );
}
