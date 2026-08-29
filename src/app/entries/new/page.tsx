import { AppShell } from "@/components/app-shell";
import { EntryFormClient } from "@/components/entry-form-client";
import { requireUser } from "@/lib/session";

export const metadata = { title: "기록하기" };
export const dynamic = "force-dynamic";

export default async function NewEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ scripture?: string }>;
}) {
  await requireUser();
  const { scripture } = await searchParams;
  return (
    <AppShell bare>
      <div className="mx-auto max-w-2xl">
        <EntryFormClient seedScripture={scripture} />
      </div>
    </AppShell>
  );
}
