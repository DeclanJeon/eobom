import { AppShell } from "@/components/app-shell";
import { SurfaceCard } from "@/components/ui-blocks";
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
      <SurfaceCard>
        <SettingsForm
          initial={{
            displayName: user.displayName || user.name || "",
            preferredBibleTranslation: user.preferredBibleTranslation,
            aiProcessingConsent: user.aiProcessingConsent,
            communityEnabled: user.communityEnabled,
            pastTodayEnabled: user.pastTodayEnabled,
            storyMirrorEnabled: (user as Record<string, unknown>).storyMirrorEnabled as boolean ?? false,
            storyMirrorExternalConsent: (user as Record<string, unknown>).storyMirrorExternalConsent as boolean ?? false,
          }}
        />
      </SurfaceCard>
    </AppShell>
  );
}
