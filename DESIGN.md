# Design

## Source of truth
- Status: Active draft for review-page redesign
- Last refreshed: 2026-07-30
- Primary product surfaces: `/reviews`, `/reviews/[id]`, `/story-mirror`, `/story-mirror/reflect`, `/story-mirror/visualize`
- Evidence reviewed:
  - `docs/brand-message.md`
  - `docs/meditation_journal_prd_v1.0.md`
  - `docs/design/review-enhancement-v1.md`
  - `src/app/reviews/page.tsx`
  - `src/app/reviews/[id]/page.tsx`
  - `src/components/app-shell.tsx`
  - `src/components/ui-blocks.tsx`
  - `src/app/globals.css`
  - `src/lib/mimo.ts` and `StructuredReview` contract
  - 2026 rolling award archives from Awwwards, CSS Design Awards, and FWA

## Brand
- Personality: quiet, warm, editorial, trustworthy, unhurried.
- Trust signals: dated evidence links, explicit AI limitations, user control, no scores or rankings, source-aware Scripture references.
- Avoid:
  - AI dashboard aesthetics, neon gradients, progress scores, gamification, badges that imply spiritual rank.
  - Exposed provider/model names.
  - Empty shells, placeholder cards, decorative motion that competes with reflection.
  - Language that sounds like divine authority, diagnosis, judgment, or guaranteed transformation.

## Product goals
- Goals:
  - Help a person understand the shape of a period of reflection within one calm scan.
  - Make every meaningful observation traceable to a dated user record.
  - Move naturally from looking back to rereading, prayer, and one small next step.
  - Connect a review to Story Mirror without making the user navigate through unrelated pages.
  - Preserve user agency: AI is a mirror and draft, not a judge or spiritual authority.
- Non-goals:
  - Turning a review into a scorecard, feed, analytics dashboard, or therapy product.
  - Showing every generated field when it is empty or weak.
  - Replacing community, pastoral care, counseling, Scripture reading, or prayer.
- Success signals:
  - A user can explain the review's main point after a 10-second scan.
  - A user can reach evidence, a Scripture reread, Story Mirror, or a next step without hunting.
  - Zero visible blank sections or provider metadata.
  - Mobile reading completion and interaction remain comfortable without horizontal scrolling.

## Personas and jobs
- Primary persona: a Korean-speaking Christian who records reflections intermittently and wants to notice recurring themes without feeling evaluated.
- Secondary persona: a person preparing for a small-group conversation who needs a concise, private draft with evidence links.
- User jobs:
  - "Show me what has been present in my records without telling me what God thinks of me."
  - "Let me verify why this observation appeared."
  - "Help me choose one small next step rather than giving me a life plan."
  - "Let me move from my review into a story, a connection, or a visualization when I want more depth."
- Key contexts of use: mobile after prayer, quiet desktop review, short pre-small-group scan, emotionally sensitive moments.

## Information architecture
- Primary navigation: existing AppShell navigation remains unchanged.
- Review detail order:
  1. Context header: period, review type, save state, actions.
  2. Hero: one sentence and a short explanation of what this document is.
  3. Reading index: `한 문장`, `주제와 마음`, `이야기 거울`, `다시 읽을 말씀`, `다음 한 걸음`.
  4. Core reflection: one sentence, themes, emotions, questions, evidence.
  5. Story Mirror bridge: `이야기`, `연결`, `시각화` as one module with three explicit destinations.
  6. Revisit: Scripture and previous records.
  7. Forward movement: changes/unknowns, next steps, prayer prompts.
  8. Quiet boundary: limitations and help guidance.
- Content hierarchy:
  - Level 1: one sentence and period context.
  - Level 2: 3–5 meaningful observations.
  - Level 3: evidence, alternate perspective, links, and actions.
  - Never present generated structure as equally important when the content is absent.

## Design principles
- Principle 1 — Orient before interpreting: show what period this is and what the page is for before showing analysis.
- Principle 2 — One page, one thread: the page should read as a gentle narrative from looking back to moving forward, not as a grid of AI outputs.
- Principle 3 — Evidence is a doorway, not a footnote: keep evidence close to each observation and make it openable with one tap.
- Principle 4 — Progressive disclosure: show the useful sentence first; place evidence, alternate views, and limitations one level deeper.
- Principle 5 — Absence is quiet: empty or low-confidence sections disappear or become a single honest message; never render blank cards.
- Principle 6 — Motion marks transition, not decoration: use motion to reveal hierarchy and feedback, never to create urgency.
- Tradeoffs:
  - A single reading column is preferred over dashboard density, even if it means more scrolling.
  - Story Mirror is integrated for discoverability, but its three experiences remain conceptually distinct.
  - Visual polish uses existing tokens and CSS rather than a new animation or component framework.

## Visual language
- Color:
  - Background/quiet: `linen #fbf9f6` / `surface-low #f5f3f0`.
  - Primary text and anchor: `forest #061b0e`.
  - Body: `ink #2d2d2d`; muted: warm gray `#5c574f`.
  - Links/focus: `leaf #295c3b`.
  - Accent rule/eyebrow only: `gold #c5a059`; readable gold text uses `gold-ink #7a5a24`.
  - Emotional temperature: `clay #b36a5e`, used sparingly for prayer/forward movement, not as decoration.
  - Shared/community surface: `mist #f0f4f2`.
  - Do not introduce bright blue, neon, progress gradients, or gold body copy.
- Typography:
  - UI, navigation, labels, headings: existing Manrope token.
  - Reflection prose, evidence excerpts, Scripture excerpts: existing Source Serif 4 token.
  - Hero headline: Manrope semibold/bold, max three lines on mobile.
  - Body measure: 62–72 characters per line on desktop; 1.7–1.85 line-height for prose.
  - Korean text must not use aggressive negative tracking; preserve word shapes and line breaks.
- Spacing/layout rhythm:
  - Base rhythm: 4px, with primary steps 8/12/16/24/32/48/64.
  - Reading container: 720–760px for detail prose; hero may expand to 960px.
  - Section separation: 56px desktop, 40px mobile; card internal padding 20–24px.
  - Use one strong column and an optional desktop rail; do not create a dense three-column dashboard.
- Shape/radius/elevation:
  - Existing `paper-card`, 16px radius, one ambient shadow only.
  - Hero uses 24px radius and forest surface; observation cards use 16px radius and a 2–4px semantic left rule.
  - Borders remain visible in low-contrast linen surfaces; no glassmorphism inside the reading content.
- Motion:
  - Section reveal: opacity + 8px vertical translation, 240ms, once per section.
  - Anchor navigation: smooth scroll only when motion is allowed.
  - Buttons/cards: 160–200ms border/background transition; no scale larger than 0.98 on press.
  - Story Mirror module: a restrained line/halo pulse may indicate the three destinations, but no autoplay, parallax, or continuous particle field.
  - `prefers-reduced-motion: reduce` disables reveal, pulse, and smooth scroll while preserving focus and state changes.
- Imagery/iconography:
  - Use Lucide icons already in the repo, 16–20px, never emoji as primary UI.
  - Visualization is an optional contemplative artifact, not a dashboard chart.
  - Do not use stock “AI face” imagery or model/provider marks.

## Components
- Existing components to reuse:
  - `AppShell`, `SurfaceCard`, `SoftBadge`, `EmptyState`, `ObservationFeedback`, `RereadScriptureList`.
  - Existing typography utilities and `paper-card`/`surface-card-dark`.
  - Existing Story Mirror card/connection/visualization routes.
- New/changed components:
  - `ReviewDetailHeader`: period, type, status, actions, and compact reading index.
  - `ReviewHero`: one sentence, disclaimer, and count/context metadata.
  - `ReviewSectionNav`: sticky desktop rail; horizontal scrollable anchor row on mobile.
  - `ReviewObservationGroup`: combines meaningful themes/emotions/questions while preserving evidence.
  - `StoryMirrorBridge`: three destinations—이야기, 연결, 시각화—with data-aware cards and honest empty states.
  - `ReviewForwardPanel`: changes/unknowns, one next step, prayer prompt.
  - `ReviewBoundaryNote`: limitations and support guidance, visually quiet.
- Variants and states:
  - `loaded`, `partial`, `empty`, `error`, `generating`, `saved`.
  - Observation items with blank title/body are filtered before rendering.
  - A section with no meaningful items is omitted, not replaced by a blank card.
  - Story Mirror cards show existing results; when absent, show one concise invitation, not three empty panels.
- Token/component ownership:
  - Global colors/type/motion in `src/app/globals.css`.
  - Review-specific composition in `src/components/review/*` or the review route during the first pass.
  - API/data mapping stays outside presentational components.

## Accessibility
- Target standard: WCAG 2.2 AA intent; keyboard and screen-reader support are mandatory.
- Keyboard/focus behavior:
  - All section index items are real links with visible `:focus-visible` rings.
  - Cards that navigate are links, not clickable divs.
  - Focus is not trapped by the reading index; skip link remains available through AppShell.
- Contrast/readability:
  - Body and muted text must remain readable on linen/card surfaces; gold is not used for body copy.
  - Do not rely on left border color alone to communicate meaning.
- Screen-reader semantics:
  - One `h1`; sections use `h2`; cards use `h3` only when they have content.
  - `nav aria-label="회고 목차"` for the section index.
  - Evidence links describe the destination, e.g. `2026년 7월 29일 기록 열기` rather than repeated `근거 기록`.
  - Decorative motion/lines use `aria-hidden="true"`.
- Reduced motion and sensory considerations:
  - Respect `prefers-reduced-motion`.
  - Avoid flashing, pulsing content, autoplay, and sound.
  - Long AI output remains selectable and copyable.

## Responsive behavior
- Supported breakpoints/devices: existing Tailwind breakpoints; mobile-first, tested at 360px, 390px, 768px, 1024px, and 1440px widths.
- Layout adaptations:
  - Desktop: hero + optional 180px section rail + 720px reading column.
  - Tablet: hero and content remain single column; index becomes horizontal row.
  - Mobile: one column, sticky compact index below the page header, cards full width, actions at least 44px high.
  - Story Mirror three destinations stack vertically on mobile and become a three-column strip only when each has meaningful content on wide screens.
- Touch/hover differences:
  - Hover is enhancement only; all affordances work on tap.
  - Horizontal section index supports touch scrolling and visible active state.

## Interaction states
- Loading: skeleton only for known content regions; label `회고를 불러오는 중이에요` and preserve page structure.
- Empty: explain what is absent and why; offer one next action. Never render empty title/body cards.
- Error: keep the review context visible and show retry/back action; do not expose provider errors or model names.
- Success: save/generate status is a small inline confirmation, not a toast-only state.
- Disabled: explain consent or unavailable Story Mirror features near the action.
- Offline/slow network: previously saved review remains readable; actions show pending/failure states.

## Content voice
- Tone: calm companion, precise, non-authoritative, warm but not sentimental.
- Terminology:
  - Use `AI 회고 초안`, `기록에서 보이는 점`, `다시 읽을 기록`, `다음 한 걸음`.
  - Use `이야기`, `연결`, `시각화` as explicit Story Mirror destinations.
  - Avoid `분석 결과`, `점수`, `정답`, `진단`, `신앙 상태`, `모델`, `AI가 판단`.
- Microcopy rules:
  - State what the user can do next.
  - Explain uncertainty without apologizing excessively.
  - Do not imply that an omitted section means a personal deficiency.

## Implementation constraints
- Framework/styling system: Next.js App Router, React server components, Tailwind CSS v4 utilities, existing `SurfaceCard`/`AppShell`.
- Design-token constraints: extend existing tokens; do not add a parallel palette or font stack.
- Performance constraints: no animation library or client hydration for static review content; keep the detail page server-rendered; lazy-load visualization only when requested.
- Compatibility constraints: preserve current review data contract and feedback routes; old reviews must render through normalization/filtering without regeneration.
- Test/screenshot expectations:
  - Unit tests for empty item filtering and section visibility.
  - Render/build verification at mobile and desktop widths.
  - Keyboard walkthrough of section nav, evidence links, Story Mirror actions.
  - Reduced-motion screenshot/interaction check.

## Open questions
- [ ] Should Story Mirror content be scoped to the reviewed period instead of the user's latest run? This changes query contracts and affects trust.
- [ ] Should the review index remain sticky on mobile, or collapse into a `목차` disclosure after the first viewport? Product/design owner.
- [ ] Should visualizations be persisted and linked to a review ID, or remain user-level artifacts? Backend owner.
- [ ] What is the maximum number of observation cards before the review should offer a “더 보기” disclosure? UX owner.
