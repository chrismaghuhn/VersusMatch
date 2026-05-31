export function buildVoteShareText(title: string, sideLabel: string, url: string): string {
  return `${title} — I voted ${sideLabel}. ${url}`;
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
