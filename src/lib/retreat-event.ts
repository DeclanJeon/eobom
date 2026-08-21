/**
 * src/lib/retreat-event.ts
 * 단체·수련회 이벤트 (G013, v1.3 §3.8).
 * - Event + JournalSeat.eventId 바인딩.
 * - DAY 30/90 타임캡슐: 이벤트 종료 후 30±3 / 90±7일이 되면
 *   카드에 messagePrompt(기획 작성 메시지)를 표시한다.
 * - messagePrompt는 사용자 원문이 아니다 (수련회 리더가 작성한 공용 메시지).
 */
import { db } from "@/lib/db";
import { elapsedDaysKst } from "@/lib/time-capsule";

export const EVENT_MESSAGE_DAYS = [
  { day: 30, window: 3 },
  { day: 90, window: 7 },
] as const;

export type EventMessageResult = {
  eventId?: string;
  day: number;
  actualDays: number;
  label: string; // "수련회가 끝난 지 30일"
  message: string;
};

export function eventMessageFor(
  periodEnd: Date,
  now: Date,
  messagePrompt: string | null,
): EventMessageResult | null {
  if (!messagePrompt) return null;
  const actual = elapsedDaysKst(now, periodEnd);
  for (const { day, window } of EVENT_MESSAGE_DAYS) {
    if (Math.abs(day - actual) <= window) {
      return {
        day,
        actualDays: actual,
        label: `수련회가 끝난 지 ${actual}일`,
        message: messagePrompt,
      };
    }
  }
  return null;
}

export type RetreatEventInput = {
  slug: string;
  title: string;
  kind?: string;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  messagePrompt?: string | null;
  seatIds?: string[];
};

/** 이벤트 생성 + 좌석 바인딩 (원자). */
export async function createRetreatEvent(input: RetreatEventInput) {
  return db.$transaction(async (tx) => {
    const event = await tx.event.create({
      data: {
        slug: input.slug,
        title: input.title,
        kind: input.kind ?? "retreat",
        periodStart: input.periodStart ?? null,
        periodEnd: input.periodEnd ?? null,
        messagePrompt: input.messagePrompt ?? null,
      },
    });
    if (input.seatIds?.length) {
      const seatIds = [...new Set(input.seatIds)];
      const updated = await tx.journalSeat.updateMany({
        // 이미 이벤트에 바인딩된 좌석은 재할당 금지 — count 불일치로 전체 rollback.
        where: { id: { in: seatIds }, eventId: null },
        data: { eventId: event.id },
      });
      if (updated.count !== seatIds.length) {
        throw new Error("요청한 키링 좌석을 모두 찾을 수 없습니다.");
      }
    }
    return event;
  });
}

/** 소유자 키링의 이벤트 DAY 메시지 — 라우트 slug 기준. */
export async function eventMessageForSeat(
  seatSlug: string,
  now: Date,
): Promise<EventMessageResult | null> {
  const seat = await db.journalSeat.findUnique({
    where: { slug: seatSlug },
    include: { event: true },
  });
  const event = seat?.event;
  if (!event?.periodEnd || !event.messagePrompt) return null;
  const result = eventMessageFor(event.periodEnd, now, event.messagePrompt);
  return result ? { ...result, eventId: event.id } : null;
}
