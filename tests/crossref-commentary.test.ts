import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import path from "node:path";
// bun 테스트 러너는 node:sqlite를 resolve하지 못하므로 bun:sqlite를 사용한다.
import { Database } from "bun:sqlite";

const DB_PATH = path.join(process.cwd(), "data/reference/crossref-commentary.sqlite");
const WORK_PATH = path.join(process.cwd(), "data/reference/crossref-commentary-work.jsonl");

// 커버리지 상수 — 현재 배치(DeepSeek 2,772절 + 에이전트 24절) 기준.
// generate:crossref-commentary로 전체 생성이 완료되면 이 값을 실제 총계(29,276)로 승격할 것.
const EXPECTED_MIN_VERSES = 2700;

function openDb() {
  return new Database(DB_PATH, { readonly: true });
}

describe("crossref-commentary DB", () => {
  test("sqlite + 체크포인트 존재", () => {
    expect(existsSync(DB_PATH)).toBe(true);
    expect(existsSync(WORK_PATH)).toBe(true);
  });

  test("metadata에 AI 생성 출처 기록", () => {
    const db = openDb();
    const rows = db.prepare("SELECT key, value FROM metadata").all() as Array<{ key: string; value: string }>;
    const meta = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    expect(meta.source).toBe("ai-generated");
    expect(meta.prompt_version).toBe("1");
    expect(meta.model_provider?.split(",") ?? []).toContain("deepseek");
    expect(meta.model_name).toContain("deepseek-v4-flash");
    expect(meta.disclaimer).toContain("AI 초안");
    db.close();
  });

  test("절 해설 커버리지 — 최소 임계", () => {
    const db = openDb();
    const { c } = db.prepare("SELECT COUNT(*) c FROM verse_commentary").get() as { c: number };
    expect(c).toBeGreaterThanOrEqual(EXPECTED_MIN_VERSES);
    db.close();
  });

  test("고밀도 절(연결 100개+)은 반드시 포함", () => {
    const db = openDb();
    for (const key of ["ACT 24:25", "ACT 26:18", "LUK 24:44", "MAT 5:18", "ISA 9:6"]) {
      const row = db.prepare("SELECT theme, summary FROM verse_commentary WHERE verse_key=?").get(key) as
        | { theme: string; summary: string }
        | undefined;
      expect(row, `${key} 해설 부재`).toBeTruthy();
      expect(row!.theme.length).toBeGreaterThan(3);
      expect(row!.summary).toMatch(/[가-힣]/);
    }
    db.close();
  });

  test("모든 해설 텍스트는 한국어(순수 ASCII 행 없음)", () => {
    const db = openDb();
    const verses = db.prepare("SELECT theme, summary FROM verse_commentary").all() as Array<{
      theme: string;
      summary: string;
    }>;
    const nonKoVerses = verses.filter((r) => !/[가-힣]/.test(r.summary));
    expect(nonKoVerses).toEqual([]);

    const links = db.prepare("SELECT why FROM link_commentary WHERE why != ''").all() as Array<{ why: string }>;
    expect(links.length).toBeGreaterThan(10000);
    const nonKoLinks = links.filter((r) => !/[가-힣]/.test(r.why));
    expect(nonKoLinks).toEqual([]);
    db.close();
  });

  test("link_commentary 좌표 무결성 + 고아 없음", () => {
    const db = openDb();
    const badCoords = db
      .prepare(
        "SELECT COUNT(*) c FROM link_commentary WHERE target_chapter < 1 OR target_start < 1 OR target_end < target_start",
      )
      .get() as { c: number };
    expect(badCoords.c).toBe(0);

    const orphans = db
      .prepare(
        "SELECT COUNT(*) c FROM link_commentary l WHERE NOT EXISTS (SELECT 1 FROM verse_commentary v WHERE v.verse_key = l.verse_key)",
      )
      .get() as { c: number };
    expect(orphans.c).toBe(0);

    const emptyWhy = db
      .prepare("SELECT COUNT(*) c FROM link_commentary WHERE trim(why) = ''")
      .get() as { c: number };
    expect(emptyWhy.c).toBe(0);
    db.close();
  });
});
