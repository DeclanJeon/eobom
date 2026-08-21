import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { OpenActionCard } from "@/components/open-action-card";
import { GuestTodayView } from "@/components/today/guest-view";
import { TodayCard } from "@/components/today/today-card";
import { EntryRow, PageIntro, SurfaceCard } from "@/components/ui-blocks";
import { listOpenActionSteps } from "@/lib/actions";
import { selectRandomScripture } from "@/lib/daily-scripture";
import { getOptionalUser, type ApiUser } from "@/lib/session";
import { getCheckin } from "@/lib/checkin";
import { kstDaysAgoStart, toKstDateKey, toKstParts } from "@/lib/kst";
import { weekdayContentKey, selectPrompt } from "@/lib/weekday-rhythm";
import {
  elapsedDaysKst,
  selectTimeCapsuleCard,
  timeCapsuleLabel,
} from "@/lib/time-capsule";
import { db } from "@/lib/db";
import { excerpt, formatDateKo, parseJsonArray } from "@/lib/utils";
import { pastTodayDateRanges } from "@/lib/past-today";
import { getUserPreferenceFlags } from "@/lib/user-preferences";

export const metadata = { title: "오늘" };

export default async function TodayPage() {
  const user = await getOptionalUser();
  const now = new Date();
  // GATE-2: 게스트는 전역 말씀만 (개인 기록·타임캡슐·회고·개인 seed 조회 금지)
  if (!user) return <GuestTodayView now={now} />;
  return <MemberTodayView user={user} now={now} />;
}

async function MemberTodayView({
  user,
  now,
}: {
  user: ApiUser;
  now: Date;
}) {

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
  const dailyScripture = selectRandomScripture({
    seed: `${user.id}:${toKstDateKey(now)}`,
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
  const dateKey = toKstDateKey(now);

  // Phase 3 rhythm은 실험 flag로만 활성화. 기본은 v1.3 scripture-first 계약 유지.
  const weekdayEnabled = process.env.ENABLE_WEEKDAY_RHYTHM === "1";
  const contentKey = weekdayEnabled ? weekdayContentKey(now) : "scripture";

  const lastWeekEntry =
    contentKey === "last_week"
      ? await db.reflectionEntry.findFirst({
          where: {
            userId: user.id,
            deletedAt: null,
            entryDate: { gte: kstDaysAgoStart(now, 7) },
          },
          orderBy: { entryDate: "desc" },
        })
      : null;

  const timeCapsuleCard =
    contentKey === "time_capsule" ? await selectTimeCapsuleCard(user.id, now) : null;

  const gratitudeItems =
    contentKey === "gratitude"
      ? await db.reflectionEntry.findMany({
          where: {
            userId: user.id,
            deletedAt: null,
            gratitude: { not: null },
            entryDate: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
          },
          orderBy: { entryDate: "desc" },
          take: 6,
          select: { gratitude: true },
        })
      : [];

  // 카드 콘텐츠 조립 — 데이터 없으면 오늘의 말씀으로 폴백 (빈 섹션 숨김)
  let cardContent;
  let heroCardKey = `scripture:${dateKey}`;
  let writeHref = heroRef
    ? `/entries/new?scripture=${encodeURIComponent(heroDisplay || heroRef)}`
    : "/entries/new";

  const scriptureContent = {
    kind: "scripture" as const,
    display: heroDisplay || heroRef,
    text: passageText,
    background: heroReason ?? undefined,
    sourceLabel: heroSourceLabel,
  };

  if (contentKey === "prompt") {
    const question = await selectPrompt(dateKey);
    cardContent = { kind: "prompt" as const, display: question };
    heroCardKey = `prompt:${dateKey}`;
    writeHref = "/entries/new";
  } else if (contentKey === "last_week" && lastWeekEntry) {
    cardContent = {
      kind: "memory" as const,
      label: "지난주 내 한 문장",
      display:
        lastWeekEntry.title ||
        parseJsonArray(lastWeekEntry.scriptureRefs)[0] ||
        "지난주 기록",
      excerpt: excerpt(lastWeekEntry.reflectionBody, 90),
      entryId: lastWeekEntry.id,
    };
    heroCardKey = `memory:${lastWeekEntry.id}`;
    writeHref = `/entries/${lastWeekEntry.id}/edit`;
  } else if (contentKey === "action" && primaryAction) {
    cardContent = {
      kind: "prompt" as const,
      display: primaryAction.body,
      hint: "오늘 살아낼 작은 실천으로 붙들어 보세요.",
    };
    heroCardKey = `action:${primaryAction.id}`;
    writeHref = "/entries/new";
  } else if (contentKey === "time_capsule" && timeCapsuleCard) {
    cardContent = {
      kind: "memory" as const,
      label: timeCapsuleLabel(
        timeCapsuleCard.anchorDays ?? 30,
        elapsedDaysKst(now, timeCapsuleCard.entryDate!),
      ),
      display: timeCapsuleCard.display,
      excerpt: timeCapsuleCard.excerpt,
      entryId: timeCapsuleCard.entryId!,
    };
    heroCardKey = `memory:${timeCapsuleCard.entryId}`;
    writeHref = `/entries/${timeCapsuleCard.entryId}/edit`;
  } else if (contentKey === "review" && latestReview) {
    cardContent = {
      kind: "review" as const,
      display: "이번 주 돌아보기",
      href: `/lookback/${latestReview.id}`,
    };
    heroCardKey = `review:${latestReview.id}`;
    writeHref = `/lookback/${latestReview.id}`;
  } else if (contentKey === "gratitude" && gratitudeItems.length > 0) {
    cardContent = {
      kind: "gratitude" as const,
      display: "이번 주 감사",
      items: gratitudeItems
        .map((e) => e.gratitude?.trim())
        .filter((g): g is string => Boolean(g))
        .slice(0, 5),
    };
    heroCardKey = `gratitude:${dateKey}`;
    writeHref = "/entries";
  } else {
    cardContent = scriptureContent;
  }

  const existingCheckin = await getCheckin(user.id, dateKey, heroCardKey);

  return (
    <AppShell wide bare>
      <p className="mb-4 text-eyebrow">
        {greeting}님 · {formatDateKo(now)}
      </p>

      {/* 1. 지배적 장면 — 오늘의 카드 (Receive, B1) */}
      <TodayCard
        cardKey={heroCardKey}
        surface="today"
        dateKey={dateKey}
        identityKey={user.id}
        content={cardContent}
        initialReaction={existingCheckin?.reaction ?? null}
        initialOneLine={existingCheckin?.oneLine ?? null}
        initialEntryId={existingCheckin?.entryId ?? null}
        writeHref={writeHref}
      />

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
                  {toKstParts(now).year - toKstParts(pastToday.entryDate).year}년 전
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
