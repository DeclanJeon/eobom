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

  const latest = recent[0] ?? null;

  const pastToday = (
    await db.reflectionEntry.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { entryDate: "desc" },
      take: 365,
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

  return (
    <AppShell bare>
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            ✿
          </span>
          <h1 className="font-journal text-title-journal text-primary">이어봄</h1>
        </div>
        <Link
          href="/me"
          className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-surface-low text-label-sm text-text-muted"
        >
          {(user.displayName || user.name || "?").slice(0, 1)}
        </Link>
      </header>

      <section className="mb-8">
        <h2 className="text-display-lg text-primary">
          오늘의 묵상을
          <br />
          시작해볼까요?
        </h2>
        <p className="mt-2 text-body-md text-text-muted">
          당신만의 평온한 공간, 이어봄입니다.
        </p>
      </section>

      <Link
        href="/entries/new"
        className="mb-4 flex w-full flex-col items-start gap-3 rounded-2xl bg-primary p-8 text-primary-foreground shadow-sm transition duration-200 active:scale-[0.98]"
      >
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-xl">
          ✎
        </span>
        <span>
          <span className="block text-headline-sm">묵상 기록하기</span>
          <span className="mt-1 block text-label-md opacity-80">
            오늘 주신 말씀을 마음에 새깁니다
          </span>
        </span>
        <span className="mt-2 text-label-md">기록 시작하기 →</span>
      </Link>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {latest ? (
          <Link href={`/entries/${latest.id}`}>
            <SurfaceCard className="h-full border border-[#E0DDD7]/80 bg-secondary/40 transition hover:border-accent-gold/40">
              <div className="mb-3 flex items-center justify-between">
                <span className="chip border-accent-gold/20 text-accent-gold">
                  최근 기록
                </span>
                <span className="text-label-sm text-text-muted">
                  {formatDateKo(latest.entryDate)}
                </span>
              </div>
              <h3 className="text-headline-sm text-primary">
                {latest.title || "제목 없음"}
              </h3>
              <p className="mt-2 line-clamp-2 text-body-md italic text-text-muted">
                “{excerpt(latest.reflectionBody, 80)}”
              </p>
              <p className="mt-5 text-label-md text-primary">계속 적기 ›</p>
            </SurfaceCard>
          </Link>
        ) : null}

        {pastToday ? (
          <Link href={`/entries/${pastToday.id}`}>
            <SurfaceCard className="writing-margin h-full">
              <p className="mb-3 text-label-md text-accent-terracotta">
                과거의 오늘 · {now.getFullYear() - pastToday.entryDate.getFullYear()}
                년 전
              </p>
              <h3 className="text-headline-sm text-primary">
                {pastToday.title || "제목 없음"}
              </h3>
              <p className="mt-2 text-body-md text-text-main">
                {excerpt(pastToday.reflectionBody, 100)}
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
        ) : null}
      </div>

      {latestReview ? (
        <section className="mt-6 overflow-hidden rounded-2xl bg-[linear-gradient(180deg,#2a3a2f,#152018)] p-6 text-white">
          <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-label-sm">
            AI Insight
          </span>
          <p className="mt-3 text-headline-md leading-snug">
            “{latestReview.summary || "기록이 당신의 여정을 비춥니다."}”
          </p>
          <Link
            href={`/reviews/${latestReview.id}`}
            className="mt-4 inline-block text-label-md text-white/80"
          >
            회고 보기 →
          </Link>
        </section>
      ) : null}

      {recent.length > 1 ? (
        <section className="mt-8 space-y-3">
          <h3 className="text-label-md text-text-muted">최근</h3>
          {recent.slice(1).map((entry) => (
            <Link key={entry.id} href={`/entries/${entry.id}`}>
              <SurfaceCard className="mb-2 transition hover:border-accent-gold/30">
                <p className="text-label-sm text-text-muted">
                  {formatDateKo(entry.entryDate)}
                </p>
                <h4 className="mt-1 text-headline-sm text-primary">
                  {entry.title || parseJsonArray(entry.scriptureRefs)[0] || "제목 없음"}
                </h4>
                <p className="mt-1 text-body-md text-text-muted">
                  {excerpt(entry.reflectionBody, 70)}
                </p>
              </SurfaceCard>
            </Link>
          ))}
        </section>
      ) : null}
    </AppShell>
  );
}
