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
    <AppShell bare>
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            ✿
          </span>
          <h1 className="font-journal text-title-journal text-primary">이어봄</h1>
        </div>
        <h2 className="text-headline-sm text-primary">기록</h2>
      </header>

      <form className="mb-5">
        <input
          name="q"
          defaultValue={q || ""}
          placeholder="검색"
          className="w-full rounded-full border border-[#E0DDD7] bg-white px-4 py-3 text-label-md outline-none ring-accent-gold/30 focus:ring-2"
        />
      </form>

      {entries.length === 0 ? (
        <EmptyState
          title={q ? "검색 결과가 없습니다" : "아직 기록이 없습니다"}
          description="묵상 기록하기로 첫 기록을 남겨 보세요."
        />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Link key={entry.id} href={`/entries/${entry.id}`}>
              <SurfaceCard className="mb-3 transition hover:border-accent-gold/30">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-label-sm text-text-muted">
                    {formatDateKo(entry.entryDate)}
                  </p>
                  {entry.scriptureRefs.slice(0, 2).map((ref) => (
                    <SoftBadge key={ref}>{ref}</SoftBadge>
                  ))}
                </div>
                <h3 className="mt-2 text-headline-sm text-primary">
                  {entry.title || "제목 없음"}
                </h3>
                <p className="mt-1 text-body-md text-text-muted">
                  {excerpt(entry.reflectionBody, 120)}
                </p>
              </SurfaceCard>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
