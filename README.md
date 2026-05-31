# VersusApp

Web-Tool für shareable A-vs-B Battle-Umfragen. Creator erstellen Battles, Voter stimmen ohne Account ab, Ergebnisse aktualisieren sich per Polling.

## Stack

- **Frontend:** Next.js 15, React, Tailwind CSS
- **Backend:** Next.js API Routes + Supabase
- **Datenbank:** PostgreSQL (Supabase)
- **Auth:** Supabase Magic Link
- **Storage:** Supabase Storage (`battle-images`)

## Setup

### 1. Dependencies installieren

```bash
npm install
```

### 2. Supabase-Projekt

Das Cloud-Projekt ist bereits in Vercel/Supabase konfiguriert. Migrationen liegen unter `supabase/migrations/`.

Falls du neu startest oder lokal arbeitest:

1. SQL aus `supabase/migrations/` im SQL Editor ausführen (Reihenfolge beachten)
2. Unter **Authentication → URL Configuration** die Site URL setzen (`http://localhost:3000` für lokal)
3. Redirect URLs hinzufügen: `http://localhost:3000/auth/callback`

### 3. Umgebungsvariablen

```bash
cp .env.local.example .env.local
```

`.env.local` ausfüllen:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
UPSTASH_REDIS_REST_URL=https://your-upstash-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
# Vercel Upstash integration uses KV_* instead of UPSTASH_*:
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

`SUPABASE_SERVICE_ROLE_KEY` = Supabase Secret Key (`sb_secret_...`), nur serverseitig — nie als `NEXT_PUBLIC_` setzen.

### 4. Entwicklungsserver starten

```bash
npm run dev
```

App läuft unter [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel)

1. Repo zu GitHub pushen
2. In Vercel importieren
3. Env-Variablen setzen (`NEXT_PUBLIC_APP_URL`, `SUPABASE_SERVICE_ROLE_KEY` mit `sb_secret_...`, Upstash/`KV_REST_API_*`)
4. In Supabase Auth die Production-URL + `/auth/callback` als Redirect eintragen

## Features (V1)

- Battle erstellen (Titel + 2 Optionen, Text oder Bild bis 2MB)
- Shareable Link `/b/[slug]`
- Anonymes Voten mit `localStorage` voter_token
- Live-Ergebnisse via Polling (`get_battle_results`)
- Öffentlicher Feed
- OG Meta Tags für Social Sharing

## Sicherheit

- Votes laufen nur über `/api/vote` mit Service-Role-RPC (nicht direkt aus dem Browser)
- Rate Limit via Upstash Redis + Origin/`Sec-Fetch-Site`-Checks
- Geschlossene Battle-Ergebnisse bleiben absichtlich öffentlich abrufbar (`get_battle_results`)

## Hinweise

- **Vote-Dedup:** Ein Browser = ein Vote. Incognito/Browser-Wechsel umgeht den Schutz (V1 akzeptabel).
- **Free Limit:** Max. 5 aktive Battles pro Creator.
