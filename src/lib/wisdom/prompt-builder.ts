/**
 * Prompt Builder — SituationContext → system prompt 텍스트
 *
 * 분류된 상황 컨텍스트를 AI system prompt에 주입할 텍스트로 변환한다.
 * 모든 출력은 기독교 묵상·성찰 언어로만 작성되며,
 * 동양 철학 용어는 절대 포함하지 않는다.
 */

import type { SituationContext } from "./types";

export function buildSituationPrompt(ctx: SituationContext | null): string {
  if (!ctx) return "";

  const { primary, secondary, phase } = ctx;

  // 현재 단계에 맞는 phase 정보 찾기
  const currentPhase = primary.phases.find((p) => p.stage === phase)
    || primary.phases[0];

  const lines: string[] = [
    "## 내부 상황 인식 지침 (사용자에게 절대 노출 금지)",
    "",
    "아래는 이 사용자의 기록에서 감지된 상황 구조입니다.",
    "회고를 작성할 때 이 구조를 **내적 관점**으로 사용하되,",
    "출력에는 상황 분류 용어, 동양 철학 용어, 괘/효/음양/군자 등을 절대 포함하지 마세요.",
    "모든 출력은 기독교 묵상·성찰·기도 언어로만 작성하세요.",
    "",
    `### 감지된 상황: "${primary.label}"`,
    `- 형상: ${primary.structure.image}`,
    `- 역학: ${primary.structure.dynamic}`,
    `- 태도: ${primary.structure.posture}`,
    `- 핵심 질문: "${primary.guidance.coreQuestion}"`,
    `- 피할 패턴: ${primary.guidance.avoidPattern}`,
    `- 취할 패턴: ${primary.guidance.embracePattern}`,
  ];

  if (currentPhase) {
    lines.push(
      `- 현재 단계 신호: ${currentPhase.signal}`,
      `- 단계 주의: ${currentPhase.caution}`,
      `- 단계 성찰: "${currentPhase.reflection}"`,
    );
  }

  if (primary.transitions.from.length || primary.transitions.to.length) {
    lines.push(
      "",
      "### 상황 전이 맥락",
    );
    if (primary.transitions.from.length) {
      lines.push(`- 이전: ${primary.transitions.from.join(", ")}에서 현재 상황으로 이동`);
    }
    if (primary.transitions.to.length) {
      lines.push(`- 이후: ${primary.transitions.to.join(", ")}(으)로 이어질 수 있음`);
    }
    lines.push(`- 점검: "${primary.transitions.transitionQuestion}"`);
  }

  if (primary.scripturalResonance.length) {
    lines.push(
      "",
      "### 성구 선택 시 참고 (직접 인용 금지, AI가 관련 성구 고를 때 맥락으로만 사용)",
    );
    for (const ref of primary.scripturalResonance) {
      lines.push(`- ${ref}`);
    }
  }

  if (secondary) {
    lines.push(
      "",
      `### 보조 상황: "${secondary.label}"`,
      `- 형상: ${secondary.structure.image}`,
      `- 태도: ${secondary.structure.posture}`,
      `- 핵심 질문: "${secondary.guidance.coreQuestion}"`,
    );
  }

  return lines.join("\n");
}
