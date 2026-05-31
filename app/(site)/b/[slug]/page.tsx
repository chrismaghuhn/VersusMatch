import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { preload } from "react-dom";
import { BattleJsonLd } from "@/components/battle-json-ld";
import { BattleVoteSection } from "@/components/battle-vote-section";
import { RelatedBattles } from "@/components/related-battles";
import {
  getCachedBattleBySlug,
  getCachedBattleResults,
  getCachedBattleSlugRedirect,
} from "@/lib/battles-cache";
import { getAppUrl, getPublicImageUrl } from "@/lib/utils";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ created?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  let battle = await getCachedBattleBySlug(slug);

  if (!battle) {
    const redirectSlug = await getCachedBattleSlugRedirect(slug);
    if (redirectSlug) {
      battle = await getCachedBattleBySlug(redirectSlug);
    }
  }

  if (!battle) {
    return {
      title: "Battle not found",
    };
  }

  const optionA = battle.battle_options[0]?.label ?? "Option A";
  const optionB = battle.battle_options[1]?.label ?? "Option B";
  const description = `${optionA} vs ${optionB} — vote on MemeFight!`;
  const url = getAppUrl(`/b/${battle.slug}`);

  return {
    title: battle.title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: battle.title,
      description,
      url,
      siteName: "MemeFight",
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: battle.title,
      description,
    },
  };
}

export default async function BattlePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { created } = await searchParams;
  const battle = await getCachedBattleBySlug(slug);

  if (!battle) {
    const redirectSlug = await getCachedBattleSlugRedirect(slug);
    if (redirectSlug) {
      permanentRedirect(`/b/${redirectSlug}`);
    }
    notFound();
  }

  const results = await getCachedBattleResults(battle.id);
  const shareUrl = getAppUrl(`/b/${battle.slug}`);
  const showCreateBanner = created === "1";

  const lcpImage =
    getPublicImageUrl(battle.battle_options[0]?.image_path) ??
    getPublicImageUrl(battle.battle_options[1]?.image_path);

  if (lcpImage) {
    preload(lcpImage, { as: "image", fetchPriority: "high" });
  }

  return (
    <>
      <BattleJsonLd battle={battle} shareUrl={shareUrl} />
      {lcpImage ? (
        <link rel="preload" as="image" href={lcpImage} fetchPriority="high" />
      ) : null}
      <BattleVoteSection
        battle={battle}
        initialResults={results}
        shareUrl={shareUrl}
        showCreateBanner={showCreateBanner}
      />
      <RelatedBattles currentBattleId={battle.id} category={battle.category} />
    </>
  );
}
