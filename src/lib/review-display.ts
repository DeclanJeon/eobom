import type { StructuredReview, ReviewObservation } from "@/lib/mimo";
import { formatDateShort } from "@/lib/utils";

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
  narrativeSkeleton: Array<{ act: string; narration: string; transition: string | null }>;
  emotionProse: string | null;
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

/** 사용자가 실제로 쓴 원문 인용구 — 서사의 주인공. */
export type NarrativeQuote = {
  text: string;
  date?: string;
};

/** 서사의 한 막. AI 내레이션(3인칭 관찰)과 사용자 원문 인용이 교차한다. */
export type NarrativeAct = {
  id: string;
  /** 막의 근거 기록 전체 — 큐레이션 인용 밖 원문은 EvidenceDrawer로 열람(I7). */
  evidence: Array<{ entryId: string; date?: string; excerpt: string }>;
  number: string;
  title: string;
  eyebrow: string;
  /** AI의 조용한 3인칭 관찰. 단정·1인칭 금지. */
  narration: string;
  quotes: NarrativeQuote[];
  /** 다음 막으로 잇는 전환 문장. 마지막 막은 null. */
  transition: string | null;
};

/** 마음의 날씨 — 감정을 점수가 아닌 농도로만 조용히 보여준다. */
export type EmotionTone = {
  label: string;
  weight: number;
};

export type EmotionWeather = {
  prose: string;
  tones: EmotionTone[];
};

export type SimpleReviewView = {
  headline: string;
  prologueSentence: string;
  weather: EmotionWeather | null;
  acts: NarrativeAct[];
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
  /** 만남 막(이야기·새 말씀·사람·재방문 본문)이 렌더되는지 — 단일 소스. */
  hasMeet: boolean;
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
    narrativeSkeleton: (review.narrativeActs ?? [])
      .filter((a) => a?.act && a?.narration?.trim())
      .map((a) => ({
        act: a.act,
        narration: a.narration.trim(),
        transition: a.transition?.trim() || null,
      })),
    emotionProse: review.emotionProse?.trim() || null,
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

/** 한국어 받침 유무로 목적격 조사(을/를)를 고른다. */
function objectiveParticle(word: string): string {
  const last = word.trim().slice(-1);
  if (!last) return "을";
  const code = last.charCodeAt(0);
  // 한글 완성형: 받침 = (code - 0xAC00) % 28
  const hasBatchim = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
  return hasBatchim ? "을" : "를";
}

/**
 * oneSentence가 AI 1인칭 프레임이면 그대로, fallback 기술문
 * ("N개의 기록이 쌓였고…")이면 주제 기반 얼굴로 우회한다.
 * 목록 얼굴과 상세 프롤로그가 같은 규칙을 공유한다.
 */
function firstPersonHeadline(
  one: string | null | undefined,
  theme: string | null | undefined,
  fallback: string,
): string {
  const raw = one?.trim() || "";
  const isFallbackReport = /기록이\s*쌓|기록\s*\d+\s*개|쌓였고/.test(raw);
  if (raw && !isFallbackReport) return raw;
  if (theme) return `‘${theme}’${objectiveParticle(theme)} 붙들고 지나온 시간.`;
  return fallback;
}

/**
 * 목록 카드 얼굴 — 3인칭 분석문이 아닌 그 기간의 1인칭 한 문장과 대표 마음.
 * oneSentence(AI 1인칭 프레임) 우선, 없으면 주제 기반 문장, 그것도 없으면
 * 기간+기록 수로 빈 얼굴을 만들지 않는다.
 */
export function reviewListFace(
  review: StructuredReview | null,
  opts: {
    entryCount: number;
    periodStart: Date | string;
    periodEnd: Date | string;
  },
): { sentence: string; mood: string | null } {
  const theme = review?.themes?.[0]?.title?.trim();
  const fallback =
    opts.entryCount > 0
      ? `기록 ${opts.entryCount}편이 쌓인, ${formatDateShort(opts.periodStart)} – ${formatDateShort(opts.periodEnd)}의 나.`
      : `${formatDateShort(opts.periodStart)} – ${formatDateShort(opts.periodEnd)}의 기록.`;
  const sentence = firstPersonHeadline(review?.oneSentence, theme, fallback);
  const mood = review?.emotions?.[0]?.title?.trim() || null;
  return { sentence, mood };
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

/** 관측 묶음에서 사용자 원문 인용구를 중복 없이 모아 서사의 주인공으로 세운다. */
function collectQuotes(
  groups: DisplayObservation[],
  max: number,
): NarrativeQuote[] {
  const seen = new Set<string>();
  const out: NarrativeQuote[] = [];
  for (const g of groups) {
    for (const e of g.evidence) {
      const text = e.excerpt?.trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      out.push({ text, date: e.date });
      if (out.length >= max) return out;
    }
  }
  return out;
}

/** 막을 구성하는 관측 묶음의 근거 기록 전체를 평탄화한다(I7). */
function allEvidence(
  groups: DisplayObservation[],
): Array<{ entryId: string; date?: string; excerpt: string }> {
  return groups.flatMap((g) => g.evidence);
}

/** 감정을 점수가 아닌 마음의 날씨(산문 + 농도)로 옮긴다. */
function buildEmotionWeather(display: DisplayReview): EmotionWeather | null {
  const tones: EmotionTone[] = display.emotions
    .map((e, idx) => ({
      label: e.title.trim(),
      weight: Math.max(1, 3 - idx),
    }))
    .filter((t) => t.label)
    .slice(0, 4);

  const proseParts = display.emotions
    .map((e) => e.body?.trim())
    .filter((b): b is string => Boolean(b));

  const prose =
    display.emotionProse ||
    proseParts.join(" ") ||
    (tones.length
      ? `기록을 따라가면 마음은 한 자리에 머물지 않습니다. ${tones.map((t) => t.label).join("과 ")}이 번갈아 찾아왔습니다.`
      : "");

  if (!prose && tones.length === 0) return null;
  return { prose, tones };
}

/**
 * 6개 관측 서랍을 인과 순서의 4막 서사로 재조립한다.
 * AI 내레이션은 3인칭 관찰·"기록이 가리키는 방향"만 허용하고,
 * 사용자의 신앙 상태·하나님의 뜻·정답을 단정하지 않는다(I1).
 */
function buildNarrativeActs(display: DisplayReview): NarrativeAct[] {
  const skel = new Map(
    display.narrativeSkeleton.map((s) => [s.act, s]),
  );
  const acts: NarrativeAct[] = [];
  const num = () => String(acts.length + 1).padStart(2, "0");
  const narr = (act: string, fallback: string) =>
    skel.get(act)?.narration?.trim() || fallback;
  const trans = (act: string, fallback: string | null): string | null => {
    const s = skel.get(act);
    if (s) return s.transition?.trim() || null;
    return fallback;
  };

  const dwellThemes = display.themes;
  const dwellQuestions = display.questions;
  if (dwellThemes.length || dwellQuestions.length) {
    const themeTitles = dwellThemes.map((t) => t.title).filter(Boolean);
    acts.push({
      id: "act-dwell",
      number: num(),
      title: "머물던 자리",
      eyebrow: "무엇으로 묵상했고, 무엇이 걸렸는지",
      narration: narr(
        "act-dwell",
        themeTitles.length
          ? `이 기간의 기록은 한 방향을 가리킵니다. ${themeTitles.slice(0, 2).map((t) => `‘${t}’`).join("과 ")}${themeTitles.length > 2 ? " 같은 결" : ""}이 반복해 보입니다.`
          : "이 기간의 기록은 붙들고 있던 것과 계속 걸려 있던 질문을 보여 줍니다.",
      ),
      quotes: collectQuotes([...dwellThemes, ...dwellQuestions], 4),
      evidence: allEvidence([...dwellThemes, ...dwellQuestions]),
      transition: trans(
        "act-dwell",
        "그래서 이 마음은, 말씀 앞에서 한 곳을 건드려집니다.",
      ),
    });
  }

  if (display.emotions.length) {
    const labels = display.emotions.map((e) => e.title).filter(Boolean);
    acts.push({
      id: "act-feel",
      number: num(),
      title: "마음의 결",
      eyebrow: "어떤 생각과 감정이 오갔는지",
      narration: narr(
        "act-feel",
        display.emotions[0]?.body?.trim() ||
          (labels.length
            ? `기록을 따라가면 마음은 한 자리에 머물지 않습니다. ${labels.slice(0, 3).join("과 ")}이 번갈아 찾아온 흔적이 보입니다.`
            : "마음의 결이 기록 사이사이에 배어 있습니다."),
      ),
      quotes: collectQuotes(display.emotions, 3),
      evidence: allEvidence(display.emotions),
      transition: trans(
        "act-feel",
        "이 마음의 결은 말씀과 만나, 천천히 방향을 틀었습니다.",
      ),
    });
  }

  const wordGroups = [...display.scriptureConnections, ...display.actionFlow];
  if (wordGroups.length) {
    const refs = display.scriptureConnections
      .map((s) => s.title)
      .filter(Boolean);
    acts.push({
      id: "act-word",
      number: num(),
      title: "말씀이 건드린 곳",
      eyebrow: "어떻게 묵상했고, 어디로 기울었는지",
      narration: narr(
        "act-word",
        refs.length
          ? `${refs.slice(0, 2).join(", ")} 같은 본문이 기록의 마음에 닿은 흔적이 보입니다. 말씀이 와서 한 곳을 비추고, 마음이 어느 쪽으로 기울었는지 기록이 말해 줍니다.`
          : "말씀과의 만남이 기록의 마음에 닿아, 마음이 기울어진 방향이 보입니다.",
      ),
      quotes: collectQuotes(wordGroups, 3),
      evidence: allEvidence(wordGroups),
      transition: trans(
        "act-word",
        "그리고 그 만남은, 앞으로의 걸음으로 이어집니다.",
      ),
    });
  }

  const forward =
    display.nextSteps.length ||
    display.prayerPrompts.length ||
    display.smallPractices.length ||
    display.changesOrUnknown;
  if (forward) {
    acts.push({
      id: "act-walk",
      number: num(),
      title: "내가 걷고 싶은 길",
      eyebrow: "무엇을 하고 싶고, 어떻게 나아가고 싶은지",
      narration: narr(
        "act-walk",
        "기록은 여기에서 멈추지 않습니다. 하고 싶은 것과 걸어 보고 싶은 길, 아직 알 수 없는 것까지 함께 남겨 두었습니다.",
      ),
      quotes: display.changesOrUnknown
        ? []
        : collectQuotes(display.actionFlow, 2),
      evidence: allEvidence(display.actionFlow),
      transition: trans("act-walk", null),
    });
  }

  return acts;
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
  const headline = firstPersonHeadline(
    display.oneSentence,
    display.themes[0]?.title,
    "이 기간의 기록을 한곳에 모아 보았습니다",
  );

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
    prologueSentence: headline,
    weather: buildEmotionWeather(display),
    acts: buildNarrativeActs(display),
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
    hasMeet:
      stories.length > 0 ||
      scriptures.length > 0 ||
      companions.length > 0 ||
      rereadScriptures.length > 0,
  };
}
