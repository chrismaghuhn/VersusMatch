import { getAppUrl } from "@/lib/utils";

const EMBED_HEIGHT = 520;

export function getBattleEmbedPath(slug: string): string {
  return `/embed/b/${slug}`;
}

export function getBattleEmbedUrl(slug: string): string {
  return getAppUrl(getBattleEmbedPath(slug));
}

export function buildBattleEmbedSnippet(slug: string): string {
  const url = getBattleEmbedUrl(slug);
  return `<iframe src="${url}" width="100%" height="${EMBED_HEIGHT}" frameborder="0" loading="lazy" title="MemeFight battle"></iframe>`;
}
