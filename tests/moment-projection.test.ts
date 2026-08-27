import { describe, expect, test } from "bun:test";
import { projectCheckinToMoment } from "../src/lib/continuity/moment";

describe("DailyCheckIn continuity projection", () => {
  test("projects scripture checkins without inventing context", () => {
    const moment = projectCheckinToMoment({
      id: "c1",
      userId: "u1",
      cardKey: "scripture:2026-08-25",
      reaction: "still_hold",
      oneLine: "기다림",
      entryId: "e1",
      createdAt: new Date("2026-08-25T00:00:00Z"),
    });

    expect(moment?.source).toBe("today");
    expect(moment?.verseKey).toBeNull();
    expect(moment?.context).toBeNull();
    expect(moment?.promotedEntryId).toBe("e1");
  });

  test("keeps resurfaced source and promoted entry separate", () => {
    const moment = projectCheckinToMoment({
      id: "c2",
      userId: "u1",
      cardKey: "memory:source-entry-7",
      reaction: "changed_view",
      oneLine: null,
      entryId: "promoted-entry-8",
      createdAt: new Date("2026-08-25T00:00:00Z"),
    });

    expect(moment?.source).toBe("resurface");
    expect(moment?.sourceEntryId).toBe("source-entry-7");
    expect(moment?.promotedEntryId).toBe("promoted-entry-8");
  });

  test("rejects unknown card kinds instead of masquerading as today", () => {
    expect(
      projectCheckinToMoment({
        id: "c3",
        userId: "u1",
        cardKey: "prompt:2026-08-25",
        reaction: null,
        oneLine: null,
        entryId: null,
        createdAt: new Date("2026-08-25T00:00:00Z"),
      }),
    ).toBeNull();
  });
});
