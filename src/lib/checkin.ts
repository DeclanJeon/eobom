/**
 * src/lib/checkin.ts
 * 오늘의 카드 응답 (DailyCheckIn) — B1·C4·G1.
 * - 리액션·한 줄은 전적으로 선택. 무응답이 정상 (카드를 본 것 = 완료).
 * - 한 줄 저장 = quick ReflectionEntry(private 강제, GATE-1) 승격 + entryId 연결.
 * - dateKey는 서버 KST 계산 (C9). cardKey 형식 D2.
 *
 * 동시성 (G008 QA-3): 승격 생성과 upsert를 하나의 트랜잭션으로 묶는다.
 * SQLite 단일 writer 직렬화로 losing 요청은 P2002 대신 update로 흡수되며,
 * 자신이 만든 quick 엔트리가 최종 행에 연결되지 않으면(다른 요청이 이김) 정리한다.
 */
import { db } from "@/lib/db";
import { logEvent, toKstDateKey } from "@/lib/events";
import { createQuickEntryRecord } from "@/lib/entries";
import { recordPastEncounter } from "@/lib/past-encounter";

export const CHECKIN_REACTIONS = [
  { code: "re_read", label: "다시 읽었어요" },
  { code: "still_hold", label: "아직 마음에 남아요" },
  { code: "changed_view", label: "지금은 다르게 보여요" },
] as const;

export type CheckinReaction = (typeof CHECKIN_REACTIONS)[number]["code"];

export function isCheckinReaction(v: string | null | undefined): v is CheckinReaction {
  return CHECKIN_REACTIONS.some((r) => r.code === v);
}

export type RecordCheckinInput = {
  userId: string;
  cardKey: string;
  /** dateKey 미전달 시 서버 KST 계산 (클라이언트 값 신뢰 금지, C9) */
  dateKey?: string;
  reaction?: string | null;
  oneLine?: string | null;
  surface?: string;
};

export type RecordCheckinResult = {
  id: string;
  dateKey: string;
  cardKey: string;
  reaction: string | null;
  oneLine: string | null;
  entryId: string | null;
  /** 한 줄이 기록으로 승격되었는지 */
  promoted: boolean;
};

/**
 * 카드 응답 기록 — 트랜잭션 기반 (1일 1행).
 * - reaction: 유효 코드만 저장 (변경 허용).
 * - oneLine: 첫 저장 시 quick ReflectionEntry 승격(private 강제) + 연결.
 *   이후 한 줄 수정 시: 연결 엔트리가 아직 quick이면 본문 동기화,
 *   full로 확장됐으면 엔트리를 건드리지 않는다 (G008 QA-1).
 * - 이벤트: 승격 1회당 one_line_saved·entry_created 1회씩 (QA-2 중복 방지),
 *   reaction은 card_reaction 1회. 모두 await 확정 (B4).
 */
export async function recordCheckin(
  input: RecordCheckinInput,
): Promise<RecordCheckinResult> {
  const dateKey = input.dateKey ?? toKstDateKey(new Date());
  const { cardKey } = input;
  const reactionProvided = input.reaction !== undefined;
  const reaction = input.reaction && isCheckinReaction(input.reaction)
    ? input.reaction
    : null;
  // oneLine 제공 여부 구분 (QA: 리액션만 저장 시 기존 한 줄 보존)
  const oneLineProvided = input.oneLine !== undefined;
  const oneLine = input.oneLine?.trim() || null;

  if ((reaction || oneLineProvided) && cardKey.startsWith("memory:")) {
    const sourceEntryId = cardKey.slice("memory:".length);
    const owned = sourceEntryId
      ? await db.reflectionEntry.findFirst({
          where: { id: sourceEntryId, userId: input.userId, deletedAt: null },
          select: { id: true },
        })
      : null;
    if (!owned) throw new Error("접근할 수 없는 기억 카드입니다.");
  }
  const existing = await db.dailyCheckIn.findUnique({
    where: {
      userId_dateKey_cardKey: { userId: input.userId, dateKey, cardKey },
    },
  });

  // 1) 행 upsert — 단일 writer 직렬화로 1일 1행 보장 (create/update 모두 원자).
  //    entryId는 승격 경로가 조건부로 관리하므로 여기서 갱신하지 않는다.
  //    oneLine/reaction은 명시적으로 제공됐을 때만 갱신 (미제공 값 보존).
  const row = await db.dailyCheckIn.upsert({
    where: {
      userId_dateKey_cardKey: { userId: input.userId, dateKey, cardKey },
    },
    create: {
      userId: input.userId,
      dateKey,
      cardKey,
      reaction,
      oneLine,
      entryId: existing?.entryId ?? null,
    },
    update: {
      ...(reactionProvided ? { reaction } : {}),
      oneLine: oneLineProvided ? oneLine : (existing?.oneLine ?? null),
    },
  });

  let createdEntryId: string | null = null;

  // 2) 한 줄 승격 — 조건부 원자 연결 (QA-3):
  //    entryId가 아직 null인 행에만 연결 성공. 동시 요청 중 정확히 1개만 승리하고,
  //    패배 요청은 자신이 만든 quick 엔트리를 즉시 정리한다 (고아 0).
  if (oneLineProvided && oneLine && !row.entryId) {
    const entry = await createQuickEntryRecord(db, input.userId, { body: oneLine });
    createdEntryId = entry.id;
    const linked = await db.dailyCheckIn.updateMany({
      where: { id: row.id, userId: input.userId, entryId: null },
      data: { entryId: entry.id },
    });
    if (linked.count !== 1) {
      // 다른 요청이 먼저 연결함. 사용자가 이미 다른 경로에서 접근한 엔트리나
      // 연결된 엔트리는 삭제하지 않고, 참조가 없는 동일 quick 행만 정리한다.
      const referenced = await db.dailyCheckIn.findFirst({
        where: { entryId: entry.id },
        select: { id: true },
      });
      if (!referenced) {
        await db.reflectionEntry.deleteMany({
          where: {
            id: entry.id,
            userId: input.userId,
            templateType: "quick",
            reflectionBody: oneLine,
          },
        }).catch(() => {});
      }
      createdEntryId = null;
    }
  } else if (oneLineProvided && oneLine && row.entryId) {
    // QA-1: 기존 연결 엔트리가 아직 quick이면 본문 동기화 (full 확장 후엔 건드리지 않음)
    const linked = await db.reflectionEntry.findUnique({
      where: { id: row.entryId },
      select: { templateType: true, reflectionBody: true },
    });
    if (linked?.templateType === "quick" && linked.reflectionBody !== oneLine) {
      await db.reflectionEntry.update({
        where: { id: row.entryId },
        data: { reflectionBody: oneLine },
      });
    }
  }

  // 3) 이벤트 — 승격 1회당 one_line_saved·entry_created 1회씩 (QA-2 중복 방지)
  if (createdEntryId) {
    await logEvent({
      userId: input.userId,
      eventType: "one_line_saved",
      meta: { entryId: createdEntryId, quick: 1 },
      fireAndForget: true,
    });
    await logEvent({
      userId: input.userId,
      eventType: "entry_created",
      meta: { entryId: createdEntryId, quick: 1 },
      fireAndForget: true,
    });
  }

  if (reaction) {
    await logEvent({
      userId: input.userId,
      eventType: "card_reaction",
      meta: {
        cardKey,
        reaction,
        ...(input.surface ? { surface: input.surface } : {}),
      },
      fireAndForget: true,
    });
  }
  if (reaction && cardKey.startsWith("memory:")) {
    // ownership는 함수 시작부에서 검증 완료. surfacedDateKey=서버 KST 오늘.
    const sourceEntryId = cardKey.slice("memory:".length);
    if (sourceEntryId) {
      await recordPastEncounter({
        userId: input.userId,
        sourceEntryId,
        surfacedDateKey: dateKey,
        reaction,
      });
    }
  }

  const final = await db.dailyCheckIn.findUnique({
    where: { id: row.id },
    select: { reaction: true, oneLine: true, entryId: true },
  });

  return {
    id: row.id,
    dateKey,
    cardKey,
    reaction: final?.reaction ?? null,
    oneLine: final?.oneLine ?? null,
    entryId: final?.entryId ?? null,
    promoted: Boolean(createdEntryId),
  };
}

/** 카드 초기 상태 — 오늘·cardKey의 기존 응답. */
export async function getCheckin(
  userId: string,
  dateKey: string,
  cardKey: string,
): Promise<{
  reaction: string | null;
  oneLine: string | null;
  entryId: string | null;
} | null> {
  const row = await db.dailyCheckIn.findUnique({
    where: {
      userId_dateKey_cardKey: { userId, dateKey, cardKey },
    },
    select: { reaction: true, oneLine: true, entryId: true },
  });
  return row;
}
