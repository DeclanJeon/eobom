import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState, SoftBadge, SurfaceCard } from "@/components/ui-blocks";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/utils";

export const metadata = { title: "회고" };

export default async function ReviewsPage() {
  const user = await requireUser();
  const reports = await db.reviewReport.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell bare>
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            ✿
          </span>
          <h1 className="font-journal text-title-journal text-primary">이어봄</h1>
        </div>
      </header>

      <section className="mb-6">
        <h2 className="text-display-lg text-primary">
          그간의 여정을
          <br />
          갈무리합니다
        </h2>
        <p className="mt-2 text-body-md text-text-muted">
          흩어진 묵상과 기록들을 모아 AI가 당신의 영적 성장을 조망합니다.
        </p>
      </section>

      <Link href="/reviews/new" className="cta-primary mb-8 w-full gap-2 py-4">
        ✦ 회고 생성하기
      </Link>

      {!user.aiProcessingConsent ? (
        <p className="mb-4 text-label-md text-text-muted">
          AI 동의는{" "}
          <Link href="/me/settings" className="text-primary underline">
            설정
          </Link>
          에서 할 수 있습니다.
        </p>
      ) : null}

      {reports.length === 0 ? (
        <EmptyState
          title="회고가 없습니다"
          description="충분한 기록이 쌓이면 회고 초안을 만들 수 있습니다."
        />
      ) : (
        <div className="space-y-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-label-md text-text-muted">최근 회고</h3>
            <span className="chip border-accent-gold/20 bg-[#F7F0E2] text-accent-gold">
              New
            </span>
          </div>
          {reports.map((report) => (
            <Link key={report.id} href={`/reviews/${report.id}`}>
              <SurfaceCard className="mb-3 transition hover:border-accent-gold/30">
                <div className="flex items-center gap-2">
                  <SoftBadge>{report.reportType}</SoftBadge>
                  <span className="text-label-sm text-text-muted">
                    {formatDateShort(report.periodStart)} –{" "}
                    {formatDateShort(report.periodEnd)}
                  </span>
                </div>
                <h3 className="mt-3 text-headline-sm text-primary">
                  {report.summary || "회고 초안"}
                </h3>
              </SurfaceCard>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
