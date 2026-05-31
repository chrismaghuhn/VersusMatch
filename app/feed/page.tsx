import Link from "next/link";
import type { Metadata } from "next";
import { BattleCard, CreateBattleCard } from "@/components/battle-card";
import { FeedFilters } from "@/components/feed-filters";
import { Button } from "@/components/ui/button";
import { getActiveBattlesFeed, type FeedSort } from "@/lib/battles";
import type { BattleCategory } from "@/lib/categories";
import { getAppUrl } from "@/lib/utils";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Live Feed",
  description: "Browse trending A-vs-B battles on MemeFight and vote live.",
  alternates: {
    canonical: getAppUrl("/feed"),
  },
  openGraph: {
    title: "MemeFight Live Feed",
    description: "Trending fights — pick a side and vote.",
    url: getAppUrl("/feed"),
  },
};

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const category = (params.category ?? "all") as BattleCategory | "all";
  const sort = (params.sort === "votes" ? "votes" : "new") as FeedSort;

  const supabase = createPublicClient();
  const battles = await getActiveBattlesFeed(supabase, {
    limit: 24,
    category,
    sort,
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
              ━━ LIVE FEED
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
                fights<span className="text-[#FF2D87]">.</span>
              </span>
            </h1>
          </div>
          <Link href="/create">
            <Button>Create battle</Button>
          </Link>
        </div>

        <div className="mb-10">
          <FeedFilters currentCategory={category} currentSort={sort} />
        </div>

        {battles.length === 0 ? (
          <div className="border border-dashed border-white/20 px-6 py-16 text-center">
            <p className="text-lg font-black text-white">No battles in this category</p>
            <p className="mt-2 text-white/50">Try another filter or create a battle.</p>
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
