import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { db } from "../src/lib/db";
import {
  createRetreatEvent,
  eventMessageFor,
  eventMessageForSeat,
  EVENT_MESSAGE_DAYS,
} from "../src/lib/retreat-event";
import { kstDateKeyToStart } from "../src/lib/kst";

let eventId = "";
let seatId = "";
let seatSlug = "";

describe("retreat-event (G013)", () => {
  beforeAll(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const seat = await db.journalSeat.create({
      data: { slug: `e-ev-${suffix}`, seatCode: `EV-${suffix}` },
    });
    seatId = seat.id;
    seatSlug = seat.slug;
    const event = await createRetreatEvent({
      slug: `retreat-${suffix}`,
      title: "2026 여름 수련회",
      kind: "retreat",
      periodEnd: new Date("2026-07-22T00:00:00.000Z"), // KST 7/22 09:00
      messagePrompt: "수련회에서 붙잡은 결단이 오늘도 이어지길 바랍니다.",
      seatIds: [seat.id],
    });
    eventId = event.id;
  });

  afterAll(async () => {
    await db.journalSeat.deleteMany({ where: { id: seatId } }).catch(() => {});
    await db.event.deleteMany({ where: { id: eventId } }).catch(() => {});
  });

  test("이벤트 생성 + 좌석 바인딩", async () => {
    const seat = await db.journalSeat.findUnique({ where: { id: seatId } });
    expect(seat?.eventId).toBe(eventId);
    const event = await db.event.findUnique({ where: { id: eventId } });
    expect(event?.title).toBe("2026 여름 수련회");
  });

  test("DAY 30 윈도우(±3) — 종료 30일 후 메시지 반환", () => {
    const periodEnd = new Date("2026-07-22T00:00:00.000Z");
    // 30일 후 KST — 2026-08-21 (KST)
    const now = new Date("2026-08-21T03:00:00.000Z");
    const result = eventMessageFor(periodEnd, now, "결단이 이어지길");
    expect(result).not.toBeNull();
    expect(result?.day).toBe(30);
    expect(result?.label).toContain("30");
    expect(result?.message).toBe("결단이 이어지길");
  });

  test("윈도우 밖(예: 종료 10일 후)은 null", () => {
    const periodEnd = new Date("2026-07-22T00:00:00.000Z");
    const now = new Date("2026-08-01T03:00:00.000Z"); // 10일 후
    expect(eventMessageFor(periodEnd, now, "메시지")).toBeNull();
  });

  test("DAY 90 윈도우(±7)", () => {
    const periodEnd = new Date("2026-07-22T00:00:00.000Z");
    const now = new Date("2026-10-19T03:00:00.000Z"); // 89일 후
    const result = eventMessageFor(periodEnd, now, "90일 메시지");
    expect(result?.day).toBe(90);
  });

  test("messagePrompt 없으면 null", () => {
    const periodEnd = new Date("2026-07-22T00:00:00.000Z");
    const now = new Date("2026-08-21T03:00:00.000Z");
    expect(eventMessageFor(periodEnd, now, null)).toBeNull();
  });

  test("eventMessageForSeat — 좌석 slug로 이벤트 연동", async () => {
    const now = new Date("2026-08-21T03:00:00.000Z"); // 종료 30일 후 (KST)
    const result = await eventMessageForSeat(seatSlug, now);
    expect(result).not.toBeNull();
    expect(result?.label).toBe("수련회가 끝난 지 30일");
  });

  test("없는 좌석 바인딩은 이벤트와 함께 rollback", async () => {
    await expect(
      createRetreatEvent({
        slug: `invalid-${Date.now()}`,
        title: "실패 이벤트",
        seatIds: [seatId, "missing-seat-id"],
      }),
    ).rejects.toThrow("요청한 키링 좌석을 모두 찾을 수 없습니다.");
    const leftover = await db.event.findFirst({ where: { title: "실패 이벤트" } });
    expect(leftover).toBeNull();
  });

  test("이미 이벤트에 바인딩된 좌석 재할당은 rollback", async () => {
    await expect(
      createRetreatEvent({
        slug: `rebind-${Date.now()}`,
        title: "재할당 실패 이벤트",
        seatIds: [seatId],
      }),
    ).rejects.toThrow("요청한 키링 좌석을 모두 찾을 수 없습니다.");
    const seat = await db.journalSeat.findUnique({ where: { id: seatId } });
    expect(seat?.eventId).toBe(eventId);
    const leftover = await db.event.findFirst({ where: { title: "재할당 실패 이벤트" } });
    expect(leftover).toBeNull();
  });

  test("DAY 정의 — 30/90", () => {
    expect(EVENT_MESSAGE_DAYS.map((d) => d.day)).toEqual([30, 90]);
  });
});
