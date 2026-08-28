import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const OUT_DIR = path.join(ROOT, "data", "reference", "public-commentary", "mhc");
const DIATHEKE = process.env.DIATHEKE_BIN || "diatheke";
const SWORD_PATH = process.env.SWORD_PATH || "";

const BOOKS = [
  ["GEN", "창세기", "Gen", 50], ["EXO", "출애굽기", "Exod", 40], ["LEV", "레위기", "Lev", 27], ["NUM", "민수기", "Num", 36], ["DEU", "신명기", "Deut", 34],
  ["JOS", "여호수아", "Josh", 24], ["JDG", "사사기", "Judg", 21], ["RUT", "룻기", "Ruth", 4], ["1SA", "사무엘상", "1Sam", 31], ["2SA", "사무엘하", "2Sam", 24],
  ["1KI", "열왕기상", "1Kgs", 22], ["2KI", "열왕기하", "2Kgs", 25], ["1CH", "역대상", "1Chr", 29], ["2CH", "역대하", "2Chr", 36], ["EZR", "에스라", "Ezra", 10],
  ["NEH", "느헤미야", "Neh", 13], ["EST", "에스더", "Esth", 10], ["JOB", "욥기", "Job", 42], ["PSA", "시편", "Ps", 150], ["PRO", "잠언", "Prov", 31],
  ["ECC", "전도서", "Eccl", 12], ["SOL", "아가", "Song", 8], ["ISA", "이사야", "Isa", 66], ["JER", "예레미야", "Jer", 52], ["LAM", "예레미야애가", "Lam", 5],
  ["EZE", "에스겔", "Ezek", 48], ["DAN", "다니엘", "Dan", 12], ["HOS", "호세아", "Hos", 14], ["JOE", "요엘", "Joel", 3], ["AMO", "아모스", "Amos", 9],
  ["OBA", "오바댜", "Obad", 1], ["JON", "요나", "Jonah", 4], ["MIC", "미가", "Mic", 7], ["NAH", "나훔", "Nah", 3], ["HAB", "하박국", "Hab", 3],
  ["ZEP", "스바냐", "Zeph", 3], ["HAG", "학개", "Hag", 2], ["ZEC", "스가랴", "Zech", 14], ["MAL", "말라기", "Mal", 4], ["MAT", "마태복음", "Matt", 28],
  ["MAR", "마가복음", "Mark", 16], ["LUK", "누가복음", "Luke", 24], ["JOH", "요한복음", "John", 21], ["ACT", "사도행전", "Acts", 28], ["ROM", "로마서", "Rom", 16],
  ["1CO", "고린도전서", "1Cor", 16], ["2CO", "고린도후서", "2Cor", 13], ["GAL", "갈라디아서", "Gal", 6], ["EPH", "에베소서", "Eph", 6], ["PHI", "빌립보서", "Phil", 4],
  ["COL", "골로새서", "Col", 4], ["1TH", "데살로니가전서", "1Thess", 5], ["2TH", "데살로니가후서", "2Thess", 3], ["1TI", "디모데전서", "1Tim", 6], ["2TI", "디모데후서", "2Tim", 4],
  ["TIT", "디도서", "Titus", 3], ["PHM", "빌레몬서", "Phlm", 1], ["HEB", "히브리서", "Heb", 13], ["JAM", "야고보서", "Jas", 5], ["1PE", "베드로전서", "1Pet", 5],
  ["2PE", "베드로후서", "2Pet", 3], ["1JO", "요한일서", "1John", 5], ["2JO", "요한이서", "2John", 1], ["3JO", "요한삼서", "3John", 1], ["JUD", "유다서", "Jude", 1], ["REV", "요한계시록", "Rev", 22],
];

function stripOsis(raw) {
  return raw
    .replace(/<reference[^>]*>/gi, "").replace(/<\/reference>/gi, "")
    .replace(/<hi[^>]*>/gi, "").replace(/<\/hi>/gi, "")
    .replace(/<div[^>]*>/gi, "\n").replace(/<\/div>/gi, "\n")
    .replace(/<note[^>]*>[\s\S]*?<\/note>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n")
    .trim();
}

function fetchChapter(bookRef, chapter) {
  const result = spawnSync(DIATHEKE, ["-b", "MHC", "-k", `${bookRef} ${chapter}`], {
    encoding: "utf8",
    env: { ...process.env, ...(SWORD_PATH ? { SWORD_PATH } : {}) },
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(`diatheke failed ${bookRef} ${chapter}: ${result.stderr || result.stdout}`);
  return stripOsis(result.stdout);
}

await mkdir(OUT_DIR, { recursive: true });
if (!existsSync(OUT_DIR)) throw new Error(`cannot create ${OUT_DIR}`);

const manifest = [];
for (const [code, name, ref, chapters] of BOOKS) {
  const sections = [];
  for (let chapter = 1; chapter <= chapters; chapter++) {
    const content = fetchChapter(ref, chapter);
    if (!content || content.length < 80) throw new Error(`empty commentary ${code} ${chapter}`);
    sections.push(`## ${name} ${chapter}장 — Matthew Henry\n\n${content}`);
    process.stdout.write(`${code} ${chapter}/${chapters}\n`);
  }
  const markdown = [
    `# ${name} (${code}) — Matthew Henry 공개 도메인 주석`,
    "",
    "> 원문: Matthew Henry's Commentary on the Whole Bible (CCEL/CrossWire MHC).",
    "> 라이선스: Public Domain — Copy Freely.",
    "> 출처: https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=MHC",
    "> 원문 저장소: https://www.ccel.org/ccel/henry/mhc.html",
    "",
    ...sections,
    "",
  ].join("\n");
  await writeFile(path.join(OUT_DIR, `${code}.md`), markdown);
  manifest.push({ code, name, chapters, source: "Matthew Henry MHC", license: "Public Domain", sourceUrl: "https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=MHC" });
}
await writeFile(path.join(OUT_DIR, "manifest.json"), JSON.stringify({ generatedAt: new Date().toISOString(), source: "CrossWire MHC / CCEL", license: "Public Domain", books: manifest }, null, 2));
console.log(`wrote ${manifest.length} books to ${OUT_DIR}`);
