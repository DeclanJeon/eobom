import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { db } from "../src/lib/db";
import { recordCheckin, getCheckin, isCheckinReaction } from "../src/lib/checkin";
import { toKstDateKey } from "../src/lib/kst";

let userId = "";
const dateKey = "2026-08-21";
const cardKey = "scripture:2026-08-21";

describe("DailyCheckIn (G008)", () => {
  beforeAll(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const user = await db.user.create({
      data: { email: `checkin-g008-${suffix}@test.local`, name: "g008", communityEnabled: true },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await db.dailyCheckIn.deleteMany({ where: { userId } }).catch(() => {});
    await db.eventLog.deleteMany({ where: { userId } }).catch(() => {});
    await db.reflectionEntry.deleteMany({ where: { userId } }).catch(() => {});
    await db.sharedReflection.deleteMany({ where: { ownerUserId: userId } }).catch(() => {});
    await db.user.deleteMany({ where: { id: userId } }).catch(() => {});
  });

  test("리액션 저장 — 1행, card_reaction 이벤트", async () => {
    const result = await recordCheckin({
      userId,
      dateKey,
      cardKey,
      reaction: "re_read",
      surface: "today",
    });
    expect(result.reaction).toBe("re_read");
    expect(result.promoted).toBe(false);
    const events = await db.eventLog.findMany({
      where: { userId, eventType: "card_reaction" },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    expect(JSON.parse(events[0]!.meta).cardKey).toBe(cardKey);
    expect(JSON.parse(events[0]!.meta).reaction).toBe("re_read");
  });

  test("리액션 변경 — update, 1행 유지", async () => {
    await recordCheckin({ userId, dateKey, cardKey, reaction: "still_hold" });
    const rows = await db.dailyCheckIn.count({ where: { userId, dateKey, cardKey } });
    expect(rows).toBe(1);
    const checkin = await getCheckin(userId, dateKey, cardKey);
    expect(checkin?.reaction).toBe("still_hold");
  });

  test("한 줄 저장 = quick 기록 승격(private) + entryId 연결 (G1·GATE-1)", async () => {
    const result = await recordCheckin({
      userId,
      dateKey,
      cardKey,
      oneLine: "오늘의 말씀 앞에 잠시 멈췄다.",
    });
    expect(result.promoted).toBe(true);
    expect(result.entryId).toBeTruthy();

    const entry = await db.reflectionEntry.findUnique({ where: { id: result.entryId! } });
    expect(entry?.templateType).toBe("quick");
    expect(entry?.shareVisibility).toBe("private"); // GATE-1
    // 커뮤니티 활성 + 한 줄 승격 → Together 게시 0건
    const shared = await db.sharedReflection.count({ where: { ownerUserId: userId } });
    expect(shared).toBe(0);

    const saved = await getCheckin(userId, dateKey, cardKey);
    expect(saved?.entryId).toBe(result.entryId);

    // 이벤트: one_line_saved + entry_created
    const types = (
      await db.eventLog.findMany({
        where: { userId, eventType: { in: ["one_line_saved", "entry_created"] } },
        orderBy: { createdAt: "desc" },
        take: 2,
      })
    ).map((e) => e.eventType).sort();
    expect(types).toEqual(["entry_created", "one_line_saved"]);
  });

  test("dateKey 미전달 → 서버 KST 오늘 계산 (C9)", async () => {
    const result = await recordCheckin({
      userId,
      cardKey: "scripture:server-date",
      reaction: "re_read",
    });
    expect(result.dateKey).toBe(toKstDateKey(new Date()));
    expect(result.dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("유효하지 않은 리액션은 null 처리", async () => {
    const result = await recordCheckin({
      userId,
      dateKey,
      cardKey: "scripture:bad-reaction",
      reaction: "nonsense",
    });
    expect(result.reaction).toBeNull();
  });

  test("한 줄 수정 — quick 엔트리 본문 동기화 (QA-1)", async () => {
    const first = await recordCheckin({
      userId,
      dateKey,
      cardKey: "scripture:sync-test",
      oneLine: "첫 번째 한 줄",
    });
    expect(first.promoted).toBe(true);

    // 두 번째 저장 — 동일 cardKey, 다른 한 줄 → 연결 엔트리 본문도 갱신
    const second = await recordCheckin({
      userId,
      dateKey,
      cardKey: "scripture:sync-test",
      oneLine: "수정된 한 줄",
    });
    expect(second.entryId).toBe(first.entryId);
    const entry = await db.reflectionEntry.findUnique({
      where: { id: first.entryId! },
      select: { reflectionBody: true, templateType: true },
    });
    expect(entry?.reflectionBody).toBe("수정된 한 줄"); // 카드와 엔트리 불일치 방지
    expect(entry?.templateType).toBe("quick");
  });

  test("one_line_saved·entry_created는 승격 1회당 1회씩 (QA-2)", async () => {
    const before = await db.eventLog.count({
      where: {
        userId,
        eventType: { in: ["one_line_saved", "entry_created"] },
        meta: { contains: '"quick":1' },
      },
    });
    await recordCheckin({
      userId,
      dateKey,
      cardKey: "scripture:event-once",
      oneLine: "이벤트 1회 검증",
    });
    const after = await db.eventLog.count({
      where: {
        userId,
        eventType: { in: ["one_line_saved", "entry_created"] },
        meta: { contains: '"quick":1' },
      },
    });
    expect(after - before).toBe(2); // one_line_saved 1 + entry_created 1
  });

  test("동시 승격 — 고아 엔트리 없음, 최종 1행·1엔트리 연결 (QA-3)", async () => {
    const cardKey = "scripture:race-test";
    const results = await Promise.allSettled([
      recordCheckin({ userId, dateKey, cardKey, oneLine: "동시 요청 A" }),
      recordCheckin({ userId, dateKey, cardKey, oneLine: "동시 요청 B" }),
    ]);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);

    const rows = await db.dailyCheckIn.count({ where: { userId, dateKey, cardKey } });
    expect(rows).toBe(1); // 1일 1행

    const row = await db.dailyCheckIn.findUnique({
      where: { userId_dateKey_cardKey: { userId, dateKey, cardKey } },
    });
    expect(row?.entryId).toBeTruthy();

    // 고아 quick 엔트리 없음 — cardKey 연결 엔트리 + 이 검증용(2개)만 존재
    const linked = await db.reflectionEntry.findUnique({ where: { id: row!.entryId! } });
    expect(linked?.templateType).toBe("quick");

    // 일치하지 않는 quick 엔트리(패배 요청분)가 남지 않았는지: 이 cardKey의 checkin이 가리키는
    // 엔트리 1개 외에 오늘 생성된 quick가 추가로 있으면 고아
    const orphanCount = await db.reflectionEntry.count({
      where: {
        userId,
        templateType: "quick",
        reflectionBody: { in: ["동시 요청 A", "동시 요청 B"] },
        id: { not: row!.entryId! },
      },
    });
    expect(orphanCount).toBe(0);
  });

  test("리액션 저장은 기존 한 줄을 보존한다 (G009 QA)", async () => {
    const cardKey = "scripture:preserve-one-line";
    await recordCheckin({
      userId,
      dateKey,
      cardKey,
      oneLine: "보존되어야 할 한 줄",
    });
    // oneLine 없이 리액션만 저장
    await recordCheckin({
      userId,
      dateKey,
      cardKey,
      reaction: "re_read",
      surface: "today",
    });
    const checkin = await getCheckin(userId, dateKey, cardKey);
    expect(checkin?.oneLine).toBe("보존되어야 할 한 줄"); // 덮어써지지 않음
    expect(checkin?.reaction).toBe("re_read");
  });

  test("isCheckinReaction 가드", () => {
    expect(isCheckinReaction("re_read")).toBe(true);
    expect(isCheckinReaction("changed_view")).toBe(true);
    expect(isCheckinReaction("angry")).toBe(false);
    expect(isCheckinReaction(null)).toBe(false);
  });
});
