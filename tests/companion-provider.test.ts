import { describe, expect, test } from "bun:test";
import { matchInputSchema, validateProviderResult } from "@/lib/companion-match-provider";

describe("companion provider contract", () => {
  test("accepts only structured private matching signals", () => {
    expect(matchInputSchema.parse({ topicTags: ["기도"], helpModes: ["듣기"], role: "peer", scopeKey: "private" }).scopeKey).toBe("private");
    expect(() => matchInputSchema.parse({ topicTags: [], helpModes: [], role: null, scopeKey: "same_group" })).toThrow();
  });

  test("caps and filters unsafe provider results", () => {
    const safe = validateProviderResult([
      { profileId: "p1", signalLabels: ["기도"], reasonSummary: "공통 주제가 있어요." },
      { profileId: "p2", signalLabels: ["전화번호"], reasonSummary: "공통 주제가 있어요." },
      { profileId: "p3", signalLabels: ["듣기"], reasonSummary: "안전한 제안" },
      { profileId: "p4", signalLabels: ["기도"], reasonSummary: "네 번째" },
    ]);
    expect(safe.map((item) => item.profileId)).toEqual(["p1", "p3", "p4"]);
  });
});
