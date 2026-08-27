import { computeResurfaceScore } from "@/lib/continuity/resurface-score";

/**
 * src/lib/select-card.ts
 * 오늘의 카드 선택 정책 (GATE-5, R-B1) — 순수 함수, DB 비의존.
 *
 * v1.3 §3.1 Memory 후보 선택 규칙 (구현 임의 결정 금지):
 * - keyring(surface): ① 타임캡슐(anchor 30→100→365, 최근접) → ② 과거의 오늘
 *   → ③ 지난주 내 한 문장 → ④ 리액션했던 카드 → ⑤ 전역/개인 말씀
 * - today(surface): 말씀 우선 (Memory는 보조 링크 — G008에서 처리)
 *
 * 후보는 호출자(G008/G009/G010)가 DB에서 미리 노출 제외(MemoryExposure)하여 전달한다.
 * 이 모듈은 정책(순서·cardKey·중복 제거)만 결정한다.
 */

export type CardSurface = "today" | "keyring";

export type CardKind = "scripture" | "memory";
export type CardSourceType = "scripture" | "entry" | "reaction";

/** Memory 후보 — DB에서 조회된 후보 1건. */
export type CardCandidate = {
  sourceType: CardSourceType;
  sourceId: string; // entryId (reaction: entryId 또는 scriptureKey)
  entryId?: string; // sourceType=entry일 때 실제 기록 id
  entryDate?: Date;
  /** 타임캡슐 anchor(30/100/365) — 정렬용 */
  anchorDays?: number;
  /** |anchor - 실제 경과일| — 최근접 정렬용 */
  distanceDays?: number;
  display: string;
  excerpt?: string;
  /** 설계 05§7 스코어링 입력 — 호출자가 사전 조회해 채운다 */
  stillHold?: boolean;
  hasOneLine?: boolean;
  matchesTodayContext?: boolean;
  hasOpenAction?: boolean;
  anniversary?: boolean;
};

export type CardSelection = {
  cardKey: string;
  kind: CardKind;
  sourceType: CardSourceType;
  sourceId: string;
  candidate?: CardCandidate;
};

export function cardKeyFor(
  kind: CardKind,
  sourceId: string,
  dateKey: string,
): string {
  if (kind === "scripture") return `scripture:${dateKey}`;
  return `${kind}:${sourceId}`;
}

/**
 * 타임캡슐 후보 정렬 — 설계 05§7 스코어가 채워진 후보는 점수 desc,
 * 미채원 후보는 기존 anchor(30→100→365) → distance 순위를 유지한다.
 */
export function rankTimeCapsuleCandidates(
  candidates: CardCandidate[],
): CardCandidate[] {
  const hasScoreInputs = candidates.some((c) => c.stillHold || c.matchesTodayContext || c.hasOpenAction);
  if (hasScoreInputs) {
    return [...candidates]
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
  }
  return [...candidates].sort((a, b) => {
    const ap = a.anchorDays ?? Number.POSITIVE_INFINITY;
    const bp = b.anchorDays ?? Number.POSITIVE_INFINITY;
    if (ap !== bp) return ap - bp;
    const ad = a.distanceDays ?? Number.POSITIVE_INFINITY;
    const bd = b.distanceDays ?? Number.POSITIVE_INFINITY;
    return ad - bd;
  });
}


/** Memory 후보 중복 제거 — 첫 번째 entryId만 유지. */
export function dedupeByEntryId(
  candidates: CardCandidate[],
): CardCandidate[] {
  const seen = new Set<string>();
  const out: CardCandidate[] = [];
  for (const c of candidates) {
    const key = c.entryId ?? c.sourceId;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

function memorySelection(
  candidate: CardCandidate,
  dateKey: string,
): CardSelection {
  const entryId = candidate.entryId ?? candidate.sourceId;
  return {
    cardKey: cardKeyFor("memory", entryId, dateKey),
    kind: "memory",
    sourceType: candidate.sourceType,
    sourceId: entryId,
    candidate,
  };
}

function scriptureSelection(dateKey: string): CardSelection {
  return {
    cardKey: cardKeyFor("scripture", dateKey, dateKey),
    kind: "scripture",
    sourceType: "scripture",
    sourceId: dateKey,
  };
}

/**
 * 카드 선택 정책 (GATE-5/R-B1).
 * - keyring: 타임캡슐 → 과거의 오늘 → 지난주 → 리액션 → 말씀
 * - today: 말씀 (Memory는 보조 — G008)
 * 호출자는 각 그룹을 이미 정렬·노출 제외된 상태로 전달한다 (정책은 그룹 순서만 결정).
 */
export function selectCardPolicy(opts: {
  surface: CardSurface;
  dateKey: string;
  timeCapsule?: CardCandidate[];
  pastToday?: CardCandidate[];
  lastWeek?: CardCandidate[];
  reactions?: CardCandidate[];
}): CardSelection {
  const { surface, dateKey } = opts;

  if (surface === "today") {
    return scriptureSelection(dateKey);
  }

  // keyring — Memory 우선
  const timeCapsule = dedupeByEntryId(
    rankTimeCapsuleCandidates(opts.timeCapsule ?? []),
  );
  if (timeCapsule[0]) return memorySelection(timeCapsule[0], dateKey);

  const pastToday = dedupeByEntryId(opts.pastToday ?? []);
  if (pastToday[0]) return memorySelection(pastToday[0], dateKey);

  const lastWeek = dedupeByEntryId(opts.lastWeek ?? []);
  if (lastWeek[0]) return memorySelection(lastWeek[0], dateKey);

  const reactions = dedupeByEntryId(opts.reactions ?? []);
  if (reactions[0]) return memorySelection(reactions[0], dateKey);

  return scriptureSelection(dateKey);
}
