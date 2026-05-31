# VersusApp

Web-Tool für shareable A-vs-B Battle-Umfragen. Creator erstellen Battles, Voter stimmen ohne Account ab, Ergebnisse aktualisieren sich live.

## Stack

- **Frontend:** Next.js 15, React, Tailwind CSS
- **Backend:** Next.js API Routes + Supabase
- **Datenbank:** PostgreSQL (Supabase)
- **Auth:** Supabase Magic Link
- **Realtime:** Supabase Realtime
- **Storage:** Supabase Storage (`battle-images`)

## Setup

### 1. Dependencies installieren

```bash
npm install
```

### 2. Supabase-Projekt

Das Cloud-Projekt **VersusApp** (`srimmoqxrbwxlyyfgdhs`, eu-central-1) ist bereits angelegt und die Migration ist applied.

Falls du neu startest oder lokal arbeitest:

1. SQL aus `supabase/migrations/20260531120000_init.sql` im SQL Editor ausführen (falls noch nicht geschehen)
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
```

### 4. Entwicklungsserver starten

```bash
npm run dev
```

App läuft unter [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel)

1. Repo zu GitHub pushen
2. In Vercel importieren
3. Env-Variablen setzen (`NEXT_PUBLIC_APP_URL` = Production-URL)
4. In Supabase Auth die Production-URL + `/auth/callback` als Redirect eintragen

## Features (V1)

- Battle erstellen (Titel + 2 Optionen, Text oder Bild bis 2MB)
- Shareable Link `/b/[slug]`
- Anonymes Voten mit `localStorage` voter_token
- Live-Ergebnisse via Supabase Realtime
- Öffentlicher Feed
- OG Meta Tags für Social Sharing

## Hinweise

- **Vote-Dedup:** Ein Browser = ein Vote. Incognito/Browser-Wechsel umgeht den Schutz (V1 akzeptabel).
- **Free Limit:** Max. 5 aktive Battles pro Creator.
