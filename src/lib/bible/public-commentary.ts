import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type PublicCommentaryExcerpt = {
  source: "matthew-henry";
  license: "Public Domain";
  text: string;
};

const ROOT = process.cwd();
const COMMENTARY_DIR = path.join(ROOT, "data", "reference", "public-commentary", "mhc");
const bookCache = new Map<string, string>();

function getBookText(code: string): string | null {
  const key = code.toUpperCase();
  const cached = bookCache.get(key);
  if (cached) return cached;
  const file = path.join(COMMENTARY_DIR, `${key}.md`);
  if (!existsSync(file)) return null;
  const text = readFileSync(file, "utf8");
  bookCache.set(key, text);
  return text;
}

/** 전체 MHC 원문은 corpus에 보존하고, UI에는 제한된 접힌 발췌만 전달한다. */
export function getPublicCommentaryExcerpt(code: string, chapter: number, maxChars = 1800): PublicCommentaryExcerpt | null {
  const text = getBookText(code);
  if (!text) return null;
  const heading = new RegExp(`^## .* ${chapter}장 — Matthew Henry\\s*$`, "m");
  const match = heading.exec(text);
  if (!match || match.index === undefined) return null;
  const start = match.index + match[0].length;
  const next = text.slice(start).search(/^## /m);
  const section = text.slice(start, next >= 0 ? start + next : undefined).trim();
  if (!section) return null;
  return { source: "matthew-henry", license: "Public Domain", text: section.slice(0, maxChars) };
}
