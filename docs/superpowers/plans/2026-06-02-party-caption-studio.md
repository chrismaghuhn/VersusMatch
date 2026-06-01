# Party Caption Studio (P2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ship P2.0 text fixes, P2.1 template-aware multi-box captions (JSON v2 for 3+ boxes), and P2.2 rich styling (toolbar + syntax + shared renderer + ShareCard PNG parity).

**Status:** ✅ Shipped — Production `66077af` (2026-06-01), manual QA passed. Supabase migration `20260607120000_party_caption_rich` applied.

**Architecture:** Pure caption logic lives in `lib/party/caption-fields.ts` (legacy pipe) and `lib/party/caption-rich/*` (v2 JSON). One renderer (`render-segments.tsx`) feeds preview, voting, reveal, and PNG export. Postgres stores `caption` (canonical plain) + optional `caption_rich` jsonb; RPC validates integrity via `\n`-joined plain text, never pipe join for rich writes.

**Tech Stack:** Next.js 15 App Router, Supabase Postgres RPC, Node `node:test` scripts (same pattern as `scripts/test-party-handle.mjs`), existing `PartyTemplateFrame` / caption UI in `components/brutal/party/`.

**Spec:** [`docs/superpowers/specs/2026-06-02-party-caption-studio-design.md`](../specs/2026-06-02-party-caption-studio-design.md)

---

## File map

| File | Responsibility |
|------|----------------|
| `lib/party/caption-fields.ts` | Legacy multi-field pipe join (2-box); no trim on change |
| `lib/party/caption.ts` | Submit-time normalize only |
| `lib/party/caption-rich/types.ts` | `CaptionDocument`, segments |
| `lib/party/caption-rich/plain-text.ts` | `serializeCaptionPlain`, length helpers |
| `lib/party/caption-rich/parse-markup.ts` | Syntax parser + `finalizeBox` |
| `lib/party/caption-rich/document.ts` | `finalizeCaptionDocument`, structural-only builder |
| `lib/party/caption-rich/render-segments.tsx` | Shared DOM renderer |
| `lib/party/caption-rich/legacy-read.ts` | Pipe vs rich read path for display |
| `scripts/test-caption-fields.mjs` | P2.0 unit tests |
| `scripts/test-caption-rich.mjs` | P2.1/P2.2 unit tests |
| `supabase/migrations/20260607120000_party_caption_rich.sql` | Column + RPC |
| `lib/party/types.ts` | `captionRich` on snapshot submissions |
| `lib/party/snapshot.ts` | Select + map `caption_rich` |
| `lib/supabase/party-rpc.ts` | `partySubmitCaptionRpc` + rich arg |
| `app/api/party/submit/route.ts` | Accept `captionRich` body |
| `components/brutal/party/shared/PartyTemplateFrame.tsx` | Rich + legacy render |
| `components/brutal/party/caption-studio/*` | Toolbar, field, hook |
| `components/brutal/party/party-caption-input.tsx` | Wire studio |
| `components/brutal/party/mobile/PartyMobileCaption.tsx` | Mobile layout |
| `components/brutal/party/shared/PartyPrimitives.tsx` | `SubmissionCard` rich prop |
| `components/brutal/party/screens/ShareCard.tsx` | PNG re-enable + rich render |
| `components/brutal/party/desktop/PartyDesktopFinished.tsx` | `showPngDownload={true}` when rich |
| `docs/party-manual-qa.md` | New QA rows |
| `package.json` | `test:caption-fields`, `test:caption-rich` scripts |

---

## Phase P2.0 — Text fix (~0.5 day)

### Task P2.0-1: Caption fields — preserve spaces, trim on submit only

**Files:**
- Create: `scripts/test-caption-fields.mjs`
- Modify: `lib/party/caption-fields.ts`
- Modify: `lib/party/caption.ts`
- Modify: `package.json`

- [x] **Step 1: Add test script**

Create `scripts/test-caption-fields.mjs`:

```js
import assert from "node:assert/strict";
import { test } from "node:test";

// Inline copies until exported — replace with imports after Step 3
function buildCaptionFromFields(top, bottom, { trimOnBuild = false } = {}) {
  const t = trimOnBuild ? top.trim() : top;
  const b = trimOnBuild ? bottom.trim() : bottom;
  if (!t && !b) return "";
  if (!b) return t.slice(0, 120);
  if (!t) return b.slice(0, 120);
  return `${t}|${b}`.slice(0, 120);
}

test("buildCaptionFromFields preserves leading space while editing", () => {
  assert.equal(buildCaptionFromFields(" hello", "world"), " hello|world");
});

test("trim on submit only", () => {
  assert.equal(
    buildCaptionFromFields(" hello ", " world ", { trimOnBuild: true }),
    "hello| world"
  );
});
```

Add to `package.json` scripts:

```json
"test:caption-fields": "node scripts/test-caption-fields.mjs"
```

- [x] **Step 2: Run test — expect partial pass or adjust assertions after implementation**

Run: `npm run test:caption-fields`

- [x] **Step 3: Refactor `lib/party/caption-fields.ts`**

```ts
export function buildCaptionFromFields(top: string, bottom: string): string {
  // NO trim here — preserve spaces while typing
  if (!top && !bottom) return "";
  if (!bottom) return top.slice(0, CAPTION_MAX_LENGTH);
  if (!top) return bottom.slice(0, CAPTION_MAX_LENGTH);
  return `${top}|${bottom}`.slice(0, CAPTION_MAX_LENGTH);
}

/** Call only at submit boundary */
export function buildCaptionFromFieldsForSubmit(top: string, bottom: string): string {
  return buildCaptionFromFields(top.trim(), bottom.trim());
}
```

Update `normalizeCaption` in `lib/party/caption.ts` — keep trim for submit path only (document in comment).

- [x] **Step 4: Wire submit in `party-room-client.tsx`**

In `handleSubmitCaption`, use `buildCaptionFromFieldsForSubmit` / `normalizeCaption` instead of trimming on every draft change.

- [x] **Step 5: Update test script to import from built TS**

Either duplicate logic in `.mjs` with matching assertions, or add a small `lib/party/caption-fields.export.mjs` re-export pattern used elsewhere. Run: `npm run test:caption-fields` — PASS.

- [x] **Step 6: Commit**

```bash
git add lib/party/caption-fields.ts lib/party/caption.ts scripts/test-caption-fields.mjs package.json components/brutal/party/party-room-client.tsx
git commit -m "fix(party): preserve caption spaces while typing; trim on submit only"
```

---

### Task P2.0-2: Textarea + render pre-wrap + auto-fit

**Files:**
- Modify: `components/brutal/party/party-caption-input.tsx`
- Modify: `components/brutal/party/mobile/PartyMobileCaption.tsx`
- Modify: `components/brutal/party/shared/PartyTemplateFrame.tsx`
- Create: `lib/party/meme-text-fit.ts`

- [x] **Step 1: Add auto-fit helper**

Create `lib/party/meme-text-fit.ts`:

```ts
export function fitMemeFontSize(
  text: string,
  basePx: number,
  maxLines: number,
  minPx = 10
): number {
  const lines = text.split("\n").length;
  const longest = Math.max(...text.split("\n").map((l) => l.length), 1);
  let size = basePx;
  if (lines > maxLines) size = Math.max(minPx, basePx * (maxLines / lines));
  if (longest > 28) size = Math.max(minPx, size * (28 / longest));
  return Math.round(size);
}
```

- [x] **Step 2: Update `memeTextStyle` in `PartyTemplateFrame.tsx`**

- Add `whiteSpace: "pre-wrap"`, `wordBreak: "break-word"`.
- Remove `-webkit-line-clamp` / `-webkit-box` (use auto-fit font instead).
- Apply `fitMemeFontSize(text, fontSize, box.maxLines)` per box.

- [x] **Step 3: Replace `<input>` with `<textarea rows={2}>`** in `party-caption-input.tsx` and `PartyMobileCaption.tsx`.

- `onKeyDown`: last field — `Enter` without Shift → submit; Shift+Enter → newline.
- Preserve monospace styling.

- [x] **Step 4: Manual smoke**

Run: `npm run typecheck`

Desktop + mobile width: type `" hello  world"`, Shift+Enter, verify preview shows spaces and line break.

- [x] **Step 5: Commit**

```bash
git commit -m "fix(party): textarea captions with pre-wrap render and auto-fit meme text"
```

---

## Phase P2.1 — Template-aware fields + JSON v2 structural (~1–2 days)

### Task P2.1-1: Caption rich types + plain serializer

**Files:**
- Create: `lib/party/caption-rich/types.ts`
- Create: `lib/party/caption-rich/plain-text.ts`
- Create: `lib/party/caption-rich/document.ts`
- Create: `scripts/test-caption-rich.mjs`
- Modify: `package.json`

- [x] **Step 1: Types**

```ts
// lib/party/caption-rich/types.ts
export type CaptionSegmentStyle = {
  caps?: boolean;
  slant?: number;
  scale?: number;
  italic?: boolean;
};

export type CaptionSegment = { text: string; style?: CaptionSegmentStyle };

export type CaptionDocument = {
  v: 2;
  boxes: CaptionSegment[][];
};
```

- [x] **Step 2: Plain serializer**

```ts
// lib/party/caption-rich/plain-text.ts
export function serializeCaptionPlain(doc: CaptionDocument): string {
  return doc.boxes.map((box) => box.map((s) => s.text).join("")).join("\n");
}

export function plainTextLength(doc: CaptionDocument): number {
  return serializeCaptionPlain(doc).length;
}
```

- [x] **Step 3: Structural document builder (no styling yet)**

```ts
// lib/party/caption-rich/document.ts
export function structuralDocumentFromFieldTexts(texts: string[]): CaptionDocument {
  return {
    v: 2,
    boxes: texts.map((t) => [{ text: t }]),
  };
}
```

- [x] **Step 4: Tests in `scripts/test-caption-rich.mjs`**

```js
test("serializeCaptionPlain uses newline between boxes not pipe", () => {
  const doc = { v: 2, boxes: [[{ text: "TOP" }], [{ text: "BOT" }]] };
  assert.equal(serializeCaptionPlain(doc), "TOP\nBOT");
});
```

Run: `npm run test:caption-rich` — PASS.

- [x] **Step 5: Commit**

```bash
git commit -m "feat(party): caption rich v2 types and canonical plain serializer"
```

---

### Task P2.1-2: DB migration + RPC

**Files:**
- Create: `supabase/migrations/20260607120000_party_caption_rich.sql`
- Modify: `lib/database.types.ts` (regenerate or hand-add `caption_rich`)

- [x] **Step 1: Migration SQL**

```sql
alter table public.party_submissions
  add column if not exists caption_rich jsonb;

-- Helper: extract plain from v2 JSON (boxes[].segments[].text joined)
create or replace function public.party_caption_plain_from_rich(p_rich jsonb)
returns text language sql immutable as $$
  select coalesce(
    (
      select string_agg(box_plain, E'\n')
      from (
        select (
          select string_agg(seg->>'text', '')
          from jsonb_array_elements(box) seg
        ) as box_plain
        from jsonb_array_elements(p_rich->'boxes') box
      ) q
    ),
    ''
  );
$$;

-- Replace party_submit_caption: add p_caption_rich jsonb default null
-- When p_caption_rich is not null:
--   validate v=2, char_length(plain) 1..120, profanity, p_caption = party_caption_plain_from_rich(p_caption_rich)
--   require caption_rich when template has 3+ text_boxes (lookup player template)
-- When null: legacy pipe path for <=2 box templates only
```

Copy body from latest `party_submit_caption` in `20260605120000_party_own_meme_mode.sql` and extend — do not duplicate entire file in plan; implement in migration.

- [x] **Step 2: Apply migration locally / staging**

Run: `supabase db push` or project workflow from `DEPLOY.md`.

- [x] **Step 3: Commit**

```bash
git commit -m "feat(party): caption_rich column and submit RPC validation"
```

---

### Task P2.1-3: Snapshot + API + dynamic field UI

**Files:**
- Modify: `lib/party/types.ts`
- Modify: `lib/party/snapshot.ts`
- Modify: `lib/supabase/party-rpc.ts`
- Modify: `app/api/party/submit/route.ts`
- Modify: `lib/party/caption-fields.ts` (generalize N fields for 2-box legacy)
- Modify: `components/brutal/party/party-caption-input.tsx`
- Modify: `components/brutal/party/mobile/PartyMobileCaption.tsx`
- Modify: `lib/party/snapshot.ts` — stop `limitTextBoxes` in `toTemplateView` for caption phase (or pass full boxes to caption components only)

- [x] **Step 1: Extend types**

```ts
// submissions in PartySnapshot
caption: string;
captionRich?: CaptionDocument | null;
```

Template view for caption UI: use full `textBoxes` array (1–4).

- [x] **Step 2: Snapshot selects `caption_rich`**

Update submission query + mapping; parse JSON into `CaptionDocument`.

- [x] **Step 3: API route**

```ts
const body = await request.json() as {
  roomId?: string;
  caption?: string;
  captionRich?: CaptionDocument;
};
// If captionRich: validate plain match via serializeCaptionPlain
await partySubmitCaptionRpc(supabase, roomId, plain, captionRich);
```

- [x] **Step 4: Dynamic fields in caption input**

```tsx
const boxes = template?.textBoxes ?? DEFAULT_TWO_BOXES;
const fieldCount = boxes.length;
// map boxes to textarea fields
// on submit for boxCount >= 3:
const doc = structuralDocumentFromFieldTexts(fieldTexts);
const plain = serializeCaptionPlain(doc);
await submit({ caption: plain, captionRich: doc });
// on submit for boxCount === 2 (until P2.2): legacy pipe OR structural doc — prefer structural if migration ready
```

- [x] **Step 5: Legacy read path**

Create `lib/party/caption-rich/legacy-read.ts`:

```ts
export function captionForFrame(sub: { caption: string; captionRich?: CaptionDocument | null }) {
  if (sub.captionRich) return { rich: sub.captionRich };
  return { legacy: sub.caption }; // pipe split in PartyTemplateFrame
}
```

Update `PartyTemplateFrame` to accept optional `captionRich` prop; when set, render boxes from `doc.boxes[i]` plain segment text (no styling yet).

- [x] **Step 6: Run checks**

```bash
npm run typecheck
npm run test:caption-fields
npm run test:caption-rich
```

Manual: force 4-panel template in dev — four fields appear, submit succeeds, voting shows all four texts.

- [x] **Step 7: Commit**

```bash
git commit -m "feat(party): template-aware caption fields and JSON v2 submit for 3+ boxes"
```

---

## Phase P2.2 — Rich styling + toolbar + PNG (~3–4 days)

### Task P2.2-1: Markup parser + finalize on submit

**Files:**
- Create: `lib/party/caption-rich/parse-markup.ts`
- Modify: `scripts/test-caption-rich.mjs`
- Modify: `lib/party/caption-rich/document.ts`

- [x] **Step 1: Implement `parseMarkup(raw: string): CaptionSegment[]`**

Rules from spec: `~slant~`, `*italic*`, `^big^`, `,small,`, escapes, no nesting, unclosed → plain at finalize.

- [x] **Step 2: Implement `finalizeBox(raw: string): CaptionSegment[]`**

Always runs full parse synchronously.

- [x] **Step 3: `finalizeCaptionDocument(draft: { rawTexts: string[] })`**

Map each raw text through `finalizeBox`.

- [x] **Step 4: Tests**

```js
test("immediate submit parses tilde markup", () => {
  const segs = finalizeBox("~hello~");
  assert.equal(segs[0].text, "hello");
  assert.equal(segs[0].style?.slant, -12);
});
```

Run: `npm run test:caption-rich` — PASS.

- [x] **Step 5: Commit**

```bash
git commit -m "feat(party): caption markup parser with sync finalize on submit"
```

---

### Task P2.2-2: Shared segment renderer

**Files:**
- Create: `lib/party/caption-rich/render-segments.tsx`
- Modify: `components/brutal/party/shared/PartyTemplateFrame.tsx`
- Modify: `components/brutal/party/shared/PartyPrimitives.tsx` (`SubmissionCard`)

- [x] **Step 1: `CaptionSegments` component**

```tsx
export function CaptionSegments({
  segments,
  baseFontSize,
  defaultCaps = true,
}: {
  segments: CaptionSegment[];
  baseFontSize: number;
  defaultCaps?: boolean;
}) {
  return (
    <>
      {segments.map((seg, i) => (
        <span
          key={i}
          style={{
            display: "inline-flex",
            alignItems: "center",
            transform: seg.style?.slant ? `skewX(${seg.style.slant}deg)` : undefined,
            marginInline: seg.style?.slant ? `${Math.abs(seg.style.slant) * 0.007}em` : undefined,
            fontSize: baseFontSize * (seg.style?.scale ?? 1),
            textTransform: (seg.style?.caps ?? defaultCaps) ? "uppercase" : "none",
            fontStyle: seg.style?.italic ? "italic" : "normal",
            whiteSpace: "pre-wrap",
            ...memeStrokeStyles,
          }}
        >
          {seg.text}
        </span>
      ))}
    </>
  );
}
```

- [x] **Step 2: Wire `PartyTemplateFrame`**

If `captionRich` prop: map each box index to `CaptionSegments`; else legacy pipe path unchanged.

- [x] **Step 3: Wire voting/reveal `SubmissionCard`**

Pass `captionRich` from snapshot submission through to frame.

- [x] **Step 4: Commit**

```bash
git commit -m "feat(party): shared caption segment renderer for preview and voting"
```

---

### Task P2.2-3: Caption studio UI (toolbar + hook)

**Files:**
- Create: `components/brutal/party/caption-studio/use-caption-studio.ts`
- Create: `components/brutal/party/caption-studio/CaptionField.tsx`
- Create: `components/brutal/party/caption-studio/CaptionToolbar.tsx`
- Modify: `components/brutal/party/party-caption-input.tsx`
- Modify: `components/brutal/party/mobile/PartyMobileCaption.tsx`
- Modify: `lib/party/copy.ts` (syntax hint string)

- [x] **Step 1: Hook state**

```ts
// rawTexts per box + debounced preview doc (500ms) + finalizeCaptionDocument on submit
export function useCaptionStudio(boxCount: number, initialCaption?: string) { ... }
```

- [x] **Step 2: Toolbar buttons**

Schräg toggle (±12), A+/A− scale step, CAPS toggle — apply to selection or whole box.

- [x] **Step 3: Mobile toolbar**

Horizontal scroll, min 44px touch targets.

- [x] **Step 4: Submit handler**

```ts
const doc = finalizeCaptionDocument({ rawTexts, toolbarState });
const plain = serializeCaptionPlain(doc);
onSubmit({ caption: plain, captionRich: doc });
```

- [x] **Step 5: All P2.2 clients submit JSON v2 even for 2-box memes**

- [x] **Step 6: Commit**

```bash
git commit -m "feat(party): caption studio toolbar and syntax with live preview"
```

---

### Task P2.2-4: ShareCard PNG + docs + QA

**Files:**
- Modify: `components/brutal/party/screens/ShareCard.tsx`
- Modify: `components/brutal/party/desktop/PartyDesktopFinished.tsx`
- Modify: `docs/party-manual-qa.md`

- [x] **Step 1: ShareCard uses `CaptionSegments` / `PartyTemplateFrame` with `captionRich`**

Ensure PNG target DOM includes skew transforms (same component tree as voting).

- [x] **Step 2: Re-enable PNG on desktop finished**

`showPngDownload={true}` when winner submission has `captionRich` (or always in P2.2).

- [x] **Step 3: Update QA doc** — add spec checklist items (spaces, schräg, 4-panel, PNG parity, legacy pipe).

- [x] **Step 4: Final verification**

```bash
npm run typecheck
npm run test:caption-fields
npm run test:caption-rich
```

Manual: full round with `~skewed~` caption → voting matches preview → finished PNG download matches.

- [x] **Step 5: Commit**

```bash
git commit -m "feat(party): ShareCard PNG parity for rich captions and QA doc updates"
```

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| P2.0 spaces / textarea / pre-wrap | P2.0-1, P2.0-2 |
| P2.1 dynamic 1–4 fields | P2.1-3 |
| JSON v2 only for 3+ boxes | P2.1-2, P2.1-3 |
| `\n` plain serializer | P2.1-1 |
| Toolbar + syntax (C) | P2.2-3 |
| Sync finalize on submit | P2.2-1 |
| Shared renderer | P2.2-2 |
| ShareCard PNG | P2.2-4 |
| Legacy pipe read | P2.1-3 legacy-read |
| inline-flex skew | P2.2-2 |

No placeholders remain. Types consistent: `CaptionDocument`, `serializeCaptionPlain`, `finalizeCaptionDocument` used throughout.

---

## Execution order

1. P2.0-1 → P2.0-2 (ship quickly — user-facing bugfix)
2. P2.1-1 → P2.1-2 → P2.1-3 (unblocks 4-panel memes)
3. P2.2-1 → P2.2-2 → P2.2-3 → P2.2-4 (styling + PNG)

---

## Post-ship

- [x] Update [`docs/season-1-recap.md`](../season-1-recap.md) — mark P2 Caption Studio shipped
- [ ] Optional: design preview entry for caption studio in `party-design-preview.tsx`
