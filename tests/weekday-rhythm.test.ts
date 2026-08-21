import { describe, expect, test, beforeEach } from "bun:test";
import {
  weekdayContentKey,
  selectPrompt,
  resetPromptPoolForTests,
  type WeekdayContentKey,
} from "../src/lib/weekday-rhythm";

// KST 기준 요일 고정 헬퍼 — 2026-08-17(월) ~ 2026-08-23(일)
// 2026-08-17은 월요일 (KST). UTC 03:00 = KST 12:00.
function kstDay(dateKey: string): Date {
  return new Date(`${dateKey}T03:00:00.000Z`);
}

describe("weekdayContentKey (G012)", () => {
  test("월~주일 7종 매핑 (KST)", () => {
    const cases: Array<[string, WeekdayContentKey]> = [
      ["2026-08-17", "scripture"], // 월
      ["2026-08-18", "prompt"], // 화
      ["2026-08-19", "last_week"], // 수
      ["2026-08-20", "action"], // 목
      ["2026-08-21", "time_capsule"], // 금
      ["2026-08-22", "review"], // 토
      ["2026-08-23", "gratitude"], // 주일
    ];
    for (const [day, expected] of cases) {
      expect(weekdayContentKey(kstDay(day))).toBe(expected);
    }
  });

  test("KST 자정 경계에서 요일이 UTC와 다르게 계산된다", () => {
    // UTC 2026-08-16T16:00:00Z = 2026-08-17 01:00 KST = 월요일 → scripture
    const d = new Date("2026-08-16T16:00:00.000Z");
    expect(weekdayContentKey(d)).toBe("scripture");
  });
});

describe("selectPrompt (G012)", () => {
  beforeEach(() => {
    resetPromptPoolForTests();
  });

  test("KST dateKey 시드로 결정적 질문", async () => {
    const a1 = await selectPrompt("2026-08-18");
    const a2 = await selectPrompt("2026-08-18");
    expect(a1).toBe(a2);
    expect(a1.length).toBeGreaterThan(5);
    expect(a1.endsWith("?")).toBe(true);
  });

  test("다른 날짜는 다른 질문일 수 있다 (풀 크기 > 1)", async () => {
    const seen = new Set<string>();
    for (let i = 1; i <= 20; i += 1) {
      seen.add(await selectPrompt(`2026-08-${String(i).padStart(2, "0")}`));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
