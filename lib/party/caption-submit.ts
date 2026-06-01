import { normalizeCaption } from "@/lib/party/caption";
import { buildCaptionFromFieldTextsForSubmit } from "@/lib/party/caption-fields";
import { structuralDocumentFromFieldTexts } from "@/lib/party/caption-rich/document";
import { serializeCaptionPlain } from "@/lib/party/caption-rich/plain-text";
import type { CaptionDocument } from "@/lib/party/caption-rich/types";

export type CaptionSubmitPayload = {
  caption: string;
  captionRich?: CaptionDocument;
};

/** Build API submit payload: structural v2 doc + canonical plain caption. */
export function prepareCaptionSubmit(fieldTexts: string[], boxCount: number): CaptionSubmitPayload | null {
  const trimmed = buildCaptionFromFieldTextsForSubmit(fieldTexts);
  if (trimmed.every((t) => !t)) return null;

  const doc = structuralDocumentFromFieldTexts(trimmed.slice(0, boxCount));
  const plain = serializeCaptionPlain(doc);
  const caption = normalizeCaption(plain);
  if (!caption) return null;

  return {
    caption,
    captionRich: doc,
  };
}
