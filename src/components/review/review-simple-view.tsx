import Link from "next/link";
import { SurfaceCard } from "@/components/ui-blocks";
import { ReviewObservationGroup } from "@/components/review/review-observation-group";
import type { SimpleReviewView } from "@/lib/review-display";
import { formatDateShort } from "@/lib/utils";

/**
 * 회고 상세 — 입체 뷰.
 * 사용자 기록을 6개 차원으로 보여 준다:
 * 어떤 내용으로 묵상했는지(themes) · 어떤 고민(questions) · 어떤 생각/감정(emotions) ·
 * 어떻게 묵상했는지(scriptureConnections + actionFlow) · 무엇을 하고 싶은지(nextSteps + prayerPrompts) ·
 * 어떻게 나아가고 싶은지(changesOrUnknown + smallPractices).
 * 마지막에 만남 블록(이야기·새 말씀·사람)과 재방문 본문(rereadScriptures)을 잇는다.
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
  const hasRereadScriptures = view.rereadScriptures.length > 0;
  const blockCount =
    Number(hasStories) + Number(hasScriptures) + Number(hasCompanions);

  return (
    <div className="mx-auto w-full max-w-reading space-y-6 md:space-y-8">
      <section className="surface-card-dark rounded-2xl p-6 md:p-8">
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

      {/* 1. 기록의 흐름 — 어떤 내용으로, 어떤 고민, 어떤 마음 */}
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <ReviewObservationGroup
          title="주제 — 어떤 내용으로 묵상했나요"
          items={view.themes}
        />
        <ReviewObservationGroup
          title="붙들고 있던 고민"
          items={view.questions}
        />
        <ReviewObservationGroup
          title="마음의 결"
          items={view.emotions}
        />
      </section>

      {/* 2. 말씀과 결단 — 어떻게 묵상했는지 */}
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <ReviewObservationGroup
          title="말씀과의 만남"
          items={view.scriptureConnections}
        />
        <ReviewObservationGroup
          title="결단의 흐름"
          items={view.actionFlow}
        />
        {view.changesOrUnknown ? (
          <SurfaceCard className="border-l-4 border-l-primary/50">
            <h2 className="text-headline-sm text-primary">
              달라진 점과 알 수 없는 것
            </h2>
            <p className="mt-2 text-body-md leading-relaxed text-text-muted">
              {view.changesOrUnknown}
            </p>
          </SurfaceCard>
        ) : null}
      </section>

      {/* 3. 나아갈 방향 — 무엇을 하고 싶고 어떻게 나아갈지 */}
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {view.nextSteps.length ? (
          <SurfaceCard className="border-l-4 border-l-leaf/50">
            <h2 className="text-headline-sm text-primary">다음 한 걸음</h2>
            <ul className="mt-4 space-y-4">
              {view.nextSteps.map((n, idx) => (
                <li key={`${n.action}-${idx}`}>
                  <p className="text-label-md text-primary">{n.action}</p>
                  {n.reason ? (
                    <p className="mt-1 text-body-sm leading-relaxed text-text-muted">
                      {n.reason}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </SurfaceCard>
        ) : null}

        {view.prayerPrompts.length ? (
          <SurfaceCard className="border-l-4 border-l-reflection/50">
            <h2 className="text-headline-sm text-primary">기도로 이어갈 주제</h2>
            <ul className="mt-4 space-y-4">
              {view.prayerPrompts.map((p, idx) => (
                <li key={`${p.topic}-${idx}`}>
                  <p className="text-label-md text-primary">{p.topic}</p>
                  {p.suggestion ? (
                    <p className="mt-1 text-body-sm leading-relaxed text-text-muted">
                      {p.suggestion}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </SurfaceCard>
        ) : null}

        {view.smallPractices.length ? (
          <SurfaceCard className="border-l-4 border-l-insight/50">
            <h2 className="text-headline-sm text-primary">작은 실천</h2>
            <ul className="mt-4 space-y-3">
              {view.smallPractices.map((p, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-leaf/15 text-label-xs text-leaf"
                  >
                    ✓
                  </span>
                  <p className="text-body-sm leading-relaxed text-text-muted">
                    {p}
                  </p>
                </li>
              ))}
            </ul>
          </SurfaceCard>
        ) : null}
      </section>

      {/* 4. 만남 — 이야기 · 새 말씀 · 사람 */}
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
              <h2 className="text-headline-sm text-primary">
                주제와 연결된 새 말씀
              </h2>
              <p className="mt-1 text-label-sm text-text-muted">
                아직 기록하지 않은, 주제에 맞는 본문
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

      {/* 5. 다시 머물면 좋은 본문 — 지난 기록에서 이어진 말씀 */}
      {hasRereadScriptures ? (
        <section>
          <h2 className="text-headline-sm text-primary">다시 머물면 좋은 본문</h2>
          <p className="mt-1 text-label-sm text-text-muted">
            지난 기록에서 이어진 말씀
          </p>
          <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {view.rereadScriptures.map((s) => (
              <SurfaceCard
                key={s.ref}
                className="border-l-4 border-l-accent-gold/50"
              >
                <span className="chip-gold">{s.ref}</span>
                <p className="mt-2 text-body-sm leading-relaxed text-text-muted">
                  {s.why}
                </p>
              </SurfaceCard>
            ))}
          </div>
        </section>
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
