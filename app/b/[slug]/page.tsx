import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { BattleVote } from "@/components/battle-vote";
import { getCachedBattleBySlug, getCachedBattleResults } from "@/lib/battles-cache";
import { getAppUrl, getPublicImageUrl } from "@/lib/utils";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const battle = await getCachedBattleBySlug(slug);

  if (!battle) {
    return {
      title: "Battle not found",
    };
  }

  const optionA = battle.battle_options[0]?.label ?? "Option A";
  const optionB = battle.battle_options[1]?.label ?? "Option B";
  const imageA = getPublicImageUrl(battle.battle_options[0]?.image_path);
  const imageB = getPublicImageUrl(battle.battle_options[1]?.image_path);
  const ogImage = imageA ?? imageB ?? undefined;
  const description = `${optionA} vs ${optionB} — vote on MemeFight!`;
  const url = getAppUrl(`/b/${battle.slug}`);

  return {
    title: battle.title,
    description,
    openGraph: {
      title: battle.title,
      description,
      url,
      siteName: "MemeFight",
      type: "website",
      locale: "en_US",
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: battle.title }] : [],
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: battle.title,
      description,
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default async function BattlePage({ params }: PageProps) {
  const { slug } = await params;
  const battle = await getCachedBattleBySlug(slug);

  if (!battle) {
    notFound();
  }

  const results = await getCachedBattleResults(battle.id);
  const shareUrl = getAppUrl(`/b/${battle.slug}`);

  const lcpImage =
    getPublicImageUrl(battle.battle_options[0]?.image_path) ??
    getPublicImageUrl(battle.battle_options[1]?.image_path);

  if (lcpImage) {
    preload(lcpImage, { as: "image", fetchPriority: "high" });
  }

  return <BattleVote battle={battle} initialResults={results} shareUrl={shareUrl} />;
}
