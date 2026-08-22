/**
 * 성경 참조 데이터 준비 — eobom 내부 data/reference/를 단일 source of truth로 사용한다.
 * 이 스크립트는 외부 프로젝트(../bible)에 의존하지 않는다.
 *
 * 1) 요구 파일 존재 확인 (guide 66권, crossrefs csv, sqlite 3종)
 * 2) crossrefs.csv가 있으면 runtime crossrefs.sqlite를 재생성 (독립 빌드)
 * 3) 필수 산출물이 부족하면 exit 1 → 빈 배포 방지
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "data", "reference");
const GUIDE_DIR = path.join(OUT_DIR, "bible-guide");
const CROSSREFS_DB = path.join(OUT_DIR, "crossrefs.sqlite");

mkdirSync(OUT_DIR, { recursive: true });

// 1) guide 66권 확인
const guideFiles = existsSync(GUIDE_DIR)
  ? readdirSync(GUIDE_DIR).filter((f) => f.endsWith(".md"))
  : [];
console.log(`bible-guide: ${guideFiles.length}개 확인`);
if (guideFiles.length === 0) {
  console.error("bible-guide 폴더가 비어 있습니다. 상세 guide를 먼저 준비하세요.");
  process.exit(1);
}

// 2) crossrefs.sqlite 재생성 (csv 기준, 빌더 스크립트 재사용)
const csvPath = path.join(OUT_DIR, "crossrefs.csv");
const builder = path.join(ROOT, "scripts", "build-reference-sqlite.mjs");
if (existsSync(csvPath)) {
  if (!existsSync(builder)) {
    console.error(`missing builder: ${builder}`);
    process.exit(1);
  }
  const result = spawnSync("node", [builder], { encoding: "utf8" });
  if (result.status !== 0) {
    console.error(`crossrefs sqlite build 실패:\n${result.stderr || result.stdout}`);
    process.exit(1);
  }
  console.log(`crossrefs.sqlite 재생성 완료 (${(statSync(CROSSREFS_DB).size / 1024 / 1024).toFixed(1)} MB)`);
} else {
  console.log("crossrefs.csv 없음 — crossrefs.sqlite 재생성 건너뜀");
}

// 3) 필수 산출물 확인
const required = ["crossrefs.sqlite", "chapter-background.sqlite", "public-commentary.sqlite"];
const missing = required.filter((name) => !existsSync(path.join(OUT_DIR, name)) || statSync(path.join(OUT_DIR, name)).size === 0);
if (missing.length) {
  console.error(`필수 참조 산출물 누락: ${missing.join(", ")}`);
  process.exit(1);
}

// 정리
if (existsSync(csvPath)) {
  const head = readFileSync(csvPath, "utf8").split("\n").slice(0, 2).join("\n");
  console.log(`\nhead crossrefs.csv:\n${head.slice(0, 200)}`);
}

console.log(`\ndone: reference 데이터 확인·빌드 완료 (bible-guide ${guideFiles.length}개)`);
