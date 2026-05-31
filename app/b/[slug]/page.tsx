import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BattleVote } from "@/components/battle-vote";
import { getBattleBySlug, getBattleResults } from "@/lib/battles";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl, getPublicImageUrl } from "@/lib/utils";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const battle = await getBattleBySlug(supabase, slug);

  if (!battle) {
    return {
      title: "Battle nicht gefunden",
    };
  }

  const optionA = battle.battle_options[0]?.label ?? "Option A";
  const optionB = battle.battle_options[1]?.label ?? "Option B";
  const imageA = getPublicImageUrl(battle.battle_options[0]?.image_path);
  const imageB = getPublicImageUrl(battle.battle_options[1]?.image_path);
  const ogImage = imageA ?? imageB ?? undefined;
  const description = `${optionA} vs ${optionB} — Stimme ab auf MemeFight!`;
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
      locale: "de_DE",
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
  const supabase = await createClient();
  const battle = await getBattleBySlug(supabase, slug);

  if (!battle) {
    notFound();
  }

  const results = await getBattleResults(supabase, battle.id);
  const shareUrl = getAppUrl(`/b/${battle.slug}`);

  return (
    <BattleVote battle={battle} initialResults={results} shareUrl={shareUrl} />
  );
}
