const STOPWORDS = new Set([
  "그리고",
  "그러나",
  "그래서",
  "하지만",
  "그런데",
  "또는",
  "및",
  "이",
  "그",
  "저",
  "것",
  "수",
  "등",
  "때",
  "더",
  "또",
  "좀",
  "잘",
  "안",
  "못",
  "없는",
  "있는",
  "했다",
  "한다",
  "하는",
  "된다",
  "되어",
  "됐다",
  "입니다",
  "습니다",
  "이에요",
  "예요",
  "오늘",
  "이번",
  "요즘",
  "마음",
  "생각",
  "하나님",
  "주님",
  "예수",
  "성령",
  "묵상",
  "기록",
  "나눔",
  "함께",
]);

/** Curated topic vocabulary for anonymous share feed. */
export const TOPIC_VOCAB = [
  "감사",
  "신뢰",
  "두려움",
  "평안",
  "기다림",
  "관계",
  "용서",
  "회개",
  "순종",
  "소명",
  "예배",
  "기도",
  "말씀",
  "은혜",
  "사랑",
  "겸손",
  "인내",
  "소망",
  "치유",
  "회복",
  "정직",
  "섬김",
  "가족",
  "일터",
  "고난",
  "위로",
  "분별",
  "성실",
  "결단",
  "안식",
  "내려놓음",
  "동행",
  "용기",
] as const;

const THEME_PATTERNS: Array<{ tag: string; patterns: RegExp[] }> = [
  { tag: "감사", patterns: [/감사/, /고맙/, /은혜로/] },
  { tag: "신뢰", patterns: [/신뢰/, /맡기/, /의지/, /믿/] },
  { tag: "두려움", patterns: [/두려/, /불안/, /걱정/, /초조/] },
  { tag: "평안", patterns: [/평안/, /고요/, /차분/, /안심/] },
  { tag: "기다림", patterns: [/기다리/, /인내/, /아직\s*안/, /언젠가/] },
  { tag: "관계", patterns: [/관계/, /친구/, /동료/, /사람\s*사이/, /대화/] },
  { tag: "용서", patterns: [/용서/, /화해/, /미움/, /원망/] },
  { tag: "회개", patterns: [/회개/, /돌이키/, /잘못/, /죄책/] },
  { tag: "순종", patterns: [/순종/, /따르/, /순종하/] },
  { tag: "소명", patterns: [/소명/, /부르심/, /사명/, /부르신/] },
  { tag: "예배", patterns: [/예배/, /찬양/, /예배당/] },
  { tag: "기도", patterns: [/기도/, /간구/, /아뢰/] },
  { tag: "말씀", patterns: [/말씀/, /성경/, /본문/, /성구/] },
  { tag: "은혜", patterns: [/은혜/, /자비/, /긍휼/] },
  { tag: "사랑", patterns: [/사랑/, /애정/, /돌봄/] },
  { tag: "겸손", patterns: [/겸손/, /낮아/, /교만/] },
  { tag: "인내", patterns: [/인내/, /참으/, /버티/] },
  { tag: "소망", patterns: [/소망/, /희망/, /바라/] },
  { tag: "치유", patterns: [/치유/, /회복되/, /상처/] },
  { tag: "회복", patterns: [/회복/, /다시\s*일어/, /되돌/] },
  { tag: "가족", patterns: [/가족/, /부모/, /자녀/, /배우자/, /아내/, /남편/] },
  { tag: "일터", patterns: [/일터/, /직장/, /업무/, /회사/, /사역지/] },
  { tag: "고난", patterns: [/고난/, /시련/, /어려움/, /힘들/] },
  { tag: "위로", patterns: [/위로/, /달래/, /품어/] },
  { tag: "분별", patterns: [/분별/, /판단/, /선택/, /결정/] },
  { tag: "결단", patterns: [/결단/, /다짐/, /실천/, /작정/] },
  { tag: "안식", patterns: [/안식/, /쉼/, /휴식/, /멈추/] },
  { tag: "내려놓음", patterns: [/내려놓/, /놓아\s*주/, /포기하/] },
  { tag: "동행", patterns: [/동행/, /함께\s*가/, /곁에/] },
  { tag: "용기", patterns: [/용기/, /담대/, /맞서/] },
];

function normalizeTag(raw: string): string {
  return raw
    .replace(/^#+/, "")
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .slice(0, 12);
}

export function sanitizeTopicTags(tags: unknown, limit = 5): string[] {
  if (!Array.isArray(tags)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of tags) {
    if (typeof item !== "string") continue;
    const tag = normalizeTag(item.trim());
    if (tag.length < 2 || STOPWORDS.has(tag) || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= limit) break;
  }
  return out;
}

/** Offline / fallback tagger from body + scripture display strings. */
export function suggestTopicTagsHeuristic(input: {
  publicBody: string;
  scriptureRefs?: string[];
  limit?: number;
}): string[] {
  const limit = input.limit ?? 5;
  const body = input.publicBody || "";
  const scores = new Map<string, number>();

  for (const { tag, patterns } of THEME_PATTERNS) {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(body)) score += 2;
    }
    if (score > 0) scores.set(tag, (scores.get(tag) || 0) + score);
  }

  for (const ref of input.scriptureRefs ?? []) {
    if (/시편|시\s*\d/.test(ref)) scores.set("예배", (scores.get("예배") || 0) + 1);
    if (/잠언/.test(ref)) scores.set("분별", (scores.get("분별") || 0) + 1);
    if (/요한|로마|갈라디|에베소|빌립보|골로새/.test(ref)) {
      scores.set("은혜", (scores.get("은혜") || 0) + 1);
    }
    if (/창세기|출애굽|신명/.test(ref)) scores.set("동행", (scores.get("동행") || 0) + 1);
  }

  // light keyword harvest for rare but concrete nouns
  const tokens = body.match(/[가-힣]{2,8}/g) ?? [];
  for (const token of tokens) {
    if (STOPWORDS.has(token)) continue;
    if ((TOPIC_VOCAB as readonly string[]).includes(token)) {
      scores.set(token, (scores.get(token) || 0) + 1);
    }
  }

  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
    .map(([tag]) => tag);

  return sanitizeTopicTags(ranked, limit);
}

export async function generateTopicTagsWithMimo(input: {
  publicBody: string;
  scriptureRefs?: string[];
  limit?: number;
}): Promise<{ tags: string[]; modelProvider: string; modelName: string }> {
  const limit = input.limit ?? 5;
  const fallback = suggestTopicTagsHeuristic(input);
  const apiKey = process.env.MIMO_API_KEY?.trim();
  const baseURL = (process.env.MIMO_BASE_URL || "https://api.xiaomimimo.com/v1").replace(
    /\/$/,
    "",
  );
  const model = process.env.MIMO_MODEL || "mimo-v2.5-pro";

  if (!apiKey || input.publicBody.trim().length < 12) {
    return {
      tags: fallback,
      modelProvider: apiKey ? "mimo" : "local-fallback",
      modelName: apiKey ? model : "heuristic-v1",
    };
  }

  const system = `당신은 익명 묵상 나눔 글에 짧은 주제 해시태그를 붙이는 도우미입니다.
규칙:
- 한국어 명사/주제어 2~6글자
- 3~5개
- # 기호 없이 JSON만: {"tags":["감사","신뢰"]}
- 하나님의 뜻을 판정하거나 사람을 평가하는 표현 금지
- 개인 식별 정보, 고유명사, 교회/학교명 금지
- 본문에 실제로 드러난 주제만`;

  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_completion_tokens: 256,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: JSON.stringify({
              publicBody: input.publicBody.slice(0, 1200),
              scriptureRefs: input.scriptureRefs ?? [],
              preferredVocab: TOPIC_VOCAB,
              limit,
            }),
          },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      return { tags: fallback, modelProvider: "local-fallback", modelName: "heuristic-v1" };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    const jsonText = extractJson(content);
    const parsed = JSON.parse(jsonText) as { tags?: unknown };
    const tags = sanitizeTopicTags(parsed.tags, limit);
    return {
      tags: tags.length ? tags : fallback,
      modelProvider: "mimo",
      modelName: model,
    };
  } catch {
    return { tags: fallback, modelProvider: "local-fallback", modelName: "heuristic-v1" };
  }
}

function extractJson(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start >= 0 && end > start) return content.slice(start, end + 1);
  throw new Error("No JSON in model response");
}
