import { describe, expect, test } from "bun:test";
import { CONTEXT_VERSES, selectContextCopy } from "../src/lib/context-verses";
import type { ContextCode } from "../src/lib/context-verses";

const CONTEXTS = Object.keys(CONTEXT_VERSES) as ContextCode[];

describe("context personalization (설계 05§5)", () => {
  test("every context has a curated verse pool", () => {
    for (const context of CONTEXTS) {
      expect(CONTEXT_VERSES[context].length).toBeGreaterThanOrEqual(3);
      for (const option of CONTEXT_VERSES[context]) {
        expect(option.verse.length).toBeGreaterThan(5);
        expect(option.ref).toMatch(/:/);
        for (const banned of ["실패", "부족", "위험", "고쳐야", "반드시 ~하신다"]) {
          expect(option.title.includes(banned)).toBe(false);
        }
      }
    }
  });

  test("same dateKey + context is deterministic (C2)", () => {
    const a = selectContextCopy("EMOTION", "2026-08-26");
    const b = selectContextCopy("EMOTION", "2026-08-26");
    expect(a).toEqual(b);
  });

  test("rotates across days rather than repeating a single verse", () => {
    const picks = new Set<string>();
    for (let day = 1; day <= 30; day += 1) {
      const picked = selectContextCopy("RELATIONSHIP", `2026-09-${String(day).padStart(2, "0")}`);
      if (picked) picks.add(picked.ref);
    }
    // 5개 후보 중 최소 3개는 30일 안에 등장해야 '회전'이라 할 수 있다.
    expect(picks.size).toBeGreaterThanOrEqual(3);
  });

  test("returns null without a chosen context", () => {
    expect(selectContextCopy(null, "2026-08-26")).toBeNull();
  });
});
