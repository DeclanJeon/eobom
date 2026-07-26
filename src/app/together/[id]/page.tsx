import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SoftBadge, SurfaceCard } from "@/components/ui-blocks";
import { TogetherActions } from "@/components/together-actions";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDateKo, parseJsonArray } from "@/lib/utils";

export const metadata = { title: "공유 묵상" };

export default async function TogetherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const item = await db.sharedReflection.findFirst({
    where: { id, visibility: "public", withdrawnAt: null, deletedAt: null },
    include: { reactions: true },
  });
  if (!item) notFound();

  const counts: Record<string, number> = {};
  for (const r of item.reactions) {
    counts[r.reactionType] = (counts[r.reactionType] || 0) + 1;
  }

  return (
    <AppShell title="공유 묵상">
      <SurfaceCard className="bg-surface-shared/70">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-label-md text-primary">
            {item.pseudonym || "익명의 순례자"}
          </p>
          <span className="text-label-sm text-text-muted">
            {formatDateKo(item.publishedAt)}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {parseJsonArray(item.scriptureRefs).map((ref) => (
            <SoftBadge key={ref}>{ref}</SoftBadge>
          ))}
          {parseJsonArray(item.topicTags).map((tag) => (
            <SoftBadge key={tag}>#{tag}</SoftBadge>
          ))}
        </div>
        <p className="mt-5 whitespace-pre-wrap text-body-lg">{item.publicBody}</p>
        <div className="mt-6">
          <TogetherActions id={item.id} counts={counts} />
        </div>
      </SurfaceCard>
    </AppShell>
  );
}
