import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState, SoftBadge, SurfaceCard } from "@/components/ui-blocks";
import { TogetherActions } from "@/components/together-actions";
import { ShareForm } from "@/components/share-form";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDateShort, parseJsonArray } from "@/lib/utils";

export const metadata = { title: "함께" };

export default async function TogetherPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const user = await requireUser();
  const { from } = await searchParams;

  const source = from
    ? await db.reflectionEntry.findFirst({
        where: { id: from, userId: user.id, deletedAt: null },
      })
    : null;

  const items = await db.sharedReflection.findMany({
    where: { visibility: "public", withdrawnAt: null, deletedAt: null },
    orderBy: { publishedAt: "desc" },
    take: 40,
    include: { reactions: true },
  });

  return (
    <AppShell bare>
      <header className="mb-6">
        <h1 className="text-display-lg text-primary">함께</h1>
        <p className="mt-2 text-body-md text-text-muted">
          원문은 공개되지 않습니다. 나누고 싶은 문장만 남겨 주세요.
        </p>
      </header>

      <SurfaceCard className="mb-5 bg-surface-shared">
        <h2 className="text-headline-sm text-primary">나누기</h2>
        <div className="mt-4">
          <ShareForm
            sourceEntryId={source?.id}
            initialBody={
              source
                ? [source.title, source.reflectionBody]
                    .filter(Boolean)
                    .join("\n\n")
                : ""
            }
            initialScripture={
              source ? parseJsonArray(source.scriptureRefs).join(", ") : ""
            }
          />
        </div>
      </SurfaceCard>

      {items.length === 0 ? (
        <EmptyState title="아직 나눈 묵상이 없습니다" />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const counts: Record<string, number> = {};
            for (const r of item.reactions) {
              counts[r.reactionType] = (counts[r.reactionType] || 0) + 1;
            }
            return (
              <SurfaceCard key={item.id} className="bg-surface-shared/60">
                <Link href={`/together/${item.id}`} className="block">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-label-md text-primary">
                      {item.pseudonym || "익명의 순례자"}
                    </p>
                    <span className="text-label-sm text-text-muted">
                      {formatDateShort(item.publishedAt)}
                    </span>
                    {parseJsonArray(item.scriptureRefs).map((ref) => (
                      <SoftBadge key={ref}>{ref}</SoftBadge>
                    ))}
                  </div>
                  <p className="mt-3 line-clamp-5 whitespace-pre-wrap text-body-md">
                    {item.publicBody}
                  </p>
                </Link>
                <div className="mt-4">
                  <TogetherActions id={item.id} counts={counts} />
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
