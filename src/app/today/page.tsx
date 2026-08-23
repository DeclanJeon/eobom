import { AppShell } from "@/components/app-shell";
import { OpenActionCard } from "@/components/open-action-card";
import { GuestTodayView } from "@/components/today/guest-view";
import { EntryRow } from "@/components/ui-blocks";
import { TodayCard } from "@/components/today/today-card";
import { listOpenActionSteps } from "@/lib/actions";
import { selectRandomScripture } from "@/lib/daily-scripture";
import { getOptionalUser, type ApiUser } from "@/lib/session";
import { getCheckin } from "@/lib/checkin";
import { kstDaysAgoStart, toKstDateKey } from "@/lib/kst";
import { weekdayContentKey, selectPrompt } from "@/lib/weekday-rhythm";
import {
  elapsedDaysKst,
  selectTimeCapsuleCard,
  timeCapsuleLabel,
} from "@/lib/time-capsule";
import { getChapterBackground } from "@/lib/bible/chapter-background";
import { getPassageFromRef } from "@/lib/bible/corpus";
import { db } from "@/lib/db";
import { excerpt, formatDateKo, formatDateShort, parseJsonArray } from "@/lib/utils";

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

  const [openActions, latestReview] = await Promise.all([
    listOpenActionSteps(user.id, 3),
    db.reviewReport.findFirst({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const primaryAction = openActions[0] ?? null;

  const recentEntries = await db.reflectionEntry.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { entryDate: "desc" },
    take: 3,
    select: { id: true, title: true, entryDate: true, reflectionBody: true },
  });

  // 오늘 붙들 말씀 — 매일 하나, 사용자·KST 날짜 시드로 결정적 랜덤 (AI 호출 없음).
  const dailyScripture = selectRandomScripture({
    seed: `${user.id}:${toKstDateKey(now)}`,
  });
  const heroRef = dailyScripture.display;
  const heroDisplay = dailyScripture.display;
  const heroReason = dailyScripture.background?.trim() || null;
  const heroSourceLabel = "오늘 하루 함께할 말씀입니다.";
  const passageText = dailyScripture.text;
  const passage = getPassageFromRef(dailyScripture.ref);
  const verseRows = passage?.verses?.map((v) => ({ verse: v.verse, text: v.text })) ?? [];
  const chapterBg = getChapterBackground({
    code: dailyScripture.ref.code,
    chapter: dailyScripture.ref.chapter,
    locale: "ko",
  });


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
    verses: verseRows,
    chapterBg,
    ref: dailyScripture.ref,
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

      {/* 2. 보조 행동 — 열린 결단 하나 */}
      {primaryAction ? (
        <div className="mt-6">
          <OpenActionCard item={primaryAction} />
        </div>
      ) : null}

      {/* 3. 조용한 목록 — 최근 기록 */}
      {recentEntries.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-label-sm font-medium text-text-muted">최근 기록</h2>
          <div className="mt-1">
            {recentEntries.map((e) => (
              <EntryRow
                key={e.id}
                href={`/entries/${e.id}`}
                date={formatDateShort(e.entryDate)}
                title={e.title || "무제"}
                excerpt={excerpt(e.reflectionBody, 90)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
