import Link from "next/link";
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

  const scriptures = parseJsonArray(item.scriptureRefs);
  const tags = parseJsonArray(item.topicTags);

  return (
    <AppShell title="공유 묵상">
      <div className="mb-4">
        <Link
          href="/together"
          aria-label="함께 피드로 돌아가기"
          className="text-label-md text-text-muted transition hover:text-primary"
        >
          ← 피드로
        </Link>
      </div>
      <SurfaceCard className="bg-surface-shared/70">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-full bg-bg-warm text-label-md font-semibold text-gold-ink">
            {(item.pseudonym || "익").slice(0, 1)}
          </span>
          <div>
            <p className="text-label-md text-primary">
              {item.pseudonym || "익명의 순례자"}
            </p>
            <p className="text-label-sm text-text-muted">
              {formatDateKo(item.publishedAt)}
            </p>
          </div>
        </div>

        {scriptures.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {scriptures.map((ref) => (
              <span key={ref} className="chip-gold">
                {ref}
              </span>
            ))}
          </div>
        ) : null}

        <p className="mt-5 whitespace-pre-wrap text-body-lg leading-relaxed">
          {item.publicBody}
        </p>

        {tags.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link key={tag} href={`/together?tag=${encodeURIComponent(tag)}`}>
                <SoftBadge>#{tag}</SoftBadge>
              </Link>
            ))}
          </div>
        ) : null}

        <div className="mt-6 border-t border-border-subtle pt-4">
          <TogetherActions id={item.id} counts={counts} />
        </div>
      </SurfaceCard>
    </AppShell>
  );
}
