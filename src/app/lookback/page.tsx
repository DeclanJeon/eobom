/**
 * /lookback — 돌아보기 허브
 * 회고 → 이야기 → 시각화 흐름을 한곳에서 안내한다.
 */

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { LookbackTabs } from "@/components/lookback-tabs";
import { SurfaceCard } from "@/components/ui-blocks";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { getLatestRun, getLatestRagRun } from "@/lib/story-mirror/db";
import { formatDateShort } from "@/lib/utils";
import { reportTypeLabel } from "@/lib/review-display";
import {
  computeVisualizationFingerprint,
  deriveVisualizationFreshness,
  getStoredFingerprint,
  hasSynthesisInDataJson,
} from "@/lib/story-mirror/visualization-fingerprint";

export const metadata = { title: "돌아보기" };

export default async function LookbackPage() {
  const user = await requireUser();

  const [latestReview, entryCount, storyRun, ragRun, viz] = await Promise.all([
    db.reviewReport.findFirst({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    db.reflectionEntry.count({
      where: { userId: user.id, deletedAt: null },
    }),
    getLatestRun(user.id),
    getLatestRagRun(user.id),
    db.userVisualization.findFirst({
      where: { userId: user.id, status: "complete" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const storyCount =
    (storyRun?.matches.length ?? 0) ||
    (ragRun?.matches.filter((m) => m.connection?.trim()).length ?? 0);

  let vizFreshness: "none" | "fresh" | "stale" = "none";
  if (viz?.imageUrl) {
    const currentFp = await computeVisualizationFingerprint(user.id, {
      kind: viz.kind || "summary",
    });
    vizFreshness = deriveVisualizationFreshness({
      hasImage: true,
      hasSynthesis: hasSynthesisInDataJson(viz.dataJson),
      storedFingerprint: getStoredFingerprint(viz.dataJson),
      currentFingerprint: currentFp,
    });
  }

  return (
    <AppShell wide bare>
      <section className="mb-6 max-w-2xl md:mb-8">
        <p className="text-eyebrow text-accent-gold-ink">돌아보기</p>
        <h1 className="mt-2 text-display-lg text-primary md:text-4xl">
          기록이 남긴 흐름을 다시 봅니다
        </h1>
        <p className="mt-3 text-body-md text-text-muted">
          회고로 주제를 발견하고, 이야기로 연결한 뒤, 이미지로 기억합니다.
          그 다음 오늘의 결단으로 돌아옵니다.
        </p>
      </section>

      <LookbackTabs pathname="/lookback" />

      <ol className="grid gap-3 sm:grid-cols-3">
        <li>
          <Link href="/reviews" className="block h-full">
            <SurfaceCard className="h-full border-l-4 border-l-accent-gold/50 transition hover:border-accent-gold/40">
              <p className="text-label-sm text-text-muted">1 · 회고</p>
              <h2 className="mt-1 text-headline-sm text-primary">주제를 발견</h2>
              {latestReview ? (
                <>
                  <p className="mt-2 line-clamp-3 text-body-md text-text-muted">
                    {latestReview.summary || "회고 초안이 준비되어 있습니다."}
                  </p>
                  <p className="mt-3 text-label-xs text-text-muted">
                    {reportTypeLabel(latestReview.reportType)} ·{" "}
                    {formatDateShort(latestReview.periodStart)} –{" "}
                    {formatDateShort(latestReview.periodEnd)}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-body-md text-text-muted">
                  {entryCount >= 3
                    ? "기록이 쌓였어요. 회고 초안을 만들어 보세요."
                    : "기록이 3개 이상 쌓이면 회고를 만들 수 있습니다."}
                </p>
              )}
              <p className="mt-4 text-label-sm text-leaf">
                {latestReview ? "회고 보기 →" : "회고 시작 →"}
              </p>
            </SurfaceCard>
          </Link>
        </li>

        <li>
          <Link href="/story-mirror" className="block h-full">
            <SurfaceCard className="h-full border-l-4 border-l-leaf/50 transition hover:border-accent-gold/40">
              <p className="text-label-sm text-text-muted">2 · 이야기</p>
              <h2 className="mt-1 text-headline-sm text-primary">고전·성경과 연결</h2>
              {storyCount > 0 ? (
                <p className="mt-2 text-body-md text-text-muted">
                  닿은 이야기 {storyCount}개가 준비되어 있습니다.
                </p>
              ) : (
                <p className="mt-2 text-body-md text-text-muted">
                  회고 속 마음을 고전·성경 이야기와 잇습니다.
                </p>
              )}
              <p className="mt-4 text-label-sm text-leaf">이야기 보기 →</p>
            </SurfaceCard>
          </Link>
        </li>

        <li>
          <Link href="/story-mirror/visualize" className="block h-full">
            <SurfaceCard className="h-full border-l-4 border-l-accent-terracotta/50 transition hover:border-accent-gold/40">
              <p className="text-label-sm text-text-muted">3 · 시각화</p>
              <h2 className="mt-1 text-headline-sm text-primary">이미지로 기억</h2>
              {viz ? (
                <p className="mt-2 text-body-md text-text-muted">
                  {vizFreshness === "stale"
                    ? "기록이 달라졌어요. 새 장면으로 다시 그릴 수 있습니다."
                    : "이번 계절의 기록이 하나의 장면으로 남아 있습니다."}
                </p>
              ) : (
                <p className="mt-2 text-body-md text-text-muted">
                  회고와 기록을 AI가 읽고 하나의 이미지와 해설로 보여 줍니다.
                </p>
              )}
              <p className="mt-4 text-label-sm text-leaf">
                {viz
                  ? vizFreshness === "stale"
                    ? "다시 그리기 →"
                    : "시각화 보기 →"
                  : "이미지 만들기 →"}
              </p>
            </SurfaceCard>
          </Link>
        </li>
      </ol>

      <p className="mt-8 text-center text-label-sm text-text-muted">
        돌아본 뒤에는{" "}
        <Link href="/today" className="text-leaf hover:text-primary">
          오늘의 결단
        </Link>
        으로 이어갈 수 있습니다.
      </p>
    </AppShell>
  );
}
