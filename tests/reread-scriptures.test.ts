import { describe, expect, test } from "bun:test";
import { generateReviewWithMimo } from "../src/lib/mimo";
import {
  excludeUsedScriptureReadings,
  finalizeReviewRereadScriptures,
  isReviewStaleForHome,
  normalizeRereadScriptures,
  parseStructuredRereadScriptures,
  pickRecentScriptureFallback,
  selectHomeRereadScriptures,
} from "../src/lib/reread-scriptures";
import {
  hasSubstantiveEntryDraft,
  shouldApplyScriptureSeed,
} from "../src/lib/entry-seed";

describe("normalizeRereadScriptures", () => {
  test("empty and broken input → []", () => {
    expect(normalizeRereadScriptures(null)).toEqual([]);
    expect(normalizeRereadScriptures(undefined)).toEqual([]);
    expect(normalizeRereadScriptures("x")).toEqual([]);
    expect(normalizeRereadScriptures([null, 1, {}])).toEqual([]);
    expect(
      normalizeRereadScriptures([{ ref: "", reason: "ok" }, { ref: "시편 23:1" }]),
    ).toEqual([]);
  });

  test("drops unparseable ref", () => {
    expect(
      normalizeRereadScriptures([
        { ref: "없는책 1:1", reason: "이유가 있습니다." },
        { ref: "시편 23:1", reason: "해당 기간 기록에 등장한 본문입니다." },
      ]),
    ).toEqual([
      expect.objectContaining({
        slug: "PSA-23-1",
        display: "시편 23:1",
        startVerse: 1,
        endVerse: 1,
      }),
    ]);
  });

  test("filters by allowedRefs via parse keys", () => {
    const out = normalizeRereadScriptures(
      [
        { ref: "시편 23:1", reason: "허용된 본문" },
        { ref: "요한복음 3:16", reason: "기록에 없음" },
      ],
      { allowedRefs: ["시 23:1"] },
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.slug).toBe("PSA-23-1");
  });

  test("dedupes by slug and respects max", () => {
    const out = normalizeRereadScriptures(
      [
        { ref: "시편 23:1", reason: "하나" },
        { ref: "시 23:1", reason: "중복" },
        { ref: "빌 1:6-8", reason: "둘" },
        { ref: "요한복음 3:16", reason: "셋" },
        { ref: "창세기 1:1", reason: "넷" },
      ],
      { max: 3 },
    );
    expect(out.map((x) => x.slug)).toEqual(["PSA-23-1", "PHI-1-6-8", "JOH-3-16"]);
  });

  test("scrubs forbidden prescription phrases in reason", () => {
    const phrases = [
      "추천 성구를 붙드세요",
      "오늘의 성구입니다",
      "지금 필요한 말씀",
      "하나님이 주시는 말씀",
      "이 말씀이 답입니다",
      "이 구절을 붙들어요",
    ];
    for (const phrase of phrases) {
      const out = normalizeRereadScriptures([
        { ref: "시편 23:1", reason: `기록과 연결: ${phrase}` },
      ]);
      expect(out).toHaveLength(1);
      expect(out[0]?.reason).not.toContain(phrase.split(/\s+/)[0]!);
      expect(out[0]?.reason).toContain("기록에서 관찰되는 흐름");
    }
  });

  test("keeps optional openQuestion and evidenceEntryIds when clean", () => {
    const out = normalizeRereadScriptures([
      {
        ref: "시편 13:1-6",
        reason: "기간 기록과 닿아 있습니다.",
        openQuestion: "이 본문 앞에서 무엇이 남아 있나요?",
        evidenceEntryIds: ["e1", "e1", ""],
      },
    ]);
    expect(out[0]?.openQuestion).toBe("이 본문 앞에서 무엇이 남아 있나요?");
    expect(out[0]?.evidenceEntryIds).toEqual(["e1"]);
    expect(out[0]?.startVerse).toBe(1);
    expect(out[0]?.endVerse).toBe(6);
  });

  test("idempotent on already normalized items", () => {
    const once = normalizeRereadScriptures([
      { ref: "시편 23:1", reason: "다시 머물 본문" },
    ]);
    const twice = normalizeRereadScriptures(once);
    expect(twice).toEqual(once);
  });

  test("empty allowedRefs array drops all report-derived items", () => {
    const out = normalizeRereadScriptures(
      [{ ref: "시편 23:1", reason: "ok" }],
      { allowedRefs: [] },
    );
    expect(out).toEqual([]);
  });
});

describe("isReviewStaleForHome", () => {
  const now = new Date("2026-07-28T12:00:00.000Z");

  test("89 days is not stale", () => {
    const createdAt = new Date("2026-04-30T12:00:00.000Z"); // 89d
    expect(
      isReviewStaleForHome({ createdAt, periodEnd: createdAt }, now, 90),
    ).toBe(false);
  });

  test("exactly 90 days is not stale (threshold is >)", () => {
    const createdAt = new Date("2026-04-29T12:00:00.000Z"); // 90d
    expect(
      isReviewStaleForHome({ createdAt, periodEnd: createdAt }, now, 90),
    ).toBe(false);
  });

  test("91 days is stale", () => {
    const createdAt = new Date("2026-04-28T12:00:00.000Z"); // 91d
    expect(
      isReviewStaleForHome({ createdAt, periodEnd: createdAt }, now, 90),
    ).toBe(true);
  });

  test("stale if either createdAt or periodEnd exceeds window", () => {
    const old = new Date("2025-01-01T00:00:00.000Z");
    const fresh = new Date("2026-07-01T00:00:00.000Z");
    expect(
      isReviewStaleForHome({ createdAt: fresh, periodEnd: old }, now, 90),
    ).toBe(true);
    expect(
      isReviewStaleForHome({ createdAt: old, periodEnd: fresh }, now, 90),
    ).toBe(true);
    expect(
      isReviewStaleForHome({ createdAt: fresh, periodEnd: fresh }, now, 90),
    ).toBe(false);
  });
});

describe("pickRecentScriptureFallback", () => {
  const now = new Date("2026-07-28T00:00:00.000Z");

  test("picks recent parseable refs with age filter and max", () => {
    const out = pickRecentScriptureFallback(
      [
        {
          id: "old",
          entryDate: new Date("2025-01-01T00:00:00.000Z"),
          title: "오래된",
          scriptureRefs: ["시편 1:1"],
        },
        {
          id: "a",
          entryDate: new Date("2026-07-20T00:00:00.000Z"),
          title: "최근",
          scriptureRefs: ["시편 23:1", "요한복음 3:16"],
        },
        {
          id: "b",
          entryDate: new Date("2026-07-10T00:00:00.000Z"),
          scriptureRefs: ["빌 1:6"],
        },
      ],
      { max: 2, now, maxAgeDays: 90 },
    );
    expect(out).toHaveLength(2);
    expect(out[0]?.slug).toBe("PSA-23-1");
    expect(out[0]?.entryId).toBe("a");
    expect(out[0]?.reason).toContain("최근");
    expect(out[1]?.slug).toBe("JOH-3-16");
  });

  test("dedupes across entries", () => {
    const out = pickRecentScriptureFallback(
      [
        {
          id: "a",
          entryDate: new Date("2026-07-20T00:00:00.000Z"),
          scriptureRefs: ["시 23:1"],
        },
        {
          id: "b",
          entryDate: new Date("2026-07-19T00:00:00.000Z"),
          scriptureRefs: ["시편 23:1"],
        },
      ],
      { max: 3, now },
    );
    expect(out).toHaveLength(1);
  });

  test("returns empty when no parseable recent refs", () => {
    expect(
      pickRecentScriptureFallback(
        [
          {
            id: "x",
            entryDate: now,
            scriptureRefs: ["없는책 1:1", ""],
          },
        ],
        { now },
      ),
    ).toEqual([]);
  });
});

describe("parseStructuredRereadScriptures", () => {
  test("reads array from valid JSON", () => {
    const raw = JSON.stringify({
      rereadScriptures: [{ ref: "시편 23:1", reason: "ok" }],
    });
    expect(parseStructuredRereadScriptures(raw)).toEqual([
      { ref: "시편 23:1", reason: "ok" },
    ]);
  });

  test("malformed JSON and missing field → []", () => {
    expect(parseStructuredRereadScriptures("{not json")).toEqual([]);
    expect(parseStructuredRereadScriptures("{}")).toEqual([]);
    expect(parseStructuredRereadScriptures('{"rereadScriptures":null}')).toEqual(
      [],
    );
  });
});

describe("selectHomeRereadScriptures", () => {
  const now = new Date("2026-07-28T12:00:00.000Z");
  const fresh = new Date("2026-07-01T00:00:00.000Z");
  const old = new Date("2025-01-01T00:00:00.000Z");

  const fallbackEntries = [
    {
      id: "e-recent",
      entryDate: new Date("2026-07-20T00:00:00.000Z"),
      title: "최근 기록",
      scriptureRefs: ["빌 1:6"],
    },
  ];

  test("prefers fresh review refs intersecting allowedRefs (max 2)", () => {
    const report = {
      createdAt: fresh,
      periodEnd: fresh,
      structuredOutput: JSON.stringify({
        rereadScriptures: [
          { ref: "시편 23:1", reason: "기록에 있음" },
          { ref: "창세기 1:1", reason: "환각" },
          { ref: "요한복음 3:16", reason: "기록에 있음" },
          { ref: "빌 1:6", reason: "세 번째" },
        ],
      }),
    };
    const sel = selectHomeRereadScriptures({
      report,
      allowedRefs: ["시 23:1", "요 3:16", "빌 1:6"],
      fallbackEntries,
      now,
      max: 2,
    });
    expect(sel.source).toBe("review");
    expect(sel.items.map((i) => i.slug)).toEqual(["PSA-23-1", "JOH-3-16"]);
  });

  test("falls back when review is stale", () => {
    const report = {
      createdAt: old,
      periodEnd: old,
      structuredOutput: JSON.stringify({
        rereadScriptures: [{ ref: "시편 23:1", reason: "옛 회고" }],
      }),
    };
    const sel = selectHomeRereadScriptures({
      report,
      allowedRefs: ["시편 23:1"],
      fallbackEntries,
      now,
      max: 2,
    });
    expect(sel.source).toBe("fallback");
    expect(sel.items[0]?.slug).toBe("PHI-1-6");
    expect((sel.items[0] as { entryId?: string }).entryId).toBe("e-recent");
  });

  test("falls back when intersection empty even if review fresh", () => {
    const report = {
      createdAt: fresh,
      periodEnd: fresh,
      structuredOutput: JSON.stringify({
        rereadScriptures: [{ ref: "창세기 1:1", reason: "환각만" }],
      }),
    };
    const sel = selectHomeRereadScriptures({
      report,
      allowedRefs: ["시편 23:1"],
      fallbackEntries,
      now,
    });
    expect(sel.source).toBe("fallback");
  });

  test("none when no report and no fallback", () => {
    const sel = selectHomeRereadScriptures({
      report: null,
      fallbackEntries: [],
      now,
    });
    expect(sel).toEqual({ source: "none", items: [] });
  });

  test("malformed structuredOutput uses fallback", () => {
    const sel = selectHomeRereadScriptures({
      report: {
        createdAt: fresh,
        periodEnd: fresh,
        structuredOutput: "not-json",
      },
      allowedRefs: ["시편 23:1"],
      fallbackEntries,
      now,
    });
    expect(sel.source).toBe("fallback");
  });
});

describe("finalizeReviewRereadScriptures (POST path)", () => {
  test("mirrors reviews POST: allowedRefs + max 3", () => {
    const raw = [
      { ref: "시편 23:1", reason: "a" },
      { ref: "요한복음 3:16", reason: "b" },
      { ref: "빌 1:6", reason: "c" },
      { ref: "창세기 1:1", reason: "d" },
      { ref: "로마서 8:28", reason: "e" },
    ];
    const out = finalizeReviewRereadScriptures(raw, ["시 23:1", "요 3:16", "빌 1:6", "롬 8:28"], 3);
    expect(out).toHaveLength(3);
    expect(out.map((x) => x.slug)).toEqual(["PSA-23-1", "JOH-3-16", "PHI-1-6"]);
    expect(out.every((x) => x.display && x.reason)).toBe(true);
  });
});

describe("generateReviewWithMimo fallback reread", () => {
  test("local fallback reread refs come from entry scriptures and finalize cleanly", async () => {
    const prevMimo = process.env.MIMO_API_KEY;
    const prevDeepseek = process.env.DEEPSEEK_API_KEY;
    process.env.MIMO_API_KEY = "";
    process.env.DEEPSEEK_API_KEY = "";
    try {
      const entries = [
        {
          id: "e1",
          entryDate: "2026-07-01T00:00:00.000Z",
          title: "t",
          scriptureRefs: ["시편 23:1", "요한복음 3:16", "없는책 9:9"],
          scriptureExcerpt: null,
          reflectionBody: "묵상 본문입니다.",
          gratitude: null,
          question: null,
          prayer: null,
          actionStep: null,
          emotions: ["평안"],
          tags: ["말씀"],
        },
      ];
      const { review, modelProvider } = await generateReviewWithMimo(entries, "monthly");
      expect(modelProvider).toBe("local-fallback");
      expect(review.disclaimer).toContain("하나님의 뜻");
      expect(review.rereadScriptures.some((r) => r.ref.includes("시편") || r.ref.includes("요한"))).toBe(
        true,
      );
      const allowed = entries.flatMap((e) => e.scriptureRefs);
      const finalized = finalizeReviewRereadScriptures(review.rereadScriptures, allowed, 3);
      expect(finalized.length).toBeGreaterThan(0);
      expect(finalized.every((r) => r.slug === "PSA-23-1" || r.slug === "JOH-3-16")).toBe(
        true,
      );
      expect(finalized.every((r) => !/추천\s*성구|이\s*말씀이\s*답/.test(r.reason))).toBe(
        true,
      );
    } finally {
      if (prevMimo === undefined) delete process.env.MIMO_API_KEY;
      else process.env.MIMO_API_KEY = prevMimo;
      if (prevDeepseek === undefined) delete process.env.DEEPSEEK_API_KEY;
      else process.env.DEEPSEEK_API_KEY = prevDeepseek;
    }
  });

  test("local fallback scriptureReadings are new refs, never reuse entry scriptures", async () => {
    const prevMimo = process.env.MIMO_API_KEY;
    const prevDeepseek = process.env.DEEPSEEK_API_KEY;
    process.env.MIMO_API_KEY = "";
    process.env.DEEPSEEK_API_KEY = "";
    try {
      const entries = [
        {
          id: "e1",
          entryDate: "2026-07-01T00:00:00.000Z",
          title: "t",
          scriptureRefs: ["시편 23:1", "마태복음 11:28-30"],
          scriptureExcerpt: null,
          reflectionBody: "묵상 본문입니다.",
          gratitude: null,
          question: null,
          prayer: null,
          actionStep: null,
          emotions: ["평안"],
          tags: ["말씀"],
        },
      ];
      const { review, modelProvider } = await generateReviewWithMimo(entries, "cumulative");
      expect(modelProvider).toBe("local-fallback");
      expect(review.scriptureReadings.length).toBeGreaterThan(0);
      // 재사용 금지: 추천 성구는 사용자가 기록한 본문과 겹치면 안 된다.
      const used = new Set(entries.flatMap((e) => e.scriptureRefs));
      for (const s of review.scriptureReadings) {
        expect(used.has(s.ref)).toBe(false);
        expect(s.ref).not.toContain("시편 23");
        expect(s.ref).not.toContain("마태복음 11");
      }
    } finally {
      if (prevMimo === undefined) delete process.env.MIMO_API_KEY;
      else process.env.MIMO_API_KEY = prevMimo;
      if (prevDeepseek === undefined) delete process.env.DEEPSEEK_API_KEY;
      else process.env.DEEPSEEK_API_KEY = prevDeepseek;
    }
  });
});

describe("excludeUsedScriptureReadings (POST path)", () => {
  test("drops refs the user already recorded, keeps new ones", () => {
    const out = excludeUsedScriptureReadings(
      [
        { ref: "시편 23:1", reason: "기록에 이미 있음", focus: "x" },
        { ref: "빌립보서 4:6-7", reason: "새 본문", focus: "y" },
        { ref: "이사야 43:1-2", reason: "또 다른 새 본문", focus: "z" },
      ],
      ["시 23:1"],
      3,
    );
    expect(out.map((s) => s.ref)).toEqual(["빌립보서 4:6-7", "이사야 43:1-2"]);
    expect(out[0]?.reason).toBe("새 본문");
  });

  test("same chapter counts as reuse even with different verse range", () => {
    const out = excludeUsedScriptureReadings(
      [
        { ref: "시편 23:1-6", reason: "같은 장 다른 절", focus: "f" },
        { ref: "마태복음 11:28-30", reason: "진짜 새 본문", focus: "f" },
      ],
      ["시 23:1"],
      3,
    );
    expect(out.map((s) => s.ref)).toEqual(["마태복음 11:28-30"]);
  });

  test("handles broken input and honors max", () => {
    expect(excludeUsedScriptureReadings(null, [])).toEqual([]);
    expect(excludeUsedScriptureReadings(undefined, [])).toEqual([]);
    expect(excludeUsedScriptureReadings("x" as never, [])).toEqual([]);
    const out = excludeUsedScriptureReadings(
      [
        { ref: "마태복음 11:28-30", reason: "a", focus: "f" },
        { ref: "시 11:28", reason: "중복 키", focus: "f" },
        { ref: "요한복음 3:16", reason: "b", focus: "f" },
        { ref: "창세기 1:1", reason: "c", focus: "f" },
      ],
      [],
      2,
    );
    expect(out).toHaveLength(2);
  });
});

describe("entry seed helpers", () => {
  test("hasSubstantiveEntryDraft detects content and bindings", () => {
    expect(hasSubstantiveEntryDraft({ reflectionBody: "" }, 0)).toBe(false);
    expect(hasSubstantiveEntryDraft({ reflectionBody: "  hi  " }, 0)).toBe(true);
    expect(hasSubstantiveEntryDraft({ reflectionBody: "" }, 1)).toBe(true);
    expect(hasSubstantiveEntryDraft({ reflectionBody: "", title: "t" }, 0)).toBe(
      true,
    );
  });

  test("shouldApplyScriptureSeed: draft wins over query", () => {
    expect(
      shouldApplyScriptureSeed({
        seedScripture: "시편 23:1",
        values: { reflectionBody: "" },
        bindingsCount: 0,
      }),
    ).toBe(true);

    expect(
      shouldApplyScriptureSeed({
        seedScripture: "시편 23:1",
        values: { reflectionBody: "초안" },
        bindingsCount: 0,
      }),
    ).toBe(false);

    expect(
      shouldApplyScriptureSeed({
        seedScripture: "시편 23:1",
        values: { reflectionBody: "" },
        bindingsCount: 2,
      }),
    ).toBe(false);

    expect(
      shouldApplyScriptureSeed({
        seedScripture: "   ",
        values: { reflectionBody: "" },
        bindingsCount: 0,
      }),
    ).toBe(false);
  });
});
