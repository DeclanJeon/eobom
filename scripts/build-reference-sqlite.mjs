import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { DatabaseSync } from "node:sqlite";
import { existsSync, rmSync } from "node:fs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSV_PATH = path.join(ROOT, "data", "reference", "crossrefs.csv");
const DB_PATH = path.join(ROOT, "data", "reference", "crossrefs.sqlite");

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ",") { out.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

async function main() {
  if (!existsSync(CSV_PATH)) {
    console.error(`missing ${CSV_PATH} — run sync:reference first`);
    process.exitCode = 1;
    return;
  }

  if (existsSync(DB_PATH)) rmSync(DB_PATH);

  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA synchronous=NORMAL;
    CREATE TABLE metadata(key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE crossref_edges(
      source_code TEXT, source_chapter INTEGER, source_verse INTEGER, source_ref TEXT,
      target_code TEXT, target_chapter INTEGER, target_start_verse INTEGER, target_end_verse INTEGER, target_ref TEXT,
      votes TEXT, anchor_phrase TEXT, source TEXT, source_name TEXT, license TEXT
    );
    CREATE INDEX idx_edges_source ON crossref_edges(source_code, source_chapter, source_verse);
    CREATE INDEX idx_edges_target ON crossref_edges(target_code, target_chapter, target_start_verse, target_end_verse);
  `);

  const insert = db.prepare(`INSERT INTO crossref_edges VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const meta = db.prepare(`INSERT INTO metadata VALUES (?,?)`);
  meta.run("built_at", new Date().toISOString());
  meta.run("source", "crossrefs.csv");

  let count = 0;
  const stream = createReadStream(CSV_PATH, "utf8");
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  let header = true;
  let headers = [];
  db.exec("BEGIN");
  for await (const line of rl) {
    if (!line) continue;
    if (header) { headers = parseCsvLine(line); header = false; continue; }
    const cols = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? ""]));
    insert.run(
      row.source_code, Number(row.source_chapter) || 0, Number(row.source_verse) || 0, row.source_ref,
      row.target_code, Number(row.target_chapter) || 0, Number(row.target_start_verse) || 0, Number(row.target_end_verse) || 0, row.target_ref,
      row.votes, row.anchor_phrase, row.source, row.source_name, row.license
    );
    count++;
    if (count % 100000 === 0) {
      db.exec("COMMIT"); db.exec("BEGIN");
      console.log(`... ${count}`);
    }
  }
  db.exec("COMMIT");
  db.exec("VACUUM");
  db.close();
  console.log(`wrote ${path.relative(ROOT, DB_PATH)} rows=${count}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
