import { describe, expect, test } from "bun:test";
import {
  toKstDateKey,
  kstDateKeyToStart,
  sanitizeEventMeta,
  isEventType,
  isEntrySource,
  EVENT_TYPES,
  logEvent,
} from "../src/lib/events";
import { db } from "../src/lib/db";

describe("toKstDateKey", () => {
  test("KST 자정 경계에서 날짜가 UTC와 다르게 계산된다", () => {
    // 2026-08-20T15:30:00Z = 2026-08-21 00:30 KST
    const d = new Date("2026-08-20T15:30:00.000Z");
    expect(toKstDateKey(d)).toBe("2026-08-21");
  });

  test("KST 낮 시간은 UTC와 같은 날짜", () => {
    const d = new Date("2026-08-21T03:00:00.000Z"); // 12:00 KST
    expect(toKstDateKey(d)).toBe("2026-08-21");
  });

  test("UTC 23시는 KST 다음날", () => {
    const d = new Date("2026-08-21T23:30:00.000Z"); // 2026-08-22 08:30 KST
    expect(toKstDateKey(d)).toBe("2026-08-22");
  });
});

describe("kstDateKeyToStart", () => {
  test("dateKey를 KST 자정 UTC 시각으로 변환", () => {
    const start = kstDateKeyToStart("2026-08-21");
    // KST 2026-08-21 00:00 = UTC 2026-08-20 15:00
    expect(start?.toISOString()).toBe("2026-08-20T15:00:00.000Z");
  });

  test("잘못된 형식은 null", () => {
    expect(kstDateKeyToStart("2026-13-01")).toBeNull();
    expect(kstDateKeyToStart("2026-08-32")).toBeNull();
    expect(kstDateKeyToStart("20260821")).toBeNull();
  });
});

describe("sanitizeEventMeta", () => {
  test("ID·enum·numeric만 통과", () => {
    const meta = { entryId: "clyx123", quick: 1, verified: true };
    const out = JSON.parse(sanitizeEventMeta(meta));
    expect(out).toEqual({ entryId: "clyx123", quick: 1, verified: true });
  });

  test("원문 방지: 공백·CJK 자유 문자열은 구조적으로 차단 (C8)", () => {
    const meta = {
      entryId: "clyx123", // ID 패턴 통과
      body: "오늘 내가 남긴 묵상 원문입니다.", // CJK/공백 → 차단
      note: "안녕", // CJK → 차단
    };
    const out = JSON.parse(sanitizeEventMeta(meta));
    expect(out.entryId).toBe("clyx123");
    expect(out.body).toBeUndefined();
    expect(out.note).toBeUndefined();
  });

  test("cardKey 형식(콜론 포함)은 통과", () => {
    const meta = { cardKey: "scripture:2026-08-21", surface: "today" };
    const out = JSON.parse(sanitizeEventMeta(meta));
    expect(out.cardKey).toBe("scripture:2026-08-21");
    expect(out.surface).toBe("today");
  });

  test("값 64자 초과 문자열 제외", () => {
    const meta = { long: "x".repeat(65), ok: "short" };
    const out = JSON.parse(sanitizeEventMeta(meta));
    expect(out.long).toBeUndefined();
    expect(out.ok).toBe("short");
  });

  test("배열·객체 값 제외", () => {
    const meta = { arr: [1, 2] as unknown as string, nested: { a: 1 } as unknown as string };
    const out = JSON.parse(sanitizeEventMeta(meta));
    expect(out.arr).toBeUndefined();
    expect(out.nested).toBeUndefined();
  });
});

describe("event type/source enum", () => {
  test("정의된 이벤트만 허용", () => {
    expect(isEventType("entry_created")).toBe(true);
    expect(isEventType("nonsense")).toBe(false);
    expect(EVENT_TYPES).toContain("landing_seen");
    expect(EVENT_TYPES).toContain("card_impression");
    expect(EVENT_TYPES).toContain("card_reaction");
    expect(EVENT_TYPES).toContain("one_line_saved");
    expect(EVENT_TYPES).toContain("entry_created");
    expect(EVENT_TYPES).toContain("return_landing");
  });

  test("entry source enum", () => {
    expect(isEntrySource("nfc")).toBe(true);
    expect(isEntrySource("email")).toBe(true);
    expect(isEntrySource("unknown")).toBe(true);
    expect(isEntrySource("bookmark")).toBe(false);
  });
});

describe("logEvent (DB)", () => {
  test("잘못된 eventType은 throw", async () => {
    await expect(
      logEvent({ eventType: "invalid_event" as never, fireAndForget: false }),
    ).rejects.toThrow();
  });

  test("fireAndForget=true는 실패를 삼킨다", async () => {
    // db.eventLog.create를 임시로 throw로 교체해 실제 실패 경로를 강제 (QA-3)
    const delegate = db.eventLog as unknown as {
      create: (...args: never[]) => Promise<unknown>;
    };
    const original = delegate.create;
    delegate.create = async () => {
      throw new Error("forced db failure");
    };
    try {
      await expect(
        logEvent({ eventType: "entry_created", fireAndForget: true }),
      ).resolves.toBeUndefined();
      await expect(
        logEvent({ eventType: "entry_created", fireAndForget: false }),
      ).rejects.toThrow("forced db failure");
    } finally {
      delegate.create = original;
    }
  });

  test("logEvent 출력 매핑 — guest/seatId/dateKey/entrySource 기본값/meta sanitize", async () => {
    await logEvent({
      userId: null,
      seatId: "e01",
      eventType: "landing_seen",
      entrySource: "bookmark", // 비정의 소스 → unknown 기본값
      meta: { seatId: "e01" },
    });
    const row = await db.eventLog.findFirst({
      where: { seatId: "e01", eventType: "landing_seen" },
      orderBy: { createdAt: "desc" },
    });
    expect(row).not.toBeNull();
    expect(row!.userId).toBeNull();
    expect(row!.entrySource).toBe("unknown");
    expect(row!.dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(JSON.parse(row!.meta).seatId).toBe("e01");
    await db.eventLog.delete({ where: { id: row!.id } });
  });
});
