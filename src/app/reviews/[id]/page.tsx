import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SoftBadge, SurfaceCard } from "@/components/ui-blocks";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDateShort, parseJsonArray } from "@/lib/utils";
import type { StructuredReview } from "@/lib/mimo";
import { normalizeRereadScriptures } from "@/lib/reread-scriptures";
import { RereadScriptureList } from "@/components/reread-scripture-list";
import { ObservationFeedback } from "@/components/observation-feedback";

export const metadata = { title: "회고 상세" };

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const report = await db.reviewReport.findFirst({
    where: { id, userId: user.id, deletedAt: null },
  });
  if (!report) notFound();

  let review: StructuredReview | null = null;
  try {
    review = JSON.parse(report.structuredOutput) as StructuredReview;
  } catch {
    review = null;
  }

  const includedEntryIds = parseJsonArray(report.includedEntryIds);
  const includedEntries = includedEntryIds.length
    ? await db.reflectionEntry.findMany({
        where: { id: { in: includedEntryIds }, userId: user.id, deletedAt: null },
        select: { scriptureRefs: true },
      })
    : [];
  const rereadScriptures = normalizeRereadScriptures(review?.rereadScriptures, {
    allowedRefs: includedEntries.flatMap((entry) =>
      parseJsonArray(entry.scriptureRefs),
    ),
  });

  return (
    <AppShell title="회고">
      <div className="space-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <SoftBadge>{report.reportType}</SoftBadge>
            <span className="text-label-sm text-text-muted">
              {formatDateShort(report.periodStart)} –{" "}
              {formatDateShort(report.periodEnd)}
            </span>
          </div>
          <h1 className="mt-3 text-display-lg text-primary">
            {review?.oneSentence || report.summary || "회고"}
          </h1>
          {review?.disclaimer ? (
            <p className="mt-3 rounded-2xl bg-surface-low px-4 py-3 text-label-md leading-relaxed text-text-muted">
              {review.disclaimer}
            </p>
          ) : null}
        </div>

        {!review ? (
          <SurfaceCard>
            <h2 className="text-headline-sm text-primary">회고 본문을 열 수 없습니다</h2>
            <p className="mt-2 text-body-md text-text-muted">
              저장된 회고 형식을 읽지 못했습니다. 같은 기간으로 다시 만들어 볼 수 있습니다.
            </p>
          </SurfaceCard>
        ) : (
          <>
            <ObservationSection title="자주 나타난 주제" items={review.themes} reviewId={id} feedback={review} />
            <ObservationSection title="반복해서 드러난 마음" items={review.emotions} reviewId={id} feedback={review} />
            <ObservationSection title="붙잡고 있던 질문" items={review.questions} reviewId={id} feedback={review} />
            <ObservationSection
              title="말씀과 삶의 연결"
              items={review.scriptureConnections}
            />
            <ObservationSection title="이전 결단의 흐름" items={review.actionFlow} />

            {/* 이야기와 연결 */}
            {review.storyConnections?.length ? (
              <section className="space-y-3">
                <h2 className="text-headline-sm text-primary">이야기와 연결</h2>
                {review.storyConnections.map((sc, idx) => (
                  <SurfaceCard key={idx} className="border-l-4 border-l-leaf/50">
                    <div className="flex items-center gap-2">
                      <h3 className="text-label-md text-primary">{sc.story}</h3>
                      <SoftBadge>{sc.source}</SoftBadge>
                    </div>
                    <p className="mt-2 text-body-md text-text-muted">{sc.connection}</p>
                    {sc.differentPerspective ? (
                      <p className="mt-1 text-body-sm text-text-muted italic">
                        다른 관점: {sc.differentPerspective}
                      </p>
                    ) : null}
                  </SurfaceCard>
                ))}
              </section>
            ) : null}

            {/* 다시 읽을 말씀 */}
            {review.scriptureReadings?.length ? (
              <section className="space-y-3">
                <h2 className="text-headline-sm text-primary">다시 읽을 말씀</h2>
                {review.scriptureReadings.map((sr, idx) => (
                  <SurfaceCard key={idx} className="border-l-4 border-l-accent-gold/50">
                    <h3 className="text-label-md text-primary">{sr.ref}</h3>
                    <p className="mt-1 text-body-md text-text-muted">{sr.reason}</p>
                    {sr.focus ? (
                      <p className="mt-1 text-label-sm text-text-muted">💡 {sr.focus}</p>
                    ) : null}
                  </SurfaceCard>
                ))}
              </section>
            ) : null}

            <SurfaceCard>
              <h2 className="text-headline-sm text-primary">
                달라진 점 또는 아직 알 수 없는 점
              </h2>
              <p className="mt-2 text-body-md text-text-muted">
                {review.changesOrUnknown}
              </p>
            </SurfaceCard>

            {review.rereadEntries?.length ? (
              <SurfaceCard>
                <h2 className="text-headline-sm text-primary">다시 읽어볼 기록</h2>
                <ul className="mt-3 space-y-2">
                  {review.rereadEntries.map((item) => (
                    <li key={item.entryId}>
                      <Link
                        href={`/entries/${item.entryId}`}
                        className="text-label-md text-primary"
                      >
                        기록 열기
                      </Link>
                      <p className="text-label-md text-text-muted">{item.reason}</p>
                    </li>
                  ))}
                </ul>
              </SurfaceCard>
            ) : null}
            {rereadScriptures.length ? (
              <RereadScriptureList
                items={rereadScriptures}
                variant="review"
                title="다시 머물 본문"
                subtitle="문맥 전체를 읽고, 해석은 확정하지 마세요. 기록과 닿아 보이는 본문입니다."
              />
            ) : null}
            {review.smallPractices?.length ? (
              <SurfaceCard>
                <h2 className="text-headline-sm text-primary">작은 실천 후보</h2>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-body-md text-text-muted">
                  {review.smallPractices.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </SurfaceCard>
            ) : null}

            {/* 다음 한 걸음 */}
            {review.nextSteps?.length ? (
              <SurfaceCard className="border-l-4 border-l-leaf">
                <h2 className="text-headline-sm text-primary">다음 한 걸음</h2>
                <div className="mt-3 space-y-3">
                  {review.nextSteps.map((ns, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="mt-0.5 text-lg">👣</span>
                      <div>
                        <p className="text-label-md text-primary">{ns.action}</p>
                        <p className="text-label-sm text-text-muted">{ns.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SurfaceCard>
            ) : null}

            {/* 기도로 이어가기 */}
            {review.prayerPrompts?.length ? (
              <SurfaceCard className="border-l-4 border-l-clay">
                <h2 className="text-headline-sm text-primary">기도로 이어가기</h2>
                <div className="mt-3 space-y-3">
                  {review.prayerPrompts.map((pp, idx) => (
                    <div key={idx}>
                      <p className="text-label-md text-primary">🙏 {pp.topic}</p>
                      <p className="mt-1 text-body-md text-text-muted">{pp.suggestion}</p>
                    </div>
                  ))}
                </div>
              </SurfaceCard>
            ) : null}

            <SurfaceCard>
              <h2 className="text-headline-sm text-primary">분석의 한계</h2>
              <p className="mt-2 text-body-md text-text-muted">{review.limitations}</p>
              <p className="mt-3 text-label-sm text-text-muted">
                model: {report.modelProvider}/{report.modelName}
              </p>
            </SurfaceCard>

            <SurfaceCard className="border-l-4 border-l-accent-gold/50">
              <h2 className="text-headline-sm text-primary">이야기 거울에서 더 찾기</h2>
              <p className="mt-2 text-body-md text-text-muted">
                이 회고의 주제와 겹치는 고전 인물·비유·교훈을 이야기 거울에서 확인할 수 있습니다.
              </p>
              <Link
                href="/story-mirror"
                className="mt-3 inline-flex items-center gap-1 text-label-md text-leaf hover:text-primary"
              >
                이야기 거울 바로가기 →
              </Link>
            </SurfaceCard>
          </>
        )}
      </div>
    </AppShell>
  );
}

function ObservationSection({
  title,
  items,
  reviewId,
  feedback,
}: {
  title: string;
  items?: Array<{
    key: string;
    title: string;
    body: string;
    confidence?: string;
    evidence?: Array<{ entryId: string; date?: string; excerpt: string }>;
  }>;
  reviewId?: string;
  feedback?: Record<string, unknown>;
}) {
  if (!items?.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-headline-sm text-primary">{title}</h2>
      {items.map((item) => (
        <SurfaceCard key={item.key} className="border-l-4 border-l-accent-gold/50">
          <div className="flex items-center gap-2">
            <h3 className="text-label-md text-primary">{item.title}</h3>
            {item.confidence ? <SoftBadge>{item.confidence}</SoftBadge> : null}
          </div>
          <p className="mt-2 text-body-md text-text-muted">{item.body}</p>
          {item.evidence?.length ? (
            <div className="mt-3 space-y-2 border-t border-[#E0DDD7] pt-3">
              {item.evidence.map((ev, idx) => (
                <div key={`${item.key}-${idx}`} className="text-label-sm text-text-muted">
                  <Link href={`/entries/${ev.entryId}`} className="text-primary">
                    근거 기록
                  </Link>
                  {ev.date ? <span> · {ev.date.slice(0, 10)}</span> : null}
                  <p className="mt-1 text-text-main">“{ev.excerpt}”</p>
                </div>
              ))}
            </div>
          ) : null}
          {reviewId ? (
            <div className="mt-3">
              <ObservationFeedback
                reviewId={reviewId}
                observationKey={item.key}
                initialFeedback={(feedback?.[`_feedback_${item.key}`] as string[]) ?? []}
              />
            </div>
          ) : null}
        </SurfaceCard>
      ))}
    </section>
  );
}
