import { normalizeCaption } from "@/lib/party/caption";
import { buildCaptionFromFieldTextsForSubmit } from "@/lib/party/caption-fields";
import {
  finalizeCaptionDocument,
  finalizeCaptionDocumentV3,
} from "@/lib/party/caption-rich/document";
import { serializeCaptionPlain } from "@/lib/party/caption-rich/plain-text";
import type { CaptionBox, CaptionDocument, CaptionSegment } from "@/lib/party/caption-rich/types";
import { validateCaptionDocumentV3 } from "@/lib/party/caption-rich/validate-document";
import type { TextBox } from "@/lib/party/types";

export type CaptionSubmitPayload = {
  caption: string;
  captionRich?: CaptionDocument;
};

export type CanvasSubmitOptions = {
  canvasEnabled: true;
  boxes: CaptionBox[];
  layoutRevision: number;
  templateBoxes: TextBox[];
};

/** Build API submit payload: finalized v2/v3 doc + canonical plain caption (all box counts). */
export function prepareCaptionSubmit(
  fieldTexts: string[],
  boxCount: number,
  segmentOverrides?: (readonly CaptionSegment[] | null)[],
  canvasOptions?: CanvasSubmitOptions
): CaptionSubmitPayload | null {
  const trimmed = buildCaptionFromFieldTextsForSubmit(fieldTexts);
  if (trimmed.every((t) => !t)) return null;

  if (canvasOptions?.canvasEnabled) {
    const doc = finalizeCaptionDocumentV3({
      boxes: canvasOptions.boxes,
      layoutRevision: canvasOptions.layoutRevision,
      rawTexts: trimmed.slice(0, boxCount),
      segmentOverrides,
    });
    const validation = validateCaptionDocumentV3(
      doc,
      canvasOptions.templateBoxes,
      canvasOptions.layoutRevision
    );
    if (!validation.ok) return null;

    const plain = serializeCaptionPlain(doc);
    const caption = normalizeCaption(plain);
    if (!caption) return null;

    return {
      caption,
      captionRich: doc,
    };
  }

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
