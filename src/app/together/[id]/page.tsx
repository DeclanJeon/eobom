import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SoftBadge, SurfaceCard } from "@/components/ui-blocks";
import { TogetherActions } from "@/components/together-actions";
import { TogetherImageGrid } from "@/components/together-image-grid";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDateKo, parseJsonArray } from "@/lib/utils";

export const metadata = { title: "공유 묵상" };
export const dynamic = "force-dynamic";

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
  const imageUrls = parseJsonArray(item.imageUrls);

  return (
    <AppShell bare>
      <div className="mx-auto max-w-xl">
        <div className="mb-4">
          <Link
            href="/together"
            aria-label="함께 피드로 돌아가기"
            className="inline-flex min-h-11 items-center text-label-md text-text-muted transition hover:text-primary"
          >
            ← 피드로
          </Link>
        </div>

        <SurfaceCard className="overflow-hidden rounded-[1.75rem] bg-surface-shared/55 p-0">
          <div className="px-5 pt-5">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-warm text-label-md font-semibold text-gold-ink">
                {(item.pseudonym || "익").slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
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

            <p className="mt-4 whitespace-pre-wrap text-[17px] leading-8 text-text-main">
              {item.publicBody}
            </p>

            {imageUrls.length ? (
              <div className="mt-4">
                <TogetherImageGrid urls={imageUrls} />
              </div>
            ) : null}

            {tags.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Link key={tag} href={`/together?tag=${encodeURIComponent(tag)}`}>
                    <SoftBadge>#{tag}</SoftBadge>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-5 border-t border-border/70 px-5 py-3">
            <TogetherActions id={item.id} counts={counts} />
          </div>
        </SurfaceCard>
      </div>
    </AppShell>
  );
}
