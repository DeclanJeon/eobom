/**
 * 설계 05§6 Behavioral Context Score.
 * AI가 "심리 문제"를 판단하지 않는다 — 행동 데이터만으로 계산한다(05§9).
 *
 *   context_score = recent_frequency * .40
 *                 + recency           * .25
 *                 + unresolved        * .20
 *                 + explicit_signal   * .15
 *
 * 각 요소는 0..1 정규화. 결과는 콘텐츠 선택의 참고치이며 점수를 사용자에게 노출하지 않는다.
 */
import type { ContextCode } from "@/lib/context-verses";

export type MomentSignalRow = {
  context: string | null;
  happenedAt: Date;
  /** still_hold 등 명시적 신호 반응 */
  reaction: string | null;
  /** pending/walking 상태의 결단과 연결된 순간인지 (호출자가 조인해 전달) */
  hasOpenAction?: boolean;
};

export type ContextScoreInput = {
  moments: MomentSignalRow[];
  now: Date;
  /** 최근 관찰 창(일) — 기본 28일 */
  windowDays?: number;
};

export type ContextScore = {
  context: ContextCode;
  score: number;
  parts: {
    recentFrequency: number;
    recency: number;
    unresolved: number;
    explicitSignal: number;
  };
};

const WEIGHTS = { frequency: 0.4, recency: 0.25, unresolved: 0.2, signal: 0.15 } as const;

const KNOWN_CONTEXTS: ContextCode[] = [
  "WORK_DIRECTION",
  "RELATIONSHIP",
  "EMOTION",
  "FAITH",
  "FAMILY",
];

function isKnownContext(value: string | null): value is ContextCode {
  return value != null && (KNOWN_CONTEXTS as string[]).includes(value);
}

/** 반감기(half-life) 감쇠 — 최신 순간에 가까울수록 1에 수렴. */
function recencyDecay(daysAgo: number, halfLifeDays: number): number {
  if (daysAgo <= 0) return 1;
  return Math.pow(0.5, daysAgo / halfLifeDays);
}

export function computeContextScores(input: ContextScoreInput): ContextScore[] {
  const windowDays = input.windowDays ?? 28;
  const cutoff = new Date(input.now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const rows = input.moments.filter(
    (m) => isKnownContext(m.context) && m.happenedAt >= cutoff,
  );

  const byContext = new Map<ContextCode, MomentSignalRow[]>();
  for (const row of rows) {
    const list = byContext.get(row.context as ContextCode) ?? [];
    list.push(row);
    byContext.set(row.context as ContextCode, list);
  }

  // 최다 빈도를 1로 정규화 — 절대 건수가 아닌 상대적 집중도.
  const maxCount = Math.max(1, ...[...byContext.values()].map((list) => list.length));

  const scores: ContextScore[] = [];
  for (const [context, list] of byContext) {
    const recentFrequency = list.length / maxCount;

    let recencyRaw = 0;
    let unresolvedHits = 0;
    let signalHits = 0;
    for (const row of list) {
      const daysAgo = (input.now.getTime() - row.happenedAt.getTime()) / (24 * 60 * 60 * 1000);
      recencyRaw = Math.max(recencyRaw, recencyDecay(daysAgo, 7));
      const stillHolds = row.reaction === "still_hold";
      if (stillHolds || row.hasOpenAction) unresolvedHits += 1;
      if (stillHolds) signalHits += 1;
    }
    const recency = recencyRaw;
    const unresolved = Math.min(1, unresolvedHits / Math.max(1, list.length));
    const explicitSignal = Math.min(1, signalHits / Math.max(1, list.length));

    const score =
      recentFrequency * WEIGHTS.frequency +
      recency * WEIGHTS.recency +
      unresolved * WEIGHTS.unresolved +
      explicitSignal * WEIGHTS.signal;

    scores.push({
      context,
      score: Math.round(score * 1000) / 1000,
      parts: {
        recentFrequency: Math.round(recentFrequency * 1000) / 1000,
        recency: Math.round(recency * 1000) / 1000,
        unresolved: Math.round(unresolved * 1000) / 1000,
        explicitSignal: Math.round(explicitSignal * 1000) / 1000,
      },
    });
  }

  return scores.sort((a, b) => b.score - a.score || a.context.localeCompare(b.context));
}

export function topContextScore(scores: ContextScore[]): ContextScore | null {
  return scores[0] ?? null;
}
