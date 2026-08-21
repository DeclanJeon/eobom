import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { db } from "../src/lib/db";
import { createQuickEntry, titleFromBody, updateEntry } from "../src/lib/entries";
import { logEvent } from "../src/lib/events";

let userId = "";
let cleanupIds: string[] = [];

describe("GATE-1 quick 기록 private 강제", () => {
  beforeAll(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const user = await db.user.create({
      data: {
        email: `quick-gate1-${suffix}@test.local`,
        name: "gate1",
        communityEnabled: true, // 가장 위험한 조합: 커뮤니티 활성 + quick 저장
        aiProcessingConsent: true,
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    for (const id of cleanupIds) {
      await db.reflectionEntry.deleteMany({ where: { id } }).catch(() => {});
    }
    await db.user.deleteMany({ where: { id: userId } }).catch(() => {});
    await db.eventLog.deleteMany({ where: { userId } }).catch(() => {});
  });

  test("communityEnabled=true + quick save → SharedReflection 0건", async () => {
    const entry = await createQuickEntry(userId, { body: "오늘 말씀 앞에 잠시 멈췄다." });
    cleanupIds.push(entry.id);

    // GATE-1 증명: quick 저장만으로는 절대 Together에 게시되지 않는다
    const shared = await db.sharedReflection.count({
      where: { ownerUserId: userId, deletedAt: null },
    });
    expect(shared).toBe(0);

    // 비공개·quick 강제
    expect(entry.shareVisibility).toBe("private");
    expect(entry.templateType).toBe("quick");
  });

  test("제목은 본문에서 자동 생성, 성구 없이 저장 가능", async () => {
    const entry = await createQuickEntry(userId, {
      body: "마음이 무거운 날, 주님의 평안을 붙든다.",
    });
    cleanupIds.push(entry.id);
    expect(entry.title).toBeTruthy();
    expect(entry.title!.startsWith("마음이 무거운 날")).toBe(true);
    expect(entry.scriptureRefs).toHaveLength(0);
  });

  test("빈 본문은 거부", async () => {
    await expect(createQuickEntry(userId, { body: "   " })).rejects.toThrow();
  });

  test("one_line_saved + entry_created 이벤트 기록", async () => {
    const entry = await createQuickEntry(userId, { body: "이벤트 검증용 한 줄" });
    cleanupIds.push(entry.id);
    const all = await db.eventLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 2,
    });
    const types = all.map((e) => e.eventType).sort();
    expect(types).toEqual(["entry_created", "one_line_saved"]);
    for (const e of all) {
      expect(JSON.parse(e.meta).entryId).toBe(entry.id);
      expect(JSON.parse(e.meta).quick).toBe(1);
    }
  });

  test("quick → full 승격 시 private 유지 (명시적 공개 전 게시 없음)", async () => {
    const entry = await createQuickEntry(userId, { body: "승격 테스트" });
    cleanupIds.push(entry.id);

    const updated = await updateEntry(userId, entry.id, {
      reflectionBody: entry.reflectionBody,
      title: entry.title ?? undefined,
      templateType: "full",
      shareVisibility: "private", // 폼 기본값 — 명시적 공개 아님
    });
    expect(updated.templateType).toBe("full");
    expect(updated.shareVisibility).toBe("private");
    const shared = await db.sharedReflection.count({
      where: { ownerUserId: userId, deletedAt: null },
    });
    expect(shared).toBe(0);
  });
});

describe("titleFromBody", () => {
  test("markdown 제거 후 40자 제한", () => {
    const t = titleFromBody("# 오늘 **말씀** 앞에서 마음에 평안이 찾아왔습니다. 길게 이어지는 본문 내용");
    expect(t.includes("#")).toBe(false);
    expect(t.includes("**")).toBe(false);
    expect(t.length).toBeLessThanOrEqual(41); // 40자 + "…"
  });

  test("빈 본문은 기본 제목", () => {
    expect(titleFromBody("   ")).toBe("오늘의 묵상");
  });
});
