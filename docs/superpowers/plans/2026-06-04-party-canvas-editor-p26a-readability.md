# P2.6a Canvas Editor Readability — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship white/black text fill (box + selection override), optional pill background, dynamic stroke, and toolbar controls — WYSIWYG across editor, voting, reveal, and ShareCard PNG.

**Architecture:** Extend CaptionDocument v3 with optional `BoxVisualStyle` on boxes and optional `fill` on segment styles. Render resolves fill per segment via `resolveSegmentFill(seg, boxStyle)` and inverts stroke automatically. Box-level W/B/Pill via `updateBoxStyle` (no-op if `boxId` missing or not found) with undo; selection-level W/B via existing `applyToolbarToSegments`. Extract duplicated canvas toolbar into `CanvasLayoutToolbar.tsx`. Extend `snapshotsEqual` (Option B) for style fields — extract to testable module.

**Tech Stack:** Next.js App Router, React client components, Node `node:test` (`scripts/test-caption-rich.mjs`, `scripts/test-caption-layout.mjs`), no DB migration.

**Spec:** [`docs/superpowers/specs/2026-06-04-party-canvas-editor-qol-design.md`](../specs/2026-06-04-party-canvas-editor-qol-design.md) — P2.6a section only. Grapheme length + emoji (P2.6c) **out of scope** here.

---

## File map

| File | Responsibility |
|------|----------------|
| `lib/party/caption-rich/types.ts` | `BoxVisualStyle`, `CaptionSegmentStyle.fill` |
| `lib/party/caption-rich/fill.ts` | `resolveSegmentFill`, `strokeStylesForFill` |
| `lib/party/caption-rich/segment-toolbar.ts` | `fillWhite`, `fillBlack` actions |
| `lib/party/caption-rich/validate-document.ts` | Reject invalid `style.fill` / `style.pill` |
| `lib/party/caption-rich/editor-snapshot.ts` | `snapshotsEqual`, `takeSnapshot` (extracted from hook) |
| `lib/party/caption-rich/render-segments.tsx` | Per-segment fill + stroke; pill wrapper export |
| `components/.../CanvasLayoutToolbar.tsx` | Undo/Redo/+Text/Delete/Reset + W/B/Pill |
| `components/.../CaptionToolbar.tsx` | Selection W/B buttons |
| `components/.../use-meme-canvas-editor.ts` | `updateBoxStyle`, import snapshot helpers |
| `components/.../party-caption-input.tsx` | Use `CanvasLayoutToolbar` |
| `components/.../mobile/PartyMobileCaption.tsx` | Use `CanvasLayoutToolbar` |
| `components/.../shared/PartyTemplateFrame.tsx` | Pass `box.style`, pill wrapper |
| `lib/party/copy.ts` | EN labels for new buttons |
| `scripts/test-caption-rich.mjs` | Fill + toolbar + snapshot tests |
| `scripts/test-caption-layout.mjs` | Validation tests for style |
| `docs/party-manual-qa.md` | P2.6a checklist rows |

---

## Task 1: Types + fill resolution helpers

**Files:**
- Modify: `lib/party/caption-rich/types.ts`
- Create: `lib/party/caption-rich/fill.ts`
- Modify: `scripts/test-caption-rich.mjs`

- [ ] **Step 1: Extend types**

```ts
// lib/party/caption-rich/types.ts
export type BoxVisualStyle = {
  fill?: "white" | "black";
  pill?: boolean;
};

export type CaptionSegmentStyle = {
  caps?: boolean;
  slant?: number;
  scale?: number;
  italic?: boolean;
  fill?: "white" | "black";
};

export type CaptionBox = {
  id: string;
  kind: "template" | "custom";
  templateIndex?: number;
  segments: CaptionSegment[];
  layout: BoxLayout;
  style?: BoxVisualStyle;
};
```

- [ ] **Step 2: Create `fill.ts`**

```ts
import type { BoxVisualStyle, CaptionSegment } from "./types";

export type TextFill = "white" | "black";

export function resolveSegmentFill(
  seg: CaptionSegment,
  boxStyle?: BoxVisualStyle
): TextFill {
  return seg.style?.fill ?? boxStyle?.fill ?? "white";
}

export function strokeStylesForFill(fill: TextFill): React.CSSProperties {
  const color = fill === "black" ? "#000" : "#fff";
  const outline = fill === "black" ? "#fff" : "#000";
  return {
    color,
    textShadow: `2px 2px 0 ${outline}, -2px -2px 0 ${outline}, 2px -2px 0 ${outline}, -2px 2px 0 ${outline}`,
    WebkitTextStroke: `1.5px ${outline}`,
  };
}

export const PILL_BOX_STYLE: React.CSSProperties = {
  background: "rgba(0, 0, 0, 0.55)",
  borderRadius: 4,
  padding: "4px 8px",
  display: "inline-block",
};
```

Add `import type React from "react"` at top of `fill.ts`.

- [ ] **Step 3: Write failing tests**

```js
// scripts/test-caption-rich.mjs — append
import { resolveSegmentFill, strokeStylesForFill } from "../lib/party/caption-rich/fill.ts";

test("resolveSegmentFill prefers segment override over box default", () => {
  const seg = { text: "x", style: { fill: "black" } };
  assert.equal(resolveSegmentFill(seg, { fill: "white" }), "black");
});

test("resolveSegmentFill defaults to white", () => {
  assert.equal(resolveSegmentFill({ text: "x" }), "white");
  assert.equal(resolveSegmentFill({ text: "x" }, undefined), "white");
});

test("strokeStylesForFill inverts outline for black fill", () => {
  const styles = strokeStylesForFill("black");
  assert.equal(styles.color, "#000");
  assert.match(String(styles.WebkitTextStroke), /#fff/i);
});
```

- [ ] **Step 4: Run tests**

Run: `node --experimental-strip-types --test scripts/test-caption-rich.mjs`
Expected: new fill tests PASS (after Step 2)

- [ ] **Step 5: Commit**

```bash
git add lib/party/caption-rich/types.ts lib/party/caption-rich/fill.ts scripts/test-caption-rich.mjs
git commit -m "feat(party): add BoxVisualStyle and fill resolution helpers (P2.6a)"
```

---

## Task 2: Segment toolbar — fillWhite / fillBlack

**Files:**
- Modify: `lib/party/caption-rich/segment-toolbar.ts`
- Modify: `scripts/test-caption-rich.mjs`

- [ ] **Step 1: Extend ToolbarAction type and switch cases**

```ts
export type ToolbarAction =
  | "slant"
  | "scaleUp"
  | "scaleDown"
  | "caps"
  | "fillWhite"
  | "fillBlack";
```

In `applyToolbarToSegments`, add cases:

```ts
case "fillWhite": {
  styledMiddle = mapMiddleSegments(middle, (style) =>
    mergeStyle(style, { fill: "white" })
  );
  break;
}
case "fillBlack": {
  styledMiddle = mapMiddleSegments(middle, (style) =>
    mergeStyle(style, { fill: "black" })
  );
  break;
}
```

- [ ] **Step 2: Write failing test**

```js
import { applyToolbarToSegments } from "../lib/party/caption-rich/segment-toolbar.ts";

test("fillBlack applies to selection range only", () => {
  const segments = [{ text: "hello world" }];
  const next = applyToolbarToSegments(segments, { start: 0, end: 5 }, "fillBlack");
  assert.equal(next.length, 2);
  assert.equal(next[0].text, "hello");
  assert.equal(next[0].style?.fill, "black");
  assert.equal(next[1].text, " world");
  assert.equal(next[1].style?.fill, undefined);
});
```

- [ ] **Step 3: Run test**

Run: `node --experimental-strip-types --test scripts/test-caption-rich.mjs`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/party/caption-rich/segment-toolbar.ts scripts/test-caption-rich.mjs
git commit -m "feat(party): segment toolbar fillWhite/fillBlack actions"
```

---

## Task 3: Validation — style.fill and style.pill

**Files:**
- Modify: `lib/party/caption-rich/validate-document.ts`
- Modify: `scripts/test-caption-layout.mjs`

- [ ] **Step 1: Add validateBoxStyle helper**

```ts
function validateBoxStyle(box: CaptionBox): string | null {
  const fill = box.style?.fill;
  if (fill != null && fill !== "white" && fill !== "black") return "invalid_caption";
  const pill = box.style?.pill;
  if (pill != null && typeof pill !== "boolean") return "invalid_caption";
  for (const seg of box.segments) {
    const segFill = seg.style?.fill;
    if (segFill != null && segFill !== "white" && segFill !== "black") return "invalid_caption";
  }
  return null;
}
```

Call inside the `for (const box of doc.boxes)` loop after `validateBoxLayout`.

- [ ] **Step 2: Write failing tests**

```js
test("validateCaptionDocumentV3 rejects invalid style.fill", () => {
  const doc = makeV3Doc();
  doc.boxes[0].style = { fill: "red" };
  const result = validateCaptionDocumentV3(doc, TEMPLATE_BOXES, 1);
  assert.equal(result.ok, false);
});

test("validateCaptionDocumentV3 accepts black fill and pill", () => {
  const doc = makeV3Doc();
  doc.boxes[0].style = { fill: "black", pill: true };
  const result = validateCaptionDocumentV3(doc, TEMPLATE_BOXES, 1);
  assert.equal(result.ok, true);
});
```

- [ ] **Step 3: Run tests**

Run: `node --experimental-strip-types --test scripts/test-caption-layout.mjs`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/party/caption-rich/validate-document.ts scripts/test-caption-layout.mjs
git commit -m "feat(party): validate caption box fill and pill fields"
```

---

## Task 4: snapshotsEqual — extract + extend (Option B)

**Files:**
- Create: `lib/party/caption-rich/editor-snapshot.ts`
- Modify: `components/brutal/party/caption-studio/use-meme-canvas-editor.ts`
- Modify: `scripts/test-caption-rich.mjs`

- [ ] **Step 1: Extract snapshot types and helpers**

Move `EditorSnapshot`, `takeSnapshot`, `snapshotsEqual` from `use-meme-canvas-editor.ts` into `editor-snapshot.ts`. Extend compare:

**boxes[i]:** compare `id`, `kind`, `layout.x/y/w/h/align`, `style?.fill`, `style?.pill` — never `box.segments`.

**segmentOverrides[i]:** when both non-null, compare each segment's `text`, `style?.fill`, `style?.slant`, `style?.scale`, `style?.caps`, `style?.italic`.

```ts
function segmentStyleEqual(
  a: CaptionSegmentStyle | undefined,
  b: CaptionSegmentStyle | undefined
): boolean {
  return (
    a?.fill === b?.fill &&
    a?.slant === b?.slant &&
    a?.scale === b?.scale &&
    a?.caps === b?.caps &&
    a?.italic === b?.italic
  );
}
```

```ts
function boxStyleEqual(
  a: BoxVisualStyle | undefined,
  b: BoxVisualStyle | undefined
): boolean {
  return a?.fill === b?.fill && a?.pill === b?.pill;
}
```

- [ ] **Step 2: Update hook imports**

```ts
import { takeSnapshot, snapshotsEqual, type EditorSnapshot } from "@/lib/party/caption-rich/editor-snapshot";
```

Remove local definitions from hook file.

- [ ] **Step 3: Write snapshot tests**

```js
import { snapshotsEqual, takeSnapshot } from "../lib/party/caption-rich/editor-snapshot.ts";

test("snapshotsEqual ignores box.segments text changes", () => {
  const boxes = [{
    id: "t0", kind: "template", templateIndex: 0,
    segments: [{ text: "a" }],
    layout: { x: 0.1, y: 0.05, w: 0.8, h: 0.2 },
  }];
  const a = takeSnapshot(boxes, ["a"], [null]);
  const boxes2 = [{ ...boxes[0], segments: [{ text: "changed" }] }];
  const b = takeSnapshot(boxes2, ["a"], [null]);
  assert.equal(snapshotsEqual(a, b), true);
});

test("snapshotsEqual detects style.fill change", () => {
  const base = {
    id: "t0", kind: "template", templateIndex: 0,
    segments: [{ text: "a" }],
    layout: { x: 0.1, y: 0.05, w: 0.8, h: 0.2 },
  };
  const a = takeSnapshot([base], ["a"], [null]);
  const b = takeSnapshot([{ ...base, style: { fill: "black" } }], ["a"], [null]);
  assert.equal(snapshotsEqual(a, b), false);
});

test("snapshotsEqual detects segment override fill change", () => {
  const boxes = [{
    id: "t0", kind: "template", templateIndex: 0,
    segments: [{ text: "" }],
    layout: { x: 0.1, y: 0.05, w: 0.8, h: 0.2 },
  }];
  const a = takeSnapshot(boxes, ["hi"], [null]);
  const b = takeSnapshot(boxes, ["hi"], [[{ text: "hi", style: { fill: "black" } }]]);
  assert.equal(snapshotsEqual(a, b), false);
});
```

- [ ] **Step 4: Run tests**

Run: `node --experimental-strip-types --test scripts/test-caption-rich.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/party/caption-rich/editor-snapshot.ts components/brutal/party/caption-studio/use-meme-canvas-editor.ts scripts/test-caption-rich.mjs
git commit -m "feat(party): extend snapshotsEqual for fill/pill (Option B)"
```

---

## Task 5: Render — dynamic fill, stroke, pill

**Files:**
- Modify: `lib/party/caption-rich/render-segments.tsx`
- Modify: `components/brutal/party/shared/PartyTemplateFrame.tsx`

- [ ] **Step 1: Update CaptionSegments**

```tsx
import { resolveSegmentFill, strokeStylesForFill, PILL_BOX_STYLE } from "./fill";

export function CaptionSegments({
  segments,
  baseFontSize,
  defaultCaps = true,
  boxStyle,
}: {
  segments: CaptionSegment[];
  baseFontSize: number;
  defaultCaps?: boolean;
  boxStyle?: BoxVisualStyle;
}) {
  const inner = (
    <>
      {segments.map((seg, i) => {
        const fill = resolveSegmentFill(seg, boxStyle);
        // ... existing slant/caps/scale/italic ...
        return (
          <span
            key={i}
            style={{
              // ...existing...
              ...strokeStylesForFill(fill),
            }}
          >
            {seg.text}
          </span>
        );
      })}
    </>
  );

  if (boxStyle?.pill) {
    return <span style={PILL_BOX_STYLE}>{inner}</span>;
  }
  return inner;
}
```

No fake `CaptionBox` — `resolveSegmentFill` takes `boxStyle` directly (Task 1).

Keep exporting `MEME_STROKE_STYLES` as `strokeStylesForFill("white")` for any legacy imports, or alias:

```ts
export const MEME_STROKE_STYLES = strokeStylesForFill("white");
```

- [ ] **Step 2: Pass box.style in PartyTemplateFrame**

In v3 render branch:

```tsx
<CaptionSegments
  segments={segments}
  baseFontSize={fittedSize}
  boxStyle={box.style}
/>
```

- [ ] **Step 3: Manual smoke**

Run dev server, open Party caption phase with canvas, verify existing submissions still render white text (no `style` field).

- [ ] **Step 4: Commit**

```bash
git add lib/party/caption-rich/render-segments.tsx components/brutal/party/shared/PartyTemplateFrame.tsx
git commit -m "feat(party): render per-segment fill and box pill background"
```

---

## Task 6: Hook — updateBoxStyle

**Files:**
- Modify: `components/brutal/party/caption-studio/use-meme-canvas-editor.ts`

- [ ] **Step 1: Add updateBoxStyle callback**

```ts
import type { BoxVisualStyle } from "@/lib/party/caption-rich/types";

const updateBoxStyle = useCallback(
  (boxId: string, patch: Partial<BoxVisualStyle>) => {
    if (!boxId || !boxes.some((b) => b.id === boxId)) return;
    commitTextHistory();
    pushUndo(takeSnapshot(boxes, fieldTexts, segmentOverrides));
    setBoxes((prev) =>
      prev.map((box) => {
        if (box.id !== boxId) return box;
        const nextStyle = { ...box.style, ...patch };
        const cleaned = Object.fromEntries(
          Object.entries(nextStyle).filter(([, v]) => v !== undefined)
        ) as BoxVisualStyle;
        return {
          ...box,
          style: Object.keys(cleaned).length > 0 ? cleaned : undefined,
        };
      })
    );
  },
  [boxes, fieldTexts, segmentOverrides, pushUndo, commitTextHistory]
);
```

Add `toggleBoxPill` — also no-op via `updateBoxStyle` if id invalid:

```ts
const toggleBoxPill = useCallback(
  (boxId: string) => {
    const box = boxes.find((b) => b.id === boxId);
    if (!box) return;
    updateBoxStyle(boxId, { pill: !(box.style?.pill ?? false) });
  },
  [boxes, updateBoxStyle]
);
```

Export `updateBoxStyle`, `toggleBoxPill` from canvas-enabled return object.

- [ ] **Step 2: Ensure finalize/submit preserves style**

Verify `finalizeCaptionDocumentV3` in `document.ts` spreads boxes as-is (style should flow through). If it rebuilds boxes without `style`, patch to preserve `box.style` when mapping.

- [ ] **Step 3: Commit**

```bash
git add components/brutal/party/caption-studio/use-meme-canvas-editor.ts lib/party/caption-rich/document.ts
git commit -m "feat(party): updateBoxStyle with undo for canvas fill/pill"
```

---

## Task 7: CanvasLayoutToolbar component

**Files:**
- Create: `components/brutal/party/caption-studio/CanvasLayoutToolbar.tsx`
- Modify: `components/brutal/party/party-caption-input.tsx`
- Modify: `components/brutal/party/mobile/PartyMobileCaption.tsx`
- Modify: `lib/party/copy.ts`

- [ ] **Step 1: Create toolbar component**

Extract the `canvasToolbar` JSX block from `party-caption-input.tsx` (Undo, Redo, +Text, Delete, Reset) and add W/B/Pill buttons for active box:

```tsx
type CanvasLayoutToolbarProps = {
  disabled?: boolean;
  mobile?: boolean;
  canUndo: boolean;
  canRedo: boolean;
  canAddCustomBox: boolean;
  canDeleteActiveCustomBox: boolean;
  activeBoxFill?: "white" | "black";
  activeBoxPill?: boolean;
  styleControlsEnabled: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddCustomBox: () => void;
  onDeleteActiveCustomBox: () => void;
  onResetLayout: () => void;
  onSetBoxFill: (fill: "white" | "black") => void;
  onTogglePill: () => void;
};
```

W/B buttons: call `onSetBoxFill("white")` / `onSetBoxFill("black")`. Highlight active fill with `border-[#CCFF00]`. Pill toggles with active state when `activeBoxPill`.

Disable W/B/Pill when `!styleControlsEnabled` (toolbar sets `disabled={disabled || !styleControlsEnabled}` on those three buttons only — Undo/Redo/+Text stay independent).

- [ ] **Step 2: Add copy strings**

```ts
// lib/party/copy.ts
canvasTextWhite: "White text",
canvasTextBlack: "Black text",
canvasPill: "Pill",
```

- [ ] **Step 3: Wire party-caption-input.tsx**

Derive active box once; no non-null assertions:

```tsx
const activeBox =
  canvasEditor?.activeBoxId != null
    ? canvasEditor.boxes.find((b) => b.id === canvasEditor.activeBoxId)
    : undefined;

// ...
<CanvasLayoutToolbar
  disabled={inputDisabled}
  mobile={mobile}
  canUndo={canvasEditor.canUndo}
  canRedo={canvasEditor.canRedo}
  canAddCustomBox={canvasEditor.canAddCustomBox}
  canDeleteActiveCustomBox={canvasEditor.canDeleteActiveCustomBox}
  activeBoxFill={activeBox?.style?.fill ?? "white"}
  activeBoxPill={activeBox?.style?.pill ?? false}
  styleControlsEnabled={Boolean(canvasEditor.activeBoxId)}
  onUndo={canvasEditor.undo}
  onRedo={canvasEditor.redo}
  onAddCustomBox={canvasEditor.addCustomBox}
  onDeleteActiveCustomBox={canvasEditor.deleteActiveCustomBox}
  onResetLayout={canvasEditor.resetLayout}
  onSetBoxFill={(fill) => {
    const id = canvasEditor.activeBoxId;
    if (id) canvasEditor.updateBoxStyle(id, { fill });
  }}
  onTogglePill={() => {
    const id = canvasEditor.activeBoxId;
    if (id) canvasEditor.toggleBoxPill(id);
  }}
/>
```

Defense in depth: `updateBoxStyle` / `toggleBoxPill` no-op if `boxId` empty or not in `boxes` (Task 6) — no `!` assertions anywhere.

- [ ] **Step 4: Wire PartyMobileCaption.tsx** — same pattern, duplicate block removed.

- [ ] **Step 5: Commit**

```bash
git add components/brutal/party/caption-studio/CanvasLayoutToolbar.tsx components/brutal/party/party-caption-input.tsx components/brutal/party/mobile/PartyMobileCaption.tsx lib/party/copy.ts
git commit -m "feat(party): CanvasLayoutToolbar with box fill and pill controls"
```

---

## Task 8: CaptionToolbar — selection W/B

**Files:**
- Modify: `components/brutal/party/caption-studio/CaptionToolbar.tsx`

- [ ] **Step 1: Add W and B buttons after CAPS**

```tsx
<button
  type="button"
  disabled={disabled}
  onClick={() => onAction("fillWhite")}
  className={`${btnBase} ${sizeClass}`}
  style={{ fontWeight: 800, fontSize, color: "#fff" }}
  title={PARTY_COPY.canvasTextWhite}
>
  W
</button>
<button
  type="button"
  disabled={disabled}
  onClick={() => onAction("fillBlack")}
  className={`${btnBase} ${sizeClass}`}
  style={{ fontWeight: 800, fontSize, color: "#000", background: "#fff" }}
  title={PARTY_COPY.canvasTextBlack}
>
  B
</button>
```

Import `PARTY_COPY` from `@/lib/party/copy`.

`applyToolbar` in hook already routes to `applyToolbarToSegments` — no hook change needed beyond Task 2.

- [ ] **Step 2: Commit**

```bash
git add components/brutal/party/caption-studio/CaptionToolbar.tsx
git commit -m "feat(party): selection-level white/black text in CaptionToolbar"
```

---

## Task 9: QA docs + full test run

**Files:**
- Modify: `docs/party-manual-qa.md`

- [ ] **Step 1: Add P2.6a manual QA rows** (from spec checklist)

- [ ] **Step 2: Run all caption tests**

Run: `node --experimental-strip-types --test scripts/test-caption-rich.mjs scripts/test-caption-layout.mjs scripts/test-caption-fields.mjs`
Expected: all PASS

- [ ] **Step 3: Manual QA on light meme template**

1. Toggle active box to black text → readable on bright area
2. Toggle pill → semi-transparent bar behind text
3. Select word → W/B on selection overrides box default for that run only
4. Submit → check voting grid matches editor colors
5. Legacy submission without `style` in DB still renders white

- [ ] **Step 4: Commit**

```bash
git add docs/party-manual-qa.md
git commit -m "docs(party): P2.6a readability manual QA checklist"
```

---

## Self-review (spec coverage)

| Spec requirement | Task |
|------------------|------|
| `BoxVisualStyle` fill/pill | Task 1 |
| `CaptionSegmentStyle.fill` | Task 1 |
| `resolveSegmentFill` | Task 1 |
| Stroke auto-invert | Task 1, 5 |
| Pill wrapper | Task 1, 5 |
| Toolbar fillWhite/fillBlack (selection) | Task 2, 8 |
| Box-level W/B/Pill | Task 6, 7 |
| `validateCaptionDocumentV3` style rules | Task 3 |
| snapshotsEqual Option B | Task 4 |
| WYSIWYG all render paths | Task 5 (PartyTemplateFrame used everywhere) |
| Copy labels | Task 7 |
| Legacy v3 without style → white | Task 5 default |
| Grapheme length / emoji | **Deferred P2.6c** |

---

## Out of scope (do not implement in this plan)

- P2.6b: tap select, deselect, align, snap, peek, z-order
- P2.6c: emoji kind, picker, grapheme length migration
- Hex color picker, per-segment pill
- DB migration
