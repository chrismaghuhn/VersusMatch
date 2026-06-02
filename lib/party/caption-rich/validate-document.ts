import { clampLayout, LAYOUT_MIN_H, LAYOUT_MIN_W } from "./layout.ts";
import type {
  CaptionDocument,
  CaptionDocumentV3,
  CaptionBox,
  CaptionSegment,
  CaptionSegmentStyle,
  BoxVisualStyle,
} from "./types.ts";
import type { TextBox } from "@/lib/party/types";
import { validateEmojiBoxText } from "./emoji.ts";
import { plainTextLengthFromBoxes } from "./plain-text.ts";

const MAX_BOXES = 6;
const MAX_SEGMENTS_PER_BOX = 160;
const MAX_BOX_ID_LENGTH = 64;
const MAX_PLAIN_TEXT_LENGTH = 120;
const MIN_SEGMENT_SCALE = 0.5;
const MAX_SEGMENT_SCALE = 2;
const MIN_SEGMENT_SLANT = -45;
const MAX_SEGMENT_SLANT = 45;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isCaptionSegmentStyle(value: unknown): value is CaptionSegmentStyle {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, ["caps", "slant", "scale", "italic", "fill"])) return false;

  if (value.caps !== undefined && typeof value.caps !== "boolean") return false;
  if (value.italic !== undefined && typeof value.italic !== "boolean") return false;
  if (value.fill !== undefined && value.fill !== "white" && value.fill !== "black") return false;
  if (
    value.slant !== undefined &&
    (!isFiniteNumber(value.slant) ||
      value.slant < MIN_SEGMENT_SLANT ||
      value.slant > MAX_SEGMENT_SLANT)
  ) {
    return false;
  }
  if (
    value.scale !== undefined &&
    (!isFiniteNumber(value.scale) ||
      value.scale < MIN_SEGMENT_SCALE ||
      value.scale > MAX_SEGMENT_SCALE)
  ) {
    return false;
  }

  return true;
}

function isCaptionSegment(value: unknown): value is CaptionSegment {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, ["text", "style"])) return false;
  return typeof value.text === "string" && isCaptionSegmentStyle(value.style);
}

function areCaptionSegments(value: unknown): value is CaptionSegment[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_SEGMENTS_PER_BOX &&
    value.every(isCaptionSegment)
  );
}

function isBoxVisualStyle(value: unknown): value is BoxVisualStyle {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, ["fill", "pill"])) return false;
  if (value.fill !== undefined && value.fill !== "white" && value.fill !== "black") return false;
  if (value.pill !== undefined && typeof value.pill !== "boolean") return false;
  return true;
}

function isBoxLayout(value: unknown): value is CaptionBox["layout"] {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, ["x", "y", "w", "h", "align"])) return false;
  if (
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !isFiniteNumber(value.w) ||
    !isFiniteNumber(value.h)
  ) {
    return false;
  }
  if (
    value.align !== undefined &&
    value.align !== "left" &&
    value.align !== "center" &&
    value.align !== "right"
  ) {
    return false;
  }
  return true;
}

function isCaptionBox(value: unknown): value is CaptionBox {
  if (!isRecord(value)) return false;
  if (!hasOnlyKeys(value, ["id", "kind", "templateIndex", "segments", "layout", "style", "z"])) {
    return false;
  }
  if (typeof value.id !== "string" || value.id.length > MAX_BOX_ID_LENGTH) return false;
  if (value.kind !== "template" && value.kind !== "custom" && value.kind !== "emoji") return false;
  if (value.kind === "template" && !Number.isInteger(value.templateIndex)) return false;
  if (value.kind !== "template" && value.templateIndex !== undefined) return false;
  if (value.z !== undefined && !Number.isInteger(value.z)) return false;
  return (
    areCaptionSegments(value.segments) &&
    isBoxLayout(value.layout) &&
    isBoxVisualStyle(value.style)
  );
}

function rawTextsAreBounded(value: unknown, boxCount: number): value is string[] {
  if (!Array.isArray(value) || value.length !== boxCount) return false;
  if (!value.every((text) => typeof text === "string")) return false;
  return value.join("\n").length <= MAX_PLAIN_TEXT_LENGTH;
}

export function isCaptionDocument(value: unknown): value is CaptionDocument {
  if (!isRecord(value)) return false;

  if (value.v === 2) {
    return (
      Array.isArray(value.boxes) &&
      value.boxes.length > 0 &&
      value.boxes.length <= MAX_BOXES &&
      value.boxes.every(areCaptionSegments)
    );
  }

  if (value.v === 3) {
    return (
      Number.isInteger(value.layoutRevision) &&
      Array.isArray(value.boxes) &&
      value.boxes.length > 0 &&
      value.boxes.length <= MAX_BOXES &&
      value.boxes.every(isCaptionBox) &&
      rawTextsAreBounded(value.rawTexts, value.boxes.length)
    );
  }

  return false;
}

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
  if (doc.boxes.length > MAX_BOXES) return { ok: false, error: "invalid_caption" };

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
  if (len < 1 || len > MAX_PLAIN_TEXT_LENGTH) return { ok: false, error: "invalid_caption" };

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
