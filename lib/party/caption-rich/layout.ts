import type { BoxLayout, CaptionBox } from "./types.ts";
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

export function defaultTemplateBoxes(textBoxes: TextBox[]): CaptionBox[] {
  return textBoxes.map((tb, i) => ({
    id: tb.id,
    kind: "template" as const,
    templateIndex: i,
    segments: [{ text: "" }],
    layout: layoutFromTemplateBox(tb),
  }));
}

/** Fit-to-card: scale + offset for card density rendering.
 * Not used in production (WYSIWYG: voting/reveal use editor layouts). Kept for optional future fit modes. */
export type CardFitTransform = { scale: number; offsetX: number; offsetY: number };

export function computeCardFit(boxes: CaptionBox[]): CardFitTransform {
  const filled = boxes.filter((b) => b.segments.some((s) => s.text.length > 0));
  if (filled.length === 0) return { scale: 1, offsetX: 0, offsetY: 0 };

  let minX = 1,
    minY = 1,
    maxX = 0,
    maxY = 0;
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

export function nextEmojiBox(existing: CaptionBox[]): CaptionBox | null {
  if (existing.some((b) => b.kind === "emoji")) return null;
  if (existing.length >= 6) return null;
  const maxZ = Math.max(-1, ...existing.map((b, i) => b.z ?? i));
  return {
    id: "emoji-1",
    kind: "emoji",
    segments: [{ text: "" }],
    layout: clampLayout({ x: 0.35, y: 0.42, w: 0.3, h: 0.16, align: "center" }),
    z: maxZ + 1,
  };
}

export function nextCustomBox(existing: CaptionBox[]): CaptionBox | null {
  const customCount = existing.filter((b) => b.kind === "custom").length;
  if (customCount >= 2 || existing.length >= 6) return null;
  const maxZ = Math.max(-1, ...existing.map((b, i) => b.z ?? i));
  return {
    id: `custom-${customCount + 1}`,
    kind: "custom",
    segments: [{ text: "" }],
    layout: clampLayout({ x: 0.25, y: 0.4, w: 0.5, h: 0.12, align: "center" }),
    z: maxZ + 1,
  };
}

export function boxZIndex(box: CaptionBox, arrayIndex: number): number {
  return box.z ?? arrayIndex;
}

export function sortBoxesByZ(boxes: CaptionBox[]): CaptionBox[] {
  return [...boxes]
    .map((box, index) => ({ box, index }))
    .sort((a, b) => {
      const dz = boxZIndex(a.box, a.index) - boxZIndex(b.box, b.index);
      return dz !== 0 ? dz : a.index - b.index;
    })
    .map(({ box }) => box);
}

/** Hit-test in reverse z-order (topmost box wins). */
export function hitTestBox(
  boxes: CaptionBox[],
  nx: number,
  ny: number
): CaptionBox | null {
  const sorted = sortBoxesByZ(boxes).reverse();
  for (const box of sorted) {
    const { x, y, w, h } = box.layout;
    if (nx >= x && nx <= x + w && ny >= y && ny <= y + h) {
      return box;
    }
  }
  return null;
}

export function snapLayoutCenterHorizontal(layout: BoxLayout): BoxLayout {
  return clampLayout({ ...layout, x: (1 - layout.w) / 2 });
}

export function snapLayoutCenterVertical(layout: BoxLayout): BoxLayout {
  return clampLayout({ ...layout, y: (1 - layout.h) / 2 });
}

export function bringBoxToFront(boxes: CaptionBox[], boxId: string): CaptionBox[] {
  const maxZ = Math.max(-1, ...boxes.map((b, i) => boxZIndex(b, i)));
  return boxes.map((box, index) =>
    box.id === boxId ? { ...box, z: maxZ + 1 } : { ...box, z: box.z ?? index }
  );
}
