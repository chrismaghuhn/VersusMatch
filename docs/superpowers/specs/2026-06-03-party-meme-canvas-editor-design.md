# MemeFight Party — Meme Canvas Editor (P2.5)

**Date:** 2026-06-03  
**Status:** P2.5a shipped on branch `feat/party-meme-canvas-p25` (not production yet)  
**Phase:** P2.5 — post–Caption Studio (P2)  
**Depends on:** P2 Caption Studio (`caption_rich` v2, shared renderer, Arena caption UI)  
**Parent spec:** [`2026-06-03-meme-party-live-design.md`](2026-06-03-meme-party-live-design.md)  
**Supersedes (partial):** P2 Non-Goal “Free drag / resize” → in scope here when Canvas Mode enabled

## Goal

Turn the caption phase into a **meme canvas editor** when the host opts in:

- **A:** Drag and resize **template text boxes** on the image  
- **B:** Add up to **+2 custom text boxes** anywhere on the image  

Without Canvas Mode, behavior stays **identical to P2** (fixed template boxes, 60s caption timer).

## Success Criteria

- Host can enable **Canvas Editor** at room create → caption phase **90s** (vs 60s default)
- Template boxes move/resize within validated bounds; custom boxes add/remove with limits
- **Same renderer** across editor preview, voting cards (`card` density), reveal, ShareCard PNG (`export`)
- Submit stores **CaptionDocument v3** in `caption_rich`; plain `caption` column unchanged (`\n` join)
- **Reroll** clears layout + custom boxes **server-side**; client resets on `layout_revision` bump
- Submit rejects stale/manipulated documents via **mandatory `layout_revision`**
- Legacy v2 submissions and rooms without Canvas Mode display unchanged
- Reroll with custom boxes shows **confirmation dialog** before RPC

## Non-Goals (this spec)

| Item | Deferred |
|------|----------|
| Per-player server deadlines (`party_player_deadlines`) | P2.5c if client timer freeze insufficient |
| Server-side layout grace (`party_caption_layout_grace`) | P2.5c — room-level `phase_ends_at` extension unfair to finished players |
| User-uploaded meme images | Phase 3 |
| Custom fonts / text colors / stroke color | Later |
| Free rotation (degrees) as primary control | Later (skew from P2 remains) |
| Zoom/pan entire meme canvas | Out of scope |
| Undo/redo | P2.5b (custom boxes sprint) |

---

## Problem Statement

P2 Caption Studio fixed text **inside DB-defined boxes** (`text_boxes.x/y/w/h`). Players cannot:

1. Nudge text when template zones feel wrong for their joke  
2. Add an extra label/speech bubble outside template panels  
3. Get enough time to use drag tools under the 60s room timer  

Voting grid cards (~230px) will also break if arbitrary layouts render at editor scale.

---

## Room Settings (Host Create)

Add columns on `party_rooms`:

| Column | Type | Default | Detail |
|--------|------|---------|--------|
| `canvas_editor_enabled` | `boolean` | `false` | Enables drag, resize, custom boxes |
| `caption_duration_seconds` | `smallint` | `60` | `60` when canvas off; **`90` when canvas on** (set atomically in `party_create_room`) |

**Host UI (Create flow):** Toggle “Canvas Editor (move text + extra boxes)” with helper text: “90s caption timer · advanced layout”.

**RPC:** Extend `party_create_room(p_round_count, p_rerolls_per_player, p_canvas_editor_enabled default false)`:

- If `p_canvas_editor_enabled` → `caption_duration_seconds := 90`, else `60`
- Canvas cannot be toggled mid-game

**Phase timer:** Wherever caption phase sets `phase_ends_at` (start game, advance to next round), use:

```sql
phase_ends_at := now() + (v_room.caption_duration_seconds * interval '1 second')
```

Replace hardcoded `interval '60 seconds'` for caption phase only.

---

## Timer & Layout Interaction

### Decision: client-only timer freeze (P2.5a)

`phase_ends_at` is **room-level**. Extending it while one player drags unfairly delays players who already submitted.

| Approach | P2.5 | Notes |
|----------|------|-------|
| Client countdown freeze while handle active | **Yes (P2.5a)** | UI pauses display during drag/resize; **server clock unchanged** |
| `party_caption_layout_grace` → extend `phase_ends_at` | **No** | Deferred **P2.5c** |
| Per-player deadlines table | **No** | Deferred **P2.5c** |

**Client behavior:**

- `PartyPhaseTimer` accepts `frozen?: boolean` from canvas editor hook  
- `frozen === true` when pointer/touch down on drag handle or resize handle  
- Frozen display shows last computed `secondsLeft`; resumes on pointer up  
- Optional subtle “layout mode” hint — no claim that server time stopped  

**Revisit P2.5c if:** playtests show >20% of canvas rooms timeout mid-layout with complaints.

---

## Data Model — CaptionDocument v3

```ts
type BoxLayout = {
  x: number;   // 0..1, relative to image width
  y: number;   // 0..1, relative to image height
  w: number;   // 0..1 min 0.08
  h: number;   // 0..1 min 0.06
  align?: "left" | "center" | "right";
};

type CaptionBox = {
  id: string;              // template box id or "custom-1", "custom-2"
  kind: "template" | "custom";
  templateIndex?: number;  // 0..n-1 when kind === "template"
  segments: CaptionSegment[];
  layout: BoxLayout;
};

type CaptionDocument = {
  v: 3;
  layoutRevision: number;  // must match party_player_rounds.layout_revision at submit
  rawTexts: string[];        // per-box field text for draft restore; submit uses finalized segments in boxes
  boxes: CaptionBox[];
};
```

**Backward compatibility:**

| Version | Read path |
|---------|-----------|
| v2 | Template DB layout; boxes[i] = segments only |
| v3 | Use `box.layout`; template defaults when migrating editor state |
| null / legacy pipe | Unchanged P1 path |

**Plain text:** Unchanged — `serializeCaptionPlain(doc)` joins non-empty box text with `\n` (ignore layout).

### Box count rules (submit validation)

| Rule | Value |
|------|-------|
| Template boxes in document | **Exactly** `template.text_boxes.length` entries with `kind: "template"` |
| Custom boxes | 0..2 |
| Total boxes | ≤ 6 |
| Empty boxes | Allowed (not rendered); no chars counted |
| Char budget | 1..120 plain chars total (non-empty segments) |

### Layout validation (server + client)

- `0 <= x,y <= 1`, `w >= 0.08`, `h >= 0.06`, `x+w <= 1`, `y+h <= 1`  
- Reject NaN / missing layout on v3 submit  

---

## Server Draft & Security — `layout_revision` (mandatory)

### Columns on `party_player_rounds`

| Column | Type | Detail |
|--------|------|--------|
| `caption_draft` | `jsonb` | Nullable v3 draft; debounced sync from client |
| `layout_revision` | `smallint` | Starts `0`; **increment on every successful reroll** for that player/round |

### RPC: `party_sync_caption_draft(p_room_id, p_draft jsonb, p_layout_revision int)`

- Phase must be `caption`; caller must be room member  
- Reject if `p_layout_revision <> layout_revision` on row → `{ ok: false, error: "stale_revision" }`  
- Validate draft shape (v3, bounds, box counts) lightly — full validation on submit  
- Upsert `caption_draft = p_draft`  
- Require `(p_draft->>'v')::int = 3`, matching `layoutRevision`, and `rawTexts` array length = `boxes` array length

**Debounce:** Draft sync runs **after** the 500ms syntax preview debounce (chained), then waits 2s — not on a separate 2s timer from raw keystrokes. Immediate sync after reroll response.

### RPC: `party_reroll_template` (extend)

After picking new template:

```sql
UPDATE party_player_rounds
SET template_id = v_template,
    caption_draft = NULL,
    layout_revision = layout_revision + 1
WHERE room_id = p_room_id AND user_id = v_uid AND round = v_room.current_round;
```

Return `{ ok, template_id, layout_revision }`.

### RPC: `party_submit_caption` (extend)

Accept v2 (canvas off or legacy) **and v3** (canvas on):

When `canvas_editor_enabled` on room:

- Require `caption_rich.v = 3`  
- Require `caption_rich.layoutRevision = party_player_rounds.layout_revision` for submitting user — **reject with `stale_revision` if mismatch** (mandatory; not optional)  
- Validate box/template/custom rules and layout bounds  
- On success: insert submission; **clear `caption_draft`** on player round row  

When canvas off:

- Keep existing v2 rules (unchanged from P2 migration)

### Client: reroll race handling (mandatory)

Track last applied revision in a **`useRef`**, not React state (avoids double effect runs when comparing revision).

On snapshot poll **or** reroll RPC response:

```ts
if (snapshot.layoutRevision !== layoutRevisionRef.current) {
  layoutRevisionRef.current = snapshot.layoutRevision;
  resetEditorState({
    rawTexts: snapshot.captionDraft?.rawTexts,
    boxes: snapshot.captionDraft?.boxes,
    layoutRevision: snapshot.layoutRevision,
  });
}
```

**Do not rely on `caption_draft === null` alone** — debounced sync may have left local React state ahead of server. **`layout_revision` bump is the authoritative reset signal.** Restore textarea content from `rawTexts`, layouts from `boxes[].layout`.

---

## Reroll UX — Custom box confirmation

When user taps Reroll and local state has any `kind: "custom"` box with text **or** any custom box exists:

> **Reroll tauscht dein Meme** und entfernt alle Custom-Texte. Das Layout wird zurückgesetzt.  
> [Abbrechen] [Trotzdem rerollen]

Skip dialog when no custom boxes (template-only layout adjustments lost on new template — acceptable; optional softer hint in P2.5b).

---

## Renderer — `density` modes (mandatory for voting)

Extend `PartyTemplateFrame` (and shared layout helper):

```ts
type FrameDensity = "editor" | "card" | "export";
```

| Density | Use | Behavior |
|---------|-----|----------|
| `editor` | Caption phase | Full size; interactive handles overlay |
| `card` | `SubmissionCard` voting/reveal grid | **Fit-to-frame** (see below) |
| `export` | ShareCard PNG | Pixel-accurate match to editor |

### `card` density algorithm

1. Collect non-empty boxes with layouts  
2. Compute union rect in normalized coords  
3. `scale = min(cardInnerW/unionW, cardInnerH/unionH, 1) * 0.92`  
4. Transform all box positions/sizes by scale; center union in frame  
5. `baseFontSize` multiplied by `scale`; floor **8px**  

**P2.5b gate:** Custom boxes ship only after `card` density is implemented and manually verified on 230px cards.

`SubmissionCard` passes `density="card"`. Editor passes `density="editor"`. ShareCard passes `density="export"`.

---

## Editor UX

### Canvas interactions (when `canvas_editor_enabled`)

- Tap/click box → **active box** (highlight + corner resize handle)  
- Drag inside box → move `layout.x/y` (clamped)  
- Drag corner handle → resize `layout.w/h` (min sizes)  
- **+ Text** button → append custom box (centered default layout); focus textarea  
- **Delete** on active box when `kind === "custom"` only  
- **Reset layout** → restore template defaults for template boxes; remove custom boxes  
- Textarea + toolbar (P2) apply to **active box**  
- Undo/redo: **P2.5b** (layout + text actions, stack depth 10)

### Mobile

- 44px touch targets on handles  
- No whole-canvas pinch zoom  
- Same active-box model  

### Empty template boxes

Allowed — player may use only bottom panel on Drake; empty boxes not rendered.

---

## Snapshot additions

`PartySnapshot` / `buildPartySnapshot` includes for current user in caption phase:

```ts
canvasEditorEnabled: boolean;
captionDurationSeconds: number;
layoutRevision: number;
captionDraft: CaptionDocument | null;  // v3 or null
```

All clients need `canvasEditorEnabled` for UI; only `isYou` player receives draft + revision (or entire snapshot is per-user already via auth — draft only on own row in `party_player_rounds` query).

---

## Phased Delivery

### P2.5a — Layout + infrastructure (~3–4 days)

- DB migration: room columns, `caption_draft`, `layout_revision`  
- `party_create_room`, caption `phase_ends_at` from `caption_duration_seconds`  
- CaptionDocument v3 types + validation helpers  
- `party_sync_caption_draft`, `party_submit_caption` v3 path, `party_reroll_template` revision bump  
- Drag/resize **template boxes only** (no custom boxes yet)  
- `density="card"` on SubmissionCard + fit algorithm  
- Client timer freeze during handle interaction  
- Snapshot `layoutRevision` + draft; **reset editor on revision change**  
- Host create toggle  

### P2.5b — Custom boxes + polish (~2–3 days)

- + Text / Delete custom  
- Reroll confirmation dialog  
- Undo/redo  
- Manual QA: voting card readability, reroll race, PNG parity  

### P2.5c — Optional (only if needed)

- Per-player caption deadlines **or** fair server grace  
- Based on playtest data from P2.5a/b  

---

## File Map (implementation)

| File | Responsibility |
|------|----------------|
| `supabase/migrations/202606XX_party_canvas_editor.sql` | Schema + RPC updates |
| `lib/party/caption-rich/types.ts` | v3 types, v2 compat |
| `lib/party/caption-rich/layout.ts` | Bounds, defaults from template, fit-to-card |
| `lib/party/caption-rich/validate-document.ts` | Shared client/server rules |
| `lib/party/caption-rich/legacy-read.ts` | v2/v3 read paths |
| `lib/party/snapshot.ts` | Draft, revision, canvas flags |
| `lib/supabase/party-rpc.ts` | sync draft, create room arg |
| `components/brutal/party/caption-studio/use-meme-canvas-editor.ts` | Layout state, revision reset, freeze signal |
| `components/brutal/party/caption-studio/MemeCanvasOverlay.tsx` | Handles, drag/resize |
| `components/brutal/party/shared/PartyTemplateFrame.tsx` | `density`, v3 layouts |
| `components/brutal/party/shared/PartyPrimitives.tsx` | `SubmissionCard` → `density="card"` |
| `components/brutal/party/screens/HostOnboarding.tsx` | Canvas toggle |
| `scripts/test-caption-layout.mjs` | Layout validation + fit tests |

---

## QA Checklist

- [ ] Canvas off → identical to P2 (60s, v2 submit, no handles)  
- [ ] Canvas on → 90s caption timer on room create  
- [ ] Drag template box → voting card readable at 230px (`card` density)  
- [ ] +2 custom boxes max; 3rd rejected client + server  
- [ ] Reroll with custom → dialog → draft null + revision bump → local state resets immediately  
- [ ] Submit with old `layoutRevision` → `stale_revision` error  
- [ ] Manipulated submit with custom boxes after reroll without revision → rejected  
- [ ] Timer display freezes during drag; server still advances (finished player not blocked extra)  
- [ ] ShareCard PNG matches editor (`export` density)  
- [ ] Legacy v2 room replay unchanged  

---

## Revision Log

| Date | Change |
|------|--------|
| 2026-06-03 | Initial spec: v3 layout, canvas mode, A+B scope |
| 2026-06-03 | Timer: client-only freeze; no room-level grace in P2.5a |
| 2026-06-03 | `layout_revision` mandatory for submit security |
| 2026-06-03 | Reroll reset via revision bump + client reset (draft race) |
| 2026-06-03 | `card` density mandatory before custom boxes (P2.5b gate) |
| 2026-06-03 | Plan review: layoutRevision ref; v3 rawTexts; chained draft debounce; validate without canvas flag |

---

## Approval Log

| Section | Status |
|---------|--------|
| P2.5a template drag + infra | Approved |
| P2.5b custom boxes + reroll dialog | Approved |
| Timer client-freeze only (P2.5a) | Approved |
| `layout_revision` mandatory | Approved |
| Server draft clear on reroll | Approved |

**Next step:** Execute [`docs/superpowers/plans/2026-06-03-party-meme-canvas-editor.md`](../plans/2026-06-03-party-meme-canvas-editor.md) — P2.5a → P2.5b.
