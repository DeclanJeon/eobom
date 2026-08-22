import { describe, expect, test } from "bun:test";
import { getBookGuide, getChapterGuide } from "../src/lib/bible/guide";
import { getChapterBackground } from "../src/lib/bible/chapter-background";
import { getPublicCommentaryExcerpt } from "../src/lib/bible/public-commentary";

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

  test("2CH 5 external public-domain commentary is available", () => {
    const commentary = getPublicCommentaryExcerpt("2CH", 5);
    expect(commentary?.source).toBe("matthew-henry");
    expect(commentary?.license).toBe("Public Domain");
    expect(commentary?.text.length).toBeGreaterThan(100);
  });


  test("all 66 guide books have non-empty chapter explanations", () => {
    const fs = require("node:fs");
    const books = JSON.parse(fs.readFileSync("data/bible/ko/metadata.json", "utf8")).books as Array<{ code: string }>;
    let chapters = 0;
    for (const book of books) {
      const guide = getBookGuide(book.code);
      expect(guide).not.toBeNull();
      if (!guide) continue;
      expect(guide.characters.length).toBeGreaterThan(0);
      for (const chapter of guide.chapters) {
        chapters += 1;
        expect(chapter.title.length).toBeGreaterThan(0);
        expect(chapter.background || chapter.content).toBeTruthy();
        expect(chapter.observation.length).toBeGreaterThan(0);
      }
    }
    expect(chapters).toBeGreaterThan(1100);
  });
  test("없는 책은 null", () => {
    expect(getBookGuide("ZZZ")).toBeNull();
  });
});
