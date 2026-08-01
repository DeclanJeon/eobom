/**
 * Situation Classifier — entries → SituationContext
 *
 * Phase 1: LLM 프롬프트 내 분류. 별도 임베딩 없이,
 * entries 요약을 바탕으로 64개 상황 중 top-2 매칭을 AI에게 요청한다.
 * 불확실 시 null 반환 (graceful degradation).
 */

import type { EntryForReview } from "@/lib/mimo";
import type { SituationProfile, SituationContext, WisdomTheme } from "./types";
import situations from "@/data/wisdom/situations.json";

const ALL_SITUATIONS = situations as SituationProfile[];

/**
 * entries에서 상황 신호를 추출하기 위한 요약을 생성한다.
 */
function buildEntrySummary(entries: EntryForReview[]): string {
  const emotions = entries.flatMap((e) => e.emotions).filter(Boolean);
  const tags = entries.flatMap((e) => e.tags).filter(Boolean);
  const questions = entries.map((e) => e.question).filter(Boolean);
  const reflections = entries.map((e) => e.reflectionBody).filter(Boolean);

  const emotionFreq = new Map<string, number>();
  for (const em of emotions) {
    emotionFreq.set(em, (emotionFreq.get(em) || 0) + 1);
  }
  const topEmotions = [...emotionFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([em]) => em);

  const tagFreq = new Map<string, number>();
  for (const t of tags) {
    tagFreq.set(t, (tagFreq.get(t) || 0) + 1);
  }
  const topTags = [...tagFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t);

  return [
    `기록 ${entries.length}건`,
    `반복 감정: ${topEmotions.join(", ") || "없음"}`,
    `반복 태그: ${topTags.join(", ") || "없음"}`,
    `질문: ${questions.slice(0, 3).join(" / ") || "없음"}`,
    `기록 발췌: ${reflections.slice(0, 3).map((r) => r.slice(0, 100)).join(" | ")}`,
  ].join("\n");
}

/**
 * 상황 분류를 위한 내부 프롬프트를 생성한다.
 * 이 프롬프트는 AI에게 top-2 상황 매칭을 요청하며,
 * 결과는 사용자에게 노출되지 않는다.
 */
export function buildClassificationPrompt(entries: EntryForReview[]): string {
  const summary = buildEntrySummary(entries);

  // 64개 상황의 id + label + archetype + theme 요약
  const situationList = ALL_SITUATIONS
    .map((s) => `${s.id} [${s.archetype}/${s.theme}] "${s.label}" — ${s.structure.image.slice(0, 60)}`)
    .join("\n");

  return `다음은 사용자의 묵상 기록 요약이다:

${summary}

아래 64개 상황 프로파일 중 이 기록과 가장 잘 맞는 1~2개를 선택하라.
각 상황은 id, archetype, theme, 형상 설명으로 구성된다.

${situationList}

응답 형식 (JSON만):
{
  "primary": "S03",
  "secondary": "S05",
  "theme": "growth",
  "phase": "early",
  "reasoning": "기록에서 X가 반복되므로 Y 상황으로 판단"
}

규칙:
- 반드시 위 목록의 id만 사용
- 명확한 신호가 없으면 primary를 "none"으로 설정
- reasoning은 기록 근거를 반드시 포함
- theme은 primary 상황의 theme과 일치해야 함
- phase는 "early" | "developing" | "peak" | "overreach" | "return" 중 하나`;
}

/**
 * 분류 결과를 SituationContext로 변환한다.
 * primary가 "none"이거나 매칭 실패 시 null 반환.
 */
export function resolveSituationContext(parsed: {
  primary: string;
  secondary?: string;
  theme: string;
  phase: string;
  reasoning: string;
}): SituationContext | null {
  if (!parsed.primary || parsed.primary === "none") return null;

  const primary = ALL_SITUATIONS.find((s) => s.id === parsed.primary);
  if (!primary) return null;

  const secondary = parsed.secondary
    ? ALL_SITUATIONS.find((s) => s.id === parsed.secondary)
    : undefined;

  return {
    primary,
    secondary,
    theme: primary.theme as WisdomTheme,
    phase: parsed.phase || "developing",
    reasoning: parsed.reasoning || "",
  };
}
