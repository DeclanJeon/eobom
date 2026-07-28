# 작업지시서: 다시 머물 본문 (Reread Scriptures) v1

| 항목 | 내용 |
|------|------|
| ID | **WO-2026-07-28-reread-scriptures** |
| 작성일 | 2026-07-28 |
| 상태 | **Ready for implementation** |
| 설계 원본 | `docs/design/reread-scriptures-v1.md` |
| 우선순위 | P1 (회고 상세) → P2 (오늘 홈) → P1.5 (작성 시드, P1 CTA 의존) |
| 예상 범위 | 소–중 (신규 API·DB 마이그레이션 없음) |
| 담당 | 구현 에이전트 / 개발자 |

---

## 1. 목표

사용자가 AI 회고와 오늘 홈에서 **기록에 이미 등장한 본문**을  
처방 없이 **다시 머물 대상**으로 만나고, 본문을 열거나 새 기록으로 이어갈 수 있게 한다.

## 2. 범위

### In
- `rereadScriptures` 정규화 라이브러리 + 단위 테스트
- 회고 생성 저장 경로 연결 (`promptVersion` bump)
- MiMo 프롬프트/fallback 톤 보강
- 회고 상세 UI 섹션
- 오늘 홈 캐시 카드 + 최근 성구 fallback
- `/entries/new?scripture=` 시드
- (권장) 공유 카드 컴포넌트

### Out
- 작성 폼 자동 추천, 감정→성구 맵, 실시간 suggest API
- DB 스키마 변경, 구 회고 일괄 재생성
- 분석 이벤트 파이프 구축 (로그 레벨만)
- 한 절 자동 장 확장

## 3. 의존성 · 사전 조건

- 기존: `src/lib/mimo.ts` `rereadScriptures`, `src/lib/bible/*`, `/api/bible/passage`
- 설계 문서 DoD·카피 고정문 준수
- 브랜드: `docs/brand-message.md` (AI=거울)

## 4. 작업 분해 (순서 고정)

### Step A — 정규화 라이브러리 (차단 없음)

**생성:** `src/lib/reread-scriptures.ts`

구현 함수 (이름 동일 권장):

```ts
export type RereadScripture = {
  ref: string;
  reason: string;
  slug?: string;
  display?: string;
  startVerse?: number;
  endVerse?: number;
  evidenceEntryIds?: string[];
  openQuestion?: string;
};

export type NormalizeRereadOptions = {
  allowedRefs?: string[];     // entry scriptureRefs display 또는 raw
  max?: number;               // default 3
  now?: Date;                 // stale 테스트용
};

export function normalizeRereadScriptures(
  input: unknown,
  options?: NormalizeRereadOptions,
): RereadScripture[];

export function isReviewStaleForHome(
  report: { createdAt: Date; periodEnd: Date },
  now?: Date,
  maxAgeDays?: number,        // default 90
): boolean;

export function pickRecentScriptureFallback(
  entries: Array<{
    id: string;
    entryDate: Date;
    title?: string | null;
    scriptureRefs: string[];
  }>,
  options?: { max?: number; now?: Date; maxAgeDays?: number },
): Array<{ ref: string; reason: string; slug?: string; display?: string; entryId: string }>;
```

**규칙 (설계 §4.2–4.3 준수):**
1. non-array → `[]`
2. 각 항목 `ref`/`reason` string trim, 비면 drop
3. reason에 기존 `FORBIDDEN` 및 아래 추가 패턴 scrub 또는 drop  
   - `/추천\s*성구/i`, `/오늘의\s*성구/i`, `/지금\s*필요한\s*말씀/i`  
   - `/하나님이\s*주시는/i`, `/이\s*말씀이\s*답/i`, `/이\s*구절을\s*붙/i`
4. `parseBibleReferences(ref)[0]` 실패 → drop
5. `allowedRefs` 있으면 parse 키 교집합만 통과 (없으면 parse 성공만)
6. slug/display/`startVerse`/`endVerse` 부착 (`toSlug`/`toDisplay`/`toBinding` 활용)
7. slug 기준 중복 제거, `max` 슬라이스
8. `openQuestion`·`evidenceEntryIds`는 있으면 정제 후 유지 (없어도 OK)

**테스트:** `tests/reread-scriptures.test.ts`  
최소 케이스:
- 빈/깨진 입력
- parse 실패 drop
- allowedRefs 필터
- 중복 제거 + max
- 금지 문구 scrub/drop
- stale 89일/90일/91일 경계
- fallback 최근 성구·나이 필터

**완료 조건:** `bun test tests/reread-scriptures.test.ts` 통과

---

### Step B — 회고 생성 파이프라인

**수정:** `src/lib/mimo.ts`
- `StructuredReview.rereadScriptures` 타입을 `RereadScripture`와 호환되게 확장 (optional 필드)
- system 프롬프트에 설계 §6.3 규칙 요약 추가
- schemaHint의 `rereadScriptures` 형태 보강
- fallback reason을 설계 §6.4 문구로 조정 (처방 톤 제거)

**수정:** `src/app/api/reviews/route.ts`
- `generateReviewWithMimo` 직후:

```ts
const allowed = mapped.flatMap((e) => e.scriptureRefs);
review.rereadScriptures = normalizeRereadScriptures(review.rereadScriptures, {
  allowedRefs: allowed,
  max: 3,
});
```

- `promptVersion`: `"eobom-review-v1.1"`

**완료 조건:** 타입 체크 통과; 저장 JSON의 rereadScriptures가 항상 normalize된 형태

---

### Step C — 회고 상세 UI

**수정:** `src/app/reviews/[id]/page.tsx`  
**권장 신규:** `src/components/reread-scripture-list.tsx` (서버 컴포넌트 가능)

- `structuredOutput` parse 후 `normalizeRereadScriptures(review.rereadScriptures, { max: 3 })`  
  (구 회고 방어; allowedRefs 없이도 parse 성공 분 표시 — 이미 저장된 것은 사용자 본문 재방문일 확률 높음.  
  더 보수적으로 가려면 report의 included entries를 읽어 allowedRefs 재적용 가능. **v1 권장: included entries refetch 후 allowed 재적용**)
- `rereadEntries` 다음 섹션:

```
제목: 다시 머물 본문
보조: 문맥 전체를 읽고, 해석은 확정하지 마세요. 기록과 닿아 보이는 본문입니다.
```

- 항목: gold chip `display||ref`, reason, optional openQuestion  
- 한 절(`startVerse === endVerse`)이면 문맥 안내 한 줄
- CTA:
  - 본문 열기: slug로 passage 조회 후 펼침 프리뷰 (기존 preview 카드 스타일 재사용)  
    또는 최소한 접힌 영역에 fetch. 실패 시 에러 문구만.
  - 이 본문으로 기록하기 → `/entries/new?scripture=${encodeURIComponent(display||ref)}`
- `scriptureConnections` 제목 유지 (**말씀과 삶의 연결**). 역할 혼동 카피 넣지 말 것.

**완료 조건:** reread 0개면 DOM에 섹션 없음; 1개 이상이면 CTA 동작

---

### Step D — EntryForm 쿼리 시드

**수정:** `src/components/entry-form.tsx`  
**필요 시:** `src/app/entries/new/page.tsx`에서 searchParams 전달

동작:
1. `scripture` 쿼리 읽기 (단일 string)
2. 로컬 draft 복구 **후** 판단: draft에 bindings/본문 등 실질 내용 있으면 쿼리 무시
3. draft 없을 때만 `parseUserInput` / passage API와 동일 경로로 binding 추가 (`addBindings`)
4. 실패 시 silent ignore

**완료 조건:** draft 없는 상태에서 `?scripture=요한복음%203:16` 진입 시 성구 칩 또는 프리뷰 표시

---

### Step E — 오늘 홈

**수정:** `src/app/today/page.tsx`

1. `latestReview` 존재 & `!isReviewStaleForHome(latestReview)`  
2. `normalizeRereadScriptures(JSON.parse(...).rereadScriptures, { max: 2 })`  
3. length>0 → 섹션 **다시 머물 수 있는 본문**  
   - 메타: reportType + 기간/생성 시점  
   - 카드 2개, reason line-clamp-2  
   - 링크: `/reviews/${id}` (상세) 및 기록 CTA optional  
4. 아니면 `pickRecentScriptureFallback(recent entries with refs)`  
   - 섹션 **최근에 머문 본문**  
5. 둘 다 비면 섹션 없음  
6. **MiMo/fetch 회고 생성 호출 추가 금지**

배치: 열린 결단 섹션과 메인 그리드 사이 권장. 홈 과밀 시 그리드 하단 허용.

**완료 조건:** 네트워크 탭 기준 오늘 페이지 로드에 chat/completions 없음

---

### Step F — 문서·마감

- 설계 문서 상태 줄을 구현 완료 후 `구현 반영`으로 업데이트하지 말고, WO 체크리스트만 갱신
- README 기능 목록에 한 줄 추가 **선택** (필수 아님)
- 금지: 사용자 미요청 md 난립

---

## 5. 카피 체크리스트 (머지 전 수동)

- [ ] “추천 성구” “오늘의 성구” “필요한 말씀” 문자열 코드베이스 검색 0건 (이번 변경분)
- [ ] 회고 섹션 제목 = **다시 머물 본문**
- [ ] 오늘 회고 기반 = **다시 머물 수 있는 본문**
- [ ] 오늘 fallback = **최근에 머문 본문**
- [ ] disclaimer 기존 문장 유지·훼손 없음

## 6. 검증 명령

```bash
bun test tests/reread-scriptures.test.ts
bun test tests/bible.test.ts
# 프로젝트 관례에 따라
bun test
```

수동:
1. 성구 포함 기록 ≥ min 개수로 월간 회고 생성 → 상세에 섹션 노출
2. 성구 없는 기록만으로 회고(가능 시) → 섹션 숨김
3. 오늘 홈: 최신 회고 있을 때 카드 ≤2, AI 호출 없음
4. 회고 삭제/없는 유저: fallback 또는 숨김, 에러 없음
5. `이 본문으로 기록하기` → 폼에 성구 시드
6. draft 있는 상태로 쿼리 진입 → draft 유지

## 7. 수용 기준 (설계 §15와 동일)

1. 신규 회고 저장 시 rereadScriptures normalize  
2. 회고 UI 조건부 노출 + parse 가능 CTA  
3. 금지 카피 미노출  
4. 오늘 홈 캐시 only, max 2, stale/fallback 정책  
5. scripture 쿼리 시드 (draft 우선)  
6. 단위 테스트 통과  
7. scriptureConnections와 역할 구분  

## 8. 리스크 · 롤백

| 리스크 | 완화 | 롤백 |
|--------|------|------|
| MiMo 환각 ref | allowedRefs 필터 | UI 섹션 제거 |
| 홈 과밀 | max 2, stale 90d | today 블록 삭제 |
| draft vs 쿼리 | draft 우선 | 쿼리 시드 코드 제거 |
| passage 실패 | CTA/프리뷰만 실패 처리 | 프리뷰 없이 ref 텍스트만 |

DB 롤백 불필요. 잘못된 JSON도 읽기 normalize가 방어.

## 9. 구현 시 코딩 규약

- 기존 패턴 재사용: `SurfaceCard`, `chip-gold`, `SoftBadge`, `AppShell`, bible helpers
- 새 추상화 최소화; 공유 카드 1개까지
- stub/fake AI 응답 UI 금지
- 테스트 suppress 금지
- 한국어 UI 카피는 설계 고정문 그대로

## 10. 완료 보고 형식

구현 에이전트는 끝날 때:

```
## WO-2026-07-28 완료 보고
- 변경 파일:
- 테스트:
- 수동 검증:
- 남은 리스크 / 의도적 Out:
```

---

## 11. 체크리스트 (실행용)

- [ ] A. `src/lib/reread-scriptures.ts` + tests  
- [ ] B. mimo + reviews POST normalize + promptVersion  
- [ ] C. reviews/[id] UI  
- [ ] D. entry new scripture query  
- [ ] E. today home cards  
- [ ] F. 카피 검색 · bun test · 수동 시나리오  
- [ ] 완료 보고
