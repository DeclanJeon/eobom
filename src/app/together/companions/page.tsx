import { AppShell } from "@/components/app-shell";
import { Breadcrumb, SurfaceCard } from "@/components/ui-blocks";
import { CompanionPanel } from "@/components/companion-panel";
import { requireUser } from "@/lib/session";

export const metadata = { title: "동행" };
export const dynamic = "force-dynamic";

export default async function CompanionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string }>;
}) {
  await requireUser();
  const fromReview = (await searchParams)?.from === "review";
  return (
    <AppShell title="동행">
      <Breadcrumb href="/together" label="함께" current="동행" className="mb-4" />
      <SurfaceCard>
        <p className="text-eyebrow">선택적 연결</p>
        <h1 className="mt-2 text-headline-md text-primary">필요할 때만, 함께할 사람을 찾아요</h1>
        <p className="mt-2 text-body-md leading-relaxed text-text-muted">
          기록 원문과 연락처는 동의 없이 공개하지 않아요. 연결하지 않고 말씀만 받는 것도 충분합니다.
        </p>
        {fromReview ? (
          <p className="mt-3 rounded-xl border border-border/70 bg-surface-low px-4 py-3 text-body-sm text-text-muted">
            회고에서 발견한 마음을 바탕으로, 필요할 때만 동행을 찾아볼 수 있어요. 회고 원문은 자동으로 공유되지 않습니다.
          </p>
        ) : null}
        <div className="mt-6"><CompanionPanel /></div>
      </SurfaceCard>
    </AppShell>
  );
}
