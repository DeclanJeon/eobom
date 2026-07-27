import { describe, expect, test } from "bun:test";
import {
  getPassageBySlug,
  getPassageFromRef,
  listBooks,
  listChapterVerses,
  parseBibleReferences,
  parseUserInput,
  toDisplay,
  toSlug,
  translationInfo,
} from "../src/lib/bible";

describe("bible books", () => {
  test("lists 66 books", () => {
    const books = listBooks();
    expect(books.length).toBe(66);
    expect(books.find((b) => b.code === "PSA")?.name).toBe("시편");
    expect(translationInfo().id).toBe("ko-open-bible");
  });
});

describe("parse", () => {
  test("parses korean full and short names", () => {
    expect(parseBibleReferences("시편 23:1")[0]).toEqual({
      code: "PSA",
      chapter: 23,
      startVerse: 1,
      endVerse: 1,
    });
    expect(parseBibleReferences("시 23:1")[0]?.code).toBe("PSA");
    expect(parseBibleReferences("빌 1:6-8")[0]).toEqual({
      code: "PHI",
      chapter: 1,
      startVerse: 6,
      endVerse: 8,
    });
  });

  test("parses john alias", () => {
    const ref = parseBibleReferences("John 3:16")[0];
    expect(ref?.code).toBe("JOH");
    expect(ref?.chapter).toBe(3);
    expect(ref?.startVerse).toBe(16);
  });

  test("failed unknown book", () => {
    const r = parseUserInput("없는책 1:1");
    expect(r.ok.length).toBe(0);
    expect(r.failed.length).toBeGreaterThan(0);
  });
});

describe("slug and passage", () => {
  test("slug round trip display", () => {
    const ref = { code: "PSA", chapter: 23, startVerse: 1, endVerse: 1 };
    expect(toSlug(ref)).toBe("PSA-23-1");
    expect(toDisplay(ref)).toBe("시편 23:1");
  });

  test("PSA 23:1 has excerpt", () => {
    const p = getPassageBySlug("PSA-23-1");
    expect(p).toBeTruthy();
    expect(p!.binding.display).toBe("시편 23:1");
    expect(p!.binding.excerpt?.length).toBeGreaterThan(5);
    expect(p!.verses[0]?.text.includes("목자")).toBe(true);
  });

  test("chapter verses non-empty", () => {
    const verses = listChapterVerses("PSA", 23);
    expect(verses.length).toBeGreaterThan(5);
  });

  test("range binding", () => {
    const p = getPassageFromRef({
      code: "JOH",
      chapter: 3,
      startVerse: 16,
      endVerse: 17,
    });
    expect(p?.binding.slug).toBe("JOH-3-16-17");
    expect(p?.verses.length).toBe(2);
  });
});
