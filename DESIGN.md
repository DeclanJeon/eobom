# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-07-31
- Primary product surfaces: `/lookback`, `/reviews`, `/reviews/[id]`, `/story-mirror`, `/story-mirror/visualize`
- Evidence reviewed:
  - User request: simplify review UX into a calm summary (not multi-section analysis)
  - `docs/brand-message.md`
  - `src/app/reviews/[id]/page.tsx`
  - `src/components/review/*`
  - `src/lib/mimo.ts` (`StructuredReview`)
  - `src/app/globals.css`
- Technical source of truth for record-grounded review/story connections: `docs/design/record-grounded-review-story-v1.md`.

## Brand
- Personality: quiet, warm, editorial, trustworthy, unhurried.
- Trust signals: period context, plain language, no scores, no model names, soft boundary note.
- Avoid:
  - AI dashboard aesthetics, dense TOC, multi-layer analysis cards
  - Empty shells, equal-weight section sprawl
  - Judgment language, spiritual scoring, provider/model exposure

## Product goals
- Goals:
  - Help the user feel “this is what I’ve been meditating and thinking” in one calm scan.
  - Surface only four useful answers: summary, related stories, helpful scriptures, needed companions.
  - Keep mobile reading effortless; desktop should feel like a short letter, not a report.
- Non-goals:
  - Full observation inventory, evidence drawers on first view, sticky section nav, multi-destination bridge chrome
  - Turning review into analytics, therapy, or a life plan
- Success signals:
  - 10-second scan understands the period
  - No visible blank/complex subsections
  - One scroll on mobile covers the whole review without decision fatigue

## Personas and jobs
- Primary persona: Korean-speaking Christian revisiting intermittent reflections on phone.
- User jobs:
  - “Tell me what I’ve been chewing on.”
  - “What story resonates with this season?”
  - “Which Scripture should I sit with?”
  - “Who might walk with me now?”
- Key contexts: mobile after prayer, quiet tablet/desktop reread.

## Information architecture
- Primary navigation: AppShell `오늘 / 기록 / 돌아보기 / 함께`
- Lookback tabs: `흐름 / 회고 / 이야기 / 시각화`
- Review detail is **not** a long document. It is one summary page with four blocks only:

```text
1. 이 기간의 요약
2. 연관 이야깃거리
3. 도움될 성구
4. 함께하면 좋은 사람
```

- Everything else (themes/emotions/questions/actionFlow/evidence/prayer multi-panels) is source material, not first-class UI sections.
- No sticky TOC. No multi-column observation groups. No Story Mirror triple-destination module inside the review.

## Design principles
- Principle 1 — One breath summary: speak in prose first, not field labels.
- Principle 2 — Four answers max: if it is not summary/story/scripture/companion, it stays out of the main view.
- Principle 3 — Absence is quiet: omit empty blocks entirely.
- Principle 4 — Progressive depth elsewhere: story detail and visualization live in lookback tabs, not nested inside review complexity.
- Tradeoffs:
  - Prefer fewer cards over completeness.
  - Prefer synthesized sentences over raw AI field dumps.

## Visual language
- Color: existing Quiet Reflection tokens (linen, forest, leaf, gold accent rule only).
- Typography: Manrope/Noto UI for labels; serif for summary prose.
- Spacing: generous vertical rhythm (24/32/40). Reading width `max-w-reading`.
- Shape: soft paper cards, one left accent rule per block type.
- Motion: none required on review detail.
- Imagery/iconography: optional small Lucide icons for block labels only.

## Components
- Reuse: `AppShell`, `SurfaceCard`, `ReviewDetailHeader`, `ReviewBoundaryNote`, `StoryNarrativeCard` (compact only if needed).
- Review detail composition:
  - `ReviewSimpleSummary` — hero prose
  - `ReviewSimpleStories` — up to 3 story lines
  - `ReviewSimpleScriptures` — up to 3 refs
  - `ReviewSimpleCompanions` — up to 3 companion/mentor needs
- Remove from first view: section nav, observation groups, forward multi-panel, scripture list sprawl, evidence drawers.

## Accessibility
- Target: WCAG 2.2 AA intent.
- One `h1` (summary). Block titles as `h2`.
- Cards/links are real anchors. 44px min tap targets.
- Body contrast on linen/card surfaces; gold not used for body text.

## Responsive behavior
- Mobile (≤767): single column stack. Summary first, then three blocks. Full-width cards.
- Tablet (768–1023): summary full width; stories + scriptures in 2 columns; companions full width.
- Desktop (≥1024): centered reading column (~720px). Optional 3-column strip under summary for stories/scriptures/companions when all exist; otherwise 2+1 or stack.
- No side rail TOC on any breakpoint.

## Interaction states
- Loading: simple skeleton/letter shape.
- Empty block: omit.
- Fully empty review parse failure: one honest card + back to list.
- No generating spinners inside detail once saved.

## Content voice
- Tone: calm companion. “당신이 남긴 기록을 모아 보면…” 
- Prefer natural paragraphs over labeled taxonomies.
- Terminology:
  - `이 기간의 요약`
  - `연관 이야깃거리`
  - `도움될 성구`
  - `함께하면 좋은 사람`
- Avoid: 분석 결과, 주제와 마음 inventory, 다음 한 걸음 checklist spam, 모델/점수/진단.

## Implementation constraints
- Keep `StructuredReview` backend contract; simplify at display-mapping layer only.
- Server-render `/reviews/[id]`.
- Derive companion suggestions from existing fields (`communityQuestions`, people-oriented `nextSteps`/`prayerPrompts`, theme fallbacks) until a dedicated field exists.
- Tests cover summary mapping and empty-block omission.

## Open questions
- [x] Should review show full observation inventory? No — summary only.
- [x] Should Story Mirror triple bridge live inside review? No — stories list + link out.
- [ ] Optional later: dedicated AI field for companions/mentors if derivation quality is weak.
