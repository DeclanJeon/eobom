import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("today reaction flow contract", () => {
  const card = readFileSync("src/components/today/today-card.tsx", "utf8");
  const modal = readFileSync("src/components/today/reaction-modal.tsx", "utf8");
  const todayPage = readFileSync("src/app/today/page.tsx", "utf8");

  test("keeps note capture behind the reaction modal", () => {
    expect(card).toContain("<ReactionModal");
    expect(card).toContain("setReactionModalOpen(true)");
    expect(card).not.toContain("TINY_ACTION_CATALOG");
    expect(card).not.toContain("one-line-${cardKey}");
  });

  test("offers a skippable next-scripture action", () => {
    expect(modal).toContain("다음 성구 보기");
    expect(card).toContain("window.location.assign(`/today?next=${Date.now()}`)");
    expect(modal).toContain("disabled={saving || !note.trim()}");
  });

  test("does not couple scripture detail and reaction dialogs", () => {
    expect(card).toContain("scriptureModalOpen");
    expect(card).toContain("reactionModalOpen");
  });

  test("keeps returning-user context inside the scripture narrative", () => {
    expect(todayPage).toContain("pastContext:");
    expect(card).toContain("그때 함께 읽은 말씀 보기");
    expect(todayPage).not.toContain("secondaryCandidate ?");
  });
});
