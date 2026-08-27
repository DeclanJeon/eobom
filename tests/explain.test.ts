import { describe, expect, test } from "bun:test";
import { buildResurfaceReason } from "../src/lib/continuity/explain";

describe("resurface explainability copy", () => {
  test("explains entry-based resurfacing with elapsed days", () => {
    expect(buildResurfaceReason({ sourceType: "entry", elapsedDays: 12.4 })).toBe(
      "12일 전 남긴 기록을 다시 만나볼 때가 되어 꺼내 왔어요.",
    );
  });

  test("explains reaction-based resurfacing without judgment language", () => {
    const reason = buildResurfaceReason({ sourceType: "reaction", elapsedDays: 3 });
    expect(reason).toContain("마음에 남겨두셨던");
    expect(reason).toMatch(/다시 보여드렸어요\.$/);
    for (const banned of ["실패", "달성", "부족", "위험"]) {
      expect(reason).not.toContain(banned);
    }
  });

  test("returns null for scripture and unknown sources", () => {
    expect(buildResurfaceReason({ sourceType: "scripture" })).toBeNull();
    expect(buildResurfaceReason({ sourceType: "unknown" as never })).toBeNull();
  });

  test("floors fractional days and clamps negatives", () => {
    expect(buildResurfaceReason({ sourceType: "entry", elapsedDays: -5 })).toContain("최근");
    expect(buildResurfaceReason({ sourceType: "entry", elapsedDays: 0.9 })).toContain("최근");
  });
});
