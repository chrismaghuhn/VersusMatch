import { clampLayout, LAYOUT_MIN_H, LAYOUT_MIN_W } from "./layout.ts";
import type { CaptionDocumentV3, CaptionBox } from "./types.ts";
import type { TextBox } from "@/lib/party/types";
import { validateEmojiBoxText } from "./emoji.ts";
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
  const emojiBoxes = doc.boxes.filter((b) => b.kind === "emoji");

  if (templateBoxesInDoc.length !== templateCount) return { ok: false, error: "invalid_caption" };
  if (customBoxes.length > 2) return { ok: false, error: "invalid_caption" };
  if (emojiBoxes.length > 1) return { ok: false, error: "invalid_caption" };
  if (doc.boxes.length > 6) return { ok: false, error: "invalid_caption" };

  for (let i = 0; i < templateCount; i++) {
    const box = templateBoxesInDoc.find((b) => b.templateIndex === i);
    if (!box) return { ok: false, error: "invalid_caption" };
  }

  for (const box of doc.boxes) {
    const err = validateBoxLayout(box);
    if (err) return { ok: false, error: err };
    const styleErr = validateBoxStyle(box);
    if (styleErr) return { ok: false, error: styleErr };
    if (box.kind === "emoji") {
      const text = box.segments.map((s) => s.text).join("");
      if (text && !validateEmojiBoxText(text)) return { ok: false, error: "invalid_caption" };
    }
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
