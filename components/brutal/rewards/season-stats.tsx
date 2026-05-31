import { Flame, Trophy, Zap } from "lucide-react";
import { PASS_TIERS } from "@/lib/rewards/constants";
import type { RewardsMe } from "@/lib/rewards/types";

type SeasonStatsProps = {
  data: RewardsMe;
};

export function SeasonStats({ data }: SeasonStatsProps) {
  const unlockedTiers = PASS_TIERS.filter((row) => data.xp >= row.xp).length;
  const maxTier = PASS_TIERS[PASS_TIERS.length - 1].tier;

  const stats = [
    {
      icon: <Zap className="h-5 w-5" />,
      label: "SEASON XP",
      value: data.xp.toLocaleString("en-US"),
      delta: `Tier ${data.tier} of ${maxTier}`,
      color: "#CCFF00",
    },
    {
      icon: <Flame className="h-5 w-5" />,
      label: "DAY STREAK",
      value: String(data.streak),
      delta:
        data.longestStreak > data.streak
          ? `Best: ${data.longestStreak} days`
          : "Vote today to keep it",
      color: "#FF2D87",
    },
    {
      icon: <Trophy className="h-5 w-5" />,
      label: "VOTES",
      value: String(data.seasonVoteCount),
      delta: "Rewarded this season",
      color: "#00E1FF",
    },
    {
      icon: <Trophy className="h-5 w-5" />,
      label: "BADGES",
      value: String(data.badges.length),
      delta: `${unlockedTiers} tiers unlocked`,
      color: "#FFB800",
    },
  ];

  const milestones = PASS_TIERS.filter((row) => row.tier > 1).map((row) => {
    const done = data.xp >= row.xp;
    const prevXp = PASS_TIERS.find((r) => r.tier === row.tier - 1)?.xp ?? 0;
    const progress = done
      ? 100
      : data.xp <= prevXp
        ? 0
        : Math.round(((data.xp - prevXp) / (row.xp - prevXp)) * 100);

    return {
      tier: row.tier,
      name: `Tier ${row.tier}`,
      done,
      progress,
    };
  });

  return (
    <section className="border-b border-white/10 bg-black">
      <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10">
          <div
            className="mb-3 text-white/40"
            style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em" }}
          >
            ━━ YOUR SEASON
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
            Receipts<span className="text-[#CCFF00]">.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            {stats.map((s) => (
              <div
                key={s.label}
                className="group relative border border-white/10 bg-[#0a0a0a] p-5 transition hover:border-white/30"
              >
                <div
                  className="absolute left-0 top-0 h-1 w-full opacity-60"
                  style={{ background: s.color }}
                />
                <div
                  className="flex h-10 w-10 items-center justify-center"
                  style={{
                    color: s.color,
                    background: `${s.color}10`,
                    border: `1px solid ${s.color}40`,
                  }}
                >
                  {s.icon}
                </div>
                <div
                  className="mt-5 text-white"
                  style={{
                    fontWeight: 900,
                    fontSize: 36,
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </div>
                <div
                  className="mt-2 text-white/50"
                  style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em" }}
                >
                  {s.label}
                </div>
                <div className="mt-1 text-white/40" style={{ fontSize: 11 }}>
                  {s.delta}
                </div>
              </div>
            ))}
          </div>

          <div className="border border-white/10 bg-[#0a0a0a]">
            <div className="border-b border-white/10 px-5 py-4">
              <div
                className="text-white/40"
                style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em" }}
              >
                NEXT MILESTONES
              </div>
              <h3
                className="mt-1 text-white"
                style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.03em" }}
              >
                What you&apos;re chasing
              </h3>
            </div>
            <div className="divide-y divide-white/5">
              {milestones.map((m) => (
                <div key={m.tier} className="flex items-center gap-4 px-5 py-4">
                  <div
                    className={
                      "flex h-10 w-10 items-center justify-center border " +
                      (m.done
                        ? "border-[#CCFF00] bg-[#CCFF00] text-black"
                        : "border-white/20 text-white/60")
                    }
                    style={{ fontWeight: 900, fontSize: 14, letterSpacing: "-0.02em" }}
                  >
                    T{m.tier}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-white" style={{ fontWeight: 700, fontSize: 14 }}>
                      {m.name}
                    </div>
                    {!m.done && (
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1 w-full bg-white/10">
                          <div
                            className="h-full bg-[#CCFF00]"
                            style={{ width: `${m.progress}%` }}
                          />
                        </div>
                        <span
                          className="text-white/40"
                          style={{ fontSize: 10, fontWeight: 700 }}
                        >
                          {m.progress}%
                        </span>
                      </div>
                    )}
                    {m.done && (
                      <div
                        className="mt-1 text-[#CCFF00]"
                        style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}
                      >
                        ✓ UNLOCKED
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
