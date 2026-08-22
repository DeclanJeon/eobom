import { describe, expect, test } from "bun:test";
import { excerpt, parseJsonArray, toJsonArray, formatDateShort } from "../src/lib/utils";
import { validateEntryInput } from "../src/lib/entries";
import { DISCLAIMER, getLlmTimeoutMs } from "../src/lib/mimo";

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

describe("mimo timeout configuration", () => {
  test("uses the longer MiMo default and keeps DeepSeek fallback responsive", () => {
    const previousMimo = process.env.MIMO_TIMEOUT_MS;
    const previousDeepSeek = process.env.DEEPSEEK_TIMEOUT_MS;
    delete process.env.MIMO_TIMEOUT_MS;
    delete process.env.DEEPSEEK_TIMEOUT_MS;
    try {
      expect(getLlmTimeoutMs("mimo")).toBe(120_000);
      expect(getLlmTimeoutMs("deepseek")).toBe(30_000);
    } finally {
      if (previousMimo === undefined) delete process.env.MIMO_TIMEOUT_MS;
      else process.env.MIMO_TIMEOUT_MS = previousMimo;
      if (previousDeepSeek === undefined) delete process.env.DEEPSEEK_TIMEOUT_MS;
      else process.env.DEEPSEEK_TIMEOUT_MS = previousDeepSeek;
    }
  });

  test("accepts bounded provider-specific overrides", () => {
    const previousMimo = process.env.MIMO_TIMEOUT_MS;
    const previousDeepSeek = process.env.DEEPSEEK_TIMEOUT_MS;
    process.env.MIMO_TIMEOUT_MS = "120000";
    process.env.DEEPSEEK_TIMEOUT_MS = "60000";
    try {
      expect(getLlmTimeoutMs("mimo")).toBe(120_000);
      expect(getLlmTimeoutMs("deepseek")).toBe(60_000);
      process.env.MIMO_TIMEOUT_MS = "180000";
      process.env.DEEPSEEK_TIMEOUT_MS = "90000";
      expect(getLlmTimeoutMs("mimo")).toBe(120_000);
      expect(getLlmTimeoutMs("deepseek")).toBe(30_000);
    } finally {
      if (previousMimo === undefined) delete process.env.MIMO_TIMEOUT_MS;
      else process.env.MIMO_TIMEOUT_MS = previousMimo;
      if (previousDeepSeek === undefined) delete process.env.DEEPSEEK_TIMEOUT_MS;
      else process.env.DEEPSEEK_TIMEOUT_MS = previousDeepSeek;
    }
  });
});

describe("reread copy contract", () => {
  test("fixed UI labels avoid prescription wording", () => {
    const labels = [
      "다시 머물 본문",
      "다시 머물 수 있는 본문",
      "최근에 머문 본문",
    ];
    for (const label of labels) {
      expect(label).not.toMatch(/추천\s*성구|오늘의\s*성구|지금\s*필요한/);
    }
  });
});
