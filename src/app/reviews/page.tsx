import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { LookbackTabs } from "@/components/lookback-tabs";
import { EmptyState, SoftBadge, SurfaceCard } from "@/components/ui-blocks";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/utils";
import { reportTypeLabel } from "@/lib/review-display";
export const metadata = { title: "돌아보기 · 회고" };

export default async function ReviewsPage() {
  const user = await requireUser();
  const reports = await db.reviewReport.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell wide bare>
      <LookbackTabs pathname="/reviews" />

      <section className="mb-8 max-w-2xl md:mb-10">
        <p className="text-eyebrow">AI 회고</p>
        <h1 className="mt-2 text-display-lg text-primary md:text-4xl">
          그간의 여정을 갈무리합니다
        </h1>
        <p className="mt-3 text-body-md text-text-muted">
          평가가 아니라, 기록이 비추는 거울입니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/reviews/new" className="cta-primary min-h-[48px] px-6 py-3">
            회고 생성하기
          </Link>
          {!user.aiProcessingConsent ? (
            <Link
              href="/me/settings"
              className="cta-secondary min-h-[48px] px-6 py-3"
            >
              AI 동의 설정
            </Link>
          ) : null}
        </div>
      </section>

      {reports.length === 0 ? (
        <EmptyState
          title="회고가 없습니다"
          description="충분한 기록이 쌓이면 회고 초안을 만들 수 있습니다."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Link key={report.id} href={`/reviews/${report.id}`}>
              <SurfaceCard className="h-full transition hover:border-accent-gold/30">
                <div className="flex flex-wrap items-center gap-2">
                  <SoftBadge>{reportTypeLabel(report.reportType)}</SoftBadge>
                  <span className="text-label-sm text-text-muted">
                    {formatDateShort(report.periodStart)} –{" "}
                    {formatDateShort(report.periodEnd)}
                  </span>
                </div>
                <h2 className="mt-3 text-headline-sm text-primary">
                  {report.summary || "회고 초안"}
                </h2>
              </SurfaceCard>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
