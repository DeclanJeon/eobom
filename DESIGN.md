# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-08-22
- Primary product surfaces: `/today`, `/entries/new`, `/lookback`, `/lookback/[id]`, `/story-mirror`, `/story-mirror/visualize`, `/together`
- Evidence reviewed:
  - User request: simplify review UX into a calm summary (not multi-section analysis)
  - `docs/brand-message.md`
  - `src/app/lookback/[id]/page.tsx`, `src/components/review/*`
  - `src/app/today/page.tsx`, `src/components/entry-form.tsx`
  - `src/lib/mimo.ts` (`StructuredReview`), `src/lib/review-display.ts`
  - `src/app/globals.css`
- Technical source of truth for record-grounded review/story connections: `docs/design/record-grounded-review-story-v1.md`.
- Review narrative (Mirror Narrative) supersedes the earlier "four blocks only" rule — see "Information architecture" below.

## Brand
- Personality: quiet, warm, editorial, trustworthy, unhurried.
- Trust signals: period context, plain language, no scores, no model names, soft boundary note.
- **Privacy is the first promise.** Records default to private; sharing is an explicit, per-entry opt-in of a curated sentence — never the full text.
- **Light-only product.** The app is a linen/paper reading surface; there is no dark mode. `next-themes`/`.dark` scaffolding is accepted debt pending removal.
- Avoid:
  - AI dashboard aesthetics, dense TOC, multi-layer analysis cards
  - Empty shells, equal-weight section sprawl
  - Judgment language, spiritual scoring, provider/model exposure

## Product goals
- Goals:
  - Help the user feel "this is what I've been meditating and thinking" in one calm scan.
  - Surface four useful answers — summary, related stories, helpful scriptures, needed companions — inside a narrative flow, not as a dashboard.
  - Keep mobile reading effortless; desktop should feel like a short letter, not a report.
- Non-goals:
  - Full observation inventory on first view, evidence drawers open by default, sticky section nav as the primary entry point
  - Turning review into analytics, therapy, or a life plan
- Success signals:
  - 10-second scan understands the period
  - No visible blank/complex subsections (empty blocks are omitted)
  - One scroll on mobile covers the whole review without decision fatigue

## Personas and jobs
- Primary persona: Korean-speaking Christian revisiting intermittent reflections on phone.
- User jobs:
  - "Tell me what I've been chewing on."
  - "What story resonates with this season?"
  - "Which Scripture should I sit with?"
  - "Who might walk with me now?"
- Key contexts: mobile after prayer, quiet tablet/desktop reread.

## Information architecture
- Primary navigation: AppShell `오늘 / 기록 / 돌아보기 / 함께` + mobile center `＋` (새 묵상).
- Lookback is one deepening flow, not three pages: 회고 목록 → 회고 상세(거울 서사) → 이야기 거울 → 시각화.
- Review detail is a **Mirror Narrative (거울 서사)**, not a document nor a dashboard:

```text
프롤로그 (이 기간의 나)        — one dominant dark hero sentence + 마음의 날씨
막 01–04 (4막 서사)           — 인과 순서의 내레이션 + 사용자 원문 인용(주인공)
만남과 말씀 (Meet)            — 연관 이야기 / 도움될 성구 / 함께할 사람 / 다시 머물 본문
지금의 모습 (Epilogue)        — 최신 시각화 한 장
```

- The four answers (요약/이야기/성구/동행) live in the 프롤로그 + 만남과 말씀, not as separate equal-weight cards.
- Desktop shows a spine rail TOC (좌측 등뼈); mobile shows a horizontal section bar. **Both are navigation aids, not the content.**

## Design principles
- Principle 1 — One breath summary: speak in prose first, not field labels.
- Principle 2 — Four answers max: anything beyond summary/story/scripture/companion stays out of the main view.
- Principle 3 — Absence is quiet: omit empty blocks entirely.
- Principle 4 — Progressive depth: dense material (tone bars, evidence drawers, forward panel, meet cards) is **collapsed by default**; the reader expands what they want.
- Principle 5 — Privacy by default: entries save as private unless the writer explicitly opts into a curated share.
- Tradeoffs:
  - Prefer fewer open sections over completeness.
  - Prefer synthesized sentences over raw AI field dumps.

## Visual language
- Color: existing Quiet Reflection tokens (linen, forest, leaf, gold accent rule only).
- **Token roles (v0.3 — fill the flatness):**
  - `gold` / `gold-ink` — 귀중함, eyebrow, 액센트 선, 서사 장식 (act-number, spine, narrative-quote).
  - `clay` (`accent-terracotta`) — 기도·결단·"삶으로의 한 걸음" 하이라이트. 사용자 행동 영역의 온기.
  - `mist` (`surface-shared`) — AI 산출 영역(회고 요약·시각화 해설)의 배경. "내가 쓴 것"과 "AI가 비춘 것"을 색으로 구분.
- Typography: Noto Sans KR for labels/UI (`--font-ui`); Noto Serif KR for summary prose/journal (`--font-journal`).
- Spacing: generous vertical rhythm (24/32/40). Reading width `max-w-reading` (45rem).
- Shape: soft paper cards (`paper-card`), one left accent rule per block type.
- Motion: subtle only (160–320ms); `prefers-reduced-motion` globally honored. No decorative motion on the review detail.

## Components
- Reuse: `AppShell`, `SurfaceCard`, `EntryRow`, `PageIntro`, `EmptyState`, `SoftBadge`, `chip`, `chip-gold`, `cta-primary`, `cta-secondary`, `Sheet` (Radix Dialog).
- TodayCard — scripture hero: verse only in hero, single progressive disclosure `말씀 더 보기` via `ScriptureDetailModal` (Radix Dialog, not Sheet). Viewport-bound centered dialog `width: calc(100vw - 1.5rem)` capped at `38rem`; `height: min(calc(100vh - 2rem), 46rem)` with `dvh` support; `max-height: calc(100vh - 2rem)`; `left:50% top:50% translate(-50%,-50%)`; `display:flex flex-col overflow:hidden`. Dark overlay `bg-[#0C1710]/70 backdrop-blur-md`. 100% solid linen base `#FDFBF7` with `linear-gradient(180deg, #FDFBF7 0%, #F8F4EA 100%)`, top gold rule `var(--accent-gold)`, `rounded-[24px]`, `shadow 0 24px 64px -16px rgba(6,27,14,0.35)`. Header `Scripture Context & Story` + `Dialog.Title/Description` + circular close; sticky segmented control `문맥 · 연결 성구 · 이야기` (700ms tab lock, `container.scrollTo` via `offsetTop`). Scroll body `.scripture-modal__scroll` is `flex:1 1 0% min-h-0 overflow-y:scroll -webkit-overflow-scrolling:touch touch-action:pan-y overscroll-behavior:contain` with thin `#B8AE9C` thumb. Content cards follow standalone 12/13 spec: `rounded-[18px] border-[#EAE3D5] bg-white shadow-[0_8px_22px_#1b1c1a0a]` and `mist` variant, `rounded-[18px]` line-height 1.85, `break-keep`, `15–16px` body. Story via `StoryApplicationCard`, gated `이야기 펼치기`.
- Review detail composition (actual):
  - `ReviewDetailHeader` — report type + period
  - `ReviewSectionNav` — spine rail (desktop) / bar (mobile)
  - `ReviewSimpleView` — 프롤로그 + 4막 + 만남과 말씀; `ActSection`, `Quote`, `ForwardPanel`, `MeetSection`
  - `EvidenceDrawer` — collapsed by default
  - `ReviewBoundaryNote` — AI 한계 고지
  - `VisualizationCard` — 지금의 모습
- Collapsed by default (Principle 4): 마음의 날씨 tone bars, `EvidenceDrawer`, `ForwardPanel` sub-blocks, `MeetSection` cards beyond the first.
- Remove from first view: open evidence drawers, equal-weight observation groups, multi-panel sprawl.

## Accessibility
- Target: WCAG 2.2 AA intent.
- One `h1` per page (including `/today`), block titles as `h2`.
- Cards/links are real anchors. 44px min tap targets.
- Body contrast on linen/card surfaces; gold is not used for body text (`gold-ink` only).
- `nav` elements carry `aria-label`; active link uses `aria-current`.
- `prefers-reduced-motion` disables animation; `:focus-visible` ring uses `leaf`.

## Responsive behavior
- Mobile (≤767): single column stack. 프롤로그 → 4막 → 만남과 말씀 → 지금의 모습. Horizontal section bar.
- Tablet (768–1023): summary full width; meet cards 2 columns.
- Desktop (≥1024): centered reading column (~720px) + left spine rail. No multi-column observation groups.

## Interaction states
- Loading: simple skeleton/letter shape.
- Empty block: omit.
- Fully empty review parse failure: one honest card + back to list.
- No generating spinners inside detail once saved.
- Expand/collapse transitions: height/opacity via GPU-safe props, 200ms, reduced-motion aware.

## Content voice
- Tone: calm companion. "당신이 남긴 기록을 모아 보면…"
- Prefer natural paragraphs over labeled taxonomies.
- Terminology:
  - `이 기간의 나` · `이 기간의 요약` · `연관 이야깃거리` · `도움될 성구` · `함께하면 좋은 사람` · `지금의 모습`
- Avoid: 분석 결과, 주제와 마음 inventory, 다음 한 걸음 checklist spam, 모델/점수/진단.

## Implementation constraints
- Keep `StructuredReview` backend contract; simplify at display-mapping layer only (`src/lib/review-display.ts`).
- Server-render `/lookback/[id]`.
- Entries save private by default (`shareVisibility: "private"`); `/api/entries/quick` already forces private.
- Derive companion suggestions from existing fields until a dedicated field exists.
- Tests cover summary mapping and empty-block omission.

## Continuity & identity policy (조용한 안전망)
- **No signup funnel, ever.** Visitors start as anonymous device identities (`DEVICE_COOKIE` → `UserDevice`); nothing may introduce a registration wall, banner nag, or "회원가입" language.
- **Data lives server-side on a `User` row from day one** — a device cookie is only a handle to it. Losing the cookie must be recoverable, not lossy by design.
- **One quiet moment, one ask.** When a user's 3rd reflection entry is saved and their identity is still email-less (anonymous), `/today` shows a single soft card once:
  - Copy frame: "묵상이 쌓이기 시작했네요. 이 기록들, 지금은 이 기기에만 살아 있어요."
  - Primary action: `구글 계정 연결하기` → existing `attachGoogleAccountToUser` flow (attach-in-place on the anonymous User — never a new parallel account, never "회원가입").
  - Secondary action: `나중에` (quiet text button). Dismissing records `backupPromptDismissedAt` on the User; the prompt must not reappear.
- **Automatic succession on Google sign-in.** When a Google login resolves to an email whose anonymous User already exists (email-less row created by `createDeviceIdentity`), the session succeeds that User instead of creating a duplicate:
  - Move/merge rule: attach the Google `Account` to the existing anonymous row and re-point the current device registration to it. Reflection entries, moments, prayers, review reports stay with the original row (no row copy).
  - If the email already belongs to a *connected* (different) user, fall back to existing `email_in_use` handling — no silent merge of two connected accounts.
- **Prompt trigger is count-based, not time-based.** `ReflectionEntry.count({ userId, deletedAt: null }) === 3` at save time is the only trigger. No banners on first visit, no repeated nudges.
- **Settings remains the power-user path.** `/me/settings` keeps the manual `Google 계정 연결` control with existing `email_in_use` / `already_connected` / `stale_intent` error states.
- Accepted tradeoff: an anonymous user who dismisses the prompt and loses their device cookie still loses access — recovery-code UX is deliberately out of scope to keep the experience free of key management.

## Accepted debt
- [ ] Dark-mode scaffolding removed (next-themes dependency + tailwind `darkMode:"class"` gone). Permanently light.
- [ ] `clay`/`mist` tokens underused on main app surfaces — apply to 기도/결단 and AI result regions (v0.3 rollout).
- [ ] `/today` reduced to a single dominant card — restore one secondary action + quiet recent-entries list.
- [ ] Dedicated AI field for companions/mentors if derivation quality is weak.

## Open questions
- [x] Should review show full observation inventory? No — summary only, collapsed progressive depth.
- [x] Should Story Mirror triple bridge live inside review? No — stories list + link out.
- [x] Should entries default to public or private? Private (privacy is the first promise).
- [ ] Optional later: dedicated AI field for companions/mentors if derivation quality is weak.
