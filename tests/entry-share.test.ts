import { describe, expect, test } from "bun:test";
import {
  buildPublicBodyFromEntry,
  normalizeShareVisibility,
} from "../src/lib/entry-share";

describe("entry share visibility", () => {
  test("defaults unknown values to private (06§2 private-by-default)", () => {
    expect(normalizeShareVisibility(undefined)).toBe("private");
    expect(normalizeShareVisibility(null)).toBe("private");
    expect(normalizeShareVisibility("nope")).toBe("private");
    expect(normalizeShareVisibility("private")).toBe("private");
    expect(normalizeShareVisibility("public")).toBe("public");
  });

  test("builds anonymous share body from markdown reflection", () => {
    const body = buildPublicBodyFromEntry({
      title: "짧은 제목",
      reflectionBody:
        "# 제목\n\n오늘 **말씀** 앞에서 마음에 평안이 찾아왔습니다. 작은 결단을 남깁니다.",
    });
    expect(body.includes("#")).toBe(false);
    expect(body.includes("**")).toBe(false);
    expect(body.length).toBeGreaterThanOrEqual(20);
    expect(body).toContain("평안");
  });

  test("falls back to title when body is too short", () => {
    const body = buildPublicBodyFromEntry({
      title: "오늘 마음에 남은 한 문장을 오래 붙잡습니다",
      reflectionBody: "짧음",
    });
    expect(body.length).toBeGreaterThanOrEqual(20);
    expect(body).toContain("오늘 마음에 남은");
  });
});
