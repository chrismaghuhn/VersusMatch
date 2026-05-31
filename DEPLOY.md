# Deploy & Ops — MemeFight

## Vercel Git (wichtig)

Das Projekt **versus-match** muss mit **`chrismaghuhn/VersusMatch`** verbunden sein — nicht `MediaFetch`.

Falls Auto-Deploy fehlschlägt mit `ENOENT package.json`:

1. [Vercel Project Settings → Git](https://vercel.com/chris-projects-078da2b3/versus-match/settings/git)
2. Disconnect falsches Repo
3. Connect **`chrismaghuhn/VersusMatch`**, Branch **`main`**, Root Directory **`/`**
4. GitHub: Vercel App braucht Zugriff auf das VersusMatch-Repo (Settings → Applications)

Alternativ bis Git steht:

```bash
npx vercel deploy --prod --scope chris-projects-078da2b3
```

## Production Env-Vars

| Variable | Beschreibung |
|----------|--------------|
| `NEXT_PUBLIC_APP_URL` | `https://memefight.lol` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` (server only) |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Upstash via Vercel Integration |
| `VOTE_IP_HASH_SALT` | Zufälliger String für IP-Hash Dedup |
| `ADMIN_SECRET` | Login für `/admin/login` (Moderation) |
| `RESEND_API_KEY` | [Resend](https://resend.com) API Key |
| `RESEND_FROM_EMAIL` | Verifizierte Absender-Adresse |
| `REPORT_NOTIFY_EMAIL` | Deine E-Mail für Report-Alerts |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile Site Key |
| `TURNSTILE_SECRET_KEY` | Turnstile Secret Key |
| `SENTRY_DSN` | Error tracking ([sentry.io](https://sentry.io)) |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Optional: Source-Map-Upload bei Build |

## Cloudflare Turnstile

1. [Cloudflare Dashboard → Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) → Widget erstellen
2. Domains: `memefight.lol`, `localhost`
3. Keys in Vercel setzen:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = Site Key
   - `TURNSTILE_SECRET_KEY` = Secret Key
4. Redeploy — CAPTCHA erscheint auf der Vote-Seite

## Resend (Report-Benachrichtigung)

1. [Resend](https://resend.com) → API Key erstellen
2. Absender-Domain verifizieren (oder Resend-Testdomain für Tests)
3. Vercel setzen:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL` (z. B. `reports@memefight.lol`)
   - `REPORT_NOTIFY_EMAIL` (dein Postfach)
4. Test-Report auf einem Battle senden → E-Mail prüfen

## Moderation

1. `ADMIN_SECRET` auf Vercel setzen (langer Zufallsstring)
2. Öffnen: [`/admin/login`](https://memefight.lol/admin/login)
3. Session-Cookie (7 Tage) — **kein Key mehr in der URL**
4. Reports filtern: **Offen** / **Alle**, Aktionen: Erledigt, Schließen, Löschen

## Sentry

1. Projekt auf [sentry.io](https://sentry.io) anlegen (Platform: Next.js)
2. `SENTRY_DSN` in Vercel setzen
3. Optional `SENTRY_ORG` + `SENTRY_PROJECT` für Source Maps beim Build

## Supabase Migrationen

Reihenfolge in `supabase/migrations/` — nach Pull neue Migration im SQL Editor ausführen:

- `20260531220000_report_resolve.sql` — `resolved_at` auf `battle_reports`

## Smoke-Test nach Deploy

1. **Vote:** Battle öffnen → Turnstile sichtbar (wenn Keys gesetzt) → Vote klappt
2. **IP-Dedup:** Zweiter Vote gleiche IP → blockiert
3. **Report:** Melden → E-Mail kommt an (wenn Resend gesetzt)
4. **Admin:** `/admin/login` → Reports, Erledigt/Close/Delete
5. **Sentry:** Fehler in Logs oder absichtlicher 500 → Event in Sentry

## Monitoring (wöchentlich)

- Vercel → **Logs**: `[observability:vote]`, 429-Spikes
- Sentry → ungelöste Issues
- Supabase → **Advisors** (Security)
