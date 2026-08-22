import { readFileSync, readdirSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const SOURCE_DIR = path.join(ROOT, "data", "reference", "public-commentary", "mhc");
const DB_PATH = path.join(ROOT, "data", "reference", "public-commentary.sqlite");

if (!existsSync(SOURCE_DIR)) throw new Error(`missing ${SOURCE_DIR}; run ingest-public-commentary.mjs first`);
mkdirSync(path.dirname(DB_PATH), { recursive: true });
rmSync(DB_PATH, { force: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode=WAL;
  PRAGMA synchronous=NORMAL;
  CREATE TABLE sources(
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    license TEXT NOT NULL,
    source_url TEXT NOT NULL,
    text_source_url TEXT NOT NULL
  );
  CREATE TABLE commentary_chapters(
    id INTEGER PRIMARY KEY,
    source_id TEXT NOT NULL,
    code TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    UNIQUE(source_id, code, chapter),
    FOREIGN KEY(source_id) REFERENCES sources(id)
  );
  CREATE INDEX commentary_chapters_lookup ON commentary_chapters(source_id, code, chapter);
`);

db.prepare("INSERT INTO sources VALUES (?, ?, ?, ?, ?)").run(
  "mhc",
  "Matthew Henry's Commentary on the Whole Bible",
  "Public Domain",
  "https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=MHC",
  "https://www.ccel.org/ccel/henry/mhc.html",
);
const insert = db.prepare("INSERT INTO commentary_chapters(source_id, code, chapter, title, body) VALUES (?, ?, ?, ?, ?)");
const files = readdirSync(SOURCE_DIR).filter((f) => f.endsWith(".md") && f !== "manifest.json");
let count = 0;
db.exec("BEGIN");
try {
  for (const file of files) {
    const code = path.basename(file, ".md");
    const text = readFileSync(path.join(SOURCE_DIR, file), "utf8");
    const matches = [...text.matchAll(/^## (.+?) (\d+)장 — Matthew Henry\s*$/gm)];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const next = matches[i + 1];
      const start = match.index + match[0].length;
      const body = text.slice(start, next?.index ?? text.length).trim();
      insert.run("mhc", code, Number(match[2]), match[1], body);
      count++;
    }
  }
  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  db.close();
  throw error;
}
db.exec("VACUUM");
db.close();
console.log(`wrote ${path.relative(ROOT, DB_PATH)} rows=${count} files=${files.length}`);
