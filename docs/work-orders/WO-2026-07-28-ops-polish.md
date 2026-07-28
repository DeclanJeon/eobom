# 작업지시서: 운영·제품 다듬기 v1

| 항목 | 내용 |
|------|------|
| ID | **WO-2026-07-28-ops-polish** |
| 설계 | `docs/design/ops-polish-v1.md` |
| 상태 | Ready |

## G001 — Health, session flags, claim-intent, seats path

- `GET /api/health` (+ optional ?db=1)
- next-auth types + auth session callback flags
- claim-intent zod via api-schemas
- seats.test.ts resolveSqlitePath
- tests/health-related pure if any; unit green

## G002 — Docs archive, deferred prayer, README/nginx notes

- mv docs/stitch_prd_driven_design → docs/archive/stitch_prd_driven_design
- docs/archive/README.md
- docs/deferred/prayer-topic.md
- README ops section (health, rate-limit single instance)
- deploy/nginx-eobom.conf brief health comment

## DoD

설계 §7
