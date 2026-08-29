import { AppShell } from "@/components/app-shell";
import { Breadcrumb, SurfaceCard } from "@/components/ui-blocks";
import { SettingsForm } from "@/components/settings-form";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { CompanionPanel } from "@/components/companion-panel";

export const metadata = { title: "설정" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ linked?: string; linkError?: string }>;
}) {
  const sessionUser = await requireUser();
  const user = await db.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
  });
  const query = await searchParams;
  const linkStatus =
    query.linked === "1"
      ? "linked"
      : query.linkError === "email_in_use" ||
          query.linkError === "account_in_use" ||
          query.linkError === "stale_intent"
        ? query.linkError
        : null;

  return (
    <AppShell title="설정">
      <Breadcrumb href="/me" label="내 정보" current="설정" className="mb-4" />
      <SurfaceCard>
        <SettingsForm
          initial={{
            accountEmail: user.email,
            linkStatus,
            displayName: user.displayName || user.name || "",
            preferredBibleTranslation: user.preferredBibleTranslation,
            aiProcessingConsent: user.aiProcessingConsent,
            communityEnabled: user.communityEnabled,
            pastTodayEnabled: user.pastTodayEnabled,
            storyMirrorEnabled:
              ((user as Record<string, unknown>).storyMirrorEnabled as boolean) ?? false,
            storyMirrorExternalConsent:
              ((user as Record<string, unknown>).storyMirrorExternalConsent as boolean) ?? false,
          }}
        />
      </SurfaceCard>
      <SurfaceCard className="mt-6">
        <p className="text-eyebrow">동행</p>
        <h2 className="mt-2 text-headline-sm text-primary">필요할 때만, 안전하게 연결하기</h2>
        <p className="mt-2 text-body-sm leading-relaxed text-text-muted">
          동행은 기존 AI 개인화 동의와 별개이며, 기본적으로 꺼져 있습니다. 공개할 정보와 요청 수신 여부를 직접 선택할 수 있습니다.
        </p>
        <div className="mt-6">
          <CompanionPanel />
        </div>
      </SurfaceCard>
    </AppShell>
  );
}
