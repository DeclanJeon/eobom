// 에이전트 세션 생성 헬퍼 — LLM 호출 없이 pick/save만 담당.
//   pick <N>            : 미완료 절 중 연결 밀도 상위 N개의 페이로드를 stdout으로 출력
//   save <jsonl-path>   : 에이전트가 작성한 레코드를 워크 체크포인트에 병합 (provider=agent)
import { readFileSync, appendFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CROSSREFS_DB = path.join(ROOT, "data", "reference", "crossrefs.sqlite");
const VPL_PATH = path.join(ROOT, "data", "bible", "ko", "canon_66_vpl.txt");
const WORK_PATH = path.join(ROOT, "data", "reference", "crossref-commentary-work.jsonl");
const DENSITY_PATH = path.join(ROOT, "data", "reference", "crossrefs-by-verse.csv");
const LINKS_PER_VERSE = 8;

function loadDone() {
  const done = new Set();
  if (!existsSync(WORK_PATH)) return done;
  for (const line of readFileSync(WORK_PATH, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      done.add(JSON.parse(line).key);
    } catch {
      /* broken line skip */
    }
  }
  return done;
}

function loadTexts() {
  const map = new Map();
  for (const line of readFileSync(VPL_PATH, "utf8").split("\n")) {
    const m = /^([A-Z0-9]+ \d+:\d+) (.+)$/.exec(line);
    if (m) map.set(m[1], m[2].trim());
  }
  return map;
}

function nextTargets(done, texts, n) {
  const rows = [];
  for (const line of readFileSync(DENSITY_PATH, "utf8").split("\n").slice(1)) {
    if (!line.trim()) continue;
    const cols = line.split(",");
    const ref = cols[0];
    const count = Number(cols[cols.length - 1]);
    if (!done.has(ref) && texts.has(ref)) rows.push({ ref, count });
  }
  rows.sort((a, b) => b.count - a.count || a.ref.localeCompare(b.ref));
  return rows.slice(0, n);
}

function topLinks(db, key) {
  const open = db
    .prepare(
      `SELECT to_code, to_chapter, to_start_verse, to_end_verse, to_label, votes, NULL AS anchor_phrase
         FROM openbible_links WHERE from_key=? AND votes >= 1`,
    )
    .all(key);
  const phrase = db
    .prepare(
      `SELECT to_code, to_chapter, to_start_verse, to_end_verse, to_label, 0 AS votes, anchor_phrase
         FROM phrase_links WHERE from_key=?`,
    )
    .all(key);
  const merged = new Map();
  for (const row of [...open, ...phrase]) {
    const coord = `${row.to_code}-${row.to_chapter}-${row.to_start_verse}-${row.to_end_verse}`;
    const existing = merged.get(coord);
    if (existing) {
      existing.votes = Math.max(existing.votes, row.votes);
      existing.anchor_phrase ||= row.anchor_phrase;
    } else {
      merged.set(coord, { coord, label: row.to_label, votes: row.votes, anchor: row.anchor_phrase || null });
    }
  }
  return [...merged.values()]
    .sort((a, b) => b.votes - a.votes || a.label.localeCompare(b.label))
    .slice(0, LINKS_PER_VERSE);
}

function pick(n) {
  const done = loadDone();
  const texts = loadTexts();
  const targets = nextTargets(done, texts, n);
  if (!targets.length) {
    console.log("[]");
    return;
  }
  const db = new DatabaseSync(CROSSREFS_DB, { readOnly: true });
  const payload = targets.map(({ ref }) => ({
    key: ref,
    text: texts.get(ref),
    links: topLinks(db, ref),
  }));
  db.close();
  console.log(JSON.stringify(payload, null, 1));
}

function save(jsonPath) {
  const done = loadDone();
  let saved = 0;
  let skipped = 0;
  for (const line of readFileSync(path.resolve(jsonPath), "utf8").split("\n")) {
    if (!line.trim()) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      skipped++;
      continue;
    }
    if (!rec.key || !rec.theme?.trim() || !rec.summary?.trim() || done.has(rec.key)) {
      skipped++;
      continue;
    }
    rec.provider = "agent";
    rec.model = "ox-alpha";
    appendFileSync(WORK_PATH, `${JSON.stringify(rec)}\n`);
    done.add(rec.key);
    saved++;
  }
  console.log(`saved=${saved} skipped=${skipped} total_done=${done.size}`);
}

const [, , cmd, arg] = process.argv;
if (cmd === "pick") pick(Number(arg) || 10);
else if (cmd === "save") save(arg);
else {
  console.error("usage: agent-commentary-pick.mjs pick <N> | save <jsonl>");
  process.exitCode = 1;
}
