/**
 * src/lib/memory-exposure.ts
 * Memory 카드 노출 추적 (GATE-3).
 * - recordMemoryExposure: 노출 사실을 idempotent하게 저장 (응답과 무관, 무응답도 저장).
 * - recentlyExposedEntryIds: 선택기(G007/G010)가 14일 내 노출 기록을 제외할 때 사용.
 * - P2002(unique 충돌)는 삼켜서 멱등 보장 — 동시 요청·중복 탭에서도 안전.
 */
import { db } from "@/lib/db";

export const MEMORY_REEXPOSE_DAYS = 14;

export async function recordMemoryExposure(input: {
  userId: string;
  sourceEntryId: string;
  surfaceDateKey: string;
}): Promise<void> {
  await db.memoryExposure.upsert({
    where: {
      userId_sourceEntryId_surfaceDateKey: {
        userId: input.userId,
        sourceEntryId: input.sourceEntryId,
        surfaceDateKey: input.surfaceDateKey,
      },
    },
    create: {
      userId: input.userId,
      sourceEntryId: input.sourceEntryId,
      surfaceDateKey: input.surfaceDateKey,
    },
    update: {},
  });
}

/** createdAt이 오늘 - withinDays 이후인 노출된 entryId 집합. (기본 14일) */
export async function recentlyExposedEntryIds(
  userId: string,
  opts: { withinDays?: number; now?: Date } = {},
): Promise<Set<string>> {
  const withinDays = opts.withinDays ?? MEMORY_REEXPOSE_DAYS;
  const now = opts.now ?? new Date();
  const cutoff = new Date(now.getTime() - withinDays * 24 * 60 * 60 * 1000);
  const rows = await db.memoryExposure.findMany({
    where: { userId, createdAt: { gte: cutoff } },
    select: { sourceEntryId: true },
  });
  return new Set(rows.map((r) => r.sourceEntryId));
}

/** 특정 기록이 최근 withinDays 내 노출되었는지 (재노출 방지 판정). */
export async function isRecentlyExposed(
  userId: string,
  sourceEntryId: string,
  opts: { withinDays?: number; now?: Date } = {},
): Promise<boolean> {
  const withinDays = opts.withinDays ?? MEMORY_REEXPOSE_DAYS;
  const now = opts.now ?? new Date();
  const cutoff = new Date(now.getTime() - withinDays * 24 * 60 * 60 * 1000);
  const row = await db.memoryExposure.findFirst({
    where: {
      userId,
      sourceEntryId,
      createdAt: { gte: cutoff },
    },
    select: { id: true },
  });
  return Boolean(row);
}
