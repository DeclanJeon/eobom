import { AppShell } from "@/components/app-shell";
import { EntryForm } from "@/components/entry-form";
import { requireUser } from "@/lib/session";

export const metadata = { title: "기록하기" };

export default async function NewEntryPage() {
  await requireUser();
  return (
    <AppShell bare>
      <div className="mx-auto max-w-2xl">
        <EntryForm />
      </div>
    </AppShell>
  );
}
