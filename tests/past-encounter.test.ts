import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { db } from "../src/lib/db";
import {
  recordPastEncounter,
  getPastEncounter,
  isPastEncounterReaction,
} from "../src/lib/past-encounter";
import { recordCheckin } from "../src/lib/checkin";

let userId = "";
let entryId = "";

describe("PastEncounter (G011)", () => {
  beforeAll(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const user = await db.user.create({
      data: { email: `encounter-g011-${suffix}@test.local`, name: "g011" },
    });
    userId = user.id;
    const entry = await db.reflectionEntry.create({
      data: { userId, entryDate: new Date(), reflectionBody: "타임캡슐 기록" },
    });
    entryId = entry.id;
  });

  afterAll(async () => {
    await db.pastEncounter.deleteMany({ where: { userId } }).catch(() => {});
    await db.dailyCheckIn.deleteMany({ where: { userId } }).catch(() => {});
    await db.eventLog.deleteMany({ where: { userId } }).catch(() => {});
    await db.reflectionEntry.deleteMany({ where: { userId } }).catch(() => {});
    await db.user.deleteMany({ where: { id: userId } }).catch(() => {});
  });

  test("응답 3종 기록 — upsert 1행", async () => {
    const r1 = await recordPastEncounter({
      userId,
      sourceEntryId: entryId,
      surfacedDateKey: "2026-08-21",
      reaction: "re_read",
    });
    expect(r1.reaction).toBe("re_read");

    // 변경 — update, 1행 유지
    await recordPastEncounter({
      userId,
      sourceEntryId: entryId,
      surfacedDateKey: "2026-08-21",
      reaction: "changed_view",
      note: "지금은 다르게 보여요",
    });
    const rows = await db.pastEncounter.count({
      where: { userId, sourceEntryId: entryId, surfacedDateKey: "2026-08-21" },
    });
    expect(rows).toBe(1);
    const got = await getPastEncounter(userId, entryId, "2026-08-21");
    expect(got?.reaction).toBe("changed_view");
    expect(got?.note).toBe("지금은 다르게 보여요");
  });

  test("같은 기록 다른 노출일 = 재응답 가능 (B5, lifetime unique 금지)", async () => {
    await recordPastEncounter({
      userId,
      sourceEntryId: entryId,
      surfacedDateKey: "2026-09-21",
      reaction: "still_hold",
    });
    const rows = await db.pastEncounter.count({ where: { userId, sourceEntryId: entryId } });
    expect(rows).toBe(2);
  });

  test("무응답 허용 — 행 생성 없음", async () => {
    const before = await db.pastEncounter.count({ where: { userId } });
    const result = await recordPastEncounter({
      userId,
      sourceEntryId: entryId,
      surfacedDateKey: "2026-10-21",
      reaction: null,
    });
    expect(result.reaction).toBeNull();
    const after = await db.pastEncounter.count({ where: { userId } });
    expect(after).toBe(before);
  });

  test("유효하지 않은 리액션은 저장 안 함", async () => {
    await recordPastEncounter({
      userId,
      sourceEntryId: entryId,
      surfacedDateKey: "2026-11-21",
      reaction: "angry",
    });
    const got = await getPastEncounter(userId, entryId, "2026-11-21");
    expect(got).toBeNull();
  });

  test("가드", () => {
    expect(isPastEncounterReaction("re_read")).toBe(true);
    expect(isPastEncounterReaction("changed_view")).toBe(true);
    expect(isPastEncounterReaction(null)).toBe(false);
  });

  test("checkin 통합 — memory 카드 리액션 시 PastEncounter 자동 기록", async () => {
    const cardKey = `memory:${entryId}`;
    await recordCheckin({
      userId,
      dateKey: "2026-08-21",
      cardKey,
      reaction: "re_read",
      surface: "keyring",
    });
    const enc = await getPastEncounter(userId, entryId, "2026-08-21");
    expect(enc?.reaction).toBe("re_read");
  });

  test("기록 삭제 시 cascade 정리", async () => {
    const e = await db.reflectionEntry.create({
      data: { userId, entryDate: new Date(), reflectionBody: "cascade-encounter" },
    });
    await recordPastEncounter({
      userId,
      sourceEntryId: e.id,
      surfacedDateKey: "2026-08-21",
      reaction: "re_read",
    });
    expect(
      await db.pastEncounter.count({ where: { userId, sourceEntryId: e.id } }),
    ).toBe(1);
    await db.reflectionEntry.delete({ where: { id: e.id } });
    expect(
      await db.pastEncounter.count({ where: { userId, sourceEntryId: e.id } }),
    ).toBe(0);
  });
});
