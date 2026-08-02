import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState, PageIntro } from "@/components/ui-blocks";
import { TogetherComposer } from "@/components/together-composer";
import { TogetherFeedCard } from "@/components/together-feed-card";
import { requireUser } from "@/lib/session";
import { getUserPreferenceFlags } from "@/lib/user-preferences";
import { db } from "@/lib/db";
import { parseBindings } from "@/lib/entries";
import { parseJsonArray } from "@/lib/utils";

export const metadata = { title: "함께" };

export default async function TogetherPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; tag?: string; compose?: string; cursor?: string }>;
}) {
  const user = await requireUser();
  const flags = await getUserPreferenceFlags(user.id);
  const { from, tag, compose, cursor: cursorParam } = await searchParams;
  const cursor = cursorParam?.trim() || undefined;
  const pageSize = 20;

  const source = from
    ? await db.reflectionEntry.findFirst({
        where: { id: from, userId: user.id, deletedAt: null },
      })
    : null;

  const baseItemsWhere = {
    visibility: "public" as const,
    withdrawnAt: null,
    deletedAt: null,
  };
  const loadItems = (options: { cursor?: string; take: number }) =>
    db.sharedReflection.findMany({
      where: baseItemsWhere,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      take: options.take,
      include: { reactions: true },
    });

  const items = tag
    ? await (async () => {
        const matchingItems: Awaited<ReturnType<typeof loadItems>> = [];
        const scanSize = 50;
        let scanCursor = cursor;
        const requiredCount = pageSize + 1;

        while (matchingItems.length < requiredCount) {
          const batch = await loadItems({ cursor: scanCursor, take: scanSize });
          matchingItems.push(
            ...batch.filter((item) => parseJsonArray(item.topicTags).includes(tag)),
          );
          const lastItem = batch[batch.length - 1];
          if (!lastItem || batch.length < scanSize) break;
          scanCursor = lastItem.id;
        }

        return matchingItems.slice(0, requiredCount);
      })()
    : await loadItems({ cursor, take: pageSize + 1 });
  const hasMore = items.length > pageSize;
  const visibleItems = items.slice(0, pageSize);
  const nextCursor = hasMore ? visibleItems[visibleItems.length - 1]?.id : undefined;

  const tagRows = await db.sharedReflection.findMany({
    where: baseItemsWhere,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: 60,
    select: { topicTags: true },
  });
  const allTags = new Map<string, number>();
  for (const item of tagRows) {
    for (const t of parseJsonArray(item.topicTags)) {
      allTags.set(t, (allTags.get(t) || 0) + 1);
    }
  }
  const popularTags = [...allTags.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
    .slice(0, 12)
    .map(([name]) => name);

  const filtered = visibleItems;

  const sourceBody = source
    ? [source.title, source.reflectionBody].filter(Boolean).join("\n\n")
    : "";
  const sourceBindings = source
    ? parseBindings(source.scriptureBindings)
    : [];

  return (
    <AppShell wide bare>
      <section className="mb-5 max-w-xl md:mb-7">
        <PageIntro
          className="mb-0"
          eyebrow="익명 나눔"
          title="함께"
          description="Threads처럼 가볍게, 이어봄답게 조용히. 문장과 사진으로 서로의 짐을 조금 덜어 줍니다. 원문은 공개되지 않습니다."
        />
      </section>

      <div className="mx-auto max-w-xl">
        <TogetherComposer
          sourceEntryId={source?.id}
          initialBody={sourceBody}
          initialBindings={sourceBindings}
          autoOpen={Boolean(source) || compose === "1"}
          communityEnabled={flags.communityEnabled}
        />

        {popularTags.length ? (
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TagChip href="/together" active={!tag} label="전체" />
            {popularTags.map((name) => (
              <TagChip
                key={name}
                href={`/together?tag=${encodeURIComponent(name)}`}
                active={tag === name}
                label={`#${name}`}
              />
            ))}
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <EmptyState
            title={tag ? `"#${tag}" 나눔이 아직 없습니다` : "아직 나눈 묵상이 없습니다"}
            description={
              tag
                ? "다른 주제를 보거나, 첫 문장과 사진을 남겨 보세요."
                : "마음에 남은 한 문장, 또는 한 장의 사진으로 조용히 시작해 보세요."
            }
            action={
              <Link href="/together?compose=1#together-composer" className="cta-primary">
                첫 번째 묵상 나누기
              </Link>
            }
          />
        ) : (
          <>
            <div className="grid gap-3">
              {filtered.map((item, index) => {
                const counts: Record<string, number> = {};
                for (const r of item.reactions) {
                  counts[r.reactionType] = (counts[r.reactionType] || 0) + 1;
                }
                return (
                  <TogetherFeedCard
                    key={item.id}
                    index={index}
                    item={{
                      id: item.id,
                      publicBody: item.publicBody,
                      imageUrls: parseJsonArray(item.imageUrls),
                      scriptureRefs: parseJsonArray(item.scriptureRefs),
                      topicTags: parseJsonArray(item.topicTags),
                      pseudonym: item.pseudonym || "익명의 순례자",
                      publishedAt: item.publishedAt,
                      counts,
                    }}
                  />
                );
              })}
            </div>
            {hasMore && nextCursor ? (
              <div className="mt-6 flex justify-center">
                <Link
                  href={`/together?cursor=${encodeURIComponent(nextCursor)}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}${from ? `&from=${encodeURIComponent(from)}` : ""}${compose ? `&compose=${encodeURIComponent(compose)}` : ""}`}
                  className="cta-secondary min-h-11 px-6"
                >
                  더 보기
                </Link>
              </div>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}

function TagChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "inline-flex min-h-11 shrink-0 items-center rounded-full bg-primary px-3.5 py-1.5 text-label-sm text-primary-foreground"
          : "inline-flex min-h-11 shrink-0 items-center rounded-full border border-border bg-white px-3.5 py-1.5 text-label-sm text-text-muted transition hover:border-accent-gold/40 hover:text-primary"
      }
    >
      {label}
    </Link>
  );
}
