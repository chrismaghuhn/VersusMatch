import { CAPTION_MAX_LENGTH } from "@/lib/party/caption";

export const CAPTION_FIELD_COUNT = 2;

export const CAPTION_FIELD_LABELS = ["Top", "Bottom"] as const;

export function splitCaptionToFields(caption: string): [string, string] {
  const parts = caption.split("|").map((p) => p.trim());
  return [parts[0] ?? "", parts[1] ?? ""];
}

export function buildCaptionFromFields(top: string, bottom: string): string {
  const t = top.trim();
  const b = bottom.trim();
  if (!t && !b) return "";
  if (!b) return t.slice(0, CAPTION_MAX_LENGTH);
  if (!t) return b.slice(0, CAPTION_MAX_LENGTH);
  const combined = `${t}|${b}`;
  return combined.slice(0, CAPTION_MAX_LENGTH);
}

export function captionFieldsTotalLength(top: string, bottom: string): number {
  const t = top.trim();
  const b = bottom.trim();
  if (!t && !b) return 0;
  if (!t) return b.length;
  if (!b) return t.length;
  return t.length + 1 + b.length;
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
