import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { OpenActionCard } from "@/components/open-action-card";
import { EntryRow, SurfaceCard } from "@/components/ui-blocks";
import { RereadScriptureList } from "@/components/reread-scripture-list";
import { StoryMirrorHomeCard } from "@/components/story-mirror-home-card";
import { listOpenActionSteps } from "@/lib/actions";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { excerpt, formatDateKo, formatDateShort, parseJsonArray } from "@/lib/utils";
import { pastTodayDateRanges } from "@/lib/past-today";
import {
  isReviewStaleForHome,
  selectHomeRereadScriptures,
} from "@/lib/reread-scriptures";
import { getUserPreferenceFlags } from "@/lib/user-preferences";

export const metadata = { title: "오늘" };

export default async function TodayPage() {
  const user = await requireUser();
  const now = new Date();

  const [flags, entryPool, openActions, latestReview] = await Promise.all([
    getUserPreferenceFlags(user.id),
    db.reflectionEntry.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { entryDate: "desc" },
      take: 40,
    }),
    listOpenActionSteps(user.id, 3),
    db.reviewReport.findFirst({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const recent = entryPool.slice(0, 5);
  const latest = recent[0] ?? null;
  const primaryAction = openActions[0] ?? null;
  const moreActions = openActions.slice(1);

  let allowedRefs: string[] = [];
  if (latestReview && !isReviewStaleForHome(latestReview)) {
    const includedEntryIds = parseJsonArray(latestReview.includedEntryIds);
    if (includedEntryIds.length) {
      allowedRefs = (
        await db.reflectionEntry.findMany({
          where: {
            id: { in: includedEntryIds },
            userId: user.id,
            deletedAt: null,
          },
          select: { scriptureRefs: true },
        })
      ).flatMap((entry) => parseJsonArray(entry.scriptureRefs));
    }
  }

  const fallbackEntries = entryPool.map((entry) => ({
    id: entry.id,
    entryDate: entry.entryDate,
    title: entry.title,
    scriptureRefs: parseJsonArray(entry.scriptureRefs),
  }));

  const homeSelection = selectHomeRereadScriptures({
    report: latestReview,
    allowedRefs,
    fallbackEntries,
    max: 2,
  });
  const homeReread = homeSelection.items;
  const fromReview = homeSelection.source === "review";

  let pastToday: (typeof entryPool)[number] | null = null;
  if (flags.pastTodayEnabled) {
    const ranges = pastTodayDateRanges(now, 8);
    if (ranges.length) {
      pastToday = await db.reflectionEntry.findFirst({
        where: {
          userId: user.id,
          deletedAt: null,
          OR: ranges.map((r) => ({ entryDate: { gte: r.gte, lte: r.lte } })),
        },
        orderBy: { entryDate: "desc" },
      });
    }
  }

  const greeting = user.displayName || user.name || "순례자";
  const heroScripture =
    homeReread[0] ??
    (latest
      ? {
          ref: parseJsonArray(latest.scriptureRefs)[0] || "",
          reason: latest.title || excerpt(latest.reflectionBody, 80),
        }
      : null);

  return (
    <AppShell wide bare>
      {/* 1. 지배적 장면 */}
      <section className="mb-10 rounded-3xl border border-border/70 bg-secondary/30 px-5 py-8 md:mb-12 md:px-10 md:py-12">
        <p className="text-eyebrow">{formatDateKo(now)}</p>
        <h1 className="mt-2 text-display-lg text-primary md:text-4xl lg:text-[2.75rem]">
          {greeting}님,
          <span className="mt-1 block">오늘 붙들 말씀</span>
        </h1>
        {heroScripture && "ref" in heroScripture && heroScripture.ref ? (
          <div className="mt-6 max-w-2xl">
            <p className="font-journal text-xl leading-relaxed text-primary md:text-2xl">
              {heroScripture.ref}
            </p>
            {"reason" in heroScripture && heroScripture.reason ? (
              <p className="mt-3 text-body-md text-text-muted">
                {heroScripture.reason}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 max-w-xl text-body-md text-text-muted">
            오늘 머문 말씀이, 내일의 나를 만납니다. 한 줄이라도 남겨 보세요.
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/entries/new"
            className="cta-primary min-h-11 px-6 py-3"
          >
            묵상 기록하기
          </Link>
          <Link
            href="/lookback"
            className="cta-secondary min-h-11 px-6 py-3"
          >
            돌아보기
          </Link>
        </div>
      </section>

      {/* 2. 보조 행동: 열린 결단 1개 */}
      {primaryAction ? (
        <section className="mb-10 md:mb-12">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-eyebrow">살다</p>
              <h2 className="mt-1 text-headline-sm text-primary">열린 결단</h2>
            </div>
            {moreActions.length > 0 ? (
              <Link
                href="/entries"
                className="text-label-sm text-text-muted hover:text-primary"
              >
                더 보기 ({openActions.length})
              </Link>
            ) : (
              <p className="text-label-sm text-text-muted">평가가 아니라 기억입니다</p>
            )}
          </div>
          <div className="max-w-xl">
            <OpenActionCard item={primaryAction} />
          </div>
        </section>
      ) : null}

      {/* 3. 조용한 목록: 다시 읽을 말씀 */}
      {homeReread.length ? (
        <section className="mb-10 md:mb-12">
          <RereadScriptureList
            items={homeReread}
            variant="home"
            title={fromReview ? "다시 머물 수 있는 본문" : "최근에 머문 본문"}
            subtitle={
              fromReview
                ? "최근 회고에서 이어진 말씀입니다."
                : "직접 기록에 남긴 성구입니다."
            }
            meta={
              fromReview && latestReview
                ? `${latestReview.reportType} 회고 · ${formatDateShort(latestReview.periodEnd)} 기준`
                : undefined
            }
            reviewHref={
              fromReview && latestReview ? `/reviews/${latestReview.id}` : undefined
            }
          />
        </section>
      ) : null}

      {/* 3b. 조용한 보조 카드: 최근 1건 + 과거 오늘 + 회고 미리보기 */}
      <div className="mb-10 grid gap-4 md:grid-cols-2">
        {flags.pastTodayEnabled ? (
          pastToday ? (
            <Link href={`/entries/${pastToday.id}`}>
              <SurfaceCard className="writing-margin h-full transition hover:border-accent-gold/30">
                <p className="mb-2 text-label-md text-accent-terracotta">
                  과거의 오늘 ·{" "}
                  {now.getFullYear() - pastToday.entryDate.getFullYear()}년 전
                </p>
                <h2 className="text-headline-sm text-primary">
                  {pastToday.title || "제목 없음"}
                </h2>
                <p className="mt-2 line-clamp-2 text-body-md text-text-main">
                  {excerpt(pastToday.reflectionBody, 100)}
                </p>
              </SurfaceCard>
            </Link>
          ) : (
            <SurfaceCard className="h-full bg-surface-low/60">
              <p className="text-label-md text-text-muted">과거의 오늘</p>
              <p className="mt-2 text-body-md text-text-muted">
                같은 날짜의 과거 기록이 쌓이면 여기에 다시 만납니다.
              </p>
            </SurfaceCard>
          )
        ) : null}

        {latestReview ? (
          <Link href={`/reviews/${latestReview.id}`}>
            <section className="flex h-full min-h-[140px] flex-col justify-between overflow-hidden rounded-2xl bg-[linear-gradient(165deg,#2a3a2f,#152018)] p-5 text-white">
              <span className="inline-flex w-fit rounded-full bg-white/15 px-3 py-1 text-label-sm">
                AI 회고
              </span>
              <p className="mt-3 font-journal text-lg leading-snug md:text-xl">
                “{latestReview.summary || "기록이 당신의 여정을 비춥니다."}”
              </p>
              <p className="mt-3 text-label-md text-on-dark-soft">회고 보기 →</p>
            </section>
          </Link>
        ) : null}
      </div>

      {/* 3c. 최근 기록 — EntryRow */}
      <section className="mb-10 md:mb-12">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-headline-sm text-primary">최근 기록</h2>
          <Link
            href="/entries"
            className="text-label-md text-text-muted hover:text-primary"
          >
            전체 보기
          </Link>
        </div>
        {recent.length ? (
          <div className="rounded-2xl border border-border/70 bg-white/80 px-4">
            {recent.map((entry) => (
              <EntryRow
                key={entry.id}
                href={`/entries/${entry.id}`}
                date={formatDateKo(entry.entryDate)}
                title={
                  entry.title ||
                  parseJsonArray(entry.scriptureRefs)[0] ||
                  "제목 없음"
                }
                excerpt={excerpt(entry.reflectionBody, 80)}
              />
            ))}
          </div>
        ) : (
          <SurfaceCard>
            <p className="text-headline-sm text-primary">아직 기록이 없습니다</p>
            <p className="mt-2 text-body-md text-text-muted">
              첫 묵상을 남기면 여기에 이어집니다.
            </p>
            <div className="mt-4">
              <Link href="/entries/new" className="cta-primary">
                묵상 기록하기
              </Link>
            </div>
          </SurfaceCard>
        )}
      </section>

      <StoryMirrorHomeCard
        userId={user.id}
        storyMirrorEnabled={flags.storyMirrorEnabled ?? false}
      />
    </AppShell>
  );
}
