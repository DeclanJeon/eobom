import { getBookGuide, getChapterGuide } from "@/lib/bible/guide";
import { existsSync } from "node:fs";
import path from "node:path";
import { openReadonlySqlite, type ReadonlyDb } from "@/lib/bible/sqlite-driver";

export type ChapterBackground = {
  id: string; code: string; chapter: number; testament: string; locale: string;
  overview: string; historical: string; literary: string; theological: string;
  keyVerses: { reference: string; why: string }[]; cautions: string[]; sources: { id: string; title: string; url?: string; license?: string; retrievedAt: string; sourceTier: number }[];
  version: string; generatedAt: string; guide?: ChapterGuideContent;
};
export type ChapterGuideContent = {
  intro: string;
  title: string;
  background: string;
  content: string;
  observation: string;
  characters: string[];
};

const ROOT = process.cwd();
const DB_PATH = path.join(ROOT, "data", "reference", "chapter-background.sqlite");
let db: ReadonlyDb | null | undefined;

function openDb() {
  if (db !== undefined) return db;
  if (!existsSync(DB_PATH)) { db = null; return db; }
  db = openReadonlySqlite(DB_PATH);
  return db;
}

function rowToBg(row: Record<string, unknown>): ChapterBackground {
  const id = String(row.id ?? "");
  const baseId = id.includes(":") ? id.split(":")[0] : id;
  let keyVerses: ChapterBackground["keyVerses"] = [];
  let cautions: string[] = [];
  let sources: ChapterBackground["sources"] = [];
  try { keyVerses = JSON.parse(String(row.key_verses_json ?? "[]")); } catch {}
  try { cautions = JSON.parse(String(row.cautions_json ?? "[]")); } catch {}
  try { sources = JSON.parse(String(row.sources_json ?? "[]")); } catch {}
  return {
    id: baseId, code: String(row.code ?? ""), chapter: Number(row.chapter ?? 0), testament: String(row.testament ?? ""), locale: String(row.locale ?? ""),
    overview: String(row.overview ?? ""), historical: String(row.historical ?? ""), literary: String(row.literary ?? ""), theological: String(row.theological ?? ""),
    keyVerses, cautions, sources, version: String(row.version ?? ""), generatedAt: String(row.generated_at ?? ""),
  };
}

export function getChapterBackground(params: { code: string; chapter: number; locale?: string }): ChapterBackground | null {
  const locale = params.locale === "en" ? "en" : "ko";
  const code = params.code.toUpperCase();
  const guide = getChapterGuide(code, params.chapter);
  const bookGuide = getBookGuide(code);
  const d = openDb();
  let row: Record<string, unknown> | undefined;
  if (d) {
    row = d.prepare(`SELECT * FROM chapter_background WHERE code=? AND chapter=? AND locale=? LIMIT 1`).get(code, params.chapter, locale) as Record<string, unknown> | undefined;
    if (!row && locale === "ko") row = d.prepare(`SELECT * FROM chapter_background WHERE code=? AND chapter=? AND locale='en' LIMIT 1`).get(code, params.chapter) as Record<string, unknown> | undefined;
  }
  const sqliteBackground = row ? rowToBg(row) : null;
  if (!guide) return sqliteBackground;

  const base = sqliteBackground ?? {
    id: `${code}-${params.chapter}`,
    code,
    chapter: params.chapter,
    testament: "",
    locale,
    overview: "",
    historical: "",
    literary: "",
    theological: "",
    keyVerses: [],
    cautions: [],
    sources: [],
    version: "bible-guide",
    generatedAt: "",
  };
  return {
    ...base,
    overview: guide.content || guide.background || base.overview,
    guide: {
      intro: bookGuide?.intro ?? "",
      title: guide.title,
      background: guide.background,
      content: guide.content,
      observation: guide.observation,
      characters: bookGuide?.characters ?? [],
    },
  };
}
