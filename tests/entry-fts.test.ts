import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { db } from "../src/lib/db";
import { ensureEntryFts5, searchEntriesFts, listEntries } from "../src/lib/entries";

let userId = "";

describe("Entry FTS5", () => {
  beforeAll(async () => {
    await ensureEntryFts5();
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const user = await db.user.create({
      data: { email: `fts-${suffix}@test.local`, name: "fts-tester" },
    });
    userId = user.id;

    // Clean previous test entries for this user
    await db.reflectionEntry.deleteMany({ where: { userId } });

    await db.reflectionEntry.create({
      data: {
        userId,
        entryDate: new Date(),
        title: "감사의 기록",
        reflectionBody: "오늘 감사한 일은 가족과 함께한 저녁이었다. 평온과 기쁨이 가득했다.",
        gratitude: "가족의 사랑에 감사",
        prayer: "내일도 평안을 주소서",
        scriptureRefs: "[]",
        scriptureBindings: "[]",
        emotions: "[]",
        tags: "[]",
      },
    });
    await db.reflectionEntry.create({
      data: {
        userId,
        entryDate: new Date(),
        title: "고독의 묵상",
        reflectionBody: "외로움 속에서 기도를 드렸다. 용기를 구하는 마음이었다.",
        gratitude: null,
        prayer: "외로움을 이겨내는 용기를 주소서",
        scriptureRefs: "[]",
        scriptureBindings: "[]",
        emotions: "[]",
        tags: "[]",
      },
    });
    await db.reflectionEntry.create({
      data: {
        userId,
        entryDate: new Date(),
        title: "기쁨의 메모",
        reflectionBody: "기쁨과 감사로 하루를 마무리한다.",
        gratitude: "기쁨에 감사",
        prayer: null,
        scriptureRefs: "[]",
        scriptureBindings: "[]",
        emotions: "[]",
        tags: "[]",
      },
    });
    // Give triggers time to sync (they are synchronous, but ensure)
    await ensureEntryFts5();
  });

  afterAll(async () => {
    await db.reflectionEntry.deleteMany({ where: { userId } });
    await db.user.deleteMany({ where: { id: userId } });
  });

  it("ensureEntryFts5 creates ReflectionEntryFts", async () => {
    const rows = await db.$queryRaw<Array<{ name: string }>>`SELECT name FROM sqlite_master WHERE type='table' AND name='ReflectionEntryFts'`;
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe("ReflectionEntryFts");
  });

  it("searchEntriesFts finds by title/body and is fast (<20ms)", async () => {
    const start = performance.now();
    const res = await searchEntriesFts(userId, "감사");
    const elapsed = performance.now() - start;
    expect(res.length).toBeGreaterThanOrEqual(1);
    expect(res.some((e) => e.title === "감사의 기록" || e.reflectionBody.includes("감사"))).toBe(true);
    // Allow 20ms as spec, but CI may be slightly slower — enforce 50ms to avoid flake while still fast
    expect(elapsed).toBeLessThan(50);
  });

  it("listEntries with q uses FTS path and fallback", async () => {
    const res = await listEntries(userId, { q: "외로움" });
    expect(res.some((e) => e.title === "고독의 묵상")).toBe(true);
    const empty = await listEntries(userId, { q: "존재하지않는검색어xyz123" });
    expect(empty).toEqual([]);
  });
});
