import type { CaptionDocument } from "@/lib/party/caption-rich/types";

/** Build a structural v2 document from raw field texts (one segment per box, no styling). */
export function structuralDocumentFromFieldTexts(texts: string[]): CaptionDocument {
  return {
    v: 2,
    boxes: texts.map((t) => [{ text: t }]),
  };
}
