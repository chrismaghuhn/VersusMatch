/** Minimal caption blocklist for v1 — keep in sync with party_caption_has_profanity() in Postgres. */
const BLOCKED = new Set(["slur1", "fuck", "shit", "asshole"]);

export function captionHasProfanity(caption: string): boolean {
  const lower = caption.toLowerCase();
  for (const word of BLOCKED) {
    if (lower.includes(word)) {
      return true;
    }
  }
  return false;
}
