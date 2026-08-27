import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { OpenActionCard } from "@/components/open-action-card";
import { GuestTodayView } from "@/components/today/guest-view";
import { BackupPrompt } from "@/components/backup-prompt";
import { EntryRow } from "@/components/ui-blocks";
import { TodayCard } from "@/components/today/today-card";
import { recentChapterKeys, selectRandomScripture } from "@/lib/daily-scripture";
import { parseBibleReferences } from "@/lib/bible/parse";
import { toSlug } from "@/lib/bible/format";
import { getOptionalUser, type ApiUser } from "@/lib/session";
import { getCheckin } from "@/lib/checkin";
import { listOpenActionSteps } from "@/lib/actions";
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
import { getStoryForRef } from "@/lib/story-application";
import { buildResurfaceReason, buildTopContextReason } from "@/lib/continuity/explain";
import { computeContextScores } from "@/lib/continuity/context-score";
import { composeExperience } from "@/lib/experience-composer";

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
    select: { id: true, title: true, entryDate: true, reflectionBody: true, scriptureRefs: true, scriptureBindings: true },
  });
  const continuityEntry =
    recentEntries.find((entry) => entry.reflectionBody.trim().length > 5) ?? null;

  // 설계 05§6 — 최근 28일 Moment 행동 신호로 context 점수 계산 (점수 미노출).
  const momentRows = await db.moment.findMany({
    where: {
      userId: user.id,
      happenedAt: { gte: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000) },
      context: { not: null },
    },
    select: { context: true, happenedAt: true, reaction: true },
    orderBy: { happenedAt: "desc" },
    take: 200,
  });
  const topContext = computeContextScores({
    moments: momentRows.map((m) => ({
      context: m.context,
      happenedAt: m.happenedAt,
      reaction: m.reaction,
    })),
    now,
  })[0] ?? null;

  // 05§4 최근 장 중복 방지 — 최근 기록의 성구에서 장 키 추출해 Today hero에서 제외 (recentChapterKeys helper 사용)
  const recentSlugs: string[] = [];
  for (const entry of recentEntries) {
    try {
      const rawRefs = (entry as unknown as { scriptureRefs?: string | null }).scriptureRefs;
      if (rawRefs) {
        const parsed = JSON.parse(rawRefs);
        if (Array.isArray(parsed)) {
          for (const text of parsed) {
            for (const ref of parseBibleReferences(String(text))) {
              recentSlugs.push(toSlug(ref));
            }
          }
        }
      }
    } catch {}
    try {
      const rawBindings = (entry as unknown as { scriptureBindings?: string | null }).scriptureBindings;
      if (rawBindings) {
        const parsed = JSON.parse(rawBindings);
        if (Array.isArray(parsed)) {
          for (const b of parsed as Array<{ slug?: string; code?: string; chapter?: number }>) {
            if (b?.slug) recentSlugs.push(String(b.slug));
            else if (b?.code && b?.chapter) recentSlugs.push(`${String(b.code).toUpperCase()}-${Number(b.chapter)}-1`);
          }
        }
      }
    } catch {}
  }
  const recentChapters = recentChapterKeys(recentSlugs);

  // 오늘 붙들 말씀 — 매일 하나, 사용자·KST 날짜 시드로 결정적 랜덤 (AI 호출 없음).
  // 05§4 전역 중복 방지 활성: 최근 장 제외 + topContext는 reason+아래 todayMemory 스코어링으로 반영
  const dailyScripture = selectRandomScripture({
    seed: `${user.id}:${toKstDateKey(now)}`,
    excludeChapters: recentChapters.size ? recentChapters : undefined,
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
    reason: topContext ? buildTopContextReason(topContext.context) ?? undefined : undefined,
    story: getStoryForRef(dailyScripture.ref, continuityEntry?.reflectionBody ?? null),
  };
  const lifecycle =
    recentEntries.length === 0
      ? "new"
      : recentEntries.length < 3
        ? "early"
        : "returning";
  // 05§6+§7: todayMemory에 DB 스코어 입력 채워 topContext가 선택 경로에 반영되도록 와이어링
  // (still_hold / open action / matchesTodayContext 채워 rankTimeCapsuleCandidates가 score path를 타게 함)
  let todayMemory: Array<{
    sourceType: "entry";
    sourceId: string;
    entryId: string;
    entryDate: Date;
    display: string;
    excerpt: string;
    stillHold?: boolean;
    hasOpenAction?: boolean;
    matchesTodayContext?: boolean;
    hasOneLine?: boolean;
  }> = [];
  if (continuityEntry && elapsedDaysKst(now, continuityEntry.entryDate) >= 3) {
    const base = {
      sourceType: "entry" as const,
      sourceId: continuityEntry.id,
      entryId: continuityEntry.id,
      entryDate: continuityEntry.entryDate,
      display: continuityEntry.title || "지난 기록",
      excerpt: excerpt(continuityEntry.reflectionBody, 120),
    };
    const [stillHoldRow, openActionRow, oneLineRow] = await Promise.all([
      db.pastEncounter.findFirst({ where: { userId: user.id, sourceEntryId: continuityEntry.id, reaction: "still_hold" }, select: { sourceEntryId: true } }),
      db.actionStep.findFirst({ where: { userId: user.id, sourceEntryId: continuityEntry.id, status: { in: ["pending", "walking"] } }, select: { sourceEntryId: true } }),
      db.dailyCheckIn.findFirst({ where: { userId: user.id, entryId: continuityEntry.id, oneLine: { not: null } }, select: { oneLine: true } }),
    ]);
    const matchesTodayContext = topContext ? momentRows.some((m) => m.context === topContext.context) : false;
    todayMemory = [
      {
        ...base,
        stillHold: !!stillHoldRow,
        hasOpenAction: !!openActionRow,
        hasOneLine: !!(oneLineRow?.oneLine && oneLineRow.oneLine.trim().length > 0),
        matchesTodayContext,
      },
    ];
  }
  // v1.3 scripture-first: today surface does not use keyring timeCapsule path as hero.
  // composedExperience is kept scripture-only; memory resurface is secondary below hero.
  // 05§4 와이어링 보증: recentChapters는 위 dailyScripture excludeChapters로 전달되어 Today hero 전역 중복 방지를 활성화한다.
  // topContext는 위 todayMemory matchesTodayContext로 선택 경로에 영향을 준다.
  const composedExperience = composeExperience({
    surface: "today",
    lifecycle,
    dateKey,
  });
  void composedExperience;
  // Secondary resurface candidate — shown below hero when scripture is dominant.
  const secondaryCandidate =
    contentKey === "scripture" && lifecycle === "returning" && todayMemory[0]
      ? todayMemory[0]
      : null;
  const secondaryDaysAgo = secondaryCandidate?.entryDate
    ? elapsedDaysKst(now, secondaryCandidate.entryDate)
    : 0;
  const secondaryReason = secondaryCandidate
    ? (buildResurfaceReason({
        sourceType: secondaryCandidate.sourceType,
        elapsedDays: secondaryDaysAgo,
      }) ?? null)
    : null;

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
  } else {
    cardContent = scriptureContent;
  }

  const existingCheckin = await getCheckin(user.id, dateKey, heroCardKey);

  // 조용한 안전망 (DESIGN.md "Continuity & identity policy") — 익명 유저의
  // 3번째 기록 시점에 단 한 번, 구글 계정 연결을 부드럽게 제안한다.
  const [entryCount, userRow] = await Promise.all([
    db.reflectionEntry.count({ where: { userId: user.id, deletedAt: null } }),
    db.user.findUnique({
      where: { id: user.id },
      select: { email: true, backupPromptDismissedAt: true },
    }),
  ]);
  const showBackupPrompt =
    !userRow?.email && !userRow?.backupPromptDismissedAt && entryCount >= 3;

  return (
    <AppShell wide bare>
      <p className="mb-4 text-eyebrow">
        {greeting}님 · {formatDateKo(now)}
      </p>

      {showBackupPrompt ? <BackupPrompt /> : null}

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
      {/* 2. 보조 회상 — Scripture-first: memory는 hero가 아닌 보조 카드로 (screen 08) */}
      {secondaryCandidate ? (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-label-sm font-medium text-text-muted">
            {secondaryDaysAgo}일 전의 나
          </h2>
          <p className="mt-2 text-body-md font-semibold text-foreground">
            {secondaryCandidate.display}
          </p>
          {secondaryCandidate.excerpt ? (
            <p className="mt-1 text-body-sm leading-relaxed text-text-muted">
              {secondaryCandidate.excerpt}
            </p>
          ) : null}
          {secondaryReason ? (
            <p className="mt-2 text-caption text-text-muted">{secondaryReason}</p>
          ) : null}
          <Link
            href={`/entries/${secondaryCandidate.entryId ?? secondaryCandidate.sourceId}/edit`}
            className="cta-secondary mt-3 inline-flex min-h-11 items-center px-4 py-2"
          >
            다시 읽기
          </Link>
        </section>
      ) : null}

      {/* 3. 보조 행동 — 열린 결단 하나 */}
      {primaryAction ? (
        <div className="mt-6">
          <OpenActionCard item={primaryAction} />
        </div>
      ) : null}

      {/* 4. 조용한 목록 — 최근 기록 */}
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
