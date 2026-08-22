import { describe, expect, test } from "bun:test";
import { getBookGuide, getChapterGuide } from "../src/lib/bible/guide";
import { getChapterBackground } from "../src/lib/bible/chapter-background";

describe("bible guide corpus parser", () => {
  test("역대하 guide has chapters and characters", () => {
    const g = getBookGuide("2CH");
    expect(g).not.toBeNull();
    if (!g) return;
    expect(g.name).toBe("역대하");
    expect(g.characters.length).toBeGreaterThan(5);
  });

  test("2CH 5 해설 내용은 본문 근거", () => {
    const c = getChapterGuide("2CH", 5);
    expect(c).not.toBeNull();
    if (!c) return;
    expect(c.title).toContain("언약궤");
    expect(c.background.length).toBeGreaterThan(10);
    expect(c.content.length).toBeGreaterThan(10);
  });

  test("chapter background prefers guide content", () => {
    const background = getChapterBackground({ code: "2CH", chapter: 5, locale: "ko" });
    expect(background?.guide?.title).toContain("언약궤");
    expect(background?.overview).toContain("언약궤");
  });

  test("없는 책은 null", () => {
    expect(getBookGuide("ZZZ")).toBeNull();
  });
});
