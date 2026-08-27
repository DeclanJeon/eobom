/**
 * 설계 05§13 Explainability — "왜 이게 나왔지?"에 대한 조용한 답변.
 * 신비화하지 않고, 선택 근거(sourceType)와 경과일만 한국어로 서술한다.
 */
import type { CardSourceType } from "@/lib/select-card";

export type ResurfaceReasonInput = {
  sourceType: CardSourceType;
  elapsedDays?: number;
};

export function buildResurfaceReason(input: ResurfaceReasonInput): string | null {
  if (input.sourceType === "scripture") return null;
  const days = Math.max(0, Math.floor(input.elapsedDays ?? 0));
  const when = days > 0 ? `${days}일 전` : "최근";
  switch (input.sourceType) {
    case "entry":
      return `${when} 남긴 기록을 다시 만나볼 때가 되어 꺼내 왔어요.`;
    case "reaction":
      return `${when} 마음에 남겨두셨던 기록이라 다시 보여드렸어요.`;
    default:
      return null;
  }
}


const CONTEXT_REASON_LABEL: Record<string, string> = {
  WORK_DIRECTION: "일과 방향",
  RELATIONSHIP: "관계",
  EMOTION: "마음",
  FAITH: "믿음",
  FAMILY: "가족",
};

/** 설계 05§6+§13 — 행동 점수 1위 context를 조용한 이유 문구로 변환. */
export function buildTopContextReason(context: string): string | null {
  const label = CONTEXT_REASON_LABEL[context];
  if (!label) return null;
  return `요즘 ${label}에 머무는 순간이 잦아 함께 보여드렸어요.`;
}