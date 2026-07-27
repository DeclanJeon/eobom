import { readFileSync } from "node:fs";
import path from "node:path";
import { getBook, isValidBookCode } from "./book-meta";
import { parseSlug, toBinding } from "./format";
import { parseBibleReferences } from "./parse";
import type {
  BibleReference,
  BibleVerse,
  PassageResult,
  ScriptureBinding,
} from "./types";

const VPL_LINE = /^([0-9A-Z]{3})\s+(\d+):(\d+)\s+(.*)$/;
const CHAPTER_CACHE_LIMIT = 64;

let chapterIndex: Map<string, Map<number, BibleVerse[]>> | null = null;
const chapterCache = new Map<string, BibleVerse[]>();

function dataRoot() {
  return path.join(process.cwd(), "data", "bible", "ko");
}

function ensureIndex() {
  if (chapterIndex) return chapterIndex;
  const map = new Map<string, Map<number, BibleVerse[]>>();
  const raw = readFileSync(path.join(dataRoot(), "canon_66_vpl.txt"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line) continue;
    const m = line.match(VPL_LINE);
    if (!m) continue;
    const code = m[1];
    const chapter = Number(m[2]);
    const verse = Number(m[3]);
    const text = m[4] ?? "";
    let bookMap = map.get(code);
    if (!bookMap) {
      bookMap = new Map();
      map.set(code, bookMap);
    }
    let verses = bookMap.get(chapter);
    if (!verses) {
      verses = [];
      bookMap.set(chapter, verses);
    }
    verses.push({ code, chapter, verse, text });
  }
  chapterIndex = map;
  return map;
}

function cacheKey(code: string, chapter: number) {
  return `${code}:${chapter}`;
}

export function listChapterVerses(code: string, chapter: number): BibleVerse[] {
  const upper = code.toUpperCase();
  if (!isValidBookCode(upper) || chapter < 1) return [];
  const key = cacheKey(upper, chapter);
  const hit = chapterCache.get(key);
  if (hit) return hit;

  const idx = ensureIndex();
  const verses = idx.get(upper)?.get(chapter) ?? [];
  chapterCache.set(key, verses);
  if (chapterCache.size > CHAPTER_CACHE_LIMIT) {
    const first = chapterCache.keys().next().value;
    if (first) chapterCache.delete(first);
  }
  return verses;
}

export function getVerseCounts(code: string): number[] | null {
  const book = getBook(code);
  if (!book) return null;
  const idx = ensureIndex();
  const bookMap = idx.get(book.code);
  if (!bookMap) return Array.from({ length: book.chapters }, () => 0);
  const counts: number[] = [];
  for (let c = 1; c <= book.chapters; c += 1) {
    counts.push(bookMap.get(c)?.length ?? 0);
  }
  return counts;
}

function sliceVerses(ref: BibleReference): BibleVerse[] {
  const all = listChapterVerses(ref.code, ref.chapter);
  return all.filter(
    (v) => v.verse >= ref.startVerse && v.verse <= ref.endVerse,
  );
}

function excerptFrom(verses: BibleVerse[], max = 180): string {
  const text = verses.map((v) => v.text).join(" ").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

export function getPassageFromRef(ref: BibleReference): PassageResult | null {
  if (!isValidBookCode(ref.code)) return null;
  const book = getBook(ref.code);
  if (!book || ref.chapter < 1 || ref.chapter > book.chapters) return null;
  const verses = sliceVerses(ref);
  if (!verses.length) return null;
  const binding = toBinding(ref, {
    excerpt: excerptFrom(verses),
    translation: "ko-open-bible",
  });
  return { binding, verses };
}

export function getPassageBySlug(slug: string): PassageResult | null {
  const ref = parseSlug(slug);
  if (!ref) return null;
  return getPassageFromRef(ref);
}

export function getPassageByInput(input: string): PassageResult | null {
  const refs = parseBibleReferences(input);
  if (!refs[0]) return null;
  return getPassageFromRef(refs[0]);
}

export function parseUserInput(input: string): {
  ok: ScriptureBinding[];
  failed: string[];
} {
  const chunks = input
    .split(/[;；\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const ok: ScriptureBinding[] = [];
  const failed: string[] = [];
  const seen = new Set<string>();

  const tryOne = (text: string) => {
    const refs = parseBibleReferences(text);
    if (!refs.length) {
      failed.push(text);
      return;
    }
    for (const ref of refs) {
      const passage = getPassageFromRef(ref);
      if (!passage) {
        failed.push(text);
        continue;
      }
      if (seen.has(passage.binding.slug)) continue;
      seen.add(passage.binding.slug);
      ok.push(passage.binding);
    }
  };

  if (chunks.length <= 1) {
    tryOne(input.trim());
  } else {
    for (const chunk of chunks) tryOne(chunk);
  }

  return { ok, failed };
}
