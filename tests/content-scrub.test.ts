import { describe, expect, test } from "bun:test";
import {
  deepScrubMirror,
  scrubMirrorText,
} from "../src/lib/content-scrub";

describe("scrubMirrorText", () => {
  test("scrubs base judgment phrases", () => {
    const out = scrubMirrorText("하나님이 원하시는 것이 이것입니다.");
    expect(out).toContain("기록에서 관찰되는 흐름");
    expect(out).not.toMatch(/원하시는/);
  });

  test("scripture extras only when opted in", () => {
    const raw = "이것이 추천 성구이며 이 말씀이 답입니다.";
    expect(scrubMirrorText(raw)).toContain("추천");
    const withExtra = scrubMirrorText(raw, {
      includeScriptureExtras: true,
      collapseWhitespace: true,
    });
    expect(withExtra).not.toMatch(/추천\s*성구/);
    expect(withExtra).not.toMatch(/이\s*말씀이\s*답/);
  });
});

describe("deepScrubMirror", () => {
  test("walks nested objects", () => {
    const out = deepScrubMirror({
      a: "믿음이 부족합니다",
      b: [{ c: "당신은 죄 가운데" }],
    });
    expect(out.a).toContain("기록에서 관찰되는 흐름");
    expect(out.b[0]?.c).toContain("기록에서 관찰되는 흐름");
  });
});
