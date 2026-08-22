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
    CREATE TABLE openbible_links(
      from_key TEXT, to_code TEXT, to_chapter INTEGER, to_start_verse INTEGER, to_end_verse INTEGER, to_label TEXT, votes INTEGER, source TEXT
    );
    CREATE TABLE phrase_links(
      from_key TEXT, to_code TEXT, to_chapter INTEGER, to_start_verse INTEGER, to_end_verse INTEGER, to_label TEXT, votes INTEGER, anchor_phrase TEXT, source TEXT
    );
    CREATE INDEX idx_open_source ON openbible_links(from_key);
    CREATE INDEX idx_phrase_source ON phrase_links(from_key);
  `);

  const openInsert = db.prepare(`INSERT INTO openbible_links VALUES (?,?,?,?,?,?,?,?)`);
  const phraseInsert = db.prepare(`INSERT INTO phrase_links VALUES (?,?,?,?,?,?,?,?,?)`);
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
    const values = [
      row.source_ref,
      row.target_code,
      Number(row.target_chapter) || 0,
      Number(row.target_start_verse) || 0,
      Number(row.target_end_verse) || 0,
      row.target_ref,
      Number(row.votes) || 0,
    ];
    if (row.source === "openbible") {
      openInsert.run(...values, row.source);
    } else {
      phraseInsert.run(...values, row.anchor_phrase, row.source);
    }
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
