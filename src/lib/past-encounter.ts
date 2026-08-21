/**
 * src/lib/past-encounter.ts
 * 타임캡슐 응답 (PastEncounter) — B5·C4.
 * - 3종 중립 라벨 (다시 읽었어요/아직 마음에 남아요/지금은 다르게 보여요).
 * - 무응답 허용 — 행이 없어도 정상.
 * - (userId, sourceEntryId, surfacedDateKey) unique — 같은 기록을 다른 날 다시
 *   만나면 재응답 가능 (lifetime unique 금지, B5). P2002 멱등 흡수.
 */
import { db } from "@/lib/db";

export const PAST_ENCOUNTER_REACTIONS = [
  { code: "re_read", label: "다시 읽었어요" },
  { code: "still_hold", label: "아직 마음에 남아요" },
  { code: "changed_view", label: "지금은 다르게 보여요" },
] as const;

export type PastEncounterReaction = (typeof PAST_ENCOUNTER_REACTIONS)[number]["code"];

export function isPastEncounterReaction(
  v: string | null | undefined,
): v is PastEncounterReaction {
  return PAST_ENCOUNTER_REACTIONS.some((r) => r.code === v);
}

export type RecordPastEncounterInput = {
  userId: string;
  sourceEntryId: string;
  surfacedDateKey: string;
  reaction?: string | null;
  note?: string | null;
};

/**
 * 응답 기록 — upsert (재만남마다 1행), P2002 멱등.
 * reaction이 유효 코드가 아니면 저장하지 않는다 (무응답 = 행 없음 또는 null 유지).
 */
export async function recordPastEncounter(
  input: RecordPastEncounterInput,
): Promise<{ id: string; reaction: string | null; note: string | null }> {
  const reaction = input.reaction && isPastEncounterReaction(input.reaction)
    ? input.reaction
    : null;
  const note = input.note?.trim() || null;

  if (!reaction) {
    // 무응답 — 기존 행이 있으면 유지, 없으면 만들지 않는다
    const existing = await db.pastEncounter.findUnique({
      where: {
        userId_sourceEntryId_surfacedDateKey: {
          userId: input.userId,
          sourceEntryId: input.sourceEntryId,
          surfacedDateKey: input.surfacedDateKey,
        },
      },
      select: { id: true, reaction: true, note: true },
    });
    return existing ?? { id: "", reaction: null, note: null };
  }

  let row;
  try {
    row = await db.pastEncounter.upsert({
      where: {
        userId_sourceEntryId_surfacedDateKey: {
          userId: input.userId,
          sourceEntryId: input.sourceEntryId,
          surfacedDateKey: input.surfacedDateKey,
        },
      },
      create: {
        userId: input.userId,
        sourceEntryId: input.sourceEntryId,
        surfacedDateKey: input.surfacedDateKey,
        reaction,
        note,
      },
      update: {
        reaction,
        note,
      },
    });
  } catch (error) {
    // P2002만 멱등 흡수 (동시 upsert) — 비중복 오류는 전파 (QA)
    const isP2002 =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002";
    if (!isP2002) throw error;
    const existing = await db.pastEncounter.findUnique({
      where: {
        userId_sourceEntryId_surfacedDateKey: {
          userId: input.userId,
          sourceEntryId: input.sourceEntryId,
          surfacedDateKey: input.surfacedDateKey,
        },
      },
      select: { id: true, reaction: true, note: true },
    });
    return existing ?? { id: "", reaction: null, note: null };
  }

  return { id: row.id, reaction: row.reaction, note: row.note };
}

/** 특정 기록·노출일의 기존 응답. */
export async function getPastEncounter(
  userId: string,
  sourceEntryId: string,
  surfacedDateKey: string,
): Promise<{ id: string; reaction: string | null; note: string | null } | null> {
  const row = await db.pastEncounter.findUnique({
    where: {
      userId_sourceEntryId_surfacedDateKey: {
        userId,
        sourceEntryId,
        surfacedDateKey,
      },
    },
    select: { id: true, reaction: true, note: true },
  });
  return row;
}
