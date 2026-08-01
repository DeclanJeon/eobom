# Situational Wisdom Middleware — 설계 문서

> Status: Draft
> Date: 2026-08-01
> Scope: AI 회고 생성 파이프라인의 내부 상황 분류·성찰 지침 미들웨어

## 1. 문제 정의

eobom의 AI 회고(`generateReviewWithMimo`)는 현재 사용자 기록을 받아 테마·감정·질문·성구·다음 걸음을 생성한다. 그러나 "이 사람이 지금 **어떤 상황 구조**에 놓여 있는가"에 대한 체계적 분류 없이, 매번 프롬프트에 기록 전체를 던지고 AI의 자유 연상에 의존한다.

주역(周易)의 64괘 + 7주제 체계는 본질적으로 **인간 상황의 구조적 분류학**이다:
- 각 괘 = 특정 상황의 형상(형성기, 막힘, 갈등, 쇠퇴, 전환, 완성, 미완…)
- 효사 = 그 상황 내 단계(초기→중기→과잉→회귀)
- 대상(大象) = 그 상황에서 "군자가 취할 태도"
- 주제별 해석 = 성장·연결·성공·역할·출세·재물·위기 7개 삶의 영역

이것을 **점술이 아닌 상황 인식 렌즈**로 사용하면, AI가 "이 사람은 지금 형성기의 초기에 있고, 무리한 전진보다 조건 점검이 필요한 국면"이라는 구조적 판단을 내린 뒤, 그 판단을 **기독교 묵상 언어로만** 출력할 수 있다.

## 2. 핵심 원칙

| 원칙 | 설명 |
|---|---|
| **비노출** | 사용자는 주역·괘·효·음양·군자 등 어떤 동양 철학 용어도 보지 못한다. 출력은 100% 기독교 묵상·성찰 언어 |
| **미들웨어** | 주역 데이터는 AI 프롬프트의 **내부 지침(system context)** 으로만 주입. UI·DB·API 응답에 노출 불가 |
| **분류 ≠ 점술** | 길흉 예언이 아닌 "상황 구조 인식 + 성찰 방향 제시". 기존 `DISCLAIMER`·`content-scrub` 체계 유지 |
| **기록 근거** | 분류 결과는 반드시 사용자 기록에서 도출. 기록에 없는 상황은 부여하지 않음 |
| **단계적 도입** | Phase 1: 프롬프트 주입. Phase 2: 구조화 분류 필드. Phase 3: 시각화/흐름 추적 |

## 3. 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                   generateReviewWithMimo                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  entries ──► [Situation Classifier] ──► situationCtx    │
│                    │                                    │
│                    ▼                                    │
│         data/wisdom/situations.json                     │
│         (주역 → 탈종교화 상황 택소노미)                   │
│                                                         │
│  system prompt ← 기존 지침 + situationCtx 주입           │
│                                                         │
│  AI output ──► [content-scrub] ──► [review-display]     │
│                    │                                    │
│                    ▼                                    │
│         FORBIDDEN_WISDOM_PATTERNS 추가                   │
│         (괘/효/음양/군자/주역 용어 차단)                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.1 데이터 흐름

```
Obsidian Vault/주역/
    ├── 05_주제별_해석/ (7개 주제 × N괘)
    ├── 01_경문_64괘/ (64개 정본)
    └── 04_부록/64괘_요약표.md
         │
         ▼  [변환 스크립트: scripts/build-wisdom-corpus.ts]
         │
    data/wisdom/
         ├── situations.json      ← 64개 상황 프로파일 (탈종교화)
         ├── themes.json          ← 7개 주제 메타 + 전이 지도
         └── phase-questions.json ← 단계별 성찰 질문 (기독교 언어)
```

## 4. 데이터 모델: 상황 프로파일

주역 1괘 = 1 상황 프로파일. 변환 시 **모든 동양 철학 용어를 제거**하고, 상황 구조만 추출한다.

### 4.1 SituationProfile 스키마

```typescript
type SituationProfile = {
  id: string;                    // "S03" (순번, 괘번호 아님)
  archetype: string;             // 내부 코드: "forming", "blocked", "conflict"...
  label: string;                 // 기독교 성찰 언어: "시작의 진통", "막힘 속에서"
  theme: WisdomTheme;            // "growth" | "connection" | "success" | "role" | "advance" | "resource" | "crisis"
  
  // 상황 구조 (AI가 읽는 내부 지침)
  structure: {
    image: string;               // 형상 설명 (비종교적): "구름과 우레가 만나지만 아직 비가 내리지 않는 형국"
    dynamic: string;             // 역학: "움직이려 하지만 위가 막고 있어, 조건이 갖춰질 때까지 경륜을 짜는 때"
    posture: string;             // 취할 태도: "서두르지 않되, 방향을 잃지 않고 준비를 계속하는 인내"
  };
  
  // 단계 인식 (효사 → 단계)
  phases: Array<{
    stage: "early" | "developing" | "peak" | "overreach" | "return";
    signal: string;              // 이 단계의 신호: "아직 기반이 없어 조급해짐"
    caution: string;             // 주의: "준비 없이 나서면 힘을 소진함"
    reflection: string;          // 성찰 질문 (기독교 언어): "하나님이 이 기다림을 통해 무엇을 준비시키고 계실까?"
  }>;
  
  // 성찰 방향 (대상 → 탈종교화)
  guidance: {
    coreQuestion: string;        // 핵심 질문: "지금 내가 경륜해야 할 것은 무엇인가?"
    avoidPattern: string;        // 피할 패턴: "조건 미비 상태에서 무리한 출발"
    embracePattern: string;      // 취할 패턴: "작은 것부터 질서를 세우는 꾸준함"
  };
  
  // 전이 (서괘전 → 상황 간 흐름)
  transitions: {
    from: string[];              // 이 상황으로 오는 이전 상황 id
    to: string[];                // 이 상황 이후 올 수 있는 상황 id
    transitionQuestion: string;  // 전이 점검 질문
  };
  
  // 성경 연결 힌트 (AI가 성구 선택 시 참고, 직접 매핑 아님)
  scripturalResonance: string[]; // ["창세기 요셉의 기다림", "출애굽의 광야 40년", "전도서 3장 때"]
};
```

### 4.2 WisdomTheme (7주제)

```typescript
type WisdomTheme = 
  | "growth"      // 성장: 미완성, 도전, 학습, 축적
  | "connection"  // 연결: 관계, 가족, 공동체, 소통
  | "success"     // 성공: 전진, 회복, 결단, 지속
  | "role"        // 역할: 책임, 돌봄, 개혁, 관찰
  | "advance"     // 출세: 역량, 기다림, 준비, 드러남
  | "resource"    // 재물: 줄임, 늘림, 분배, 절제
  | "crisis";     // 위기: 충돌, 붕괴, 후퇴, 전환
```

### 4.3 변환 예시: 屯(준) → SituationProfile

**원본 (주역)**:
- 괘상: 震下坎上 (우레 아래 물)
- 괘사: "元亨，利貞。勿用有攸往，利建侯。"
- 대상: "雲雷，屯；君子以經綸。"
- 주제: 성장 — 형성기의 진통

**변환 후**:
```json
{
  "id": "S03",
  "archetype": "forming",
  "label": "시작의 진통",
  "theme": "growth",
  "structure": {
    "image": "구름과 우레가 만나지만 아직 비가 내리지 않는 형국. 에너지는 충만하나 출구가 아직 열리지 않음",
    "dynamic": "움직이려는 힘과 위의 막힘이 공존. 큰 방향은 형통하나, 지금 당장 밀어붙이는 것은 이롭지 않음",
    "posture": "조급함을 내려놓고, 도우미를 세우고, 경륜(계획과 질서)을 짜는 인내의 때"
  },
  "phases": [
    {
      "stage": "early",
      "signal": "시작했지만 막히고, 어디로 가야 할지 불분명",
      "caution": "혼자 해결하려 하지 말고 도움을 구할 것",
      "reflection": "이 시작의 막막함 속에서, 내가 의지할 수 있는 사람은 누구인가?"
    },
    {
      "stage": "developing",
      "signal": "방향이 보이기 시작하나 아직 안정되지 않음",
      "caution": "작은 성과에 조급해하지 말 것",
      "reflection": "하나님이 이 과정을 통해 내 안에 무엇을 세우고 계신가?"
    },
    {
      "stage": "overreach",
      "signal": "기반 없이 확장하려 함",
      "caution": "지금은 큰 일을 벌일 때가 아님",
      "reflection": "내가 지금 '빨리'를 '잘'보다 우선하고 있지는 않은가?"
    }
  ],
  "guidance": {
    "coreQuestion": "지금 내가 질서를 세워야 할 것은 무엇이며, 누구와 함께해야 하는가?",
    "avoidPattern": "조건 미비 상태에서 무리한 출발, 혼자 감당하려는 고립",
    "embracePattern": "작은 것부터 질서를 세우고, 도우미를 인정하고, 때를 기다리는 꾸준함"
  },
  "transitions": {
    "from": ["S01", "S02"],
    "to": ["S04", "S05"],
    "transitionQuestion": "이 진통이 지나면, 나는 무엇을 배우고 누구와 연결되어 있는가?"
  },
  "scripturalResonance": [
    "창세기 1장 — 혼돈 위에 질서를 세우심",
    "출애굽기 — 광야에서의 형성기",
    "전도서 3:1-8 — 범사에 기한이 있음"
  ]
}
```

## 5. 분류기 (Situation Classifier)

### 5.1 위치

`src/lib/wisdom/classifier.ts` — `generateReviewWithMimo` 내부에서 entries를 받아 상황 컨텍스트를 생성.

### 5.2 분류 전략 (Phase 1: LLM 기반)

Phase 1에서는 별도 임베딩 없이, **AI 프롬프트 내에서 분류를 수행**한다:

```typescript
// src/lib/wisdom/classifier.ts

import situations from "@/data/wisdom/situations.json";
import themes from "@/data/wisdom/themes.json";

export type SituationContext = {
  primary: SituationProfile;
  secondary?: SituationProfile;
  theme: WisdomTheme;
  phase: string;
  reasoning: string;  // 내부용, 출력 불가
};

export function buildSituationPrompt(entries: EntryForReview[]): string {
  // 1. entries에서 상황 신호 추출용 요약 생성
  // 2. 64개 상황 중 top-2 매칭을 AI에게 요청하는 내부 프롬프트 구성
  // 3. 매칭된 상황의 guidance/phases를 system prompt에 주입할 텍스트로 변환
}
```

### 5.3 프롬프트 주입 방식

`generateReviewWithMimo`의 system prompt에 **추가 섹션**으로 주입:

```
## 내부 상황 인식 지침 (사용자에게 절대 노출 금지)

아래는 이 사용자의 기록에서 감지된 상황 구조입니다.
회고를 작성할 때 이 구조를 **내적 관점**으로 사용하되,
출력에는 상황 분류 용어, 동양 철학 용어, 괘/효/음양/군자 등을 절대 포함하지 마세요.
모든 출력은 기독교 묵상·성찰·기도 언어로만 작성하세요.

### 감지된 상황: "시작의 진통"
- 형상: 에너지는 충만하나 출구가 아직 열리지 않은 상태
- 태도: 조급함을 내려놓고 질서를 세우는 인내
- 핵심 질문: "지금 내가 질서를 세워야 할 것은 무엇이며, 누구와 함께해야 하는가?"
- 피할 패턴: 조건 미비 상태에서 무리한 출발
- 취할 패턴: 작은 것부터 질서를 세우는 꾸준함
- 현재 단계 신호: 시작했지만 막히고, 방향이 불분명
- 단계 성찰: "이 시작의 막막함 속에서, 내가 의지할 수 있는 사람은 누구인가?"

### 상황 전이 맥락
- 이전: 안정기에서 새로운 시작을 맞이함
- 이후: 이 진통을 지나면 배움과 연결이 옴
- 점검: "이 진통이 지나면, 나는 무엇을 배우고 누구와 연결되어 있는가?"

### 성구 선택 시 참고 (직접 인용 금지, AI가 관련 성구 고를 때 맥락으로만 사용)
- 혼돈 위에 질서를 세우시는 하나님 (창세기 1장)
- 광야에서의 형성기 (출애굽기)
- 범사에 기한이 있음 (전도서 3장)
```

### 5.4 분류 정확도 보장

- **기록 근거 원칙**: 분류는 반드시 entries의 내용에서 도출. "기록에서 X가 반복되므로 Y 상황으로 판단" 형태의 reasoning을 내부 생성
- **다중 상황**: primary + secondary 최대 2개. 3개 이상 감지 시 primary만 사용
- **불확실 시**: 명확한 상황 신호가 없으면 분류를 생략하고 기존 동작 유지 (graceful degradation)

## 6. 출력 필터링 (content-scrub 확장)

### 6.1 추가 금지 패턴

```typescript
// content-scrub.ts에 추가
export const FORBIDDEN_WISDOM_PATTERNS: RegExp[] = [
  /주역/i,
  /괘[사상]?/,           // 괘, 괘사, 괘상
  /효사?/,              // 효, 효사
  /음양/,
  /군자/,
  /소인/,
  /[乾坤震巽坎離艮兌]/,  // 팔괘 한자
  /태극/,
  /육십사괘|64괘/,
  /점[괘술]/,
  /길흉/,
  /형통/,              // "형통하다"는 성경에도 쓰이므로 맥락 판단 필요 → Phase 2에서 정교화
];
```

### 6.2 scrub 적용 위치

기존 `deepScrubMirror`가 AI 출력 전체를 scrub하므로, 새 패턴을 `FORBIDDEN_MIRROR_PATTERNS`에 합치거나 별도 배열로 추가 후 `scrubMirrorText`에서 순회.

## 7. 변환 스크립트

### 7.1 `scripts/build-wisdom-corpus.ts`

```
입력: /home/declan/Documents/Obsidian Vault/주역/
  - 05_주제별_해석/*.md (7개 파일)
  - 01_경문_64괘/*.md (64개 파일)
  - 04_부록/64괘_요약표.md

출력: data/wisdom/
  - situations.json (64개 SituationProfile)
  - themes.json (7개 WisdomTheme 메타 + 전이 지도)
  - phase-questions.json (단계별 성찰 질문 모음)
```

### 7.2 변환 규칙

| 주역 원본 | 변환 대상 | 변환 규칙 |
|---|---|---|
| 괘명 (乾, 坤…) | `archetype` 코드 | 의미 기반 영문 코드: "creative", "receptive", "forming"… |
| 괘상 (震下坎上) | `structure.image` | 자연 현상 비유로 서술, 한자 제거 |
| 괘사 | `structure.dynamic` | 상황 역학으로 의역, 점술 어조 제거 |
| 대상 (大象) | `structure.posture` + `guidance` | "군자가 ~한다" → "이 상황에서 취할 태도" |
| 효사 (6효) | `phases[]` | 初→early, 二→developing, 三/四→peak, 五→overreach/peak, 上→return |
| 주제별 "적용 질문/행동" | `phases[].reflection` + `guidance.coreQuestion` | 기독교 성찰 언어로 재작성 |
| 주제별 "주의점" | `guidance.avoidPattern` | 과잉/부족 패턴으로 추출 |
| 서괘전 순서 | `transitions` | 인접 괘 = 전이 관계 |
| 주제별 배열 | `theme` + `themes.json` | 7주제 분류 유지 |

### 7.3 기독교 언어 변환 가이드

| 주역 표현 | 변환 후 (내부 지침) |
|---|---|
| 군자가 ~한다 | 이 상황에서 취할 태도: ~ |
| 길하다 / 흉하다 | 유익한 방향 / 주의할 방향 |
| 하늘 (乾) | 창조적 에너지, 시작의 힘 |
| 땅 (坤) | 수용, 품음, 기다림 |
| 우레 (震) | 갑작스러운 움직임, 각성 |
| 물 (坎) | 깊음, 위험, 신뢰의 시험 |
| 산 (艮) | 멈춤, 경계, 안식 |
| 바람 (巽) | 스며듦, 점진적 영향 |
| 불 (離) | 밝음, 드러남, 붙어있음 |
| 못 (兌) | 기쁨, 소통, 나눔 |

## 8. 통합 포인트

### 8.1 `generateReviewWithMimo` 수정

```typescript
// 기존
const system = `당신은 개인 묵상 기록을 정리하는 성찰 도우미입니다. ...`;

// 수정 후
import { buildSituationPrompt } from "@/lib/wisdom/classifier";

const situationCtx = buildSituationPrompt(entries);
const system = `당신은 개인 묵상 기록을 정리하는 성찰 도우미입니다.
...기존 지침...

${situationCtx ? `\n${situationCtx}` : ""}`;
```

### 8.2 StructuredReview 확장 (Phase 2)

```typescript
export type StructuredReview = {
  // ...기존 필드...
  
  // Phase 2 추가 (내부용, UI 미노출)
  situationMeta?: {
    primaryArchetype: string;
    theme: WisdomTheme;
    phase: string;
    confidence: "high" | "medium" | "low";
  };
};
```

이 필드는 DB에 저장하되 UI에 렌더링하지 않음. 향후 "흐름" 탭에서 상황 전이 시각화에 사용 가능.

### 8.3 Story Mirror와의 관계

Story Mirror RAG 코퍼스(고전 인물·비유)는 **출력층**에서 사용. Wisdom 미들웨어는 **분류층**에서 사용. 둘은 독립적이며 충돌하지 않음:

```
Wisdom: "이 사람은 '막힘' 상황에 있고, '기다림과 내부 정비'가 필요"
Story Mirror: "그 맥락에서 요셉의 감옥 기다림, 다윗의 광야 도피가 공명"
```

## 9. 단계별 로드맵

### Phase 1: 프롬프트 주입 (MVP)

- [ ] `scripts/build-wisdom-corpus.ts` 작성 — Obsidian 볼트 → `data/wisdom/situations.json`
- [ ] `src/lib/wisdom/classifier.ts` — entries → 상황 분류 → 프롬프트 텍스트 생성
- [ ] `src/lib/wisdom/types.ts` — SituationProfile, WisdomTheme 타입
- [ ] `mimo.ts` 수정 — system prompt에 situationCtx 주입
- [ ] `content-scrub.ts` 확장 — FORBIDDEN_WISDOM_PATTERNS 추가
- [ ] 테스트: 주역 용어 비노출 검증, 상황 분류 정확도 스모크 테스트

### Phase 2: 구조화 저장

- [ ] `StructuredReview.situationMeta` 필드 추가
- [ ] Prisma 스키마에 situation 아카이브 컬럼
- [ ] 회고 생성 시 분류 결과를 DB에 기록
- [ ] "흐름" 탭에서 상황 전이 타임라인 시각화 (사용자는 "이번 달은 '시작의 진통'에서 '관계 맺기'로 이동했네요"로 봄)

### Phase 3: 적응형 성찰

- [ ] 이전 회고의 situationMeta를 다음 분류에 피드백 (전이 추적)
- [ ] 상황별 맞춤 성찰 질문 제안 (기록 작성 시)
- [ ] 계절/주기 패턴 인식 (반복되는 상황 구조 감지)

## 10. 리스크 & 완화

| 리스크 | 영향 | 완화 |
|---|---|---|
| AI가 지침을 무시하고 주역 용어 출력 | 사용자 신뢰 손상 | content-scrub 이중 방어 + 테스트 |
| 분류 부정확 (잘못된 상황 부여) | 회고 품질 저하 | confidence 기반 graceful degradation; 불확실 시 미주입 |
| 프롬프트 길이 증가 (64괘 전체 주입 불가) | 토큰 제한 | top-2 상황만 주입; 요약 형태 |
| 기독교 사용자 정서 충돌 | "왜 동양 철학이?" | 완전 비노출; 내부 코드명도 영문 archetype 사용 |
| 주역 해석의 점술적 잔재 | 브랜드 훼손 | 변환 시 "길흉" → "유익/주의", 예언 어조 완전 제거 |

## 11. 검증 기준

1. **비노출**: 생성된 회고 100건에서 주역 관련 용어 0건 (자동 테스트)
2. **품질**: 상황 주입 전후 회고의 "깊이" 비교 (사람 평가 or LLM-as-judge)
3. **정확도**: 테스트 entries 세트에 대해 예상 상황 분류와 일치율 ≥ 70%
4. **성능**: 프롬프트 추가로 인한 레이턴시 증가 ≤ 2초
5. **기존 동작 보존**: 상황 분류 불가 시 기존 회고와 동일 출력

## 12. 파일 구조 (최종)

```
eobom/
├── data/
│   └── wisdom/
│       ├── situations.json          # 64개 상황 프로파일
│       ├── themes.json              # 7주제 + 전이 지도
│       └── phase-questions.json     # 단계별 성찰 질문
├── scripts/
│   └── build-wisdom-corpus.ts       # Obsidian → JSON 변환
├── src/lib/wisdom/
│   ├── types.ts                     # SituationProfile, WisdomTheme
│   ├── classifier.ts                # entries → SituationContext
│   └── prompt-builder.ts            # SituationContext → 프롬프트 텍스트
└── tests/
    └── wisdom-scrub.test.ts         # 비노출 + 분류 테스트
```

## 13. 설계 결정 요약

| 결정 | 선택 | 이유 |
|---|---|---|
| 데이터 형식 | 정적 JSON (DB 아님) | 64개 고정 데이터; 런타임 변경 불필요; 빌드 시 생성 |
| 분류 방식 | LLM 프롬프트 내 분류 | Phase 1 최소 구현; 별도 모델/임베딩 불필요 |
| 주입 위치 | system prompt 추가 섹션 | 기존 파이프라인 최소 변경; user payload 불변 |
| 용어 차단 | content-scrub 확장 | 기존 이중 방어 체계 재사용 |
| 주제 체계 | 7주제 유지 | 주역 볼트의 주제별 해석이 이미 이 구조로 정리됨 |
| 기독교 언어 | 변환 가이드 적용 | "군자" → "취할 태도", "길흉" → "유익/주의" |
