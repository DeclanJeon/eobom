import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SurfaceCard } from "@/components/ui-blocks";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { parseJsonArray } from "@/lib/utils";
import type { StructuredReview } from "@/lib/mimo";
import { normalizeRereadScriptures, type RereadScripture } from "@/lib/reread-scriptures";
import { RereadScriptureList } from "@/components/reread-scripture-list";
import {
  normalizeReviewForDisplay,
  reviewLimitationsText,
  type DisplayObservation,
} from "@/lib/review-display";
import { ReviewDetailHeader } from "@/components/review/review-detail-header";
import { ReviewHero } from "@/components/review/review-hero";
import { ReviewSectionNav, type TocItem } from "@/components/review/review-section-nav";
import { ReviewObservationGroup } from "@/components/review/review-observation-group";
import { ReviewScriptureSection } from "@/components/review/review-scripture-section";
import { ReviewForwardPanel } from "@/components/review/review-forward-panel";
import { StoryMirrorBridge } from "@/components/review/story-mirror-bridge";
import { ReviewBoundaryNote } from "@/components/review/review-boundary-note";
import { getLatestRun, getLatestRagRun } from "@/lib/story-mirror/db";

export const metadata = { title: "회고" };

function countEvidence(items: DisplayObservation[]): number {
  return items.reduce((sum, it) => sum + it.evidence.length, 0);
}

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const latestRun = await getLatestRun(user.id);
  const latestRagRun = await getLatestRagRun(user.id);
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
  const rereadScriptures: RereadScripture[] = normalizeRereadScriptures(
    review?.rereadScriptures,
    {
      allowedRefs: includedEntries.flatMap((entry) =>
        parseJsonArray(entry.scriptureRefs),
      ),
    },
  );

  if (!review) {
    return (
      <AppShell title="회고">
        <ReviewDetailHeader
          reportType={report.reportType}
          periodStart={report.periodStart}
          periodEnd={report.periodEnd}
        />
        <div className="mt-4">
          <SurfaceCard>
            <h2 className="text-headline-sm text-primary">
              회고 본문을 열 수 없습니다
            </h2>
            <p className="mt-2 text-body-md text-text-muted">
              저장된 회고 형식을 읽지 못했습니다. 같은 기간으로 다시 만들어 볼 수
              있습니다.
            </p>
          </SurfaceCard>
        </div>
      </AppShell>
    );
  }

  const display = normalizeReviewForDisplay(review);
  const entryCount = includedEntries.length;
  const evidenceCount =
    countEvidence(display.themes) +
    countEvidence(display.emotions) +
    countEvidence(display.questions) +
    countEvidence(display.scriptureConnections) +
    countEvidence(display.actionFlow);

  const heroTitle = display.oneSentence || report.summary || "회고";

  const toc: TocItem[] = [
    { id: "themes", label: "주제와 마음" },
    { id: "story-mirror", label: "이야기 거울" },
    { id: "scripture", label: "다시 읽을 말씀" },
    { id: "changes", label: "성찰과 변화" },
    { id: "next", label: "다음 한 걸음" },
  ];

  return (
    <AppShell>
      <ReviewDetailHeader
        reportType={report.reportType}
        periodStart={report.periodStart}
        periodEnd={report.periodEnd}
      />

      <div className="mt-4 lg:grid lg:grid-cols-[180px_1fr] lg:gap-8">
        <aside className="hidden lg:block">
          <ReviewSectionNav items={toc} />
        </aside>
        <div className="mt-4 space-y-10 lg:mt-0">
          <div id="overview" className="scroll-mt-24">
            <ReviewHero
              title={heroTitle}
              periodStart={report.periodStart}
              periodEnd={report.periodEnd}
              entryCount={entryCount}
              evidenceCount={evidenceCount}
            />
          </div>

          <section id="themes" className="space-y-8 scroll-mt-24">
            <ReviewObservationGroup
              title="자주 나타난 주제"
              items={display.themes}
              reviewId={id}
              feedback={review}
            />
            <ReviewObservationGroup
              title="반복해서 드러난 마음"
              items={display.emotions}
              reviewId={id}
              feedback={review}
            />
            <ReviewObservationGroup
              title="붙잡고 있던 질문"
              items={display.questions}
              reviewId={id}
              feedback={review}
            />
            {display.scriptureConnections.length ? (
              <ReviewObservationGroup
                title="말씀과 삶의 연결"
                items={display.scriptureConnections}
                reviewId={id}
                feedback={review}
              />
            ) : null}
            {display.actionFlow.length ? (
              <ReviewObservationGroup
                title="이전 결단의 흐름"
                items={display.actionFlow}
                reviewId={id}
                feedback={review}
              />
            ) : null}
          </section>

          <section id="story-mirror" className="scroll-mt-24">
            <StoryMirrorBridge
              latestRun={latestRun}
              latestRagRun={latestRagRun}
              storyConnections={display.storyConnections}
            />
          </section>

          <section id="scripture" className="space-y-8 scroll-mt-24">
            <ReviewScriptureSection items={display.scriptureReadings} />
            {display.rereadEntries.length ? (
              <SurfaceCard>
                <h2 className="text-headline-sm text-primary">다시 읽어볼 기록</h2>
                <ul className="mt-3 space-y-2">
                  {display.rereadEntries.map((item) => (
                    <li key={item.entryId}>
                      <Link
                        href={`/entries/${item.entryId}`}
                        className="text-label-md text-primary hover:underline"
                      >
                        기록 열기
                      </Link>
                      {item.reason ? (
                        <p className="text-label-md text-text-muted">
                          {item.reason}
                        </p>
                      ) : null}
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
          </section>

          <section id="changes" className="scroll-mt-24">
            {display.changesOrUnknown ? (
              <SurfaceCard>
                <h2 className="text-headline-sm text-primary">
                  달라진 점 또는 아직 알 수 없는 점
                </h2>
                <p className="mt-2 text-body-md text-text-muted">
                  {display.changesOrUnknown}
                </p>
              </SurfaceCard>
            ) : null}
          </section>

          <section id="next" className="scroll-mt-24">
            <ReviewForwardPanel
              nextSteps={display.nextSteps}
              prayerPrompts={display.prayerPrompts}
              smallPractices={display.smallPractices}
            />
          </section>

          <ReviewBoundaryNote text={reviewLimitationsText(display)} />
        </div>
      </div>

      <div className="mt-4 lg:hidden">
        <ReviewSectionNav items={toc} />
      </div>
    </AppShell>
  );
}
