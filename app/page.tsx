import Link from "next/link";
import { BattleCard, CreateBattleCard } from "@/components/battle-card";
import { BrutalCreateCta } from "@/components/brutal/create-cta";
import { BrutalHero } from "@/components/brutal/hero";
import { getActiveBattlesFeed } from "@/lib/battles";
import { getSiteStats, type SiteStats } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";

const emptyStats: SiteStats = { activeBattles: 0, totalVotes: 0, votesLast24h: 0 };

export default async function HomePage() {
  const supabase = await createClient();
  const battles = await getActiveBattlesFeed(supabase, { limit: 6 });

  let stats = emptyStats;
  try {
    stats = await getSiteStats();
  } catch {
    stats = emptyStats;
  }

  return (
    <div>
      <BrutalHero stats={stats} />

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
                Aktuelle
                <br />
                <span className="relative inline-block">
                  fights<span className="text-[#FF2D87]">.</span>
                </span>
              </h2>
            </div>
            <Link
              href="/feed"
              className="text-[#CCFF00] transition hover:text-white"
              style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.15em" }}
            >
              ALLE ANSEHEN →
            </Link>
          </div>

          {battles.length === 0 ? (
            <div className="border border-dashed border-white/20 px-6 py-16 text-center">
              <p className="font-black text-white">Noch keine Battles live</p>
              <p className="mt-2 text-sm text-white/50">
                Erstelle das erste Battle und teile den Link.
              </p>
              <Link
                href="/create"
                className="mt-6 inline-block bg-[#CCFF00] px-6 py-3 text-black transition hover:bg-white"
                style={{ fontWeight: 800, fontSize: 12, letterSpacing: "0.08em" }}
              >
                ERSTES BATTLE ERSTELLEN
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {battles.map((battle) => (
                <BattleCard key={battle.id} battle={battle} />
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
