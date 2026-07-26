import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState, PageIntro, SoftBadge, SurfaceCard } from "@/components/ui-blocks";
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
      action={
        <Link
          href="/entries/new"
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          새 기록
        </Link>
      }
    >
      <PageIntro
        title="묵상 기록"
        description="성구, 키워드, 태그로 과거 기록을 다시 만날 수 있습니다."
      />

      <form className="mb-5">
        <input
          name="q"
          defaultValue={q || ""}
          placeholder="성구, 키워드, 태그 검색"
          className="w-full rounded-full border border-border bg-white/80 px-4 py-3 text-sm outline-none ring-primary/20 focus:ring-2"
        />
      </form>

      {entries.length === 0 ? (
        <EmptyState
          title={q ? "검색 결과가 없습니다" : "기록이 비어 있습니다"}
          description="오늘의 묵상을 남기면 타임라인이 시작됩니다."
          action={
            <Link
              href="/entries/new"
              className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              기록하기
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Link key={entry.id} href={`/entries/${entry.id}`}>
              <SurfaceCard className="transition hover:border-primary/25">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    {formatDateKo(entry.entryDate)}
                  </p>
                  {entry.scriptureRefs.slice(0, 2).map((ref) => (
                    <SoftBadge key={ref}>{ref}</SoftBadge>
                  ))}
                </div>
                <h2 className="mt-2 font-serif text-xl">
                  {entry.title || "제목 없음"}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
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
