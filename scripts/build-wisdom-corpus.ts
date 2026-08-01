/**
 * build-wisdom-corpus.ts
 *
 * Obsidian Vault 주역 노트 → data/wisdom/*.json 변환 스크립트.
 * 모든 동양 철학 용어를 제거하고 상황 구조만 추출한다.
 *
 * Usage: bun run scripts/build-wisdom-corpus.ts
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";

const VAULT = "/home/declan/Documents/Obsidian Vault/주역";
const OUT_DIR = join(process.cwd(), "src", "data", "wisdom");
const HEX_DIR = join(VAULT, "01_경문_64괘");
const THEME_DIR = join(VAULT, "05_주제별_해석");

// ── archetype 매핑 (괘번호 → 영문 코드) ──
const ARCHETYPE_MAP: Record<number, string> = {
  1: "creative", 2: "receptive", 3: "forming", 4: "nurturing",
  5: "waiting", 6: "conflict", 7: "organizing", 8: "alliance",
  9: "accumulating", 10: "treading", 11: "flowing", 12: "stagnating",
  13: "fellowship", 14: "abundance", 15: "humility", 16: "enthusiasm",
  17: "following", 18: "repairing", 19: "approaching", 20: "observing",
  21: "biting", 22: "adorning", 23: "peeling", 24: "returning",
  25: "innocence", 26: "restraining", 27: "nourishing", 28: "excess",
  29: "depth", 30: "radiance", 31: "attraction", 32: "endurance",
  33: "retreating", 34: "power", 35: "advancing", 36: "concealing",
  37: "household", 38: "opposition", 39: "obstruction", 40: "release",
  41: "decreasing", 42: "increasing", 43: "breakthrough", 44: "encounter",
  45: "gathering", 46: "ascending", 47: "exhaustion", 48: "well",
  49: "revolution", 50: "vessel", 51: "arousing", 52: "stillness",
  53: "gradual", 54: "marrying", 55: "fullness", 56: "wandering",
  57: "penetrating", 58: "joy", 59: "dispersing", 60: "limiting",
  61: "inner-truth", 62: "small-excess", 63: "completion", 64: "incompletion",
};

// ── theme 매핑 (파일명 → WisdomTheme) ──
const THEME_MAP: Record<string, string> = {
  "01_성장.md": "growth",
  "02_연결.md": "connection",
  "03_성공.md": "success",
  "04_역할.md": "role",
  "05_출세.md": "advance",
  "06_재물.md": "resource",
  "07_위기.md": "crisis",
};

// ── 번호 → 주제 매핑 (theme 파일에서 추출) ──
const HEX_THEME: Record<number, string> = {};

// ── 팔괘 자연 현상 매핑 ──
const TRIGRAM_NATURE: Record<string, string> = {
  "乾": "창조적 에너지, 시작의 힘",
  "坤": "수용, 품음, 기다림",
  "震": "갑작스러운 움직임, 각성",
  "坎": "깊음, 위험, 신뢰의 시험",
  "艮": "멈춤, 경계, 안식",
  "巽": "스며듦, 점진적 영향",
  "離": "밝음, 드러남, 붙어있음",
  "兌": "기쁨, 소통, 나눔",
};

function extractFrontmatter(text: string): Record<string, string> {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
  }
  return fm;
}

function extractSection(text: string, heading: string): string {
  const re = new RegExp(`##\\s*${heading}[\\s\\S]*?(?=\\n##\\s|\\n---|$)`);
  const m = text.match(re);
  return m ? m[0].replace(/^##\s*.*\n/, "").trim() : "";
}

function extractInterpretation(text: string): string {
  const m = text.match(/>\s*\*\*해석\*\*:\s*(.+)/);
  return m ? m[1].trim() : "";
}

function parseHexagram(filename: string): { num: number; nameKo: string; nameZh: string; text: string } | null {
  const m = filename.match(/^(\d{3})_(.+?)_(.+?)\.md$/);
  if (!m) return null;
  return {
    num: parseInt(m[1], 10),
    nameKo: m[2],
    nameZh: m[3],
    text: readFileSync(join(HEX_DIR, filename), "utf-8"),
  };
}

function buildStructure(text: string, fm: Record<string, string>): { image: string; dynamic: string; posture: string } {
  const lower = fm["trigram-lower"] || "";
  const upper = fm["trigram-upper"] || "";

  const lowerZh = lower.match(/^([乾坤震坎艮巽離兌])/)?.[1] || "";
  const upperZh = upper.match(/^([乾坤震坎艮巽離兌])/)?.[1] || "";

  const lowerNature = TRIGRAM_NATURE[lowerZh] || lower;
  const upperNature = TRIGRAM_NATURE[upperZh] || upper;

  const daxiang = extractSection(text, "大象");
  const daxiangInterp = extractInterpretation(daxiang);
  const tuanzhuan = extractSection(text, "彖傳");
  const tuanzhuanInterp = extractInterpretation(tuanzhuan);

  return {
    image: `${lowerNature}와 ${upperNature}가 만나는 형국`,
    dynamic: tuanzhuanInterp || "상황의 역학이 전개되는 중",
    posture: daxiangInterp
      ? daxiangInterp.replace(/군자가\s*(이를\s*본받아\s*)?/g, "이 상황에서 취할 태도: ")
      : "상황을 관찰하며 때를 기다리는 태도",
  };
}

function buildPhases(text: string): Array<{ stage: string; signal: string; caution: string; reflection: string }> {
  const yaoSection = extractSection(text, "효사");
  if (!yaoSection) return [];

  const stageMap = ["early", "developing", "peak", "peak", "overreach", "return"];
  const lines = yaoSection.split("\n").filter((l) => l.match(/^\-\s*\*\*[初六九二三四五上]/));

  return lines.slice(0, 6).map((line, i) => {
    const content = line.replace(/^\-\s*\*\*[^*]+\*\*[：:]\s*/, "").trim();
    return {
      stage: stageMap[i] || "developing",
      signal: content.slice(0, 80),
      caution: i >= 4 ? "과잉 또는 회귀의 신호 — 방향 재점검 필요" : "현재 단계의 조건을 확인",
      reflection: i === 0
        ? "이 시작의 막막함 속에서, 내가 의지할 수 있는 것은 무엇인가?"
        : i === 5
          ? "이 경험이 나에게 무엇을 남겼고, 무엇을 내려놓게 했는가?"
          : "하나님이 이 과정을 통해 내 안에 무엇을 세우고 계신가?",
    };
  });
}

function buildGuidance(text: string): { coreQuestion: string; avoidPattern: string; embracePattern: string } {
  const daxiang = extractSection(text, "大象");
  const daxiangInterp = extractInterpretation(daxiang);

  return {
    coreQuestion: daxiangInterp
      ? `지금 내가 ${daxiangInterp.replace(/군자가\s*(이를\s*본받아\s*)?/g, "").slice(0, 40)}하려면 무엇부터 해야 하는가?`
      : "지금 이 상황에서 내가 경륜해야 할 것은 무엇인가?",
    avoidPattern: "조건 미비 상태에서 무리한 출발, 혼자 감당하려는 고립",
    embracePattern: "작은 것부터 질서를 세우고, 도우미를 인정하고, 때를 기다리는 꾸준함",
  };
}

// ── Theme 파일 파싱 ──
function parseThemeFile(filename: string): { theme: string; hexNums: number[]; interpretations: Map<number, { questions: string[]; cautions: string }> } {
  const theme = THEME_MAP[filename] || "growth";
  const text = readFileSync(join(THEME_DIR, filename), "utf-8");
  const hexNums: number[] = [];
  const interpretations = new Map<number, { questions: string[]; cautions: string }>();

  // 각 괘 섹션 추출
  const sections = text.split(/^## /m).slice(1);
  for (const section of sections) {
    const numMatch = section.match(/^(\d+)\./);
    if (!numMatch) continue;
    const num = parseInt(numMatch[1], 10);
    hexNums.push(num);
    HEX_THEME[num] = theme;

    const questions: string[] = [];
    const qMatch = section.match(/적용 질문\/행동[：:]\s*([\s\S]*?)(?=\n-\s*\*\*주의|\n##|$)/);
    if (qMatch) {
      const qLines = qMatch[1].split(/\n/).filter((l) => l.match(/^\d+\./));
      for (const ql of qLines) {
        questions.push(ql.replace(/^\d+\.\s*/, "").trim());
      }
    }

    const cautionMatch = section.match(/주의할 역위[·・]과잉해석[：:]\s*([\s\S]+?)(?=\n-\s*\*\*관련|\n##|$)/);
    const cautions = cautionMatch ? cautionMatch[1].trim().slice(0, 200) : "";

    interpretations.set(num, { questions, cautions });
  }

  return { theme, hexNums, interpretations };
}

// ── Main ─
function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // 1. Theme 파일 파싱
  const themeFiles = readdirSync(THEME_DIR).filter((f) => f.match(/^\d{2}_.+\.md$/) && f !== "00_주제별_해석_목차.md");
  const allThemes: Array<{ id: string; label: string; description: string; situationIds: string[] }> = [];
  const themeInterpretations = new Map<number, { theme: string; questions: string[]; cautions: string }>();

  for (const tf of themeFiles) {
    const { theme, hexNums, interpretations } = parseThemeFile(tf);
    const labels: Record<string, string> = {
      growth: "성장", connection: "연결", success: "성공",
      role: "역할", advance: "출세", resource: "재물", crisis: "위기",
    };
    allThemes.push({
      id: theme,
      label: labels[theme] || theme,
      description: `${labels[theme]}의 렌즈로 읽는 상황 구조`,
      situationIds: hexNums.map((n) => `S${String(n).padStart(2, "0")}`),
    });
    for (const [num, interp] of interpretations) {
      themeInterpretations.set(num, { theme, ...interp });
    }
  }

  // 2. Hexagram 파일 파싱 → SituationProfile
  const hexFiles = readdirSync(HEX_DIR).filter((f) => f.match(/^\d{3}_/));
  const situations: Array<Record<string, unknown>> = [];

  for (const hf of hexFiles) {
    const parsed = parseHexagram(hf);
    if (!parsed) continue;

    const fm = extractFrontmatter(parsed.text);
    const structure = buildStructure(parsed.text, fm);
    const phases = buildPhases(parsed.text);
    const guidance = buildGuidance(parsed.text);
    const themeInfo = themeInterpretations.get(parsed.num);

    // theme 파일에서 추출한 성찰 질문으로 phases 보강
    if (themeInfo?.questions.length) {
      for (let i = 0; i < Math.min(phases.length, themeInfo.questions.length); i++) {
        phases[i].reflection = themeInfo.questions[i];
      }
    }

    const id = `S${String(parsed.num).padStart(2, "0")}`;
    const prev = parsed.num > 1 ? [`S${String(parsed.num - 1).padStart(2, "0")}`] : [];
    const next = parsed.num < 64 ? [`S${String(parsed.num + 1).padStart(2, "0")}`] : [];

    situations.push({
      id,
      archetype: ARCHETYPE_MAP[parsed.num] || "unknown",
      label: parsed.nameKo,
      theme: themeInfo?.theme || HEX_THEME[parsed.num] || "growth",
      structure,
      phases,
      guidance,
      transitions: {
        from: prev,
        to: next,
        transitionQuestion: `이 상황을 지나면, 나는 무엇을 배우고 누구와 연결되어 있는가?`,
      },
      scripturalResonance: [],
    });
  }

  // 3. 출력
  writeFileSync(join(OUT_DIR, "situations.json"), JSON.stringify(situations, null, 2));
  writeFileSync(join(OUT_DIR, "themes.json"), JSON.stringify(allThemes, null, 2));

  // phase-questions: 모든 phases의 reflection 수집
  const phaseQuestions = situations.flatMap((s) =>
    (s.phases as Array<{ reflection: string }>).map((p) => p.reflection).filter(Boolean),
  );
  writeFileSync(join(OUT_DIR, "phase-questions.json"), JSON.stringify([...new Set(phaseQuestions)], null, 2));

  console.log(`Generated ${situations.length} situations, ${allThemes.length} themes, ${phaseQuestions.length} phase questions`);
}

main();
