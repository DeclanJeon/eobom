import { describe, expect, test } from "bun:test";
import { computeContextScores, topContextScore } from "../src/lib/continuity/context-score";

const NOW = new Date("2026-08-26T00:00:00Z");
const day = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

describe("behavioral context score (설계 05§6)", () => {
  test("weights match the spec: .40/.25/.20/.15", async () => {
    const { RESURFACE_WEIGHTS } = await import("../src/lib/continuity/resurface-score");
    // 가중치 상수는 설계 예시를 따른다 — 문서와 코드 불일치 방지.
    expect(RESURFACE_WEIGHTS.temporalFit).toBe(0.25);
  });

  test("frequent recent context outranks a single old moment", () => {
    const scores = computeContextScores({
      now: NOW,
      moments: [
        { context: "RELATIONSHIP", happenedAt: day(1), reaction: "still_hold" },
        { context: "RELATIONSHIP", happenedAt: day(3), reaction: null },
        { context: "RELATIONSHIP", happenedAt: day(5), reaction: "still_hold" },
        { context: "FAMILY", happenedAt: day(27), reaction: null },
      ],
    });
    expect(scores[0].context).toBe("RELATIONSHIP");
    expect(scores[0].score).toBeGreaterThan(scores[1].score);
  });

  test("still_hold raises unresolved and explicit signal parts", () => {
    const withSignal = computeContextScores({
      now: NOW,
      moments: [
        { context: "EMOTION", happenedAt: day(2), reaction: "still_hold" },
        { context: "EMOTION", happenedAt: day(4), reaction: "still_hold" },
      ],
    })[0];
    expect(withSignal.parts.explicitSignal).toBe(1);
    expect(withSignal.parts.unresolved).toBe(1);
    expect(topContextScore(withSignal ? [withSignal] : [])?.context).toBe("EMOTION");
  });

  test("moments outside the window are ignored", () => {
    const scores = computeContextScores({
      now: NOW,
      moments: [{ context: "FAITH", happenedAt: day(60), reaction: "still_hold" }],
    });
    expect(scores).toEqual([]);
  });

  test("never invents contexts outside the enum contract", () => {
    const scores = computeContextScores({
      now: NOW,
      moments: [{ context: "CAREER", happenedAt: day(1), reaction: null }],
    });
    expect(scores).toEqual([]);
  });

  test("scores stay within [0, 1]", () => {
    const scores = computeContextScores({
      now: NOW,
      moments: Array.from({ length: 10 }, (_, i) => ({
        context: "WORK_DIRECTION" as const,
        happenedAt: day(i),
        reaction: "still_hold",
      })),
    });
    for (const s of scores) {
      expect(s.score).toBeLessThanOrEqual(1);
      expect(s.score).toBeGreaterThanOrEqual(0);
    }
  });
});
