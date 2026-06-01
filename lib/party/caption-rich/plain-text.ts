import type { CaptionDocument } from "@/lib/party/caption-rich/types";

/** Canonical plain `caption` column for rich v2 submissions (newline between boxes). */
export function serializeCaptionPlain(doc: CaptionDocument): string {
  return doc.boxes
    .map((box) => box.map((s) => s.text).join(""))
    .join("\n");
}

export function plainTextLength(doc: CaptionDocument): number {
  return serializeCaptionPlain(doc).length;
}
