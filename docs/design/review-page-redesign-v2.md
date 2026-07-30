# 회고 페이지 UI/UX 재설계 v2

- 상태: 구현 전 승인용 설계안
- 작성일: 2026-07-30
- 대상: `/reviews`, `/reviews/[id]`
- 관련 소스 오브 트루스: `/DESIGN.md`
- 기존 기준: `docs/design/review-enhancement-v1.md`, `docs/brand-message.md`

## 1. 결론

회고 페이지를 AI 결과 필드의 나열에서 **한 편의 조용한 성찰 문서**로 바꾼다.

현재 페이지는 데이터 구조를 그대로 출력하는 방식이라 다음 문제가 생긴다.

- 한 문장부터 다음 실천까지의 흐름이 약하다.
- 비어 있는 `title/body` 항목도 카드로 렌더되어 빈 상자가 보인다.
- AI 모델명이 사용자 문서에 노출된다.
- 이야기 거울은 링크 하나뿐이라 회고와 분리되어 보인다.
- 모든 섹션의 시각적 무게가 비슷해 사용자가 어디부터 읽어야 할지 판단해야 한다.

새 페이지는 첫 화면에서 `무슨 기간을 돌아보는지 → 무엇이 보였는지 → 무엇을 다시 볼지 → 다음에 무엇을 할지`를 전달한다.

핵심 문장:

> **평가서가 아니라, 기록이 비추는 한 장의 거울.**

---

## 2. 2026 어워드 참고 방식

2026년 7월 현재 Awwwards, CSS Design Awards, FWA는 연간 단일 우승작만 발표하는 구조가 아니라 Site of the Day, Website of the Day, FWA of the Day 같은 **롤링 수상 아카이브**를 운영한다. 따라서 아직 확정되지 않은 “2026 최고의 단일 사이트”를 임의로 지목하지 않고, 다음 공식 아카이브에서 반복적으로 확인되는 인터랙션 원칙을 참고한다.

- [Awwwards Awards archive](https://www.awwwards.com/websites/awards/)
- [Awwwards Sites / Site of the Day archive](https://www.awwwards.com/websites/sites_of_the_day/)
- [CSS Design Awards](https://www.cssdesignawards.com/)
- [The FWA](https://thefwa.com/)

### 참고해 가져오는 패턴

| 참고 패턴 | 회고 페이지 적용 | 가져오지 않는 것 |
|---|---|---|
| 큰 타이포그래피로 첫 메시지를 즉시 전달 | 한 문장 요약을 첫 화면의 유일한 주 메시지로 사용 | 장식용 초대형 글자, 읽기 어려운 줄바꿈 |
| 스크롤 자체를 내러티브로 사용 | 섹션 순서를 시간/성찰 흐름으로 설계 | 과도한 패럴랙스와 스크롤 잠금 |
| 강한 색면과 편집형 여백 | forest hero + linen reading surface | 네온, 글래스모피즘, 웰니스 대시보드 톤 |
| 상태 전환에만 모션 사용 | 섹션 진입·목차 활성·저장 상태에 160–300ms 모션 | 자동재생 영상, 계속 움직이는 배경 |
| 명확한 상호작용 계층 | 목차, 근거 기록, 다시 읽기, 다음 한 걸음 CTA를 명시 | 카드 전체를 클릭하게 만들어 목적이 모호해지는 패턴 |
| 콘텐츠가 디자인을 결정 | 의미 있는 데이터만 섹션으로 승격 | 빈 JSON 필드를 시각적 카드로 노출 |

어워드 사이트의 시각 언어를 복제하지 않는다. 이어봄의 기존 브랜드와 신앙·개인정보 안전 원칙이 우선이다.

---

## 3. 사용자와 핵심 과업

### 3.1 핵심 사용자

기록은 하지만 과거 기록을 다시 연결하기 어려운 한국어권 묵상 사용자. 모바일에서 짧게 확인하거나, 데스크톱에서 조용히 한 기간을 읽는다.

### 3.2 사용자 질문

페이지는 다음 순서로 질문에 답해야 한다.

1. **이 회고는 언제의 기록인가?**
2. **그 기간을 한 문장으로 말하면 무엇인가?**
3. **내 기록에서 실제로 반복된 것은 무엇인가?**
4. **왜 그렇게 말하는가?**
5. **어떤 이야기·말씀·기록을 다시 볼 수 있는가?**
6. **지금 당장 하나만 해본다면 무엇인가?**

### 3.3 성공 기준

- 10초 내 회고 기간과 핵심 문장을 파악한다.
- 30초 내 최소 한 개의 근거 기록을 연다.
- 빈 카드, 모델명, 내부 필드명 없이 자연어 문서로 읽힌다.
- 회고에서 이야기/연결/시각화로 한 번에 이동할 수 있다.
- 사용자가 AI의 판단을 하나님의 뜻이나 신앙 점수로 오해하지 않는다.

---

## 4. 정보 구조

### 4.1 전체 페이지 순서

```text
AppShell
└── ReviewDetailHeader
    ├── back / 회고 목록
    ├── 기간 · 회고 종류 · 저장 상태
    └── 보조 액션: 다시 생성 / 삭제 / 공유 범위(기존 정책에 따름)
└── ReviewHero
    ├── AI 회고 초안 eyebrow
    ├── 한 문장 요약
    ├── 기간·기록 수·근거 수
    └── 짧은 안내문
└── ReviewSectionNav
    ├── 한 문장
    ├── 주제와 마음
    ├── 이야기 거울
    ├── 다시 읽을 말씀
    └── 다음 한 걸음
└── ReviewBody
    ├── 01 주제와 마음
    ├── 02 이야기 거울
    │   ├── 이야기
    │   ├── 연결
    │   └── 시각화
    ├── 03 다시 읽을 말씀
    ├── 04 성찰과 변화
    ├── 05 다시 읽을 기록
    ├── 06 다음 한 걸음
    │   ├── 작은 실천
    │   └── 기도로 이어가기
    └── 07 한계와 안내
```

### 4.2 기존 필드의 새 그룹 매핑

| 기존 데이터 | 새 UI 그룹 | 표시 규칙 |
|---|---|---|
| `oneSentence` | Hero | 없으면 `report.summary`, 둘 다 없으면 짧은 기본 안내 |
| `themes` + `emotions` + `questions` | 주제와 마음 | title/body 둘 다 비어 있으면 제외 |
| `storyConnections` + StoryCard | 이야기 거울/이야기 | 0개면 빈 카드가 아니라 생성/탐색 CTA |
| StoryRagRun | 이야기 거울/연결 | 최신 run 또는 기간 범위 결정 필요 |
| Visualization | 이야기 거울/시각화 | 요청 시 로드, 정적 placeholder 금지 |
| `scriptureReadings` | 다시 읽을 말씀 | 본문 범위·이유·주목할 점 |
| `changesOrUnknown` | 성찰과 변화 | 단일 카드, 반드시 자연어 라벨 |
| `rereadEntries` | 다시 읽을 기록 | 날짜와 이유를 함께 표시 |
| `smallPractices` + `nextSteps` | 다음 한 걸음 | 최대 1–2개를 우선 노출 |
| `prayerPrompts` | 기도로 이어가기 | 최대 1–2개, clay accent |
| `limitations` | 한계와 안내 | 페이지 하단 quiet note |
| `modelProvider/modelName` | 없음 | 사용자 UI에서 영구 제거 |

### 4.3 빈 데이터 정책

렌더링 전에 공통 정규화 함수를 둔다.

```ts
function meaningfulObservation(item: Observation) {
  return Boolean(item.title?.trim() || item.body?.trim());
}
```

규칙:

- title/body가 모두 비어 있으면 렌더하지 않는다.
- 필터 후 0개면 섹션 전체를 렌더하지 않는다.
- 섹션이 없다는 사실을 사용자 결핍으로 표현하지 않는다.
- Story Mirror가 없으면 `아직 연결된 이야기가 없어요` 한 줄과 `이야기 거울 열기` CTA만 표시한다.
- 생성 중에는 skeleton을 사용하되, 빈 카드 모양을 최종 상태로 남기지 않는다.

---

## 5. 화면 상세 설계

### 5.1 ReviewDetailHeader

**목적:** 페이지의 정체성과 사용 가능한 행동을 즉시 설명한다.

```text
← 회고
AI 회고 초안                         [회고 목록]
2026. 07. 27 – 2026. 07. 29 · 3개 기록
```

- 데스크톱: 콘텐츠 상단에 얇은 header row.
- 모바일: AppShell 헤더 아래 compact row.
- `회고 상세` 같은 내부 명칭은 노출하지 않는다.
- 보고서 종류는 `cumulative` 같은 내부 enum 대신 `기간 회고`, `월간 회고`처럼 자연어로 매핑한다.
- 내부 ID·provider·model·JSON key는 표시하지 않는다.

### 5.2 ReviewHero

forest surface의 단일 hero. 사용자에게 가장 먼저 읽히는 것은 한 문장뿐이어야 한다.

```text
AI 회고 초안
2026. 07. 27 – 2026. 07. 29

세 기록은 신앙 공동체 안에서 서로 지지하는 마음과
혼자가 아닌 길을 돌아보게 합니다.

3개의 기록에서 이어진 초안 · 근거 기록 4개
```

규칙:

- `text-display-lg`, desktop 최대 2–3줄, mobile 최대 4줄.
- hero 내부에 긴 disclaimer를 넣지 않는다. 첫 화면 아래에 `이 문서는...` 한 줄만 둔다.
- 배경은 `surface-card-dark` 기존 유틸 사용.
- 장식은 gold 1px rule 또는 작은 halo만 사용.

### 5.3 ReviewSectionNav

- Desktop: `position: sticky; top: 88px`, 폭 176–192px의 rail.
- Mobile: page header 아래 가로 스크롤 anchor row.
- 항목은 전체 섹션이 아니라 핵심 5개만 표시.
- 현재 위치는 forest 텍스트 + gold bottom rule로 표현.
- `aria-label="회고 목차"`, anchor target에는 `scroll-margin-top` 지정.
- 목차가 콘텐츠를 가리지 않도록 sticky rail은 desktop에서만 사용.

### 5.4 주제와 마음

현재처럼 `themes`, `emotions`, `questions`를 각각 같은 카드 그룹으로 나누지 않는다. 첫 화면에서는 세 종류를 하나의 읽기 단위로 묶는다.

```text
01  주제와 마음

기록에서 반복해서 보인 결

[주제] 신앙 공동체에서의 상호 지지       높게 보임
모든 기록에서 ...
근거 기록 2개 열기

[마음] 책임감과 감사가 함께 나타남
...
```

- 카드 수는 meaningful item 기준 최대 5개.
- confidence는 `high` 같은 내부 영어값 대신 `여러 기록에서 보임`, `한 기록에서 보임`으로 번역하거나 제거한다.
- 피드백은 각 카드 하단의 조용한 `도움 됨 / 다시 보고 싶지 않음` disclosure 안에 둔다. 처음부터 4개 버튼을 펼쳐 인지 부하를 만들지 않는다.
- 근거는 카드 안에서 1–2개만 보이고 `근거 기록 더 보기`로 확장한다.

### 5.5 이야기 거울 브리지

회고 페이지와 Story Mirror를 연결하는 핵심 모듈. 세 탭을 새 페이지 안에 복제하지 않고, **한 모듈 안의 세 목적지**로 보여준다.

```text
02  이야기 거울

지금의 기록과 닿아 있는 세 가지 방식

┌ 이야기 ┐  ┌ 연결 ┐  ┌ 시각화 ┐
│ 닮은   │  │ 지금의│  │ 한눈에 │
│ 인물과 │  │ 마음을│  │ 바라본 │
│ 작품   │  │ 잇기  │  │ 이미지 │
└────────┘  └───────┘  └────────┘
```

#### 이야기

- 최신 `StoryMirrorRun`의 meaningful match 최대 2개.
- 작품명 → 인물명 → 한 줄 연결 → 상세 링크.
- 점수, ranking, internalScore는 노출하지 않는다.

#### 연결

- 최신 `StoryRagRun`의 summary + 대표 connection 1개.
- `연결 시작하기`, `지난 연결 보기`를 명확히 구분.
- 외부 AI 동의가 없으면 생성 버튼 대신 설정 이동 안내.

#### 시각화

- 이미지가 이미 있으면 thumbnail + `크게 보기`.
- 없으면 이미지 생성 버튼과 생성 목적을 한 문장으로 설명.
- 자동 생성하지 않는다. 시각화는 reflection 결과의 장식이 아니라 사용자가 선택하는 재방문 방식이다.

반응형:

- 1024px 이상: 3열 destination cards.
- 768–1023px: 3열 유지하되 내부 텍스트 축소.
- 767px 이하: 세로 stack 또는 가로 scroll snap. 기본은 세로 stack이 읽기 쉽다.

### 5.6 다시 읽을 말씀

- 성구 reference는 `chip-gold`.
- 이유와 주목할 점은 Source Serif 4.
- 본문 전체는 긴 경우 접기/펼치기. 처음부터 전체 전문을 길게 노출하지 않는다.
- `이 본문으로 기록하기`는 primary가 아닌 text action.
- “이 말씀의 정답”이 아니라 “다시 머물 질문”으로 표현한다.

### 5.7 성찰과 변화

세 개의 빈 카드 대신 하나의 문서형 SurfaceCard.

```text
04  성찰과 변화

달라진 점
...

아직 알 수 없는 점
...
```

- 값이 한쪽만 있으면 있는 부분만 표시.
- 둘 다 없으면 섹션을 숨긴다.
- 판단형 표현을 피하고 `기록에서 보이는 점`으로 제목을 정한다.

### 5.8 다시 읽을 기록

- 날짜·기록 제목·한 줄 excerpt·열기 action.
- 근거 기록과 다시 읽을 기록의 차이를 구분한다.
- 카드 전체를 clickable link로 만들지 말고 `기록 열기` 링크를 명시한다.

### 5.9 다음 한 걸음

forest보다 clay 온도를 낮게 사용한다. 사용자를 몰아붙이지 않는 문장.

```text
06  다음 한 걸음

이번 주에 하나만 해본다면

① 신뢰하는 사람에게 이 마음을 한 문장으로 나누기
   이 기록에서 반복된 고립의 마음을 혼자만 품지 않도록.

[이 한 걸음을 기록으로 남기기]

기도로 이어가기
감사와 책임감이 함께 있는 마음을 숨기지 않고 기도하기.
```

- 최대 2개만 우선 노출.
- `작은 실천 후보`를 여러 개 나열하지 않는다.
- CTA는 새 기록 작성 또는 해당 Scripture 기록 작성으로 이어진다.

### 5.10 한계와 안내

가장 하단에 `ReviewBoundaryNote`로 배치한다.

- 모델명/provider명 금지.
- 기존 disclaimer는 유지하되 2–3문장으로 정리.
- 도움이 필요한 경우 공동체·상담·전문가와 나누라는 안내를 조용히 포함.
- visually muted하되 대비는 유지.

---

## 6. 컬러 시스템

기존 `globals.css` 토큰을 재사용한다. 새 hex를 추가하지 않는다.

| 영역 | 토큰 | 사용 |
|---|---|---|
| 페이지 | `background` / `surface-low` | 긴 읽기에서 눈부심을 낮춤 |
| hero | `primary` / `primary-container` | 핵심 한 문장에만 강한 면적 |
| 본문 | `text-main` | 기록·근거·성찰 prose |
| 보조 | `text-muted` | 날짜·설명·출처 |
| 링크 | `leaf` | 이동/행동 |
| 의미 강조 | `accent-gold-ink` | eyebrow, Scripture chip, rule |
| 기도/다음 행동 | `accent-terracotta` | 작은 accent만 |
| Story Mirror shared | `surface-shared` | 연결 destination의 보조 surface |

금지:

- `gold`를 본문 텍스트에 직접 사용.
- 섹션마다 다른 색상 띠를 사용해 레인보우화.
- 점수·등급을 색깔로 표현.
- dark card를 2개 이상 연속 사용.

---

## 7. 타이포그래피

기존 폰트 스택을 유지한다.

- Manrope: navigation, eyebrow, section heading, button, metadata.
- Source Serif 4: reflection prose, evidence excerpt, Scripture, connection body.
- Hero: Manrope 600–700.
- `oneSentence`: 24px mobile / 36px desktop에서 시작해 실제 한국어 줄바꿈을 검증.
- body: 16px, line-height 1.75–1.85.
- label: 최소 12px; 중요한 조작은 14px 이상.
- 문장 길이와 줄바꿈이 우선이며, font-size를 크게 하는 것보다 measure를 제한한다.

---

## 8. 모션그래픽·인터랙션

### 8.1 허용

- 페이지 첫 진입 시 hero → 첫 섹션 순서로 240ms fade/translate.
- 목차 active 상태의 160ms color/rule transition.
- 카드 hover는 border color + shadow만 160ms.
- evidence 펼침/접힘은 height auto가 아닌 grid row/opacity 조합으로 layout jump를 줄인다.
- Story Mirror destination hover에 1px gold line 또는 2px translate.

### 8.2 금지

- 자동 실행 영상, 무한 회전, particle, scroll-jacking, snap 강제.
- 400ms를 넘는 콘텐츠 전환.
- motion만으로 상태를 전달.
- 모바일에서 hover에 의존.

### 8.3 reduced motion

`@media (prefers-reduced-motion: reduce)`에서 transition-duration 1ms 수준으로 낮추고 transform/scroll animation 제거. 콘텐츠 순서와 focus는 그대로 유지.

---

## 9. 반응형·컨테이너

### Desktop 1280+

```text
[AppShell chrome]
┌──────────────────── max 1120 ────────────────────┐
│ header / metadata                                │
│ hero full                                        │
│ ┌─ rail 184 ─┐ ┌──── reading 720 ────┐           │
│ │ 목차       │ │ sections             │           │
│ └────────────┘ └─────────────────────┘           │
└───────────────────────────────────────────────────┘
```

### Tablet 768–1279

- rail 제거.
- 목차는 hero 아래 horizontal row.
- reading column max 760px.

### Mobile 360–767

- `px-4`, section gap 40px.
- hero padding 24px.
- sticky section nav는 가로 스크롤, 첫 항목이 항상 보임.
- Story Mirror destinations 세로 stack.
- action buttons min-height 44px.
- quote/evidence excerpt는 카드 padding 16px.

### 컨테이너 규칙

- detail reading column `max-w-3xl`보다 좁은 720–760px.
- hero와 Story Mirror bridge만 `max-w-5xl`까지 확장 가능.
- desktop에서도 본문 한 줄이 너무 길어지지 않게 `max-w-prose` 적용.

---

## 10. 컴포넌트 및 데이터 계약

### 권장 컴포넌트

```text
src/components/review/
├── review-detail-header.tsx
├── review-hero.tsx
├── review-section-nav.tsx
├── review-observation-group.tsx
├── story-mirror-bridge.tsx
├── review-scripture-section.tsx
├── review-forward-panel.tsx
└── review-boundary-note.tsx
```

첫 구현에서는 기존 page.tsx 안에서 조각을 나눠도 되지만, review page가 커지면 위 경로로 이동한다.

### 서버/클라이언트 경계

- review data fetch, normalization, Story Mirror latest lookup: server.
- section nav active state, evidence disclosure, feedback: client island.
- visualization image generation: client action, 결과 렌더는 server/client 양쪽 계약을 명확히 한다.
- provider/model metadata는 서버에서 사용자 응답에 포함하지 않거나 UI mapper에서 제거한다.

### 정규화

`normalizeReviewForDisplay(report, review)`를 만들어 다음을 보장한다.

- internal enum → 한국어 label.
- blank string → null.
- blank observation 제거.
- array cap: themes/emotions/questions 최대 5, story/scripture 최대 3, next/prayer 최대 2.
- `limitations` 기본 문구가 없으면 제품 고정 문구 사용.

---

## 11. 접근성·콘텐츠 검증

### 반드시 통과해야 하는 기준

- `h1` 1개, section마다 `h2`, card heading은 의미 있는 경우만 `h3`.
- 목차는 `nav aria-label="회고 목차"`.
- 모든 anchor target에 `scroll-margin-top`.
- focus-visible ring은 leaf 또는 outline token 사용.
- 색상만으로 confidence/상태를 표현하지 않음.
- 버튼/링크 터치 영역 44×44px 이상.
- 360px에서 가로 overflow 없음.
- screen reader가 `근거 기록` 링크를 날짜/대상과 함께 읽음.
- `prefers-reduced-motion`에서 layout과 content order 동일.

### 콘텐츠 QA

- 화면에 `model:`, provider name, JSON key, 영어 enum이 보이지 않음.
- blank title/body 카드 0개.
- Story Mirror가 없을 때 빈 3열 카드 0개.
- 한 문장 요약이 없을 때 자연어 fallback.
- AI가 신앙 상태·하나님의 뜻·정답을 판정하는 카피 0개.

---

## 12. 구현 단계

### Phase 0 — 계약 고정

- `DESIGN.md`를 기준 문서로 채택.
- 기존 `review-enhancement-v1`의 8개 섹션 방향과 이 문서의 7개 화면 그룹을 조정.
- 기간 범위 Story Mirror 조회 정책 결정: 최신 사용자 run vs 해당 review 기간.

### Phase 1 — 콘텐츠 정규화 / 안전한 축소

- `normalizeReviewForDisplay` 추가.
- blank observation 필터, array cap, internal label 제거.
- model/provider 노출 제거.
- 회귀 테스트 추가.

### Phase 2 — 레이아웃·타이포·목차

- `ReviewDetailHeader`, `ReviewHero`, `ReviewSectionNav` 구현.
- 기존 AppShell/tokens 재사용.
- desktop rail + mobile horizontal nav.
- mobile/desktop screenshot 검증.

### Phase 3 — Story Mirror Bridge

- `StoryMirrorBridge` 구현.
- 이야기/연결/시각화 destination별 데이터/empty/consent 상태.
- 기간 범위 정책에 따라 query 조정.
- Story Mirror 기존 route와 링크 회귀 테스트.

### Phase 4 — forward panel·motion·접근성

- 다음 한 걸음/기도 패널 통합.
- reduced-motion과 keyboard walkthrough.
- evidence disclosure와 feedback UX 정리.

### Phase 5 — 시각 QA 및 릴리즈

- 360/390/768/1024/1440 screenshots.
- `tsc`, unit test, build.
- 로그인 브라우저에서 실제 review 1건/빈 데이터 review 1건/Story Mirror 없는 user 1건 확인.
- 문제 발견 시 visual verdict 후 한 번에 한 smell만 수정.

---

## 13. 수용 기준

### 사용자 관점

- 첫 화면 10초 안에 기간과 한 문장 요약을 이해한다.
- 스크롤 중 현재 위치를 목차에서 알 수 있다.
- 빈 섹션이나 내부 기술 정보가 보이지 않는다.
- 근거 기록을 한 번의 탭으로 확인한다.
- 회고에서 이야기/연결/시각화 세 목적지로 이동한다.
- 한 번에 할 수 있는 다음 행동이 1–2개로 명확하다.

### 품질 관점

- blank observation card 0개.
- provider/model string 0개.
- horizontal overflow 0개.
- WCAG AA 의도 충족.
- reduced-motion에서 정보 손실 0개.
- 기존 feedback, reread Scripture, Story Mirror route 회귀 0개.

---

## 14. 참고 링크

- Awwwards Awards: https://www.awwwards.com/websites/awards/
- Awwwards Site of the Day archive: https://www.awwwards.com/websites/sites_of_the_day/
- CSS Design Awards: https://www.cssdesignawards.com/
- The FWA: https://thefwa.com/
- Repository brand source: `docs/brand-message.md`
- Repository review enhancement source: `docs/design/review-enhancement-v1.md`
