import { describe, expect, test } from "bun:test";
import { getStoryForRef } from "../src/lib/story-application";

describe("story-application mapping", () => {
  test("selects distinct stories for different books", () => {
    const hagar = getStoryForRef({ code: "GEN", chapter: 16, startVerse: 1, endVerse: 1 });
    const joseph = getStoryForRef({ code: "GEN", chapter: 40, startVerse: 1, endVerse: 1 });
    const moses = getStoryForRef({ code: "EXO", chapter: 2, startVerse: 1, endVerse: 1 });
    const david = getStoryForRef({ code: "1SA", chapter: 17, startVerse: 1, endVerse: 1 });
    const ruth = getStoryForRef({ code: "RUT", chapter: 1, startVerse: 1, endVerse: 1 });
    const paul = getStoryForRef({ code: "ACT", chapter: 9, startVerse: 1, endVerse: 1 });
    expect(hagar.title).not.toBe(joseph.title);
    expect(moses.title).not.toBe(david.title);
    expect(ruth.title).not.toBe(paul.title);
    expect(hagar.title).toContain("하갈");
    expect(paul.title).toContain("바울");
  });

  test("injects record excerpt as third line when provided", () => {
    const withRecord = getStoryForRef({ code: "GEN", chapter: 16, startVerse: 1, endVerse: 1 }, "오늘 마음이 복잡했다");
    expect(withRecord.body[2]).toContain("오늘 마음이 복잡했다");
    expect(withRecord.body.length).toBe(4);
    const withoutRecord = getStoryForRef({ code: "GEN", chapter: 16, startVerse: 1, endVerse: 1 });
    expect(withoutRecord.body.length).toBe(3);
  });

  test("handles unknown book fallback to hagar", () => {
    const unknown = getStoryForRef({ code: "XYZ", chapter: 1, startVerse: 1, endVerse: 1 });
    expect(unknown.title).toContain("하갈");
  });
});
