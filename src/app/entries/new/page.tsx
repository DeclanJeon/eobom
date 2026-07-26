import { AppShell } from "@/components/app-shell";
import { EntryForm } from "@/components/entry-form";
import { requireUser } from "@/lib/session";

export const metadata = { title: "새 기록" };

export default async function NewEntryPage() {
  await requireUser();
  return (
    <AppShell title="기록하기">
      <EntryForm />
    </AppShell>
  );
}
