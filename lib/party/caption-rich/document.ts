import type { CaptionDocument, CaptionSegment } from "./types.ts";
import { finalizeBox } from "./parse-markup.ts";

/** Build a structural v2 document from raw field texts (one segment per box, no styling). */
export function structuralDocumentFromFieldTexts(texts: string[]): CaptionDocument {
  return {
    v: 2,
    boxes: texts.map((t) => [{ text: t }]),
  };
}

/** Sync-parse each box on submit; applies markup syntax and flushes unclosed markers. */
export function finalizeCaptionDocument(draft: {
  rawTexts: string[];
  segmentOverrides?: (readonly CaptionSegment[] | null)[];
}): CaptionDocument {
  return {
    v: 2,
    boxes: draft.rawTexts.map((raw, i) => {
      const override = draft.segmentOverrides?.[i];
      return override ? [...override] : finalizeBox(raw);
    }),
  };
}
