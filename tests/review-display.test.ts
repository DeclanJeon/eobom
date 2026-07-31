import { describe, it, expect } from "bun:test";
import {
  normalizeReviewForDisplay,
  meaningfulObservation,
  reportTypeLabel,
  reviewLimitationsText,
  toSimpleReviewView,
} from "@/lib/review-display";
import type { StructuredReview } from "@/lib/mimo";

function baseReview(overrides: Partial<StructuredReview> = {}): StructuredReview {
  return {
    oneSentence: "한 문장 요약",
    themes: [],
    emotions: [],
    questions: [],
    storyConnections: [],
    scriptureConnections: [],
    scriptureReadings: [],
    actionFlow: [],
    changesOrUnknown: "달라진 점",
    rereadEntries: [],
    rereadScriptures: [],
    nextSteps: [],
    prayerPrompts: [],
    smallPractices: [],
    communityQuestions: [],
    limitations: "",
    disclaimer: "고정 문구",
    ...overrides,
  };
}

describe("meaningfulObservation", () => {
  it("빈 title/body는 false", () => {
    expect(meaningfulObservation({ key: "k", title: "", body: "", confidence: "low", evidence: [] })).toBe(false);
    expect(meaningfulObservation({ key: "k", title: " ", body: "", confidence: "low", evidence: [] })).toBe(false);
  });
  it("title이나 body가 있으면 true", () => {
    expect(meaningfulObservation({ key: "k", title: "주제", body: "", confidence: "high", evidence: [] })).toBe(true);
    expect(meaningfulObservation({ key: "k", title: "", body: "내용", confidence: "medium", evidence: [] })).toBe(true);
  });
});

describe("normalizeReviewForDisplay", () => {
  it("빈 title/body 관찰을 제외한다", () => {
    const review = baseReview({
      themes: [
        { key: "t1", title: "신앙 공동체", body: "반복됨", confidence: "high", evidence: [] },
        { key: "t2", title: "", body: "", confidence: "low", evidence: [] },
      ],
    });
    const got = normalizeReviewForDisplay(review);
    expect(got.themes).toHaveLength(1);
    expect(got.themes[0].key).toBe("t1");
  });

  it("설명 없는 이야기 연결은 빈 카드로 만들지 않는다", () => {
    const review = baseReview({
      storyConnections: [
        { story: "이야기만 있는 항목", source: "성경", connection: "" },
        { story: "설명 있는 항목", source: "성경", connection: "연결 이유" },
      ],
    });
    const got = normalizeReviewForDisplay(review);
    expect(got.storyConnections).toHaveLength(1);
    expect(got.storyConnections[0].story).toBe("설명 있는 항목");
  });

  it("confidence enum을 한국어 라벨로 변환한다", () => {
    const review = baseReview({
      emotions: [{ key: "e1", title: "감사", body: "함께 나타남", confidence: "high", evidence: [] }],
    });
    const got = normalizeReviewForDisplay(review);
    expect(got.emotions[0].confidenceLabel).toBe("여러 기록에서 보임");
  });

  it("배열 상한을 적용한다", () => {
    const review = baseReview({
      nextSteps: Array.from({ length: 5 }, (_, i) => ({ action: `행동${i}`, reason: "" })),
      prayerPrompts: Array.from({ length: 5 }, (_, i) => ({ topic: `주제${i}`, suggestion: "" })),
      storyConnections: Array.from({ length: 10 }, (_, i) => ({ story: `이야기${i}`, source: "성경", connection: "연결" })),
    });
    const got = normalizeReviewForDisplay(review);
    expect(got.nextSteps).toHaveLength(2);
    expect(got.prayerPrompts).toHaveLength(2);
    expect(got.storyConnections).toHaveLength(3);
  });

  it("provider/model 정보를 노출하지 않는다", () => {
    const got = normalizeReviewForDisplay(baseReview());
    // DisplayReview에는 provider/model 필드가 존재하지 않음
    expect("modelProvider" in got).toBe(false);
    expect("modelName" in got).toBe(false);
  });

  it("oneSentence가 비어 있으면 null로 정규화한다", () => {
    const got = normalizeReviewForDisplay(baseReview({ oneSentence: "  " }));
    expect(got.oneSentence).toBeNull();
  });
});

describe("reportTypeLabel", () => {
  it("internal enum을 한국어로 매핑한다", () => {
    expect(reportTypeLabel("cumulative")).toBe("기간 회고");
    expect(reportTypeLabel("monthly")).toBe("월간 회고");
    expect(reportTypeLabel("WEEKLY")).toBe("주간 회고");
  });
  it("알 수 없는 값은 그대로 반환한다", () => {
    expect(reportTypeLabel("custom")).toBe("custom");
    expect(reportTypeLabel(null)).toBe("회고");
  });
});

describe("reviewLimitationsText", () => {
  it("limitations가 비어 있으면 disclaimer를 사용한다", () => {
    const got = normalizeReviewForDisplay(baseReview({ limitations: "", disclaimer: "고정 문구" }));
    expect(reviewLimitationsText(got)).toBe("고정 문구");
  });
  it("limitations가 있으면 그것을 우선한다", () => {
    const got = normalizeReviewForDisplay(baseReview({ limitations: "한계 문구", disclaimer: "고정 문구" }));
    expect(reviewLimitationsText(got)).toBe("한계 문구");
  });
});

describe("toSimpleReviewView", () => {
  it("folds themes/emotions/questions into one summary prose", () => {
    const display = normalizeReviewForDisplay(
      baseReview({
        oneSentence: "기다림 가운데 머문 한 달",
        themes: [
          {
            key: "t1",
            title: "기다림",
            body: "응답을 기다리는 기록이 반복됨",
            confidence: "high",
            evidence: [],
          },
        ],
        emotions: [
          {
            key: "e1",
            title: "불안",
            body: "앞이 보이지 않을 때의 긴장",
            confidence: "medium",
            evidence: [],
          },
        ],
        questions: [
          {
            key: "q1",
            title: "언제까지 기다려야 하나",
            body: "",
            confidence: "medium",
            evidence: [],
          },
        ],
      }),
    );
    const simple = toSimpleReviewView(display);
    expect(simple.headline).toBe("기다림 가운데 머문 한 달");
    expect(simple.summary).toContain("기다림");
    expect(simple.summary).toContain("불안");
    expect(simple.summary).toContain("언제까지 기다려야 하나");
  });

  it("keeps at most three stories and scriptures", () => {
    const display = normalizeReviewForDisplay(
      baseReview({
        storyConnections: Array.from({ length: 5 }, (_, i) => ({
          story: `이야기${i}`,
          source: "성경",
          connection: `연결 ${i}`,
          differentPerspective: `한 줄 ${i}`,
        })),
        scriptureReadings: Array.from({ length: 5 }, (_, i) => ({
          ref: `시편 ${i + 1}편`,
          reason: `이유 ${i}`,
          focus: "",
        })),
      }),
    );
    const simple = toSimpleReviewView(display);
    expect(simple.stories).toHaveLength(3);
    expect(simple.scriptures).toHaveLength(3);
    expect(simple.stories[0].line).toContain("한 줄");
  });

  it("suggests companions even without explicit people fields", () => {
    const display = normalizeReviewForDisplay(
      baseReview({
        themes: [
          {
            key: "t1",
            title: "외로움",
            body: "혼자 버티는 기록",
            confidence: "high",
            evidence: [],
          },
        ],
      }),
    );
    const simple = toSimpleReviewView(display);
    expect(simple.companions.length).toBeGreaterThan(0);
    expect(simple.companions[0].role.length).toBeGreaterThan(0);
  });

  it("prefers people-oriented next steps for companions", () => {
    const display = normalizeReviewForDisplay(
      baseReview({
        nextSteps: [
          { action: "혼자 운동하기", reason: "체력" },
          {
            action: "멘토와 대화하기",
            reason: "이 시기의 질문을 함께 나누기",
          },
        ],
      }),
    );
    const simple = toSimpleReviewView(display);
    expect(simple.companions.some((c) => c.role.includes("멘토"))).toBe(true);
    expect(simple.companions.some((c) => c.role.includes("운동"))).toBe(false);
  });
});
