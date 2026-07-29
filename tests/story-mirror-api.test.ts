/**
 * Story Mirror — API Tests
 */

import { describe, it, expect } from "bun:test";
import { buildNarrativeBridge } from "../src/lib/story-mirror/narrative-bridge";
import { scanEntrySafety, filterForbiddenExpressions, shouldExcludeFromMatching } from "../src/lib/story-mirror/safety";
import { matchPhaseA, type StoryCandidate } from "../src/lib/story-mirror/matcher";
import type { UserProfile } from "../src/lib/story-mirror/user-profile";

const MOCK_CANDIDATES: StoryCandidate[] = [
  {
    id: "card-1",
    workId: "work-1",
    name: "다윗",
    workTitle: "시편",
    themes: ["회개", "겸손", "인내"],
    emotions: ["슬픔", "감사", "후회"],
    situations: ["실패 후", "기도의 시간"],
    summary: "범죄 후 회개한 왕",
    contentWarnings: [],
  },
  {
    id: "card-2",
    workId: "work-2",
    name: "루스",
    workTitle: "루스기",
    themes: ["기다림", "인내", "동행"],
    emotions: ["그리움", "희망"],
    situations: ["이별 앞에서", "혼자인 시간"],
    summary: "고국을 떠나 인내한 여인",
    contentWarnings: [],
  },
];

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    topThemes: ["인내", "회개", "신뢰와 의심"],
    topEmotions: ["슬픔", "감사", "불안"],
    themeFrequency: {},
    emotionFrequency: {},
    scriptureRefs: ["시편 51편"],
    entryCount: 5,
    dateSpan: { earliest: "2026-07-01", latest: "2026-07-28" },
    ...overrides,
  };
}

describe("narrative-bridge", () => {
  it("generates bridge with themes and emotions", () => {
    const result = buildNarrativeBridge("다윗", "시편", ["회개"], ["슬픔"], [], 5);
    expect(result).toContain("회개");
    expect(result).toContain("슬픔");
    expect(result).toContain("다윗");
  });

  it("adds qualifier for single entry", () => {
    const result = buildNarrativeBridge("루스", "루스기", ["인내"], ["희망"], [], 1);
    expect(result).toContain("단일 기록");
  });

  it("no qualifier for multiple entries", () => {
    const result = buildNarrativeBridge("루스", "루스기", ["인내"], ["희망"], [], 5);
    expect(result).not.toContain("단일 기록");
  });
});

describe("safety", () => {
  it("detects crisis keywords", () => {
    const result = scanEntrySafety("죽고 싶어서 글을 씁니다");
    expect(result.hasCrisis).toBe(true);
    expect(result.findings.some((f) => f.startsWith("crisis:"))).toBe(true);
  });

  it("detects PII", () => {
    const result = scanEntrySafety("제 번호는 010-1234-5678입니다");
    expect(result.hasPII).toBe(true);
  });

  it("clean text passes", () => {
    const result = scanEntrySafety("오늘 인내에 대해 묵상했습니다");
    expect(result.hasCrisis).toBe(false);
    expect(result.hasPII).toBe(false);
  });

  it("filters forbidden expressions", () => {
    const { filtered, hadForbidden } = filterForbiddenExpressions("하나님은 당신에게 이 길을 원하십니다");
    expect(hadForbidden).toBe(true);
    expect(filtered).not.toContain("원하");
  });

  it("clean text passes filter", () => {
    const { filtered, hadForbidden } = filterForbiddenExpressions("최근 기록에서 인내가 반복됩니다");
    expect(hadForbidden).toBe(false);
    expect(filtered).toBe("최근 기록에서 인내가 반복됩니다");
  });

  it("excludes crisis entries from matching", () => {
    expect(shouldExcludeFromMatching("죽고 싶다")).toBe(true);
    expect(shouldExcludeFromMatching("오늘 묵상")).toBe(false);
  });
});

describe("matcher Phase A", () => {
  it("returns matches sorted by score", () => {
    const results = matchPhaseA(makeProfile(), MOCK_CANDIDATES);
    expect(results.length).toBeGreaterThan(0);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("excludes recently shown cards", () => {
    const results = matchPhaseA(makeProfile(), MOCK_CANDIDATES, {
      recentRunCardIds: ["card-1"],
    });
    expect(results.find((r) => r.cardId === "card-1")).toBeUndefined();
  });

  it("respects maxResults", () => {
    const results = matchPhaseA(makeProfile(), MOCK_CANDIDATES, { maxResults: 1 });
    expect(results.length).toBeLessThanOrEqual(1);
  });

  it("generates match reasons", () => {
    const results = matchPhaseA(makeProfile(), MOCK_CANDIDATES);
    for (const r of results) {
      expect(r.matchReason.length).toBeGreaterThan(0);
    }
  });
});
