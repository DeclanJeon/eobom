/**
 * chapter-background ko 누락 장 채움 (2026-08-26).
 *
 * 배경: ko JSON(1,171장)이 en(1,189장) 대비 18장 누락 — 2CH 21–36, JOB 42, 1PE 5.
 *      ko 요청이 en으로 폴백하지 않도록 수정된 이후 해당 장은 문맥 카드가 생략되었다.
 *
 * 방식: 기존 ko 행 포맷을 그대로 따른다.
 *   overview   = "{책명} {n}장 본문 미리보기 — {한국어 본문 발췌}"
 *   theological= "붙잡아 볼 축: A · B · C."  (en keyVerses why의 영어 축을 한글 매핑)
 *   keyVerses  = en keyVerses 참조 유지, why를 한글 축으로 번역
 *
 * 멱등: 이미 JSON에 존재하는 id는 건너뛴다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const ROOT = process.cwd();
const KO_JSON = path.join(ROOT, "data", "reference", "chapter-background-ko.json");
const EN_JSON = path.join(ROOT, "data", "reference", "chapter-background-en.json");
const SQLITE = path.join(ROOT, "data", "reference", "chapter-background.sqlite");
const VPL = path.join(ROOT, "data", "bible", "ko", "canon_66_vpl.txt");

const AXIS_KO = {
  covenant: "언약", promise: "약속", providence: "섭리", prophecy: "예언",
  hope: "소망", salvation: "구원", deliverance: "구원과 해방", kingdom: "하나님 나라",
  repentance: "회개", holiness: "거룩", law: "율법", trust: "신뢰",
  love: "사랑", wisdom: "지혜", instruction: "훈계", suffering: "고난",
  faith: "믿음", obedience: "순종", prayer: "기도", worship: "예배", creation: "창조",
};

function translateAxis(raw) {
  const isToreup = raw.includes("축이 또렷한");
  const tokens = raw
    .replace(/을 붙들어 읽기 좋은 절|축이 또렷한 절/g, "")
    .split(/[·,]\s*/)
    .map((t) => AXIS_KO[t.trim()] ?? t.trim())
    .filter(Boolean);
  return isToreup
    ? `${tokens.join(" · ")} 축이 또렷한 절`
    : `${tokens.join(" · ")}을 붙들어 읽기 좋은 절`;
}

/** 한국어 전체 장 본문 (canon_66_vpl) */
function loadChapterText(code, chapter) {
  const prefix = `${code.toUpperCase()} ${chapter}:`;
  return readFileSync(VPL, "utf8")
    .split("\n")
    .filter((l) => l.startsWith(prefix))
    .map((l) => l.replace(/^[A-Z0-9]+ \d+:\d+\s+/, ""))
    .join(" ")
    .trim();
}

function bookKoName(code) {
  const meta = JSON.parse(readFileSync(path.join(ROOT, "data/bible/ko/metadata.json"), "utf8"));
  const book = meta.books.find((b) => b.code === code);
  return book?.name ?? code;
}

const ko = JSON.parse(readFileSync(KO_JSON, "utf8"));
const en = JSON.parse(readFileSync(EN_JSON, "utf8"));
const existing = new Set(ko.chapters.map((c) => c.id));
const gaps = en.chapters.filter((c) => !existing.has(c.id));
console.log(`gap chapters: ${gaps.length}`);

const db = new DatabaseSync(SQLITE);
db.exec("PRAGMA journal_mode=WAL;");

let filled = 0;
for (const gap of gaps) {
  const text = loadChapterText(gap.code, gap.chapter);
  if (!text) {
    console.warn(`skip ${gap.id} — 본문 없음`);
    continue;
  }
  const preview = text.slice(0, 600) + (text.length > 600 ? "…" : "");
  const axes = [
    ...new Set(
      (gap.keyVerses ?? []).flatMap((kv) =>
        String(kv.why ?? "")
          .replace(/을 붙들어 읽기 좋은 절|축이 또렷한 절/g, "")
          .split(/[·,]\s*/)
          .map((t) => AXIS_KO[t.trim()] ?? t.trim())
          .filter(Boolean),
      ),
    ),
  ];
  const row = {
    id: gap.id,
    code: gap.code,
    chapter: gap.chapter,
    testament: gap.testament === "New Testament" ? "신약" : "구약",
    locale: "ko",
    overview: `${bookKoName(gap.code)} ${gap.chapter}장 본문 미리보기 — ${preview}`,
    theological: `붙잡아 볼 축: ${axes.join(" · ")}.`,
    cautions: gap.cautions ?? [],
    keyVerses: (gap.keyVerses ?? []).map((kv) => ({
      reference: kv.reference,
      why: translateAxis(kv.why ?? ""),
    })),
    sources: gap.sources ?? [],
    version: ko.version,
    generatedAt: new Date().toISOString(),
  };

  ko.chapters.push(row);
  filled++;

  db.prepare(
    `INSERT OR REPLACE INTO chapter_background
     (id, locale, code, chapter, testament, overview, historical, literary, theological,
      key_verses_json, cautions_json, sources_json, version, generated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    `${row.id}:ko`,
    "ko",
    row.code,
    row.chapter,
    row.testament,
    row.overview,
    "",
    "",
    row.theological,
    JSON.stringify(row.keyVerses),
    JSON.stringify(row.cautions),
    JSON.stringify(row.sources),
    row.version,
    row.generatedAt,
  );
}

if (filled > 0) {
  ko.stats.totalChapters = ko.chapters.length;
  writeFileSync(KO_JSON, JSON.stringify(ko, null, 1));
}
db.exec("PRAGMA optimize;");
db.close();
console.log(`filled=${filled} total_ko_chapters=${ko.chapters.length}`);
