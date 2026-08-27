import { describe, expect, test } from "bun:test";
import { getChapterBackground } from "../src/lib/bible/chapter-background";

/**
 * 회귀 방지: ko 요청이 en 행으로 폴백해 영문 문맥 카드가 렌더되던 버그(2026-08-26).
 * 한국어 데이터가 없는 장은 영문 대신 카드를 생략한다.
 */
describe("chapter background language contract", () => {
  test("ko 요청에 한글 데이터가 없으면 영문으로 폴백하지 않는다", () => {
    // 2CH 21–36은 en-only 구간 — 영문 overview가 새어 나오면 안 된다.
    for (const chapter of [21, 25, 29, 36]) {
      const bg = getChapterBackground({ code: "2CH", chapter, locale: "ko" });
      if (!bg?.guide) {
        expect(bg?.overview ?? "").not.toMatch(/[A-Za-z]{10,}/);
      }
    }
  });

  test("ko 커버 장은 여전히 한국어 가이드를 제공한다", () => {
    expect(getChapterBackground({ code: "2CH", chapter: 5, locale: "ko" })?.guide?.title).toContain("언약궤");
    expect(getChapterBackground({ code: "2KI", chapter: 10, locale: "ko" })?.guide?.title).toBe(
      "여호람 왕조와 엘리사의 죽음 예고",
    );
  });
});
