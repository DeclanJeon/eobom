/**
 * Story Mirror — Bible Characters Seed Data
 *
 * 성경 인물 메타데이터. 각 인물은 StoryCard 초안으로 사용된다.
 * reviewStatus: "draft" — 사람이 검수 후 "published"로 전환.
 */

export type BibleCharacterSeed = {
  slug: string;
  name: string;
  nameEn: string;
  summary: string;
  arc: string;
  themes: string[];
  emotions: string[];
  situations: string[];
  keyPassages: Array<{ ref: string; text: string; reason: string }>;
  contentWarnings: string[];
};

export const BIBLE_CHARACTERS: BibleCharacterSeed[] = [
  {
    slug: "david-psalms",
    name: "다윗",
    nameEn: "David",
    summary:
      "하나님의 마음을 닮은 사람이라 불렸으나, 가장 큰 죄를 짓고 가장 깊이 회개한 사람. 목동에서 왕이 되고, 범죄하고, 회개하며, 시편을 남겼다.",
    arc: "목동 → 왕 → 범죄 → 회개 → 시편",
    themes: ["회개", "겸손", "인내", "신뢰와 의심", "사명과 방향"],
    emotions: ["두려움", "기쁨", "슬픔", "감사", "후회"],
    situations: ["실패 후", "위기 상황", "기도의 시간", "선택의 기로"],
    keyPassages: [
      {
        ref: "시편 51편",
        text: "하나님이여 내게 은혜를 베푸시고 내 원함을 according to your abundant mercy",
        reason: "범죄 후 가장 깊이 회개한 기록",
      },
    ],
    contentWarnings: [],
  },
  {
    slug: "ruth-moab",
    name: "루스",
    nameEn: "Ruth",
    summary:
      "고국을 떠나 시어머니를 따라 낯선 땅으로 간 이방인 여인. 인내와 충성으로 보리밭에서 일했고, 보아스를 만났다.",
    arc: "이별 → 고국 떠남 → 인내 → 만남 → 구속",
    themes: ["기다림", "인내", "신뢰와 의심", "가난과 존엄", "동행"],
    emotions: ["그리움", "두려움", "희망", "평온"],
    situations: ["이별 앞에서", "혼자인 시간", "새로운 시작", "기다림의 시간"],
    keyPassages: [
      {
        ref: "루스기 1:16",
        text: "어머니께서 어디로 가시든지 저도 그리로 가겠고",
        reason: "동행의 약속",
      },
    ],
    contentWarnings: [],
  },
  {
    slug: "hagar-wilderness",
    name: "하갈",
    nameEn: "Hagar",
    summary:
      "가정에서 쫓겨나 광야로 도망친 여인. 버림받았다고 생각했으나, 하나님께서 보시고 도망가는 하갈을 찾으셨다.",
    arc: "가정 → 쫓겨남 → 광야 → 발견 → 약속",
    themes: ["외로움", "정체성", "소속", "용기와 두려움"],
    emotions: ["절망", "두려움", "놀람", "위로"],
    situations: ["포기하고 싶을 때", "혼자인 시간", "위기 상황"],
    keyPassages: [
      {
        ref: "창세기 16:13",
        text: "당신은 나를 보시는 하나님이시로다",
        reason: "버림받은 자가 하나님께 발견된 장면",
      },
    ],
    contentWarnings: ["가정폭력", "차별"],
  },
  {
    slug: "elijah-carmel",
    name: "엘리야",
    nameEn: "Elijah",
    summary:
      "바알 선지자 450명과 대결한 용감한 선지자. 그러나 그 뒤에 번아웃으로 광야로 도망쳐 죽기를 구했다.",
    arc: "소명 → 승리 → 번아웃 → 광야 → 회복",
    themes: ["용기와 두려움", "사명과 방향", "인내", "한계"],
    emotions: ["열정", "절망", "피로", "위로", "희망"],
    situations: ["위기 상황", "포기하고 싶을 때", "새로운 시작"],
    keyPassages: [
      {
        ref: "열왕기상 19:4",
        text: "여호와여 넉넉하오니 지금 내 생명을 거두소서",
        reason: "승리 뒤의 번아웃과 탈진",
      },
    ],
    contentWarnings: [],
  },
  {
    slug: "prodigal-son",
    name: "탕자",
    nameEn: "Prodigal Son",
    summary:
      "父親의 재산을 탕진하고 먼 나라로 떠났다. 거지가 되어 돼지 우리에서 살다가, 돌아가기로 결심했다.",
    arc: "분가 → 낭비 → 궁핍 → 깨달음 → 회귀",
    themes: ["회개", "자기 발견", "용서", "가난과 존엄"],
    emotions: ["후회", "두려움", "체념", "희망", "기쁨"],
    situations: ["실패 후", "이별 앞에서", "선택의 기로", "새로운 시작"],
    keyPassages: [
      {
        ref: "누가복음 15:20",
        text: "아비가 이를 보고 측은히 여기어 달려가 목을 안고 입맞추니",
        reason: "돌아온 자를 받아주는 이야기",
      },
    ],
    contentWarnings: [],
  },
  {
    slug: "joseph-egypt",
    name: "요셉",
    nameEn: "Joseph",
    summary:
      "형들에게 팔려 노예가 되고, 거짓으로 감옥에 갇혔으나, 끝내 총리가 되어 가족을 구원했다.",
    arc: "빚어짐 → 팔림 → 감옥 → 총리 → 구원",
    themes: ["인내", "용기와 두려움", "용서", "신뢰와 의심", "변화"],
    emotions: ["두려움", "슬픔", "분노", "기쁨", "위로"],
    situations: ["이별 앞에서", "혼자인 시간", "위기 상황", "기다림의 시간"],
    keyPassages: [
      {
        ref: "창세기 50:20",
        text: "당신들은 나를 해하려 하였으나 하나님은 선으로 바꾸사",
        reason: "해를 당한 후에도 의미를 발견한 이야기",
      },
    ],
    contentWarnings: [],
  },
  {
    slug: "esther-persia",
    name: "에스델",
    nameEn: "Esther",
    summary:
      "유대인 여인이 페르시아 왕비가 되어, 백성을 멸망시키려는 음모를 자신의 목숨을 걸고 막았다.",
    arc: "은밀 → 왕비 → 음모 발견 → 결단 → 구원",
    themes: ["용기와 두려움", "사명과 방향", "선택", "동행"],
    emotions: ["불안", "두려움", "열정", "희망"],
    situations: ["선택의 기로", "위기 상황", "기도의 시간"],
    keyPassages: [
      {
        ref: "에스델기 4:14",
        text: "이 때를 위하여 네가 왕후의 위에 올랐้น不认识 아느냐",
        reason: "목숨을 걸어야 하는 선택의 순간",
      },
    ],
    contentWarnings: [],
  },
  {
    slug: "job-suffering",
    name: "욥",
    nameEn: "Job",
    summary:
      "모든 것을 잃었으나 하나님을 떠나지 않았다. 친구들의 비난과自己的 고통 속에서도 끝까지 질문을 던졌다.",
    arc: "풍요 → 상실 → 고난 → 질문 → 회복",
    themes: ["인내", "신뢰와 의심", "한계", "기도"],
    emotions: ["절망", "슬픔", "분노", "인내", "평온"],
    situations: ["상처 치유", "포기하고 싶을 때", "위기 상황", "기도의 시간"],
    keyPassages: [
      {
        ref: "욥기 1:21",
        text: "여호와께서 주셨다가 여호와께서 가져가셨도다",
        reason: "극단적 상실 앞에서의 신앙",
      },
    ],
    contentWarnings: [],
  },
  {
    slug: "peter-denial",
    name: "베드로",
    nameEn: "Peter",
    summary:
      "예수를 세 번 부인하고 울었다가, 부활 후 다시 부름을 받았다. 약한 자가 다시 서는 이야기.",
    arc: "소명 → 동행 → 부인 → 회개 → 재부르심",
    themes: ["회개", "용기와 두려움", "용서", "정체성"],
    emotions: ["두려움", "후회", "슬픔", "희망", "기쁨"],
    situations: ["실패 후", "이별 앞에서", "새로운 시작", "기도의 시간"],
    keyPassages: [
      {
        ref: "요한福音 21:17",
        text: "주여 모든 것을 아시오니 나를 사랑하심을 아시나이다",
        reason: "세 번 부인한 뒤 다시 사랑을 확인받은 장면",
      },
    ],
    contentWarnings: [],
  },
  {
    slug: "jonah-reluctance",
    name: "요나",
    nameEn: "Jonah",
    summary:
      "하나님의 부르심을 피하려 바다로 도망쳤다. 물고기 뱃속에서 3일간 있다가 다시 보내짐을 받아들였다.",
    arc: "부르심 → 도주 → 물고기 → 순종 → 갈등",
    themes: ["사명과 방향", "저항", "선택", "인내"],
    emotions: ["불안", "분노", "체념", "평온"],
    situations: ["포기하고 싶을 때", "선택의 기로", "기도의 시간"],
    keyPassages: [
      {
        ref: "요나 2:2",
        text: "내가 곤고 중에 여호와께 불렀더니 나에게 들으시고",
        reason: "피하려다 결국 하나님을 만난 이야기",
      },
    ],
    contentWarnings: [],
  },
];
