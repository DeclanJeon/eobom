# WO-2026-08-02 UI/UX Design Consolidation

> Design: `docs/design/ui-ux-consolidation-v1.md`
> Priority: HIGH (사용자 데이터 손실 + 접근성 결함 포함)
> Estimated stories: 6

## Stories

### S1 폼 탄력성 + 에러 상태 수정 (CRITICAL)

**Target files:**
- `src/components/entry-form.tsx`
- `src/components/settings-form.tsx`
- `src/components/review-create-form.tsx`
- `src/components/contact-form.tsx`
- `src/components/share-form.tsx`
- `src/components/delete-entry-button.tsx`

**Changes:**
1. 6개 submit 핸들러에 `try/catch/finally` 추가 — `setSubmitting(false)`를 finally 블록으로 이동
2. `settings-form.tsx:89` 에러 메시지를 `text-destructive` + `role="alert"`로 변경
3. `entry-form.tsx` disabled 저장 버튼에 이유 힌트 추가 ("본문을 작성하면 저장할 수 있어요")
4. `share-form.tsx` char counter 20자 임계값에서 색상 변경
5. `together-actions.tsx:43` 실패 시 에러 토스트/인라인 메시지 표시
6. `delete-entry-button.tsx` native `window.confirm` → 커스텀 확인 다이얼로그 또는 최소한 실패 피드백 추가

**Acceptance:** 네트워크 오류 시 모든 폼의 저장 버튼이 복구됨. 에러/성공 메시지가 시각적으로 구분됨.

### S2 버튼 시스템 + globals.css 보강 (HIGH)

**Target files:**
- `src/app/globals.css`
- `src/components/entry-form.tsx` (hand-rolled button 제거)
- `src/components/scripture/scripture-quick-input.tsx` (hand-rolled button 제거)
- `src/components/app-shell.tsx` (hand-rolled button 제거)
- `src/components/share-form.tsx` (disabled opacity override 제거)
- `src/components/login-button.tsx` (disabled opacity override 제거)
- `src/components/owner-login-prompt.tsx` (disabled opacity override 제거)
- `src/components/together-actions.tsx` (disabled opacity override 제거)
- `src/components/open-action-card.tsx` (disabled opacity override 제거)
- `src/components/story-mirror-feedback.tsx` (disabled opacity override 제거)

**Changes:**
1. `globals.css` cta-primary에 `:hover:not(:disabled)` 규칙 추가 (background shift + subtle shadow)
2. `globals.css` cta-secondary에 `:hover:not(:disabled)` 규칙 추가 (border-color + background shift)
3. `globals.css` disabled opacity를 0.5로 통일
4. 5곳 hand-rolled primary 버튼을 `cta-primary` 클래스로 교체
5. 모든 inline `disabled:opacity-*` 제거
6. active-scale를 `scale-[0.98]`로 통일 (`scale-95`, `scale-[0.99]` 제거)

**Acceptance:** 데스크톱에서 모든 cta-primary/cta-secondary 버튼에 hover 피드백 표시. disabled 상태 시각적 일관.

### S3 터치 타겟 + 접근성 수정 (HIGH)

**Target files:**
- `src/components/settings-form.tsx`
- `src/components/scripture/scripture-chip-list.tsx`
- `src/components/together-actions.tsx`
- `src/components/observation-feedback.tsx`
- `src/components/story-mirror-feedback.tsx`
- `src/components/share-form.tsx`
- `src/components/review/review-section-nav.tsx`
- `src/components/delete-entry-button.tsx`
- `src/components/app-shell.tsx`
- `src/components/scripture/scripture-picker.tsx`
- `src/components/entry-form.tsx`
- `src/components/story-mirror-rag.tsx`
- `src/components/story-narrative-card.tsx`
- `src/components/ui/sheet.tsx`

**Changes:**
1. 12개 sub-44px 요소를 `min-h-11` (44px) 이상으로 확대
2. scripture-picker hand-rolled modal → Radix Sheet 교체 (role="dialog", aria-modal, focus trap, Escape, scroll lock, 전환 애니메이션 자동 획득)
3. entry-form optionalBlock toggle에 `aria-expanded` 추가
4. `sheet.tsx:77` sr-only "Close" → "닫기"
5. observation-feedback focus ring 색상을 라이브러리 표준(gold/30)으로 통일

**Acceptance:** 모든 인터랙티브 요소 44px 이상. scripture-picker가 키보드/스크린리더에서 정상 동작.

### S4 시각적 일관성 + Dead Code 정리 (MEDIUM)

**Target files:**
- `src/app/globals.css`
- `src/components/StoryVisual.tsx`
- `src/components/landing-hero.tsx`
- `src/components/story-narrative-card.tsx`
- `src/components/visualization-fallback.tsx`
- `src/components/contact-form.tsx`
- `src/components/share-form.tsx`
- `src/components/story-mirror-rag.tsx`
- `src/components/ui/toast.tsx` (삭제)
- `src/components/ui/toaster.tsx` (삭제)
- `src/hooks/use-toast.ts` (삭제)
- `src/app/layout.tsx` (toast import 제거)

**Changes:**
1. border-color 3별칭 → `border-border` 단일화 (`border-line`, `border-border-subtle` 전량 교체)
2. border-radius: `rounded-3xl` → `rounded-2xl`, textarea `rounded-2xl` → `rounded-xl`
3. off-palette: `bg-gray-50` → `bg-surface-low`, `text-gray-400` → `text-text-muted`, hardcoded hex → 토큰
4. form spacing rhythm 통일 (space-y-4 기준)
5. toast 시스템 3파일 삭제 + layout.tsx import 제거
6. `story-narrative-card` dead `compact` prop 제거 + raw `<img>` → `next/image`
7. `entry-form.tsx:393` `bottom-16` → CSS variable
8. `visualization-fallback.tsx` bare "데이터 없음" → EmptyState 프리미티브 활용

**Acceptance:** grep으로 `border-line`, `border-border-subtle`, `bg-gray-50`, `text-gray-400`, `toast` import 0건 확인.

### S5 네비게이션 + 반응형 보강 (MEDIUM)

**Target files:**
- `src/components/app-shell.tsx`
- `src/app/not-found.tsx` (신규)
- `src/app/entries/[id]/page.tsx`
- `src/app/entries/[id]/edit/page.tsx`
- `src/app/me/settings/page.tsx`
- `src/app/me/qr/page.tsx`
- `src/app/reviews/new/page.tsx`
- `src/app/entries/page.tsx`
- `src/app/together/page.tsx`
- `src/app/today/page.tsx`

**Changes:**
1. 로고 링크: 인증 시 `/today`, 미인증 시 `/`
2. `src/app/not-found.tsx` 신규 생성 (EmptyState + "오늘로 돌아가기" CTA)
3. breadcrumb 보강: entries/[id], entries/[id]/edit, me/settings, me/qr, reviews/new
4. `/entries` 페이지네이션: cursor-based "더 보기" (20건씩)
5. `/together` 페이지네이션: 동일 패턴
6. `/entries` 검색 폼에 visible submit 버튼 추가
7. `/today` "더 보기 (N)" 링크를 `/entries?filter=actions`로 변경 (또는 open actions 필터 뷰)
8. 대형 화면 컨테이너: 모든 페이지 루트에 `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` 일관 적용

**Acceptance:** 인증 사용자가 로고 클릭 시 /today로 이동. 404 페이지 렌더. breadcrumb 5곳 추가.

### S6 최종 검증 + 코드 리뷰

**Changes:**
1. 전체 테스트 + tsc + build + lint
2. ai-slop-cleaner (변경 파일만)
3. 독립 code-review (code-reviewer + architect)
4. 아키텍처 불변식 증명

**Acceptance:** 290+ tests pass, tsc clean, build success, lint clean, code-review APPROVE/CLEAR.

## Constraints

- 신규 의존성 추가 금지
- 기존 디자인 토(globals.css) 재사용 우선, 새 토큰 추가 최소화
- Radix Sheet는 이미 프로젝트에 존재 — scripture-picker 교체 시 신규 라이브러리 불필요
- toast 시스템 삭제 시 다른 컴포넌트에서 import하지 않는지 확인
- `next/image` 교체 시 width/height 또는 fill prop 필수

## Architecture Invariants

1. globals.css 토 레이어가 유일한 디자인 시스템 source of truth — 컴포넌트는 토큰/유틸리티만 소비
2. 모든 폼 submit은 try/catch/finally로 로딩 상태 복구 보장
3. 모든 인터랙티브 요소 44px 이상 터치 타겟
4. 모달/다이얼로그는 Radix primitives 사용 (dialog 시맨틱 자동)
5. 에러 메시지는 `text-destructive` + `role="alert"` — 성공과 시각적 구분
6. 인증 사용자의 로고 클릭은 `/today`로 이동 (앱 컨텍스트 유지)
