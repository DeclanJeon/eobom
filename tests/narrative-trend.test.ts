import { describe, expect, test } from "bun:test";
import { buildNarrativeTrend } from "../src/lib/continuity/narrative-trend";

describe("narrative trend", () => {
  test("requires minimum windows and a current context", () => {
    expect(buildNarrativeTrend([{ context: "관계" }], [{ context: "일" }])).toBeNull();
    expect(
      buildNarrativeTrend(
        [{ context: null }, { context: null }, { context: null }, { context: null }],
        [{ context: "관계" }, { context: "관계" }, { context: "일" }],
      ),
    ).toBeNull();
  });

  test("uses stable lexical ties and prose rather than percentages", () => {
    const result = buildNarrativeTrend(
      [{ context: "방향" }, { context: "관계" }, { context: "관계" }, { context: "방향" }],
      [{ context: "일" }, { context: "일" }, { context: "관계" }],
    );
    expect(result).toContain("관계");
    expect(result).toContain("일");
    expect(result).not.toContain("%");
  });
});
