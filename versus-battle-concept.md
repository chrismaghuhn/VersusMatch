# VersusApp — Concept

## Idee

Web-Tool auf dem User öffentliche Battle-Umfragen erstellen können.
Zwei oder mehr Optionen (Bilder, Text, Themen) gegeneinander — andere Leute voten per Link.
Viral durch Sharing, keine Registration zum Voten nötig.

---

## Kern-Features (V1)

- **Battle erstellen** — Titel + 2 Optionen (Bild-Upload oder Text), fertig
- **Shareable Link** — jeder mit dem Link kann voten, kein Account nötig
- **Live-Ergebnisse** — Votes erscheinen in Echtzeit (WebSockets)
- **Battle-Page** — schickes A vs B Layout, großes Voting, Ergebnis nach dem Vote sichtbar
- **Öffentliche Feed-Page** — alle aktiven Battles durchstöbern

---

## V2 Ideen

- Bracket-Format (8 oder 16 Optionen, Runden-System)
- Kommentare
- Battle-Kategorien (Memes, Design, Food, Gaming, Musik …)
- Embed-Code für andere Websites
- Creator-Profil mit allen eigenen Battles

---

## Monetarisierung

| Free | Pro (€4–6/mo) |
|------|---------------|
| A vs B Battles | Bracket-Format |
| Basis-Statistiken | Detaillierte Analytics |
| VersusApp-Branding | Eigenes Branding / kein Watermark |
| 5 Battles aktiv | Unbegrenzte Battles |
| Bild-Upload bis 2MB | Bild-Upload bis 10MB |

---

## Tech-Stack

| Bereich | Wahl |
|---------|------|
| Frontend | React + Tailwind |
| Backend | Node.js + Express |
| Realtime | WebSockets |
| Datenbank | PostgreSQL (Supabase) |
| Auth | Supabase Magic Link |
| Hosting | Vercel (Frontend) + Railway (Backend) |
| Uploads | Supabase Storage |

---

## User Flow

```
Creator:
1. Seite öffnen → "Battle erstellen"
2. Titel eingeben + 2 Bilder/Texte hochladen
3. Battle ist live → Link kopieren + teilen

Voter:
1. Link öffnen
2. A oder B klicken
3. Ergebnis sehen (live, mit Prozenten)
```

---

## Warum es funktioniert

- **Null Friction** — kein Account zum Voten, Link reicht
- **Viral Loop** — Creator teilt Link, Voter teilen Ergebnis weiter
- **Breite Zielgruppe** — Memes, Design-Feedback, Food, Gaming, alles möglich
- **Schnell gebaut** — V1 in 1–2 Wochen realistisch

---

## Name-Ideen

- **VersusApp**
- **BattleVote**
- **PickOne**
- **Duel.so**
- **Clashpoll**
