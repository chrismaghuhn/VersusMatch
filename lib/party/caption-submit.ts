import { normalizeCaption } from "@/lib/party/caption";
import { buildCaptionFromFieldTextsForSubmit } from "@/lib/party/caption-fields";
import { finalizeCaptionDocument } from "@/lib/party/caption-rich/document";
import { serializeCaptionPlain } from "@/lib/party/caption-rich/plain-text";
import type { CaptionDocument, CaptionSegment } from "@/lib/party/caption-rich/types";

export type CaptionSubmitPayload = {
  caption: string;
  captionRich?: CaptionDocument;
};

/** Build API submit payload: finalized v2 doc + canonical plain caption (all box counts). */
export function prepareCaptionSubmit(
  fieldTexts: string[],
  boxCount: number,
  segmentOverrides?: (readonly CaptionSegment[] | null)[]
): CaptionSubmitPayload | null {
  const trimmed = buildCaptionFromFieldTextsForSubmit(fieldTexts);
  if (trimmed.every((t) => !t)) return null;

  const doc = finalizeCaptionDocument({
    rawTexts: trimmed.slice(0, boxCount),
    segmentOverrides,
  });
  const plain = serializeCaptionPlain(doc);
  const caption = normalizeCaption(plain);
  if (!caption) return null;

  return {
    caption,
    captionRich: doc,
  };
}
