import { CAPTION_MAX_LENGTH } from "@/lib/party/caption";

export const CAPTION_FIELD_COUNT = 2;

export const CAPTION_FIELD_LABELS = ["Top", "Bottom"] as const;

/** Split stored caption into fields without trimming (preserves spaces while editing). */
export function splitCaptionToFields(caption: string): [string, string] {
  const pipeIndex = caption.indexOf("|");
  if (pipeIndex === -1) {
    return [caption, ""];
  }
  return [caption.slice(0, pipeIndex), caption.slice(pipeIndex + 1)];
}

/** Build caption from fields — no trim; used on change and for live preview. */
export function buildCaptionFromFields(top: string, bottom: string): string {
  if (!top && !bottom) return "";
  if (!bottom) return top.slice(0, CAPTION_MAX_LENGTH);
  if (!top) return bottom.slice(0, CAPTION_MAX_LENGTH);
  const combined = `${top}|${bottom}`;
  return combined.slice(0, CAPTION_MAX_LENGTH);
}

/** Trim each field then build — call only at submit boundary. */
export function buildCaptionFromFieldsForSubmit(top: string, bottom: string): string {
  return buildCaptionFromFields(top.trim(), bottom.trim());
}

export function captionFieldsTotalLength(top: string, bottom: string): number {
  if (!top && !bottom) return 0;
  if (!top) return bottom.length;
  if (!bottom) return top.length;
  return top.length + 1 + bottom.length;
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
