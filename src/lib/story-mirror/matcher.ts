/**
 * Story Mirror — Matching Algorithm
 *
 * Phase A: 태그·키워드 기반 (외부 처리 불필요)
 * Phase B: 벡터 유사도 (동의 시 + 임베딩 존재 시)
 * Phase C: LLM 설명 생성은 API 레이어에서 별도 처리
 */

import type { UserProfile } from "./user-profile";
import { jaccardSimilarity, intersectionCount } from "./vocab";

export type StoryCandidate = {
  id: string;
  workId: string;
  name: string;
  workTitle: string;
  themes: string[];
  emotions: string[];
  situations: string[];
  summary: string;
  arc?: string | null;
  contentWarnings: string[];
  embedding?: number[] | null;
};

export type MatchResult = {
  cardId: string;
  score: number;
  confidence: "high" | "medium" | "low" | "insufficient";
  matchedThemes: string[];
  matchedEmotions: string[];
  matchReason: string;
};

/**
 * Phase A + B 하이브리드 매칭.
 *
 * Phase A (태그·키워드): 50%
 * Phase B (벡터 유사도): 50% (임베딩 있을 때만, 없으면 Phase A 100%)
 */
export function matchHybrid(
  profile: UserProfile,
  candidates: StoryCandidate[],
  opts: { minScore?: number; maxResults?: number; recentRunCardIds?: string[]; useEmbedding?: boolean; recentCultures?: string[] } = {},
): MatchResult[] {
  const minScore = opts.minScore ?? 0.2;
  const maxResults = opts.maxResults ?? 5;
  const excluded = new Set(opts.recentRunCardIds ?? []);
  const useEmbedding = opts.useEmbedding ?? false;
  const recentCultures = opts.recentCultures ?? [];

  const cultureCount = new Map<string, number>();
  for (const c of recentCultures) {
    cultureCount.set(c, (cultureCount.get(c) ?? 0) + 1);
  }

  const scored: Array<{ card: StoryCandidate; score: number; details: MatchDetails }> = [];

  for (const card of candidates) {
    if (excluded.has(card.id)) continue;

    const details = computeMatchDetails(profile, card);

    // 문화권 다양성 감점: 최근 매칭된 문화권이 2개 이상이면 감점
    const cultureKey = card.workTitle; // workTitle로 문화권 추정 (실제로는 work.culture 사용)
    const culturePenalty = (cultureCount.get(cultureKey) ?? 0) >= 2 ? 0.8 : 1;

    let vectorScore = 0;
    if (useEmbedding && card.embedding && profileEmbedding) {
      vectorScore = cosineSimilarity(profileEmbedding, card.embedding);
    }

    const rawScore = useEmbedding && card.embedding
      ? details.score * 0.5 + vectorScore * 0.5
      : details.score;

    const finalScore = rawScore * culturePenalty;

    if (finalScore >= minScore) {
      scored.push({ card, score: finalScore, details });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, maxResults).map(({ card, score, details }) => ({
    cardId: card.id,
    score,
    confidence: scoreToConfidence(score),
    matchedThemes: details.matchedThemes,
    matchedEmotions: details.matchedEmotions,
    matchReason: buildMatchReason(card, details),
  }));
}

// Phase A 전용 (기존 인터페이스 유지)
export function matchPhaseA(
  profile: UserProfile,
  candidates: StoryCandidate[],
  opts: { minScore?: number; maxResults?: number; recentRunCardIds?: string[] } = {},
): MatchResult[] {
  return matchHybrid(profile, candidates, { ...opts, useEmbedding: false });
}

let profileEmbedding: number[] | null = null;

export function setProfileEmbedding(embedding: number[] | null) {
  profileEmbedding = embedding;
}

type MatchDetails = {
  themeScore: number;
  emotionScore: number;
  situationScore: number;
  dateDiversity: number;
  warningPenalty: number;
  score: number;
  matchedThemes: string[];
  matchedEmotions: string[];
};

function computeMatchDetails(
  profile: UserProfile,
  card: StoryCandidate,
): MatchDetails {
  const themeScore = jaccardSimilarity(profile.topThemes, card.themes);
  const emotionScore = jaccardSimilarity(profile.topEmotions, card.emotions);
  const situationScore =
    card.situations.length > 0 ? Math.min(intersectionCount(profile.topThemes, card.situations) / card.situations.length, 1) : 0;

  const matchedThemes = profile.topThemes.filter((t) =>
    card.themes.some((ct) => ct.toLowerCase() === t.toLowerCase()),
  );
  const matchedEmotions = profile.topEmotions.filter((e) =>
    card.emotions.some((ce) => ce.toLowerCase() === e.toLowerCase()),
  );

  const dateDiversity = profile.entryCount >= 2 ? Math.min(profile.entryCount / 10, 1) : 0.3;
  const warningPenalty = card.contentWarnings.length > 0 ? 0.5 : 1;

  const score =
    (themeScore * 0.35 +
      emotionScore * 0.25 +
      situationScore * 0.15 +
      dateDiversity * 0.15 +
      0.1) *
    warningPenalty;

  return {
    themeScore,
    emotionScore,
    situationScore,
    dateDiversity,
    warningPenalty,
    score,
    matchedThemes,
    matchedEmotions,
  };
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

function scoreToConfidence(score: number): "high" | "medium" | "low" | "insufficient" {
  if (score >= 0.5) return "high";
  if (score >= 0.35) return "medium";
  if (score >= 0.2) return "low";
  return "insufficient";
}

function buildMatchReason(
  card: StoryCandidate,
  details: MatchDetails,
): string {
  const parts: string[] = [];

  if (details.matchedThemes.length > 0) {
    parts.push(`'${details.matchedThemes.join("', '")}' 주제`);
  }
  if (details.matchedEmotions.length > 0) {
    parts.push(`'${details.matchedEmotions.join("', '")}' 감정`);
  }

  const what = parts.length > 0 ? parts.join("과 ") + "이" : "이야기와 관련된 주제가";
  return `${card.name}의 이야기에서 ${what} 나타납니다.`;
}
