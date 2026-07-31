import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SurfaceCard } from "@/components/ui-blocks";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { parseJsonArray } from "@/lib/utils";
import type { StructuredReview } from "@/lib/mimo";
import {
  normalizeReviewForDisplay,
  reviewLimitationsText,
  toSimpleReviewView,
} from "@/lib/review-display";
import { ReviewDetailHeader } from "@/components/review/review-detail-header";
import { ReviewSimpleView } from "@/components/review/review-simple-view";
import { getReviewScopedStoryItems } from "@/lib/story-mirror/db";

export const metadata = { title: "회고" };

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
  const entryCount = includedEntryIds.length
    ? await db.reflectionEntry.count({
        where: {
          id: { in: includedEntryIds },
          userId: user.id,
          deletedAt: null,
        },
      })
    : 0;

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
  const storyItems = await getReviewScopedStoryItems({
    userId: user.id,
    storyConnections: display.storyConnections,
  });

  const simple = toSimpleReviewView(display, {
    stories: storyItems.map((s) => ({
      title: s.title,
      source: s.source,
      line:
        s.differentPerspective?.trim() ||
        s.connection.split(/(?<=[.!?。…])\s+/)[0] ||
        s.connection,
      href: s.href,
    })),
    communityQuestions: (review.communityQuestions ?? []).filter((q) =>
      Boolean(q?.trim()),
    ),
  });

  return (
    <AppShell>
      <div className="mb-5">
        <ReviewDetailHeader
          reportType={report.reportType}
          periodStart={report.periodStart}
          periodEnd={report.periodEnd}
        />
      </div>
      <ReviewSimpleView
        periodStart={report.periodStart}
        periodEnd={report.periodEnd}
        entryCount={entryCount}
        view={simple}
        boundary={reviewLimitationsText(display)}
      />
    </AppShell>
  );
}
