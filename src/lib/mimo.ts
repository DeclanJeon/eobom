import type { RereadScripture } from "@/lib/reread-scriptures";
import { deepScrubMirror } from "@/lib/content-scrub";
import {
  buildClassificationPrompt,
  resolveSituationContext,
} from "@/lib/wisdom/classifier";
import { buildSituationPrompt } from "@/lib/wisdom/prompt-builder";
import {
  formatBibleReferenceKey,
  parseBibleReferences,
} from "@/lib/bible";

const DEFAULT_MIMO_TIMEOUT_MS = 90_000;
const DEFAULT_DEEPSEEK_TIMEOUT_MS = 30_000;
const MIN_LLM_TIMEOUT_MS = 5_000;
const MAX_LLM_TIMEOUT_MS = 300_000;

function readLlmTimeoutMs(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  if (!Number.isInteger(value) || value < MIN_LLM_TIMEOUT_MS || value > MAX_LLM_TIMEOUT_MS) {
    return fallback;
  }
  return value;
}

export function getLlmTimeoutMs(provider: "mimo" | "deepseek"): number {
  return provider === "mimo"
    ? readLlmTimeoutMs("MIMO_TIMEOUT_MS", DEFAULT_MIMO_TIMEOUT_MS)
    : readLlmTimeoutMs("DEEPSEEK_TIMEOUT_MS", DEFAULT_DEEPSEEK_TIMEOUT_MS);
}

const DISCLAIMER =
  "이 회고는 사용자가 남긴 기록을 정리한 성찰 자료입니다. 하나님의 뜻, 신앙 상태 또는 성경의 최종 해석을 판정하지 않으며, 기도와 성경 본문 읽기, 공동체의 분별을 대신하지 않습니다.";

/**
 * 회고 생성 시스템 프롬프트. 테스트 seam으로 export — 1인칭 단정 금지 가드(I1)와
 * narrativeActs/emotionProse 서사 계약이 프롬프트에 포함됐는지 검증한다.
 */
export function buildReviewSystemPrompt(situationPrompt = ""): string {
  return `당신은 개인 묵상 기록을 정리하는 성찰 도우미입니다.

절대 금지: 하나님의 뜻을 판정, 믿음 평가, 죄 확정, 소명 선언, 예언, 의료/법률 단정. 사용자의 신앙 상태나 마음의 정답을 1인칭("당신은 ~하다", "당신은 믿지 않는다")으로 단정하지 마세요. 관찰은 3인칭·"기록이 가리키는 방향"으로만 서술하세요.

출력은 반드시 JSON 객체 하나만. 한국어.

각 섹션을 반드시 채워야 합니다. 빈 배열이나 빈 문자열을 반환하지 마세요.

0. oneSentence: 이 기간을 사용자의 시선에서 응축한 첫 문장 한 줄. 1인칭 프레임으로 쓰되 신앙 상태·마음의 정답을 단정하지 마세요("…을 붙들던 한 주", "…와 … 사이에서 머물던 나" 같은 형태). "N개의 기록이 쌓였고" 같은 3인칭 기술문은 금지.
1. themes: 기록에서 반복되는 주제 2~3개. 각각 key, title, body, confidence, evidence 포함.
2. emotions: 기록에서 나타나는 감정 2~3개. key, title, body, confidence, evidence 포함.
3. questions: 기록에서 드러난 질문 1~2개. key, title, body, evidence 포함.
4. storyConnections: 사용자의 주제와 겹치는 고전 인물·비유·교훈 2~3개. story(제목), source(출처), connection(2~4문장 입체 서사: 겉으로 보이는 모습 → 그 안에 있던 마음 → 사용자 기록과 겹치는 지점 → 변화의 씨앗), differentPerspective(한 문장 응축. 예: '강함만 본 것이 아니라 그 안에서 혼자 버티던 사람을 본 것이다') 포함. 성경 인물(다윗, 루스, 엘리야, 욥, 베드로 등), 한국 고전, 세계 고전을 활용. 사용자가 자신의 기록이 더 입체적으로 느껴지도록, 비슷한 열망·외로움·자존심·회귀를 살았던 인물이 이미 존재했음을 보여 주세요.
5. scriptureReadings: 사용자의 기록 주제와 연결된 **새로운** 성경 본문 2~3개. ref(성구), reason(읽는 이유), focus(주목할 점) 포함. entries.scriptureRefs에 이미 있는 본문은 절대 반복하지 마세요. 사용자가 아직 기록하지 않은, 주제에 맞는 본문을 제안하세요.
6. actionFlow: 이전 기록에서 나타난 결단과 그 흐름.
7. changesOrUnknown: 달라진 점과 아직 알 수 없는 점.
8. nextSteps: 구체적 다음 실천 1~2개. action(실천), reason(이유) 포함.
9. prayerPrompts: 기도로 이어갈 주제 1~2개. topic(주제), suggestion(기도 내용 제안) 포함.
10. limitations: 분석의 한계.
11. narrativeActs: 이 회고를 4막 서사로 읽히게 할 막별 내레이션 배열. 각 항목은 act(반드시 act-dwell, act-feel, act-word, act-walk 중 하나), narration(해당 막의 3인칭 관찰 한두 문장 — 사용자가 머물던 것/마음의 결/말씀이 건드린 곳/걷고 싶은 길), transition(다음 막으로 잇는 한 문장, 마지막 막 act-walk는 null). narration은 단정하지 말고 "기록이 가리키는 방향"만 조용히 서술. 인용구는 넣지 마세요(프론트가 사용자 원문으로 채웁니다).
12. emotionProse: emotions를 점수나 목록이 아닌 한 단락 산문으로 — 마음이 한 자리에 머물지 않고 어떻게 오갔는지. 1~3문장.

rereadScriptures는 처방이나 추천이 아닌, 사용자가 기록에서 다시 방문할 본문 제안입니다. entries.scriptureRefs에 있는 본문만 선택하세요. 문맥을 위해 절 범위를 우선하고 최대 3개까지만 제시하며, 해당 본문이 없으면 빈 배열을 반환하세요.

disclaimer 필드에는 다음 문장을 그대로 넣으세요: ${DISCLAIMER}

${situationPrompt}`;
}

/**
 * fallback(AI 불가/미설정) 시 제안하는 신규 성구 후보.
 * 사용자가 이미 기록한 성구와 겹치지 않는 것만 선택한다.
 */
const FALLBACK_SCRIPTURE_READINGS: ScriptureReading[] = [
  {
    ref: "시편 23:1-6",
    reason:
      "길을 잃은 듯할 때, 인도하시는 목자를 다시 떠올리게 하는 본문입니다.",
    focus:
      "‘부족함이 없으리라’는 고백이 당신의 현재 상황에서 어떤 의미인지 천천히 읽어 보세요.",
  },
  {
    ref: "마태복음 11:28-30",
    reason:
      "지치고 무거운 마음을 내려놓을 자리를 제안하는 본문입니다.",
    focus:
      "‘내게로 오라’는 말씀이 당신이 붙들고 있는 고민과 어떻게 만나는지 보세요.",
  },
  {
    ref: "빌립보서 4:6-7",
    reason:
      "염려가 반복될 때, 감사와 기도로 평안을 찾는 길을 보여 줍니다.",
    focus:
      "염려 목록을 기도로 옮겨 적어 보면 말씀이 구체적으로 다가옵니다.",
  },
  {
    ref: "이사야 43:1-2",
    reason:
      "두려움과 고립의 자리에서 함께하시는 분을 기억하게 하는 본문입니다.",
    focus:
      "‘두려워하지 말라’는 말씀이 당신의 어떤 두려움과 마주하는지 살펴보세요.",
  },
  {
    ref: "고린도전서 13:4-7",
    reason:
      "관계와 사랑의 방향을 다시 세우는 본문입니다.",
    focus:
      "‘오래 참고’ ‘온유하며’ 같은 표현이 당신의 관계에서 어떤 자리를 찾는지 보세요.",
  },
];

/** 기록에 등장한 성구 키 집합 (장 단위 — 같은 장이면 재사용으로 본다) */
function usedScriptureKeys(entries: EntryForReview[]): Set<string> {
  const keys = new Set<string>();
  for (const entry of entries) {
    for (const raw of entry.scriptureRefs) {
      const parsed = parseBibleReferences(raw)[0];
      if (parsed) keys.add(`${parsed.code}-${parsed.chapter}`);
    }
  }
  return keys;
}

/** fallback용 신규 성구: 사용자가 이미 쓴 본문(장)은 제외하고 최대 2개 제안. */
function pickFallbackScriptureReadings(
  entries: EntryForReview[],
): ScriptureReading[] {
  const used = usedScriptureKeys(entries);
  return FALLBACK_SCRIPTURE_READINGS.filter((r) => {
    const parsed = parseBibleReferences(r.ref)[0];
    return parsed ? !used.has(`${parsed.code}-${parsed.chapter}`) : false;
  }).slice(0, 2);
}


export type ReviewObservation = {
  key: string;
  title: string;
  body: string;
  confidence: "high" | "medium" | "low";
  evidence: Array<{ entryId: string; date: string; excerpt: string }>;
};

export type StoryConnection = {
  story: string;
  source: string;
  connection: string;
  differentPerspective?: string;
};

export type ScriptureReading = {
  ref: string;
  reason: string;
  focus: string;
};

export type NextStep = {
  action: string;
  reason: string;
};

export type PrayerPrompt = {
  topic: string;
  suggestion: string;
};

export type StructuredReview = {
  oneSentence: string;
  themes: ReviewObservation[];
  emotions: ReviewObservation[];
  questions: ReviewObservation[];
  storyConnections: StoryConnection[];
  scriptureConnections: ReviewObservation[];
  scriptureReadings: ScriptureReading[];
  actionFlow: ReviewObservation[];
  changesOrUnknown: string;
  rereadEntries: Array<{ entryId: string; reason: string }>;
  rereadScriptures: RereadScripture[];
  nextSteps: NextStep[];
  prayerPrompts: PrayerPrompt[];
  smallPractices: string[];
  communityQuestions: string[];
  limitations: string;
  disclaimer: string;
  /**
   * 막별 AI 서사 내레이션(선택). 프론트는 이 골격의 narration/transition을
   * 쓰고, 인용구(quotes)는 사용자 원문 evidence에서 채운다(I1).
   * act 키: act-dwell | act-feel | act-word | act-walk. 없으면 프론트 템플릿(I8).
   */
  narrativeActs?: Array<{
    act: string;
    narration: string;
    transition?: string | null;
  }>;
  /** 감정을 점수가 아닌 한 단락 산문으로(선택). */
  emotionProse?: string;
};

export type EntryForReview = {
  id: string;
  entryDate: string;
  title?: string | null;
  scriptureRefs: string[];
  scriptureExcerpt?: string | null;
  reflectionBody: string;
  gratitude?: string | null;
  question?: string | null;
  prayer?: string | null;
  actionStep?: string | null;
  emotions: string[];
  tags: string[];
};


function fallbackReview(entries: EntryForReview[]): StructuredReview {
  const themes = new Map<string, EntryForReview[]>();
  for (const entry of entries) {
    const key = entry.tags[0] || entry.emotions[0] || "일반";
    const list = themes.get(key) ?? [];
    list.push(entry);
    themes.set(key, list);
  }

  const themeObs: ReviewObservation[] = [...themes.entries()].slice(0, 5).map(
    ([key, list]) => ({
      key: `theme-${key}`,
      title: key,
      body: `'${key}'와 연결된 기록이 ${list.length}건 있습니다. 이 흐름이 요즘 마음에 어떤 자리를 차지하는지 조용히 살펴보세요.`,
      confidence: list.length >= 3 ? "high" : "medium",
      evidence: list.slice(0, 3).map((e) => ({
        entryId: e.id,
        date: e.entryDate,
        excerpt: e.reflectionBody.slice(0, 120),
      })),
    }),
  );

  const withAction = entries.filter((e) => e.actionStep?.trim());
  const withQuestion = entries.filter((e) => e.question?.trim());

  return {
    oneSentence: `이 기간에는 ${entries.length}개의 기록이 쌓였고, 말씀 앞에서 머문 마음과 질문이 이어졌습니다.`,
    themes: themeObs,
    emotions: entries
      .flatMap((e) => e.emotions.map((em) => ({ em, e })))
      .slice(0, 4)
      .map(({ em, e }, idx) => ({
        key: `emotion-${idx}`,
        title: em,
        body: `'${em}'의 표현이 기록에 나타납니다. 그 마음이 언제 더 커지고 언제 잦아드는지 살펴볼 수 있습니다.`,
        confidence: "medium" as const,
        evidence: [
          {
            entryId: e.id,
            date: e.entryDate,
            excerpt: e.reflectionBody.slice(0, 100),
          },
        ],
      })),
    questions: withQuestion.slice(0, 4).map((e, idx) => ({
      key: `q-${idx}`,
      title: e.question!.slice(0, 40),
      body: "같은 질문이 다시 떠올랐다면, 아직 끝나지 않은 마음의 대화를 의미할 수 있습니다.",
      confidence: "medium" as const,
      evidence: [
        {
          entryId: e.id,
          date: e.entryDate,
          excerpt: e.question!.slice(0, 120),
        },
      ],
    })),
    scriptureConnections: entries
      .filter((e) => e.scriptureRefs.length > 0)
      .slice(0, 4)
      .map((e, idx) => ({
        key: `sc-${idx}`,
        title: e.scriptureRefs.join(", "),
        body: "이 본문 앞에서 남긴 묵상을 문맥과 함께 다시 읽어보면 좋습니다.",
        confidence: "medium" as const,
        evidence: [
          {
            entryId: e.id,
            date: e.entryDate,
            excerpt: (e.scriptureExcerpt || e.reflectionBody).slice(0, 120),
          },
        ],
      })),
    actionFlow: withAction.slice(0, 4).map((e, idx) => ({
      key: `act-${idx}`,
      title: e.actionStep!.slice(0, 40),
      body: "결단이 기록되어 있습니다. 결과까지 적혀 있지 않다면, 부담 없이 한 줄로만 이어 적어도 충분합니다.",
      confidence: "medium" as const,
      evidence: [
        {
          entryId: e.id,
          date: e.entryDate,
          excerpt: e.actionStep!.slice(0, 120),
        },
      ],
    })),
    changesOrUnknown:
      entries.length < 8
        ? "기록이 아직 많지 않아 변화의 흐름을 단정하기 어렵습니다. 조금 더 쌓인 뒤 다시 돌아보면 좋습니다."
        : "기간 안에서도 기록의 톤이 조금씩 달라집니다. 단정보다 비교하며 읽는 편이 안전합니다.",
    rereadEntries: entries.slice(0, 3).map((e) => ({
      entryId: e.id,
      reason: "이 기간을 대표하는 기록 중 하나입니다.",
    })),
    rereadScriptures: [
      ...new Set(entries.flatMap((e) => e.scriptureRefs)),
    ]
      .slice(0, 3)
      .map((ref) => ({
        ref,
        reason: "해당 기간 기록에 등장한 본문입니다. 문맥과 함께 다시 읽어볼 수 있습니다.",
      })),
    storyConnections: [
      {
        story: "탕자 (누가복음 15)",
        source: "성경",
        connection:
          "겉으로는 아버지를 떠나 제 뜻대로 살던 아들의 이야기처럼 보입니다. 그 안에는 받아들여질 곳을 잃을까 두려워하면서도 스스로 서고 싶은 마음이 있었습니다. 당신의 기록에서 반복되는 '다시 시작하고 싶은 마음'과 겹칩니다. 돌아온 뒤에야 그는 집이 조건이 아니라 자리였음을 알게 됩니다.",
        differentPerspective:
          "실패 후의 귀환만이 아니라, 떠나기 전부터 이미 그리워하던 자리를 향한 이야기입니다.",
      },
      {
        story: "하갈 (창세기 16)",
        source: "성경",
        connection:
          "겉으로는 광야에 버려진 여인의 장면으로 읽힙니다. 그 안에는 '나는 보이지 않는다'는 고립이 있었습니다. 당신이 남긴 기록의 외로움·소외감과 맞닿습니다. 그러나 그 자리에서 하갈은 자신을 보시는 눈을 발견하며 이름이 다시 붙습니다.",
        differentPerspective:
          "버림의 장면이 아니라, 보이지 않던 사람이 비로소 발견되는 장면입니다.",
      },
    ],
    scriptureReadings: pickFallbackScriptureReadings(entries),
    nextSteps: [
      { action: "이번 주 한 번의 묵상만 남겨 보기", reason: "부담 없이 시작하기" },
      { action: "이전 결단 중 하나를 다시 읽고 한 줄 결과 적기", reason: "결단의 흐름을 이어가기" },
    ],
    prayerPrompts: [
      { topic: "공동체", suggestion: "혼자가 아닌 함께하는 믿음에 대해 감사하고, 고립된 사람들을 위해 기도하기" },
      { topic: "사명", suggestion: "받은 은혜를 어떻게 나눌 수 있을지 조용히 돌아보기" },
    ],
    smallPractices: [
      "이번 주 한 번의 묵상만 남겨 보기",
      "이전 결단 중 하나를 다시 읽고 한 줄 결과 적기",
      "마음에 남은 질문 하나를 기도로 옮겨 적기",
    ],
    communityQuestions: [
      "최근에 가장 오래 머문 말씀은 무엇인가요?",
      "반복되는 고민 앞에서 어떤 마음이 드나요?",
    ],
    limitations:
      "이 회고는 제한된 기록만을 바탕으로 한 관찰 초안입니다. 누락된 맥락, 말하지 않은 사정, 공동체의 분별이 더 중요할 수 있습니다.",
    disclaimer: DISCLAIMER,
  };
}

export async function generateReviewWithMimo(
  entries: EntryForReview[],
  reportType: string,
): Promise<{ review: StructuredReview; modelProvider: string; modelName: string }> {
  // 1차: MIMO(주력, reasoning 계열이라 시간 여유) → 2차: DeepSeek(OpenAI 호환 fallback)
  //     → 최종: local-fallback(휴리스틱)
  type Provider = {
    name: string;
    apiKey: string | undefined;
    baseURL: string;
    model: string;
    timeoutMs: number;
    retries: number;
  };
  const providers: Provider[] = [];

  const mimoKey = process.env.MIMO_API_KEY?.trim();
  if (mimoKey) {
    providers.push({
      name: "mimo",
      apiKey: mimoKey,
      baseURL: (process.env.MIMO_BASE_URL || "https://api.xiaomimimo.com/v1").replace(/\/$/, ""),
      model: process.env.MIMO_MODEL || "mimo-v2.5",
      timeoutMs: getLlmTimeoutMs("mimo"),
      retries: 1,
    });
  }

  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (deepseekKey) {
    providers.push({
      name: "deepseek",
      apiKey: deepseekKey,
      baseURL: (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, ""),
      model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
      timeoutMs: getLlmTimeoutMs("deepseek"),
      retries: 1,
    });
  }

  if (providers.length === 0 || entries.length === 0) {
    return {
      review: deepScrubMirror(fallbackReview(entries)),
      modelProvider: providers.length ? providers[0].name : "local-fallback",
      modelName: providers[0]?.model ?? "heuristic-v1",
    };
  }

  // 상황 분류는 첫 번째 provider로 시도한다. 실패해도(콘텐츠 스킵) 회고 생성은 진행.
  let situationPrompt = "";
  const primary = providers[0];
  try {
    const classificationRes = await fetch(`${primary.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${primary.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: primary.model,
        temperature: 0.2,
        ...(primary.name === "deepseek"
          ? { max_tokens: 512, thinking: { type: "disabled" } }
          : { max_completion_tokens: 512 }),
        messages: [
          { role: "system", content: "너는 상황 분류기다. JSON만 응답하라." },
          { role: "user", content: buildClassificationPrompt(entries) },
        ],
      }),
      signal: AbortSignal.timeout(primary.timeoutMs),
    });

    if (classificationRes.ok) {
      const classData = (await classificationRes.json()) as {
        choices?: Array<{
          message?: { content?: string; reasoning_content?: string };
        }>;
      };
      const classMessage = classData.choices?.[0]?.message;
      const classContent =
        classMessage?.content?.trim() ||
        classMessage?.reasoning_content?.trim() ||
        "";
      const classJson = classContent
        ? safeParseJson(extractJson(classContent))
        : null;
      if (classJson) {
        const situationContext = resolveSituationContext({
          primary: typeof classJson.primary === "string" ? classJson.primary : "",
          secondary:
            typeof classJson.secondary === "string"
              ? classJson.secondary
              : undefined,
          theme: typeof classJson.theme === "string" ? classJson.theme : "",
          phase: typeof classJson.phase === "string" ? classJson.phase : "",
          reasoning:
            typeof classJson.reasoning === "string" ? classJson.reasoning : "",
        });
        situationPrompt = buildSituationPrompt(situationContext);
      }
    }
  } catch (error) {
    console.warn("Situation classification skipped", error);
  }

  const system = buildReviewSystemPrompt(situationPrompt);

  const userPayload = {
    reportType,
    entries: entries.map((e) => ({
      id: e.id,
      date: e.entryDate,
      title: e.title,
      scriptureRefs: e.scriptureRefs,
      scriptureExcerpt: e.scriptureExcerpt,
      reflectionBody: e.reflectionBody,
      gratitude: e.gratitude,
      question: e.question,
      prayer: e.prayer,
      actionStep: e.actionStep,
      emotions: e.emotions,
      tags: e.tags,
    })),
    schemaHint: {
      oneSentence: "string",
      themes: [{ key: "", title: "", body: "", confidence: "high|medium|low", evidence: [{ entryId: "", date: "", excerpt: "" }] }],
      emotions: [],
      questions: [],
      scriptureConnections: [],
      actionFlow: [],
      changesOrUnknown: "string",
      rereadEntries: [{ entryId: "", reason: "" }],
      rereadScriptures: [{ ref: "", reason: "", evidenceEntryIds: [""], openQuestion: "" }],
      smallPractices: ["string"],
      communityQuestions: ["string"],
      limitations: "string",
      disclaimer: "string",
      narrativeActs: [{ act: "act-dwell|act-feel|act-word|act-walk", narration: "string", transition: "string|null" }],
      emotionProse: "string",
    },
  };

  async function requestReview(provider: Provider): Promise<{
    review: StructuredReview;
  }> {
    const res = await fetch(`${provider.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: provider.model,
        temperature: 0.4,
        // OpenAI 신형(MIMO)은 max_completion_tokens, DeepSeek OpenAI-compat은 max_tokens.
        // DeepSeek V4는 thinking 기본 enabled라 content가 비고 reasoning만 차는 경우가 있어
        // 회고 JSON 생성에서는 thinking을 끈다.
        ...(provider.name === "deepseek"
          ? { max_tokens: 8192, thinking: { type: "disabled" } }
          : { max_completion_tokens: 8192 }),
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `다음 묵상 기록으로 AI 회고 JSON을 작성하세요.\n${JSON.stringify(userPayload)}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(provider.timeoutMs),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `[${provider.name}] HTTP ${res.status}: ${text.slice(0, 200)}`,
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{
        message?: { content?: string; reasoning_content?: string };
      }>;
    };
    const message = data.choices?.[0]?.message;
    // reasoning 계열은 content가 비고 reasoning_content에만 JSON이 올 수 있다.
    const content =
      message?.content?.trim() ||
      message?.reasoning_content?.trim() ||
      "";
    if (!content) {
      throw new Error(`[${provider.name}] returned empty content`);
    }
    const jsonText = extractJson(content);
    const parsed = safeParseJson(jsonText) as StructuredReview | null;
    if (!parsed) throw new Error(`[${provider.name}] JSON parse failed`);
    parsed.disclaimer = DISCLAIMER;
    return { review: deepScrubMirror(parsed) };
  }

  // provider 순서대로 각각의 재시도 횟수만큼 시도하고, 다음 provider로 넘어간다.
  // 모든 provider 실패 시에만 local-fallback(휴리스틱).
  let lastError: unknown = null;
  for (const provider of providers) {
    for (let attempt = 0; attempt <= provider.retries; attempt++) {
      try {
        const out = await requestReview(provider);
        return {
          review: out.review,
          modelProvider: provider.name,
          modelName: provider.model,
        };
      } catch (error) {
        lastError = error;
        console.warn(`[${provider.name}] generate attempt ${attempt + 1} failed`, error);
      }
    }
  }

  console.error("All providers exhausted", lastError);
  return {
    review: deepScrubMirror(fallbackReview(entries)),
    modelProvider: "local-fallback",
    modelName: "heuristic-v1",
  };
}

function extractJson(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start >= 0 && end > start) return content.slice(start, end + 1);
  throw new Error("No JSON in model response");
}

export { DISCLAIMER };

/** JSON을 파싱하되, 실패 시 가능한 한 복구한다 */
function safeParseJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    let fixed = text
      .replace(/,(\s*[}\]])/g, "$1")
      .replace(/,\s*$/gm, "");
    try {
      return JSON.parse(fixed);
    } catch {
      return null;
    }
  }
}
