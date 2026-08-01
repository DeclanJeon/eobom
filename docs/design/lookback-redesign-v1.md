# 돌아보기 재설계 — 회고 중심 단일 흐름

| | |
|---|---|
| 문서 버전 | v1 |
| 작성일 | 2026-08-01 |
| 상태 | 초안 (작업지시서: [WO-2026-08-01-lookback-redesign](../work-orders/WO-2026-08-01-lookback-redesign.md)) |
| 관련 파일 | `src/components/lookback-tabs.tsx`, `src/app/lookback/page.tsx`, `src/app/reviews/page.tsx`, `src/app/reviews/[id]/page.tsx`, `src/app/story-mirror/page.tsx`, `src/app/story-mirror/visualize/page.tsx`, `src/components/visualization-card.tsx`, `src/components/review/review-simple-view.tsx`, `src/components/app-shell.tsx` |
| 선행 설계 | [review-page-redesign-v2.md](./review-page-redesign-v2.md) (회고 페이지 "한 편의 조용한 성찰 문서" 방향) |

## 0. 한 줄 요약

"돌아보기"의 4개 탭(흐름/회고/이야기/시각화)을 제거하고 **회고 중심 단일 흐름**으로 재설계한다. `/lookback`은 회고 목록이 되고, 회고 상세(`/lookback/[id]`)는 **회고글 + 연관 이야깃거리 + 시각화 이미지**를 한 화면에서 보여준다. 이야기·시각화는 상세에서 자연스럽게 이어지는 독립 페이지로 남는다.

## 1. 문제

### 1.1 현재 구조

`LookbackTabs`(4탭)가 4개 페이지에 마운트되어 있고, `/lookback`은 "흐름" 허브(3단계 카드: 1·회고 → 2·이야기 → 3·시각화)로 동작한다.

| 라우트 | 현재 역할 | 탭 |
|---|---|---|
| `/lookback` | 흐름 허브 (3단계 카드 + 최신 회고 미리보기) | 흐름 |
| `/reviews` | 회고 목록 | 회고 |
| `/reviews/[id]` | 회고 상세 (4블록: 요약/이야기/성구/동행자) | — |
| `/story-mirror` | 이야기 갤러리 | 이야기 |
| `/story-mirror/visualize` | 시각화 갤러리 | 시각화 |

### 1.2 결함

1. **흐름 개념이 실제 사용과 불일치 (HIGH)**
   - "1·회고 → 2·이야기 → 3·시각화"는 제품이 제안한 순서지만, 실제로는 회고가 먼저 존재하지 않아도 이야기/시각화가 생성된다. 흐름 탭의 3단계 카드는 사용자에게 "다음 단계를 강요하는" 듯한 인상을 준다.
   - 사용자가 원하는 것은 **회고가 중심**이고 이야기·시각화는 회고를 풍부하게 하는 보조 재료.

2. **회고 상세에서 시각화 이미지 부재 (HIGH)**
   - `/reviews/[id]`에는 시각화 이미지가 **인라인으로 없고** "이미지로 기억하기" 링크로만 `/story-mirror/visualize`에 연결된다.
   - 사용자 요구: 회고 클릭 시 **"회고글 + 연관 이야깃거리 + 회고를 시각화한 이미지"가 한 화면에** 보여야 하며, **이미지로 현재 상태를 한눈에** 확인해야 한다.

3. **탭 전환의 인지 비용 (MEDIUM)**
   - 회고 → 이야기 → 시각화를 보려면 탭을 2~3번 전환해야 한다. "한눈에" 요구와 정면 배치.
   - 모바일에서 탭 4개 + 하단 내비게이션(돌아보기)이 이중으로 페이지 개념을 중복 제시.

4. **이야기·시각화 갤러리의 존재감 (MEDIUM)**
   - `/story-mirror`, `/story-mirror/visualize`는 탭 없이도 유용하지만, 회고 상세와의 연결이 링크 1개에 그쳐 "보조 자료"로 인식되지 않는다.

## 2. 목표 / 비목표

### 목표 (In Scope)

- [G1] **탭 제거**: `LookbackTabs` 삭제. `돌아보기` = 회고 중심.
- [G2] `/lookback`을 **회고 목록 페이지**로 전환 (기존 `/reviews` 역할 흡수). 최신 회고 1건은 "지금의 회고"로 강조.
- [G3] 회고 상세(`/lookback/[id]`)에서 **회고글 + 이야깃거리 + 시각화 이미지를 한 화면에** 표시:
  - 상단: 회고 본문 (기존 4블록 유지)
  - 중단: **연관 이야깃거리** (기존 `ReviewSimpleView`의 이야기 블록 유지 + "이야기 더 보기" 링크)
  - 하단: **시각화 이미지** (fresh/stale 상태 + 재생성 버튼 + "크게 보기" 링크) — "현재 상태 한눈에"
- [G4] 라우트 정리: `/reviews`, `/reviews/[id]` → `/lookback`, `/lookback/[id]`로 이동, 구주소는 301 리다이렉트.
- [G5] AppShell 내비게이션·`isActive` 매칭 정리 (기존 `/reviews`, `/story-mirror` 매칭 유지).

### 비목표 (Out of Scope)

- 회고 본문 편집/생성 플로우 변경 (`/reviews/new` 유지).
- 이야기·시각화의 생성 로직/데이터 모델 변경 (RAG, visualization 파이프라인 그대로).
- 회고별(period별) 개별 시각화 생성 — 현재는 사용자당 최신 시각화 1개 모델 유지, 회고 상세에서는 "가장 최근 시각화"를 "현재 상태"로 표시.
- 4블록 회고 페이지의 콘텐츠 구조 변경 (review-page-redesign-v2 방향 유지).

## 3. 원칙

| 원칙 | 내용 |
|---|---|
| 회고 중심 | 회고가 항상 첫 화면의 주인공. 이야기·시각화는 회고의 보조 재료. |
| 한 화면 완결 | 회고 상세는 스크롤 1번으로 본문→이야기→이미지를 모두 소화한다. |
| 최소 라우트 파괴 | 기존 링크(북마크, 검색 노출)는 301 리다이렉트로 보존. |
| 재사용 | `VisualizationCard`, `ReviewSimpleView`, `SurfaceCard` 등 기존 컴포넌트를 조립만 한다. |
| 무단계 | "1·2·3 단계" 프레임 제거 — 사용자의 현재 위치를 강요하지 않는다. |

## 4. 상세 설계

### 4.1 새 라우트 구조

| 라우트 | 역할 | 변경 |
|---|---|---|
| `/lookback` | **회고 목록** (기존 `/reviews` 흡수) | 개편 |
| `/lookback/[id]` | **회고 상세** (회고글 + 이야기 + 시각화 이미지) | 이동 + 확장 |
| `/story-mirror` | 이야기 갤러리 (탭 없음, 독립) | 탭 제거만 |
| `/story-mirror/visualize` | 시각화 갤러리 (탭 없음, 독립) | 탭 제거만 |
| `/reviews` | → `/lookback` 301 | 리다이렉트 |
| `/reviews/[id]` | → `/lookback/[id]` 301 | 리다이렉트 |
| `/reviews/new` | 회고 생성 | 유지 (기존 경로) |

- **리다이렉트 구현**: `src/app/reviews/page.tsx`를 제거하고 `src/app/reviews/redirect.ts`… 대신 Next.js 16 관례에 따라 `src/app/reviews/page.tsx` = `redirect("/lookback")`, `src/app/reviews/[id]/page.tsx` = `redirect(`/lookback/${id}`)`. (라우트 그룹/리다이렉트 파일 컨벤션은 구현 시 팀 컨벤션에 따름.)
- 기존 `/reviews/[id]` 링크를 가진 호출처 전수 수정: 홈, `/me`, `/lookback`(구 허브), 알림 등. `grep -rn "reviews/"` 로 소스 전수 확인.

### 4.2 `/lookback` — 회고 목록 페이지

```
[돌아보기 eyebrow]
기록이 남긴 흐름을 다시 봅니다        ← 기존 헤더 유지
(부제) 회고로 주제를 발견하고, 이야기와 이미지로 기억합니다.

[회고 생성하기] [AI 동의 설정(미동의 시)]     ← 기존 /reviews 헤더 CTA

── 지금의 회고 ─────────────────────────
  [최신 회고 카드 — 전체 폭]
   · reportType 배지 · 기간
   · summary 본문 (line-clamp-4)
   · "회고 보기 →"

── 지난 회고 ──────────────────────────
  [회고 카드 그리드 sm:2 / lg:3]          ← 기존 /reviews 그리드 재사용
   · reportType 배지 · 기간 · summary line-clamp-3

(회고 0건) EmptyState — "기록이 3개 이상 쌓이면 회고를 만들 수 있습니다."
```

- "지금의 회고" = `findFirst(orderBy: { createdAt: "desc" })`. 이 카드에 **최신 시각화 이미지 썸네일**(있으면)을 우측에 배치해 "현재 상태 한눈에"를 목록에서도 충족.
- `metadata.title = "돌아보기"`.

### 4.3 `/lookback/[id]` — 회고 상세 (핵심 변경)

기존 `/reviews/[id]`의 4블록 구조 위에 **시각화 이미지 섹션**을 추가한다.

```
[돌아보기 ← back link]

ReviewDetailHeader (기존)   ← 회고 종류·기간·생성일

── 1. 회고 ────────────────────────────
  ReviewSimpleView (기존 4블록)          ← 요약/이야기/성구/동행자

── 2. 이야깃거리 ───────────────────────
  (ReviewSimpleView의 이야기 블록과 중복 방지:
   본문 블록은 유지하고, 하단에 별도 섹션 대신
   "이야기 더 보기 → /story-mirror" 링크 1개)

── 3. 지금의 모습 (시각화) ───────────────
  VisualizationCard (기존 컴포넌트 재사용)
   · kind="summary"
   · initial = 가장 최근 UserVisualization (imageUrl 있으면)
   · freshness: none → 생성 CTA / fresh → 이미지 / stale → "기록이 달라졌어요" + 다시 그리기
   · 해설(synthesis) · AI 한계 안내 (기존 카드 내장)
   · "크게 보기 → /story-mirror/visualize"

── 4. 회고 더 만들기 ─────────────────────
  [새 회고 작성] [다른 회고 목록]
```

**시각화 조회 로직** (`/lookback/[id]` 서버 컴포넌트):

```ts
const viz = await db.userVisualization.findFirst({
  where: { userId: user.id, kind: "summary", imageUrl: { not: null } },
  orderBy: { updatedAt: "desc" },
});
```

- 회고별 시각화가 아니라 **사용자 최신 시각화**를 "지금의 모습"으로 표시 (G3·비목표에 명시한 모델 유지).
- `visualization-card.tsx`는 클라이언트 컴포넌트라 `initial` prop으로 서버에서 조회한 결과를 넘긴다 (기존 `/story-mirror/visualize`의 사용법과 동일).
- freshness 판정은 기존 `computeVisualizationFingerprint` / `deriveVisualizationFreshness` 재사용.

### 4.4 `/story-mirror`, `/story-mirror/visualize` — 탭 제거

- 두 페이지에서 `<LookbackTabs>` 렌더링 제거.
- 페이지 상단에 간단한 breadcrumb("돌아보기 → 이야기") 추가로 컨텍스트 유지.
- `/story-mirror/visualize`의 기존 시각화 카드 + 생성 UI 유지 (회고 상세의 "크게 보기" 목적지).

### 4.5 `LookbackTabs` 삭제

- `src/components/lookback-tabs.tsx` 삭제.
- 호출처 4곳(이상) 제거: `/lookback`, `/reviews`, `/story-mirror`, `/story-mirror/visualize`.
- `grep -rn "LookbackTabs" src/` 로 전수 확인 후 삭제.

### 4.6 AppShell 내비게이션 정리

- `isActive(pathname, "/lookback")`: `/lookback` + `/lookback/` + `/reviews`(레거시) + `/story-mirror` 매칭 유지 — 기존 로직 그대로 동작.
- 데스크톱/모바일 내비 항목 라벨·href 변경 없음 ("돌아보기" → `/lookback`).

### 4.7 metadata / robots

- `robots.ts`: `/lookback`에 disallow 추가 (기존 `/reviews`, `/story-mirror`와 동일). `/lookback/*` 상세도 동일.
- 구 `/reviews` 주소는 301이므로 검색엔진이 새 주소로 갱신.

## 5. 작업 분해 (요약)

전체 작업지시서는 [WO-2026-08-01-lookback-redesign](../work-orders/WO-2026-08-01-lookback-redesign.md) 참조.

| # | 작업 | 영향 파일 |
|---|---|---|
| T1 | `/lookback` 회고 목록 개편 (최신 회고 강조 + 그리드) | `src/app/lookback/page.tsx` |
| T2 | 회고 상세 이동 + 시각화 섹션 추가 | `src/app/reviews/[id]/page.tsx` → `src/app/lookback/[id]/page.tsx` |
| T3 | `/reviews`, `/reviews/[id]` 301 리다이렉트 | `src/app/reviews/` |
| T4 | `/reviews` 링크 호출처 전수 수정 | `grep -rn` 결과 |
| T5 | `LookbackTabs` 삭제 + 4개 페이지 탭 제거 | `src/components/lookback-tabs.tsx`, story-mirror 2페이지 |
| T6 | story-mirror 2페이지 breadcrumb | `src/app/story-mirror/page.tsx`, `visualize/page.tsx` |
| T7 | robots disallow `/lookback` | `src/app/robots.ts` |
| T8 | 테스트·스모크 (링크 흐름, 301, 시각화 렌더) | 관련 테스트 |

## 6. 정의된 완료 (DoD)

- [ ] `LookbackTabs` 컴포넌트와 호출처가 모두 삭제되었다.
- [ ] `/lookback`에서 회고 목록이 보이고, "지금의 회고"에 최신 시각화 썸네일(있으면)이 표시된다.
- [ ] `/lookback/[id]`에서 회고 본문 → 이야깃거리 → 시각화 이미지(fresh/stale/재생성)가 한 화면에 표시된다.
- [ ] `/reviews`·`/reviews/[id]` 방문 시 301로 `/lookback` 계열로 이동한다.
- [ ] `/story-mirror`, `/story-mirror/visualize`에서 탭이 제거되고 breadcrumb가 보인다.
- [ ] AppShell의 "돌아보기"가 모든 하위 페이지에서 활성 상태로 표시된다.
- [ ] `robots.ts`에 `/lookback` disallow가 추가되었다.
- [ ] `npx tsc --noEmit` 통과, 기존 테스트 통과.
- [ ] 브라우저에서 실제 클릭 흐름(목록 → 상세 → 이미지 → 이야기 → 시각화) 스모크 완료.

## 7. 미결정 사항

1. 회고 상세의 시각화 섹션 위치 — 본문 뒤(현재 계획) vs 본문 앞. "이미지로 현재 상태 한눈에"를 중시하면 본문 앞도 고려. (기본: 본문 뒤, 추후 사용자 피드백으로 조정)
2. 회고별 개별 시각화(period 정합) — 데이터 모델 변경 필요. 다음 스프린트 후보로 기록만.
3. "지금의 회고" 썸네일 크기·비율 — 구현 시 시각 확인 후 조정.
