import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { OpenActionCard } from "@/components/open-action-card";
import { EntryRow, PageIntro, SurfaceCard } from "@/components/ui-blocks";
import { listOpenActionSteps } from "@/lib/actions";
import { selectRandomScripture, toKstParts } from "@/lib/daily-scripture";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { excerpt, formatDateKo, parseJsonArray } from "@/lib/utils";
import { pastTodayDateRanges } from "@/lib/past-today";
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
      take: 20,
    }),
    listOpenActionSteps(user.id, 3),
    db.reviewReport.findFirst({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const recent = entryPool.slice(0, 3);
  const hasEntries = entryPool.length > 0;
  const primaryAction = openActions[0] ?? null;
  const moreActionsCount = Math.max(0, openActions.length - 1);

  // 오늘 붙들 말씀 — 매일 하나, 사용자·KST 날짜 시드로 결정적 랜덤 (AI 호출 없음).
  const kst = toKstParts(now);
  const dailyScripture = selectRandomScripture({
    seed: `${user.id}:${kst.dateKey}`,
  });
  const heroRef = dailyScripture.display;
  const heroDisplay = dailyScripture.display;
  const heroReason = dailyScripture.background?.trim() || null;
  const heroSourceLabel = "오늘 하루 함께할 말씀입니다.";
  const passageText = dailyScripture.text;

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
  const writeHref = heroRef
    ? `/entries/new?scripture=${encodeURIComponent(heroDisplay || heroRef)}`
    : "/entries/new";
  const writeLabel = heroRef
    ? "이 본문으로 기록하기"
    : hasEntries
      ? "묵상 기록하기"
      : "첫 묵상 남기기";

  return (
    <AppShell wide bare>
      {/* 1. 지배적 장면 — 성구 1개 + CTA 1개 */}
      <section className="mb-10 rounded-2xl border border-border/70 bg-secondary/30 px-5 py-8 md:mb-12 md:px-10 md:py-12">
        <PageIntro
          className="mb-0"
          eyebrow={formatDateKo(now)}
          title={
            <>
              {greeting}님,
              <span className="mt-1 block">
                {heroRef
                  ? "오늘 붙들 말씀"
                  : hasEntries
                    ? "오늘 한 줄을 남겨 보세요"
                    : "첫 묵상을 남겨 보세요"}
              </span>
            </>
          }
          titleClassName="md:text-4xl lg:text-[2.75rem]"
        />

        {heroRef ? (
          <div className="mt-6 max-w-2xl">
            {heroSourceLabel ? (
              <p className="mb-2 text-label-sm text-accent-gold-ink">
                {heroSourceLabel}
              </p>
            ) : null}
            <p className="chip-gold inline-flex">{heroDisplay || heroRef}</p>
            {passageText ? (
              <p className="mt-4 font-journal text-xl leading-relaxed text-primary md:text-2xl">
                {passageText}
              </p>
            ) : (
              <p className="mt-4 font-journal text-xl leading-relaxed text-primary md:text-2xl">
                {heroDisplay || heroRef}
              </p>
            )}
            {heroReason ? (
              <p className="mt-3 text-body-md text-text-muted line-clamp-2">
                {heroReason}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 max-w-xl text-body-md text-text-muted">
            {hasEntries
              ? "오늘 머문 말씀을 한 줄만 남겨도, 내일의 내가 다시 만납니다."
              : "아직 남긴 기록이 없어요. 첫 묵상을 남기면 그 말씀이 여기에 이어집니다."}
          </p>
        )}

        <div className="mt-8">
          <Link href={writeHref} className="cta-primary min-h-11 px-6 py-3">
            {writeLabel}
          </Link>
        </div>
      </section>

      {/* 2. 보조 행동: 열린 결단 0~1 */}
      {primaryAction ? (
        <section className="mb-10 md:mb-12">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="text-headline-sm text-primary">열린 결단</h2>
            {moreActionsCount > 0 ? (
              <Link
                href="/entries?filter=actions"
                className="min-h-11 inline-flex items-center text-label-sm text-text-muted hover:text-primary"
              >
                결단 기록 보기
              </Link>
            ) : null}
          </div>
          <div className="max-w-xl">
            <OpenActionCard item={primaryAction} />
          </div>
        </section>
      ) : null}

      {/* 3. 최근 기록 0~3 */}
      {recent.length > 0 ? (
        <section className="mb-10 md:mb-12">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="text-headline-sm text-primary">최근 기록</h2>
            <Link
              href="/entries"
              className="inline-flex min-h-11 items-center text-label-md text-text-muted hover:text-primary"
            >
              전체 보기
            </Link>
          </div>
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
        </section>
      ) : null}

      {/* 4. 있을 때만: 과거의 오늘 / 회고 한 줄 */}
      {pastToday || latestReview ? (
        <section className="mb-10 space-y-3 md:mb-12">
          {pastToday ? (
            <Link href={`/entries/${pastToday.id}`} className="block">
              <SurfaceCard className="transition hover:border-accent-gold/30">
                <p className="text-label-sm text-accent-terracotta">
                  과거의 오늘 ·{" "}
                  {now.getFullYear() - pastToday.entryDate.getFullYear()}년 전
                </p>
                <p className="mt-1 text-label-md text-primary">
                  {pastToday.title ||
                    parseJsonArray(pastToday.scriptureRefs)[0] ||
                    "그날의 기록"}
                </p>
                <p className="mt-1 line-clamp-2 text-body-sm text-text-muted">
                  {excerpt(pastToday.reflectionBody, 90)}
                </p>
              </SurfaceCard>
            </Link>
          ) : null}

          {latestReview ? (
            <Link
              href={`/lookback/${latestReview.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface-low/70 px-4 py-3 transition hover:border-accent-gold/30"
            >
              <div className="min-w-0">
                <p className="text-label-sm text-text-muted">최근 회고</p>
                <p className="mt-0.5 truncate text-label-md text-primary">
                  {latestReview.summary || "기록이 남긴 흐름 보기"}
                </p>
              </div>
              <span className="shrink-0 text-label-sm text-leaf">보기 →</span>
            </Link>
          ) : null}
        </section>
      ) : null}
    </AppShell>
  );
}
