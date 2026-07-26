import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState, PageIntro, SoftBadge, SurfaceCard } from "@/components/ui-blocks";
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
    <AppShell
      title="회고"
      action={
        <Link
          href="/reviews/new"
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          회고 만들기
        </Link>
      }
    >
      <PageIntro
        title="AI 회고"
        description="회고는 평가서가 아니라 성찰 초안입니다. 충분한 기록이 쌓였을 때만 생성하세요."
      />

      {!user.aiProcessingConsent ? (
        <SurfaceCard className="mb-4 border-amber/30 bg-amber-light/40">
          <p className="text-sm leading-relaxed">
            AI 처리 동의가 아직 없습니다.{" "}
            <Link href="/me/settings" className="text-primary underline">
              설정
            </Link>
            에서 동의한 뒤 외부 모델 회고를 사용할 수 있습니다. 동의 없이도
            로컬 요약 초안은 생성할 수 있습니다.
          </p>
        </SurfaceCard>
      ) : null}

      {reports.length === 0 ? (
        <EmptyState
          title="저장된 회고가 없습니다"
          description="기간을 선택해 근거 기반 회고 초안을 만들어 보세요."
          action={
            <Link
              href="/reviews/new"
              className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              회고 생성
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Link key={report.id} href={`/reviews/${report.id}`}>
              <SurfaceCard className="transition hover:border-primary/25">
                <div className="flex items-center gap-2">
                  <SoftBadge>{report.reportType}</SoftBadge>
                  <span className="text-xs text-muted-foreground">
                    {formatDateShort(report.periodStart)} –{" "}
                    {formatDateShort(report.periodEnd)}
                  </span>
                </div>
                <h2 className="mt-3 font-serif text-xl leading-snug">
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
