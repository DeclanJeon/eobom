import { describe, expect, test } from "bun:test";
import {
  sanitizeTopicTags,
  suggestTopicTagsHeuristic,
} from "../src/lib/together-tags";

describe("together topic tags", () => {
  test("sanitize strips hash and caps length", () => {
    expect(
      sanitizeTopicTags(["#감사", "  신뢰  ", "x", "아주긴태그이름입니다정말", "감사"]),
    ).toEqual(["감사", "신뢰", "아주긴태그이름입니다정말"]);
  });

  test("heuristic finds themes from body", () => {
    const tags = suggestTopicTagsHeuristic({
      publicBody:
        "오늘 두려움이 컸지만 기도 가운데 평안이 찾아왔습니다. 관계를 용서하기로 결단합니다.",
      scriptureRefs: ["시편 23:1"],
      limit: 5,
    });
    expect(tags.length).toBeGreaterThan(0);
    expect(tags.some((t) => ["두려움", "평안", "기도", "용서", "결단", "예배"].includes(t))).toBe(
      true,
    );
  });

  test("empty body yields empty tags", () => {
    expect(suggestTopicTagsHeuristic({ publicBody: "" })).toEqual([]);
  });
});
