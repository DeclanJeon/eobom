import type { RereadScripture } from "@/lib/reread-scriptures";
import { deepScrubMirror } from "@/lib/content-scrub";

const DISCLAIMER =
  "이 회고는 사용자가 남긴 기록을 정리한 성찰 자료입니다. 하나님의 뜻, 신앙 상태 또는 성경의 최종 해석을 판정하지 않으며, 기도와 성경 본문 읽기, 공동체의 분별을 대신하지 않습니다.";


export type ReviewObservation = {
  key: string;
  title: string;
  body: string;
  confidence: "high" | "medium" | "low";
  evidence: Array<{ entryId: string; date: string; excerpt: string }>;
};

export type StructuredReview = {
  oneSentence: string;
  themes: ReviewObservation[];
  emotions: ReviewObservation[];
  questions: ReviewObservation[];
  scriptureConnections: ReviewObservation[];
  actionFlow: ReviewObservation[];
  changesOrUnknown: string;
  rereadEntries: Array<{ entryId: string; reason: string }>;
  rereadScriptures: RereadScripture[];
  smallPractices: string[];
  communityQuestions: string[];
  limitations: string;
  disclaimer: string;
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
  const apiKey = process.env.MIMO_API_KEY?.trim();
  const baseURL = (process.env.MIMO_BASE_URL || "https://api.xiaomimimo.com/v1").replace(
    /\/$/,
    "",
  );
  const model = process.env.MIMO_MODEL || "mimo-v2.5-pro";

  if (!apiKey || entries.length === 0) {
    return {
      review: deepScrubMirror(fallbackReview(entries)),
      modelProvider: apiKey ? "mimo" : "local-fallback",
      modelName: apiKey ? model : "heuristic-v1",
    };
  }

  const system = `당신은 개인 묵상 기록을 정리하는 성찰 도우미입니다.
절대 금지: 하나님의 뜻을 판정, 믿음 평가, 죄 확정, 소명 선언, 예언, 의료/법률 단정.
rereadScriptures는 처방이나 추천이 아닌, 사용자가 기록에서 다시 방문할 본문 제안입니다. entries.scriptureRefs에 있는 본문만 선택하세요. 문맥을 위해 절 범위를 우선하고 최대 3개까지만 제시하며, 해당 본문이 없으면 빈 배열을 반환하세요. 추천, 오늘의 성구, 하나님이 주시는, 이 말씀이 답과 같은 표현을 사용하지 마세요.
출력은 반드시 JSON 객체 하나만. 한국어. 모든 관찰은 제공된 기록 id와 인용 근거를 포함.
disclaimer 필드에는 다음 문장을 그대로 넣으세요: ${DISCLAIMER}`;

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
    },
  };

  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_completion_tokens: 4096,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `다음 묵상 기록으로 AI 회고 JSON을 작성하세요.\n${JSON.stringify(userPayload)}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("MiMo error", res.status, text);
      return {
        review: deepScrubMirror(fallbackReview(entries)),
        modelProvider: "local-fallback",
        modelName: "heuristic-v1",
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    const jsonText = extractJson(content);
    const parsed = JSON.parse(jsonText) as StructuredReview;
    parsed.disclaimer = DISCLAIMER;
    return {
      review: deepScrubMirror(parsed),
      modelProvider: "mimo",
      modelName: model,
    };
  } catch (error) {
    console.error("MiMo generate failed", error);
    return {
      review: deepScrubMirror(fallbackReview(entries)),
      modelProvider: "local-fallback",
      modelName: "heuristic-v1",
    };
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

export { DISCLAIMER };
