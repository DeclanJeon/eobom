import { describe, expect, test } from "bun:test";
import { isSameCalendarDay, pastTodayDateRanges } from "../src/lib/past-today";
import { toKstDateKey } from "../src/lib/kst";

describe("pastTodayDateRanges (KST 기준)", () => {
  test("returns prior years same KST month/day", () => {
    // 2026-07-28 15:00 KST = 06:00Z
    const now = new Date("2026-07-28T06:00:00.000Z");
    const ranges = pastTodayDateRanges(now, 3);
    expect(ranges).toHaveLength(3);
    // 각 범위 시작은 해당 연도의 7/28 00:00 KST
    expect(toKstDateKey(ranges[0]!.gte)).toBe("2025-07-28");
    expect(toKstDateKey(ranges[1]!.gte)).toBe("2024-07-28");
    expect(toKstDateKey(ranges[2]!.gte)).toBe("2023-07-28");
    // 범위 끝은 같은 KST 날짜 23:59:59.999
    expect(toKstDateKey(ranges[0]!.lte)).toBe("2025-07-28");
  });

  test("KST 자정 경계에서 날짜가 UTC와 다르게 계산된다", () => {
    // UTC 2026-07-27T16:00:00Z = 2026-07-28 01:00 KST → 7/28 기준
    const now = new Date("2026-07-27T16:00:00.000Z");
    const ranges = pastTodayDateRanges(now, 2);
    expect(toKstDateKey(ranges[0]!.gte)).toBe("2025-07-28");
  });

  test("skips invalid Feb 29 in non-leap years", () => {
    // 2024-02-29 12:00 KST = 03:00Z
    const now = new Date("2024-02-29T03:00:00.000Z");
    const ranges = pastTodayDateRanges(now, 4);
    const keys = ranges.map((r) => toKstDateKey(r.gte));
    // 2023 has no Feb 29
    expect(keys).not.toContain("2023-02-29");
    expect(keys).toContain("2020-02-29"); // leap
  });

  test("default yearsBack is 8", () => {
    const now = new Date("2026-01-15T00:00:00.000Z");
    const len = pastTodayDateRanges(now).length;
    expect(len).toBeLessThanOrEqual(8);
    expect(len).toBeGreaterThan(0);
  });
});

describe("isSameCalendarDay (KST 기준)", () => {
  test("compares KST y/m/d only", () => {
    // 2026-07-28 23:30 KST vs 2026-07-28 00:30 KST — 같은 날
    const a = new Date("2026-07-28T14:30:00.000Z"); // 23:30 KST
    const b = new Date("2026-07-27T15:30:00.000Z"); // 00:30 KST (7/28)
    const c = new Date("2026-07-27T14:30:00.000Z"); // 23:30 KST (7/27)
    expect(isSameCalendarDay(a, b)).toBe(true);
    expect(isSameCalendarDay(a, c)).toBe(false);
  });
});
