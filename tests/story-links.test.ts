import { describe, expect, it } from "bun:test";
import {
  buildStoryDetailHref,
  normalizeStoryText,
  parseStoryDetailContext,
  pickBestStoryCandidate,
  scoreStoryCandidate,
  toReviewStoryItems,
  type StoryCorpusCandidate,
} from "../src/lib/story-mirror/story-links";

const candidates: StoryCorpusCandidate[] = [
  {
    id: "card-david",
    kind: "card",
    name: "다윗",
    title: "다윗",
    workTitle: "다윗",
    author: null,
    themes: ["회개", "겸손"],
  },
  {
    id: "chunk-elijah",
    kind: "chunk",
    name: "엘리야",
    title: "엘리야",
    workTitle: "엘리야",
    author: null,
    themes: ["번아웃", "외로움"],
  },
  {
    id: "chunk-prodigal",
    kind: "chunk",
    name: "탕자",
    title: "탕자",
    workTitle: "누가복음",
    author: null,
    themes: ["회개", "귀향"],
  },
];

describe("buildStoryDetailHref", () => {
  it("id only when no context", () => {
    expect(buildStoryDetailHref("abc")).toBe("/story-mirror/abc");
  });

  it("embeds personal overlap in query", () => {
    const href = buildStoryDetailHref("abc", {
      connection: "겉모습은 강하고 안은 외로웠다",
      differentPerspective: "강함 안의 외로움",
      sourceLabel: "엘리야",
    });
    expect(href.startsWith("/story-mirror/abc?")).toBe(true);
    const url = new URL(href, "https://example.com");
    expect(url.searchParams.get("c")).toContain("외로웠다");
    expect(url.searchParams.get("p")).toBe("강함 안의 외로움");
    expect(url.searchParams.get("s")).toBe("엘리야");
  });
});

describe("parseStoryDetailContext", () => {
  it("reads c/p/s params", () => {
    const ctx = parseStoryDetailContext({
      c: "연결 문장",
      p: "한 문장",
      s: "출처",
    });
    expect(ctx.connection).toBe("연결 문장");
    expect(ctx.differentPerspective).toBe("한 문장");
    expect(ctx.sourceLabel).toBe("출처");
  });
});

describe("normalizeStoryText", () => {
  it("strips parentheses and punctuation", () => {
    expect(normalizeStoryText("탕자 (누가복음 15)")).toBe("탕자");
  });
});

describe("score/pick story candidate", () => {
  it("matches 다윗 card", () => {
    const hit = pickBestStoryCandidate(
      { story: "다윗 (사무엘상)", source: "성경" },
      candidates,
    );
    expect(hit?.id).toBe("card-david");
  });

  it("matches 엘리야 chunk", () => {
    const hit = pickBestStoryCandidate(
      { story: "엘리야", source: "열왕기상" },
      candidates,
    );
    expect(hit?.id).toBe("chunk-elijah");
  });

  it("returns null for unrelated story", () => {
    const hit = pickBestStoryCandidate(
      { story: "알 수 없는 전설의 용사", source: "미상" },
      candidates,
    );
    expect(hit).toBeNull();
  });

  it("scores exact name higher than weak overlap", () => {
    const david = scoreStoryCandidate(
      { story: "다윗", source: "성경" },
      candidates[0],
    );
    const elijah = scoreStoryCandidate(
      { story: "다윗", source: "성경" },
      candidates[1],
    );
    expect(david).toBeGreaterThan(elijah);
  });
});

describe("toReviewStoryItems", () => {
  it("builds items and resolves href when possible", () => {
    const items = toReviewStoryItems(
      [
        {
          story: "엘리야",
          source: "열왕기상",
          connection: "지친 선지자의 회복",
          differentPerspective: "혼자 남은 자리에서도 부르심이 있었다",
        },
        {
          story: "없는인물XYZ",
          source: "미상",
          connection: "연결만 있는 텍스트",
        },
      ],
      candidates,
    );
    expect(items).toHaveLength(2);
    expect(items[0].href).toContain("/story-mirror/chunk-elijah?");
    expect(items[0].href).toContain("c=");
    expect(items[1].href).toBeUndefined();
    expect(items[1].connection).toBe("연결만 있는 텍스트");
  });

  it("drops empty connections", () => {
    const items = toReviewStoryItems(
      [{ story: "다윗", source: "성경", connection: "   " }],
      candidates,
    );
    expect(items).toHaveLength(0);
  });
});
