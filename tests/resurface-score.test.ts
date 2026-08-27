import { describe, expect, test } from "bun:test";
import { computeResurfaceScore } from "../src/lib/continuity/resurface-score";
import type { CardCandidate } from "../src/lib/select-card";

const NOW = new Date("2026-08-26T00:00:00Z");
function candidate(daysAgo: number, extra: Partial<CardCandidate> = {}): CardCandidate {
  return {
    sourceType: "entry",
    sourceId: "e1",
    entryId: "e1",
    entryDate: new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000),
    display: "지난 기록",
    excerpt: "의미 있는 본문 일부가 충분히 길 때",
    ...extra,
  };
}

describe("resurfacing weighted score (설계 05§7)", () => {
  test("anchor-adjacent candidates outrank far-from-anchor ones", () => {
    const near14 = computeResurfaceScore({ candidate: candidate(13), now: NOW });
    const near14b = computeResurfaceScore({ candidate: candidate(15), now: NOW });
    const offAnchor = computeResurfaceScore({ candidate: candidate(45), now: NOW });
    expect(near14).toBeGreaterThan(offAnchor);
    expect(near14b).toBeGreaterThan(offAnchor);
  });

  test("still_hold adds explicit emotional weight", () => {
    const plain = computeResurfaceScore({ candidate: candidate(14), now: NOW });
    const held = computeResurfaceScore({ candidate: candidate(14), stillHold: true, now: NOW });
    expect(held).toBeGreaterThan(plain);
  });

  test("open action adds action relevance", () => {
    const plain = computeResurfaceScore({ candidate: candidate(7), now: NOW });
    const withAction = computeResurfaceScore({ candidate: candidate(7), hasOpenAction: true, now: NOW });
    expect(withAction).toBeGreaterThan(plain);
  });

  test("low-information excerpt is penalised", () => {
    const rich = computeResurfaceScore({ candidate: candidate(3), now: NOW });
    const poor = computeResurfaceScore({
      candidate: candidate(3, { excerpt: "짧다" }),
      now: NOW,
    });
    expect(rich).toBeGreaterThan(poor);
  });

  test("anniversary flag boosts", () => {
    const base = computeResurfaceScore({ candidate: candidate(30), anniversary: true, now: NOW });
    const without = computeResurfaceScore({ candidate: candidate(30), now: NOW });
    expect(base).toBeGreaterThan(without);
  });
});
