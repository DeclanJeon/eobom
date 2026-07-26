import { AppShell } from "@/components/app-shell";
import { PageIntro, SurfaceCard } from "@/components/ui-blocks";
import { ReviewCreateForm } from "@/components/review-create-form";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";

export const metadata = { title: "회고 생성" };

export default async function NewReviewPage() {
  const user = await requireUser();
  const count = await db.reflectionEntry.count({
    where: { userId: user.id, deletedAt: null },
  });

  return (
    <AppShell title="회고 생성">
      <PageIntro
        title="기간 회고 만들기"
        description={`현재 보관 중인 기록 ${count}개. 기록이 부족하면 억지로 분석하지 않습니다.`}
      />
      <SurfaceCard>
        <ReviewCreateForm entryCount={count} />
      </SurfaceCard>
    </AppShell>
  );
}
