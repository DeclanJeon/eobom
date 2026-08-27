/**
 * 설계 05§7 Resurfacing Score.
 *
 *   score = temporal_fit
 *         + explicit_emotional_weight
 *         + unresolved_weight
 *         + today_context_similarity
 *         + action_relevance
 *         + event_anniversary_weight
 *         - recent_exposure_penalty
 *         - low_information_penalty
 *
 * 각 항은 0..1, 가중치는 설계 예시를 따른다. 최종 선택의 참고 랭킹이며 점수 노출 금지(08§17).
 * temporal anchor는 3/7/14/30/90일이며 정확한 예약일이 아니다(05§7).
 */
import type { CardCandidate } from "@/lib/select-card";

export type ResurfaceScoreInput = {
  candidate: CardCandidate;
  /** 사용자 반응이 still_hold인지 (호출자가 사전 조회) */
  stillHold?: boolean;
  /** 한 줄 등 의미 있는 부가 기록 존재 */
  hasOneLine?: boolean;
  /** 오늘 선택 context와 후보 기록 context가 같은지 */
  matchesTodayContext?: boolean;
  /** 이 기록에서 파생된 pending/walking 결단 존재 */
  hasOpenAction?: boolean;
  /** 명시 이벤트(DAY30/90 등)와 겹치는지 */
  anniversary?: boolean;
  now?: Date;
};

export const RESURFACE_WEIGHTS = {
  temporalFit: 0.25,
  explicitEmotional: 0.15,
  unresolved: 0.1,
  todayContextSimilarity: 0.15,
  actionRelevance: 0.15,
  anniversary: 0.2,
  recentExposurePenalty: 0.5,
  lowInformationPenalty: 0.3,
} as const;

const ANCHORS = [3, 7, 14, 30, 90];

/** anchor window 근접도 — anchor와의 거리가 가까울수록 1. */
function temporalFit(elapsedDays: number): number {
  if (!Number.isFinite(elapsedDays) || elapsedDays <= 0) return 0;
  let best = Number.POSITIVE_INFINITY;
  for (const anchor of ANCHORS) {
    // anchor의 ±50% window 안에서 가장 가까운 anchor 기준.
    best = Math.min(best, Math.abs(elapsedDays - anchor) / anchor);
  }
  return Math.max(0, 1 - best);
}

/** 저정보 판정 — 제목만/5자 이하 quick note/placeholder. */
function isLowInformation(candidate: CardCandidate): boolean {
  const excerpt = (candidate.excerpt ?? "").trim();
  return excerpt.length <= 5;
}

export function computeResurfaceScore(input: ResurfaceScoreInput): number {
  const { candidate } = input;
  const elapsedDays =
    candidate.entryDate && input.now
      ? (input.now.getTime() - candidate.entryDate.getTime()) / (24 * 60 * 60 * 1000)
      : NaN;

  const temporal = temporalFit(elapsedDays);
  const emotional = input.stillHold ? 1 : 0;
  const unresolved = (input.stillHold || input.hasOpenAction) && !input.hasOneLine ? 1 : 0;
  const contextSimilarity = input.matchesTodayContext ? 1 : 0;
  const actionRelevance = input.hasOpenAction ? 1 : 0;
  const anniversary = input.anniversary ? 1 : 0;
  const exposurePenalty = 0; // 호출자가 14일 suppression으로 이미 제외 — 이중 감점 없음(05§7 주석)
  const lowInfoPenalty = isLowInformation(candidate) ? 1 : 0;

  const w = RESURFACE_WEIGHTS;
  const raw =
    temporal * w.temporalFit +
    emotional * w.explicitEmotional +
    unresolved * w.unresolved +
    contextSimilarity * w.todayContextSimilarity +
    actionRelevance * w.actionRelevance +
    anniversary * w.anniversary -
    exposurePenalty * w.recentExposurePenalty -
    lowInfoPenalty * w.lowInformationPenalty;

  return Math.round(raw * 1000) / 1000;
}

/** 후보 배열을 점수 desc로 정렬 — 점수 동률 시 기존 anchor/distance 순위 유지. */
export function rankByResurfaceScore<T extends { candidate: CardCandidate }>(
  items: T[],
  scorer: (item: T) => number,
): T[] {
  return items
    .map((item, index) => ({ item, index, score: scorer(item) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}
