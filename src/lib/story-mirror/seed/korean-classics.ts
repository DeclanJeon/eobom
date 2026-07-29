/**
 * Story Mirror — Korean Classics Seed Data
 *
 * 한국 고전 인물/이야기 메타데이터.
 *权利 확인이 된 것만 production에 사용한다.
 */

export type KoreanClassicSeed = {
  slug: string;
  name: string;
  workTitle: string;
  workTitleOriginal?: string;
  era: string;
  sourceUrl: string;
  rightsStatus: string;
  summary: string;
  arc: string;
  themes: string[];
  emotions: string[];
  situations: string[];
  contentWarnings: string[];
};

export const KOREAN_CLASSICS: KoreanClassicSeed[] = [
  {
    slug: "chunhyang",
    name: "춘향",
    workTitle: "춘향전",
    era: "조선 후기",
    sourceUrl: "https://www.itkc.or.kr/",
    rightsStatus: "review",
    summary:
      "기생의 딸로 태어났으나 학문과 예절을 갖춘 춘향는 이몽룡을 만나 사랑하지만, 신분의 벽에 부딪힌다. 변사또의 박해 속에서도 자신의 마음을 굽히지 않는다.",
    arc: "만남 → 사랑 → 박해 → 인내 → 해방",
    themes: ["관계의 망설임", "인내", "용기와 두려움", "가난과 존엄"],
    emotions: ["기쁨", "두려움", "슬픔", "희망"],
    situations: ["이별 앞에서", "위기 상황", "선택의 기로", "기다림의 시간"],
    contentWarnings: [],
  },
  {
    slug: "heungbu",
    name: "흥부",
    workTitle: "흥부전",
    era: "조선 시대",
    sourceUrl: "https://www.itkc.or.kr/",
    rightsStatus: "review",
    summary:
      "가난한 흥부는 뜻밖에 제비가 약초를 물어다 주어 아들을 얻는다. 잘사는 형 놀부는 탐욕스럽다.",
    arc: "가난 → 제비 → 은혜 → 번영 → 형제 화해",
    themes: ["가난과 존엄", "감사", "변화", "관계의 망설임"],
    emotions: ["기쁨", "그리움", "감사", "후회"],
    situations: ["새로운 시작", "감사 표현", "관계 회복"],
    contentWarnings: [],
  },
  {
    slug: "simcheong",
    name: "심청",
    workTitle: "심봉전",
    era: "조선 시대",
    sourceUrl: "https://www.itkc.or.kr/",
    rightsStatus: "review",
    summary:
      "눈먼 아버지를 위해 자신을 바다에 몸을 던진 심청. 기적적으로 돌아와 아버지의 눈을 뜨게 한다.",
    arc: "효심 → 희생 → 바다 → 부활 → 재회",
    themes: ["희생", "동행", "신뢰와 의심", "가난과 존엄"],
    emotions: ["슬픔", "두려움", "희망", "기쁨"],
    situations: ["이별 앞에서", "위기 상황", "포기하고 싶을 때"],
    contentWarnings: ["자해"],
  },
  {
    slug: "hong-gildong",
    name: "홍길동",
    workTitle: "홍길동전",
    era: "조선 시대",
    sourceUrl: "https://www.itkc.or.kr/",
    rightsStatus: "review",
    summary:
      "첩의 아들이지만 뛰어난 홍길동은 차별을 이기고 활빈당을 결성하여 백성을 구한다.",
    arc: "차별 → 수련 → 활빈당 → 의적 → 이상국",
    themes: ["정체성", "정의", "용기와 두려움", "사명과 방향"],
    emotions: ["분노", "희망", "열정", "기쁨"],
    situations: ["새로운 시작", "선택의 기로", "타인과 비교"],
    contentWarnings: [],
  },
  {
    slug: "chunhyang-lee-mongryong",
    name: "이몽룡",
    workTitle: "춘향전",
    era: "조선 후기",
    sourceUrl: "https://www.itkc.or.kr/",
    rightsStatus: "review",
    summary:
      "춘향을 사랑한 관찰사의 아들이지만, 신분의 벽과 관료의 타락 앞에서 갈등한다.",
    arc: "만남 → 사랑 → 갈등 → 고난 → 재회",
    themes: ["관계의 망설임", "선택", "용기와 두려움", "겸손"],
    emotions: ["기쁨", "불안", "그리움", "희망"],
    situations: ["관계 회복", "선택의 기로", "기다림의 시간"],
    contentWarnings: [],
  },
  {
    slug: "goun-wol-in",
    name: "월인석보 속 인물들",
    workTitle: "월인천강지곡",
    era: "조선 세조",
    sourceUrl: "https://www.itkc.or.kr/",
    rightsStatus: "review",
    summary:
      "세조의 왕비 정희왕후가 남편을 위해 지은 가사. 슬픔 속에서 발견한 아름다움과 기다림의 기록.",
    arc: "사랑 → 상실 → 슬픔 → 기도 → 아름다움",
    themes: ["기다림", "그리움", "기도", "변화"],
    emotions: ["슬픔", "그리움", "평온", "희망"],
    situations: ["이별 앞에서", "기도의 시간", "상처 치유"],
    contentWarnings: [],
  },
  {
    slug: "ssangnyeon-ji",
    name: "이두수",
    workTitle: "쌍년지",
    era: "조선 중기",
    sourceUrl: "https://www.itkc.or.kr/",
    rightsStatus: "review",
    summary:
      "두 해 동안 비가 오지 않아 농사를 망친 농부의 이야기. 자연 앞에서의 인간의 한계와 인내.",
    arc: "풍년 → 가뭄 → 절망 → 기다림 → 비",
    themes: ["인내", "한계", "소망", "신뢰와 의심"],
    emotions: ["불안", "절망", "인내", "희망"],
    situations: ["기다림의 시간", "포기하고 싶을 때", "기도의 시간"],
    contentWarnings: [],
  },
  {
    slug: "samgang-haengsildo",
    name: "삼강행실도 인물들",
    workTitle: "삼강행실도",
    era: "조선 세종",
    sourceUrl: "https://www.itkc.or.kr/",
    rightsStatus: "review",
    summary:
      "효·충·예의 이야기를 그린 행실도. 부모·주군·형제에 대한 의리를 다양한 상황 속에서 보여준다.",
    arc: "가르침 → 실천 → 시험 → 지킴 → 본",
    themes: ["동행", "인내", "신뢰와 의심", "겸손"],
    emotions: ["감사", "슬픔", "기쁨", "위로"],
    situations: ["권면과 격려", "기도의 시간", "감사 표현"],
    contentWarnings: [],
  },
];
