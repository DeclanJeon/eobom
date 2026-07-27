import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState, SoftBadge, SurfaceCard } from "@/components/ui-blocks";
import { requireUser } from "@/lib/session";
import { listEntries } from "@/lib/entries";
import { excerpt, formatDateKo } from "@/lib/utils";

export const metadata = { title: "기록" };

export default async function EntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;
  const entries = await listEntries(user.id, { q, limit: 100 });

  return (
    <AppShell
      title="기록"
      wide
      action={
        <Link
          href="/entries/new"
          className="cta-primary hidden h-10 px-4 py-2 text-sm md:inline-flex"
        >
          새 기록
        </Link>
      }
    >
      <form className="mb-6 max-w-xl">
        <label className="sr-only" htmlFor="entry-search">
          기록 검색
        </label>
        <input
          id="entry-search"
          name="q"
          defaultValue={q || ""}
          placeholder="성구, 제목, 내용 검색"
          className="w-full rounded-xl border border-[#E0DDD7] bg-white px-4 py-3 text-label-md outline-none ring-accent-gold/30 focus:ring-2"
        />
      </form>

      {entries.length === 0 ? (
        <EmptyState
          title={q ? "검색 결과가 없습니다" : "아직 기록이 없습니다"}
          description="묵상 기록하기로 첫 기록을 남겨 보세요."
          action={
            <Link href="/entries/new" className="cta-primary">
              기록하기
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
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
      )}
    </AppShell>
  );
}
