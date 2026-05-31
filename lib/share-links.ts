export function buildVoteShareText(title: string, sideLabel: string, url: string): string {
  return `${title} — I voted ${sideLabel}. ${url}`;
}

/** Tier 3+ battle pass unlock — dramatic share copy referencing pick and matchup. */
export function buildVoteShareTextStyle2(
  title: string,
  sideLabel: string,
  otherLabel: string,
  url: string
): string {
  return `${sideLabel.toUpperCase()} ALL DAY. "${title}" — ${sideLabel} vs ${otherLabel}. I already voted. Your move → ${url}`;
}

export function buildBattleShareText(
  title: string,
  optionA: string,
  optionB: string,
  url: string
): string {
  return `${title} — ${optionA} vs ${optionB}. Vote now: ${url}`;
}

export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function twitterShareUrl(text: string, url: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

export function telegramShareUrl(text: string, url: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}
