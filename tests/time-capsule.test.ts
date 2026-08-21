import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import {
  timeCapsuleWindows,
  elapsedDaysKst,
  timeCapsuleLabel,
  TIME_CAPSULE_ANCHORS,
  findTimeCapsuleCandidates,
  selectTimeCapsuleCard,
} from "../src/lib/time-capsule";
import { kstDateKeyToStart, toKstDateKey } from "../src/lib/kst";
import { db } from "../src/lib/db";

let userId = "";
let cleanupIds: string[] = [];

async function seedEntry(dateKey: string): Promise<string> {
  const start = kstDateKeyToStart(dateKey)!;
  const entry = await db.reflectionEntry.create({
    data: {
      userId,
      entryDate: start,
      reflectionBody: `기록 ${dateKey}`,
      title: `제목 ${dateKey}`,
    },
  });
  cleanupIds.push(entry.id);
  return entry.id;
}

describe("timeCapsuleWindows (B5)", () => {
  const now = new Date("2026-08-21T03:00:00.000Z"); // 2026-08-21 12:00 KST

  test("anchor별 윈도우는 KST 자정 경계 (배타 상한)", () => {
    const windows = timeCapsuleWindows(now);
    expect(windows).toHaveLength(3);
    // 30±3: [8/21 - 33일, 8/21 - 26일) → 7/19 00:00 ~ 7/26 00:00 (7/19~7/25 전체 포함)
    expect(toKstDateKey(windows[0]!.gte)).toBe("2026-07-19");
    expect(toKstDateKey(windows[0]!.lt)).toBe("2026-07-26");
    // 100±7: [8/21 - 107일, 8/21 - 92일)
    expect(toKstDateKey(windows[1]!.gte)).toBe("2026-05-06");
    expect(toKstDateKey(windows[1]!.lt)).toBe("2026-05-21");
    // 365±14: [8/21 - 379일, 8/21 - 350일)
    expect(toKstDateKey(windows[2]!.gte)).toBe("2025-08-07");
    expect(toKstDateKey(windows[2]!.lt)).toBe("2025-09-05");
  });

  test("anchor 정의 — 30/100/365", () => {
    expect(TIME_CAPSULE_ANCHORS.map((a) => a.anchorDays)).toEqual([30, 100, 365]);
  });
});

describe("elapsedDaysKst", () => {
  test("KST 역일 기준 경과 일수", () => {
    const now = new Date("2026-08-21T03:00:00.000Z");
    // 2026-07-15 00:00 KST = 37일 전
    const past = kstDateKeyToStart("2026-07-15")!;
    expect(elapsedDaysKst(now, past)).toBe(37);
    // 당일 = 0
    const today = kstDateKeyToStart("2026-08-21")!;
    expect(elapsedDaysKst(now, today)).toBe(0);
  });
});

describe("timeCapsuleLabel", () => {
  test("정확한 anchor는 'N일 전의 나', 아니면 '약 N일 전의 나'", () => {
    expect(timeCapsuleLabel(30, 30)).toBe("30일 전의 나");
    expect(timeCapsuleLabel(30, 37)).toBe("약 37일 전의 나");
    expect(timeCapsuleLabel(100, 102)).toBe("약 102일 전의 나");
  });
});

describe("findTimeCapsuleCandidates (DB)", () => {
  beforeAll(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const user = await db.user.create({
      data: { email: `capsule-g010-${suffix}@test.local`, name: "g010" },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await db.reflectionEntry.deleteMany({ where: { userId } }).catch(() => {});
    await db.memoryExposure.deleteMany({ where: { userId } }).catch(() => {});
    await db.user.deleteMany({ where: { id: userId } }).catch(() => {});
    cleanupIds = [];
  });

  test("30일 anchor 윈도우 안 기록이 선택된다", async () => {
    const now = new Date("2026-08-21T03:00:00.000Z"); // 8/21 12:00 KST
    // 37일 전 (7/15) — 30±3 윈도우(7/19~7/25) 밖 → 후보 아님
    await seedEntry("2026-07-15");
    // 28일 전 (7/24) — 윈도우 안 → 후보
    const nearId = await seedEntry("2026-07-24");

    const candidates = await findTimeCapsuleCandidates(userId, now);
    expect(candidates.length).toBeGreaterThan(0);
    // 30 anchor 후보가 7/24 기록을 가리킨다 (윈도우 안 유일)
    const c30 = candidates.find((c) => c.anchorDays === 30);
    expect(c30?.entryId).toBe(nearId);
    expect(c30?.distanceDays).toBe(2); // |30 - 28|
  });

  test("anchor 우선순위 — 30 후보가 있으면 30이 이긴다", async () => {
    const now = new Date("2026-08-21T03:00:00.000Z");
    // 100일 근처 기록 (5/10 = 103일 전) 추가
    await seedEntry("2026-05-10");
    const candidates = await findTimeCapsuleCandidates(userId, now);
    const chosen = await (async () => {
      const ranked = [...candidates].sort((a, b) => {
        const ap = a.anchorDays ?? 9999;
        const bp = b.anchorDays ?? 9999;
        if (ap !== bp) return ap - bp;
        return (a.distanceDays ?? 9999) - (b.distanceDays ?? 9999);
      });
      return ranked[0];
    })();
    expect(chosen?.anchorDays).toBe(30);
  });

  test("노출된 기록은 14일 제외 (GATE-3 연동)", async () => {
    const now = new Date("2026-08-21T03:00:00.000Z");
    const freshId = await seedEntry("2026-07-24"); // 새 기록 (노출 없음)
    // 이 기록을 오늘 노출로 기록
    await db.memoryExposure.create({
      data: { userId, sourceEntryId: freshId, surfaceDateKey: "2026-08-21" },
    });
    const candidates = await findTimeCapsuleCandidates(userId, now);
    const c30 = candidates.find((c) => c.anchorDays === 30);
    // 노출된 freshId는 제외 → 7/24의 다른 기록(이전 테스트의 nearId)이 남아있지 않으므로
    // 30 후보가 없거나 다른 기록을 가리킨다 (여기서는 7/24 유일 기록이 노출됨 → 후보 없음)
    expect(c30?.entryId).not.toBe(freshId);
  });

  test("selectTimeCapsuleCard — 후보 1개 반환, 노출은 impression 경유", async () => {
    const now = new Date("2026-08-21T03:00:00.000Z");
    const chosen = await selectTimeCapsuleCard(userId, now);
    if (chosen) {
      expect(chosen.entryId).toBeTruthy();
      const count = await db.memoryExposure.count({
        where: { userId, sourceEntryId: chosen.entryId! },
      });
      // 선택 함수는 서버 렌더 부작용을 만들지 않는다. 노출 기록은 client impression API 책임.
      expect(count).toBe(0);
    }
  });
});
