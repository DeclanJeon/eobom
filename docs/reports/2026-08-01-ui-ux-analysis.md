# UI/UX 종합 분석 보고서 - 2026-08-01

**분석 범위:** 프론트엔트 전체 (13개 주요 페이지, 10개 공유 컴포넌트, 디자인 시스템)

> **상태:** 본 문서는 2026-08-01 초기 분석의 historical baseline입니다. 아래 발견사항은 분석 당시 상태를 기록한 것이며, 현재 소스의 최종 QA/코드리뷰 결과를 대체하지 않습니다. 현재 토큰·공유 컴포넌트·접근성 수정 여부는 최신 소스와 최종 QA 보고서를 기준으로 판단합니다.
**분석 방법:** 4개 병렬 스카우트 에이전트 (UxComponents, UxDesignSystem, UxTogetherJ, UxMainPages)
**발견 수:** HIGH 7건, MEDIUM 18건, LOW 12건

---

## 📊 Executive Summary

**디자인 시스템 전반 평가:** ✅ 양호
- 커스텀 어스톤 팔레트(forest/linen/gold/terracotta) 일관적 적용
- AI 기본 색상(#3B82F6 blue/purple) 없음 ✅
- Shadow 사용 "Ambient Shadows" 지침 준수 ✅
- 이중 폰트 전략(Noto Sans KR UI + Noto Serif KR 저널) 명확

**주요 문제점:**
1. **토큰 미정의 문제:** `text-body-sm`, `text-label-xs`가 globals.css에 없어 ~30곳에서 font-family 통제 누락
2. **CTA 접근성:** ~15개 CTA 버튼이 WCAG 44px min-height 미충족
3. **PageIntro 컴포넌트:** 정의되어 있으나 0회 사용, 7개 페이지가 수동 복제
4. **한국어 가독성:** `text-label-sm`이 12px로 정의되어 20+ 파일에서 <14px 위반
5. **정보 모호성:** 키링 private_page 분기가 소유자/타인 구분 불가

---

## 🔴 Critical Issues (HIGH) — 즉시 수정 필요

### 1. **토큰 미정의로 인한 Font-Family 통제 누락**
- **위치:** `globals.css` (text-body-sm, text-label-xs 미정의)
- **영향:** ~30개 파일에서 serif/sans 구분 실패
- **대표 사례:**
  - `story-mirror/[id]/page.tsx:135,258,304,314` — text-label-xs 5곳
  - `today/page.tsx:242` — text-body-sm 사용
  - `review-simple-view.tsx:88,93,109,123` — text-label-xs + text-body-sm 혼재
- **수정:** globals.css에 text-body-sm(0.875rem/400 serif), text-label-xs(0.625rem/500 sans) 추가

### 2. **CTA 터치 타겟 WCAG 44px 미충족**
- **위치:** `globals.css` (cta-primary/secondary에 min-height 없음)
- **영향:** ~15개 CTA 버튼이 모바일에서 접근성 기준 미달
- **대표 사례:**
  - `entries/[id]/page.tsx:31` — 수정 버튼 인라인 클래스
  - `story-mirror/page.tsx:82` — cta-secondary
  - `review-simple-view.tsx` — 하단 CTA 3개
  - `lookback/[id]/page.tsx:183,189` — min-h-[44px] (lookback의 48px과 불일치)
- **수정:** cta-primary/secondary에 min-height: 44px 추가, 기존 min-h-[48px]는 44px로 통일

### 3. **PageIntro 컴포넌트 0회 사용 + 수동 복제**
- **위치:** `components/ui-blocks.tsx:1-18` (정의됨)
- **영향:** 7개 페이지가 eyebrow+title+description 패턴을 수동 복제
- **수동 복제 위치:**
  - `today/page.tsx:38-44`
  - `lookback/page.tsx:38-44`
  - `story-mirror/page.tsx:36-44`
  - `together/page.tsx:61-66`
  - 기타 3곳
- **수정:** PageIntro 컴포넌트 활용 또는 수동 패턴을 PageIntro로 마이그레이션

### 4. **한국어 Body Copy <14px 위반 (20+ 파일)**
- **위치:** `globals.css:219-223` (text-label-sm: 0.75rem = 12px)
- **영향:** 한국어 가독성 저하, 20+ 파일에서 12px 사용
- **대표 사례:**
  - `login/page.tsx:52` — text-label-sm
  - `review-create-form.tsx:37` — text-label-sm
  - `story-mirror-rag.tsx:341` — text-label-sm
- **수정:** text-label-sm을 0.875rem(14px)로 조정, 또는 새로운 text-label-md를 기본 label 크기로 사용

### 5. **미정의 색상 클래스 사용**
- **위치:** 여러 컴포넌트에서 globals.css에 없는 색상 사용
- **대표 사례:**
  - `review-create-form.tsx:37` — bg-safety/10, text-safety
  - `story-mirror-rag.tsx:302,341,391` — border-line, bg-chalk, text-accent-gold-ink
  - `story-mirror-feedback.tsx:50,60,75` — border-line, bg-chalk, text-ink
  - `landing-hero.tsx:376,381,386` — bg-[#edf3ec], bg-[#f7f0e2], bg-[#f3ebe7]
- **수정:** globals.css에 safety, chalk, line, ink 색상 추가 또는 하드코딩 hex를 토큰화

### 6. **Together EmptyState에 CTA 부재**
- **위치:** `together/page.tsx:89-96`
- **영향:** 빈 피드에서 사용자가 "무엇을 해야 할지" 모름
- **수정:** EmptyState의 action prop 활용, "첫 번째 묵상 나누기" CTA 추가

### 7. **Keyring Private Page 모호성**
- **위치:** `j/[slug]/page.tsx:137-147`
- **영향:** private_page 분기가 소유자(기기 미등록)와 타인을 구분하지 못해 "등록된 사용자만 접근 가능"이라는 모호한 메시지
- **수정:** decideKeyringAccess 로직 개선으로 소유자/타인 분기 명확화, 메시지 차별화

---

## 🟡 Important Improvements (MEDIUM) — 개선 권장

### 8. **H1 스타일 이중 체계**
- **문제:** bare 페이지는 인라인 text-display-lg(clamp 2-2.5rem/700), non-bare 페이지는 AppShell title(text-2xl~3xl/600)
- **위치:** `app-shell.tsx` vs 각 페이지
- **수정:** h1 스타일 가이드라인 통일 또는 AppShell title 옵션 확장

### 9. **H2 계층 붕괴**
- **문제:** text-headline-sm(1.25rem/600)과 text-label-md(0.875rem/500) 혼재
- **위치:** 
  - `today/page.tsx:178-193` — text-headline-sm
  - `lookback/[id]/page.tsx:137,154` — text-label-md
  - `entries/[id]/page.tsx:92,100,108,114` — text-label-md
- **수정:** h2에 text-headline-sm 통일, h3에 text-label-md 사용

### 10. **Entries/[id] H1 중복**
- **위치:** `entries/[id]/page.tsx:42`
- **문제:** AppShell title이 h1 생성 + 인라인 h1 font-journal text-display-lg 중복
- **수정:** AppShell의 title 제거 또는 인라인 h1 제거

### 11. **App Shell Active 상태 일관성 없음**
- **위치:** `app-shell.tsx:90`
- **문제:** desktop nav active 상태에 shadow-[inset_0_-2px_0_0_var(--accent-gold)] 사용, 다른 컴포넌트는 border 기반
- **수정:** border 기반 active 상태로 통일

### 12. **모바일 하단 메뉴 텍스트 크기**
- **위치:** `app-shell.tsx:190,221`
- **문제:** text-[10px]로 디자인 토큰(text-label-xs=12px)보다 작아 한국어 가독성 저하
- **수정:** text-label-xs(12px) 사용

### 13. **하드코딩 색상 (4곳)**
- **위치:**
  - `entries/page.tsx:41` — border-[#E0DDD7]
  - `together/page.tsx:146` — border-[#E0DDD7]
  - `landing-hero.tsx:69-70,283` — via-[#c5a059]/35, via-[#e0ddd7]
  - 기타 2곳
- **수정:** globals.css에 토큰 추가 (e.g., --border-subtle: #E0DDD7)

### 14. **Framer Motion Accessibility 누락**
- **위치:** `together-feed-card.tsx:4,27`
- **문제:** framer-motion 애니메이션에 prefers-reduced-motion 미적용
- **수정:** useReducedMotion 훅 사용 또는 globals.css의 prefers-reduced-motion 확장

### 15. **Textarea 포커스 스타일 일관성 없음**
- **위치:** `story-mirror-rag.tsx:341`
- **문제:** focus:border-accent-gold/40가 다른 입력 필드(focus:ring-2 ring-accent-gold/30)와 다름
- **수정:** focus 스타일 통일 (ring 또는 border 중 하나 선택)

### 16. **Owner Login Prompt 문구 혼란**
- **위치:** `owner-login-prompt.tsx:22-23`
- **문제:** "돌아가기"가 첫 방문자에게 혼란 가능 (실제로는 이전 로그인 이력 필요)
- **수정:** "내 기록으로 로그인하기" 또는 "이 기기의 기록 보기"로 변경

### 17. **Together Composer Sticky Position 불일치**
- **위치:** `together-composer.tsx:49`
- **문제:** sticky top-[4.5rem] md:top-24가 모바일 헤더(h-14=56px)와 불일치
- **수정:** 모바일 헤더 높이에 맞춰 top-[3.5rem] 또는 동적 계산

### 18. **Admin Seats Empty State 없음**
- **위치:** `admin/seats/page.tsx`
- **문제:** 빈 좌석 리스트에 empty state 없음, 빈 space-y-3만 렌더링
- **수정:** EmptyState 컴포넌트 활용, "등록된 좌석이 없습니다" 메시지

### 19. **Breadcrumb/안내 블록 중복**
- **위치:** 여러 페이지
- **문제:** breadcrumb nav가 중복되거나 안내 블록이 여러 곳에 존재
- **수정:** breadcrumb 컴포넌트 추출 및 중앙화

### 20. **Review Simple View 색상 코드 의미 불명확**
- **위치:** `review-simple-view.tsx:64,107,128`
- **문제:** border-l-accent-gold/50, border-l-leaf/50, border-l-accent-terracotta/50 등 의미론적 구분 불명확
- **수정:** 색상 네이밍 개선 (e.g., border-l-insight, border-l-reflection)

### 21. **EmptyState 시각적 단서 부족**
- **위치:** `components/ui-blocks.tsx:42-53`
- **문제:** EmptyState가 SurfaceCard 내부 text-center로 단순 구조
- **수정:** 아이콘 또는 일러스트 추가 옵션

### 22. **Together Detail 뒤로가기 aria-label**
- **위치:** `together/[id]/page.tsx:39-42`
- **문제:** '← 피드로' 링크에 aria-label 미적용
- **수정:** aria-label="함께 피드로 돌아가기" 추가

### 23. **Keyring Blocked Legacy 용어 추상적**
- **위치:** `j/[slug]/page.tsx:125-131`
- **문제:** "입구" 용어가 추상적
- **수정:** "이 키링" 또는 구체적인 명칭 사용

### 24. **Story Mirror Feedback aria-pressed 누락**
- **위치:** `story-mirror-feedback.tsx:75`
- **문제:** 피드백 버튼에 aria-pressed 속성 누락 (observation-feedback.tsx에서는 사용)
- **수정:** aria-pressed={sent === fb.type} 추가

### 25. **Review Detail Header 메타데이터 가독성**
- **위치:** `review-detail-header.tsx:15`
- **문제:** text-label-sm text-text-muted로 전체 헤더 스타일링, 날짜/유형이 중요한 메타데이터
- **수정:** text-label-md 또는 font-weight 강화

---

## 🟢 Minor Enhancements (LOW) — 사소한 개선

### 26. **EmptyState Action 누락 (여러 곳)**
- **위치:** `lookback/page.tsx:64-67`, `together/page.tsx:93-99`
- **수정:** EmptyState의 action prop 활용

### 27. **모바일 Bottom Nav 여백 과도**
- **위치:** `app-shell.tsx` (pb-28)
- **수정:** 모바일 화면 크기 테스트 후 조정

### 28. **Entry Form Focus Ring 일관성**
- **위치:** `components/entry-form.tsx:255`
- **수정:** focus:ring-2 ring-accent-gold/30을 전역 스타일로 통일

### 29. **Keyring Claim Prompt Disabled 스타일 중복**
- **위치:** `keyring-claim-prompt.tsx:66`
- **문제:** disabled:opacity-60이 cta-primary의 기본 disabled 스타일과 중복
- **수정:** cta-primary의 disabled 스타일만 사용

### 30. **SurfaceCard 커스터마이제이션 제한**
- **위치:** `components/ui-blocks.tsx:31-36`
- **문제:** paper-card 클래스만 적용, shadow/border 커스터마이제이션을 외부 className에 의존
- **수정:** props 확장 또는 변형(variant) 지원

### 31. **Review Create Form Error 패턴 불일치**
- **위치:** `review-create-form.tsx:37` vs `keyring-claim-prompt.tsx:58`
- **문제:** bg-safety/10 vs bg-destructive/10
- **수정:** 에러 스타일 통일

### 32. **Landing Hero Raw Tailwind 크기 혼재**
- **위치:** `landing-hero.tsx:78,228,340,363,397,400,403,418,432,448`
- **문제:** text-sm, text-base, text-xl 등 raw Tailwind 크기가 디자인 토큰과 혼재
- **수정:** 디자인 토큰(text-body-md, text-display-lg 등)으로 통일

### 33. **Admin Seats 빈 리스트 메시지**
- **위치:** `admin/seats/page.tsx`
- **수정:** "등록된 좌석이 없습니다" EmptyState 추가

### 34. **Together Feed Card Reduced Motion**
- **위치:** `together-feed-card.tsx:4,27`
- **수정:** useReducedMotion 훅으로 애니메이션 조건부 적용

### 35. **Review Simple View 반응형 그리드**
- **위치:** `review-simple-view.tsx:57-60`
- **문제:** xl:grid-cols-3에서만 3열, 태블릿에서 2열 고정
- **수정:** md:grid-cols-2 xl:grid-cols-3으로 조정

### 36. **Mobile 숨김 의도적 패턴**
- **위치:** `entries/page.tsx:26` (hidden md:inline-flex)
- **수정:** 모바일에서도 접근 가능한 대체 UI 검토

### 37. **Keyring "입구" 용어**
- **위치:** `j/[slug]/page.tsx:125-131`
- **수정:** "이 키링" 또는 구체적인 명칭 사용

---

## 📈 Design System Health Check

### ✅ 잘 구축된 부분
- **색상 팔레트:** 커스텀 어스톤(forest/linen/gold/terracotta) 일관적 적용
- **Shadow 사용:** "Ambient Shadows" 지침(4-6% opacity) 준수, 남용 아님
- **폰트 전략:** Noto Sans KR(UI) + Noto Serif KR(저널) 이중 전략 명확
- **접근성:** aria-current, aria-label 등 주요 속성 적절히 사용
- **디자인 철학:** "Quiet Reflection" 의도와 실제 구현 괴리 최소화

### ⚠️ 개선 필요
- **토큰 completeness:** text-body-sm, text-label-xs 미정의
- **색상 completeness:** safety, chalk, line, ink 등 미정의
- **CTA 접근성:** min-height 미정의
- **PageIntro 활용:** 정의 vs 사용 괴리 (정의됨, 0회 사용)

### 📋 AI Slop Checklist 결과
- ❌ 기본 AI 팔레트(blue/purple #3B82F6): **없음** ✅
- ❌ 극단적 그라디언트: **없음** ✅
- ❌ 균일 3/4열 그리드: **없음** ✅
- ⚠️ Box shadow 남용: 일부 발견 (landing-hero CTA, app-shell active)
- ⚠️ 반복적 eyebrow+title+description: **PageIntro를 통해 10+ 페이지 반복** (하지만 PageIntro 컴포넌트 자체는 0회 사용)
- ⚠️ 작은 한국어 body copy: **20+ 파일에서 12px 사용** (text-label-sm)

---

## 🎯 Recommended Action Plan

### Phase 1: Critical Fixes (1-2일)
1. globals.css에 text-body-sm, text-label-xs 토큰 추가
2. cta-primary/secondary에 min-height: 44px 추가
3. text-label-sm을 14px로 조정 (또는 text-label-md 기본 사용)
4. 미정의 색상(safety, chalk, line, ink)을 globals.css에 추가
5. together/page.tsx EmptyState에 CTA 추가
6. j/[slug]/page.tsx private_page 분기 명확화

### Phase 2: Consistency (2-3일)
7. PageIntro 컴포넌트 활용 (7개 페이지 마이그레이션)
8. h1/h2 스타일 가이드라인 통일
9. entries/[id] h1 중복 제거
10. app-shell active 상태를 border 기반으로 통일
11. 하드코딩 색상 4곳을 토큰화
12. textarea/input 포커스 스타일 통일

### Phase 3: Accessibility (1일)
13. framer-motion에 prefers-reduced-motion 적용
14. story-mirror-feedback에 aria-pressed 추가
15. 모바일 하단 메뉴 text-[10px] → text-label-xs(12px)
16. together detail 뒤로가기 aria-label 추가

### Phase 4: Polish (2-3일)
17. EmptyState에 아이콘/일러스트 옵션 추가
18. Review Simple View 색상 네이밍 개선
19. Landing Hero의 raw Tailwind 크기를 토큰으로 통일
20. Owner Login Prompt 문구 개선
21. Together Composer sticky position 조정
22. Admin Seats empty state 추가

---

## 📝 결론

**전반적 평가:** 디자인 시스템은 잘 구축되어 있으나, 토큰 completeness와 활용 측면에서 개선이 필요합니다.

**우선순위:**
1. **Critical (7건):** 토큰 미정의, CTA 접근성, PageIntro 활용, 한국어 가독성, Together/Keyring UX
2. **Important (18건):** 스타일 일관성, 접근성 개선, 하드코딩 제거
3. **Minor (12건):** 사소한 개선, polish

**예상 작업량:**
- Phase 1 (Critical): 1-2일
- Phase 2 (Consistency): 2-3일
- Phase 3 (Accessibility): 1일
- Phase 4 (Polish): 2-3일
- **총 6-9일**

**다음 단계:**
1. 이 보고서를 바탕으로 우선순위 결정
2. Phase 1부터 순차적 구현
3. 각 Phase 완료 후 smoke test 및 시각적 검증

---

**분석 완료 시각:** 2026-08-01 11:20
**분석 에이전트:** UxComponents, UxDesignSystem, UxTogetherJ, UxMainPages (총 4개)
**파일 분석 수:** 57개 주요 파일
