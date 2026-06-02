# AGENTS.md

## Cursor Cloud specific instructions

### Product

Single Next.js 15 app (**MemeFight** / `versus-app`) at repo root. Core flows: public feed, battle pages (`/b/[slug]`), anonymous voting via `POST /api/vote`, optional **Party** (`PARTY_ENABLED=true`), rewards, admin. Backend is Supabase (Postgres, Auth, Storage, Realtime for Party)—no separate API server or docker-compose.

### Dependencies

- **Node** ≥ 20, **npm** (`package-lock.json`).
- Run `npm install` from `/workspace` (also the VM update script).
- Copy `.env.local.example` → `.env.local` and set at minimum:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `.env.local` is gitignored; never commit secrets.

### Dev server

```bash
npm run dev
```

- App: http://localhost:3000 (Turbopack).
- Long-running dev server: use a named tmux session (e.g. `next-dev-server`), not a detached one-shot shell.

### Optional integrations (app runs without them)

| Variable | Effect if unset |
|----------|-----------------|
| `UPSTASH_*` / `KV_*` | Vote rate limiting disabled (logged warning) |
| `VOTE_IP_HASH_SALT` | IP vote dedup disabled |
| Turnstile keys | No vote CAPTCHA |
| `RESEND_*` | Magic link in dev logs / API `devLoginUrl` |
| `ADMIN_SECRET` | Admin UI shows setup hint only |

### Party E2E

- Set `PARTY_ENABLED=true` in `.env.local`.
- `/party` requires a logged-in Supabase user (redirects to `/auth/login?returnTo=/party`).
- Full Party QA: see `docs/party-manual-qa.md` (two accounts, templates in Storage).

### Verification commands (repo root)

| Command | Purpose |
|---------|---------|
| `npm run lint` | ESLint (warnings OK; 0 errors expected) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Production build |
| `npm run test:party-*`, `test:caption-*` | Targeted Node/`node --test` scripts (no Jest) |

See `README.md` and `package.json` scripts for seed/ops commands (`seed:battles`, `party:bulk-import`, etc.).

### Local Supabase CLI

`supabase/config.toml` exists for `npx supabase start`, but Cloud Agent VMs typically have **no Docker**—use the hosted Supabase project instead.

### Smoke test (API)

With dev server running, a same-origin vote against a live battle should return `{"success":true,...}` from `POST /api/vote` (see `lib/vote-request-guards.ts` for required `Origin` / `Sec-Fetch-Site` headers).
