import Link from "next/link";
import { BattleCard, CreateBattleCard } from "@/components/battle-card";
import { BrutalCreateCta } from "@/components/brutal/create-cta";
import { BrutalHero } from "@/components/brutal/hero";
import { FightOfTheDayHero } from "@/components/fight-of-the-day-hero";
import { getActiveBattlesFeed } from "@/lib/battles";
import { getFeaturedBattleForDate } from "@/lib/rewards/featured-battle";
import { getCachedSiteStats, type SiteStats } from "@/lib/stats";
import { getAppUrl } from "@/lib/utils";
import { createPublicClient } from "@/lib/supabase/public";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "MemeFight — A vs B Battles",
  description:
    "Create shareable A-vs-B battles, share the link, and watch live votes roll in. No signup needed to vote.",
  alternates: {
    canonical: getAppUrl("/"),
  },
  openGraph: {
    title: "MemeFight — Pick a side. Start a fight.",
    description:
      "Shareable A-vs-B battles on memefight.lol. Two options. One winner. Live results.",
    url: getAppUrl("/"),
  },
};

const emptyStats: SiteStats = { activeBattles: 0, totalVotes: 0, votesLast24h: 0 };

export default async function HomePage() {
  const supabase = createPublicClient();

  const [battles, statsResult, fightOfTheDay] = await Promise.all([
    getActiveBattlesFeed(supabase, { limit: 6 }),
    getCachedSiteStats().catch(() => emptyStats),
    getFeaturedBattleForDate(supabase, new Date()),
  ]);

  const stats = statsResult ?? emptyStats;
  const homeBattles = [...battles].sort((a, b) => b.total_votes - a.total_votes);

  return (
    <div>
      <BrutalHero stats={stats} />

      {fightOfTheDay ? <FightOfTheDayHero battle={fightOfTheDay} /> : null}

      <section className="border-b border-white/10 bg-black">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 sm:py-24">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div>
              <div
                className="mb-3 text-white/40"
                style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em" }}
              >
                ━━ NOW BREWING
              </div>
              <h2
                className="text-white"
                style={{
                  fontWeight: 900,
                  fontSize: "clamp(36px, 6vw, 72px)",
                  letterSpacing: "-0.05em",
                  lineHeight: 0.9,
                }}
              >
                Latest
                <br />
                <span className="relative inline-block">
                  fights<span className="text-[#FF2D87]">.</span>
                </span>
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/trending"
                className="text-[#CCFF00] transition hover:text-white"
                style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.15em" }}
              >
                TRENDING →
              </Link>
              <Link
                href="/feed"
                className="text-white/50 transition hover:text-white"
                style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.15em" }}
              >
                VIEW ALL →
              </Link>
            </div>
          </div>

          {battles.length === 0 ? (
            <div className="border border-dashed border-white/20 px-6 py-16 text-center">
              <p className="font-black text-white">No battles live yet</p>
              <p className="mt-2 text-sm text-white/50">
                Create the first battle and share the link.
              </p>
              <Link
                href="/create"
                className="mt-6 inline-block bg-[#CCFF00] px-6 py-3 text-black transition hover:bg-white"
                style={{ fontWeight: 800, fontSize: 12, letterSpacing: "0.08em" }}
              >
                CREATE FIRST BATTLE
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {homeBattles.map((battle, index) => (
                <BattleCard key={battle.id} battle={battle} priority={index < 4} />
              ))}
              <CreateBattleCard />
            </div>
          )}
        </div>
      </section>

      <BrutalCreateCta totalVotes={stats.totalVotes} />
    </div>
  );
}
