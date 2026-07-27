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
    take: 4,
  });

  const latest = recent[0] ?? null;

  const pastToday = (
    await db.reflectionEntry.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { entryDate: "desc" },
      take: 400,
    })
  )
    .filter((e) => {
      const d = e.entryDate;
      return (
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate() &&
        d.getFullYear() < now.getFullYear()
      );
    })
    .slice(0, 1)[0];

  const latestReview = await db.reviewReport.findFirst({
    where: { userId: user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  const greeting = user.displayName || user.name || "순례자";

  return (
    <AppShell wide bare>
      <section className="mb-8 md:mb-12 md:grid md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] md:items-end md:gap-12">
        <div>
          <p className="text-eyebrow">{formatDateKo(now)}</p>
          <h1 className="mt-2 text-display-lg text-primary md:text-4xl lg:text-[2.75rem]">
            {greeting}님,
            <span className="mt-1 block md:mt-0 md:inline md:ml-2">
              오늘도 이어봄
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-body-md text-text-muted">
            흩어진 묵상을 한곳에 남기고, 필요할 때 다시 만납니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/entries/new" className="cta-primary min-h-[48px] px-6 py-3">
              묵상 기록하기
            </Link>
            <Link href="/entries" className="cta-secondary min-h-[48px] px-6 py-3">
              기록 보기
            </Link>
          </div>
        </div>

        <div className="mt-8 hidden md:block">
          <SurfaceCard tone="dark">
            <p className="text-label-sm text-on-dark-muted">빠른 시작</p>
            <p className="mt-2 font-journal text-xl leading-snug text-white">
              성구를 고르고, 마음에 남는 한 줄을 적으세요.
            </p>
            <Link
              href="/entries/new"
              className="mt-5 inline-flex text-label-md font-medium text-white underline-offset-4 hover:underline"
            >
              지금 쓰기 →
            </Link>
          </SurfaceCard>
        </div>
      </section>

      {/* Mobile primary CTA card */}
      <Link href="/entries/new" className="mb-4 block md:hidden">
        <SurfaceCard
          tone="dark"
          className="flex min-h-[140px] flex-col justify-between"
        >
          <div>
            <p className="text-headline-sm text-white">묵상 기록하기</p>
            <p className="mt-2 text-label-md text-on-dark-muted">
              오늘 주신 말씀을 마음에 새깁니다
            </p>
          </div>
          <p className="text-label-md font-medium text-white">기록 시작하기 →</p>
        </SurfaceCard>
      </Link>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {latest ? (
          <Link href={`/entries/${latest.id}`}>
            <SurfaceCard className="h-full border border-[#E0DDD7]/80 bg-secondary/40 transition hover:border-accent-gold/40">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="chip-gold">
                  최근 기록
                </span>
                <span className="text-label-sm text-text-muted">
                  {formatDateKo(latest.entryDate)}
                </span>
              </div>
              <h2 className="text-headline-sm text-primary">
                {latest.title || "제목 없음"}
              </h2>
              <p className="mt-2 line-clamp-3 text-body-md italic text-text-muted">
                “{excerpt(latest.reflectionBody, 100)}”
              </p>
              <p className="mt-5 text-label-md text-primary">이어 적기 ›</p>
            </SurfaceCard>
          </Link>
        ) : (
          <SurfaceCard className="h-full">
            <p className="text-headline-sm text-primary">아직 기록이 없습니다</p>
            <p className="mt-2 text-body-md text-text-muted">
              첫 묵상을 남기면 여기에 이어집니다.
            </p>
          </SurfaceCard>
        )}

        {pastToday ? (
          <Link href={`/entries/${pastToday.id}`}>
            <SurfaceCard className="writing-margin h-full">
              <p className="mb-3 text-label-md text-accent-terracotta">
                과거의 오늘 ·{" "}
                {now.getFullYear() - pastToday.entryDate.getFullYear()}년 전
              </p>
              <h2 className="text-headline-sm text-primary">
                {pastToday.title || "제목 없음"}
              </h2>
              <p className="mt-2 line-clamp-3 text-body-md text-text-main">
                {excerpt(pastToday.reflectionBody, 110)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {parseJsonArray(pastToday.tags)
                  .slice(0, 3)
                  .map((tag) => (
                    <SoftBadge key={tag}>#{tag}</SoftBadge>
                  ))}
              </div>
            </SurfaceCard>
          </Link>
        ) : (
          <SurfaceCard className="h-full bg-surface-low/60">
            <p className="text-label-md text-text-muted">과거의 오늘</p>
            <p className="mt-2 text-body-md text-text-muted">
              같은 날짜의 과거 기록이 쌓이면 여기에 부드럽게 다시 만납니다.
            </p>
          </SurfaceCard>
        )}

        {latestReview ? (
          <Link href={`/reviews/${latestReview.id}`} className="sm:col-span-2 xl:col-span-1">
            <section className="flex h-full min-h-[160px] flex-col justify-between overflow-hidden rounded-2xl bg-[linear-gradient(165deg,#2a3a2f,#152018)] p-6 text-white">
              <span className="inline-flex w-fit rounded-full bg-white/15 px-3 py-1 text-label-sm">
                AI 회고
              </span>
              <p className="mt-3 font-journal text-xl leading-snug md:text-2xl">
                “{latestReview.summary || "기록이 당신의 여정을 비춥니다."}”
              </p>
              <p className="mt-4 text-label-md text-on-dark-soft">회고 보기 →</p>
            </section>
          </Link>
        ) : null}
      </div>

      {recent.length > 1 ? (
        <section className="mt-10 md:mt-14">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-headline-sm text-primary">최근 기록</h2>
            <Link
              href="/entries"
              className="text-label-md text-text-muted hover:text-primary"
            >
              전체 보기
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.slice(1).map((entry) => (
              <Link key={entry.id} href={`/entries/${entry.id}`}>
                <SurfaceCard className="h-full transition hover:border-accent-gold/30">
                  <p className="text-label-sm text-text-muted">
                    {formatDateKo(entry.entryDate)}
                  </p>
                  <h3 className="mt-1 text-headline-sm text-primary">
                    {entry.title ||
                      parseJsonArray(entry.scriptureRefs)[0] ||
                      "제목 없음"}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-body-md text-text-muted">
                    {excerpt(entry.reflectionBody, 90)}
                  </p>
                </SurfaceCard>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
