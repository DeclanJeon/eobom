/**
 * Story Mirror — World Classics Seed Data
 *
 * Project Gutenberg 등에서 수집한 세계 고전 인물/이야기.
 *权利 확인이 된 것만 production에 사용한다.
 */

export type WorldClassicSeed = {
  slug: string;
  name: string;
  nameEn: string;
  workTitle: string;
  workTitleOriginal: string;
  author: string;
  authorEn: string;
  era: string;
  culture: string;
  sourceUrl: string;
  rightsStatus: string;
  summary: string;
  arc: string;
  themes: string[];
  emotions: string[];
  situations: string[];
  contentWarnings: string[];
};

export const WORLD_CLASSICS: WorldClassicSeed[] = [
  {
    slug: "elizabeth-bennet",
    name: "엘리자베트 베네트",
    nameEn: "Elizabeth Bennet",
    workTitle: "오만과 편견",
    workTitleOriginal: "Pride and Prejudice",
    author: "제인 오스틴",
    authorEn: "Jane Austen",
    era: "19세기",
    culture: "western",
    sourceUrl: "https://www.gutenberg.org/ebooks/1342",
    rightsStatus: "review",
    summary:
      "오만하다고 생각한 남자와 편견을 가지고 판단했던 자신을 돌아보는 과정. 자신의 한계를 인정하고 사랑을 선택하는 이야기.",
    arc: "편견 → 갈등 → 깨달음 → 변화 → 사랑",
    themes: ["자기 발견", "관계의 망설임", "변화", "정체성"],
    emotions: ["분노", "기쁨", "놀람", "후회"],
    situations: ["타인과 비교", "선택의 기로", "자기 의심"],
    contentWarnings: [],
  },
  {
    slug: "anna-karenina",
    name: "안나 카레니나",
    nameEn: "Anna Karenina",
    workTitle: "안나 카레니나",
    workTitleOriginal: "Anna Karenina",
    author: "레프 톨스토이",
    authorEn: "Leo Tolstoy",
    era: "19세기",
    culture: "western",
    sourceUrl: "https://www.gutenberg.org/ebooks/1399",
    rightsStatus: "review",
    summary:
      "사랑을 좇아 모든 것을 내던진 여인의 이야기. 욕망과 양심 사이에서 갈등하다 결국 파멸로 향한다.",
    arc: "사랑 → 추방 → 욕망 → 갈등 → 파멸",
    themes: ["선택", "관계의 망설임", "정체성", "한계"],
    emotions: ["열정", "불안", "절망", "슬픔"],
    situations: ["이별 앞에서", "선택의 기로", "타인과 비교"],
    contentWarnings: ["자해"],
  },
  {
    slug: "jay-gatsby",
    name: "제이 개츠비",
    nameEn: "Jay Gatsby",
    workTitle: "위대한 개츠비",
    workTitleOriginal: "The Great Gatsby",
    author: "F. 스콧 피츠제럴드",
    authorEn: "F. Scott Fitzgerald",
    era: "20세기",
    culture: "western",
    sourceUrl: "https://www.gutenberg.org/ebooks/64317",
    rightsStatus: "review",
    summary:
      "과거의 사랑을 되찾기 위해 모든 것을 만든 남자. 그러나 과거는 되돌릴 수 없다는 것을 깨닫지 못한다.",
    arc: "가난 → 성공 → 사랑 → 환상 → 파멸",
    themes: ["자기 발견", "변화", "기다림", "한계"],
    emotions: ["희망", "그리움", "절망", "외로움"],
    situations: ["이별 앞에서", "기다림의 시간", "새로운 시작"],
    contentWarnings: [],
  },
  {
    slug: "jean-valjean",
    name: "장 발장",
    nameEn: "Jean Valjean",
    workTitle: "레미제라블",
    workTitleOriginal: "Les Misérables",
    author: "빅토르 위고",
    authorEn: "Victor Hugo",
    era: "19세기",
    culture: "western",
    sourceUrl: "https://www.gutenberg.org/ebooks/135",
    rightsStatus: "review",
    summary:
      "빵을 훔쳐 19년간 감옥에 갇혔다가 출소 후 주교의 은혜로 변화한다. 평생을 남을 위해 살아간다.",
    arc: "감옥 → 출소 → 은혜 → 변화 → 희생",
    themes: ["용서", "변화", "가난과 존엄", "신뢰와 의심"],
    emotions: ["분노", "슬픔", "감사", "희망", "기쁨"],
    situations: ["실패 후", "새로운 시작", "도움 요청", "상처 치유"],
    contentWarnings: [],
  },
  {
    slug: "roxane-cyrano",
    name: "ロクザンヌ / 르크ザンヌ",
    nameEn: "Roxane",
    workTitle: "시라노 드 베르주라크",
    workTitleOriginal: "Cyrano de Bergerac",
    author: "에드몽 로스탕",
    authorEn: "Edmond Rostand",
    era: "19세기",
    culture: "western",
    sourceUrl: "https://www.gutenberg.org/ebooks/2514",
    rightsStatus: "review",
    summary:
      "자신의 외모 때문에 사랑을 고백하지 못하고, 대신 글을 써주는 시라노의 이야기. 편지를 통해 사랑을 전한다.",
    arc: "사랑 → 숨김 → 대필 → 이별 → 마지막 고백",
    themes: ["관계의 망설임", "첫사랑", "용기와 두려움", "기다림"],
    emotions: ["그리움", "두려움", "기쁨", "슬픔"],
    situations: ["먼저 다가감", "이별 앞에서", "선택의 기로"],
    contentWarnings: [],
  },
  {
    slug: "hamlet-prince",
    name: "햄릿",
    nameEn: "Hamlet",
    workTitle: "햄릿",
    workTitleOriginal: "Hamlet",
    author: "윌리엄 셰akespeare",
    authorEn: "William Shakespeare",
    era: "근세",
    culture: "western",
    sourceUrl: "https://www.gutenberg.org/ebooks/1524",
    rightsStatus: "review",
    summary:
      "아버지의 원수를 갚아야 하는 왕자. 행동할지 말지 갈등하며, 결국 모두가 죽는 비극이 된다.",
    arc: "귀신 → 갈등 → 계획 → 실행 → 비극",
    themes: ["선택", "신뢰와 의심", "정체성", "한계"],
    emotions: ["불안", "분노", "슬픔", "의심"],
    situations: ["선택의 기로", "위기 상황", "자기 의심"],
    contentWarnings: ["폭력"],
  },
  {
    slug: "scheherazade",
    name: "シェ헤라ザ데 / 셰헤라자데",
    nameEn: "Scheherazade",
    workTitle: "천일야화",
    workTitleOriginal: "One Thousand and One Nights",
    author: "다수",
    authorEn: "Various",
    era: "중세",
    culture: "eastern",
    sourceUrl: "https://www.gutenberg.org/ebooks/3431",
    rightsStatus: "review",
    summary:
      "매일 밤 이야기를 이어가며 목숨을 구하는 여인. 이야기가 곧 생명이 된 1001일의 기록.",
    arc: "위협 → 이야기 시작 → 이어감 → 구원",
    themes: ["용기와 두려움", "인내", "이야기", "동행"],
    emotions: ["두려움", "희망", "기쁨", "긴장"],
    situations: ["위기 상황", "이야기", "기다림의 시간"],
    contentWarnings: [],
  },
  {
    slug: "odysseus-return",
    name: "오디세우스",
    nameEn: "Odysseus",
    workTitle: "오디세이아",
    workTitleOriginal: "Odyssey",
    author: "호메로스",
    authorEn: "Homer",
    era: "고대",
    culture: "western",
    sourceUrl: "https://www.gutenberg.org/ebooks/1727",
    rightsStatus: "review",
    summary:
      "트로이 전쟁 후 10년간 집으로 돌아오지 못한 영웅. 온갖 시련을 이기고 고향으로 돌아가는 여정.",
    arc: "전쟁 → 표류 → 시련 → 인내 → 귀환",
    themes: ["기다림", "인내", "변화", "자기 발견"],
    emotions: ["그리움", "두려움", "희망", "기쁨"],
    situations: ["혼자인 시간", "기다림의 시간", "새로운 시작"],
    contentWarnings: [],
  },
  {
    slug: "phileas-fogg",
    name: "필리어스 포그",
    nameEn: "Phileas Fogg",
    workTitle: "80일간의 세계일주",
    workTitleOriginal: "Around the World in Eighty Days",
    author: "쥘 베른",
    authorEn: "Jules Verne",
    era: "19세기",
    culture: "western",
    sourceUrl: "https://www.gutenberg.org/ebooks/103",
    rightsStatus: "review",
    summary:
      "80일 안에 세계를 일주하겠다고 내기한 신사. 정확한 시간과 규칙을 따르지만, 예상치 못한 만남이 모든 것을 바꾼다.",
    arc: "내기 → 출발 → 역경 → 만남 → 승리",
    themes: ["변화", "용기와 두려움", "인내", "동행"],
    emotions: ["기쁨", "불안", "놀람", "희망"],
    situations: ["새로운 시작", "위기 상황", "선택의 기로"],
    contentWarnings: [],
  },
  {
    slug: "heidi-alps",
    name: "하이디",
    nameEn: "Heidi",
    workTitle: "하이디",
    workTitleOriginal: "Heidi",
    author: "요한나 슈피리",
    authorEn: "Johanna Spyri",
    era: "19세기",
    culture: "western",
    sourceUrl: "https://www.gutenberg.org/ebooks/144",
    rightsStatus: "review",
    summary:
      "알프스 산에서 할아버지와 살던 소녀 하이디. 프랑크푸르트에 보내졌다가 다시 산으로 돌아간다.",
    arc: "산 → 도시 → 그리움 → 귀환 → 성장",
    themes: ["자기 발견", "소속", "변화", "동행"],
    emotions: ["기쁨", "그리움", "슬픔", "희망"],
    situations: ["혼자인 시간", "새로운 시작", "상처 치유"],
    contentWarnings: [],
  },
];
