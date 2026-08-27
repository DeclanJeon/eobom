import { describe, expect, test } from "bun:test";
import {
  COMMUNITY_AGGREGATE_MIN_SAMPLE,
  canPublishCommunityAggregate,
  communityAggregateSuppressedCopy,
} from "../src/lib/privacy/community-aggregate";

describe("community aggregate k-anonymity gate (설계 06§7)", () => {
  test("blocks samples below the minimum", () => {
    expect(COMMUNITY_AGGREGATE_MIN_SAMPLE).toBe(10);
    for (const size of [0, 1, 9]) {
      expect(canPublishCommunityAggregate(size)).toBe(false);
    }
  });

  test("allows the minimum and above", () => {
    for (const size of [10, 11, 500]) {
      expect(canPublishCommunityAggregate(size)).toBe(true);
    }
  });

  test("rejects non-integer sample sizes defensively", () => {
    expect(canPublishCommunityAggregate(9.5)).toBe(false);
    expect(canPublishCommunityAggregate(Number.NaN)).toBe(false);
  });

  test("suppressed copy avoids judgment language", () => {
    const copy = communityAggregateSuppressedCopy();
    for (const banned of ["실패", "부족합니다", "위험", "고쳐야"]) {
      expect(copy).not.toContain(banned);
    }
  });
});
