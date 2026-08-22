import { existsSync } from "node:fs";
import path from "node:path";
import { openReadonlySqlite, type ReadonlyDb } from "@/lib/bible/sqlite-driver";

export type VerseCrossRef = {
  sourceRef: string;
  targetRef: string;
  targetCode: string;
  targetChapter: number;
  targetStart: number;
  targetEnd: number;
  votes: string;
  anchorPhrase: string;
  source: string;
  sourceName: string;
  license: string;
};

const ROOT = process.cwd();
const DB_PATH = path.join(ROOT, "data", "reference", "crossrefs.sqlite");

let db: ReadonlyDb | null | undefined;

function openDb() {
  if (db !== undefined) return db;
  if (!existsSync(DB_PATH)) { db = null; return db; }
  db = openReadonlySqlite(DB_PATH);
  return db;
}

export function getCrossRefRuntimeStatus() {
  const d = openDb();
  return { dbAvailable: !!d, path: DB_PATH };
}

function verseKey(code: string, chapter: number, verse: number) {
  return `${code} ${chapter}:${verse}`;
}

export function getCrossRefsForVerse(params: { code: string; chapter: number; verse: number; limit?: number }): { total: number; refs: VerseCrossRef[] } {
  const d = openDb();
  if (!d) return { total: 0, refs: [] };
  const code = params.code.toUpperCase();
  const key = verseKey(code, params.chapter, params.verse);
  const limit = params.limit ?? 50;

  const openRows = d.prepare(`SELECT from_key, to_code, to_chapter, to_start_verse, to_end_verse, to_label, votes, source FROM openbible_links WHERE from_key=? ORDER BY votes DESC, to_code LIMIT ?`).all(key, limit) as Array<{
    from_key: string; to_code: string; to_chapter: number; to_start_verse: number; to_end_verse: number; to_label: string; votes: number; source: string;
  }>;
  const phraseRows = d.prepare(`SELECT from_key, to_code, to_chapter, to_start_verse, to_end_verse, to_label, anchor_phrase, source FROM phrase_links WHERE from_key=? ORDER BY to_code LIMIT ?`).all(key, limit) as Array<{
    from_key: string; to_code: string; to_chapter: number; to_start_verse: number; to_end_verse: number; to_label: string; anchor_phrase: string; source: string;
  }>;

  const total = (d.prepare(`SELECT COUNT(*) as c FROM openbible_links WHERE from_key=?`).get(key) as { c: number } | undefined)?.c ?? 0;
  const phraseTotal = (d.prepare(`SELECT COUNT(*) as c FROM phrase_links WHERE from_key=?`).get(key) as { c: number } | undefined)?.c ?? 0;

  const refs: VerseCrossRef[] = [];
  for (const r of openRows) refs.push({
    sourceRef: r.from_key, targetRef: r.to_label, targetCode: r.to_code, targetChapter: r.to_chapter, targetStart: r.to_start_verse, targetEnd: r.to_end_verse,
    votes: String(r.votes), anchorPhrase: "", source: "openbible", sourceName: "OpenBible Cross References", license: "CC BY 4.0",
  });
  for (const r of phraseRows) refs.push({
    sourceRef: r.from_key, targetRef: r.to_label, targetCode: r.to_code, targetChapter: r.to_chapter, targetStart: r.to_start_verse, targetEnd: r.to_end_verse,
    votes: "", anchorPhrase: r.anchor_phrase, source: "crossreferences-kjv", sourceName: "Bible Cross References KJV", license: "CC BY-SA 4.0",
  });

  refs.sort((a, b) => (Number(b.votes || 0) - Number(a.votes || 0)) || a.targetCode.localeCompare(b.targetCode));

  return { total: total + phraseTotal, refs: refs.slice(0, limit) };
}

export function getCrossRefsForPassage(ref: { code: string; chapter: number; startVerse: number; endVerse: number }, limit = 80): { total: number; refs: VerseCrossRef[] } {
  const all: VerseCrossRef[] = [];
  let total = 0;
  for (let v = ref.startVerse; v <= ref.endVerse; v++) {
    const r = getCrossRefsForVerse({ code: ref.code, chapter: ref.chapter, verse: v, limit: 50 });
    total += r.total;
    all.push(...r.refs);
  }
  all.sort((a, b) => (Number(b.votes || 0) - Number(a.votes || 0)) || a.targetCode.localeCompare(b.targetCode));
  return { total, refs: all.slice(0, limit) };
}

export function getCrossRefsGroupedForPassage(
  ref: { code: string; chapter: number; startVerse: number; endVerse: number },
  limitPerVerse = 8,
): { total: number; byVerse: Array<{ verse: number; total: number; refs: VerseCrossRef[] }> } {
  const byVerse: Array<{ verse: number; total: number; refs: VerseCrossRef[] }> = [];
  let total = 0;
  for (let v = ref.startVerse; v <= ref.endVerse; v++) {
    const r = getCrossRefsForVerse({ code: ref.code, chapter: ref.chapter, verse: v, limit: limitPerVerse });
    total += r.total;
    byVerse.push({ verse: v, total: r.total, refs: r.refs });
  }
  return { total, byVerse };
}
