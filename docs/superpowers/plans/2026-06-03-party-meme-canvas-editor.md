# Party Meme Canvas Editor (P2.5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship P2.5a (template box drag/resize, v3 data model, card density, canvas room mode, layout_revision security) and P2.5b (+ custom text boxes, reroll confirm, undo/redo).

**Architecture:** Extend `caption_rich` to **v3** (`CaptionBox` with `layout` + mandatory `layoutRevision`). Canvas-off rooms stay on **v2** unchanged. One renderer (`PartyTemplateFrame` + `density`) feeds editor, voting cards (`card` fit-to-frame), and PNG (`export`). Server stores debounced drafts on `party_player_rounds`; reroll bumps `layout_revision` and clears draft. Client resets editor on revision change — not on draft null alone. Timer freeze is **client-only** during drag (no room-level grace in P2.5).

**Tech Stack:** Next.js 15 App Router, Supabase Postgres RPC, Node `node:test` (`scripts/test-caption-layout.mjs`), existing caption-studio under `components/brutal/party/caption-studio/`.

**Spec:** [`docs/superpowers/specs/2026-06-03-party-meme-canvas-editor-design.md`](../specs/2026-06-03-party-meme-canvas-editor-design.md)

---

## File map

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20260608120000_party_canvas_editor.sql` | Room columns, player_round draft/revision, RPCs |
| `lib/party/caption-rich/types.ts` | v2 \| v3 union, `CaptionBox`, `BoxLayout` |
| `lib/party/caption-rich/layout.ts` | Defaults from template, clamp, fit-to-card transform |
| `lib/party/caption-rich/validate-document.ts` | Shared validation (bounds, box counts, revision) |
| `lib/party/caption-rich/plain-text.ts` | v2 + v3 plain serialize |
| `lib/party/caption-rich/legacy-read.ts` | v2/v3 read for frame |
| `lib/party/caption-rich/document.ts` | finalize v3 from editor state |
| `lib/party/caption-submit.ts` | v3 submit payload when canvas on |
| `lib/party/types.ts` | Snapshot canvas fields |
| `lib/party/snapshot.ts` | draft, revision, room canvas flags |
| `lib/supabase/party-rpc.ts` | create room arg, sync draft |
| `app/api/party/rooms/route.ts` | `canvasEditorEnabled` body |
| `app/api/party/sync-draft/route.ts` | POST debounced draft sync |
| `components/brutal/party/caption-studio/use-meme-canvas-editor.ts` | Layout state, revision reset, freeze, sync |
| `components/brutal/party/caption-studio/MemeCanvasOverlay.tsx` | Drag/resize handles |
| `components/brutal/party/caption-studio/RerollConfirmDialog.tsx` | P2.5b custom-box warning |
| `components/brutal/party/shared/PartyTemplateFrame.tsx` | `density`, v3 layout render |
| `components/brutal/party/shared/PartyPrimitives.tsx` | `SubmissionCard` → `density="card"` |
| `components/brutal/party/screens/ShareCard.tsx` | `density="export"` |
| `components/brutal/party/party-phase-timer.tsx` | `frozen` prop |
| `components/brutal/party/screens/HostOnboarding.tsx` | Canvas toggle |
| `components/brutal/party/party-room-client.tsx` | Revision reset, reroll flow |
| `scripts/test-caption-layout.mjs` | Layout + fit tests |
| `docs/party-manual-qa.md` | P2.5 QA rows |

---

## Phase P2.5a — Layout + infrastructure (~3–4 days)

### Task P2.5a-1: v3 types + layout helpers + tests

**Files:**
- Modify: `lib/party/caption-rich/types.ts`
- Create: `lib/party/caption-rich/layout.ts`
- Create: `lib/party/caption-rich/validate-document.ts`
- Modify: `lib/party/caption-rich/plain-text.ts`
- Create: `scripts/test-caption-layout.mjs`
- Modify: `package.json`

- [ ] **Step 1: Extend types**

```ts
// lib/party/caption-rich/types.ts
export type BoxLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
  align?: "left" | "center" | "right";
};

export type CaptionBox = {
  id: string;
  kind: "template" | "custom";
  templateIndex?: number;
  segments: CaptionSegment[];
  layout: BoxLayout;
};

export type CaptionDocumentV2 = { v: 2; boxes: CaptionSegment[][] };
export type CaptionDocumentV3 = {
  v: 3;
  layoutRevision: number;
  boxes: CaptionBox[];
};
export type CaptionDocument = CaptionDocumentV2 | CaptionDocumentV3;

export function isCaptionDocumentV3(doc: CaptionDocument): doc is CaptionDocumentV3 {
  return doc.v === 3;
}
```

- [ ] **Step 2: Create `layout.ts`**

```ts
import type { BoxLayout, CaptionBox } from "./types";
import type { TextBox } from "@/lib/party/types";

export const LAYOUT_MIN_W = 0.08;
export const LAYOUT_MIN_H = 0.06;

export function layoutFromTemplateBox(box: TextBox): BoxLayout {
  return {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    align: box.align,
  };
}

export function clampLayout(layout: BoxLayout): BoxLayout {
  const w = Math.max(LAYOUT_MIN_W, Math.min(1, layout.w));
  const h = Math.max(LAYOUT_MIN_H, Math.min(1, layout.h));
  const x = Math.max(0, Math.min(1 - w, layout.x));
  const y = Math.max(0, Math.min(1 - h, layout.y));
  return { ...layout, x, y, w, h };
}

export function defaultTemplateBoxes(
  textBoxes: TextBox[],
  layoutRevision: number
): CaptionBox[] {
  return textBoxes.map((tb, i) => ({
    id: tb.id,
    kind: "template" as const,
    templateIndex: i,
    segments: [{ text: "" }],
    layout: layoutFromTemplateBox(tb),
  }));
}

/** Fit-to-card: scale + offset for card density rendering */
export type CardFitTransform = { scale: number; offsetX: number; offsetY: number };

export function computeCardFit(boxes: CaptionBox[]): CardFitTransform {
  const filled = boxes.filter((b) => b.segments.some((s) => s.text.length > 0));
  if (filled.length === 0) return { scale: 1, offsetX: 0, offsetY: 0 };

  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const b of filled) {
    minX = Math.min(minX, b.layout.x);
    minY = Math.min(minY, b.layout.y);
    maxX = Math.max(maxX, b.layout.x + b.layout.w);
    maxY = Math.max(maxY, b.layout.y + b.layout.h);
  }
  const unionW = Math.max(maxX - minX, 0.01);
  const unionH = Math.max(maxY - minY, 0.01);
  const scale = Math.min(1 / unionW, 1 / unionH, 1) * 0.92;
  const offsetX = (1 - unionW * scale) / 2 - minX * scale;
  const offsetY = (1 - unionH * scale) / 2 - minY * scale;
  return { scale, offsetX, offsetY };
}

export function applyCardFit(layout: BoxLayout, fit: CardFitTransform): BoxLayout {
  return clampLayout({
    ...layout,
    x: layout.x * fit.scale + fit.offsetX,
    y: layout.y * fit.scale + fit.offsetY,
    w: layout.w * fit.scale,
    h: layout.h * fit.scale,
  });
}
```

- [ ] **Step 3: Create `validate-document.ts`**

```ts
import { clampLayout, LAYOUT_MIN_H, LAYOUT_MIN_W } from "./layout";
import type { CaptionDocumentV3, CaptionBox } from "./types";
import type { TextBox } from "@/lib/party/types";
import { plainTextLengthFromBoxes } from "./plain-text";

export function validateCaptionDocumentV3(
  doc: CaptionDocumentV3,
  templateBoxes: TextBox[],
  expectedRevision: number,
  canvasEnabled: boolean
): { ok: true } | { ok: false; error: string } {
  if (!canvasEnabled) return { ok: false, error: "canvas_disabled" };
  if (doc.layoutRevision !== expectedRevision) return { ok: false, error: "stale_revision" };

  const templateCount = templateBoxes.length;
  const templateBoxesInDoc = doc.boxes.filter((b) => b.kind === "template");
  const customBoxes = doc.boxes.filter((b) => b.kind === "custom");

  if (templateBoxesInDoc.length !== templateCount) return { ok: false, error: "invalid_caption" };
  if (customBoxes.length > 2) return { ok: false, error: "invalid_caption" };
  if (doc.boxes.length > 6) return { ok: false, error: "invalid_caption" };

  for (let i = 0; i < templateCount; i++) {
    const box = templateBoxesInDoc.find((b) => b.templateIndex === i);
    if (!box) return { ok: false, error: "invalid_caption" };
  }

  for (const box of doc.boxes) {
    const err = validateBoxLayout(box);
    if (err) return { ok: false, error: err };
  }

  const len = plainTextLengthFromBoxes(doc.boxes);
  if (len < 1 || len > 120) return { ok: false, error: "invalid_caption" };

  return { ok: true };
}

function validateBoxLayout(box: CaptionBox): string | null {
  const l = clampLayout(box.layout);
  if (l.w < LAYOUT_MIN_W || l.h < LAYOUT_MIN_H) return "invalid_caption";
  if (l.x + l.w > 1.001 || l.y + l.h > 1.001) return "invalid_caption";
  return null;
}
```

- [ ] **Step 4: Update `plain-text.ts` for v2 \| v3**

```ts
export function boxPlainText(segments: CaptionSegment[]): string {
  return segments.map((s) => s.text).join("");
}

export function plainTextLengthFromBoxes(boxes: CaptionBox[]): number {
  return boxes.map((b) => boxPlainText(b.segments)).join("\n").length;
}

export function serializeCaptionPlain(doc: CaptionDocument): string {
  if (doc.v === 3) {
    return doc.boxes.map((b) => boxPlainText(b.segments)).join("\n");
  }
  return doc.boxes.map((box) => box.map((s) => s.text).join("")).join("\n");
}
```

Keep existing `plainTextLength` delegating to `serializeCaptionPlain(doc).length`.

- [ ] **Step 5: Add tests + npm script**

Create `scripts/test-caption-layout.mjs` with tests for:
- `clampLayout` rejects overflow
- `defaultTemplateBoxes` count matches template
- `computeCardFit` scales wide union down (`scale < 1`)
- `validateCaptionDocumentV3` rejects wrong `layoutRevision` and >2 custom boxes

Add `"test:caption-layout": "node scripts/test-caption-layout.mjs"` to `package.json`.

Run: `npm run test:caption-layout` — PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/party/caption-rich/types.ts lib/party/caption-rich/layout.ts lib/party/caption-rich/validate-document.ts lib/party/caption-rich/plain-text.ts scripts/test-caption-layout.mjs package.json
git commit -m "feat(party): caption v3 types, layout helpers, and validation tests"
```

---

### Task P2.5a-2: DB migration + RPCs

**Files:**
- Create: `supabase/migrations/20260608120000_party_canvas_editor.sql`
- Modify: `lib/database.types.ts` (regenerate or hand-add)

- [ ] **Step 1: Schema**

```sql
alter table public.party_rooms
  add column if not exists canvas_editor_enabled boolean not null default false,
  add column if not exists caption_duration_seconds smallint not null default 60
    check (caption_duration_seconds in (60, 90));

alter table public.party_player_rounds
  add column if not exists caption_draft jsonb,
  add column if not exists layout_revision smallint not null default 0;
```

- [ ] **Step 2: Replace `party_create_room`**

Add third param `p_canvas_editor_enabled boolean default false`. On insert:

```sql
canvas_editor_enabled := coalesce(p_canvas_editor_enabled, false),
caption_duration_seconds := case when coalesce(p_canvas_editor_enabled, false) then 90 else 60 end
```

Drop older overloads if present (follow `20260606193000_party_create_room_overload_fix.sql` pattern).

- [ ] **Step 3: Caption phase timer**

In **`party_start_game`** and **`party_advance_phase`** (caption branch only), replace:

```sql
phase_ends_at = now() + interval '60 seconds'
```

with:

```sql
phase_ends_at = now() + (v_room.caption_duration_seconds * interval '1 second')
```

Copy full function bodies from latest migration `20260606220000_party_rpc_plpgsql_type_fixes.sql` and patch.

- [ ] **Step 4: New RPC `party_sync_caption_draft`**

```sql
create or replace function public.party_sync_caption_draft(
  p_room_id uuid,
  p_draft jsonb,
  p_layout_revision smallint
) returns jsonb ...
```

- Phase = caption, member check
- Load `layout_revision` from `party_player_rounds` for current round + user
- If `p_layout_revision <> layout_revision` → `{ ok: false, error: 'stale_revision' }`
- Require `(p_draft->>'v')::int = 3` and `(p_draft->>'layoutRevision')::int = p_layout_revision`
- `update party_player_rounds set caption_draft = p_draft where ...`

- [ ] **Step 5: Extend `party_reroll_template`**

After template pick:

```sql
update public.party_player_rounds
set template_id = v_template,
    caption_draft = null,
    layout_revision = layout_revision + 1
where room_id = p_room_id and user_id = v_uid and round = v_room.current_round
returning layout_revision into v_new_revision;
```

Return `{ ok: true, template_id, layout_revision: v_new_revision }`.

- [ ] **Step 6: Extend `party_submit_caption`**

When room `canvas_editor_enabled`:

- Require `p_caption_rich->>'v' = '3'`
- Require `(p_caption_rich->>'layoutRevision')::int = player round `layout_revision`
- Validate template box count + custom ≤2 + layout bounds (mirror TS rules)
- On success: clear `caption_draft` on player round row

When canvas off: keep existing v=2 path unchanged.

- [ ] **Step 7: Apply migration locally / production**

Run project Supabase workflow (`supabase db push` or MCP `apply_migration`).

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260608120000_party_canvas_editor.sql lib/database.types.ts
git commit -m "feat(party): canvas editor schema, draft sync, and v3 submit RPC"
```

---

### Task P2.5a-3: Snapshot + API wiring

**Files:**
- Modify: `lib/party/types.ts`
- Modify: `lib/party/snapshot.ts`
- Modify: `lib/supabase/party-rpc.ts`
- Modify: `app/api/party/rooms/route.ts`
- Create: `app/api/party/sync-draft/route.ts`

- [ ] **Step 1: Extend `PartySnapshot`**

```ts
room: {
  // existing...
  canvasEditorEnabled: boolean;
  captionDurationSeconds: number;
};
// caption phase only, current user:
layoutRevision: number;
captionDraft: CaptionDocumentV3 | null;
```

- [ ] **Step 2: `buildPartySnapshot`**

- Select `canvas_editor_enabled, caption_duration_seconds` from room
- In caption phase, load `caption_draft, layout_revision` from `party_player_rounds` for `userId`
- Parse draft with v3 guard (`v === 3`)

- [ ] **Step 3: `partyCreateRoomRpc`**

Add `canvasEditorEnabled = false` third param → `p_canvas_editor_enabled`.

- [ ] **Step 4: `partySyncCaptionDraftRpc`**

```ts
export function partySyncCaptionDraftRpc(
  supabase: RpcSupabase,
  roomId: string,
  draft: CaptionDocumentV3,
  layoutRevision: number
) {
  return callRpc(supabase, "party_sync_caption_draft", {
    p_room_id: roomId,
    p_draft: draft,
    p_layout_revision: layoutRevision,
  });
}
```

- [ ] **Step 5: POST `/api/party/sync-draft`**

Auth + room membership; body `{ roomId, draft, layoutRevision }`; call RPC; return `{ ok }` or 409 on `stale_revision`.

- [ ] **Step 6: POST `/api/party/rooms`**

Accept optional `canvasEditorEnabled: boolean`; pass to RPC.

- [ ] **Step 7: Run `npm run typecheck`**

- [ ] **Step 8: Commit**

```bash
git commit -m "feat(party): snapshot canvas fields and draft sync API"
```

---

### Task P2.5a-4: Renderer `density` + card fit

**Files:**
- Modify: `components/brutal/party/shared/PartyTemplateFrame.tsx`
- Modify: `components/brutal/party/shared/PartyPrimitives.tsx`
- Modify: `components/brutal/party/screens/ShareCard.tsx`
- Modify: `lib/party/caption-rich/legacy-read.ts`

- [ ] **Step 1: Add `density` prop**

```ts
export type FrameDensity = "editor" | "card" | "export";

type PartyTemplateFrameProps = {
  density?: FrameDensity;
  captionRich?: CaptionDocument | null;
  // ...
};
```

Default `density="editor"` for backward compat.

- [ ] **Step 2: v3 render path**

For each box in v3 doc:
- Resolve layout from `box.layout` (not template DB) when v3
- If `density === "card"`: apply `computeCardFit` + `applyCardFit` to all box layouts before positioning
- If `density === "export"`: use raw editor layouts (same as editor)
- Skip boxes with empty plain text

- [ ] **Step 3: `SubmissionCard`**

Pass `density="card"` to `PartyTemplateFrame`.

- [ ] **Step 4: `ShareCard`**

Pass `density="export"`.

- [ ] **Step 5: Manual smoke**

Desktop voting grid at lg+: submit v3 layout offset box → card readable at ~230px.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(party): PartyTemplateFrame density modes and v3 layout render"
```

---

### Task P2.5a-5: Canvas editor hook + overlay (template boxes only)

**Files:**
- Create: `components/brutal/party/caption-studio/use-meme-canvas-editor.ts`
- Create: `components/brutal/party/caption-studio/MemeCanvasOverlay.tsx`
- Modify: `components/brutal/party/caption-studio/use-caption-studio.ts` (or wrap)
- Modify: `lib/party/caption-rich/document.ts`
- Modify: `lib/party/caption-submit.ts`
- Modify: `components/brutal/party/party-caption-input.tsx`
- Modify: `components/brutal/party/mobile/PartyMobileCaption.tsx`
- Modify: `components/brutal/party/desktop/PartyDesktopCaption.tsx`

- [ ] **Step 1: `finalizeCaptionDocumentV3`**

```ts
export function finalizeCaptionDocumentV3(draft: {
  boxes: CaptionBox[];
  layoutRevision: number;
  rawTexts: string[];
  segmentOverrides?: (readonly CaptionSegment[] | null)[];
}): CaptionDocumentV3 {
  return {
    v: 3,
    layoutRevision: draft.layoutRevision,
    boxes: draft.boxes.map((box, i) => ({
      ...box,
      segments: draft.segmentOverrides?.[i]
        ? [...draft.segmentOverrides[i]!]
        : finalizeBox(draft.rawTexts[i] ?? ""),
    })),
  };
}
```

- [ ] **Step 2: `useMemeCanvasEditor`**

Inputs: `value`, `onChange`, `textBoxes`, `canvasEnabled`, `layoutRevision`, `captionDraft`, `roomId`, `onLayoutRevisionChange`.

State:
- `boxes: CaptionBox[]` initialized from `defaultTemplateBoxes(textBoxes, layoutRevision)` merged with draft
- `activeBoxId: string`
- `layoutFrozen: boolean` (true while pointer down on handle)
- `localLayoutRevision: number`

**Revision reset (mandatory):**

```ts
useEffect(() => {
  if (layoutRevision !== localLayoutRevision) {
    setLocalLayoutRevision(layoutRevision);
    setBoxes(
      captionDraft?.v === 3
        ? captionDraft.boxes
        : defaultTemplateBoxes(textBoxes, layoutRevision)
    );
    setSegmentOverrides(emptyOverrides(textBoxes.length));
    setActiveBoxId(textBoxes[0]?.id ?? "box-0");
  }
}, [layoutRevision, captionDraft, textBoxes, localLayoutRevision]);
```

**Debounced draft sync (2s):** POST `/api/party/sync-draft` with finalized structural doc (segments from raw text, layouts from state).

When `!canvasEnabled`: delegate to existing `useCaptionStudio` (v2 path).

- [ ] **Step 3: `MemeCanvasOverlay`**

- Renders only when `canvasEnabled`
- Selected box: dashed border + bottom-right resize handle (44px touch target on mobile)
- Pointer events on box body → drag (`clampLayout` on move)
- Handle drag → resize
- `onInteractionStart/End` → set `layoutFrozen`

- [ ] **Step 4: Wire caption inputs**

- Pass `previewDoc` as v3 when canvas on
- Overlay absolutely positioned over `PartyTemplateFrame` (`density="editor"`)
- Submit uses `finalizeCaptionDocumentV3` + `validateCaptionDocumentV3`

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(party): meme canvas drag/resize for template boxes (P2.5a)"
```

---

### Task P2.5a-6: Timer freeze + host toggle + room client

**Files:**
- Modify: `components/brutal/party/party-phase-timer.tsx`
- Modify: `components/brutal/party/mobile/PartyMobileShell.tsx`
- Modify: `components/brutal/party/desktop/PartyDesktopCaption.tsx`
- Modify: `components/brutal/party/screens/HostOnboarding.tsx`
- Modify: `components/brutal/party/party-room-client.tsx`
- Modify: `lib/party/copy.ts`

- [ ] **Step 1: Timer freeze**

```ts
export function usePhaseCountdown(phaseEndsAt: string | null, frozen = false): string | null {
  // when frozen, stop updating label (keep last value in ref)
}
```

Pass `frozen={layoutFrozen}` from canvas hook through MobileShell / DesktopCaption.

- [ ] **Step 2: Host toggle**

In create lobby UI:

```tsx
<label>
  <input type="checkbox" checked={canvasEditor} onChange={...} />
  Canvas Editor — Text verschieben + Extra-Boxen (90s Timer)
</label>
```

Wire to create room API.

- [ ] **Step 3: `party-room-client` reroll handler**

On reroll RPC success, immediately:

```ts
setLayoutRevision(data.layout_revision);
resetCanvasFromRevision(data.layout_revision, null);
```

Before waiting for next snapshot poll.

- [ ] **Step 4: Snapshot poll**

When `snapshot.layoutRevision !== localLayoutRevision`, hook reset fires (Task P2.5a-5).

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(party): canvas host toggle, timer freeze, layout revision reset"
```

---

### Task P2.5a-7: P2.5a verification

- [ ] Run: `npm run typecheck && npm run test:caption-rich && npm run test:caption-layout`
- [ ] Manual: canvas **off** room — identical P2 behavior
- [ ] Manual: canvas **on** — 90s timer, drag template box, vote card readable
- [ ] Update spec status → **P2.5a shipped**
- [ ] Commit any QA doc stub

---

## Phase P2.5b — Custom boxes + polish (~2–3 days)

> **Gate:** Do not start until P2.5a `card` density verified on 230px voting cards.

### Task P2.5b-1: Custom box add/delete

**Files:**
- Modify: `components/brutal/party/caption-studio/use-meme-canvas-editor.ts`
- Modify: `components/brutal/party/party-caption-input.tsx`
- Modify: `lib/party/caption-rich/layout.ts`
- Modify: `scripts/test-caption-layout.mjs`

- [ ] **Step 1: `addCustomBox()`**

```ts
export function nextCustomBox(existing: CaptionBox[]): CaptionBox | null {
  const customCount = existing.filter((b) => b.kind === "custom").length;
  if (customCount >= 2 || existing.length >= 6) return null;
  return {
    id: `custom-${customCount + 1}`,
    kind: "custom",
    segments: [{ text: "" }],
    layout: clampLayout({ x: 0.25, y: 0.4, w: 0.5, h: 0.12, align: "center" }),
  };
}
```

- [ ] **Step 2: UI**

- **+ Text** button above meme preview
- **Delete** when active box `kind === "custom"`
- **Reset layout** restores template defaults + removes all custom boxes

- [ ] **Step 3: Field list**

Dynamic field list follows `boxes.length` (not just template count); map active box index to textarea.

- [ ] **Step 4: Tests + commit**

```bash
git commit -m "feat(party): custom caption boxes (max +2) in canvas editor"
```

---

### Task P2.5b-2: Reroll confirmation dialog

**Files:**
- Create: `components/brutal/party/caption-studio/RerollConfirmDialog.tsx`
- Modify: `components/brutal/party/party-room-client.tsx`
- Modify: `lib/party/copy.ts`

- [ ] **Step 1: Dialog copy (DE)**

```ts
rerollCustomWarningTitle: "Meme wechseln?",
rerollCustomWarningBody:
  "Reroll tauscht dein Meme und entfernt alle Custom-Texte. Das Layout wird zurückgesetzt.",
rerollCustomConfirm: "Trotzdem rerollen",
```

- [ ] **Step 2: Intercept reroll**

If `boxes.some(b => b.kind === "custom")` → show dialog; on confirm call existing reroll RPC.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(party): reroll confirmation when custom boxes exist"
```

---

### Task P2.5b-3: Undo/redo

**Files:**
- Modify: `components/brutal/party/caption-studio/use-meme-canvas-editor.ts`
- Modify: `components/brutal/party/party-caption-input.tsx`

- [ ] **Step 1: History stack**

```ts
type EditorSnapshot = { boxes: CaptionBox[]; fieldTexts: string[] };
const MAX_UNDO = 10;
// push snapshot before layout drag end, text change, add/delete custom
```

- [ ] **Step 2: UI buttons**

Undo / Redo in toolbar row (disabled when stack empty). Keyboard: Ctrl+Z / Ctrl+Shift+Z desktop only.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(party): canvas editor undo/redo stack"
```

---

### Task P2.5b-4: Docs + QA

**Files:**
- Modify: `docs/party-manual-qa.md`
- Modify: `docs/season-1-recap.md`
- Modify: `docs/superpowers/specs/2026-06-03-party-meme-canvas-editor-design.md` (status)

- [ ] Add P2.5 QA checklist rows from spec
- [ ] Full manual pass (canvas on/off, custom boxes, reroll race, stale_revision, PNG)
- [ ] Commit + apply Supabase migration to production

---

## Spec coverage self-review

| Spec requirement | Task |
|------------------|------|
| Canvas host toggle + 90s | P2.5a-2, P2.5a-6 |
| v3 data model | P2.5a-1 |
| layout_revision mandatory | P2.5a-1, P2.5a-2, P2.5a-5 |
| party_sync_caption_draft | P2.5a-2, P2.5a-3 |
| Reroll clears draft + revision bump | P2.5a-2, P2.5a-6 |
| Client reset on revision change | P2.5a-5, P2.5a-6 |
| Template drag/resize | P2.5a-5 |
| density card/export | P2.5a-4 |
| Client timer freeze only | P2.5a-6 |
| Custom boxes +2 | P2.5b-1 |
| Reroll dialog | P2.5b-2 |
| Undo/redo | P2.5b-3 |
| Canvas off = v2 unchanged | P2.5a-5, P2.5a-7 |
| P2.5c server grace | Out of plan (deferred) |

---

## Execution order

1. P2.5a-1 → P2.5a-2 → P2.5a-3 → P2.5a-4 → P2.5a-5 → P2.5a-6 → P2.5a-7  
2. P2.5b-1 → P2.5b-2 → P2.5b-3 → P2.5b-4  

---

## Post-ship

- [ ] Update `docs/season-1-recap.md` — P2.5 shipped
- [ ] Optional: Canvas editor screen in `party-design-preview.tsx`
- [ ] Monitor playtests for P2.5c timer needs
