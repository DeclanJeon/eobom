# UI/UX Design System Consolidation — 설계 문서 v1

> Status: Draft
> Date: 2026-08-02
> Scope: 이어봄 전체 UI/UX 감사 결과 기반 디자인 시스템 드리프트 해소 + 접근성/사용성 결함 수정

## 1. 문제 정의

이어봄은 "Quiet Reflection" 디자인 시스템(globals.css) 위에 잘 설계된 토 레이어를 보유하고 있으나, 컴포넌트 레이어에서 다음과 같은 드리프트가 발생했다:

1. **폼 탄력성 결여** — 6개 submit 핸들러에 try/catch 부재로 네트워크 오류 시 버튼 영구 동결
2. **버튼 시스템 불완전** — cta-primary/cta-secondary에 hover 상태 없음, 4종의 disabled opacity 혼재, 5곳의 hand-rolled primary 버튼
3. **터치 타겟 미달** — ~12개 인터랙티브 요소가 44px 미만
4. **모달 접근성 결여** — scripture-picker에 dialog 시맨틱 전무
5. **네비게이션 단절** — 로고→랜딩 이탈, breadcrumb 불완전, not-found 페이지 없음
6. **시각적 불일치** — border-radius 3세대, border-color 3별칭, spacing rhythm 불일치, off-palette 색상
7. **반응형 미흡** — 대형 화면 폭 제한 불일관, 태블릿 breakpoint 미활용
8. **Dead code** — toast 시스템 미사용, dead prop, raw `<img>`

## 2. 설계 원칙

| 원칙 | 설명 |
|---|---|
| **토 우선** | globals.css 유틸리티(cta-*, paper-card, chip-*)를 재사용하고 hand-rolled 중복 제거 |
| **탄력적 폼** | 모든 submit 핸들러는 try/catch/finally로 로딩 상태 복구 보장 |
| **44px 최저** | 모든 인터랙티브 요소 min-h-11 (44px) 보장 |
| **접근성 기본** | 모달은 Radix Sheet, 에러는 role="alert" + text-destructive |
| **일관된 모션** | accordion/modal에 전환 애니메이션, active-scale 단일화 |
| **반응형 완전** | max-w-7xl 컨테이너 일관 적용, md: breakpoint 활용 |

## 3. 아키처 변경

### 3.1 globals.css 버튼 시스템 보강

```css
/* 현재: hover 없음 */
.cta-primary { ... transition: transform 200ms ease; }

/* 변경: hover + focus-visible 추가 */
.cta-primary {
  ...
  transition: transform 200ms ease, background-color 160ms ease, box-shadow 160ms ease;
}
.cta-primary:hover:not(:disabled) {
  background: color-mix(in oklab, var(--primary) 88%, white);
  box-shadow: 0 4px 16px -4px rgba(6, 27, 14, 0.3);
}
.cta-secondary:hover:not(:disabled) {
  border-color: var(--accent-gold);
  background: color-mix(in oklab, var(--accent-gold) 18%, white);
}
```

### 3.2 disabled opacity 단일화

```css
/* globals.css: 모든 disabled를 0.5로 통일, inline override 제거 */
.cta-primary:disabled,
.cta-secondary:disabled {
  opacity: 0.5;
}
```

컴포넌트에서 `disabled:opacity-40`, `disabled:opacity-60` 등 inline override 전량 제거.

### 3.3 Form Submit 패턴 표준화

```typescript
// 표준 패턴 — 모든 폼에 적용
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setSubmitting(true);
  setError(null);
  try {
    const res = await fetch(...);
    if (!res.ok) throw new Error(await res.text());
    // success handling
  } catch (err) {
    setError(err instanceof Error ? err.message : "오류가 발생했습니다");
  } finally {
    setSubmitting(false);
  }
};
```

### 3.4 Scripture Picker → Radix Sheet

기존 hand-rolled modal(`if (!open) return null`)을 `src/components/ui/sheet.tsx`의 Radix Sheet로 교체. 포커스 트랩, Escape, 스크롤 락, 전환 애니메이션 자동 획득.

### 3.5 반응형 컨테이너

```tsx
// 모든 페이지 루트에 일관 적용
<div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
```

읽기 콘텐츠(회고 본문, 기록 상세)는 `max-w-reading`(45rem) 유지.

### 3.6 Not-Found 페이지

```tsx
// src/app/not-found.tsx
export default function NotFound() {
  return (
    <AppShell>
      <EmptyState
        icon={<Compass />}
        title="페이지를 찾을 수 없습니다"
        description="요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다."
        action={<Link href="/today" className="cta-primary">오늘로 돌아가기</Link>}
      />
    </AppShell>
  );
}
```

## 4. 터치 타겟 수정 목록

| 컴포넌트 | 현재 | 수정 |
|---|---|---|
| `settings-form.tsx:80` checkbox | ~13px | `h-5 w-5` + label wrap min-h-11 |
| `scripture-chip-list.tsx:23` remove × | ~16px | `min-h-[44px] min-w-[44px]` hit area |
| `together-actions.tsx:60` reaction pill | ~30px | `min-h-11 px-4` |
| `observation-feedback.tsx:68` pill | ~26px | `min-h-11 px-4` |
| `story-mirror-feedback.tsx:77` emoji pill | ~30px | `min-h-11 px-4` |
| `share-form.tsx:213` AI suggest | ~30px | `min-h-11` |
| `share-form.tsx:159` 성구 선택 | ~36px | `min-h-11` |
| `share-form.tsx:231` tag remove | ~28px | `min-h-[44px] min-w-[44px]` |
| `review-section-nav.tsx:39` mobile pill | ~30px | `min-h-11` |
| `review-section-nav.tsx:70` desktop link | ~26px | `min-h-11 py-2` |
| `delete-entry-button.tsx:28` | ~36px | `min-h-11` |
| `app-shell.tsx:97` desktop nav | ~36px | `min-h-11` |

## 5. 시각적 일관성 수정

### 5.1 Border-radius 통일

| 용도 | 값 |
|---|---|
| Input/textarea | `rounded-xl` (1rem) |
| Card | `paper-card` (1rem via CSS) |
| Review hero | `rounded-2xl` (1.5rem) — 의도적 강조 |
| Chip/badge | `rounded-full` |

`rounded-3xl` 제거 → `rounded-2xl`로 통일.

### 5.2 Border-color 단일화

`border-line`, `border-border-subtle` 전량 → `border-border`로 교체. CSS에서 `--line`과 `--border-subtle`은 `--border`와 동일값이므로 alias 제거.

### 5.3 Active-scale 단일화

모든 interactive element → `active:scale-[0.98]` (CSS `.cta-primary:active`와 동일). `scale-95`, `scale-[0.99]` 제거.

### 5.4 Form spacing rhythm

| 폼 | 현재 | 수정 |
|---|---|---|
| contact-form | space-y-3 | space-y-4 |
| settings-form | space-y-4 | space-y-4 (유지) |
| share-form | space-y-5 | space-y-4 |
| entry-form | space-y-8 | space-y-6 |

### 5.5 Off-palette 제거

- `StoryVisual.tsx:157` `bg-gray-50` → `bg-surface-low`, `text-gray-400` → `text-text-muted`
- `landing-hero.tsx:375,385` `bg-[#edf3ec]` → `bg-surface-shared`, `bg-[#f3ebe7]` → `bg-bg-warm`

## 6. 네비게이션 수정

### 6.1 로고 링크

```tsx
// app-shell.tsx
const logoHref = session ? "/today" : "/";
```

### 6.2 Breadcrumb 보강

`/entries/[id]`, `/entries/[id]/edit`, `/me/settings`, `/me/qr`, `/reviews/new`에 breadcrumb 추가.

### 6.3 Entries/Together 페이지네이션

`/entries`에 "더 보기" 버튼(cursor-based, 20건씩). `/together`에 동일 패턴.

## 7. Dead Code 정리

- `toast.tsx`, `toaster.tsx`, `hooks/use-toast.ts` 삭제 + `layout.tsx` import 제거
- `story-narrative-card.tsx` dead `compact` prop 제거
- `story-narrative-card.tsx:42` raw `<img>` → `next/image`
- `sheet.tsx:77` sr-only "Close" → "닫기"
- `entry-form.tsx:393` `bottom-16` → CSS variable `--nav-height`

## 8. 품질 게이트

- `npx tsc --noEmit` 클린
- `bun test` 전체 패스
- `bun run build` 성공
- `bunx eslint src tests --max-warnings=0` 클린
- 독립 code-review APPROVE/CLEAR
