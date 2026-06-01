# MemeFight Party — Caption Studio (P2)

**Date:** 2026-06-02  
**Status:** Shipped — Production 2026-06-01 (`66077af`), manual QA passed  
**Phase:** P2 — post–Season 1 polish  
**Depends on:** P1.10 own-meme mode, Arena desktop/mobile caption UI  
**Parent spec:** [`2026-06-03-meme-party-live-design.md`](2026-06-03-meme-party-live-design.md)

## Goal

Make party captions feel like a real meme editor: **spaces and line breaks work**, templates with 1–4 text boxes are supported, and players can style text (**schräg / skew**, size, caps) via **toolbar buttons** and **optional inline syntax** (Option C).

## Success Criteria

- Leading/trailing spaces and multiple spaces **persist** until submit (and render correctly)
- Multi-line text inside a box renders without clipping (auto-fit or wrap)
- 3- and 4-panel templates show the correct number of input fields
- Toolbar toggles update live preview; syntax shortcuts produce the same result
- Voting, reveal, and caption-phase preview use the **same segment renderer**
- **ShareCard PNG (P2.2 in scope):** styled captions export via shared renderer + `html-to-image` — supersedes Party Arena “PNG deferred on desktop finished” for **styled** submissions only; copy-link / tweet unchanged
- Legacy rooms with pipe captions (`top|bottom`) still display correctly
- Profanity filter runs on **plain text** extracted from rich captions (unchanged moderation bar)

## Non-Goals (this spec)

| Item | Deferred |
|------|----------|
| Free drag / resize text on image | P2.5+ |
| Custom fonts, colors, stroke color | Later |
| User-uploaded templates | Phase 3 |
| Rich text in lobby chat / reactions | N/A |
| WYSIWYG HTML paste from Word | Out of scope |
| Party XP / Battle Pass hooks | Phase 2+ |

---

## Problem Statement (current bugs)

1. **`buildCaptionFromFields` trims on every keystroke** — users cannot type leading/trailing spaces (`lib/party/caption-fields.ts`).
2. **Single-line `<input>`** — no line breaks within a text box.
3. **`PartyTemplateFrame` uses `textTransform: uppercase` + `-webkit-line-clamp`** — no `white-space: pre-wrap`; spacing feels broken.
4. **Always 2 fields** — templates with 3–4 `text_boxes` in DB are capped by `limitTextBoxes(..., 2)`.
5. **Pipe delimiter** — `|` in user text breaks field split.
6. **No styling** — no skew/italic/size; meme tone is one-size-fits-all Impact caps.

---

## Phased Delivery

### P2.0 — Text Fix (ship first, ~0.5 day)

No schema change. Fixes the “Leerzeichen geht nicht” report.

| Change | Detail |
|--------|--------|
| Preserve spaces | Remove `.trim()` from `onChange` path; trim **only on submit** (optional: collapse internal runs of 3+ spaces to 2) |
| Textarea | Replace per-field `<input>` with `<textarea rows={2}>`; `Shift+Enter` newline, `Enter` submit on last field (desktop) |
| Render | Add `whiteSpace: "pre-wrap"` + `wordBreak: "break-word"` on meme text nodes |
| Auto-fit | Scale `fontSize` down so text fits box height (min 10px, max per viewport) |
| Escape `\|` | When still on v1 pipe format: `\|` → literal pipe in field value |

**Files:** `lib/party/caption-fields.ts`, `party-caption-input.tsx`, `PartyMobileCaption.tsx`, `PartyTemplateFrame.tsx`

---

### P2.1 — Template-Aware Fields (~1–2 days)

| Change | Detail |
|--------|--------|
| Dynamic field count | `fields.length = template.textBoxes.length` (1–4), drop `limitTextBoxes` cap in caption UI (keep for thumbnails if needed) |
| Labels | Use `textBoxes[i].id` humanized (`q1` → “Panel 1”) or position hint (“Top”, “Bottom”, “Left”, …) |
| Char budget | **120 plain characters total** across all fields (unchanged product rule); show per-field + total counter |
| Wire format (3+ boxes) | **JSON v2 only** — no `\x1e`, no pipe join for 3+ fields |
| Wire format (2 boxes, P2.1) | May stay on pipe string until client ships P2.2; **new P2.2 clients always submit JSON v2** even for 2-box memes |

**Format boundary (exactly two write paths after P2.1):**

| Boxes | `caption_rich` | `caption` column |
|-------|----------------|------------------|
| Legacy read / old client | `null` | `top\|bottom` pipe string |
| 3+ boxes (P2.1+) | JSON v2 required | canonical plain (see below) |
| 2 boxes (P2.2 client) | JSON v2 | canonical plain |

No third wire format. `\x1e` record separator is **not used**.

---

### P2.2 — Rich Caption v2 + Toolbar + Syntax (~3–4 days)

#### Data model

Add nullable column on submissions:

```sql
alter table public.party_submissions
  add column if not exists caption_rich jsonb;

-- caption (text) remains: plain-text fingerprint for profanity, search, Twitter share
-- caption_rich: structured document when present; null = legacy pipe string in caption only
```

**CaptionDocument (v2):**

```ts
type CaptionSegmentStyle = {
  caps?: boolean;    // default true (meme mode)
  slant?: number;    // skewX degrees, clamp -18..18
  scale?: number;    // clamp 0.75..1.35, default 1
};

type CaptionSegment = {
  text: string;
  style?: CaptionSegmentStyle;
};

type CaptionDocument = {
  v: 2;
  /** One entry per template text box index */
  boxes: CaptionSegment[][];
};
```

- Each `boxes[i]` is an array of **segments** (styled runs) for text box `i`.
- Plain text inside a box = concatenation of segment `text` values (newlines allowed inside a segment via `pre-wrap`).

#### Canonical plain `caption` column (rich submissions)

Rich and legacy **read** paths differ; rich **write** path uses one canonical serializer shared by **client submit handler** and **server RPC validation**:

```ts
/** Single source of truth — lib/party/caption-rich/plain-text.ts */
export function serializeCaptionPlain(doc: CaptionDocument): string {
  return doc.boxes
    .map((box) => box.map((s) => s.text).join(""))
    .join("\n");
}
```

| Format | Box separator | Example |
|--------|---------------|---------|
| Legacy (no `caption_rich`) | `\|` pipe | `TOP TEXT\|BOTTOM TEXT` |
| Rich v2 (`caption_rich` set) | `\n` newline | `TOP TEXT\nBOTTOM TEXT` |

**Rules:**

- Rich submissions: `caption` **must equal** `serializeCaptionPlain(caption_rich)` — character-for-character, no re-trim on server except optional outer trim of entire string once at submit.
- Legacy submissions: `caption_rich` must be `null`; server accepts pipe format unchanged.
- Never compare rich plain text using pipe join — that caused false integrity failures.

Profanity + char limit use `serializeCaptionPlain(doc).length` (or legacy `caption.length`).

**RPC `party_submit_caption`:**

- Accept optional `p_caption_rich jsonb`.
- If `p_caption_rich` present:
  - Validate JSON schema (`v: 2`, `boxes.length` matches template box count server-side).
  - Compute `v_plain := serializeCaptionPlain(p_caption_rich)` in SQL or reject if client `p_caption` ≠ `v_plain`.
  - `char_length(v_plain) <= 120`, profanity on `v_plain`.
  - Persist `caption = v_plain`, `caption_rich = p_caption_rich`.
- If absent: existing text-only legacy path (pipe allowed for 2-box memes only).

**Snapshot API:** Include `captionRich` on submissions when non-null; clients pick renderer by presence.

#### Toolbar (Option C — primary UX)

Per text box, a compact toolbar above the textarea:

| Button | Toggle / action | Maps to |
|--------|-----------------|--------|
| **Schräg** | toggle | `slant: ±12` (tap again → 0) |
| **A+** / **A-** | step | `scale` ±0.1 |
| **CAPS** | toggle | `caps: true/false` (default on) |
| **B** (optional v2.1) | toggle bold | heavier stroke / faux-bold |

- **Selection-based:** If text selected, apply style to selection only (split segments).
- **No selection:** Apply to entire box (single segment).
- Mobile: horizontal scroll chip bar; 44px min touch targets.

#### Syntax (Option C — power users)

- **Live preview:** debounced **500ms** `parseMarkup(rawText)` while typing (best-effort; may lag one keystroke).
- **Submit (mandatory):** synchronous `finalizeBox(rawText)` in submit handler **before** API call — flushes unclosed markers as plain text, applies all syntax, merges toolbar segment state. Prevents `~hello` + instant submit leaving literal tildes in DB.

Parsed on **blur** as well (same as finalize). Toolbar and syntax **mutate the same segment model**.

| Syntax | Effect |
|--------|--------|
| `~text~` | slant −12° |
| `*text*` or `_text_` | italic (`fontStyle`) — secondary to slant |
| `^text^` | scale 1.2 |
| `,text,` | scale 0.85 |
| `\~`, `\*`, `\_`, `\^`, `\,`, `\\` | escaped literals |

**Rules:**

- No nesting in v1 (inner markers treated as literal).
- Unclosed marker at submit → treat remainder as plain text.
- Show subtle hint under field: `~schräg~ · *kursiv* · ^groß^`

**Submit flow (client):**

```ts
function handleSubmit() {
  const doc = finalizeCaptionDocument(draft); // sync parseMarkup per box
  const plain = serializeCaptionPlain(doc);
  await submit({ caption: plain, captionRich: doc });
}
```

**Parser module:** `lib/party/caption-rich/parse-markup.ts` (pure, unit-tested). `finalizeCaptionDocument` must be unit-tested with “type marker + immediate submit” cases.

#### Rendering

Single source of truth: `lib/party/caption-rich/render-segments.tsx`

Used by:

- `PartyTemplateFrame`
- `SubmissionCard` / voting swipe
- `ShareCard` embedded view **and PNG export** (`html-to-image` snapshots the same styled DOM)

**Party Arena note:** Desktop finished previously hid PNG download (`showPngDownload={false}`). P2.2 **re-enables PNG** for finished/share flows when `captionRich` is present, using this renderer so skew/scale match in-game. Static copy-link / tweet behavior unchanged.

**Segment render style:**

Skewed `inline-block` shifts layout box and causes overlap. Use:

```tsx
<span
  style={{
    display: "inline-flex",
    alignItems: "center",
    transform: slant ? `skewX(${slant}deg)` : undefined,
    marginInline: slant ? "0.08em" : undefined, // tune per slant magnitude
    fontSize: baseSize * scale,
    textTransform: caps ? "uppercase" : "none",
    fontStyle: italic ? "italic" : "normal",
    whiteSpace: "pre-wrap",
    ...
  }}
>
  {text}
</span>
```

Adjust `marginInline` proportionally to `|slant|` if overlap persists in QA.

#### Editor state

- Client holds `CaptionDocument` in React state during caption phase.
- `onChange` updates document + derived plain string for char counter.
- Draft in localStorage optional (same room+round key) — **nice-to-have**, not blocking.

---

## API Changes

### POST `/api/party/rooms/[id]/submit`

Request body (extended):

```json
{
  "caption": "plain text fallback",
  "captionRich": { "v": 2, "boxes": [[{ "text": "hello world", "style": { "slant": -12 } }]] }
}
```

- Server rejects if `caption_rich` present and `caption !== serializeCaptionPlain(caption_rich)`.
- Server rejects `caption_rich` for templates with **3+ boxes** if missing (P2.1+ clients).
- Backward compatible: caption-only requests (no `caption_rich`) still work for legacy 2-box pipe clients.

### GET snapshot

Submission shape:

```ts
{
  caption: string;
  captionRich?: CaptionDocument | null;
}
```

---

## Migration & Compatibility

| Scenario | Behavior |
|----------|----------|
| Old submission, pipe string, `caption_rich` null | Render via legacy `captionParts()` (`\|` split) |
| New submission with `caption_rich` | Segment renderer; read plain via `\n` box split if needed for Twitter |
| 3+ box template, client without JSON v2 | Blocked at API — must upgrade (P2.1 ships JSON path with structural-only segments) |
| Client old build in same room (2-box) | Submits pipe text-only; still valid |
| Reroll | Keep draft document + field raw text |

No backfill required. `caption` column always populated for analytics/Twitter.

---

## Security & Moderation

- Profanity: `party_caption_has_profanity(plain_text)` — **never** on JSON keys.
- Max plain length: 120 (product rule).
- Max JSON size: 4 KB server-side reject (`invalid_caption`).
- No HTML in segments — text nodes only, React escape default.
- Rate limits unchanged.

---

## Testing

| Test | Type |
|------|------|
| `parse-markup.test.ts` | Unit — syntax → segments; unclosed markers; submit-time finalize |
| `plain-text.test.ts` | Unit — `serializeCaptionPlain` newline vs legacy pipe read path |
| `caption-fields.test.ts` | Unit — no trim on change, trim on submit |
| Manual QA | Add rows to `party-manual-qa.md` for spaces, schräg, 4-panel meme, PNG skew parity |

---

## File Map (implementation)

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20260607XXXXXX_party_caption_rich.sql` | Column + RPC update |
| `lib/party/caption-rich/types.ts` | CaptionDocument, segments |
| `lib/party/caption-rich/parse-markup.ts` | Syntax parser |
| `lib/party/caption-rich/plain-text.ts` | Extract + validate length |
| `lib/party/caption-rich/render-segments.tsx` | DOM renderer |
| `components/brutal/party/caption-studio/` | Toolbar, textarea field, editor hook |
| `PartyTemplateFrame.tsx` | Accept `captionRich` prop |
| `party-caption-input.tsx` | Wire studio (desktop + shared) |
| `PartyMobileCaption.tsx` | Mobile toolbar layout |

---

## QA Checklist Additions

Verified Production **2026-06-01**.

- [x] Type `" hello "` with leading/trailing spaces → renders correctly after submit
- [x] Two spaces in the middle of a word line preserved
- [x] Multi-line box (Shift+Enter) wraps in preview
- [x] 4-panel meme shows 4 fields; all render in voting
- [x] Toolbar Schräg matches `~text~` syntax
- [x] Submit `~hello` without waiting for debounce → stored segment has slant, not literal tildes
- [x] ShareCard PNG shows same skew as voting card (P2.2 — PNG re-enabled)
- [x] Legacy `top|bottom` room replay still works

---

## Open Questions (resolved)

| Question | Decision |
|----------|----------|
| Toolbar vs syntax | **Both (C)** |
| Store format | JSON `caption_rich` + plain `caption` |
| Italic vs schräg | Schräg = skew; `*` = italic as secondary |
| Free drag | Deferred P2.5+ |
| `\x1e` wire format | **Rejected** — JSON v2 only for 3+ boxes |
| Plain `caption` for rich | **`\n` box join** via `serializeCaptionPlain` (not `\|`) |
| ShareCard PNG on desktop finished | **In P2.2 scope** (lifts Arena deferral for styled captions) |
| Submit parser | **Sync finalize** before API; debounce preview-only |

---

## Revision Log

| Date | Change |
|------|--------|
| 2026-06-02 | Initial draft; Option C toolbar + syntax |
| 2026-06-02 | Review: canonical plain `\n` join; drop `\x1e`; PNG in P2.2; sync submit parse; inline-flex skew |
| 2026-06-01 | Shipped to Production (`66077af`); Supabase migration applied; manual QA passed |

---

## Approval Log

| Section | Status |
|---------|--------|
| P2.0 text fix scope | Approved (implicit — bugfix) |
| P2.1 template fields | Approved — revised (JSON v2 only for 3+) |
| P2.2 toolbar + syntax (Option C) | Shipped — QA passed 2026-06-01 |

**Shipped:** Production [`66077af`](https://memefight.lol) — see [`docs/season-1-recap.md`](../../season-1-recap.md).
