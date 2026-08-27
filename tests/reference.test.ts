import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("reference CSV", () => {
  const csv = readFileSync(path.join(process.cwd(), "data/reference/crossrefs.csv"), "utf8");
  const header = csv.split("\n")[0];

  test("CSV header has human-readable + license columns", () => {
    expect(header).toContain("source_ref");
    expect(header).toContain("target_ref");
    expect(header).toContain("license");
    expect(header).toContain("source_code");
    expect(header).toContain("source_name");
  });

  test("CSV has 678k edges + header", () => {
    const lines = csv.split("\n").filter(Boolean);
    expect(lines.length).toBe(678162);
  });

  test("GEN 1:1 appears 123 times", () => {
    const count = csv.split("\n").filter((l) => l.startsWith("GEN,1,1,")).length;
    expect(count).toBe(123);
  });

  test("licenses are CC BY variants", () => {
    expect(csv).toContain("CC BY 4.0");
    expect(csv).toContain("CC BY-SA 4.0");
  });

  test("by-verse summary exists", () => {
    const byVerse = readFileSync(path.join(process.cwd(), "data/reference/crossrefs-by-verse.csv"), "utf8");
    expect(byVerse).toContain("verse_ref");
    expect(byVerse.split("\n").length).toBeGreaterThan(29000);
  });
});

describe("chapter-background JSON", () => {
  test("ko + en chapter counts", () => {
    const ko = JSON.parse(readFileSync(path.join(process.cwd(), "data/reference/chapter-background-ko.json"), "utf8"));
    const en = JSON.parse(readFileSync(path.join(process.cwd(), "data/reference/chapter-background-en.json"), "utf8"));
    // 한국어 배경은 en 전체 장을 커버해야 한다(누락 시 영문 폴백 없이 카드 생략).
    expect(ko.chapters.length).toBe(en.chapters.length);
    expect(ko.chapters.length).toBe(1189);
    expect(ko.stats.totalChapters).toBe(ko.chapters.length);
    const enIds = new Set(en.chapters.map((c) => c.id));
    for (const chapter of ko.chapters) {
      expect(enIds.has(chapter.id)).toBe(true);
      expect(chapter.overview.length).toBeGreaterThan(10);
    }
    const koIds = new Set(ko.chapters.map((c) => c.id));
    const missingKo = en.chapters.filter((c) => !koIds.has(c.id));
    expect(missingKo).toEqual([]);
  });
});
