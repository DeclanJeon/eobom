import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SoftBadge, SurfaceCard } from "@/components/ui-blocks";
import { DeleteEntryButton } from "@/components/delete-entry-button";
import { requireUser } from "@/lib/session";
import { getEntry } from "@/lib/entries";
import { formatDateKo } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return { title: "기록 상세" };
}

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const entry = await getEntry(user.id, id);
  if (!entry) notFound();

  return (
    <AppShell
      title="기록 상세"
      action={
        <Link
          href={`/entries/${entry.id}/edit`}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm"
        >
          수정
        </Link>
      }
    >
      <article className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {formatDateKo(entry.entryDate)}
          </p>
          <h1 className="mt-2 font-serif text-3xl tracking-tight">
            {entry.title || "제목 없음"}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {entry.scriptureRefs.map((ref) => (
              <SoftBadge key={ref}>{ref}</SoftBadge>
            ))}
            {entry.tags.map((tag) => (
              <SoftBadge key={tag}>#{tag}</SoftBadge>
            ))}
          </div>
        </div>

        {entry.scriptureExcerpt ? (
          <SurfaceCard className="border-l-4 border-l-primary/40">
            <p className="font-serif text-lg leading-relaxed">
              “{entry.scriptureExcerpt}”
            </p>
          </SurfaceCard>
        ) : null}

        <SurfaceCard>
          <h2 className="text-sm font-medium text-muted-foreground">묵상</h2>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-8">
            {entry.reflectionBody}
          </p>
        </SurfaceCard>

        {entry.gratitude ? (
          <SurfaceCard>
            <h2 className="text-sm font-medium text-muted-foreground">감사</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
              {entry.gratitude}
            </p>
          </SurfaceCard>
        ) : null}
        {entry.question ? (
          <SurfaceCard>
            <h2 className="text-sm font-medium text-muted-foreground">질문</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
              {entry.question}
            </p>
          </SurfaceCard>
        ) : null}
        {entry.prayer ? (
          <SurfaceCard>
            <h2 className="text-sm font-medium text-muted-foreground">기도</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
              {entry.prayer}
            </p>
          </SurfaceCard>
        ) : null}
        {entry.actionStep ? (
          <SurfaceCard>
            <h2 className="text-sm font-medium text-muted-foreground">결단</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
              {entry.actionStep}
            </p>
          </SurfaceCard>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href={`/together?from=${entry.id}`}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm"
          >
            공유용 묵상 만들기
          </Link>
          <DeleteEntryButton id={entry.id} />
        </div>
      </article>
    </AppShell>
  );
}
