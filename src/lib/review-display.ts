import type { StructuredReview, ReviewObservation } from "@/lib/mimo";

export const CONFIDENCE_LABEL: Record<string, string> = {
  high: "여러 기록에서 보임",
  medium: "자주 보임",
  low: "한 기록에서 보임",
};


export function meaningfulObservation(item: ReviewObservation): boolean {
  return Boolean(item?.title?.trim() || item?.body?.trim());
}

const CAPS = {
  themes: 5,
  emotions: 5,
  questions: 5,
  scriptureConnections: 5,
  actionFlow: 5,
  storyConnections: 3,
  scriptureReadings: 3,
  nextSteps: 2,
  prayerPrompts: 2,
  smallPractices: 3,
} as const;

export type DisplayObservation = {
  key: string;
  title: string;
  body: string;
  confidenceLabel: string | null;
  evidence: Array<{ entryId: string; date?: string; excerpt: string }>;
};

export type DisplayReview = {
  oneSentence: string | null;
  themes: DisplayObservation[];
  emotions: DisplayObservation[];
  questions: DisplayObservation[];
  scriptureConnections: DisplayObservation[];
  storyConnections: StructuredReview["storyConnections"];
  scriptureReadings: StructuredReview["scriptureReadings"];
  actionFlow: DisplayObservation[];
  changesOrUnknown: string | null;
  rereadEntries: StructuredReview["rereadEntries"];
  rereadScriptures: StructuredReview["rereadScriptures"];
  nextSteps: StructuredReview["nextSteps"];
  prayerPrompts: StructuredReview["prayerPrompts"];
  smallPractices: string[];
  limitations: string | null;
  disclaimer: string | null;
};

export type SimpleReviewStory = {
  title: string;
  source?: string | null;
  line: string;
  href?: string;
};

export type SimpleReviewScripture = {
  ref: string;
  why: string;
};

export type SimpleReviewCompanion = {
  role: string;
  why: string;
};

export type SimpleReviewView = {
  headline: string;
  summary: string;
  themes: DisplayObservation[];
  questions: DisplayObservation[];
  emotions: DisplayObservation[];
  scriptureConnections: DisplayObservation[];
  actionFlow: DisplayObservation[];
  changesOrUnknown: string | null;
  nextSteps: StructuredReview["nextSteps"];
  prayerPrompts: StructuredReview["prayerPrompts"];
  smallPractices: string[];
  stories: SimpleReviewStory[];
  scriptures: SimpleReviewScripture[];
  rereadScriptures: SimpleReviewScripture[];
  companions: SimpleReviewCompanion[];
};


function mapObservation(item: ReviewObservation): DisplayObservation {
  return {
    key: item.key,
    title: item.title?.trim() ?? "",
    body: item.body?.trim() ?? "",
    confidenceLabel: item.confidence ? CONFIDENCE_LABEL[item.confidence] ?? null : null,
    evidence: (item.evidence ?? []).map((e) => ({
      entryId: e.entryId,
      date: e.date,
      excerpt: e.excerpt,
    })),
  };
}

function capAndFilter<T>(
  items: T[] | undefined | null,
  keep: (item: T) => boolean,
  max: number,
): T[] {
  const list = Array.isArray(items) ? items : [];
  return list.filter(keep).slice(0, max);
}

const DEFAULT_LIMITATIONS =
  "이 문서는 사용자가 남긴 기록을 정리한 성찰 자료입니다. 하나님의 뜻이나 신앙 상태를 판정하지 않으며, 기도와 말씀 읽기, 공동체의 분별을 대신하지 않습니다.";

/**
 * 회고 데이터를 화면 표시용으로 정규화한다.
 * - 내부 enum/blank 필드 제거
 * - 빈 title/body 관찰 제외
 * - 배열 상한 적용
 * - provider/model 정보는 노출하지 않음
 */
export function normalizeReviewForDisplay(review: StructuredReview): DisplayReview {
  return {
    oneSentence: review.oneSentence?.trim() || null,
    themes: capAndFilter(review.themes, meaningfulObservation, CAPS.themes).map(
      mapObservation,
    ),
    emotions: capAndFilter(review.emotions, meaningfulObservation, CAPS.emotions).map(
      mapObservation,
    ),
    questions: capAndFilter(review.questions, meaningfulObservation, CAPS.questions).map(
      mapObservation,
    ),
    scriptureConnections: capAndFilter(
      review.scriptureConnections,
      meaningfulObservation,
      CAPS.scriptureConnections,
    ).map(mapObservation),
    storyConnections: capAndFilter(
      review.storyConnections,
      (s) => Boolean(s?.story?.trim() && s?.connection?.trim()),
      CAPS.storyConnections,
    ),
    scriptureReadings: capAndFilter(
      review.scriptureReadings,
      (s) => Boolean(s?.ref?.trim()),
      CAPS.scriptureReadings,
    ),
    actionFlow: capAndFilter(review.actionFlow, meaningfulObservation, CAPS.actionFlow).map(
      mapObservation,
    ),
    changesOrUnknown: review.changesOrUnknown?.trim() || null,
    rereadEntries: (review.rereadEntries ?? [])
      .filter((r) => r?.entryId)
      .slice(0, 5),
    rereadScriptures: (review.rereadScriptures ?? [])
      .filter((r) => r?.ref?.trim())
      .slice(0, 3),
    nextSteps: (review.nextSteps ?? [])
      .filter((n) => n?.action?.trim())
      .slice(0, CAPS.nextSteps),
    prayerPrompts: (review.prayerPrompts ?? [])
      .filter((p) => p?.topic?.trim())
      .slice(0, CAPS.prayerPrompts),
    smallPractices: (review.smallPractices ?? [])
      .filter((s) => s?.trim())
      .slice(0, CAPS.smallPractices),
    limitations: review.limitations?.trim() || null,
    disclaimer: review.disclaimer?.trim() || null,
  };
}

/**
 * 기본 한계 문구를 보장한다. limitations가 비어 있으면 제품 고정 문구 사용.
 */
export function reviewLimitationsText(display: DisplayReview): string {
  return display.limitations || display.disclaimer || DEFAULT_LIMITATIONS;
}

const REPORT_TYPE_LABEL: Record<string, string> = {
  cumulative: "기간 회고",
  monthly: "월간 회고",
  weekly: "주간 회고",
  daily: "일간 회고",
  single: "단일 회고",
};

export function reportTypeLabel(type?: string | null): string {
  if (!type) return "회고";
  const key = type.trim().toLowerCase();
  return REPORT_TYPE_LABEL[key] ?? type.trim();
}

function uniqueLines(lines: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
    if (out.length >= max) break;
  }
  return out;
}


function buildSummaryProse(display: DisplayReview): string {
  const chunks: string[] = [];

  const themeBits = display.themes
    .slice(0, 3)
    .map((t) => t.title || t.body)
    .filter(Boolean);
  if (themeBits.length) {
    chunks.push(`이 기간의 기록에서는 ${themeBits.join(", ")} 흐름이 자주 보였습니다.`);
  }

  const emotionBits = display.emotions
    .slice(0, 3)
    .map((e) => e.title || e.body)
    .filter(Boolean);
  if (emotionBits.length) {
    chunks.push(`마음 한편에는 ${emotionBits.join(", ")} 같은 결이 반복되었습니다.`);
  }

  const questionBits = display.questions
    .slice(0, 2)
    .map((q) => q.title || q.body)
    .filter(Boolean);
  if (questionBits.length) {
    chunks.push(`붙들고 있던 질문은 ‘${questionBits.join("’, ‘")}’ 쪽이었습니다.`);
  }

  if (display.changesOrUnknown) {
    chunks.push(display.changesOrUnknown);
  }

  if (chunks.length === 0 && display.oneSentence) {
    return display.oneSentence;
  }

  return chunks.join(" ");
}

function peopleOriented(text: string): boolean {
  return /사람|친구|동반|멘토|목회|상담|가족|공동체|나눔|함께|대화|동역|그룹|선배|이웃/.test(
    text,
  );
}

function buildCompanions(display: DisplayReview): SimpleReviewCompanion[] {
  const out: SimpleReviewCompanion[] = [];

  for (const step of display.nextSteps) {
    const blob = `${step.action} ${step.reason ?? ""}`;
    if (!peopleOriented(blob)) continue;
    out.push({
      role: step.action.trim(),
      why: step.reason?.trim() || "이 시기의 기록과 맞닿아 있는 다음 관계 한 걸음입니다.",
    });
  }

  for (const p of display.prayerPrompts) {
    const blob = `${p.topic} ${p.suggestion ?? ""}`;
    if (!peopleOriented(blob)) continue;
    out.push({
      role: p.topic.trim(),
      why: p.suggestion?.trim() || "기도 안에서 함께 붙들 수 있는 관계의 방향입니다.",
    });
  }

  if (out.length === 0) {
    const theme = display.themes[0]?.title;
    const emotion = display.emotions[0]?.title;
    if (theme || emotion) {
      out.push({
        role: "같은 질문을 들어줄 동반자",
        why: [
          theme ? `‘${theme}’ 이야기를` : "이 기간의 이야기를",
          "판단 없이 들어 줄 한 사람이 있으면 숨통이 트입니다.",
        ].join(" "),
      });
      out.push({
        role: "말씀을 같이 읽어 줄 사람",
        why: "혼자 해석을 확정하기보다, 본문을 나란히 읽고 질문만 나눠도 충분합니다.",
      });
      if (emotion) {
        out.push({
          role: "마음을 안전하게 나눌 작은 관계",
          why: `‘${emotion}’ 같은 결을 숨기지 않아도 되는 자리 하나가 도움이 됩니다.`,
        });
      }
    } else {
      out.push({
        role: "조용히 함께 걸어 줄 한 사람",
        why: "조언을 많이 주기보다, 기록을 들어 주고 기도로 동행해 줄 관계가 필요합니다.",
      });
    }
  }

  return uniqueLines(
    out.map((c) => `${c.role}|||${c.why}`),
    3,
  ).map((line) => {
    const [role, why] = line.split("|||");
    return { role, why };
  });
}

/**
 * 회고 상세를 4블록 단순 뷰로 접는다.
 * stories href는 호출측에서 채워도 되고, 여기선 텍스트만 준비한다.
 */
export function toSimpleReviewView(
  display: DisplayReview,
  opts?: {
    stories?: SimpleReviewStory[];
    communityQuestions?: string[];
  },
): SimpleReviewView {
  const headline =
    display.oneSentence ||
    display.themes[0]?.title ||
    "이 기간의 기록을 한곳에 모아 보았습니다";

  const summary = buildSummaryProse(display);

  const stories: SimpleReviewStory[] =
    opts?.stories?.slice(0, 3) ??
    display.storyConnections.slice(0, 3).map((sc) => ({
      title: sc.story,
      source: sc.source,
      line:
        sc.differentPerspective?.trim() ||
        sc.connection.split(/(?<=[.!?。…])\s+/)[0] ||
        sc.connection,
    }));

  const scriptures: SimpleReviewScripture[] = display.scriptureReadings
    .slice(0, 3)
    .map((s) => ({
      ref: s.ref,
      why: s.reason?.trim() || s.focus?.trim() || "이 시기에 다시 머물 만한 본문입니다.",
    }));

  const rereadScriptures: SimpleReviewScripture[] = display.rereadScriptures
    .slice(0, 3)
    .map((s) => ({
      ref: s.display || s.ref,
      why: s.openQuestion || s.reason || "지난 기록에서 이어진 본문입니다.",
    }));

  const companions = buildCompanions(display);

  // community questions can enrich companions if still short
  if (companions.length < 3 && opts?.communityQuestions?.length) {
    for (const q of opts.communityQuestions) {
      if (companions.length >= 3) break;
      const text = q.trim();
      if (!text) continue;
      companions.push({
        role: "나눔이 가능한 관계",
        why: `함께 나눠볼 질문: ${text}`,
      });
    }
  }

  return {
    headline,
    summary: summary || headline,
    themes: display.themes.slice(0, 3),
    questions: display.questions.slice(0, 3),
    emotions: display.emotions.slice(0, 3),
    scriptureConnections: display.scriptureConnections.slice(0, 3),
    actionFlow: display.actionFlow.slice(0, 3),
    changesOrUnknown: display.changesOrUnknown,
    nextSteps: display.nextSteps.slice(0, 3),
    prayerPrompts: display.prayerPrompts.slice(0, 3),
    smallPractices: display.smallPractices.slice(0, 3),
    stories,
    scriptures,
    rereadScriptures,
    companions: companions.slice(0, 3),
  };
}
