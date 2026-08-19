import { describe, expect, test } from "bun:test";
import {
  chapterKey,
  DAILY_SEND_HOUR_KST,
  getBookIntro,
  hashToIndex,
  recentChapterKeys,
  resetDailyScriptureCaches,
  selectRandomScripture,
  shouldUseAiPath,
  toKstParts,
} from "../src/lib/daily-scripture";
import { getPassageFromRef, listBooks } from "../src/lib/bible";

describe("daily-scripture", () => {
  test("book intros cover all 66 books", () => {
    resetDailyScriptureCaches();
    const books = listBooks();
    expect(books.length).toBe(66);
    for (const b of books) {
      const intro = getBookIntro(b.code);
      expect(intro.length).toBeGreaterThan(10);
    }
  });

  test("daily send hour is fixed at 7 KST", () => {
    expect(DAILY_SEND_HOUR_KST).toBe(7);
  });

  test("random pool excludes genealogy chapters and stays in bounds", () => {
    resetDailyScriptureCaches();
    const genealogy = new Set([
      "1CH-1",
      "1CH-2",
      "1CH-3",
      "1CH-4",
      "1CH-5",
      "1CH-6",
      "1CH-7",
      "1CH-8",
      "1CH-9",
      "EZR-2",
      "NEH-7",
    ]);
    for (let i = 0; i < 40; i += 1) {
      const result = selectRandomScripture({ seed: `test-seed-${i}` });
      expect(genealogy.has(chapterKey(result.ref))).toBe(false);
      const passage = getPassageFromRef(result.ref);
      expect(passage).not.toBeNull();
      expect(passage!.verses.length).toBeGreaterThan(0);
      expect(result.ref.endVerse).toBeGreaterThanOrEqual(result.ref.startVerse);
      expect(result.ref.startVerse).toBeGreaterThanOrEqual(1);
    }
  });

  test("Psalm 117 (2 verses) selects full chapter range", () => {
    const passage = getPassageFromRef({
      code: "PSA",
      chapter: 117,
      startVerse: 1,
      endVerse: 2,
    });
    expect(passage).not.toBeNull();
    expect(passage!.verses.length).toBe(2);
  });

  test("14-day chapter exclusion avoids recent chapters", () => {
    resetDailyScriptureCaches();
    const exclude = recentChapterKeys(["PSA-23-1-6", "JOH-3-16-16", "ROM-8-28-30"]);
    expect(exclude.has("PSA-23")).toBe(true);
    expect(exclude.has("JOH-3")).toBe(true);
    expect(exclude.has("ROM-8")).toBe(true);

    for (let i = 0; i < 30; i += 1) {
      const result = selectRandomScripture({
        seed: `exclude-${i}`,
        excludeChapters: exclude,
      });
      expect(exclude.has(chapterKey(result.ref))).toBe(false);
    }
  });

  test("same user+date seed is stable (오늘 붙들 말씀), date/user change it", () => {
    resetDailyScriptureCaches();
    const today = selectRandomScripture({ seed: "u1:2026-08-20" });
    const again = selectRandomScripture({ seed: "u1:2026-08-20" });
    const tomorrow = selectRandomScripture({ seed: "u1:2026-08-21" });
    const otherUser = selectRandomScripture({ seed: "u2:2026-08-20" });

    expect(again.slug).toBe(today.slug);
    expect(again.display).toBe(today.display);
    expect(again.text).toBe(today.text);
    expect(tomorrow.slug).not.toBe(today.slug);
    expect(otherUser.slug).not.toBe(today.slug);
  });

  test("toKstParts uses Asia/Seoul calendar day", () => {
    const monday = new Date("2026-08-03T12:00:00+09:00");
    const kst = toKstParts(monday);
    expect(kst.dateKey).toBe("2026-08-03");
    expect(kst.dayOfWeek).toBe(1);
    expect(kst.hour).toBe(12);
  });

  test("AI path gate requires consent and 3+ entries", () => {
    expect(shouldUseAiPath(true, 3)).toBe(true);
    expect(shouldUseAiPath(true, 2)).toBe(false);
    expect(shouldUseAiPath(false, 10)).toBe(false);
    expect(shouldUseAiPath(false, 0)).toBe(false);
  });

  test("hashToIndex is stable", () => {
    expect(hashToIndex("abc", 100)).toBe(hashToIndex("abc", 100));
    expect(hashToIndex("abc", 100)).not.toBe(hashToIndex("abd", 100));
  });
});
