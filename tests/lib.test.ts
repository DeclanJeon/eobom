import { describe, expect, test } from "bun:test";
import { excerpt, parseJsonArray, toJsonArray, formatDateShort } from "../src/lib/utils";
import { validateEntryInput } from "../src/lib/entries";
import { DISCLAIMER } from "../src/lib/mimo";

describe("utils", () => {
  test("parse and serialize json arrays", () => {
    expect(parseJsonArray('["a","b"]')).toEqual(["a", "b"]);
    expect(parseJsonArray("not-json")).toEqual([]);
    expect(toJsonArray(["x", "y"])).toBe('["x","y"]');
  });

  test("excerpt trims long text", () => {
    const text = "가".repeat(200);
    expect(excerpt(text, 20).endsWith("…")).toBe(true);
  });

  test("formatDateShort returns korean style date", () => {
    const value = formatDateShort(new Date("2026-07-26T00:00:00.000Z"));
    expect(value.includes("2026")).toBe(true);
  });
});

describe("entry validation", () => {
  test("requires body and title or scripture", () => {
    expect(validateEntryInput({ reflectionBody: "" })).toBeTruthy();
    expect(
      validateEntryInput({ reflectionBody: "본문", title: "" , scriptureRefs: [] }),
    ).toBeTruthy();
    expect(
      validateEntryInput({ reflectionBody: "본문", scriptureRefs: ["요 3:16"] }),
    ).toBeNull();
  });
});

describe("mimo safety", () => {
  test("disclaimer is present", () => {
    expect(DISCLAIMER.includes("하나님의 뜻")).toBe(true);
  });
});
