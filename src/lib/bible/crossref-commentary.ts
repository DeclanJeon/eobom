import { existsSync } from "node:fs";
import path from "node:path";
import { openReadonlySqlite, type ReadonlyDb } from "@/lib/bible/sqlite-driver";

export type VerseCommentary = {
  theme: string;
  summary: string;
};

const ROOT = process.cwd();
const DB_PATH = path.join(ROOT, "data", "reference", "crossref-commentary.sqlite");

let db: ReadonlyDb | null | undefined;

function openDb() {
  // 파일 부재 상태는 캐시하지 않는다 — 재빌드 창(window)에 열어둔 프로세스가
  // 영구적으로 빈 응답을 내는 것을 막는다.
  if (db) return db;
  if (!existsSync(DB_PATH)) {
    db = null;
    return db;
  }
  db = openReadonlySqlite(DB_PATH);
  return db;
}

export function getCrossrefCommentaryRuntimeStatus() {
  const d = openDb();
  return { dbAvailable: !!d, path: DB_PATH };
}

export function getVerseCommentary(code: string, chapter: number, verse: number): VerseCommentary | null {
  const d = openDb();
  if (!d) return null;
  const row = d
    .prepare(`SELECT theme, summary FROM verse_commentary WHERE verse_key=?`)
    .get(`${code.toUpperCase()} ${chapter}:${verse}`) as { theme: string; summary: string } | undefined;
  return row ? { theme: row.theme, summary: row.summary } : null;
}

export function getLinkCommentaries(code: string, chapter: number, verse: number): Map<string, string> {
  const map = new Map<string, string>();
  const d = openDb();
  if (!d) return map;
  const rows = d
    .prepare(
      `SELECT target_code, target_chapter, target_start, target_end, why
         FROM link_commentary WHERE verse_key=?`,
    )
    .all(`${code.toUpperCase()} ${chapter}:${verse}`) as Array<{
    target_code: string;
    target_chapter: number;
    target_start: number;
    target_end: number;
    why: string;
  }>;
  for (const row of rows) {
    map.set(`${row.target_code}-${row.target_chapter}-${row.target_start}-${row.target_end}`, row.why);
  }
  return map;
}

/** refs에 why를 붙인다. target 좌표가 일치하는 link_commentary 행만 매칭. */
export function attachLinkCommentaries<T extends { targetCode: string; targetChapter: number; targetStart: number; targetEnd: number }>(
  code: string,
  chapter: number,
  verse: number,
  refs: T[],
): void {
  const map = getLinkCommentaries(code, chapter, verse);
  if (map.size === 0) return;
  for (const ref of refs) {
    const why = map.get(`${ref.targetCode}-${ref.targetChapter}-${ref.targetStart}-${ref.targetEnd}`);
    if (why) (ref as T & { why?: string }).why = why;
  }
}

/** 구간 병합 응답처럼 출발 절이 섞인 refs에 대해 sourceRef("GEN 1:1") 기준으로 why를 붙인다. */
export function attachLinkCommentariesBySourceRef<T extends { sourceRef: string; targetCode: string; targetChapter: number; targetStart: number; targetEnd: number }>(
  refs: T[],
): void {
  const bySource = new Map<string, Map<string, string>>();
  for (const ref of refs) {
    if (!bySource.has(ref.sourceRef)) {
      const match = /^(\S+) (\d+):(\d+)$/.exec(ref.sourceRef);
      bySource.set(
        ref.sourceRef,
        match ? getLinkCommentaries(match[1], Number(match[2]), Number(match[3])) : new Map(),
      );
    }
  }
  for (const ref of refs) {
    const why = bySource.get(ref.sourceRef)?.get(`${ref.targetCode}-${ref.targetChapter}-${ref.targetStart}-${ref.targetEnd}`);
    if (why) (ref as T & { why?: string }).why = why;
  }
}
