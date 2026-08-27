/**
 * src/lib/time-capsule.ts
 * 타임캡슐 — "과거의 나" 후보 선택 (G010, v1.3 §3.2, B5).
 *
 * 규칙:
 * - anchor 30±3 / 100±7 / 365±14 (KST 기준)
 * - anchor별 윈도우 안 가장 가까운 기록 1개 (동일 거리: entryDate desc → createdAt desc → id desc)
 * - anchor 우선순위 30 → 100 → 365 (rankTimeCapsuleCandidates가 정렬, selectCardPolicy가 최종 선택)
 * - MemoryExposure 14일 내 노출 기록 제외 (GATE-3, 무응답이어도 노출 저장)
 * - 정확한 날짜가 아니면 "약 N일 전" 표시 (정확도 거짓말 금지)
 */
import { db } from "@/lib/db";
import { kstDaysAgoStart } from "@/lib/kst";
import { recentlyExposedEntryIds } from "@/lib/memory-exposure";
import type { CardCandidate } from "@/lib/select-card";
import { computeResurfaceScore } from "@/lib/continuity/resurface-score";
import { parseJsonArray } from "@/lib/utils";

export const TIME_CAPSULE_ANCHORS = [
  { anchorDays: 30, windowDays: 3 },
  { anchorDays: 100, windowDays: 7 },
  { anchorDays: 365, windowDays: 14 },
] as const;

export type TimeCapsuleWindow = {
  anchorDays: number;
  windowDays: number;
  gte: Date; // 하한 포함 — now - (anchor + window)일, KST 자정
  lt: Date; // 상한 배타 — now - (anchor - window - 1)일, KST 자정 (경계일 전체 포함)
};

/** KST 기준 윈도우 — [gte, lt) 배타 상한으로 경계일 전체를 포함 (QA-1). */
export function timeCapsuleWindows(now: Date): TimeCapsuleWindow[] {
  return TIME_CAPSULE_ANCHORS.map(({ anchorDays, windowDays }) => ({
    anchorDays,
    windowDays,
    gte: kstDaysAgoStart(now, anchorDays + windowDays),
    lt: kstDaysAgoStart(now, anchorDays - windowDays - 1),
  }));
}

/** 경과 일수 (KST 자정 기준, 최소 0). */
export function elapsedDaysKst(now: Date, past: Date): number {
  const nowStart = kstDaysAgoStart(now, 0);
  const pastStart = kstDaysAgoStart(past, 0);
  return Math.round((nowStart.getTime() - pastStart.getTime()) / (24 * 60 * 60 * 1000));
}

/** "약 N일 전" 라벨 — 정확한 anchor면 "N일 전의 나". */
export function timeCapsuleLabel(anchorDays: number, actualDays: number): string {
  if (actualDays === anchorDays) return `${anchorDays}일 전의 나`;
  return `약 ${actualDays}일 전의 나`;
}

type EntryLike = {
  id: string;
  entryDate: Date;
  title: string | null;
  scriptureRefs: string;
  reflectionBody: string;
  createdAt: Date;
};

function toCandidate(entry: EntryLike, anchorDays: number, now: Date): CardCandidate {
  const actual = elapsedDaysKst(now, entry.entryDate);
  return {
    sourceType: "entry",
    sourceId: entry.id,
    entryId: entry.id,
    entryDate: entry.entryDate,
    anchorDays,
    distanceDays: Math.abs(anchorDays - actual),
    display:
      entry.title ||
      parseJsonArray(entry.scriptureRefs)[0] ||
      timeCapsuleLabel(anchorDays, actual),
    excerpt: entry.reflectionBody.slice(0, 90),
  };
}

/**
 * 타임캡슐 후보 조회 — anchor당 최대 1개 (윈도우 안 최근접), 노출 제외 적용.
 * 반환 배열은 selectCardPolicy의 rankTimeCapsuleCandidates가 anchor 우선 정렬한다.
 */
export async function findTimeCapsuleCandidates(
  userId: string,
  now: Date,
): Promise<CardCandidate[]> {
  const exposed = await recentlyExposedEntryIds(userId, { now });
  const windows = timeCapsuleWindows(now);
  const candidates: CardCandidate[] = [];

  for (const w of windows) {
    const entries = await db.reflectionEntry.findMany({
      where: {
        userId,
        deletedAt: null,
        entryDate: { gte: w.gte, lt: w.lt },
      },
      select: {
        id: true,
        entryDate: true,
        title: true,
        scriptureRefs: true,
        reflectionBody: true,
        createdAt: true,
      },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    });

    const eligible = entries.filter((e) => !exposed.has(e.id));
    if (eligible.length === 0) continue;

    let best = eligible[0]!;
    let bestDist = Math.abs(w.anchorDays - elapsedDaysKst(now, best.entryDate));
    for (const e of eligible) {
      const d = Math.abs(w.anchorDays - elapsedDaysKst(now, e.entryDate));
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    candidates.push(toCandidate(best, w.anchorDays, now));
  }

  if (candidates.length === 0) return candidates;

  // 05§7 scoring inputs — batch enrich from DB (PastEncounter still_hold, ActionStep open, DailyCheckIn oneLine)
  const entryIds = candidates.map((c) => c.entryId!).filter(Boolean);
  const [stillHolds, openActions, oneLines] = await Promise.all([
    db.pastEncounter.findMany({
      where: { userId, sourceEntryId: { in: entryIds }, reaction: "still_hold" },
      select: { sourceEntryId: true },
    }),
    db.actionStep.findMany({
      where: { userId, sourceEntryId: { in: entryIds }, status: { in: ["pending", "walking"] } },
      select: { sourceEntryId: true },
    }),
    db.dailyCheckIn.findMany({
      where: { userId, entryId: { in: entryIds }, oneLine: { not: null } },
      select: { entryId: true, oneLine: true },
    }),
  ]);
  const stillHoldSet = new Set(stillHolds.map((r) => r.sourceEntryId));
  const openActionSet = new Set(openActions.map((r) => r.sourceEntryId).filter(Boolean) as string[]);
  const oneLineSet = new Set(oneLines.filter((r) => r.oneLine && r.oneLine.trim().length > 0).map((r) => r.entryId!));

  for (const c of candidates) {
    const id = c.entryId ?? c.sourceId;
    c.stillHold = stillHoldSet.has(id);
    c.hasOpenAction = openActionSet.has(id);
    c.hasOneLine = oneLineSet.has(id);
    // matchesTodayContext & anniversary는 호출자가 topContext를 알 때 별도 갱신 (today/page가 갱신)
  }

  return candidates;
}
/** 타임캡슐 후보 중 우선순위가 가장 높은 1개. 노출은 client impression API가 저장. */
export async function selectTimeCapsuleCard(
  userId: string,
  now: Date,
): Promise<CardCandidate | null> {
  const candidates = await findTimeCapsuleCandidates(userId, now);
  if (candidates.length === 0) return null;
  const hasScoreInputs = candidates.some((c) => c.stillHold || c.matchesTodayContext || c.hasOpenAction);
  if (hasScoreInputs) {
    const ranked = [...candidates]
      .map((candidate, index) => ({
        candidate,
        index,
        score: computeResurfaceScore({
          candidate,
          stillHold: candidate.stillHold,
          hasOneLine: candidate.hasOneLine,
          matchesTodayContext: candidate.matchesTodayContext,
          hasOpenAction: candidate.hasOpenAction,
          anniversary: candidate.anniversary,
        }),
      }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map((entry) => entry.candidate);
    return ranked[0] ?? null;
  }
  return [...candidates].sort((a, b) => {
    const ap = a.anchorDays ?? Number.POSITIVE_INFINITY;
    const bp = b.anchorDays ?? Number.POSITIVE_INFINITY;
    if (ap !== bp) return ap - bp;
    return (a.distanceDays ?? Number.POSITIVE_INFINITY) - (b.distanceDays ?? Number.POSITIVE_INFINITY);
  })[0] ?? null;
}
