import Link from "next/link";
import { BattleCard, CreateBattleCard } from "@/components/battle-card";
import { FeedFilters } from "@/components/feed-filters";
import { Button } from "@/components/ui/button";
import type { FeedSort } from "@/lib/battles";
import type { BattleCategory } from "@/lib/categories";
import { getCategoryLabel } from "@/lib/categories";
import type { FeedBattle } from "@/lib/database.types";

type FeedPageContentProps = {
  battles: FeedBattle[];
  category: BattleCategory | "all";
  sort: FeedSort;
  intro?: string;
};

export function FeedPageContent({ battles, category, sort, intro }: FeedPageContentProps) {
  const categoryLabel = category === "all" ? null : getCategoryLabel(category);
  const headline =
    category === "all" ? (
      <>
        Trending
        <br />
        <span className="relative inline-block">
          fights<span className="text-[#FF2D87]">.</span>
        </span>
      </>
    ) : (
      <>
        {categoryLabel}
        <br />
        <span className="relative inline-block">
          battles<span className="text-[#FF2D87]">.</span>
        </span>
      </>
    );

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
              {headline}
            </h1>
            {intro ? (
              <p className="mt-4 max-w-2xl text-white/60" style={{ fontSize: 16, lineHeight: 1.5 }}>
                {intro}
              </p>
            ) : null}
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
