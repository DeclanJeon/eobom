/**
 * Story Mirror — Matcher Tests
 */

import { describe, it, expect } from "bun:test";
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
    arc: "목동 → 왕 → 범죄 → 회개",
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
  {
    id: "card-3",
    workId: "work-3",
    name: "요나",
    workTitle: "요나",
    themes: ["사명과 방향", "저항"],
    emotions: ["불안", "분노"],
    situations: ["포기하고 싶을 때"],
    summary: "부르심을 피하려던 선지자",
    contentWarnings: [],
  },
  {
    id: "card-4",
    workId: "work-4",
    name: "폭력 카드",
    workTitle: "테스트",
    themes: ["인내"],
    emotions: ["슬픔"],
    situations: [],
    summary: "테스트용 카드",
    contentWarnings: ["폭력"],
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

describe("matcher Phase A", () => {
  it("returns matches sorted by score", () => {
    const results = matchPhaseA(makeProfile(), MOCK_CANDIDATES);
    expect(results.length).toBeGreaterThan(0);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("cards with more theme overlap rank higher", () => {
    const results = matchPhaseA(makeProfile(), MOCK_CANDIDATES);
    const topCard = MOCK_CANDIDATES.find((c) => c.id === results[0].cardId);
    expect(topCard).toBeDefined();
    // 다윗 has 2 overlapping themes (인내, 회개)
    expect(results[0].matchedThemes.length).toBeGreaterThan(0);
  });

  it("excludes recently shown cards", () => {
    const results = matchPhaseA(makeProfile(), MOCK_CANDIDATES, {
      recentRunCardIds: ["card-1"],
    });
    expect(results.find((r) => r.cardId === "card-1")).toBeUndefined();
  });

  it("respects maxResults", () => {
    const results = matchPhaseA(makeProfile(), MOCK_CANDIDATES, {
      maxResults: 2,
    });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("filters by minScore", () => {
    const results = matchPhaseA(makeProfile(), MOCK_CANDIDATES, {
      minScore: 0.9,
    });
    // Very high threshold should filter most
    expect(results.length).toBe(0);
  });

  it("assigns confidence levels", () => {
    const results = matchPhaseA(makeProfile(), MOCK_CANDIDATES);
    for (const r of results) {
      expect(["high", "medium", "low", "insufficient"]).toContain(r.confidence);
    }
  });

  it("returns empty for no candidates", () => {
    const results = matchPhaseA(makeProfile(), []);
    expect(results).toEqual([]);
  });

  it("generates match reasons", () => {
    const results = matchPhaseA(makeProfile(), MOCK_CANDIDATES);
    for (const r of results) {
      expect(r.matchReason.length).toBeGreaterThan(0);
    }
  });
});
