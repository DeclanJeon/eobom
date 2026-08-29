import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState, PageIntro, SoftBadge, SurfaceCard } from "@/components/ui-blocks";
import { requireUser } from "@/lib/session";
import { listEntries } from "@/lib/entries";
import { excerpt, formatDateKo } from "@/lib/utils";

export const metadata = { title: "기록" };
export const dynamic = "force-dynamic";

export default async function EntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cursor?: string; filter?: string }>;
}) {
  const user = await requireUser();
  const { q, cursor: cursorParam, filter: filterParam } = await searchParams;
  const cursor = cursorParam?.trim() || undefined;
  const filter = filterParam === "actions" ? "actions" : undefined;
  const pageSize = 20;
  const entries = await listEntries(user.id, {
    q,
    filter,
    cursor,
    limit: pageSize + 1,
  });
  const hasMore = entries.length > pageSize;
  const visibleEntries = entries.slice(0, pageSize);
  const nextCursor = hasMore ? visibleEntries[visibleEntries.length - 1]?.id : undefined;

  return (
    <AppShell wide bare>
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-border/70 py-5 md:mb-8 md:py-8">
        <PageIntro className="mb-0" title={filter === "actions" ? "결단 기록" : "기록"} />
        <Link
          href="/entries/new"
          className="cta-primary hidden min-h-11 px-4 py-2 text-sm md:inline-flex"
        >
          새 기록
        </Link>
      </div>
      <form className="mb-6 flex max-w-xl gap-2">
        {filter ? <input type="hidden" name="filter" value={filter} /> : null}
        <label className="sr-only" htmlFor="entry-search">
          기록 검색
        </label>
        <input
          id="entry-search"
          name="q"
          defaultValue={q || ""}
          placeholder="성구, 제목, 내용 검색"
          className="flex-1 rounded-xl border border-border bg-white px-4 py-3 text-label-md outline-none ring-accent-gold/30 focus:ring-2"
        />
        <button type="submit" className="cta-primary min-h-11 px-4">
          검색
        </button>
      </form>

      {visibleEntries.length === 0 ? (
        <EmptyState
          title={
            filter === "actions"
              ? "결단 기록이 없습니다"
              : q
                ? "검색 결과가 없습니다"
                : "아직 기록이 없습니다"
          }
          description="묵상 기록하기로 첫 기록을 남겨 보세요."
          action={
            <Link href="/entries/new" className="cta-primary">
              기록하기
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleEntries.map((entry) => (
              <Link key={entry.id} href={`/entries/${entry.id}`}>
                <SurfaceCard className="h-full transition hover:border-accent-gold/30">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-label-sm text-text-muted">
                      {formatDateKo(entry.entryDate)}
                    </p>
                    {entry.scriptureRefs.slice(0, 2).map((ref) => (
                      <SoftBadge key={ref}>{ref}</SoftBadge>
                    ))}
                  </div>
                  <h2 className="mt-2 text-headline-sm text-primary">
                    {entry.title || "제목 없음"}
                  </h2>
                  <p className="mt-1 line-clamp-3 text-body-md text-text-muted">
                    {excerpt(entry.reflectionBody, 140)}
                  </p>
                </SurfaceCard>
              </Link>
            ))}
          </div>
          {hasMore && nextCursor ? (
            <div className="mt-6 flex justify-center">
              <Link
                href={`/entries?cursor=${encodeURIComponent(nextCursor)}${q ? `&q=${encodeURIComponent(q)}` : ""}${filter ? `&filter=${filter}` : ""}`}
                className="cta-secondary min-h-11 px-6"
              >
                더 보기
              </Link>
            </div>
          ) : null}
        </>
      )}
    </AppShell>
  );
}
