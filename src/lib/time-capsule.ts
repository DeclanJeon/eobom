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
        entryDate: { gte: w.gte, lt: w.lt }, // 배타 상한 — 경계일 전체 포함 (QA-1)
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

    // 노출 제외 (14일)
    const eligible = entries.filter((e) => !exposed.has(e.id));
    if (eligible.length === 0) continue;

    // 윈도우 안 최근접 (anchor와의 거리 최소) — orderBy가 이미 tie-break 정렬이므로
    // 최초 최소 거리 탐색 시 동률이면 정렬 순서의 첫 항목이 유지된다.
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

  return candidates;
}

/** 타임캡슐 후보 중 우선순위가 가장 높은 1개. 노출은 client impression API가 저장. */
export async function selectTimeCapsuleCard(
  userId: string,
  now: Date,
): Promise<CardCandidate | null> {
  const candidates = await findTimeCapsuleCandidates(userId, now);
  return [...candidates].sort((a, b) => {
    const ap = a.anchorDays ?? Number.POSITIVE_INFINITY;
    const bp = b.anchorDays ?? Number.POSITIVE_INFINITY;
    if (ap !== bp) return ap - bp;
    return (a.distanceDays ?? Number.POSITIVE_INFINITY) - (b.distanceDays ?? Number.POSITIVE_INFINITY);
  })[0] ?? null;
}

