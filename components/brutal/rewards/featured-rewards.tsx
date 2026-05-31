import { Crown, Share2 } from "lucide-react";
import { PASS_TIERS } from "@/lib/rewards/constants";
import { formatPassReward } from "@/lib/rewards/format-pass-reward";
import type { RewardsMe } from "@/lib/rewards/types";

type FeaturedRewardsProps = {
  data: RewardsMe;
};

const HIGHLIGHTS = [
  {
    tier: 3,
    name: "SHARE CARD STYLE 2",
    category: "SHARE FLEX",
    desc: "Unlock a bolder share card when you flex your pick after voting.",
    rare: "EPIC",
    color: "#FF2D87",
    icon: <Share2 className="h-12 w-12" />,
  },
  {
    tier: 5,
    name: "FIGHT LEGEND",
    category: "TITLE + BADGE",
    desc: formatPassReward(
      PASS_TIERS.find((row) => row.tier === 5)?.reward ?? "title:fight_legend+badge:legend"
    ),
    rare: "LEGENDARY",
    color: "#FFB800",
    icon: <Crown className="h-12 w-12" />,
  },
] as const;

export function FeaturedRewards({ data }: FeaturedRewardsProps) {
  return (
    <section className="border-b border-white/10 bg-[#0a0a0a]">
      <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10">
          <div
            className="mb-3 text-white/40"
            style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em" }}
          >
            ━━ HEADLINE LOOT
          </div>
          <h2
            className="text-white"
            style={{
              fontWeight: 900,
              fontSize: "clamp(44px, 6.5vw, 88px)",
              letterSpacing: "-0.05em",
              lineHeight: 0.9,
            }}
          >
            The ones worth <span className="italic text-[#FFB800]">grinding</span> for.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {HIGHLIGHTS.map((r) => {
            const tierXp = PASS_TIERS.find((row) => row.tier === r.tier)?.xp ?? 0;
            const unlocked = data.xp >= tierXp;

            return (
              <div
                key={r.tier}
                className="group relative overflow-hidden border border-white/10 bg-black p-7 transition hover:border-white/30"
              >
                <div
                  className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-20 blur-3xl transition group-hover:opacity-30"
                  style={{ background: r.color }}
                />
                <div className="absolute left-0 top-0 h-1 w-full" style={{ background: r.color }} />

                <div className="relative flex items-start justify-between">
                  <div
                    className="flex h-24 w-24 items-center justify-center border"
                    style={{ borderColor: r.color, color: r.color, background: `${r.color}10` }}
                  >
                    {r.icon}
                  </div>
                  <div className="text-right">
                    <div
                      className="inline-block px-2 py-1"
                      style={{
                        background: r.color,
                        color: "#000",
                        fontSize: 10,
                        fontWeight: 900,
                        letterSpacing: "0.15em",
                      }}
                    >
                      {r.rare}
                    </div>
                    <div
                      className="mt-2 text-white/40"
                      style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em" }}
                    >
                      UNLOCKS AT
                    </div>
                    <div
                      className="text-white"
                      style={{
                        fontWeight: 900,
                        fontSize: 48,
                        letterSpacing: "-0.04em",
                        lineHeight: 1,
                      }}
                    >
                      T{r.tier}
                    </div>
                  </div>
                </div>

                <div className="relative mt-6">
                  <div
                    className="text-white/40"
                    style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em" }}
                  >
                    {r.category}
                  </div>
                  <h3
                    className="mt-1 text-white"
                    style={{
                      fontWeight: 900,
                      fontSize: 32,
                      letterSpacing: "-0.03em",
                      lineHeight: 1,
                    }}
                  >
                    {r.name}
                  </h3>
                  <p className="mt-3 text-white/60" style={{ fontSize: 14, lineHeight: 1.5 }}>
                    {r.desc}
                  </p>
                </div>

                <div className="relative mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="text-white/40" style={{ fontSize: 11, letterSpacing: "0.1em" }}>
                    {unlocked ? "✓ UNLOCKED" : "🔒 KEEP GRINDING"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
