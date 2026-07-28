# 다시 머물 본문 (Reread Scriptures) v1 설계

- 문서 버전: **v1.0**
- 작성일: 2026-07-28
- 상태: **구현 전 설계 확정안**
- 관련: `docs/meditation_journal_prd_v1.0.md` §1.7, `docs/brand-message.md`, `src/lib/mimo.ts`, `/reviews/[id]`, `/today`
- 후속 실행: `docs/work-orders/WO-2026-07-28-reread-scriptures.md`

---

## 0. 한 줄 요약

**새 AI 기능이 아니라**, 이미 회고 JSON에 있는 `rereadScriptures`를  
**「처방 성구」가 아닌 「본문 재방문」**으로 안전하게 드러내고,  
회고 상세(1순위) → 오늘 홈(2순위)으로 이어 주는 기능이다.

---

## 1. 문제 · 기회

### 문제
- 사용자는 “지금 어떤 말씀 앞에 머물면 좋을까?”를 자주 묻는다.
- 회고 생성물은 `rereadScriptures`를 만들지만 **UI에 노출되지 않는다**.
- `rereadEntries`(기록 재방문)만 보여, **말씀 축의 다음 행동**이 비어 있다.

### 기회
- 데이터·스키마·bible 파서·passage API가 이미 있다.
- PRD 1.7이 성구 추천의 **허용 형식과 금지 형식**을 이미 규정한다.
- 오늘 홈은 `latestReview`를 이미 fetch하므로 **추가 AI 호출 없이** 2순위를 붙일 수 있다.

### 비목표 (v1 명시적 제외)
- 감정/키워드 → 고정 구절 매핑 테이블
- 작성 폼 자동 성구 삽입·팝업 추천
- 회고 없는 사용자에게 실시간 MiMo 성구 suggest API
- “오늘의 성구”, 운세·신탁·한 절 처방 UX
- 랜딩·함께 피드의 성구 추천
- DB 스키마 마이그레이션 / 구 회고 백필 재생성

---

## 2. 제품 원칙 (변경 불가 제약)

PRD·브랜드와 충돌 시 **이 섹션이 이긴다.**

| ID | 원칙 | 구현 함의 |
|----|------|-----------|
| P1 | AI는 **거울**, 재판관·해석 확정자 아님 | 카피·reason에 하나님 뜻/소명/죄 확정 금지 |
| P2 | 성구는 **단일 구절 처방이 아니라 본문 재방문** | 범위(range) 권장, 한 절이면 문맥 안내 필수 |
| P3 | 모든 제안은 **사용자 기록 근거** | 기간 내 등장 ref 우선; 파싱 실패·근거 없는 ref 드롭 |
| P4 | 본문 제공은 **기존 합법 코퍼스/API만** | 카드에 장문 무단 인용 금지; passage API 범위 조회 |
| P5 | 오늘 홈은 **캐시 재사용만** | 방문마다 MiMo 호출 금지 |
| P6 | 연결이 약하면 **안 보여 준다** | 빈 섹션 숨김 > 억지 3개 |
| P7 | 클릭률 최적화로 톤을 희생하지 않는다 | “필요/추천/응답/하나님이 주시는” 카피 금지 |

### 허용 라벨 (고정 카피)

| 위치 | 제목 | 보조 한 줄 |
|------|------|------------|
| 회고 상세 | **다시 머물 본문** | 문맥 전체를 읽고, 해석은 확정하지 마세요. 기록과 닿아 보이는 본문입니다. |
| 오늘 홈 (회고 기반) | **다시 머물 수 있는 본문** | 최근 회고에서 이어진 말씀입니다. |
| 오늘 홈 (AI 없음 fallback) | **최근에 머문 본문** | 직접 기록에 남긴 성구입니다. |

### 금지 카피 (부분 일치도 금지)
- 추천 성구 / 오늘의 성구 / 지금 필요한 말씀  
- 하나님이 주시는 말씀 / 이 말씀이 답 / 이 구절을 붙드세요  
- 처방·신탁·예언·운세 뉘앙스 일체  

(기존 `mimo.ts` `FORBIDDEN` + 본 문서 전용 phrase scrub 확장)

---

## 3. 역할 분리

| 블록 | 역할 | 행동 |
|------|------|------|
| `scriptureConnections` | **과거 관찰** — 말씀과 삶이 어떻게 연결됐는지 | 읽기 중심, 기존 ObservationSection 유지 |
| `rereadScriptures` | **다음 행동** — 다시 읽고 머물 본문 | 본문 열기 · (선택) 이 본문으로 기록하기 |
| 최근 entry 성구 (today fallback) | **기억 재노출** — AI 판단 없음 | 본문 열기 · 기록 상세로 이동 |

두 블록이 같은 ref를 가져도 된다. 카피와 CTA로 역할을 구분한다.  
회고 페이지 권장 순서: … → 말씀과 삶의 연결 → … → 다시 읽어볼 기록 → **다시 머물 본문** → 작은 실천 …

---

## 4. 정보 구조

### 4.1 저장 형태 (회고 `structuredOutput` 내부)

기존 호환을 유지하면서 **정규화 단계에서 풍부화**한다.  
DB 컬럼 추가 없음. `ReviewReport.structuredOutput` JSON만 사용.

```ts
// 생성·정규화 후 권장 shape
type RereadScripture = {
  ref: string;           // display용, 가능하면 범위 (예: "시편 13:1-6")
  reason: string;        // 사용자 기록과 연결되는 이유 (1–2문장)
  // 아래는 v1 정규화기가 채울 수 있는 선택 필드 (없어도 UI 동작)
  slug?: string;         // bible toSlug 결과
  display?: string;      // toDisplay 결과
  startVerse?: number;
  endVerse?: number;
  evidenceEntryIds?: string[];
  openQuestion?: string; // 선택, 회고 상세에서만
};
```

**레거시 호환:** `{ ref, reason }` 만 있는 구 회고도 렌더 가능해야 한다.  
필드 없거나 배열 아님 → 섹션 전체 숨김.

### 4.2 정규화 파이프라인 (단일 진실 원천)

위치 권장: `src/lib/reread-scriptures.ts`  
호출 시점:

1. **생성 직후** — `generateReviewWithMimo` 반환 후, `reviewReport.create` 전 (`api/reviews` POST)
2. **읽기 시** — `/reviews/[id]`, `/today` 렌더 직전 (구 회고·미정규화 JSON 방어)

생성 시 정규화해 저장하고, 읽기 시 한 번 더 방어적으로 돌린다 (idempotent).

```
raw rereadScriptures
  → 배열 강제 · 최대 후보 N=8까지 스캔
  → ref/reason trim · 빈 값 제거
  → phrase scrub (FORBIDDEN + 성구 전용 금지 표현)
  → parseBibleReferences(ref) 성공 여부
  → (정책) 기간 내 사용자 scriptureRefs와 교집합 우선
  → slug/display 부착
  → 중복 slug 제거
  → max 3 (회고 저장) / max 2 (오늘 홈 슬라이스)
  → 실패 항목 드롭 (로그는 dev/console만, 사용자 노출 없음)
```

### 4.3 근거 정책 (v1 — 보수)

| 우선순위 | 소스 | 오늘 홈 | 회고 상세 |
|----------|------|---------|-----------|
| 1 | 기간 내 entry `scriptureRefs`에 **파싱 동등**한 ref | ✅ | ✅ |
| 2 | MiMo가 제안했으나 기간 기록에 없는 ref | ❌ 드롭 | ❌ v1 드롭* |

\*v1은 **환각·신탁 리스크**를 줄이기 위해 “기록에 한 번도 안 나온 본문” 신규 제안을 넣지 않는다.  
fallback 휴리스틱과 동일하게 **사용자 출현 본문 재방문**이 제품 약속이다.  
(v1.1에서 evidence+confidence 강화 후 신규 본문 제안 재검토)

**동등 비교:** `parse` 후 `code-chapter-start-end` 키. display 문자열 직접 비교 금지.

### 4.4 한 절 vs 범위

- 프롬프트: 가능하면 **절 범위 또는 짧은 단락** 권장.
- 파서가 한 절만 주면: UI에 “주변 문맥과 함께 읽어 보세요.” 고정 문구.
- passage 열기: 기존 slug/ref 그대로. v1에서 임의로 ±1절 확장하지 않음  
  (잘못된 장 경계 위험 > 자동 확장 이득).

---

## 5. UX 설계

### 5.1 회고 상세 `/reviews/[id]` — Primary

**배치:** `rereadEntries` 카드 다음, `smallPractices` 전.

**카드 내용 (항목당)**
- chip-gold: `display` (또는 `ref`)
- body: `reason` (scrub 후)
- 선택: `openQuestion` 한 줄 (있을 때만)
- 고정 미세 카피: 한 절이면 문맥 안내
- CTA
  - Primary text link: **본문 열기**  
    → 인페이지 확장 또는 `/api/bible/passage` 기반 프리뷰  
    → 권장: 기존 `ScripturePreviewCard` 패턴의 **서버 프리페치 + 접기/펼치기**  
    → 파싱 실패 시 CTA 숨김
  - Secondary: **이 본문으로 기록하기**  
    → `/entries/new?scripture=URL_ENCODED_DISPLAY`  
    → EntryForm이 쿼리를 읽어 bindings 시드 (본 WO 범위에 포함)

**빈 상태:** 섹션 미렌더 (플레이스홀더 문구 없음).

**접근성:** 리스트 시맨틱, CTA 최소 44px 터치, 본문 펼침 `aria-expanded`.

### 5.2 오늘 홈 `/today` — Secondary

**데이터**
```
latestReview?.structuredOutput
  → normalizeRereadScriptures(...)
  → slice(0, 2)
```
추가 MiMo 호출 없음. 기존 `latestReview` 쿼리 재사용.

**배치:** 히어로·주요 CTA 아래, **열린 결단**과 그리드 카드 사이 또는 그리드 하단.  
홈 과밀 방지: **최대 2카드**, 한 섹션.

**카드**
- eyebrow: 다시 머물 수 있는 본문
- 메타: `{reportType} 회고 · {periodEnd 또는 createdAt 상대/절대}`  
  예: `월간 회고 · 7월 기준`
- ref chip + reason 1줄 clamp
- CTA: 본문 보기(회고 상세 앵커 또는 프리뷰) / 회고 전체 보기

**Stale 정책**
| 조건 | 행동 |
|------|------|
| `latestReview` 없음 | 회고 기반 섹션 숨김 → fallback 검토 |
| 정규화 후 0개 | 동일 |
| `createdAt` 또는 `periodEnd`가 **90일 초과** | 섹션 숨김 (낡은 “지금” 암시 방지) |
| 그 외 | 최대 2개 표시 + 회고 시점 고지 |

**Fallback (AI 없음, 정직한 재노출)**  
회고 기반 섹션을 못 띄울 때만:

- 최근 entry 중 `scriptureRefs`/`scriptureBindings` 있는 것에서 최대 2개
- 라벨: **최근에 머문 본문** (회고 라벨과 반드시 분리)
- reason 자리에 기록 날짜·제목 한 줄
- 90일 이내 entry만

### 5.3 작성 진입 `/entries/new?scripture=`

- `scripture` 쿼리 1개(또는 반복 키) → `parseUserInput` → bindings 초기값 merge
- 실패 시 무시 + 폼은 정상 (에러 토스트 없어도 됨, 선택적 draftMessage)
- 자동 저장 draft와 충돌 시: **복구 draft 우선**, 쿼리는 draft 없을 때만 시드  
  (사용자 초안 보호)

### 5.4 명시적 비UI
- 작성 중 자동 추천 버튼 (v1.1+)
- dismiss/숨김 로컬 저장 (v1.1+)
- 푸시/이메일 “오늘의 본문”

---

## 6. AI · 프롬프트

### 6.1 변경 범위
`src/lib/mimo.ts` system/user schemaHint 보강.  
모델·엔드포인트 변경 없음. `promptVersion` → **`eobom-review-v1.1`** (회고 저장 시).

### 6.2 schemaHint 보강 (개념)

```json
"rereadScriptures": [
  {
    "ref": "시편 13:1-6",
    "reason": "사용자가 남긴 기록과 연결되는 이유 (판정·처방 금지)",
    "evidenceEntryIds": ["entry-id"],
    "openQuestion": "이 본문 앞에서 무엇이 남아 있나요?"
  }
]
```

### 6.3 system 추가 규칙 (요약)
- `rereadScriptures`는 **재방문 제안**이다. 처방·응답 단정 금지.
- ref는 입력 entries의 `scriptureRefs`에서 고르는 것을 원칙으로 한다.
- 가능하면 절 범위를 쓰고, reason은 기록 근거를 말한다.
- 최대 3개. 없으면 빈 배열.

### 6.4 fallback (`fallbackReview`)
현행 유지(기간 출현 성구 상위 3) + **동일 normalize 파이프라인** 통과.  
reason 기본문:  
`해당 기간 기록에 등장한 본문입니다. 문맥과 함께 다시 읽어볼 수 있습니다.`

---

## 7. API · 모듈 경계

| 모듈 | 책임 |
|------|------|
| `src/lib/reread-scriptures.ts` | normalize, filter by allowed refs, stale helpers, phrase scrub 확장 |
| `src/lib/mimo.ts` | 타입 확장(optional fields), 프롬프트, fallback reason 톤, generate 후 normalize 호출 가능 |
| `src/app/api/reviews/route.ts` | 저장 전 normalize, promptVersion bump |
| `src/app/reviews/[id]/page.tsx` | 섹션 UI + passage 프리뷰 |
| `src/app/today/page.tsx` | 캐시 카드 + fallback |
| `src/components/entry-form.tsx` | `scripture` 쿼리 시드 |
| `src/components/reread-scripture-card.tsx` (신규, 권장) | 회고/오늘 공유 카드 프레젠테이션 |

**신규 HTTP API 없음** (v1). passage는 기존 `/api/bible/passage` 사용.

---

## 8. 보안 · 신학 · 프라이버시

- 오늘 홈 reason은 **1줄 clamp** — 민감 회고 전문 노출 최소화.
- 원문 묵상 본문을 성구 카드에 붙이지 않음.
- scrub은 저장 전·표시 전 이중.
- 성구 CTA가 외부 성경 앱으로 나가지 않아도 됨 (내부 코퍼스).
- 저작권: 기존 Open Bibles 고지 유지 (`ScripturePreviewCard` sourceNote).

---

## 9. 빈 상태 · 오류 · 성능

| 상황 | 행동 |
|------|------|
| JSON 파싱 실패 | 페이지 기존 패턴 유지; 성구 섹션만 스킵 |
| passage fetch 실패 | 프리뷰 접힌 채 에러 한 줄, 카드·reason은 유지 |
| 정규화 0개 | 섹션 숨김 |
| 대량 회고 JSON | normalize O(n) n≤8 스캔, 이슈 없음 |
| 오늘 홈 | 추가 네트워크 없음 (SSR 시 passage 프리페치 시 최대 2회, 선택) |

오늘 홈 passage 프리페치: **선택**. v1 기본은 ref+reason+링크만으로도 충분.  
회고 상세에서만 펼침 시 fetch 또는 SSR 프리페치.

---

## 10. 지표 (북극성 아님 · 건강 지표)

 suc을 위한 클릭 유도 금지. 관찰만.

- 회고 상세에서 `rereadScriptures` 섹션 노출률 (정규화 후 >0)
- 본문 열기 / 이 본문으로 기록하기 클릭 (분석 인프라 있을 때)
- 해당 CTA 후 24h 내 entry 생성 비율
- scrub·drop 비율 (서버 로그) — 비정상 급증 시 프롬프트 회귀

---

## 11. 테스트 계획

| 층 | 내용 |
|----|------|
| 단위 | `normalizeRereadScriptures`: 빈 값, 금지 문구, parse 실패, 중복 slug, max 3, allowedRefs 필터, 한 절/범위 |
| 단위 | stale 판정 90일 경계 |
| 단위 | fallback reason이 금지 카피 미포함 |
| 컴포넌트/통합 (여유 시) | 회고 페이지 섹션 유무, today 0/1/2카드 |
| 수동 | MiMo 키 on/off, 구 회고 JSON, scripture 쿼리 시드 vs draft 우선 |

기존 `tests/bible.test.ts` 파서 케이스 재사용.  
신규 `tests/reread-scriptures.test.ts`.

---

## 12. 롤아웃

1. lib normalize + tests  
2. reviews POST 저장 경로 연결 + promptVersion  
3. 회고 상세 UI  
4. EntryForm 쿼리 시드  
5. 오늘 홈 카드 + fallback  
6. 카피·브랜드 대조 수동 패스  

피처 플래그 없이 진행 가능 (섹션 자동 숨김이 안전장치).  
문제 시 UI 섹션 제거만으로 롤백 가능, 저장된 JSON은 무해.

---

## 13. v1.1 후보 (지금 설계에 넣지 않음)

- 기록 밖 신규 본문 제안 (강한 evidence + 문맥 강제)
- 작성 폼 opt-in “연결 본문 살펴보기”
- 홈 카드 dismiss
- 한 절 → 장 단위 문맥 확장 헬퍼
- `rereadScriptures` evidence를 `ReviewEvidence` 테이블에 수집

---

## 14. 결정 로그

| 결정 | 선택 | 이유 |
|------|------|------|
| 기능 위치 | 회고 산출물 재사용 | AI 거울 정체성, 비용, PRD 정합 |
| 신규 본문 제안 | v1 제외 | 환각·처방 리스크 |
| 오늘 홈 소스 | latestReview 캐시 only | P5 |
| stale | 90일 | “지금” 암시 완화 |
| DB 변경 | 없음 | 속도·롤백 |
| 작성 폼 자동 추천 | 제외 | 작성 흐름·처방감 |
| 공유 컴포넌트 | 권장 | 회고/오늘 톤 일치 |

---

## 15. 수용 기준 (Definition of Done)

1. 새 회고 생성 시 `rereadScriptures`가 normalize되어 저장된다.  
2. 회고 상세에 **다시 머물 본문**이 조건부 노출되고, parse 가능한 항목만 본문/기록 CTA를 갖는다.  
3. 금지 카피·FORBIDDEN 패턴이 카드에 나타나지 않는다.  
4. 오늘 홈은 추가 AI 호출 없이 최대 2카드를 보여 주며, stale/빈 경우 숨기거나 fallback 라벨로만 보여 준다.  
5. `/entries/new?scripture=`가 draft 없을 때 바인딩을 시드한다.  
6. `tests/reread-scriptures.test.ts` 통과.  
7. `scriptureConnections`와 제목·역할이 시각적으로 구분된다.
