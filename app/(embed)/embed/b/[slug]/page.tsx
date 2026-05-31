import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BattleEmbedSection } from "@/components/battle-embed-section";
import { getCachedBattleBySlug, getCachedBattleResults } from "@/lib/battles-cache";
import { getAppUrl } from "@/lib/utils";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const battle = await getCachedBattleBySlug(slug);

  return {
    title: battle ? `${battle.title} — MemeFight Embed` : "Battle embed",
    robots: { index: false, follow: false },
  };
}

export default async function BattleEmbedPage({ params }: PageProps) {
  const { slug } = await params;
  const battle = await getCachedBattleBySlug(slug);

  if (!battle) {
    notFound();
  }

  const results = await getCachedBattleResults(battle.id);
  const battleUrl = getAppUrl(`/b/${battle.slug}`);

  return (
    <>
      <BattleEmbedSection battle={battle} initialResults={results} battleUrl={battleUrl} />
      <div className="border-t border-white/10 px-4 py-3 text-center">
        <Link
          href={battleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/40 transition hover:text-[#CCFF00]"
          style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em" }}
        >
          POWERED BY MEMEFIGHT.LOL →
        </Link>
      </div>
    </>
  );
}
