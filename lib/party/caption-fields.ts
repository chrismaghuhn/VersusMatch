import { CAPTION_MAX_LENGTH } from "@/lib/party/caption";
import { boxPlainText } from "@/lib/party/caption-rich/plain-text";
import { isCaptionDocumentV3, type CaptionDocument } from "@/lib/party/caption-rich/types";

export const CAPTION_FIELD_COUNT = 2;

export const CAPTION_FIELD_LABELS = ["Top", "Bottom"] as const;

/** Local draft separator for 3+ fields (not used on wire). */
const MULTI_FIELD_SEP = "\x1e";

const DEFAULT_TWO_BOX_IDS = ["top", "bottom"] as const;

/** Split stored caption into fields without trimming (preserves spaces while editing). */
export function splitCaptionToFields(caption: string): [string, string] {
  const pipeIndex = caption.indexOf("|");
  if (pipeIndex === -1) {
    return [caption, ""];
  }
  return [caption.slice(0, pipeIndex), caption.slice(pipeIndex + 1)];
}

/** Humanize a template text box id for field labels. */
export function humanizeTextBoxLabel(id: string, index: number): string {
  const qMatch = /^q(\d+)$/i.exec(id);
  if (qMatch) return `Panel ${qMatch[1]}`;

  const lower = id.toLowerCase();
  if (lower === "top") return "Top";
  if (lower === "bottom") return "Bottom";
  if (lower === "left") return "Left";
  if (lower === "right") return "Right";

  if (id) {
    return id.charAt(0).toUpperCase() + id.slice(1);
  }
  return `Panel ${index + 1}`;
}

/** Resolve field labels from template text box ids (falls back to Top/Bottom for 2-box). */
export function captionFieldLabels(textBoxes: Array<{ id: string }> | undefined, boxCount: number): string[] {
  if (textBoxes && textBoxes.length > 0) {
    return textBoxes.map((box, i) => humanizeTextBoxLabel(box.id, i));
  }
  if (boxCount === 2) {
    return [...CAPTION_FIELD_LABELS];
  }
  return Array.from({ length: boxCount }, (_, i) => `Panel ${i + 1}`);
}

/** Split draft value into per-box field texts for the given box count. */
export function splitCaptionToFieldTexts(caption: string, boxCount: number): string[] {
  if (boxCount <= 1) {
    return [caption];
  }
  if (boxCount === 2) {
    const [top, bottom] = splitCaptionToFields(caption);
    return [top, bottom];
  }
  if (caption.includes(MULTI_FIELD_SEP)) {
    const parts = caption.split(MULTI_FIELD_SEP);
    return Array.from({ length: boxCount }, (_, i) => parts[i] ?? "");
  }
  return [caption, ...Array.from({ length: boxCount - 1 }, () => "")];
}

/** Build caption from fields — no trim; used on change and for live preview (2-box pipe). */
export function buildCaptionFromFields(top: string, bottom: string): string {
  if (!top && !bottom) return "";
  if (!bottom) return top.slice(0, CAPTION_MAX_LENGTH);
  if (!top) return bottom.slice(0, CAPTION_MAX_LENGTH);
  const combined = `${top}|${bottom}`;
  return combined.slice(0, CAPTION_MAX_LENGTH);
}

/** Encode field texts into a single draft string. */
export function buildCaptionFromFieldTexts(texts: string[]): string {
  if (texts.length === 0) return "";
  if (texts.length === 1) return texts[0]!.slice(0, CAPTION_MAX_LENGTH);
  if (texts.length === 2) {
    return buildCaptionFromFields(texts[0] ?? "", texts[1] ?? "");
  }
  return texts.join(MULTI_FIELD_SEP).slice(0, CAPTION_MAX_LENGTH + (texts.length - 1));
}

/** Trim each field then build — call only at submit boundary (2-box pipe). */
export function buildCaptionFromFieldsForSubmit(top: string, bottom: string): string {
  return buildCaptionFromFields(top.trim(), bottom.trim());
}

/** Trim each field then encode — call only at submit boundary. */
export function buildCaptionFromFieldTextsForSubmit(texts: string[]): string[] {
  return texts.map((t) => t.trim());
}

export function captionFieldsTotalLength(top: string, bottom: string): number {
  if (!top && !bottom) return 0;
  if (!top) return bottom.length;
  if (!bottom) return top.length;
  return top.length + 1 + bottom.length;
}

/** Total plain character count across all fields (no separator chars). */
export function captionFieldTextsTotalLength(texts: string[]): number {
  return texts.reduce((sum, t) => sum + t.length, 0);
}

export function clampCaptionFields(top: string, bottom: string): [string, string] {
  let t = top;
  let b = bottom;
  while (captionFieldsTotalLength(t, b) > CAPTION_MAX_LENGTH) {
    if (b.length >= t.length && b.length > 0) {
      b = b.slice(0, -1);
    } else if (t.length > 0) {
      t = t.slice(0, -1);
    } else {
      break;
    }
  }
  return [t, b];
}

export function clampCaptionFieldTexts(texts: string[]): string[] {
  const result = [...texts];
  while (captionFieldTextsTotalLength(result) > CAPTION_MAX_LENGTH) {
    let longest = 0;
    for (let i = 1; i < result.length; i++) {
      if ((result[i]?.length ?? 0) > (result[longest]?.length ?? 0)) {
        longest = i;
      }
    }
    const field = result[longest] ?? "";
    if (field.length === 0) break;
    result[longest] = field.slice(0, -1);
  }
  return result;
}

/** Restore editable field texts from a submission (rich v2 or legacy pipe). */
export function fieldTextsFromSubmission(
  sub: { caption: string; captionRich?: CaptionDocument | null },
  boxCount: number
): string[] {
  if (sub.captionRich) {
    const rich = sub.captionRich;
    if (isCaptionDocumentV3(rich)) {
      return Array.from({ length: boxCount }, (_, i) => {
        const box = rich.boxes.find((b) => b.kind === "template" && b.templateIndex === i);
        return box ? boxPlainText(box.segments) : "";
      });
    }
    return Array.from({ length: boxCount }, (_, i) => {
      const box = rich.boxes[i];
      if (!box) return "";
      return box.map((s) => s.text).join("");
    });
  }
  return splitCaptionToFieldTexts(sub.caption, boxCount);
}

/** Default 2-box template shape when no template is loaded yet. */
export function defaultCaptionTextBoxes(boxCount: number): Array<{ id: string }> {
  if (boxCount === 2) {
    return DEFAULT_TWO_BOX_IDS.map((id) => ({ id }));
  }
  return Array.from({ length: boxCount }, (_, i) => ({ id: `q${i + 1}` }));
}
