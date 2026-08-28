import type { BibleReference } from "@/lib/bible/types";
import { getLinkCommentaries } from "@/lib/bible/crossref-commentary";

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
  abraham: {
    title: "아브라함 — 떠나라는 부르심 앞에 서 있는 장면",
    body: [
      "겉으로는 익숙한 땅을 떠나는 장면으로 읽힙니다.",
      "그 안에는 '어디로 가는지 모른다'는 두려움이 있었습니다.",
      "그러나 아브라함은 약속을 붙잡고 발을 떼며 길이 생기는 것을 봅니다.",
    ],
    closing: "떠남의 장면이 아니라, 신뢰의 장면입니다.",
  },
  jacob: {
    title: "야곱 — 붙잡고 씨름하는 장면",
    body: [
      "겉으로는 밤새도록 붙잡고 놓지 않는 장면으로 읽힙니다.",
      "그 안에는 '내 힘으로 살아야 한다'는 고집이 있었습니다.",
      "그러나 야곱은 씨름 끝에 새 이름을 받고 절뚝이며 걸어갑니다.",
    ],
    closing: "버티는 장면이 아니라, 새롭게 되는 장면입니다.",
  },
  noah: {
    title: "노아 — 아직 보이지 않는 것을 짓는 장면",
    body: [
      "겉으로는 아무도 이해하지 못하는 일을 하는 장면으로 읽힙니다.",
      "그 안에는 '정말 올까'라는 물음과 조롱이 있었습니다.",
      "그러나 노아는 들은 말씀대로 방주를 짓고 생명을 품는 통로가 됩니다.",
    ],
    closing: "조롱의 장면이 아니라, 순종의 장면입니다.",
  },
  joshua: {
    title: "여호수아 — 담을 돌며 기다리는 장면",
    body: [
      "겉으로는 아무 일도 일어나지 않는 것처럼 보이는 장면으로 읽힙니다.",
      "그 안에는 '언제 무너지나'라는 기다림이 있었습니다.",
      "그러나 여호수아는 명령대로 돌고, 담이 무너지는 순간을 봅니다.",
    ],
    closing: "침묵의 장면이 아니라, 신뢰의 장면입니다.",
  },
  gideon: {
    title: "기드온 — 가장 작은 자로 부르심 받는 장면",
    body: [
      "겉으로는 '내가 가장 작다'고 숨는 장면으로 읽힙니다.",
      "그 안에는 자격 없음에 대한 두려움이 있었습니다.",
      "그러나 기드온은 작은 불빛 하나로 큰 어둠을 가르는 일을 배웁니다.",
    ],
    closing: "작음의 장면이 아니라, 쓰임의 장면입니다.",
  },
  samson: {
    title: "삼손 — 넘어지고 다시 일으켜지는 장면",
    body: [
      "겉으로는 힘이 꺾인 장면으로 읽힙니다.",
      "그 안에는 '다 끝났다'는 절망이 있었습니다.",
      "그러나 삼손은 마지막 기도에서 다시 힘을 얻고 사명을 마칩니다.",
    ],
    closing: "무너짐의 장면이 아니라, 회복의 장면입니다.",
  },
  elijah: {
    title: "엘리야 — 광야에서 다시 먹는 장면",
    body: [
      "겉으로는 로뎀 나무 아래 눕고 싶은 장면으로 읽힙니다.",
      "그 안에는 '나는 더 할 수 없다'는 탈진이 있었습니다.",
      "그러나 엘리야는 천사의 떡을 먹고 다시 호렙 산으로 걸어갑니다.",
    ],
    closing: "지침의 장면이 아니라, 돌봄의 장면입니다.",
  },
  isaiah: {
    title: "이사야 — 거룩 앞에서 입술이 닦이는 장면",
    body: [
      "겉으로는 '화로다 나는 망하게 되었도다' 외치는 장면으로 읽힙니다.",
      "그 안에는 부정한 입술에 대한 자각이 있었습니다.",
      "그러나 이사야는 숯불로 입술이 닦이고 '내가 여기 있나이다' 응답합니다.",
    ],
    closing: "두려움의 장면이 아니라, 부르심의 장면입니다.",
  },
  jeremiah: {
    title: "예레미야 — 눈물로 심는 장면",
    body: [
      "겉으로는 아무도 듣지 않는 말을 계속하는 장면으로 읽힙니다.",
      "그 안에는 '왜 나인가'라는 외로움이 있었습니다.",
      "그러나 예레미야는 눈물로 심으며 말씀이 불처럼 임하는 것을 봅니다.",
    ],
    closing: "외로움의 장면이 아니라, 신실함의 장면입니다.",
  },
  daniel: {
    title: "다니엘 — 사자 굴에서 평안한 장면",
    body: [
      "겉으로는 문이 닫힌 굴 안의 장면으로 읽힙니다.",
      "그 안에는 '내일이 있을까'라는 두려움이 있었습니다.",
      "그러나 다니엘은 굴 안에서도 평안히 잠들고, 아침에 살아 나옵니다.",
    ],
    closing: "갇힘의 장면이 아니라, 지키심의 장면입니다.",
  },
  job: {
    title: "욥 — 질문 속에서 침묵을 배우는 장면",
    body: [
      "겉으로는 모든 것을 잃고 앉은 장면으로 읽힙니다.",
      "그 안에는 '왜'라는 질문이 가득했습니다.",
      "그러나 욥은 폭풍 가운데서 들으시고, 다시 삶을 받습니다.",
    ],
    closing: "질문의 장면이 아니라, 만남의 장면입니다.",
  },
  esther: {
    title: "에스더 — 죽으면 죽으리라 나아가는 장면",
    body: [
      "겉으로는 왕 앞에 나아가면 죽을 수 있는 장면으로 읽힙니다.",
      "그 안에는 '이 때를 위함이 아닌가'라는 물음이 있었습니다.",
      "그러나 에스더는 금 규를 얻고 민족을 살리는 통로가 됩니다.",
    ],
    closing: "두려움의 장면이 아니라, 용기의 장면입니다.",
  },
  nehemiah: {
    title: "느헤미야 — 무너진 성벽 앞에서 기도하는 장면",
    body: [
      "겉으로는 무너진 돌무더기 앞에 앉은 장면으로 읽힙니다.",
      "그 안에는 '어떻게 다시 세우나'라는 막막함이 있었습니다.",
      "그러나 느헤미야는 기도로 시작해 돌을 들어 성벽을 세웁니다.",
    ],
    closing: "막막함의 장면이 아니라, 재건의 장면입니다.",
  },
  solomon: {
    title: "솔로몬 — 지혜를 구하는 장면",
    body: [
      "겉으로는 왕이 되어 처음 선 장면으로 읽힙니다.",
      "그 안에는 '어떻게 다스리나'라는 부담이 있었습니다.",
      "그러나 솔로몬은 지혜를 구하고, 백성의 송사를 듣는 귀를 받습니다.",
    ],
    closing: "부담의 장면이 아니라, 구하는 장면입니다.",
  },
  peter: {
    title: "베드로 — 부인하고 다시 사랑을 고백하는 장면",
    body: [
      "겉으로는 불 앞에서 모른다고 말하는 장면으로 읽힙니다.",
      "그 안에는 두려움과 후회가 겹쳐 있었습니다.",
      "그러나 베드로는 바닷가에서 '주님 사랑하나이다' 다시 고백합니다.",
    ],
    closing: "부인의 장면이 아니라, 회복의 장면입니다.",
  },
  john: {
    title: "요한 — 사랑 안에 거하는 장면",
    body: [
      "겉으로는 아무 것도 하지 않고 머무는 장면으로 읽힙니다.",
      "그 안에는 '사랑이 무엇인가'라는 물음이 있었습니다.",
      "그러나 요한은 사랑 안에 거하며 빛 가운데 걷는 길을 배웁니다.",
    ],
    closing: "머무름의 장면이 아니라, 거함의 장면입니다.",
  },
  mary: {
    title: "마리아 — 말씀을 마음에 새기는 장면",
    body: [
      "겉으로는 조용히 듣고만 있는 장면으로 읽힙니다.",
      "그 안에는 '이 일이 어찌 되리이까'라는 놀라움이 있었습니다.",
      "그러나 마리아는 모든 말씀을 마음에 새기며 뜻을 헤아립니다.",
    ],
    closing: "침묵의 장면이 아니라, 간직함의 장면입니다.",
  },
  jonah: {
    title: "요나 — 도망하다 돌이키는 장면",
    body: [
      "겉으로는 다시스로 도망가는 배 안의 장면으로 읽힙니다.",
      "그 안에는 '내가 원하는 길이 아니다'라는 고집이 있었습니다.",
      "그러나 요나는 큰 물고기 뱃속에서 다시 니느웨로 발을 돌립니다.",
    ],
    closing: "도망의 장면이 아니라, 돌이킴의 장면입니다.",
  },
};

const BOOK_TO_STORY: Record<string, keyof typeof STORIES> = {
  GEN: "joseph",
  EXO: "moses",
  LEV: "moses",
  NUM: "moses",
  DEU: "moses",
  JOS: "joshua",
  JDG: "gideon",
  RUT: "ruth",
  "1SA": "david",
  "2SA": "david",
  "1KI": "solomon",
  "2KI": "elijah",
  "1CH": "david",
  "2CH": "david",
  EZR: "nehemiah",
  NEH: "nehemiah",
  EST: "esther",
  JOB: "job",
  PSA: "david",
  PRO: "solomon",
  ECC: "solomon",
  SNG: "solomon",
  ISA: "isaiah",
  JER: "jeremiah",
  LAM: "jeremiah",
  EZE: "isaiah",
  DAN: "daniel",
  HOS: "isaiah",
  JOL: "isaiah",
  AMO: "isaiah",
  OBA: "isaiah",
  JON: "jonah",
  MIC: "isaiah",
  NAM: "isaiah",
  HAB: "isaiah",
  ZEP: "isaiah",
  HAG: "isaiah",
  ZEC: "isaiah",
  MAL: "isaiah",
  MAT: "peter",
  MAR: "peter",
  LUK: "peter",
  JOH: "john",
  ACT: "paul",
  ROM: "paul",
  "1CO": "paul",
  "2CO": "paul",
  GAL: "paul",
  EPH: "paul",
  PHI: "paul",
  COL: "paul",
  "1TH": "paul",
  "2TH": "paul",
  "1TI": "paul",
  "2TI": "paul",
  TIT: "paul",
  PHM: "paul",
  HEB: "peter",
  JAM: "peter",
  "1PE": "peter",
  "2PE": "peter",
  "1JO": "john",
  "2JO": "john",
  "3JO": "john",
  JUD: "peter",
  REV: "john",
};

function storyKeyForCode(code: string, chapter: number): keyof typeof STORIES {
  const upper = code.toUpperCase();
  if (upper === "GEN") {
    if (chapter === 16 || chapter === 21) return "hagar";
    if (chapter >= 37) return "joseph";
    if (chapter >= 25) return "jacob";
    if (chapter >= 12) return "abraham";
    return "noah";
  }
  if (upper === "JDG" && chapter >= 13) return "samson";
  if (upper === "1KI" && chapter > 11) return "elijah";
  return (BOOK_TO_STORY[upper] ?? "hagar") as keyof typeof STORIES;
}

function selectStoryViaCommentary(ref: BibleReference): StoryApplication | null {
  try {
    const links = getLinkCommentaries(ref.code, ref.chapter, ref.startVerse);
    if (links.size === 0) return null;
    const counts = new Map<string, number>();
    for (const key of links.keys()) {
      const parts = key.split("-");
      const targetCode = parts[0];
      const targetChapter = Number(parts[1]) || 1;
      const storyKey = storyKeyForCode(targetCode, targetChapter);
      counts.set(storyKey, (counts.get(storyKey) ?? 0) + 1);
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [k, c] of counts) {
      if (c > bestCount) {
        best = k;
        bestCount = c;
      }
    }
    if (best && bestCount >= 3 && bestCount > links.size / 2 && STORIES[best as keyof typeof STORIES]) {
      return STORIES[best as keyof typeof STORIES];
    }
  } catch {
  }
  return null;
}

function selectStory(ref: BibleReference): StoryApplication {
  const viaCommentary = selectStoryViaCommentary(ref);
  if (viaCommentary) return viaCommentary;
  const code = ref.code.toUpperCase();
  return STORIES[storyKeyForCode(code, ref.chapter)] ?? STORIES.hagar;
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
