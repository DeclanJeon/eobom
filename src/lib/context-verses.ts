/**
 * 설계 05§5 Context Personalization.
 * context→verse는 "하나님이 주신 말씀"이 아니라 **관련성 후보 선택**일 뿐이다.
 * - 공개 도메인 개역 한국어 성구를 context별로 큐레이션하고,
 * - dateKey+context 시드로 결정적 회전해 매일 같은 선택을 보장한다 (C2).
 * - 판정·처방 copy 없이 관찰형 제목만 사용한다 (06§8).
 */
export type ContextCode =
  | "WORK_DIRECTION"
  | "RELATIONSHIP"
  | "EMOTION"
  | "FAITH"
  | "FAMILY";

export type ContextVerseOption = {
  title: string;
  verse: string;
  ref: string;
};

export const CONTEXT_VERSES: Record<ContextCode, ContextVerseOption[]> = {
  WORK_DIRECTION: [
    { title: "방향을 찾는 마음에 가까운 말씀", verse: "내가 네 갈 길을 가르쳐 보이고 너를 주목하여 훈계하리로다", ref: "시편 32:8" },
    { title: "오늘 손에 잡은 일을 바라볼 때", verse: "네가 손으로 하는 무슨 일이나 힘을 다하여 하라", ref: "전도서 9:10" },
    { title: "앞길이 안 보이는 날에", verse: "너는 마음을 다하여 여호와를 신뢰하고 네 명철을 의지하지 말라", ref: "잠언 3:5" },
    { title: "지금 하는 일이 작게 느껴질 때", verse: "작게 시작함을 낙심 말고 뿌리가 두련줄을 알아야 할지어다", ref: "욥기 8:7" },
    { title: "길을 묻고 싶은 마음에", verse: "내가 너의 앞을 지내겠고 산들 평탄하게 하며 놋문을 부수고 쇠빗장을 끊으리라", ref: "이사야 45:2" },
  ],
  RELATIONSHIP: [
    { title: "관계가 마음을 오래 붙잡고 있을 때", verse: "내 계명은 곧 내가 너희를 사랑한 것 같이 너희도 서로 사랑하라 하는 이것이니라", ref: "요한복음 15:12" },
    { title: "다른 사람과 어긋난 기분이 들 때", verse: "모든 분노와 분내음과 분사와 성남과 함께 너희 가운데서 다 물러가라", ref: "에베소서 4:31" },
    { title: "먼저 다가가기 어려울 때", verse: "네 대적을 먼저 화친하게 하여 그에게로 가라", ref: "마태복음 5:25" },
    { title: "상대의 마음이 이해되지 않을 때", verse: "아무에게든 악으로 악을 갚지 말고 모든 사람을 위하여 선을 도모하라", ref: "로마서 12:17" },
    { title: "용서가 아직 어려운 날에", verse: "그들이 죄를 사하면 너희 천부도 너희 죄를 사하시리라", ref: "마가복음 11:25" },
  ],
  EMOTION: [
    { title: "마음이 지친 날에 가까운 말씀", verse: "수고하고 무거운 짐 진 자들아 다 내게로 오라", ref: "마태복음 11:28" },
    { title: "불안이 가슴에 머물 때", verse: "아무 것도 염려하지 말고 다만 모든 일에 기도와 간구로, 너희 구할 것을 감사함으로 하나님께 아뢰라", ref: "빌립보서 4:6" },
    { title: "밤이 유난히 길게 느껴질 때", verse: "밤 중에 내가 여호와를 부르짖었더니 응답하시고 내 영혼을 권고하셨도다", ref: "시편 77:2" },
    { title: "눈물이 그치지 않는 날에", verse: "우리가 흘린 눈물을 주의 병에 기록하시옵나이다", ref: "시편 56:8" },
    { title: "조금 쉬어가고 싶은 마음에", verse: "내가 내 양떼를 좋한 목초지에 먹일 터이요 그들의 거처는 이스라엘의 고산에 있으리라", ref: "에스겔 34:14" },
  ],
  FAITH: [
    { title: "믿음을 다시 바라보는 말씀", verse: "우리가 믿음으로 행하고 보는 것으로 행하지 아니함이로다", ref: "고린도후서 5:7" },
    { title: "기도가 답이 늦는 것 같을 때", verse: "구하라 그리하면 너희에게 주실 것이요", ref: "마태복음 7:7" },
    { title: "믿음이 작게 느껴질 때", verse: "믿음은 소망하는 것들의 실상이요 보지 못하는 것들의 증거니", ref: "히브리서 11:1" },
    { title: "혼자 힘으로 버티려 할 때", verse: "너는 스스로 힘을 내지 말고 오직 오신 후에 내리시는 약속을 기다리라", ref: "누가복음 24:49" },
    { title: "기다림이 길어질 때", verse: "여호와를 기다리는 자는 새 힘을 얻으리니", ref: "이사야 40:31" },
  ],
  FAMILY: [
    { title: "가족을 생각하는 마음에 가까운 말씀", verse: "서로 친절하게 하며 불쌍히 여기며 서로 용서하기를", ref: "에베소서 4:32" },
    { title: "식구들이 걱정되는 날에", verse: "네 식구가 풀 처녀지 같으며 왕궁의 정원에 있는 올리브 가지 같으리라", ref: "시편 128:3" },
    { title: "집이 편하지 않은 날에", verse: "지혜로운 여인이 집을 세우니", ref: "잠언 14:1" },
    { title: "부모를 생각하며 마음이 무거울 때", verse: "너의 부모를 공경하라", ref: "출애굽기 20:12" },
    { title: "식구들과의 시간이 어색할 때", verse: "보라 형제가 유익하게 동거함은 어찌 좋고 아름다우리오", ref: "시편 133:1" },
  ],
};

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** dateKey(KST, 서버 계산)+context 시드로 결정적 회전 — 같은 날 같은 선택(C2). */
export function selectContextCopy(
  context: ContextCode | null,
  dateKey: string,
): ContextVerseOption | null {
  if (!context) return null;
  const options = CONTEXT_VERSES[context];
  if (!options?.length) return null;
  return options[hashSeed(`${dateKey}:${context}`) % options.length];
}
