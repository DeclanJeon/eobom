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
    <AppShell
      title="회고"
      action={
        <Link
          href="/reviews/new"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          만들기
        </Link>
      }
    >
      {!user.aiProcessingConsent ? (
        <p className="mb-4 text-sm text-muted-foreground">
          AI 동의는{" "}
          <Link href="/me/settings" className="text-primary underline">
            설정
          </Link>
          에서 할 수 있습니다. 없어도 로컬 초안은 만들 수 있습니다.
        </p>
      ) : null}

      {reports.length === 0 ? (
        <EmptyState
          title="회고가 없습니다"
          description="위의 만들기로 첫 회고 초안을 생성하세요."
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
