import { AppShell } from "@/components/app-shell";
import { PageIntro, SurfaceCard } from "@/components/ui-blocks";
import { SettingsForm } from "@/components/settings-form";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";

export const metadata = { title: "설정" };

export default async function SettingsPage() {
  const sessionUser = await requireUser();
  const user = await db.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
  });

  return (
    <AppShell title="설정">
      <PageIntro
        title="설정"
        description="AI 처리와 알림성 기능은 기본 비활성에 가깝게 유지합니다."
      />
      <SurfaceCard>
        <SettingsForm
          initial={{
            displayName: user.displayName || user.name || "",
            preferredBibleTranslation: user.preferredBibleTranslation,
            aiProcessingConsent: user.aiProcessingConsent,
            communityEnabled: user.communityEnabled,
            pastTodayEnabled: user.pastTodayEnabled,
          }}
        />
      </SurfaceCard>
    </AppShell>
  );
}
