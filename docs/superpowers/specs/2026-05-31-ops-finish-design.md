# MemeFight Ops Finish — Design Spec

**Date:** 2026-05-31  
**Status:** Approved for implementation  
**Scope:** Close the Ops phase from the Superpowers Next Steps roadmap.

## Goal

Make MemeFight production-ready for day-to-day operations: activate external services (Turnstile, Sentry, Resend), secure admin moderation without URL secrets, and resolve/report workflow for content abuse.

## Non-Goals

- Stripe / Pro tier
- Bracket, embed, creator profile
- Slack/webhook notifications
- Supabase Edge Functions

## Architecture

### Admin session

- Login at `/admin/login` with `ADMIN_SECRET`
- HMAC-signed `mf_admin_session` cookie (`httpOnly`, `secure`, `sameSite=lax`, path `/admin`, 7-day TTL)
- `/admin/reports` requires valid session; redirects to login if missing

### Report lifecycle

- Users submit reports via `POST /api/report` (unchanged UX)
- Row inserted into `battle_reports`
- Optional Resend email to `REPORT_NOTIFY_EMAIL` (non-blocking on failure)
- Admin marks report **Erledigt** → `resolved_at` set
- Close/delete battle auto-resolves open reports for that battle

### Schema change

```sql
alter table public.battle_reports
  add column if not exists resolved_at timestamptz;
```

### Env vars (Production)

| Variable | Purpose |
|----------|---------|
| `ADMIN_SECRET` | Admin login |
| `RESEND_API_KEY` | Send report emails |
| `RESEND_FROM_EMAIL` | Verified sender |
| `REPORT_NOTIFY_EMAIL` | Moderator inbox |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Vote CAPTCHA |
| `SENTRY_DSN` | Error tracking |

## Error handling

- Resend failure: report still saved; error logged to Sentry/console
- Turnstile misconfig: vote returns 403 (existing behavior)
- Missing `ADMIN_SECRET`: admin pages show setup hint

## Verification

See [DEPLOY.md](../../DEPLOY.md) smoke-test checklist.
