/**
 * Story Mirror — Controlled Vocabulary
 *
 * 매칭에 사용하는 통제 어휘. 사용자 기록과 StoryCard의
 * 주제·감정·상황을 정규화하여 비교한다.
 */

// ─── Themes ──────────────────────────────────────────────────────────────────

export const THEMES = [
  "관계의 망설임",
  "먼저 다가감",
  "기다림",
  "이별과 상실",
  "신뢰와 의심",
  "용기와 두려움",
  "용서",
  "회개",
  "겸손",
  "인내",
  "외로움",
  "소속",
  "정체성",
  "사명과 방향",
  "가난과 존엄",
  "자기 발견",
  "_loss of innocence",
  "정의",
  "자비",
  "감사",
  "기도",
  "성장",
  "변화",
  "소망",
  "평화",
  "갈등",
  "선택",
  "책임",
  "자유",
  "한계",
] as const;

export type Theme = (typeof THEMES)[number];

// ─── Emotions ────────────────────────────────────────────────────────────────

export const EMOTIONS = [
  "기쁨",
  "슬픔",
  "두려움",
  "분노",
  "그리움",
  "감사",
  "후회",
  "기대",
  "불안",
  "위로",
  "평온",
  "외로움",
  "희망",
  "절망",
  "놀람",
  "체념",
  "열정",
  "인내",
] as const;

export type Emotion = (typeof EMOTIONS)[number];

// ─── Situations ──────────────────────────────────────────────────────────────

export const SITUATIONS = [
  "이별 앞에서",
  "먼저 연락하기",
  "관계 회복",
  "혼자인 시간",
  "새로운 시작",
  "실패 후",
  "권면과 격려",
  "위기 상황",
  "선택의 기로",
  "기도의 시간",
  "말씀 묵상",
  "타인과 비교",
  "자기 의심",
  "감사 표현",
  "도움 요청",
  "포기하고 싶을 때",
  "기다림의 시간",
  "상처 치유",
  "목적 발견",
  "동행",
] as const;

export type Situation = (typeof SITUATIONS)[number];

// ─── Normalization ───────────────────────────────────────────────────────────

const THEME_SET = new Set(THEMES.map((t) => t.toLowerCase()));
const EMOTION_SET = new Set(EMOTIONS.map((e) => e.toLowerCase()));
const SITUATION_SET = new Set(SITUATIONS.map((s) => s.toLowerCase()));

/** 입력 문자열이 통제 어휘에 존재하는지 확인 */
export function isValidTheme(v: string): boolean {
  return THEME_SET.has(v.toLowerCase());
}

export function isValidEmotion(v: string): boolean {
  return EMOTION_SET.has(v.toLowerCase());
}

export function isValidSituation(v: string): boolean {
  return SITUATION_SET.has(v.toLowerCase());
}

/** JSON 배열 문자열을 파싱하고 통제 어휘에 해당하는 것만 필터링 */
export function parseAndFilterThemes(raw: string): Theme[] {
  return parseJsonArray(raw).filter((v): v is Theme => isValidTheme(v));
}

export function parseAndFilterEmotions(raw: string): Emotion[] {
  return parseJsonArray(raw).filter((v): v is Emotion => isValidEmotion(v));
}

export function parseAndFilterSituations(raw: string): Situation[] {
  return parseJsonArray(raw).filter((v): v is Situation => isValidSituation(v));
}

function parseJsonArray(raw: string): string[] {
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((v): v is string => typeof v === "string" && v.length > 0);
  } catch {
    return [];
  }
}

// ─── Intersection helpers ────────────────────────────────────────────────────

/** 두 배열의 교집합 크기 */
export function intersectionCount(a: readonly string[], b: readonly string[]): number {
  const setB = new Set(b.map((s) => s.toLowerCase()));
  return a.filter((s) => setB.has(s.toLowerCase())).length;
}

/** Jaccard 유사도 (0~1) */
export function jaccardSimilarity(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a.map((s) => s.toLowerCase()));
  const setB = new Set(b.map((s) => s.toLowerCase()));
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
