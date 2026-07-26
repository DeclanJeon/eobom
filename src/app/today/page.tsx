import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SoftBadge, SurfaceCard } from "@/components/ui-blocks";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { excerpt, formatDateKo, parseJsonArray } from "@/lib/utils";

export const metadata = { title: "오늘" };

export default async function TodayPage() {
  const user = await requireUser();
  const now = new Date();

  const recent = await db.reflectionEntry.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { entryDate: "desc" },
    take: 3,
  });

  return (
    <AppShell>
      <div className="flex min-h-[70dvh] flex-col justify-center gap-8 py-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{formatDateKo(now)}</p>
          <h1 className="mt-2 font-serif text-3xl tracking-tight">
            {user.displayName || "순례자"}님
          </h1>
        </div>

        <Link
          href="/entries/new"
          className="mx-auto flex w-full max-w-sm items-center justify-center rounded-full bg-foreground px-6 py-5 text-lg font-medium text-background transition active:scale-[0.99]"
        >
          기록하기
        </Link>

        {recent.length > 0 ? (
          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-medium text-muted-foreground">최근</h2>
              <Link href="/entries" className="text-sm text-primary">
                더보기
              </Link>
            </div>
            {recent.map((entry) => (
              <Link key={entry.id} href={`/entries/${entry.id}`}>
                <SurfaceCard className="mb-2 transition hover:border-primary/25">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {formatDateKo(entry.entryDate)}
                    </p>
                    {parseJsonArray(entry.scriptureRefs)[0] ? (
                      <SoftBadge>{parseJsonArray(entry.scriptureRefs)[0]}</SoftBadge>
                    ) : null}
                  </div>
                  <h3 className="mt-1.5 font-serif text-lg">
                    {entry.title || "제목 없음"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {excerpt(entry.reflectionBody, 80)}
                  </p>
                </SurfaceCard>
              </Link>
            ))}
          </section>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            첫 기록을 남겨 보세요.
          </p>
        )}
      </div>
    </AppShell>
  );
}
