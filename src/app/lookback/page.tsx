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
import { formatDateShort, parseJsonArray } from "@/lib/utils";
import { reportTypeLabel, reviewListFace } from "@/lib/review-display";
import type { StructuredReview } from "@/lib/mimo";

function parseReview(report: { structuredOutput: string }): StructuredReview | null {
  try {
    return JSON.parse(report.structuredOutput) as StructuredReview;
  } catch {
    return null;
  }
}

export const metadata = { title: "돌아보기" };
export const dynamic = "force-dynamic";

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
            {(() => {
              const r = parseReview(latest!);
              const count = parseJsonArray(latest!.includedEntryIds).length;
              const face = reviewListFace(r, {
                entryCount: count,
                periodStart: latest!.periodStart,
                periodEnd: latest!.periodEnd,
              });
              return (
                <Link href={`/lookback/${latest!.id}`} className="mt-3 block">
                  <SurfaceCard
                    className={
                      latestViz?.imageUrl
                        ? "grid gap-5 p-6 transition hover:border-accent-gold/30 sm:grid-cols-[1fr_auto] sm:items-center"
                        : "p-6 transition hover:border-accent-gold/30"
                    }
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <SoftBadge>{reportTypeLabel(latest!.reportType)}</SoftBadge>
                        <span className="text-label-sm text-text-muted">
                          {formatDateShort(latest!.periodStart)} –{" "}
                          {formatDateShort(latest!.periodEnd)}
                          {count > 0 ? ` · 기록 ${count}편` : ""}
                        </span>
                      </div>
                      <h3 className="mt-3 line-clamp-4 font-serif text-headline-md leading-relaxed text-primary">
                        {face.sentence}
                      </h3>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        {face.mood ? (
                          <span className="chip">자주 머물던 마음 · {face.mood}</span>
                        ) : null}
                        <span className="text-label-sm text-leaf">이 거울 다시 보기 →</span>
                      </div>
                    </div>
                    {latestViz?.imageUrl ? (
                      <div className="hidden sm:block">
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
              );
            })()}
          </section>

          {past.length > 0 ? (
            <section>
              <h2 className="text-headline-sm text-primary">지난 회고</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((report) => {
                  const r = parseReview(report);
                  const count = parseJsonArray(report.includedEntryIds).length;
                  const face = reviewListFace(r, {
                    entryCount: count,
                    periodStart: report.periodStart,
                    periodEnd: report.periodEnd,
                  });
                  return (
                    <Link key={report.id} href={`/lookback/${report.id}`}>
                      <SurfaceCard className="flex h-full flex-col transition hover:border-accent-gold/30">
                        <div className="flex flex-wrap items-center gap-2">
                          <SoftBadge>{reportTypeLabel(report.reportType)}</SoftBadge>
                          <span className="text-label-sm text-text-muted">
                            {formatDateShort(report.periodStart)} –{" "}
                            {formatDateShort(report.periodEnd)}
                          </span>
                        </div>
                        <h3 className="mt-3 line-clamp-3 font-serif text-body-lg leading-relaxed text-primary">
                          {face.sentence}
                        </h3>
                        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                          {count > 0 ? (
                            <span className="chip">기록 {count}편</span>
                          ) : null}
                          {face.mood ? (
                            <span className="chip">{face.mood}</span>
                          ) : null}
                        </div>
                      </SurfaceCard>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}
        </>
      )}
    </AppShell>
  );
}
