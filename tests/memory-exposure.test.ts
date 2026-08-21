import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { db } from "../src/lib/db";
import {
  recordMemoryExposure,
  recentlyExposedEntryIds,
  isRecentlyExposed,
  MEMORY_REEXPOSE_DAYS,
} from "../src/lib/memory-exposure";

let userId = "";
let entryId = "";
let otherEntryId = "";

describe("GATE-3 MemoryExposure", () => {
  beforeAll(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const user = await db.user.create({
      data: { email: `memory-gate3-${suffix}@test.local`, name: "gate3" },
    });
    userId = user.id;
    const entry = await db.reflectionEntry.create({
      data: { userId, entryDate: new Date(), reflectionBody: "노출 추적 테스트" },
    });
    entryId = entry.id;
    const other = await db.reflectionEntry.create({
      data: { userId, entryDate: new Date(), reflectionBody: "다른 기록" },
    });
    otherEntryId = other.id;
  });

  afterAll(async () => {
    await db.memoryExposure.deleteMany({ where: { userId } }).catch(() => {});
    await db.reflectionEntry.deleteMany({ where: { userId } }).catch(() => {});
    await db.user.deleteMany({ where: { id: userId } }).catch(() => {});
  });

  test("노출 기록 — 무응답 상태에서도 저장된다 (GATE-3)", async () => {
    await recordMemoryExposure({ userId, sourceEntryId: entryId, surfaceDateKey: "2026-08-21" });
    const rows = await db.memoryExposure.count({
      where: { userId, sourceEntryId: entryId, surfaceDateKey: "2026-08-21" },
    });
    expect(rows).toBe(1);
  });

  test("동일 노출 재기록은 멱등 (P2002 흡수)", async () => {
    await recordMemoryExposure({ userId, sourceEntryId: entryId, surfaceDateKey: "2026-08-21" });
    await recordMemoryExposure({ userId, sourceEntryId: entryId, surfaceDateKey: "2026-08-21" });
    const rows = await db.memoryExposure.count({
      where: { userId, sourceEntryId: entryId, surfaceDateKey: "2026-08-21" },
    });
    expect(rows).toBe(1);
  });

  test("recentlyExposedEntryIds — 14일 내 노출 제외 집합", async () => {
    await recordMemoryExposure({
      userId,
      sourceEntryId: otherEntryId,
      surfaceDateKey: "2026-08-20",
    });
    const exposed = await recentlyExposedEntryIds(userId, {
      now: new Date("2026-08-21T03:00:00.000Z"),
    });
    expect(exposed.has(entryId)).toBe(true);
    expect(exposed.has(otherEntryId)).toBe(true);
  });

  test("14일 경계 — 오래된 노출만 있는 기록은 제외 집합에 없음 (QA-1)", async () => {
    const NOW = new Date("2026-08-21T03:00:00.000Z");
    const oldEntry = await db.reflectionEntry.create({
      data: { userId, entryDate: new Date("2026-07-01T00:00:00.000Z"), reflectionBody: "오래된 노출 기록" },
    });
    // 7/1 노출 — 14일 밖 (cutoff=8/7)
    await db.memoryExposure.create({
      data: {
        userId,
        sourceEntryId: oldEntry.id,
        surfaceDateKey: "2026-07-01",
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
      },
    });
    const exposed = await recentlyExposedEntryIds(userId, { now: NOW });
    expect(exposed.has(oldEntry.id)).toBe(false);

    // 정확히 14.0일 경계 (gte 포함) — cutoff 시각과 동일하면 포함
    const boundaryEntry = await db.reflectionEntry.create({
      data: { userId, entryDate: new Date(), reflectionBody: "경계 기록" },
    });
    const cutoff = new Date(NOW.getTime() - MEMORY_REEXPOSE_DAYS * 24 * 60 * 60 * 1000);
    await db.memoryExposure.create({
      data: {
        userId,
        sourceEntryId: boundaryEntry.id,
        surfaceDateKey: "2026-08-07",
        createdAt: cutoff, // 정확히 14.0일 전 — gte 포함 → 포함되어야 함
      },
    });
    const exposed2 = await recentlyExposedEntryIds(userId, { now: NOW });
    expect(exposed2.has(boundaryEntry.id)).toBe(true);

    await db.reflectionEntry.delete({ where: { id: oldEntry.id } });
    await db.reflectionEntry.delete({ where: { id: boundaryEntry.id } });
  });

  test("기록(ReflectionEntry) 삭제 시 노출 행 cascade 정리 (QA-2)", async () => {
    const e = await db.reflectionEntry.create({
      data: { userId, entryDate: new Date(), reflectionBody: "cascade-record" },
    });
    await recordMemoryExposure({ userId, sourceEntryId: e.id, surfaceDateKey: "2026-08-21" });
    expect(
      await db.memoryExposure.count({ where: { userId, sourceEntryId: e.id } }),
    ).toBe(1);
    await db.reflectionEntry.delete({ where: { id: e.id } });
    expect(
      await db.memoryExposure.count({ where: { userId, sourceEntryId: e.id } }),
    ).toBe(0);
  });

  test("계정 삭제 시 cascade 정리", async () => {
    const u = await db.user.create({
      data: { email: `memory-gate3-cascade-${Date.now()}@test.local` },
    });
    const e = await db.reflectionEntry.create({
      data: { userId: u.id, entryDate: new Date(), reflectionBody: "cascade" },
    });
    await recordMemoryExposure({ userId: u.id, sourceEntryId: e.id, surfaceDateKey: "2026-08-21" });
    await db.user.delete({ where: { id: u.id } });
    const left = await db.memoryExposure.count({ where: { userId: u.id } });
    expect(left).toBe(0);
  });

  test("isRecentlyExposed — 개별 판정", async () => {
    expect(await isRecentlyExposed(userId, entryId)).toBe(true);
    const fresh = await db.reflectionEntry.create({
      data: { userId, entryDate: new Date(), reflectionBody: "미노출 기록" },
    });
    expect(await isRecentlyExposed(userId, fresh.id)).toBe(false);
    await db.reflectionEntry.delete({ where: { id: fresh.id } });
  });

  test("재노출 방지 상수는 14일", () => {
    expect(MEMORY_REEXPOSE_DAYS).toBe(14);
  });
});
