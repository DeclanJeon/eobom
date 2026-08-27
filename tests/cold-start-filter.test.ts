import { describe, expect, test } from "bun:test";
import { isExcludedColdStartVerse, refTouchesExcludedVerse } from "../src/lib/cold-start-filter";
import { selectGlobalScripture } from "../src/lib/daily-scripture";

describe("cold start verse-level filter (설계 05§4)", () => {
  test("marks known misreadable verses", () => {
    expect(isExcludedColdStartVerse("MAT", 7, 1)).toBe(true);
    expect(isExcludedColdStartVerse("PSA", 137, 9)).toBe(true);
    expect(isExcludedColdStartVerse("REV", 21, 8)).toBe(true);
  });

  test("allows ordinary verses", () => {
    expect(isExcludedColdStartVerse("PSA", 23, 1)).toBe(false);
    expect(isExcludedColdStartVerse("GEN", 1, 1)).toBe(false);
  });

  test("range touching an excluded verse is rejected", () => {
    expect(refTouchesExcludedVerse({ code: "MAT", chapter: 7, startVerse: 1, endVerse: 3 })).toBe(true);
    expect(refTouchesExcludedVerse({ code: "MAT", chapter: 7, startVerse: 7, endVerse: 9 })).toBe(false);
  });

  test("global daily scripture never lands on an excluded verse (deterministic sweep)", () => {
    // 서로 다른 날짜 시드 400개 스윕 — 필터 통과 범위만 반환되는지 확인.
    for (let d = 0; d < 400; d += 1) {
      const date = new Date(Date.UTC(2025, 0, 1 + d));
      const result = selectGlobalScripture(date);
      const touches = refTouchesExcludedVerse(result.ref);
      expect(touches).toBe(false);
      if (touches) break;
    }
  });
});
