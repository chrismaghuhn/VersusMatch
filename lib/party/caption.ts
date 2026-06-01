/** Single caption string; MemeFrame splits on `|`. */
export const CAPTION_MAX_LENGTH = 120;

export const CAPTION_PLACEHOLDER = "TOP TEXT | BOTTOM TEXT";

export function normalizeCaption(raw: string): string {
  return raw.trim().slice(0, CAPTION_MAX_LENGTH);
}

export function isCaptionValid(caption: string): boolean {
  const normalized = normalizeCaption(caption);
  return normalized.length >= 1 && normalized.length <= CAPTION_MAX_LENGTH;
}
