import { clampLayout, LAYOUT_MIN_H, LAYOUT_MIN_W } from "./layout.ts";
import type { CaptionDocumentV3, CaptionBox } from "./types.ts";
import type { TextBox } from "@/lib/party/types";
import { plainTextLengthFromBoxes } from "./plain-text.ts";

/** Client + server shape validation for canvas-on submit. Caller must only invoke when room.canvasEditorEnabled — server rejects v3 on canvas-off rooms independently. */
export function validateCaptionDocumentV3(
  doc: CaptionDocumentV3,
  templateBoxes: TextBox[],
  expectedRevision: number
): { ok: true } | { ok: false; error: string } {
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
