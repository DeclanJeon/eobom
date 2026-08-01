/**
 * /lookback — 돌아보기 · 회고 목록
 *
 * 회고 중심 단일 흐름: 최신 회고는 "지금의 회고"로 강조하고,
 * 지난 회고는 그리드로 보여 준다. 이야기·시각화는 상세에서 이어진다.
 */

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState, PageIntro, SoftBadge, SurfaceCard } from "@/components/ui-blocks";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/utils";
import { reportTypeLabel } from "@/lib/review-display";

export const metadata = { title: "돌아보기" };

export default async function LookbackPage() {
  const user = await requireUser();

  const [reports, latestViz] = await Promise.all([
    db.reviewReport.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    db.userVisualization.findFirst({
      where: { userId: user.id, status: "complete", imageUrl: { not: null } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const latest = reports[0];
  const past = reports.slice(1);

  return (
    <AppShell wide bare>
      <section className="mb-8 max-w-2xl md:mb-10">
        <PageIntro
          className="mb-0"
          eyebrow="돌아보기"
          title="기록이 남긴 흐름을 다시 봅니다"
          description="회고로 주제를 발견하고, 이야기와 이미지로 기억합니다."
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/reviews/new"
            className="cta-primary min-h-[44px] px-6 py-3"
          >
            회고 생성하기
          </Link>
          {!user.aiProcessingConsent ? (
            <Link
              href="/me/settings"
              className="cta-secondary min-h-[44px] px-6 py-3"
            >
              AI 동의 설정
            </Link>
          ) : null}
        </div>
      </section>

      {reports.length === 0 ? (
        <EmptyState
          title="회고가 없습니다"
          description="기록이 3개 이상 쌓이면 회고를 만들 수 있습니다."
        />
      ) : (
        <>
          <section className="mb-8">
            <h2 className="text-headline-sm text-primary">지금의 회고</h2>
            <Link
              href={`/lookback/${latest!.id}`}
              className="mt-3 block"
            >
              <SurfaceCard className="grid gap-4 p-5 transition hover:border-accent-gold/30 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <SoftBadge>
                      {reportTypeLabel(latest!.reportType)}
                    </SoftBadge>
                    <span className="text-label-sm text-text-muted">
                      {formatDateShort(latest!.periodStart)} –{" "}
                      {formatDateShort(latest!.periodEnd)}
                    </span>
                  </div>
                  <h3 className="mt-3 line-clamp-4 text-headline-md text-primary">
                    {latest!.summary || "회고 초안"}
                  </h3>
                  <p className="mt-4 text-label-sm text-leaf">회고 보기 →</p>
                </div>
                {latestViz?.imageUrl ? (
                  <div className="hidden sm:block">
                    {/* imageUrl은 이미 API URL 형식(/api/story-mirror/visualize?file=...) */}
                    <img
                      src={latestViz.imageUrl}
                      alt="최근 시각화 미리보기"
                      width={160}
                      height={160}
                      className="h-40 w-40 rounded-xl object-cover"
                    />
                  </div>
                ) : null}
              </SurfaceCard>
            </Link>
          </section>

          {past.length > 0 ? (
            <section>
            <h2 className="text-headline-sm text-primary">지난 회고</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((report) => (
                  <Link key={report.id} href={`/lookback/${report.id}`}>
                    <SurfaceCard className="h-full transition hover:border-accent-gold/30">
                      <div className="flex flex-wrap items-center gap-2">
                        <SoftBadge>
                          {reportTypeLabel(report.reportType)}
                        </SoftBadge>
                        <span className="text-label-sm text-text-muted">
                          {formatDateShort(report.periodStart)} –{" "}
                          {formatDateShort(report.periodEnd)}
                        </span>
                      </div>
                      <h3 className="mt-3 line-clamp-3 text-headline-sm text-primary">
                        {report.summary || "회고 초안"}
                      </h3>
                    </SurfaceCard>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </AppShell>
  );
}
