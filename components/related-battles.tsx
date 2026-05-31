import Link from "next/link";
import { BattleCard } from "@/components/battle-card";
import { getActiveBattlesFeed } from "@/lib/battles";
import type { BattleCategory } from "@/lib/categories";
import { createPublicClient } from "@/lib/supabase/public";

type RelatedBattlesProps = {
  currentBattleId: string;
  category: BattleCategory | string;
};

export async function RelatedBattles({ currentBattleId, category }: RelatedBattlesProps) {
  const supabase = createPublicClient();
  const battles = await getActiveBattlesFeed(supabase, {
    limit: 4,
    category: category as BattleCategory,
    sort: "votes",
  }).then((items) => items.filter((battle) => battle.id !== currentBattleId).slice(0, 3));

  if (battles.length === 0) return null;

  return (
    <section className="border-t border-white/10 bg-black">
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div
              className="mb-2 text-white/40"
              style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em" }}
            >
              MORE FIGHTS
            </div>
            <h2
              className="text-white"
              style={{ fontWeight: 900, fontSize: 28, letterSpacing: "-0.03em" }}
            >
              Related battles
            </h2>
          </div>
          <Link
            href={`/feed/${category}`}
            className="text-[#CCFF00] transition hover:text-white"
            style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em" }}
          >
            VIEW CATEGORY →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {battles.map((battle) => (
            <BattleCard key={battle.id} battle={battle} />
          ))}
        </div>
      </div>
    </section>
  );
}
