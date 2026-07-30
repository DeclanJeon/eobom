import type { StructuredReview, ReviewObservation } from "@/lib/mimo";

export const CONFIDENCE_LABEL: Record<string, string> = {
  high: "여러 기록에서 보임",
  medium: "자주 보임",
  low: "한 기록에서 보임",
};


export function meaningfulObservation(item: ReviewObservation): boolean {
  return Boolean(item?.title?.trim() || item?.body?.trim());
}

const CAPS = {
  themes: 5,
  emotions: 5,
  questions: 5,
  scriptureConnections: 5,
  actionFlow: 5,
  storyConnections: 3,
  scriptureReadings: 3,
  nextSteps: 2,
  prayerPrompts: 2,
  smallPractices: 3,
} as const;

export type DisplayObservation = {
  key: string;
  title: string;
  body: string;
  confidenceLabel: string | null;
  evidence: Array<{ entryId: string; date?: string; excerpt: string }>;
};

export type DisplayReview = {
  oneSentence: string | null;
  themes: DisplayObservation[];
  emotions: DisplayObservation[];
  questions: DisplayObservation[];
  scriptureConnections: DisplayObservation[];
  storyConnections: StructuredReview["storyConnections"];
  scriptureReadings: StructuredReview["scriptureReadings"];
  actionFlow: DisplayObservation[];
  changesOrUnknown: string | null;
  rereadEntries: StructuredReview["rereadEntries"];
  nextSteps: StructuredReview["nextSteps"];
  prayerPrompts: StructuredReview["prayerPrompts"];
  smallPractices: string[];
  limitations: string | null;
  disclaimer: string | null;
};

function mapObservation(item: ReviewObservation): DisplayObservation {
  return {
    key: item.key,
    title: item.title?.trim() ?? "",
    body: item.body?.trim() ?? "",
    confidenceLabel: item.confidence ? CONFIDENCE_LABEL[item.confidence] ?? null : null,
    evidence: (item.evidence ?? []).map((e) => ({
      entryId: e.entryId,
      date: e.date,
      excerpt: e.excerpt,
    })),
  };
}

function capAndFilter<T>(
  items: T[] | undefined,
  keep: (item: T) => boolean,
  max: number,
): T[] {
  return (items ?? []).filter(keep).slice(0, max);
}

const DEFAULT_LIMITATIONS =
  "이 문서는 사용자가 남긴 기록을 정리한 성찰 자료입니다. 하나님의 뜻이나 신앙 상태를 판정하지 않으며, 기도와 말씀 읽기, 공동체의 분별을 대신하지 않습니다.";

/**
 * 회고 데이터를 화면 표시용으로 정규화한다.
 * - 내부 enum/blank 필드 제거
 * - 빈 title/body 관찰 제외
 * - 배열 상한 적용
 * - provider/model 정보는 노출하지 않음
 */
export function normalizeReviewForDisplay(review: StructuredReview): DisplayReview {
  return {
    oneSentence: review.oneSentence?.trim() || null,
    themes: capAndFilter(review.themes, meaningfulObservation, CAPS.themes).map(
      mapObservation,
    ),
    emotions: capAndFilter(review.emotions, meaningfulObservation, CAPS.emotions).map(
      mapObservation,
    ),
    questions: capAndFilter(review.questions, meaningfulObservation, CAPS.questions).map(
      mapObservation,
    ),
    scriptureConnections: capAndFilter(
      review.scriptureConnections,
      meaningfulObservation,
      CAPS.scriptureConnections,
    ).map(mapObservation),
    storyConnections: capAndFilter(
      review.storyConnections,
      (s) => Boolean(s?.story?.trim() && s?.connection?.trim()),
      CAPS.storyConnections,
    ),
    scriptureReadings: capAndFilter(
      review.scriptureReadings,
      (s) => Boolean(s?.ref?.trim()),
      CAPS.scriptureReadings,
    ),
    actionFlow: capAndFilter(review.actionFlow, meaningfulObservation, CAPS.actionFlow).map(
      mapObservation,
    ),
    changesOrUnknown: review.changesOrUnknown?.trim() || null,
    rereadEntries: (review.rereadEntries ?? [])
      .filter((r) => r?.entryId)
      .slice(0, 5),
    nextSteps: (review.nextSteps ?? [])
      .filter((n) => n?.action?.trim())
      .slice(0, CAPS.nextSteps),
    prayerPrompts: (review.prayerPrompts ?? [])
      .filter((p) => p?.topic?.trim())
      .slice(0, CAPS.prayerPrompts),
    smallPractices: (review.smallPractices ?? [])
      .filter((s) => s?.trim())
      .slice(0, CAPS.smallPractices),
    limitations: review.limitations?.trim() || null,
    disclaimer: review.disclaimer?.trim() || null,
  };
}

/**
 * 기본 한계 문구를 보장한다. limitations가 비어 있으면 제품 고정 문구 사용.
 */
export function reviewLimitationsText(display: DisplayReview): string {
  return display.limitations || display.disclaimer || DEFAULT_LIMITATIONS;
}

const REPORT_TYPE_LABEL: Record<string, string> = {
  cumulative: "기간 회고",
  monthly: "월간 회고",
  weekly: "주간 회고",
  daily: "일간 회고",
  single: "단일 회고",
};

export function reportTypeLabel(type?: string | null): string {
  if (!type) return "회고";
  const key = type.trim().toLowerCase();
  return REPORT_TYPE_LABEL[key] ?? type.trim();
}
