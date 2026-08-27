import type { BibleReference } from "@/lib/bible/types";

export type StoryApplication = {
  title: string;
  body: string[];
  closing: string;
};

// 다윳(다윗 오타 대응) — 검색 대응용 주석: 다윳
const STORIES: Record<string, StoryApplication> = {
  hagar: {
    title: "하갈 — 보이지 않던 사람이 발견되는 장면",
    body: [
      "겉으로는 광야에 버려진 여인의 장면으로 읽힙니다.",
      "그 안에는 '나는 보이지 않는다'는 고립이 있었습니다.",
      "그러나 그 자리에서 하갈은 자신을 보시는 눈을 발견하며 이름이 다시 붙습니다.",
    ],
    closing: "버림의 장면이 아니라, 발견되는 장면입니다.",
  },
  joseph: {
    title: "요셉 — 꿈이 꺾이는 자리에서 길이 열리는 장면",
    body: [
      "겉으로는 꿈이 배신당한 장면으로 읽힙니다.",
      "그 안에는 기다림과 오해가 겹쳐 있었습니다.",
      "그러나 요셉은 꺾인 자리에서 새로운 길을 건너며 삶을 다시 이어갑니다.",
    ],
    closing: "끝난 이야기가 아니라, 이어지는 장면입니다.",
  },
  moses: {
    title: "모세 — 광야에서 부르심을 듣는 장면",
    body: [
      "겉으로는 광야를 떠도는 장면으로 읽힙니다.",
      "그 안에는 '내가 누구인가'라는 물음이 있었습니다.",
      "그러나 그 자리에서 모세는 떨리는 손으로 부르심을 듣고 한 걸음을 내딛습니다.",
    ],
    closing: "도망의 장면이 아니라, 부르심의 장면입니다.",
  },
  david: {
    title: "다윗 — 흔들리면서도 돌이켜지는 장면",
    body: [
      "겉으로는 왕이 무너지는 장면으로 읽힙니다.",
      "그 안에는 흔들림과 후회가 겹쳐 있었습니다.",
      "그러나 다윗은 넘어진 자리에서 다시 일어나 돌이키는 길을 배웁니다.",
    ],
    closing: "실패의 장면이 아니라, 돌이킴의 장면입니다.",
  },
  ruth: {
    title: "룻 — 남겨진 자리에서 함께 걸어가는 장면",
    body: [
      "겉으로는 모든 것을 잃은 장면으로 읽힙니다.",
      "그 안에는 '어디로 가야 하는가'라는 막막함이 있었습니다.",
      "그러나 룻은 남겨진 자리에서 함께 걷는 선택으로 새로운 이야기가 됩니다.",
    ],
    closing: "남겨짐의 장면이 아니라, 동행의 장면입니다.",
  },
  paul: {
    title: "바울 — 넘어진 자리에서 다시 부르심을 듣는 장면",
    body: [
      "겉으로는 길이 끊긴 장면으로 읽힙니다.",
      "그 안에는 확신이 무너지는 혼란이 있었습니다.",
      "그러나 바울은 넘어진 자리에서 새로운 빛을 보고 다시 일어나 걸어갑니다.",
    ],
    closing: "끝의 장면이 아니라, 다시 시작되는 장면입니다.",
  },
};

const NEW_TESTAMENT: Record<string, true> = {
  MAT: true,
  MAR: true,
  LUK: true,
  JOH: true,
  ACT: true,
  ROM: true,
  "1CO": true,
  "2CO": true,
  GAL: true,
  EPH: true,
  PHI: true,
  COL: true,
  "1TH": true,
  "2TH": true,
  "1TI": true,
  "2TI": true,
  TIT: true,
  PHM: true,
  HEB: true,
  JAM: true,
  "1PE": true,
  "2PE": true,
  "1JO": true,
  "2JO": true,
  "3JO": true,
  JUD: true,
  REV: true,
};

function selectStory(ref: BibleReference): StoryApplication {
  const code = ref.code.toUpperCase();
  const ch = ref.chapter;

  if (code === "GEN") {
    if (ch >= 37) return STORIES.joseph;
    return STORIES.hagar;
  }
  if (code === "EXO" || code === "LEV" || code === "NUM" || code === "DEU") {
    return STORIES.moses;
  }
  if (code === "RUT") return STORIES.ruth;
  if (code === "EST") return STORIES.ruth;
  if (code === "JOB") return STORIES.joseph;
  if (code === "PSA" || code === "1SA" || code === "2SA" || code === "1CH" || code === "2CH") {
    return STORIES.david;
  }
  if (code === "JON" || code === "DAN") return STORIES.joseph;
  if (NEW_TESTAMENT[code]) return STORIES.paul;
  if (["JOS", "JDG", "1KI", "2KI"].includes(code)) return STORIES.david;
  if (["ISA", "JER", "LAM", "EZE", "HOS", "JOL", "AMO", "OBA", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL"].includes(code))
    return STORIES.moses;
  return STORIES.hagar;
}

export function getStoryForRef(ref: BibleReference, recordExcerpt?: string | null): StoryApplication {
  const base = selectStory(ref);
  if (!recordExcerpt) return base;
  return {
    ...base,
    body: [
      base.body[0],
      base.body[1],
      `당신의 기록 "${recordExcerpt.slice(0, 40)}..."와 맞닿는 지점입니다.`,
      base.body[2],
    ],
  };
}
