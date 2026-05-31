import type { Metadata } from "next";
import Link from "next/link";
import { BattleCard, CreateBattleCard } from "@/components/battle-card";
import { Button } from "@/components/ui/button";
import { getActiveBattlesFeed } from "@/lib/battles";
import { getAppUrl } from "@/lib/utils";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Trending Battles",
  description: "Top A-vs-B battles by total votes on MemeFight.",
  alternates: {
    canonical: getAppUrl("/trending"),
  },
  openGraph: {
    title: "Trending Battles | MemeFight",
    description: "The most voted fights on MemeFight — pick a side.",
    url: getAppUrl("/trending"),
  },
};

export default async function TrendingPage() {
  const supabase = createPublicClient();
  const battles = await getActiveBattlesFeed(supabase, {
    limit: 24,
    sort: "votes",
  });

  return (
    <div className="border-b border-white/10 bg-black">
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 sm:py-20">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div
              className="mb-3 text-white/40"
              style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em" }}
            >
              ━━ TOP FIGHTS
            </div>
            <h1
              className="text-white"
              style={{
                fontWeight: 900,
                fontSize: "clamp(36px, 6vw, 72px)",
                letterSpacing: "-0.05em",
                lineHeight: 0.9,
              }}
            >
              Trending
              <br />
              <span className="relative inline-block">
                battles<span className="text-[#FF2D87]">.</span>
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-white/60" style={{ fontSize: 16, lineHeight: 1.5 }}>
              Ranked by total votes — the crowd has spoken.
            </p>
          </div>
          <Link href="/create">
            <Button>Create battle</Button>
          </Link>
        </div>

        {battles.length === 0 ? (
          <div className="border border-dashed border-white/20 px-6 py-16 text-center">
            <p className="text-lg font-black text-white">No battles yet</p>
            <p className="mt-2 text-white/50">Create the first fight and share the link.</p>
            <Link href="/create" className="mt-6 inline-block">
              <Button>Create now</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {battles.map((battle, index) => (
              <BattleCard key={battle.id} battle={battle} priority={index < 4} />
            ))}
            <CreateBattleCard />
          </div>
        )}
      </div>
    </div>
  );
}
