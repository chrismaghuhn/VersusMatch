# MemeFight Party — Manual QA Checklist

**Production status:** `PARTY_ENABLED=true` on memefight.lol (verified **2026-06-01** — create, join, start, full round flow).

Use this checklist when changing party RPCs, Realtime, or UI. Run with at least **two** logged-in test accounts (two browsers or profiles).

## Prerequisites

- `npm run typecheck` and `npm run test:party-handle` pass
- Caption/canvas scripts (2026-06-02): `test:caption-rich`, `test:caption-layout`, `test:caption-fields`, `test:party-guess-author`, `test:party-reveal-theatre`, `test:party-modifiers` — all green
- Supabase migrations applied through **`20260608120000_party_canvas_editor`** (production VersusApp)
- **20** licensed templates in Supabase Storage (`node scripts/extract-party-templates.mjs` → `node scripts/upload-party-templates.mjs`; see `assets/party-templates/import/LICENSE`)
- UI copy: `lib/party/copy.ts` (English)

---

## Core flow

- [x] **Create lobby** — `/party` → choose 3/5/7 rounds **and rerolls (0…rounds)** → Create → lands in room with 6-char code
- [x] **Join lobby** — second browser: enter code or open `/party/join/CODE` → player appears on host without full page reload (Realtime or poll within ~3s)
- [x] **Second player (min start)** — host + one guest → host can start game (2-player minimum)
- [x] **Start game** — host Start Game → phase `caption`, **each player sees a different** template image
- [x] **Caption phase** — Top/Bottom fields; locked state after submit; timer advances phase when expired
- [x] **Reroll** — with rerolls > 0: reroll changes meme preview; text kept; hint banner shown; budget decrements; 3rd reroll when max=2 fails (inline `rerollNoBudget` message)
- [x] **Voting phase** — each card shows **that player's meme** + caption; **self-vote allowed**
- [x] **Reveal** — vote counts shown; scores update on players
- [x] **Finished** — after final round: leaderboard, tie handling, **ShareCard** (copy link, copy tweet, Twitter intent opens with correct room code)

---

## Full game

- [x] **2-player game** — full round flow with exactly 2 players (production smoke test 2026-06-01)
- [ ] **5-round game** — play through all rounds; templates vary per player per round
- [ ] **8-player round 2 uniqueness** — with 8 players in round 2, all templates differ within that round (pool reset edge case)
- [ ] **Leave lobby** — non-host leaves before start → returns to `/party`; host leaves → next player becomes host; last player leaves → room abandoned
- [ ] **Retract caption** — after submit, unlock/edit caption before phase ends
- [ ] **Retract vote** — after vote, change vote before phase ends
- [x] **Early advance** — when all players ready in caption/vote, phase advances without waiting for full timer (retry + phase-change detection in `try-advance-phase.ts`)

---

## Auth & onboarding

- [ ] **Join after login** — logged-out user opens `/party/join/XXXXXX` → login → returns to join flow → lands in lobby
- [ ] **Onboarding interrupt** — user without profile redirected to `/onboarding?returnTo=...` → save profile → returns to party URL

---

## Security & API

- [ ] **Caption secrecy** — during `caption` phase, `GET /api/party/rooms/[id]` returns only **your** submission in `submissions` (not peers' captions)
- [ ] **Profanity** — caption with blocked word rejected (409 `profanity_rejected`) via API and direct RPC path
- [ ] **Rate limits (optional)** — 6th room create within 1 hour → `rate_limited`; 11th distinct join within 1 minute → `rate_limited`

---

## Polish & errors

- [x] **Tutorial** — first `/party` visit shows overlay with canvas/W-B/pill/ShareCard copy; reload or after dismiss (`memefight_party_tutorial_v1`) → no overlay
- [ ] **Tutorial vs error** — `/party?error=bad_code` shows error card only, **no** tutorial overlay
- [ ] **Error join** — full room → `room_full`; invalid code → `bad_code`
- [ ] **Error solo** — all others leave mid-game → `everyone_left` only after ~2s debounce (no flash on reconnect)
- [ ] **Header nav** — **PARTY** in site header links to `/party`
- [ ] **Mobile layout** — caption/vote/reveal: bottom CTA, meme fills screen on phone width (< lg / 1024px)
- [ ] **Desktop layout (lg+)** — at 1280px: Arena PartyLayout, composited glow background, voting grid with regular card density (`minmax(230px, 1fr)`); mobile swipe UI unchanged below lg

---

## Share & polish

- [x] **ShareCard copy link** — clipboard contains `…/party/join/CODE`
- [x] **ShareCard Twitter** — intent URL includes room code and join URL
- [x] **ShareCard PNG** — Download PNG saves `memefight-party-CODE.png` with meme + winner text (1200×675); see **P2.6a ShareCard PNG** rows for stroke/pill assertions (not visual-only)
- [ ] **Footer nav** — **Party** in site footer PRODUCT column; **Credits** link in footer bar → `/credits`
- [ ] **Credits page** — `/credits` lists Party meme template attribution (20 templates + Meme Archive License)
- [ ] **Party disabled** — `PARTY_ENABLED=false` → party API returns **503** (preview/staging only)

---

## P2 Caption Studio (rich captions)

Verified on Production **2026-06-01** — full round with styled captions.

- [x] **Leading/trailing spaces** — type `" hello "` → renders correctly after submit (voting + reveal)
- [x] **Internal spaces** — two spaces mid-line preserved in preview and voting card
- [x] **Multi-line box** — Shift+Enter in a field; text wraps in live preview without clipping
- [x] **4-panel meme** — template with 4 text boxes shows 4 inputs; all boxes render in voting
- [x] **Toolbar Schräg** — toggle matches `~text~` syntax on same selection
- [x] **Sync submit parse** — submit `~hello` immediately (no debounce wait) → DB has slant segment, not literal tildes
- [x] **ShareCard PNG parity** — finished/download PNG shows same skew/scale as voting card (desktop finished PNG re-enabled)
- [x] **Legacy pipe replay** — room with old `top|bottom` pipe captions (no `captionRich`) still displays correctly

---

## P2.5 Meme Canvas Editor

Branch `feat/party-meme-canvas-p25` — `npm run typecheck`, `test:caption-fields`, `test:caption-rich`, `test:caption-layout` pass; manual verification pending before merge/deploy.

- [ ] **Canvas off** — create room without Canvas Editor toggle → caption phase **60s**, fixed template boxes, v2 submit path unchanged (identical to P2 Caption Studio)
- [ ] **Canvas on** — create room with Canvas Editor enabled → caption phase **90s** timer; overlay handles visible on meme
- [ ] **Drag template box** — canvas on: drag a template text box within bounds; preview updates live
- [ ] **Resize template box** — canvas on: resize via handle; layout clamped to image bounds (no overflow past edges)
- [ ] **WYSIWYG layout** — submit offset/resized layout in caption editor → desktop voting grid and reveal show text at the **same positions** as the editor (no fit-to-card shift); ShareCard PNG matches
- [ ] **Custom boxes** — **+ Text** adds custom box (max 2); 3rd add rejected in UI; delete removes active custom box only
- [ ] **Reset layout** — restores template box defaults and removes all custom boxes
- [ ] **Reroll dialog** — canvas on with custom boxes + rerolls: reroll shows confirmation; confirm → new meme, custom boxes gone, layout reset
- [ ] **Reroll revision** — after reroll, `layout_revision` bumps; editor state resets immediately (draft cleared server-side)
- [ ] **Undo / redo** — Ctrl+Z / Ctrl+Shift+Z (desktop) or toolbar buttons restore layout + text (stack depth 10)
- [ ] **Timer freeze** — countdown display pauses during drag/resize; phase still advances on server when timer expires
- [ ] **stale_revision** — submit with outdated `layoutRevision` (e.g. after reroll in another tab) → API/RPC error `stale_revision`
- [ ] **ShareCard PNG** — finished/download PNG matches editor layout (`density="export"`)
- [ ] **Legacy v2 replay** — canvas-off room or old v2 `caption_rich` submissions display unchanged in voting/reveal

---

## P2.6a Canvas readability (fill + pill)

Branch `feat/p2.6a-canvas-readability` — `node --experimental-strip-types --test scripts/test-caption-rich.mjs scripts/test-caption-layout.mjs scripts/test-caption-fields.mjs` pass.

- [x] **Black text on light meme** — canvas on: active box **B** → black fill readable on bright template area in editor
- [x] **Pill background** — **Pill** toggle → semi-transparent bar behind text in editor preview
- [x] **Selection W/B** — highlight word in field → CaptionToolbar **W** / **B** overrides box default for that run only
- [x] **WYSIWYG colors** — submit with black fill and/or pill → desktop voting and reveal match editor (`PartyTemplateFrame` + `CaptionSegments` on all surfaces)
- [x] **ShareCard PNG — white fill stroke** — export density uses text-shadow-only stroke (`strokeMode=export`) for `html-to-image`; zoom 200%: black outline around white text
- [x] **ShareCard PNG — black fill stroke** — box **B**: white outline via export stroke layers in PNG
- [x] **ShareCard PNG — pill** — pill bar (`rgba(0,0,0,0.55)`) present in PNG
- [ ] **ShareCard PNG — engines** — repeat stroke checks on **Chrome desktop** + **Safari iOS** (or one WebKit mobile); file bug if stroke missing on either *(smoke on deploy)*
- [x] **Legacy v3 without style** — old submission with no `box.style` still renders white text with black outline
- [x] **Undo/redo fill/pill** — box **W** / **B** / **Pill** changes undo/redo; toolbar W/B pushes undo stack; `snapshotsEqual` covers fill/pill

---

## P2.6b Canvas layout QoL

- [x] **Tap select** — tap text box on meme selects it without scrolling to textarea
- [x] **Tap deselect** — tap empty meme area clears selection (handles hidden)
- [x] **Align L/C/R** — updates `layout.align` on active box
- [x] **Snap ↔ / ↕** — centers active box horizontally / vertically
- [x] **Preview (peek)** — toggles handles off; meme preview matches submit WYSIWYG
- [x] **Z-order on select** — selecting overlapping box brings it to front; render sorted by `z`
- [x] **Undo/redo layout** — align, snap, z, drag/resize captured in undo stack

---

## Sprint 3 — Early advance (B1 verification)

`phaseTransitioning` and early-advance hooks **already exist** in `party-room-client.tsx` — Sprint 3 added retry-on-not-ready in `try-advance-phase.ts`.

- [x] **Caption all-ready** — 2 players, both lock in caption → status shows `Everyone's ready — voting starts…` (or `captionPhaseChanging` during advance); voting phase within ~3s without waiting full timer
- [x] **Vote all-ready** — 2 players, both vote → `Everyone voted — results incoming…`; reveal within ~3s
- [x] **Copy on mobile** — same all-ready / phase-changing strings visible in `PartyMobileShell` status line
- [x] **Copy on desktop** — same strings in `PartyDesktopCaption` / `PartyDesktopVoting`
- [x] **Buttons locked during advance** — unlock caption / change vote disabled while `phaseTransitioning` (no double-submit)

---

## Sprint 3 — Reroll (B2)

- [x] **Hint banner** — after reroll, `rerollDraftHint` shown; dismisses on edit or after 5s
- [x] **Budget label** — `N rerolls left` on button when budget > 0
- [x] **Custom box confirm** — canvas on + custom boxes → EN confirm dialog before reroll
- [x] **No budget** — inline `rerollNoBudget` when API returns `no_rerolls_left` (not silent / full-room error)

---

## Sprint 3 — Tutorial (B4)

- [x] **Slide 02** — mentions canvas editor (90s), W/B/pill, standard 60s, rerolls
- [x] **Slide 04** — mentions ShareCard copy link + PNG download
- [x] **Storage key** — `memefight_party_tutorial_v1` unchanged (no re-show for returning users)

---

## Wave 1 Parallel

| # | Case | Pass |
|---|------|------|
| W1 | Host rematch -> lobby, scores 0, same code | ☐ |
| W1 | After rematch, canvas editor fresh (`layout_revision` 0, no stale draft) | ☐ |
| W1 | Non-host cannot rematch | ☐ |
| W1 | Reveal reactions fire + show burst | ☐ |
| W1 | Reactions blocked during voting | ☐ |
| W1 | Chaos round: three_words rejects 4th word | ☐ |
| W1 | Chaos all_caps: CSS caps-only rejected; literal uppercase passes | ☐ |
| W1 | Chaos off: no banner, normal submit | ☐ |
| W1 | Logged-out join URL shows teaser (lobby open) | ☐ |
| W1 | Teaser -> login -> lands in room (lobby open) | ☐ |
| W1 | Join URL during in_progress: waiting UI, no join RPC, no false CTA | ☐ |
| W1 | After rematch, join URL CTA active again | ☐ |
| W1 | Recap page loads when finished | ☐ |
| W1 | Recap 404 / message when in progress | ☐ |
| W1 | Copy recap link from ShareCard | ☐ |
| W1 | Finished screen shows public recap disclosure | ☐ |
| W1 | Caption progress copy visible | ☐ |

---

## Wave 2.5 — Lobby warmup polls

| # | Case | Pass |
|---|------|------|
| W25 | Waiting lobby shows warmup poll question + 3 options | ☐ |
| W25 | Vote updates tallies for all players within ~3s | ☐ |
| W25 | One vote per player; changing vote updates tally | ☐ |
| W25 | Poll hidden after host starts game | ☐ |
| W25 | Poll returns on rematch to waiting lobby | ☐ |

Spec: [`docs/superpowers/specs/2026-06-04-party-wave-2.5-lobby-polls-design.md`](superpowers/specs/2026-06-04-party-wave-2.5-lobby-polls-design.md)

---

## Bulk template staging

| # | Case | Pass |
|---|------|------|
| BULK | `node scripts/bulk-import-party-templates.mjs --dry-run --write-review` → ~522 importable rows in `bulk-review.csv` | [x] |
| BULK | License gate documented in [`docs/party-templates-license.md`](party-templates-license.md) | [x] |
| BULK | Pilot import `--max=50 --active=false` (optional before mass upload) | ☐ |
| BULK | `--activate-reviewed` only flips approved manifest rows | ☐ |
| BULK | Live pool count matches `active=true` rows (no “500+” marketing until verified) | ☐ |

---

## P2.6c — Emoji layer

- [x] **+ Emoji** adds one emoji box; second rejected
- [x] **Allowlist picker** — 12 emoji; tap sets box text
- [x] **No textarea** for emoji row — picker only
- [x] **WYSIWYG** — native emoji render in editor (no Impact stroke)
- [ ] **Voting/reveal/ShareCard** — emoji visible on all surfaces (manual)
- [ ] **Validation** — non-allowlist emoji rejected on submit

---

## Wave 2 Parallel

| # | Case | Pass |
|---|------|------|
| W2 | Create room: Author Guess toggle default ON | ☐ |
| W2 | Create room: Author Guess OFF -> no guess phase, voting -> reveal | ☐ |
| W2 | Guess ON: winning meme anonymous during guess | ☐ |
| W2 | Winner author cannot guess; sees locked copy | ☐ |
| W2 | Correct guess -> +1 score on reveal | ☐ |
| W2 | All eligible guessed -> early advance to reveal | ☐ |
| W2 | Only 1 submission -> skip guess | ☐ |
| W2 | Rematch preserves Author Guess setting | ☐ |
| W2 | Double advance from guess does not double-award score | ☐ |
| W2 | Tie screen ~3s when 2+ memes share top votes and top count > 0 | ☐ |
| W2 | No tie screen when top memes are tied at 0 votes (straight to guess/reveal) | ☐ |
| W2 | Player scores unchanged during tie; update after tie ends | ☐ |
| W2 | Room advances from tie/guess when all tabs backgrounded (cron ~15s) | ☐ |
| W2 | Tie winner is stable across refreshes/clients | ☐ |
| W2 | Guess snapshot does not expose winner userId/handle before reveal | ☐ |
| W2 | Winner author cannot submit RPC guess even by manual request | ☐ |
| W2 | Reveal Theatre: PHOTO FINISH on 1-vote margin | ☐ |
| W2 | Reveal Theatre: LANDSLIDE / UNANIMOUS spot check | ☐ |
| W2 | Recap OG image loads (social debugger / tab preview) | ☐ |
| W2 | Recap OG fallback when game not finished | ☐ |

---

## Lobby settings + kick

Branch `feat/party-lobby-settings-kick` — `npm run typecheck`, `test:party-lobby-settings`, `test:party-rpc-parse` pass; manual verification pending before merge/deploy.

Spec: [`docs/superpowers/specs/2026-06-02-party-lobby-settings-kick-design.md`](superpowers/specs/2026-06-02-party-lobby-settings-kick-design.md)

| # | Case | Pass |
|---|------|------|
| LS | Create room from `/party` — no settings form; lands in lobby with defaults | ☐ |
| LS | Host changes caption 75s, vote 45s, max 4, saves — guests see updates | ☐ |
| LS | Host sets max 4 with 6 players — save rejected with clear message | ☐ |
| LS | Host kicks guest (no ban) — guest sees **`kicked`** on next poll (not generic Forbidden); redirected to `/party` | ☐ |
| LS | Host kicks with block — guest sees **`kicked`**; re-join shows **`banned_from_room`** | ☐ |
| LS | Start game — settings locked; timers match saved values in caption/vote | ☐ |
| LS | Rematch — same settings in lobby (play game → rematch → values unchanged) | ☐ |
| LS | **Settings persist after rematch** — host sets caption 75s / vote 45s / max 6 → play full game → rematch → lobby still shows same values | ☐ |
| LS | **Never joined** — open room URL without join → `not_in_room`, not kick copy | ☐ |
| LS | **Never-member GET** — user opens `/party/room/{id}` without having joined → `not_in_room`, not kick copy | ☐ |

---

## Notes

Record room IDs, browser versions, and any console/network errors when filing bugs.

Spec reference: [`docs/superpowers/specs/2026-06-03-meme-party-live-design.md`](superpowers/specs/2026-06-03-meme-party-live-design.md) — Open Items in Section L.

Analytics report (service role): `npm run party:analytics` (optional `-- 30` for 30-day window).
