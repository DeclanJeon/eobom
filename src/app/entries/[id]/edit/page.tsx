import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Breadcrumb } from "@/components/ui-blocks";
import { EntryForm } from "@/components/entry-form";
import { requireUser } from "@/lib/session";
import { getEntry } from "@/lib/entries";

export const metadata = { title: "기록 수정" };

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const entry = await getEntry(user.id, id);
  if (!entry) notFound();

  return (
    <AppShell bare>
      <Breadcrumb href="/entries" label="기록" current="수정" className="mb-4" />
      <div className="mx-auto max-w-2xl">
        <EntryForm
          entryId={entry.id}
          initial={{
            entryDate: new Date(entry.entryDate).toISOString().slice(0, 10),
            title: entry.title || "",
            scriptureRefsText: entry.scriptureRefs.join(", "),
            scriptureExcerpt: entry.scriptureExcerpt || "",
            scriptureBindings: entry.scriptureBindings || [],
            reflectionBody: entry.reflectionBody,
            gratitude: entry.gratitude || "",
            question: entry.question || "",
            prayer: entry.prayer || "",
            actionStep: entry.actionStep || "",
            emotionsText: entry.emotions.join(", "),
            tagsText: entry.tags.join(", "),
            templateType: entry.templateType,
          }}
        />
      </div>
    </AppShell>
  );
}
