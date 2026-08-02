import Link from "next/link";
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
import { VisualizationCard } from "@/components/visualization-card";
import { getReviewScopedStoryItems } from "@/lib/story-mirror/db";
import {
  computeVisualizationFingerprint,
  deriveVisualizationFreshness,
  getStoredFingerprint,
  hasSynthesisInDataJson,
} from "@/lib/story-mirror/visualization-fingerprint";

export const metadata = { title: "돌아보기 · 회고" };

export default async function LookbackDetailPage({
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

  const display = review
    ? normalizeReviewForDisplay(review)
    : null;
  const storyItems = display
    ? await getReviewScopedStoryItems({
        userId: user.id,
        storyConnections: display.storyConnections,
      })
    : [];

  const simple = display
    ? toSimpleReviewView(display, {
        stories: storyItems.map((s) => ({
          title: s.title,
          source: s.source,
          line:
            s.differentPerspective?.trim() ||
            s.connection.split(/(?<=[.!?。…])\s+/)[0] ||
            s.connection,
          href: s.href,
        })),
        communityQuestions: (review?.communityQuestions ?? []).filter((q) =>
          Boolean(q?.trim()),
        ),
      })
    : null;

  // "지금의 모습" — 사용자 최신 시각화 (회고별 개별 시각화는 다음 스프린트)
  const vizRow = await db.userVisualization.findFirst({
    where: { userId: user.id, kind: "summary", imageUrl: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  let vizFreshness: ReturnType<typeof deriveVisualizationFreshness> = "none";
  if (vizRow) {
    const storedFingerprint = getStoredFingerprint(vizRow.dataJson);
    const currentFingerprint = await computeVisualizationFingerprint(user.id, {
      kind: "summary",
    });
    vizFreshness = deriveVisualizationFreshness({
      hasImage: Boolean(vizRow.imageUrl),
      hasSynthesis: hasSynthesisInDataJson(vizRow.dataJson),
      storedFingerprint,
      currentFingerprint,
    });
  }

  return (
    <AppShell>
      <div className="mb-5">
        <ReviewDetailHeader
          reportType={report.reportType}
          periodStart={report.periodStart}
          periodEnd={report.periodEnd}
        />
      </div>

      {simple && display ? (
        <ReviewSimpleView
          periodStart={report.periodStart}
          periodEnd={report.periodEnd}
          entryCount={entryCount}
          view={simple}
          boundary={reviewLimitationsText(display)}
        />
      ) : (
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
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-headline-sm text-primary">지금의 모습</h2>
          <Link
            href="/story-mirror/visualize"
            className="inline-flex min-h-11 items-center text-label-sm text-leaf transition hover:text-primary"
          >
            크게 보기 →
          </Link>
        </div>
        {vizRow ? (
          <VisualizationCard
            kind="summary"
            initial={{
              id: vizRow.id,
              kind: vizRow.kind,
              status: vizRow.status,
              imageUrl: vizRow.imageUrl,
              dataJson: vizRow.dataJson,
              freshness: vizFreshness,
            }}
            initialFreshness={vizFreshness}
          />
        ) : (
          <VisualizationCard kind="summary" initialFreshness="none" />
        )}
      </section>

      <div className="mt-8 flex flex-wrap gap-3 border-t border-border/70 pt-6">
        <Link
          href="/reviews/new"
          className="cta-primary min-h-[44px] px-5 py-2.5"
        >
          새 회고 작성
        </Link>
        <Link
          href="/lookback"
          className="cta-secondary min-h-[44px] px-5 py-2.5"
        >
          다른 회고 목록
        </Link>
      </div>
    </AppShell>
  );
}
