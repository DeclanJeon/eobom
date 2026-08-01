# 작업지시서: 돌아보기 재설계 (회고 중심 단일 흐름) v1

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-08-01 |
| 설계 | `docs/design/lookback-redesign-v1.md` |
| 상태 | 진행 전 |

---

## 1. 목표

돌아보기의 4개 탭(흐름/회고/이야기/시각화)을 제거하고 **회고 중심 단일 흐름**으로 재설계한다.

- `/lookback` = 회고 목록 (기존 `/reviews` 역할 흡수)
- 회고 상세 = **회고글 + 연관 이야깃거리 + 시각화 이미지** 한 화면
- `/reviews`, `/reviews/[id]`는 `/lookback` 계열로 301 이동

## 2. 범위

### In
- `/lookback` 회고 목록 개편 (최신 회고 강조 + 그리드)
- `/lookback/[id]` 회고 상세 (시각화 섹션 추가)
- `/reviews`, `/reviews/[id]` 301 리다이렉트
- `/reviews` 링크 호출처 전수 수정
- `LookbackTabs` 삭제 (호출처 4곳)
- story-mirror 2페이지 breadcrumb
- robots disallow `/lookback`
- 테스트·스모크

### Out
- 회고 생성/편집 플로우 변경 (`/reviews/new` 유지)
- RAG/시각화 파이프라인 변경
- 회고별 개별 시각화 (다음 스프린트)
- 4블록 회고 페이지 콘텐츠 구조 변경

---

## 3. 작업 분해

### T1. `/lookback` 회고 목록 개편
**파일:** `src/app/lookback/page.tsx`

- "흐름 허브"(3단계 카드) 제거 → 회고 목록 페이지로 전환
- "지금의 회고" 최신 1건 전체 폭 카드 (시각화 썸네일 있으면 우측 배치)
- "지난 회고" 그리드 (기존 `/reviews` 그리드 로직 이동)
- CTA: 회고 생성하기 + (미동의 시) AI 동의 설정
- EmptyState: "기록이 3개 이상 쌓이면 회고를 만들 수 있습니다"
- `metadata.title = "돌아보기"`

### T2. 회고 상세 이동 + 시각화 섹션
**파일:** `src/app/lookback/[id]/page.tsx` (신규, `src/app/reviews/[id]/page.tsx` 내용 이동)

- 기존 `ReviewDetailHeader` + `ReviewSimpleView` 유지
- 하단에 "지금의 모습" 섹션: `VisualizationCard` (kind="summary", 최신 UserVisualization, freshness 재사용)
- "이야기 더 보기 → /story-mirror", "크게 보기 → /story-mirror/visualize" 링크
- "새 회고 작성" + "다른 회고 목록" 링크
- `metadata`: `/lookback/[id]` 기준 타이틀

### T3. `/reviews` 리다이렉트
**파일:** `src/app/reviews/page.tsx`, `src/app/reviews/[id]/page.tsx`

- `redirect("/lookback")` / `redirect(`/lookback/${id}`)` (301)
- `/reviews/new`은 유지 (회고 생성)

### T4. `/reviews` 링크 호출처 수정
**파일:** 전수 grep 후

- `grep -rn '"/reviews' src/` 및 `href={`/reviews/...`}` 패턴 전수 확인
- 홈, `/me`, 기타 컴포넌트의 링크를 `/lookback` 계열로 교체
- 리다이렉트가 있으므로 누락 1~2건은 동작상 문제 없음 (우선순위 낮음)

### T5. `LookbackTabs` 삭제
**파일:** `src/components/lookback-tabs.tsx` (삭제)

- 호출처 제거: `/lookback`, `/reviews`(삭제 대상), `/story-mirror`, `/story-mirror/visualize`
- `grep -rn "LookbackTabs" src/` 0건 확인

### T6. story-mirror breadcrumb
**파일:** `src/app/story-mirror/page.tsx`, `src/app/story-mirror/visualize/page.tsx`

- 탭 제거 + "돌아보기 → 이야기" breadcrumb
- 나머지 UI 유지

### T7. robots disallow
**파일:** `src/app/robots.ts`

- `/lookback`, `/lookback/*` disallow 추가

### T8. 테스트·스모크
**파일:** 관련 테스트 + 브라우저

- 301 리다이렉트 동작
- 목록 → 상세 클릭 흐름
- 시각화 이미지 렌더 (fresh/stale/없음 3케이스)

---

## 4. 수용 기준

1. `/lookback` 방문 시 탭 없이 회고 목록이 보인다
2. "지금의 회고" 카드에 최신 시각화 썸네일(있으면)이 표시된다
3. `/lookback/[id]`에서 본문 → 이야기 → 시각화 이미지가 한 화면에서 스크롤로 확인된다
4. `/reviews`, `/reviews/[id]` → 301 리다이렉트
5. `LookbackTabs` import 0건
6. story-mirror 페이지에 breadcrumb
7. robots에 `/lookback` disallow
8. `tsc --noEmit` + 기존 테스트 통과

---

## 5. 구현 노트

- `VisualizationCard`는 클라이언트 컴포넌트 → 서버 컴포넌트에서 `initial` prop으로 조회 결과 전달 (기존 `/story-mirror/visualize` 사용법 재사용)
- freshness 판정: `computeVisualizationFingerprint` + `deriveVisualizationFreshness` 그대로
- `/lookback`에서 "지금의 회고" 썸네일은 `next/image` 사용, 이미지 없으면 숨김
- 기존 `/reviews/[id]`의 테스트가 있다면 `/lookback/[id]`로 경로만 변경
- AppShell `isActive`는 변경 불필요 (`/lookback` + `/story-mirror` 매칭 이미 존재)

---

## 6. DoD 체크

- [ ] 설계 문서 존재 (`docs/design/lookback-redesign-v1.md`)
- [ ] 본 WO 존재
- [ ] `LookbackTabs` 삭제 + import 0건
- [ ] `/lookback` 회고 목록 동작
- [ ] `/lookback/[id]` 시각화 섹션 동작 (3케이스)
- [ ] 301 리다이렉트 동작
- [ ] story-mirror breadcrumb
- [ ] robots disallow
- [ ] tsc clean
- [ ] 브라우저 스모크 완료
