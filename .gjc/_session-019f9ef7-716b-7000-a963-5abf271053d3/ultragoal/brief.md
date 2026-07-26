Product: 이어봄 (meditation journal web service)
Codebase root: /home/declan/Documents/Develop/Project/linkview
UI reference scaffold: ui_reference/v1 (Next.js 16 + Tailwind + shadcn + Prisma SQLite + next-auth)
PRD: docs/meditation_journal_prd_v1.0.md
Deploy host: ssh ponslink (ponslink.com), short subdomain (use eobom.ponslink.com)
Secrets source: /home/declan/Documents/Develop/Project/pons_p2p/ponslink-api-infra/.env (GOOGLE_*, SMTP_*, SESSION_SECRET)
AI: Xiaomi MiMo V2.5 — wire OpenAI-compatible client; user will paste API key later (leave placeholder env)
Design: calm spiritual journal aesthetic via soft-skill + taste-skill + minimalist-ui; Korean-first UI
Workflow: local implement+test → GitHub repo commit/push → nginx + deploy on ponslink (NOT deploy before local verify)
Constraints: every screen has its own URL; personal journal page per user for QR; long-lived Google OAuth session cookies; contact/inquiry form via SMTP; no fake stubs for core flows; write final report to Obsidian Vault Projects/linkview/

@goal: Bootstrap app from UI reference
Copy ui_reference/v1 into project app root (not nested), install deps with bun, extend Prisma schema for Auth (Account/Session/VerificationToken), personalSlug/QR journal pages, ContactInquiry. Configure env templates (.env.example), next.config, standalone build. Keep SQLite for local MVP. Verify bun install + prisma generate succeed.

@goal: Auth Google OAuth and durable sessions
Implement next-auth (Auth.js) Google provider using GOOGLE_CLIENT_ID/SECRET from pons env. Persistent sessions: JWT or DB sessions with maxAge ~365 days, session updateAge, secure httpOnly cookies that survive browser restarts until explicit logout/cookie clear. Pages: /login, /api/auth/[...nextauth], middleware protecting app routes. On first login create User + unique personalSlug. Callback URL support for eobom.ponslink.com and localhost.

@goal: Core journal pages and personal QR routes
Implement full page routes per PRD nav: / (landing), /today, /entries, /entries/new, /entries/[id], /entries/[id]/edit, /reviews, /reviews/new, /reviews/[id], /together, /together/[id], /me, /me/settings, /me/export, /me/qr, /contact, /j/[personalSlug] (personal meditation journal landing for QR). Bottom nav mobile + desktop shell. CRUD APIs for ReflectionEntry, PrayerTopic, ActionStep. Personal page shows owner journal entry point; QR code generation on /me/qr. Calm premium UI (warm paper, soft serif/sans, no generic AI slop).

@goal: AI reviews MiMo contact and community MVP
Wire MiMo V2.5 OpenAI-compatible client (baseURL/model from env placeholders MIMO_API_KEY, MIMO_BASE_URL, MIMO_MODEL). AI review generation with PRD structure + safety disclaimer + evidence links; block prohibited spiritual-authority phrases. Contact/inquiry form posts to API and emails via SMTP_*. SharedReflection feed + reactions (empathize/pray/same_scripture/bookmark) + report. Export markdown/json. Local integration tests for APIs and critical pages.

@goal: Verify GitHub push and production deploy
Run local build/lint/tests until green. Create/push GitHub repo for linkview. On ssh ponslink: deploy app, configure nginx reverse proxy for eobom.ponslink.com with SSL if certbot available, systemd or process manager, production env with Google redirect URI. Smoke-test public URL. Write final completion report to Obsidian Vault Projects/linkview/.
