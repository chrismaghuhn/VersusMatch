import type { CaptionBox, CaptionDocument, CaptionSegment } from "@/lib/party/caption-rich/types";

export function boxPlainText(segments: CaptionSegment[]): string {
  return segments.map((s) => s.text).join("");
}

export function plainTextLengthFromBoxes(boxes: CaptionBox[]): number {
  return boxes.map((b) => boxPlainText(b.segments)).join("\n").length;
}

/** Canonical plain `caption` column for rich v2/v3 submissions (newline between boxes). */
export function serializeCaptionPlain(doc: CaptionDocument): string {
  if (doc.v === 3) {
    return doc.boxes.map((b) => boxPlainText(b.segments)).join("\n");
  }
  return doc.boxes.map((box) => box.map((s) => s.text).join("")).join("\n");
}

export function plainTextLength(doc: CaptionDocument): number {
  return serializeCaptionPlain(doc).length;
}
