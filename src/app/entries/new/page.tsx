import { AppShell } from "@/components/app-shell";
import { PageIntro, SurfaceCard } from "@/components/ui-blocks";
import { EntryForm } from "@/components/entry-form";
import { requireUser } from "@/lib/session";

export const metadata = { title: "새 기록" };

export default async function NewEntryPage() {
  await requireUser();
  return (
    <AppShell title="새 기록">
      <PageIntro
        title="묵상 기록하기"
        description="필수 항목은 본문과 성구(또는 제목)뿐입니다. 나머지는 필요할 때만 열어 주세요."
      />
      <SurfaceCard>
        <EntryForm />
      </SurfaceCard>
    </AppShell>
  );
}
