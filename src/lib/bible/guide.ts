import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

export type GuideChapter = {
  chapter: number;
  title: string;
  background: string;
  content: string;
  observation: string;
};

export type GuideBook = {
  code: string;
  name: string;
  intro: string;
  chapters: GuideChapter[];
  characters: string[];
};

const GUIDE_DIR = path.join(process.cwd(), "data", "reference", "bible-guide");

function cleanField(s: string): string {
  return s.replace(/^\s+|\s+$/g, "").replace(/\*+/g, "").replace(/\n{2,}/g, "\n").trim();
}

function field(raw: string, key: string): string {
  const m = new RegExp(`\\*\\*${key}\\*\\*\\s*[:：]\\s*([\\s\\S]*?)(?=\\n\\s*-\\s*\\*\\*|\\n?-\\s|$)`).exec(raw);
  return cleanField(m ? m[1] : "");
}

/** `### 12장 — 제목` 헤더들을 챕터 번호·제목·나머지 텍스트로 나눈다. */
function heads(md: string): Array<{ chapter: number; title: string; raw: string }> {
  const parts = md.split(/^###\s*(\d+)장\s*[-—–]\s*(.+)$/m);
  const out: Array<{ chapter: number; title: string; raw: string }> = [];
  for (let i = 1; i + 2 < parts.length; i += 3) {
    out.push({ chapter: Number(parts[i]), title: parts[i + 1].trim(), raw: parts[i + 2] ?? "" });
  }
  return out;
}

export function parseBookGuide(md: string): GuideBook {
  const titleMatch = md.match(/^#\s*(.+?)\s*\(([^)]+)\)/m);
  const code = (titleMatch?.[2] || "").trim().toUpperCase();
  const name = (titleMatch?.[1] || code).trim();
  const introMatch = md.match(/##\s*책 소개\s*([\s\S]*?)(?=##\s*장별 배경|##\s*등장인물|$)/);
  const characterMatch = md.match(/##\s*등장인물 사전\s*([\s\S]*?)$/);

  const chapters = heads(md).map((h) => ({
    chapter: h.chapter,
    title: h.title,
    background: field(h.raw, "배경"),
    content: field(h.raw, "내용"),
    observation: field(h.raw, "관찰"),
  }));

  const characters = (characterMatch ? characterMatch[1] : "").split("\n")
    .map((line) => line.trim())
    .map((line) => line.match(/^(?:[-|]\s*)?\*\*([^*]+)\*\*\s*(?:[:：-]|\|)?\s*(.*)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => `${match[1].trim()} — ${match[2].trim()}`.replace(/\s+\|$/, ""))
    .filter((line) => line.length > 3);

  return { code, name, intro: cleanField(introMatch?.[1] ?? ""), chapters, characters };
}

const cache = new Map<string, GuideBook>();

export function getBookGuide(code: string): GuideBook | null {
  const c = code.trim().toUpperCase();
  const p = path.join(GUIDE_DIR, `${c}.md`);
  if (!existsSync(p)) return null;
  const cached = cache.get(c);
  if (cached) return cached;
  const guide = parseBookGuide(readFileSync(p, "utf8"));
  cache.set(c, guide);
  return guide;
}

export function getChapterGuide(code: string, chapter: number): GuideChapter | null {
  return getBookGuide(code)?.chapters.find((c) => c.chapter === chapter) ?? null;
}
