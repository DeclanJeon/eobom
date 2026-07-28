import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ReviewCreateForm } from "@/components/review-create-form";
import { SurfaceCard } from "@/components/ui-blocks";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { getUserPreferenceFlags } from "@/lib/user-preferences";

export const metadata = { title: "회고 만들기" };

export default async function NewReviewPage() {
  const user = await requireUser();
  const [count, flags] = await Promise.all([
    db.reflectionEntry.count({
      where: { userId: user.id, deletedAt: null },
    }),
    getUserPreferenceFlags(user.id),
  ]);

  return (
    <AppShell title="회고 만들기">
      <p className="mb-4 text-label-md text-text-muted">보관 중인 기록 {count}개</p>
      {flags.aiProcessingConsent ? (
        <ReviewCreateForm entryCount={count} />
      ) : (
        <SurfaceCard>
          <h2 className="text-headline-sm text-primary">AI 회고 허용이 필요합니다</h2>
          <p className="mt-2 text-body-md text-text-muted">
            회고를 만들면 선택한 기간의 기록 일부가 외부 모델로 전송될 수 있습니다.
            설정에서 허용한 뒤에 다시 시도해 주세요.
          </p>
          <Link href="/me/settings" className="cta-primary mt-5 inline-flex min-h-[48px] px-6 py-3">
            설정으로 이동
          </Link>
        </SurfaceCard>
      )}
    </AppShell>
  );
}
