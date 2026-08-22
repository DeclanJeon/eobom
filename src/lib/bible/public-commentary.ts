import { existsSync } from "node:fs";
import path from "node:path";
import { openReadonlySqlite, type ReadonlyDb } from "@/lib/bible/sqlite-driver";

export type PublicCommentaryExcerpt = {
  source: "matthew-henry";
  license: "Public Domain";
  text: string;
};

const DB_PATH = path.join(process.cwd(), "data", "reference", "public-commentary.sqlite");
let db: ReadonlyDb | null | undefined;

function openDb(): ReadonlyDb | null {
  if (db !== undefined) return db;
  db = existsSync(DB_PATH) ? openReadonlySqlite(DB_PATH) : null;
  return db;
}

/** Full commentary remains in the indexed corpus; runtime reads one chapter row only. */
export function getPublicCommentaryExcerpt(code: string, chapter: number, maxChars = 1800): PublicCommentaryExcerpt | null {
  const d = openDb();
  if (!d) return null;
  const row = d.prepare("SELECT body FROM commentary_chapters WHERE source_id=? AND code=? AND chapter=? LIMIT 1").get("mhc", code.toUpperCase(), chapter) as { body?: string } | undefined;
  const body = row?.body?.trim();
  if (!body) return null;
  return { source: "matthew-henry", license: "Public Domain", text: body.slice(0, maxChars) };
}
