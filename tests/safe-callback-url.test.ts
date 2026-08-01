import { describe, expect, test } from "bun:test";
import { safeCallbackUrl } from "../src/lib/utils";

describe("safeCallbackUrl (R6 open-redirect 방지)", () => {
  test("내부 경로는 그대로 허용", () => {
    expect(safeCallbackUrl("/today")).toBe("/today");
    expect(safeCallbackUrl("/j/e12")).toBe("/j/e12");
    expect(safeCallbackUrl("/me/settings?tab=ai")).toBe("/me/settings?tab=ai");
  });

  test("외부 URL은 폴백", () => {
    expect(safeCallbackUrl("https://evil.com")).toBe("/today");
    expect(safeCallbackUrl("http://evil.com/x")).toBe("/today");
  });

  test("프로토콜 상대 URL(//)과 백슬래시 우회는 폴백", () => {
    expect(safeCallbackUrl("//evil.com")).toBe("/today");
    expect(safeCallbackUrl("/\\evil.com")).toBe("/today");
    expect(safeCallbackUrl("javascript:alert(1)")).toBe("/today");
  });

  test("null/undefined/빈 값은 폴백", () => {
    expect(safeCallbackUrl(undefined)).toBe("/today");
    expect(safeCallbackUrl(null)).toBe("/today");
    expect(safeCallbackUrl("")).toBe("/today");
  });
});
