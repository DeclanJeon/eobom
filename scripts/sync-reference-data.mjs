import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BIBLE_ROOT = path.resolve(ROOT, "../bible");
const OUT_DIR = path.join(ROOT, "data", "reference");

const sources = [
  { from: path.join(BIBLE_ROOT, "data", "knowledge", "crossrefs.csv"), to: path.join(OUT_DIR, "crossrefs.csv") },
  { from: path.join(BIBLE_ROOT, "data", "knowledge", "crossrefs-by-verse.csv"), to: path.join(OUT_DIR, "crossrefs-by-verse.csv") },
  { from: path.join(BIBLE_ROOT, "data", "knowledge", "crossrefs.sqlite"), to: path.join(OUT_DIR, "crossrefs.sqlite") },
  { from: path.join(BIBLE_ROOT, "data", "chapter-background", "chapter-background.sqlite"), to: path.join(OUT_DIR, "chapter-background.sqlite") },
  { from: path.join(BIBLE_ROOT, "data", "chapter-background", "ko.json"), to: path.join(OUT_DIR, "chapter-background-ko.json") },
  { from: path.join(BIBLE_ROOT, "data", "chapter-background", "en.json"), to: path.join(OUT_DIR, "chapter-background-en.json") },
];

mkdirSync(OUT_DIR, { recursive: true });

let copied = 0;
let missing = 0;

for (const { from, to } of sources) {
  if (!existsSync(from)) {
    console.warn(`missing: ${path.relative(BIBLE_ROOT, from)}`);
    missing += 1;
    continue;
  }
  mkdirSync(path.dirname(to), { recursive: true });
  cpSync(from, to);
  const size = statSync(to).size;
  console.log(`copied ${path.relative(ROOT, to)} (${(size / 1024 / 1024).toFixed(1)} MB)`);
  copied += 1;
}

// 성경 66권 장·인물 해설 마크다운 — 디렉토리 통째 복사
const GUIDE_SRC = path.join(BIBLE_ROOT, "data", "reference", "bible-guide");
const GUIDE_DST = path.join(OUT_DIR, "bible-guide");
if (existsSync(GUIDE_SRC)) {
  mkdirSync(GUIDE_DST, { recursive: true });
  const guideFiles = readdirSync(GUIDE_SRC).filter((f) => f.endsWith(".md"));
  for (const f of guideFiles) {
    cpSync(path.join(GUIDE_SRC, f), path.join(GUIDE_DST, f));
  }
  console.log(`bible-guide: ${guideFiles.length}개 복사`);
} else {
  console.warn("bible-guide 원본 없음");
}

if (existsSync(path.join(OUT_DIR, "crossrefs.csv"))) {
  const head = readFileSync(path.join(OUT_DIR, "crossrefs.csv"), "utf8").split("\n").slice(0, 2).join("\n");
  console.log(`\nhead crossrefs.csv:\n${head.slice(0, 400)}`);
}

console.log(`\ndone: ${copied} copied, ${missing} missing → ${path.relative(ROOT, OUT_DIR)} (bible-guide ${guideFiles.length}개)`);
