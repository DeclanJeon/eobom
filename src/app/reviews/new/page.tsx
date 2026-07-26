import { AppShell } from "@/components/app-shell";
import { ReviewCreateForm } from "@/components/review-create-form";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";

export const metadata = { title: "회고 만들기" };

export default async function NewReviewPage() {
  const user = await requireUser();
  const count = await db.reflectionEntry.count({
    where: { userId: user.id, deletedAt: null },
  });

  return (
    <AppShell title="회고 만들기">
      <p className="mb-4 text-label-md text-text-muted">보관 중인 기록 {count}개</p>
      <ReviewCreateForm entryCount={count} />
    </AppShell>
  );
}
