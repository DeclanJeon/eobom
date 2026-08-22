import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import path from "node:path";
// bun 테스트 러너는 node:sqlite를 resolve하지 못하므로 bun:sqlite를 사용한다.
import { Database } from "bun:sqlite";

const DB_PATH = path.join(process.cwd(), "data/reference/crossref-commentary.sqlite");
const WORK_PATH = path.join(process.cwd(), "data/reference/crossref-commentary-work.jsonl");

function openDb() {
  return new Database(DB_PATH, { readonly: true });
}

// TODO(별도 작업): 절별 AI 해설(crossref-commentary) 생성은 미완성. 완성 전까지 skip.
describe.skip("crossref-commentary DB", () => {
  test("sqlite + 체크포인트 존재", () => {
    expect(existsSync(DB_PATH)).toBe(true);
    expect(existsSync(WORK_PATH)).toBe(true);
  });

  test("metadata에 AI 생성 출처 기록", () => {
    const db = new Database(DB_PATH, { readonly: true });
    const rows = db.prepare("SELECT key, value FROM metadata").all() as Array<{ key: string; value: string }>;
    const meta = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    expect(meta.source).toBe("ai-generated");
    expect(meta.prompt_version).toBe("1");
    expect(meta.model_provider?.length ?? 0).toBeGreaterThan(0);
    expect(meta.model_name?.length ?? 0).toBeGreaterThan(0);
    expect(meta.disclaimer).toContain("AI 초안");
    db.close();
  });

  test("절 해설 커버리지 — 교차 성구 대상 절 전체", () => {
    const db = new Database(DB_PATH, { readonly: true });
    const { c } = db.prepare("SELECT COUNT(*) c FROM verse_commentary").get() as { c: number };
    // 대상 절은 29,276개(VPL 본문이 있는 절). 누락 없이 생성됐는지 회귀 방어한다.
    expect(c).toBe(29276);
    db.close();
  });

  test("GEN 1:1 / ROM 8:28 해설 존재 + 한국어", () => {
    const db = new Database(DB_PATH, { readonly: true });
    for (const key of ["GEN 1:1", "ROM 8:28"]) {
      const row = db.prepare("SELECT theme, summary FROM verse_commentary WHERE verse_key=?").get(key) as
        | { theme: string; summary: string }
        | undefined;
      expect(row).toBeTruthy();
      expect(row!.theme.length).toBeGreaterThan(3);
      expect(row!.summary).toMatch(/[가-힣]/);
    }
    db.close();
  });

  test("모든 해설 텍스트는 한국어(순수 ASCII 행 없음)", () => {
    const db = new Database(DB_PATH, { readonly: true });
    const verses = db.prepare("SELECT theme, summary FROM verse_commentary").all() as Array<{
      theme: string;
      summary: string;
    }>;
    const nonKoVerses = verses.filter((r) => !/[가-힣]/.test(r.summary));
    expect(nonKoVerses).toEqual([]);

    const links = db.prepare("SELECT why FROM link_commentary WHERE why != ''").all() as Array<{ why: string }>;
    const nonKoLinks = links.filter((r) => !/[가-힣]/.test(r.why));
    expect(nonKoLinks).toEqual([]);
    db.close();
  });

  test("link_commentary 좌표 무결성 + 고아 없음", () => {
    const db = new Database(DB_PATH, { readonly: true });
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
    db.close();
  });
});
