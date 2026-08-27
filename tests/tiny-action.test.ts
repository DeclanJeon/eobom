import { describe, expect, test } from "bun:test";
import {
  TINY_ACTION_CATALOG,
  TINY_ACTION_FOLLOWUP_DAYS,
  findTinyAction,
} from "../src/lib/tiny-action";

describe("tiny action catalog (설계 05§11)", () => {
  test("catalog items avoid judgment language", () => {
    for (const item of TINY_ACTION_CATALOG) {
      for (const banned of ["완료", "실패", "성공", "달성", "해결"]) {
        expect(item.label.includes(banned)).toBe(false);
        expect(item.body.includes(banned)).toBe(false);
      }
    }
  });

  test("resolves catalog ids and rejects unknown ones", () => {
    expect(findTinyAction("quiet_walk")?.label).toBe("10분 조용히 걷기");
    expect(findTinyAction("nonexistent")).toBeNull();
  });

  test("follow-up is one week", () => {
    expect(TINY_ACTION_FOLLOWUP_DAYS).toBe(7);
  });
});
