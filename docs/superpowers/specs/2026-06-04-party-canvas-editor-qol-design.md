# MemeFight Party — Canvas Editor QoL (P2.6)

**Date:** 2026-06-04  
**Status:** Approved — P2.6a implementation plan ready  
**Phase:** P2.6 — post–Meme Canvas Editor (P2.5)  
**Depends on:** P2.5 Canvas Editor (CaptionDocument v3, `use-meme-canvas-editor`, WYSIWYG render)  
**Parent spec:** [`2026-06-03-party-meme-canvas-editor-design.md`](2026-06-03-party-meme-canvas-editor-design.md)  
**Supersedes (partial):** P2.5 Non-Goal “Custom fonts / text colors / stroke color → Later” → **white/black fill in scope (P2.6a)**

## Goal

Close the biggest usability gaps in the Party meme canvas editor (“Memeitor”):

1. **Readability** — white Impact text on bright meme areas is unreadable (most common complaint)
2. **Layout QoL** — faster box positioning under 90s timer; overlap handling for custom boxes
3. **Expression** — emoji as a first-class layer (optional P2.6c)

All changes extend **CaptionDocument v3** in `caption_rich` JSONB. **No DB migration.**

## Success Criteria

- **P2.6a:** Player can toggle white/black text per box and per selection; optional pill background; readable on light templates; identical in editor, voting, reveal, ShareCard PNG
- **P2.6b:** Tap meme to select box; tap empty to deselect; align L/C/R; center snap H/V; peek preview without handles; z-order for overlapping boxes
- **P2.6c:** One emoji box with picker; WYSIWYG in all render paths
- Legacy v3 docs without `style`/`z`/`emoji` render unchanged (white text default)
- Undo/redo remains correct with shallow `snapshotsEqual` (Option B — confirmed)

## Non-Goals (P2.6)

| Item | Deferred |
|------|----------|
| Hex color picker / full palette | Later |
| Syntax markers for color in `parse-markup.ts` | Later (optional `#` etc.) |
| Per-segment pill background | YAGNI |
| Rotation, shadows, freehand draw | Later |
| Card-density fit-to-frame | Removed — WYSIWYG (P2.5 follow-up) |
| P2.5c server grace / per-player deadlines | Playtest-gated |
| User-uploaded memes, public lobbies, spectator | Phase 3 |

---

## Problem Statement

P2.5 shipped drag/resize and custom boxes but:

1. **All text renders white** with black stroke (`MEME_STROKE_STYLES`) — fails on light meme regions
2. **`layout.align` exists** in the model but has no UI — players cannot align text in moved boxes
3. **Selection is textarea-only** — custom boxes are hard to switch without scrolling inputs
4. **No deselect** — toolbar always targets an active box; confusing when editing finished
5. **No z-order** — overlapping custom boxes use array order only
6. **No preview-without-chrome** — handles always visible when a box is active

P2.5 spec explicitly deferred text color; P2.6a addresses that first.

---

## Phased Delivery

| Phase | Scope | Est. | Ship when |
|-------|-------|------|-----------|
| **P2.6a** | Fill (hybrid) + pill + render + toolbar + snapshotsEqual | 2–3 d | Readable on light memes |
| **P2.6b** | Tap select/deselect, align, snap, peek, z-order | 2–3 d | Overlap + layout QoL |
| **P2.6c** | `kind: "emoji"` + picker + render | 2–4 d | Emoji in voting |
| **Parallel** | Party QA (reroll, ShareCard) | 0.5–1 d | Checklist |

Ship order: **P2.6a → P2.6b → P2.6c**

---

## Data Model — v3 Extensions

All fields optional; missing = current behavior.

```ts
type BoxVisualStyle = {
  fill?: "white" | "black";  // default "white"
  pill?: boolean;            // default false
};

type CaptionBox = {
  id: string;
  kind: "template" | "custom" | "emoji";  // emoji: P2.6c only
  templateIndex?: number;
  segments: CaptionSegment[];
  layout: BoxLayout;
  style?: BoxVisualStyle;
  z?: number;                // P2.6b; default array index at create
};

type CaptionSegmentStyle = {
  caps?: boolean;
  slant?: number;
  scale?: number;
  italic?: boolean;
  fill?: "white" | "black";  // overrides box.style.fill for this run
};
```

### Fill resolution (render + submit preview)

```ts
function resolveSegmentFill(
  seg: CaptionSegment,
  boxStyle?: BoxVisualStyle
): "white" | "black" {
  return seg.style?.fill ?? boxStyle?.fill ?? "white";
}
```

### Stroke (auto-invert)

| fill | color | outline |
|------|-------|---------|
| `white` | `#fff` | black text-shadow + WebkitTextStroke (existing meme style) |
| `black` | `#000` | white text-shadow + WebkitTextStroke |

### Pill (box-level only)

When `box.style.pill === true`, wrap segment content in container:

- `background: rgba(0, 0, 0, 0.55)`
- `border-radius: 4px`
- `padding: 4px 8px`

### Emoji box (P2.6c)

- `kind: "emoji"`
- `segments: [{ text: "<single emoji>" }]`
- Max **1 emoji box** per submission; still max **2 custom text** boxes → **3 extra** boxes total (template boxes unchanged)
- Emoji must be single grapheme from allowlist (see P2.6c)

### Backward compatibility

| Document | Behavior |
|----------|----------|
| v2 | Unchanged |
| v3 without `style` | White text, no pill |
| v3 without `z` | Render order = array order |
| v3 without emoji kind | Unchanged |

---

## Undo/Redo — `snapshotsEqual` (Decision: Option B)

**Confirmed:** shallow field compare — **not** `JSON.stringify`, **not** deep equality on `boxes`.

**Current behavior** (`use-meme-canvas-editor.ts`): compares `fieldTexts`, `segmentOverrides` (text only today), `boxes` (id, kind, layout — **ignores segments**).

**P2.6 extensions:**

**`boxes[i]` compare:** `id`, `kind`, `z`, `layout.x/y/w/h/align`, `style.fill`, `style.pill` — **never** `box.segments`.

**`segmentOverrides[i]` compare:** extend from text-only to shallow style: `fill`, `slant`, `scale`, `caps`, `italic` when override present.

**When called:** `commitTextHistory` only (500ms debounce after keystroke, blur, before layout undo push) — not every render.

**Tests required (P2.6a):**

1. Same layout/style/z, different `box.segments` → equal
2. Different `style.fill` or `z` → not equal
3. Different segment override `fill` → not equal

---

## UI Architecture

### Two toolbars

1. **Canvas layout toolbar** — new `CanvasLayoutToolbar.tsx` (extract from duplicated code in `party-caption-input.tsx` + `PartyMobileCaption.tsx`)
   - Existing: Undo, Redo, +Text, Delete, Reset
   - P2.6a: **W**, **B**, **Pill** (active box)
   - P2.6b: **Align L/C/R**, **Snap H**, **Snap V**, **Preview** (peek)
   - P2.6c: **+ Emoji** + horizontal picker

2. **Text styling toolbar** — existing `CaptionToolbar.tsx`
   - Existing: SCH, A±, CAPS
   - P2.6a: **W**, **B** on selection (via `fillWhite` / `fillBlack` toolbar actions)

### Selection model (P2.6b)

- `activeBoxId: string | null` (null = deselected)
- Tap box on meme → select (hit-test in reverse z-order)
- Tap empty canvas → deselect
- Textarea focus still selects corresponding box
- `showOverlay = activeBoxId && !peekMode && !inputDisabled`

### MemeCanvasOverlay (P2.6b)

- Full-area pointer layer for hit-testing and deselect
- Only active box shows drag/resize handle
- Hidden when `peekMode` or `activeBoxId === null`

### Z-order (P2.6b)

- On select: `bringToFront` → `z = max(all z) + 1`
- `PartyTemplateFrame`: sort boxes by `z` before render
- Undo stack captures `z` via existing box snapshot

---

## P2.6a — Readability Pack

### Toolbar actions

Extend `ToolbarAction` in `segment-toolbar.ts`:

```ts
type ToolbarAction = "slant" | "scaleUp" | "scaleDown" | "caps" | "fillWhite" | "fillBlack";
```

Toggle behavior (like caps): apply to selection range; empty selection → whole box field.

Box-level W/B/Pill: `updateBoxStyle(boxId, patch)` on active box with undo push.

### Render changes

**Files:** `render-segments.tsx`, `PartyTemplateFrame.tsx`

- Replace hardcoded `MEME_STROKE_STYLES` with `strokeForFill(fill)`
- Pass `box.style` into `CaptionSegments`
- Pill wrapper when `box.style.pill`

### Validation

`validateCaptionDocumentV3`:

- Reject `style.fill` not in `"white" | "black"`
- Reject `style.pill` if not boolean
- Ignore unknown keys (strip on read optional)

### Copy (`lib/party/copy.ts`)

Add EN labels: canvas text white/black, pill, preview (peek).

---

## P2.6b — Layout QoL

| Action | Implementation |
|--------|----------------|
| Align left | `layout.align = "left"` |
| Align center | `layout.align = "center"` |
| Align right | `layout.align = "right"` |
| Snap horizontal | `x = (1 - w) / 2` via `clampLayout` |
| Snap vertical | `y = (1 - h) / 2` via `clampLayout` |
| Peek | `peekMode` boolean in hook; toggle button |
| Tap select | Overlay hit-test normalized coords vs box layouts |
| Deselect | Tap outside all boxes → `setActiveBoxId(null)` |
| bringToFront | On any select path |

All layout/style/z changes go through undo stack (existing `onInteractionStart` / `pushUndo` pattern).

---

## P2.6c — Emoji Layer

### Allowlist (initial)

😂 🔥 💀 👀 🤡 ✨ 💯 🙏 😭 👍 ❤️ 🫡

### UI

- **+ Emoji** in canvas toolbar → inserts emoji box at default layout (reuse `nextCustomBox`-style placement)
- Horizontal scroll picker; tap emoji → sets segment text
- No `CaptionField` textarea for emoji box row (show label + delete only)
- Delete via existing custom-box delete path

### Render

- Branch in `PartyTemplateFrame` or dedicated `EmojiBox` render
- Font size scales with box height (~80% of box inner height)
- Native emoji — no Impact font, no stroke

### Validation

- Count `kind === "emoji"` ≤ 1
- Count `kind === "custom"` ≤ 2
- Emoji segment: exactly one grapheme (see **Caption length counting**), must match allowlist
- Emoji box text counts toward the **120 grapheme** caption budget (same as text boxes)

---

## Caption length counting (Decision: grapheme clusters)

**Problem:** JavaScript `String.length` counts UTF-16 code units (`"👍".length === 2`). Spread/`[...str].length` counts Unicode code points (`"❤️"` → 2). Neither matches user-visible “characters” for emoji sequences (variation selectors, ZWJ, skin tones). A single picker emoji must count as **1** toward the 120 limit.

**Product rule:** One visible character = one unit, including emoji, newlines between boxes, and all plain text.

### Canonical algorithm (approved)

**Rule:** Emoji boxes never pass their segment text through a length function. Count **+1 per `kind: "emoji"` box**; count text/template/custom boxes with grapheme-aware length; count **+1 per newline** between boxes (same order as `serializeCaptionPlain`).

Shared helper in [`lib/party/caption-rich/grapheme-length.ts`](lib/party/caption-rich/grapheme-length.ts):

```ts
const segmenter = new Intl.Segmenter("und", { granularity: "grapheme" });

export function graphemeLength(text: string): number {
  if (!text) return 0;
  return [...segmenter.segment(text)].length;
}

export function isSingleGrapheme(text: string): boolean {
  return graphemeLength(text) === 1;
}
```

**`plainTextLengthFromBoxes`** — iterate boxes in array order; **do not** `graphemeLength`/`char_length` on emoji segment strings:

```ts
export function plainTextLengthFromBoxes(boxes: CaptionBox[]): number {
  let len = 0;
  for (let i = 0; i < boxes.length; i++) {
    if (i > 0) len += 1; // newline separator
    if (boxes[i].kind === "emoji") {
      len += 1; // fixed — never length(box.segments)
    } else {
      len += graphemeLength(boxPlainText(boxes[i].segments));
    }
  }
  return len;
}
```

`plainTextLength(doc)` delegates to `plainTextLengthFromBoxes(doc.boxes)` for v3 (v2 unchanged).

**Use everywhere length matters:**

| Call site | Behavior |
|-----------|----------|
| `plainTextLengthFromBoxes` / `plainTextLength` | loop above — emoji skip + fixed +1 |
| `validateCaptionDocumentV3` | via `plainTextLengthFromBoxes` |
| `use-meme-canvas-editor` counter | same import |
| Emoji box validation | `isSingleGrapheme(seg.text)` + allowlist (separate from budget +1) |
| `scripts/test-caption-rich.mjs` | tests for text graphemes + emoji +1; ❤️/👍/👍🏻 |

**Examples (`graphemeLength` for text only; emoji box always +1):**

| Input | `.length` (UTF-16) | code points | **budget unit** |
|-------|-------------------|-------------|-------------------|
| `"hello"` (text box) | 5 | 5 | 5 |
| `"👍"` (text box) | 2 | 1 | 1 |
| `"❤️"` in **emoji box** | — | — | **1** (not 2) |
| `"👍🏻"` in **emoji box** | — | — | **1** |

### Server alignment (Postgres)

PostgreSQL `char_length(text)` counts Unicode **code points** (not bytes, not grapheme clusters). For normal ASCII/Latin meme text it matches client `graphemeLength`. For emoji segment strings it can diverge (e.g. `char_length('❤️')` = 2) — **avoid** by never measuring emoji box text.

**P2.6c migration** — `party_caption_grapheme_length_from_rich(p_rich jsonb)` mirrors TS loop exactly:

```sql
-- pseudocode: for each box in p_rich->'boxes' (array order)
--   if not first box: total := total + 1   -- newline
--   if kind = 'emoji': total := total + 1
--   else: total := total + char_length(box_plain)  -- segment texts concatenated
```

1. Replace `char_length(v_plain) > 120` on **v3 rich** submit/draft paths with `party_caption_grapheme_length_from_rich(p_rich) > 120`.
2. **Do not** run `char_length` on the full serialized plain string when an emoji box is present — that would double-count VS code points.
3. Keep legacy v1/v2 plain caption paths on `char_length(v_caption)` unchanged.

**Invariant:** Client `plainTextLengthFromBoxes` and SQL `party_caption_grapheme_length_from_rich` use the same box-order loop → **no submit mismatch** at 120 boundary.

**Allowlist normalization:** Picker stores emoji in **NFC without optional variation selectors** where equivalent (e.g. U+2764 `❤` not U+2764+FE0F) — display unchanged; segment validation only.

**No change** to `CAPTION_MAX_LENGTH = 120` — only the counting function changes.

---

## File Map

| File | P2.6a | P2.6b | P2.6c |
|------|-------|-------|-------|
| `lib/party/caption-rich/types.ts` | BoxVisualStyle, segment fill | `z` | `kind: emoji` |
| `lib/party/caption-rich/render-segments.tsx` | fill/stroke/pill | — | emoji render |
| `lib/party/caption-rich/segment-toolbar.ts` | fillWhite/fillBlack | — | — |
| `lib/party/caption-rich/validate-document.ts` | fill/pill clamp | z optional | emoji rules |
| `lib/party/caption-rich/grapheme-length.ts` | — | — | **new**; Segmenter helper |
| `lib/party/caption-rich/plain-text.ts` | — | — | use `graphemeLength` |
| `components/.../CaptionToolbar.tsx` | W/B buttons | — | — |
| `components/.../CanvasLayoutToolbar.tsx` | new; Pill W/B | align/snap/peek | + emoji |
| `components/.../use-meme-canvas-editor.ts` | updateBoxStyle; snapshotsEqual | peek, null active, z | addEmojiBox |
| `components/.../MemeCanvasOverlay.tsx` | — | tap/deselect | — |
| `components/.../PartyTemplateFrame.tsx` | boxStyle prop | sort by z | emoji branch |
| `lib/party/copy.ts` | labels | align/snap/peek | emoji |
| `docs/party-manual-qa.md` | P2.6 section | | |
| `supabase/migrations/*_party_grapheme_length.sql` | — | — | v3 length RPC |

---

## QA Checklist (manual)

### P2.6a

- [ ] Toggle box to black on light meme template → readable in editor
- [ ] Toggle pill → semi-transparent bar behind text
- [ ] Selection W/B overrides box default for highlighted words only
- [ ] Submit → voting/reveal/PNG match editor colors
- [ ] Legacy v3 submission without `style` → still white text
- [ ] Undo/redo restores fill and pill; no duplicate undo entries on unchanged keystroke debounce

### P2.6b

- [ ] Tap custom box on meme → selects without textarea focus
- [ ] Tap empty → deselects; overlay hidden
- [ ] Align L/C/R updates text alignment in box
- [ ] Snap H/V centers box
- [ ] Preview hides handles; meme looks like final
- [ ] Two overlapping custom boxes: select brings front box to top

### P2.6c

- [ ] Add emoji box; picker sets emoji
- [ ] Max 1 emoji enforced
- [ ] Emoji visible in voting grid same position/size as editor
- [ ] Delete emoji box works
- [ ] ❤️ / 👍 count as **1** toward 120 in client counter
- [ ] Submit at 120 graphemes with ❤️ emoji box succeeds (client + server agree)

---

## Approval Log

| Section | Status |
|---------|--------|
| P2.6 scope (a/b/c phasing) | Draft |
| Hybrid fill (box + segment) | Approved (brainstorm) |
| Pill box-level only | Approved |
| snapshotsEqual Option B | **Confirmed** |
| Emoji limits (1 emoji + 2 custom) | Draft |
| Caption length = grapheme clusters; emoji box fixed +1 (skip segment text) | **Confirmed** |
| Server length via `party_caption_grapheme_length_from_rich` (same loop, no char_length on emoji) | **Confirmed** |

**Next step after approval:** [`writing-plans`](../plans/) → implementation plan for P2.6a first.
