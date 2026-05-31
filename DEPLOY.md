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
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Optional: Cloudflare Turnstile |
| `TURNSTILE_SECRET_KEY` | Optional: Turnstile server verify |
| `SENTRY_DSN` | Optional: Error tracking |

## Supabase Migrationen

Reihenfolge in `supabase/migrations/` — alle applied auf Cloud-Projekt.

## Monitoring

- Vercel → Project → **Logs** (Runtime)
- Vote-Fehler: Filter `[vote]` / `[observability:vote]`
- Supabase Dashboard → **Advisors** (Security)
