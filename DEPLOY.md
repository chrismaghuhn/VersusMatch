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

## Resend (Report-Benachrichtigung + Magic Link Login)

1. [Resend](https://resend.com) → API Key erstellen
2. Absender-Domain **memefight.lol** verifizieren (DNS bei Cloudflare/Registrar)
3. Vercel setzen:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL` (z. B. `MemeFight <auth@memefight.lol>` — muss verifizierte Domain sein, **kein @gmail.com**)
   - `REPORT_NOTIFY_EMAIL` (dein Postfach)
4. Magic Link Login nutzt Resend automatisch, wenn `RESEND_*` gesetzt ist (umgeht kaputtes Supabase-SMTP)

**Supabase SMTP (optional):** Falls du Supabase-eigene Mails nutzen willst statt Resend — Dashboard → Authentication → SMTP. Absender muss zur verifizierten Domain passen (nicht gmail.com mit Resend-Key).

5. Test: `/auth/login` → Magic Link anfordern → E-Mail prüfen
6. Test-Report auf einem Battle senden → Report-E-Mail prüfen

## Supabase Auth (Dashboard)

1. **Leaked password protection:** Authentication → Providers → Email → enable **Prevent use of leaked passwords** (HaveIBeenPwned check). Relevant if users set passwords; magic link still works without it.

## Moderation

1. `ADMIN_SECRET` auf Vercel setzen (langer Zufallsstring)
2. Öffnen: [`/admin/login`](https://memefight.lol/admin/login)
3. Session-Cookie (7 Tage) — **kein Key mehr in der URL**
4. Reports filtern: **Offen** / **Alle**, Aktionen: Erledigt, Schließen, Löschen

## Sentry

Projekt: **versusmatch** / **javascript-nextjs** → [Project Settings](https://versusmatch.sentry.io/settings/projects/javascript-nextjs/keys/)

1. **Client DSN** und **Security Header Endpoint** (DSN) kopieren
2. Vercel setzen:
   - `NEXT_PUBLIC_SENTRY_DSN` = Client DSN (öffentlich, für Browser)
   - `SENTRY_DSN` = gleicher DSN (Server/Edge)
   - `SENTRY_ORG` = `versusmatch`
   - `SENTRY_PROJECT` = `javascript-nextjs`
3. Optional Source Maps: [Auth Token](https://sentry.io/settings/account/api/auth-tokens/) mit `project:releases` → `SENTRY_AUTH_TOKEN`
4. Redeploy

Features aktiv: Error Monitoring, Tracing, Session Replay (10 % Sessions, 100 % bei Fehlern), Tunnel `/monitoring` (Ad-Blocker-Umgehung).

**Verify:** Fehler in Sentry Issues nach ~30s sichtbar.

## Supabase Migrationen

Reihenfolge in `supabase/migrations/` — nach Pull neue Migration im SQL Editor ausführen:

- `20260531220000_report_resolve.sql` — `resolved_at` auf `battle_reports`
- `20260601120000_feed_batch_results.sql` — **`get_feed_with_results` RPC (required for Home/Feed after performance deploy)**

## Performance re-test

After deploy, run Lighthouse mobile (Slow 4G simulation) on:

1. `https://memefight.lol/`
2. `https://memefight.lol/b/<slug-with-images>`

Target: Performance ≥ 80. Final prod scores (2026-06-01): `/` **95**, `/b/[slug]` **97** (mobile, Slow 4G). Home/Feed use ISR (`revalidate=60`); vote counts on feed may lag up to 60s (battle page polls live).

## Growth / SEO

- Branded OG: `https://memefight.lol/b/<slug>/opengraph-image`
- Sitemap: `https://memefight.lol/sitemap.xml`
- Robots: `https://memefight.lol/robots.txt`
- Category landing pages: `/feed/gaming`, `/feed/food`, etc.
- Trending: `/trending`
- Embed battles: `/embed/b/<slug>` (iframe-safe; Turnstile skipped, rate limit active)
- Copy embed code on battle page and post-create banner
- Seed battles locally: `npm run seed:battles` (needs `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`)
- GSC checklist: [`docs/google-search-console-playbook.md`](docs/google-search-console-playbook.md)
- List URLs for indexing: `npm run seo:list-urls`
- Verify share preview: [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)

## Smoke-Test nach Deploy

### Kernflows (P0)

1. **Home/Feed:** Stats im Hero, Battle-Cards mit Bildern und Prozenten, Filter funktionieren
2. **Vote:** Battle öffnen → Bilder sichtbar (wenn hochgeladen) → Turnstile (wenn Keys gesetzt) → Vote ohne Console-Error
3. **VS-Slider:** 0 Votes = Mitte; mehr Grün (A) → VS unten; mehr Pink (B) → VS oben
4. **Create:** Login → Battle mit Bildern → Redirect → Bilder auf `/b/[slug]` sichtbar
5. **Report:** Melden → E-Mail an `REPORT_NOTIFY_EMAIL` (wenn Resend gesetzt)
6. **Admin:** `/admin/login` → Reports Offen/Alle → Erledigt/Schließen/Löschen
7. **IP-Dedup:** Zweiter Vote gleiche IP → blockiert

### Mobile (P1)

- Battle: Karten gestapelt, VS bewegt sich horizontal
- Header + Create-Formular bedienbar

### Performance (P2)

- Lighthouse mobile: `/` und `/b/[slug]` — Performance ≥ 80

### Monitoring

- **Sentry:** Fehler in Issues nach ~30s sichtbar

## Monitoring (wöchentlich)

- Vercel → **Logs**: `[observability:vote]`, 429-Spikes
- Sentry → ungelöste Issues
- Supabase → **Advisors** (Security)
- **Google Search Console** → indexierte Seiten, `/b/` Leistung, Sitemap-Status — siehe [`docs/google-search-console-playbook.md`](docs/google-search-console-playbook.md)
