import { existsSync, readFileSync, appendFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CROSSREFS_DB = path.join(ROOT, "data", "reference", "crossrefs.sqlite");
const VPL_PATH = path.join(ROOT, "data", "bible", "ko", "canon_66_vpl.txt");
const OUT_JSONL = process.env.COMMENTARY_WORK_PATH
  ? path.resolve(process.env.COMMENTARY_WORK_PATH)
  : path.join(ROOT, "data", "reference", "crossref-commentary-work.jsonl");
const OUT_DB = process.env.COMMENTARY_OUT_DB
  ? path.resolve(process.env.COMMENTARY_OUT_DB)
  : path.join(ROOT, "data", "reference", "crossref-commentary.sqlite");

const BATCH_SIZE = Number(process.env.COMMENTARY_BATCH || 8);
const LINKS_PER_VERSE = Number(process.env.COMMENTARY_LINKS || 8);
const COMMENTARY_CONCURRENCY = Number(process.env.COMMENTARY_CONCURRENCY || 4);
const PROMPT_VERSION = "1";
const REQUEST_DELAY_MS = Number(process.env.COMMENTARY_DELAY_MS || 300);
const SMOKE_LIMIT = Number(process.env.COMMENTARY_SMOKE_LIMIT || 0);
const BUILD_ONLY = process.env.COMMENTARY_BUILD_ONLY === "1";

// 간단한 .env 로더 — 이미 설정된 환경변수는 유지한다.
function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    if (process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

// --- provider chain (src/lib/mimo.ts 패턴 이식) ---

const DEFAULT_MIMO_TIMEOUT_MS = 120_000;
const DEFAULT_DEEPSEEK_TIMEOUT_MS = 60_000;

function readTimeoutMs(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function buildProviders() {
  const wanted = (process.env.COMMENTARY_PROVIDERS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const providers = [];
  const mimoKey = process.env.MIMO_API_KEY?.trim();
  if (mimoKey && (!wanted.length || wanted.includes("mimo"))) {
    providers.push({
      name: "mimo",
      apiKey: mimoKey,
      baseURL: (process.env.MIMO_BASE_URL || "https://api.xiaomimimo.com/v1").replace(/\/$/, ""),
      model: process.env.MIMO_MODEL || "mimo-v2.5",
      timeoutMs: readTimeoutMs("MIMO_TIMEOUT_MS", DEFAULT_MIMO_TIMEOUT_MS),
    });
  }
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (deepseekKey && (!wanted.length || wanted.includes("deepseek"))) {
    providers.push({
      name: "deepseek",
      apiKey: deepseekKey,
      baseURL: (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, ""),
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      timeoutMs: readTimeoutMs("DEEPSEEK_TIMEOUT_MS", DEFAULT_DEEPSEEK_TIMEOUT_MS),
    });
  }
  return providers;
}

function extractJson(content) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start >= 0 && end > start) return content.slice(start, end + 1);
  throw new Error("No JSON in model response");
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    let fixed;
    try {
      fixed = JSON.parse(text.replace(/,(\s*[}\]])/g, "$1").replace(/,\s*$/gm, ""));
    } catch {
      return null;
    }
    return fixed;
  }
}

const SYSTEM_PROMPT = `당신은 성경 교차 참조 데이터를 분석해 한국어 해설 초안을 작성하는 도우미입니다.

입력으로 여러 개의 절이 주어집니다. 각 절에는 본문(한국어 번역)과 그 절에 연결된 상위 참조 목록(참조, 추천 수, 연결 앵커 문구)이 함께 주어집니다.

각 절마다 다음을 작성하세요:
- theme: 이 절이 연결 성구들과 이루는 주제를 잡은 한 줄 제목 (예: "고난 가운데 섭리")
- summary: 연결 성구들이 공유하는 주제 흐름을 설명하는 2~4문장. 본문 비교 관찰만 서술.
- links: 각 참조마다 "왜 이 본문과 연결되는가"를 1~2문장으로. 두 본문을 실제로 읽어 비교할 수 있게 구체적으로.

절대 금지:
- 하나님의 뜻 판정, 예언 선언, 교리적 단정 ("하나님은 반드시 ~하신다" 등). 관찰 가능한 본문 비교만.
- 나열된 참조와 앵커 문구로 근거를 대지 못하는 연결 이유. 억지 해설 금지 — 근거가 부족하면 why를 빈 문자열("")로 남기세요.
- 영어 사용. 모든 텍스트는 한국어.

출력은 반드시 아래 형태의 JSON 객체 하나만. 다른 텍스트 없이.
{"verses":[{"key":"GEN 1:1","theme":"...","summary":"...","links":[{"target":"GEN 1:2","why":"..."}]}]}

links.target은 입력에 주어진 참조 문자열을 그대로 쓰고, 입력에 없던 참조를 만들지 마세요.`;

function buildUserPrompt(items) {
  const payload = items.map((item) => ({
    key: item.key,
    text: item.text,
    links: item.links.map((l) => ({
      ref: l.to_label,
      votes: l.votes,
      anchor: l.anchor_phrase || undefined,
    })),
  }));
  return `다음 절들의 연결 해설 JSON을 작성하세요.\n${JSON.stringify({ verses: payload })}`;
}

async function requestBatch(provider, items) {
  const res = await fetch(`${provider.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.3,
      ...(provider.name === "deepseek"
        ? { max_tokens: 8192, thinking: { type: "disabled" } }
        : { max_completion_tokens: 8192 }),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(items) },
      ],
    }),
    signal: AbortSignal.timeout(provider.timeoutMs),
  });

  if (!res.ok) {
    const text = await res.text();
    const error = new Error(`[${provider.name}] HTTP ${res.status}: ${text.slice(0, 200)}`);
    error.status = res.status;
    throw error;
  }

  const data = await res.json();
  const message = data.choices?.[0]?.message;
  const content = message?.content?.trim() || message?.reasoning_content?.trim() || "";
  if (!content) throw new Error(`[${provider.name}] returned empty content`);

  const parsed = safeParseJson(extractJson(content));
  if (!parsed || !Array.isArray(parsed.verses)) {
    throw new Error(`[${provider.name}] JSON shape invalid`);
  }
  return parsed.verses;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateBatch(providers, items) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    let lastError = null;
    for (const provider of providers) {
      try {
        return { verses: await requestBatch(provider, items), provider };
      } catch (error) {
        lastError = error;
        if (error.status === 429) break; // rate limit → 백오프 후 재시작
        console.warn(`  [${provider.name}] attempt failed: ${String(error.message ?? error).slice(0, 160)}`);
      }
    }
    if (!lastError) break;
    if (attempt === 6) throw lastError;
    const backoffMs = Math.min(30_000, 2_000 * 2 ** attempt);
    console.warn(`  retry ${attempt}/6 in ${backoffMs}ms (${lastError.message?.slice(0, 120)})`);
    await sleep(backoffMs);
  }
}

// --- 입력 수집 ---

function loadVerseTexts() {
  const map = new Map();
  for (const line of readFileSync(VPL_PATH, "utf8").split("\n")) {
    // VPL 형식: "GEN 1:1 본문…" — 키는 "BOOK C:V" (공백 두 개로 구분)
    const match = /^([A-Z0-9]+ \d+:\d+) (.+)$/.exec(line);
    if (!match) continue;
    map.set(match[1], match[2].trim());
  }
  return map;
}

function collectTargetVerses(db, verseTexts) {
  const rows = db.prepare(
    `SELECT from_key,
            to_code, to_chapter, to_start_verse, to_end_verse, to_label, votes,
            NULL AS anchor_phrase, 'openbible' AS src
       FROM openbible_links WHERE votes >= 1
      UNION ALL
     SELECT from_key,
            to_code, to_chapter, to_start_verse, to_end_verse, to_label, 0 AS votes,
            anchor_phrase, 'phrase' AS src
       FROM phrase_links`,
  ).all();

  const byVerse = new Map(); // key → Map(targetCoord → link)
  for (const row of rows) {
    const coord = `${row.to_code}-${row.to_chapter}-${row.to_start_verse}-${row.to_end_verse}`;
    let links = byVerse.get(row.from_key);
    if (!links) byVerse.set(row.from_key, (links = new Map()));
    const existing = links.get(coord);
    if (existing) {
      existing.votes = Math.max(existing.votes, row.votes);
      existing.anchor_phrase ||= row.anchor_phrase;
      existing.openbible ||= row.src === "openbible";
    } else {
      links.set(coord, { ...row, openbible: row.src === "openbible" });
    }
  }

  // openbible 우선 정렬(votes DESC), phrase는 코드순 보조 — 요청당 안정적인 결과를 위해.
  const verses = [];
  for (const [key, links] of byVerse) {
    if (!verseTexts.has(key)) continue;
    const sorted = [...links.values()].sort((a, b) =>
      b.votes - a.votes ||
      (b.openbible ? 1 : 0) - (a.openbible ? 1 : 0) ||
      a.to_code.localeCompare(b.to_code) ||
      a.to_chapter - b.to_chapter ||
      a.to_start_verse - b.to_start_verse);
    verses.push({ key, text: verseTexts.get(key), links: sorted.slice(0, LINKS_PER_VERSE), allLinks: sorted });
  }
  verses.sort((a, b) => {
    const [ac, ar] = [a.key.slice(0, 3), a.key.slice(4)];
    const [bc, br] = [b.key.slice(0, 3), b.key.slice(4)];
    if (ac !== bc) return ac.localeCompare(bc);
    const [ach, av] = ar.split(":").map(Number);
    const [bch, bv] = br.split(":").map(Number);
    return ach - bch || av - bv;
  });
  return verses;
}

// --- 체크포인트 ---

function loadCheckpoint() {
  if (!existsSync(OUT_JSONL)) return { done: new Set(), records: [] };
  const done = new Set();
  const records = [];
  for (const line of readFileSync(OUT_JSONL, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const rec = JSON.parse(line);
      // 에이전트 헬퍼가 저장한 배열형 링크 [coord, label, votes, anchor] 정규화
      if (Array.isArray(rec.links)) {
        rec.links = rec.links.map((l) =>
          Array.isArray(l)
            ? {
                coord: l[0],
                why: l[3] ? `${l[3]} (${l[1]})` : String(l[1] ?? ""),
              }
            : l,
        );
      }
      done.add(rec.key);
      records.push(rec);
    } catch {
      console.warn(`checkpoint line skipped (broken json): ${line.slice(0, 80)}`);
    }
  }
  return { done, records };
}

function hasKoreanText(value) {
  return typeof value === "string" && /[가-힣]/.test(value);
}

function buildDb(records) {
  if (existsSync(OUT_DB)) {
    rmSync(OUT_DB);
  }
  const db = new DatabaseSync(OUT_DB);
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA synchronous=NORMAL;
    CREATE TABLE metadata(key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE verse_commentary(
      verse_key TEXT PRIMARY KEY,
      theme TEXT NOT NULL,
      summary TEXT NOT NULL
    );
    CREATE TABLE link_commentary(
      verse_key TEXT NOT NULL,
      target_code TEXT NOT NULL,
      target_chapter INTEGER NOT NULL,
      target_start INTEGER NOT NULL,
      target_end INTEGER NOT NULL,
      why TEXT NOT NULL,
      PRIMARY KEY (verse_key, target_code, target_chapter, target_start, target_end)
    );
    CREATE INDEX idx_lc_verse ON link_commentary(verse_key);
  `);

  const meta = db.prepare(`INSERT INTO metadata VALUES (?,?)`);
  meta.run("built_at", new Date().toISOString());
  meta.run("source", "ai-generated");
  meta.run("prompt_version", PROMPT_VERSION);
  const used = new Map();
  for (const rec of records) {
    if (rec.provider) used.set(rec.provider, rec.model || rec.provider);
  }
  meta.run("model_provider", [...used.keys()].join(",") || "unknown");
  meta.run("model_name", [...used.values()].join(",") || "unknown");
  meta.run(
    "disclaimer",
    "연결 해설은 사전 생성된 AI 초안이며 성경의 최종 해석을 대신하지 않습니다.",
  );

  const insertVerse = db.prepare(`INSERT OR REPLACE INTO verse_commentary VALUES (?,?,?)`);
  const insertLink = db.prepare(
    `INSERT OR REPLACE INTO link_commentary VALUES (?,?,?,?,?,?)`,
  );

  db.exec("BEGIN");
  let verseCount = 0;
  let linkCount = 0;
  let rejectedLanguage = 0;
  for (const rec of records) {
    if (!rec.theme?.trim() || !rec.summary?.trim()) continue;
    if (!hasKoreanText(rec.theme) || !hasKoreanText(rec.summary)) {
      rejectedLanguage++;
      continue;
    }
    insertVerse.run(rec.key, rec.theme.trim(), rec.summary.trim());
    verseCount++;
    for (const link of rec.links ?? []) {
      if (!link.coord || !link.why?.trim()) continue;
      if (!hasKoreanText(link.why)) { rejectedLanguage++; continue; }
      const parts = String(link.coord).split("-");
      // 4부분: BOOK-C-S-E / 3부분(에이전트 작성 단일 절): BOOK-C-S → end=start
      const [code, chapter, start, end] =
        parts.length === 4
          ? [parts[0], Number(parts[1]), Number(parts[2]), Number(parts[3])]
          : parts.length === 3
            ? [parts[0], Number(parts[1]), Number(parts[2]), Number(parts[2])]
            : [null, null, null, null];
      if (!code || !Number.isInteger(chapter) || !Number.isInteger(start)) continue;
      // 좌표 무결성 게이트: 잘못된 coord(오타 등)는 DB 오염 대신 적재 시 제외
      if (!Number.isInteger(end) || chapter < 1 || start < 1 || end < start) continue;
      insertLink.run(rec.key, code, chapter, start, end, link.why.trim());
      linkCount++;
    }
  }
  meta.run("rejected_language_rows", String(rejectedLanguage));
  db.exec("COMMIT");
  db.exec("VACUUM");
  db.close();
  return { verseCount, linkCount };
}
function saveBatchResults(items, results, provider) {
  const byKey = new Map(results.map((r) => [r.key, r]));
  let savedLines = 0;
  for (const item of items) {
    const result = byKey.get(item.key);
    if (!result || !result.theme || !result.summary) {
      console.warn(`\n  missing result for ${item.key} — will retry next run`);
      continue;
    }
    if (!hasKoreanText(result.theme) || !hasKoreanText(result.summary)) {
      console.warn(`\n  non-Korean result for ${item.key} — will retry next run`);
      continue;
    }
    const record = {
      key: item.key,
      theme: String(result.theme).slice(0, 200),
      summary: String(result.summary).slice(0, 1000),
      provider: provider.name,
      model: provider.model,
      links: [],
    };
    for (const outLink of Array.isArray(result.links) ? result.links : []) {
      if (!outLink || typeof outLink.target !== "string") continue;
      const matched = item.allLinks.find((l) => l.to_label === outLink.target);
      if (!matched) continue;
      record.links.push({
        coord: `${matched.to_code}-${matched.to_chapter}-${matched.to_start_verse}-${matched.to_end_verse}`,
        why: String(outLink.why ?? "").slice(0, 500),
      });
    }
    appendFileSync(OUT_JSONL, `${JSON.stringify(record)}\n`);
    savedLines++;
  }
  return savedLines;
}

async function main() {
  loadDotEnv();
  if (BUILD_ONLY) {
    if (!existsSync(OUT_JSONL)) {
      console.error(`missing ${OUT_JSONL} — nothing to build`);
      process.exitCode = 1;
      return;
    }
    const { records } = loadCheckpoint();
    const { verseCount, linkCount } = buildDb(records);
    console.log(`wrote ${path.relative(ROOT, OUT_DB)} verses=${verseCount} links=${linkCount}`);
    return;
  }
  if (!existsSync(CROSSREFS_DB)) {
    console.error(`missing ${CROSSREFS_DB} — run sync:reference first`);
    process.exitCode = 1;
    return;
  }
  const providers = buildProviders();
  if (providers.length === 0) {
    console.error("MIMO_API_KEY 또는 DEEPSEEK_API_KEY 환경변수가 필요합니다.");
    process.exitCode = 1;
    return;
  }

  const crossrefsDb = new DatabaseSync(CROSSREFS_DB, { readOnly: true });
  const verseTexts = loadVerseTexts();
  const verses = collectTargetVerses(crossrefsDb, verseTexts);
  console.log(`target verses: ${verses.length}`);

  const { done } = loadCheckpoint();
  console.log(`checkpoint: ${done.size} already generated`);

  const pending = SMOKE_LIMIT > 0
    ? verses.filter((v) => !done.has(v.key)).slice(0, SMOKE_LIMIT)
    : verses.filter((v) => !done.has(v.key));

  // 병렬 워커 풀 — 각 워커가 배치를 가져 가며 처리. JSONL append는 단일 쓰기 컨텍스트에서만.
  const workers = Math.max(1, Math.min(COMMENTARY_CONCURRENCY, Math.ceil(pending.length / BATCH_SIZE)));
  let cursor = 0;
  let completedBatches = 0;
  const totalBatches = Math.ceil(pending.length / BATCH_SIZE);

  async function worker(id) {
    for (;;) {
      const i = cursor;
      if (i >= pending.length) return;
      cursor += BATCH_SIZE;
      const items = pending.slice(i, i + BATCH_SIZE);
      try {
        const { verses: results, provider } = await generateBatch(providers, items);
        const saved = saveBatchResults(items, results, provider);
        completedBatches++;
        console.log(`[worker${id}] batch ${completedBatches}/${totalBatches}: ${saved}/${items.length} saved via ${provider.name}`);
        if (REQUEST_DELAY_MS > 0) await sleep(REQUEST_DELAY_MS);
      } catch (error) {
        completedBatches++;
        console.warn(`[worker${id}] batch failed permanently (${completedBatches}/${totalBatches}): ${String(error.message ?? error).slice(0, 160)} — 재실행 시 체크포인트에서 이어서 재시도`);
      }
    }
  }

  await Promise.all(Array.from({ length: workers }, (_, k) => worker(k + 1)));

  crossrefsDb.close();

  if (SMOKE_LIMIT > 0) {
    console.log(`smoke run complete (${SMOKE_LIMIT} verses) — DB build skipped`);
    return;
  }

  const { records } = loadCheckpoint();
  const { verseCount, linkCount } = buildDb(records);
  console.log(`wrote ${path.relative(ROOT, OUT_DB)} verses=${verseCount} links=${linkCount}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
