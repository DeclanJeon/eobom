/**
 * Story Mirror — Vocabulary Tests
 */

import { describe, it, expect } from "bun:test";
import {
  isValidTheme,
  isValidEmotion,
  isValidSituation,
  parseAndFilterThemes,
  jaccardSimilarity,
  intersectionCount,
} from "../src/lib/story-mirror/vocab";

describe("vocab", () => {
  describe("isValidTheme", () => {
    it("valid themes pass", () => {
      expect(isValidTheme("인내")).toBe(true);
      expect(isValidTheme("용기와 두려움")).toBe(true);
    });

    it("invalid themes fail", () => {
      expect(isValidTheme("존재하지 않는 주제")).toBe(false);
      expect(isValidTheme("")).toBe(false);
    });
  });

  describe("isValidEmotion", () => {
    it("valid emotions pass", () => {
      expect(isValidEmotion("기쁨")).toBe(true);
      expect(isValidEmotion("슬픔")).toBe(true);
    });

    it("invalid emotions fail", () => {
      expect(isValidEmotion("행복")).toBe(false);
    });
  });

  describe("isValidSituation", () => {
    it("valid situations pass", () => {
      expect(isValidSituation("이별 앞에서")).toBe(true);
      expect(isValidSituation("기도의 시간")).toBe(true);
    });
  });

  describe("parseAndFilterThemes", () => {
    it("filters valid themes from JSON array", () => {
      const result = parseAndFilterThemes(JSON.stringify(["인내", "invalid", "용기와 두려움"]));
      expect(result).toEqual(["인내", "용기와 두려움"]);
    });

    it("returns empty for invalid JSON", () => {
      expect(parseAndFilterThemes("not json")).toEqual([]);
    });

    it("returns empty for null", () => {
      expect(parseAndFilterThemes("")).toEqual([]);
    });
  });

  describe("jaccardSimilarity", () => {
    it("identical sets return 1", () => {
      expect(jaccardSimilarity(["a", "b"], ["a", "b"])).toBe(1);
    });

    it("disjoint sets return 0", () => {
      expect(jaccardSimilarity(["a"], ["b"])).toBe(0);
    });

    it("partial overlap", () => {
      const result = jaccardSimilarity(["a", "b", "c"], ["b", "c", "d"]);
      expect(result).toBeCloseTo(0.5);
    });

    it("empty sets return 0", () => {
      expect(jaccardSimilarity([], [])).toBe(0);
    });
  });

  describe("intersectionCount", () => {
    it("counts overlaps", () => {
      expect(intersectionCount(["a", "b", "c"], ["b", "c", "d"])).toBe(2);
    });

    it("case insensitive", () => {
      expect(intersectionCount(["A"], ["a"])).toBe(1);
    });
  });
});
