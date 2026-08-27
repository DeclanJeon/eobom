// 에이전트 세션 생성 헬퍼 — LLM 호출 없이 pick/save만 담당.
//   pick <N> [wid] [W]  : 미완료 절 중 연결 밀도 상위 N개의 페이로드를 stdout으로 출력
//                         wid/W 지정 시 hash(ref)%W==wid 버킷만 담당 (병렬 워커 분할)
//   save <jsonl-path>   : 에이전트가 작성한 레코드를 워크 체크포인트에 병합 (provider=agent)
//   status [W]          : 전체 완료/잔여 및 버킷별 잔여 현황 출력
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

function nextTargets(done, texts, n, wid, W, tail) {
  const rows = [];
  for (const line of readFileSync(DENSITY_PATH, "utf8").split("\n").slice(1)) {
    if (!line.trim()) continue;
    const cols = line.split(",");
    const ref = cols[0];
    const count = Number(cols[cols.length - 1]);
    if (done.has(ref) || !texts.has(ref)) continue;
    if (W && wid !== undefined && hashRef(ref) % W !== wid) continue;
    rows.push({ ref, count });
  }
  rows.sort((a, b) => tail
    ? a.count - b.count || a.ref.localeCompare(b.ref)
    : b.count - a.count || a.ref.localeCompare(b.ref));
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

function hashRef(ref) {
  let h = 5381;
  for (let i = 0; i < ref.length; i++) h = ((h << 5) + h + ref.charCodeAt(i)) >>> 0;
  return h;
}

function pick(n, wid, W, tail) {
  const done = loadDone();
  const texts = loadTexts();
  const targets = nextTargets(done, texts, n, wid, W, tail === "tail");
  if (!targets.length) {
    console.log("[]");
    return;
  }
  const db = new DatabaseSync(CROSSREFS_DB, { readOnly: true });
  // 컨텍스트 절약: 한 줄당 한 절(JSONL), 불필요 필드 제외
  for (const { ref } of targets) {
    console.log(
      JSON.stringify({
        key: ref,
        text: texts.get(ref),
        links: topLinks(db, ref).map((l) => [l.coord, l.label, l.votes, l.anchor || null]),
      }),
    );
  }
  db.close();
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

function status(W) {
  const done = loadDone();
  const texts = loadTexts();
  let remaining = 0;
  const buckets = W ? new Map() : null;
  for (const line of readFileSync(DENSITY_PATH, "utf8").split("\n").slice(1)) {
    if (!line.trim()) continue;
    const ref = line.split(",")[0];
    if (!texts.has(ref)) continue;
    if (!done.has(ref)) {
      remaining++;
      if (buckets) buckets.set(hashRef(ref) % W, (buckets.get(hashRef(ref) % W) || 0) + 1);
    }
  }
  const total = done.size + remaining;
  console.log(`total=${total} done=${done.size} remaining=${remaining} (${((done.size / total) * 100).toFixed(1)}%)`);
  if (buckets) for (const [wid, cnt] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) console.log(`bucket ${wid}: remaining=${cnt}`);
}

const [, , cmd, arg, arg2, arg3, arg4] = process.argv;
if (cmd === "pick") {
  const wid = arg2 !== undefined && arg2 !== "" ? Number(arg2) : undefined;
  const W = arg3 !== undefined && arg3 !== "" ? Number(arg3) : undefined;
  pick(Number(arg) || 10, wid, W, arg4);
} else if (cmd === "save") save(arg);
else if (cmd === "status") status(arg !== undefined ? Number(arg) : undefined);
else {
  console.error("usage: agent-commentary-pick.mjs pick <N> [workerId] [numWorkers] | save <jsonl> | status [numWorkers]");
  process.exitCode = 1;
}
