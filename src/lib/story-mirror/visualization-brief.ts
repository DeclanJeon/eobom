/**
 * Story Mirror — Visualization brief
 *
 * 회고·기록 원문을 AI가 종합해 (1) 유저에게 보여줄 해설과
 * (2) 이미지 생성에 쓸 장면 브리프를 만든다.
 * 하드코딩된 범용 장면 프롬프트 대신 이 브리프가 이미지의 주 입력이다.
 */

import { db } from "@/lib/db";
import type { StructuredReview } from "@/lib/mimo";
import {
  normalizeReviewForDisplay,
  type DisplayReview,
} from "@/lib/review-display";
import { parseJsonArray } from "@/lib/utils";

export type VisualizationBrief = {
  headline: string;
  /** 유저에게 보여줄 한국어 종합 해설 */
  synthesis: string;
  /** 이미지 생성기에 넘길 장면·분위기 브리프 (텍스트/인물 없음) */
  imageBrief: string;
  themes: string[];
  emotions: string[];
};

export type VisualizationBriefResult = {
  brief: VisualizationBrief;
  entryCount: number;
  reviewId: string | null;
  source: "mimo" | "review-fallback" | "entries-fallback";
};

type EntryRow = {
  id: string;
  entryDate: Date;
  title: string | null;
  scriptureRefs: string;
  reflectionBody: string;
  gratitude: string | null;
  question: string | null;
  prayer: string | null;
  actionStep: string | null;
  emotions: string;
  tags: string;
};

function extractJson(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start >= 0 && end > start) return content.slice(start, end + 1);
  throw new Error("No JSON in model response");
}

function safeParseJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    try {
      return JSON.parse(text.replace(/,(\s*[}\]])/g, "$1").replace(/,\s*$/gm, ""));
    } catch {
      return null;
    }
  }
}

function asStringArray(value: unknown, limit = 5): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .slice(0, limit);
}

function fallbackFromReview(
  review: DisplayReview,
  entryCount: number,
): VisualizationBrief {
  const themes = review.themes.map((t) => t.title).filter(Boolean).slice(0, 5);
  const emotions = review.emotions.map((e) => e.title).filter(Boolean).slice(0, 5);
  const themeBodies = review.themes
    .map((t) => t.body)
    .filter(Boolean)
    .slice(0, 3)
    .join(" ");
  const emotionBodies = review.emotions
    .map((e) => e.body)
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
  const headline =
    review.oneSentence?.trim() ||
    (themes[0]
      ? `${themes[0]}을 중심으로 머문 한 계절`
      : `${entryCount}개의 기록이 남긴 마음`);
  const synthesis = [
    review.oneSentence?.trim(),
    themeBodies,
    emotionBodies,
    review.changesOrUnknown?.trim(),
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 700);
  const imageBrief = [
    "Abstract editorial watercolor of an inner spiritual season.",
    themes.length ? `Motifs suggested by themes: ${themes.join(", ")}.` : "",
    emotions.length ? `Emotional weather: ${emotions.join(", ")}.` : "",
    themeBodies ? `Narrative tone: ${themeBodies.slice(0, 280)}` : "",
    "No people, no faces, no text. Quiet Korean minimal landscape or still-life metaphor only.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    headline,
    synthesis:
      synthesis ||
      `이 기간의 기록 ${entryCount}건에서 반복된 마음과 질문이 하나의 흐름으로 이어지고 있습니다.`,
    imageBrief,
    themes,
    emotions,
  };
}

function fallbackFromEntries(entries: EntryRow[], entryCount: number): VisualizationBrief {
  const themes = [
    ...new Set(entries.flatMap((e) => parseJsonArray(e.tags)).filter(Boolean)),
  ].slice(0, 5);
  const emotions = [
    ...new Set(entries.flatMap((e) => parseJsonArray(e.emotions)).filter(Boolean)),
  ].slice(0, 5);
  const excerpts = entries
    .map((e) => e.reflectionBody.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((t) => t.slice(0, 120));
  const headline = themes[0]
    ? `${themes[0]} 주변을 맴돈 기록`
    : `${entryCount}개의 묵상이 남긴 자리`;
  const synthesis = [
    `최근 기록 ${entryCount}건을 보면`,
    themes.length ? `‘${themes.join("’, ‘")}’ 주제가 반복되고` : "비슷한 마음이 이어지고",
    emotions.length ? `‘${emotions.join("’, ‘")}’ 감정이 자주 드러납니다.` : "조용한 성찰이 이어집니다.",
    excerpts[0] ? `예를 들면 “${excerpts[0]}” 같은 문장이 그 흐름을 보여 줍니다.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const imageBrief = [
    "Abstract watercolor summarizing a personal season of prayer and reflection.",
    themes.length ? `Theme motifs: ${themes.join(", ")}.` : "",
    emotions.length ? `Mood: ${emotions.join(", ")}.` : "",
    excerpts[0] ? `Tone cue (do not paint words): ${excerpts[0]}` : "",
    "No people, faces, or text. Soft Korean minimal aesthetics.",
  ]
    .filter(Boolean)
    .join(" ");
  return { headline, synthesis, imageBrief, themes, emotions };
}

async function generateBriefWithMimo(input: {
  entries: EntryRow[];
  review: DisplayReview | null;
  entryCount: number;
}): Promise<VisualizationBrief | null> {
  const apiKey = process.env.MIMO_API_KEY?.trim();
  if (!apiKey) return null;
  const baseURL = (process.env.MIMO_BASE_URL || "https://api.xiaomimimo.com/v1").replace(
    /\/$/,
    "",
  );
  const model = process.env.MIMO_MODEL || "mimo-v2.5";

  const system = `당신은 개인 묵상 기록을 종합하는 성찰 도우미입니다.
절대 금지: 하나님의 뜻 판정, 믿음 평가, 죄 확정, 소명 선언, 예언, 의료/법률 단정.
출력은 JSON 객체 하나만. 한국어 필드는 한국어로.

필드:
- headline: 한 줄 제목 (40자 이내)
- synthesis: 유저에게 보여줄 2~4문장. "당신이 남긴 기록에서 …" 톤으로, 어떤 기록/생각/감정이 반복되는지 종합. 판정하지 말고 비춰 주기.
- imageBrief: 이미지 생성용 영어 장면 브리프 2~4문장. 추상 수채화. 사람/얼굴/글자 금지. 회고의 주제·감정·이미지를 시각 은유로만.
- themes: 문자열 배열 2~5개
- emotions: 문자열 배열 2~5개`;

  const payload = {
    entryCount: input.entryCount,
    review: input.review
      ? {
          oneSentence: input.review.oneSentence,
          themes: input.review.themes.map((t) => ({ title: t.title, body: t.body })),
          emotions: input.review.emotions.map((e) => ({ title: e.title, body: e.body })),
          questions: input.review.questions.map((q) => ({ title: q.title, body: q.body })),
          changesOrUnknown: input.review.changesOrUnknown,
        }
      : null,
    entries: input.entries.slice(0, 12).map((e) => ({
      date: e.entryDate.toISOString().slice(0, 10),
      title: e.title,
      scriptureRefs: parseJsonArray(e.scriptureRefs),
      reflectionBody: e.reflectionBody.slice(0, 500),
      gratitude: e.gratitude,
      question: e.question,
      prayer: e.prayer,
      actionStep: e.actionStep,
      emotions: parseJsonArray(e.emotions),
      tags: parseJsonArray(e.tags),
    })),
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
        temperature: 0.5,
        max_completion_tokens: 2048,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `다음 묵상 기록·회고를 종합해 시각화 브리프 JSON을 작성하세요.\n${JSON.stringify(payload)}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("[visualization-brief] MiMo error", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    const parsed = safeParseJson(extractJson(content));
    if (!parsed) return null;

    const headline =
      typeof parsed.headline === "string" ? parsed.headline.trim() : "";
    const synthesis =
      typeof parsed.synthesis === "string" ? parsed.synthesis.trim() : "";
    const imageBrief =
      typeof parsed.imageBrief === "string" ? parsed.imageBrief.trim() : "";
    if (!headline || !synthesis || !imageBrief) return null;

    return {
      headline: headline.slice(0, 80),
      synthesis: synthesis.slice(0, 900),
      imageBrief: imageBrief.slice(0, 900),
      themes: asStringArray(parsed.themes),
      emotions: asStringArray(parsed.emotions),
    };
  } catch (err) {
    console.error("[visualization-brief] MiMo failed", err);
    return null;
  }
}

/**
 * 사용자의 최신 회고 + 최근 기록으로 시각화 브리프를 만든다.
 */
export async function buildVisualizationBrief(
  userId: string,
): Promise<VisualizationBriefResult> {
  const entries = await db.reflectionEntry.findMany({
    where: { userId, deletedAt: null },
    orderBy: { entryDate: "desc" },
    take: 20,
    select: {
      id: true,
      entryDate: true,
      title: true,
      scriptureRefs: true,
      reflectionBody: true,
      gratitude: true,
      question: true,
      prayer: true,
      actionStep: true,
      emotions: true,
      tags: true,
    },
  });

  const entryCount = entries.length;
  const report = await db.reviewReport.findFirst({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  let review: DisplayReview | null = null;
  if (report?.structuredOutput) {
    try {
      review = normalizeReviewForDisplay(
        JSON.parse(report.structuredOutput) as StructuredReview,
      );
    } catch {
      review = null;
    }
  }

  const mimo = await generateBriefWithMimo({ entries, review, entryCount });
  if (mimo) {
    return {
      brief: mimo,
      entryCount,
      reviewId: report?.id ?? null,
      source: "mimo",
    };
  }

  if (review) {
    return {
      brief: fallbackFromReview(review, entryCount),
      entryCount,
      reviewId: report?.id ?? null,
      source: "review-fallback",
    };
  }

  return {
    brief: fallbackFromEntries(entries, entryCount),
    entryCount,
    reviewId: null,
    source: "entries-fallback",
  };
}
