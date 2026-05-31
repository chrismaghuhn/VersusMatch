"use client";

import { Calendar, Flame, Trophy, Zap } from "lucide-react";
import { Noise } from "@/components/brutal/noise";
import { PASS_TIERS } from "@/lib/rewards/constants";
import { seasonDaysRemaining } from "@/lib/rewards/format-pass-reward";
import type { RewardsMe } from "@/lib/rewards/types";

type RewardsHeroProps = {
  data: RewardsMe;
};

export function RewardsHero({ data }: RewardsHeroProps) {
  const maxTier = PASS_TIERS[PASS_TIERS.length - 1].tier;
  const tierStart = PASS_TIERS.find((row) => row.tier === data.tier)?.xp ?? 0;
  const progressPct =
    data.nextTierXp != null && data.nextTierXp > tierStart
      ? Math.min(
          100,
          Math.round(((data.xp - tierStart) / (data.nextTierXp - tierStart)) * 100)
        )
      : 100;

  const daysLeft = data.season ? seasonDaysRemaining(data.season.endsAt) : null;
  const unlockedTierCount = PASS_TIERS.filter((row) => data.xp >= row.xp).length;

  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-black">
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
      <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-[#FF2D87] opacity-[0.18] blur-[140px]" />
      <div className="absolute -right-40 top-40 h-[500px] w-[500px] rounded-full bg-[#CCFF00] opacity-[0.18] blur-[140px]" />
      <Noise opacity={0.12} />

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 pb-12 pt-16 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          {data.season ? (
            <div className="inline-flex items-center gap-2 border border-white/15 bg-white/[0.03] px-3 py-1.5 backdrop-blur">
              <Flame className="h-3 w-3 fill-[#FF2D87] text-[#FF2D87]" />
              <span
                className="text-white/80"
                style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em" }}
              >
                {data.season.name.toUpperCase()}
              </span>
            </div>
          ) : null}
          {daysLeft != null ? (
            <div className="inline-flex items-center gap-1.5 border border-[#CCFF00]/30 bg-[#CCFF00]/5 px-3 py-1.5">
              <Calendar className="h-3 w-3 text-[#CCFF00]" />
              <span
                className="text-[#CCFF00]"
                style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em" }}
              >
                {daysLeft === 0 ? "SEASON ENDING SOON" : `ENDS IN ${daysLeft} DAYS`}
              </span>
            </div>
          ) : null}
          <div
            className="-rotate-3 border border-[#CCFF00]/50 bg-[#CCFF00]/10 px-2.5 py-1 text-[#CCFF00]"
            style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.2em" }}
          >
            100% FREE
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-7">
            <h1
              className="text-white"
              style={{
                fontWeight: 900,
                fontSize: "clamp(56px, 9vw, 140px)",
                lineHeight: 0.85,
                letterSpacing: "-0.06em",
              }}
            >
              <span className="block">EARN STUFF</span>
              <span className="text-white/30">FOR HAVING</span>{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-black" style={{ paddingInline: "0.08em" }}>
                  OPINIONS
                </span>
                <span className="absolute inset-y-[0.08em] inset-x-[-0.04em] z-0 -skew-x-6 bg-[#CCFF00]" />
              </span>
              <span className="text-[#CCFF00]">.</span>
            </h1>
            <div className="mt-8 flex max-w-2xl items-start gap-6">
              <div className="mt-3 h-px w-12 bg-[#CCFF00]" />
              <p className="text-white/70" style={{ fontSize: 17, lineHeight: 1.5 }}>
                Five tiers of titles, badges, and share flexes — unlocked by doing what you
                already do:{" "}
                <span className="text-white">voting, fighting, and refusing to shut up.</span>{" "}
                No paywall. Ever.
              </p>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5">
            <div className="relative border border-white/15 bg-white/[0.02] p-6 backdrop-blur">
              <div
                className="absolute -top-2 left-6 bg-[#CCFF00] px-2.5 py-1 text-black"
                style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.18em" }}
              >
                YOUR PROGRESS
              </div>

              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div
                    className="text-white/40"
                    style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em" }}
                  >
                    CURRENT TIER
                  </div>
                  <div
                    className="mt-1 flex items-baseline gap-2 text-white"
                    style={{
                      fontWeight: 900,
                      fontSize: 80,
                      lineHeight: 1,
                      letterSpacing: "-0.05em",
                    }}
                  >
                    {data.tier}
                    <span className="text-white/40" style={{ fontSize: 22, fontWeight: 800 }}>
                      / {maxTier}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-white/40"
                    style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em" }}
                  >
                    TOTAL XP
                  </div>
                  <div
                    className="mt-1 text-[#CCFF00]"
                    style={{
                      fontWeight: 900,
                      fontSize: 28,
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                    }}
                  >
                    {data.xp.toLocaleString("en-US")}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div
                  className="mb-2 flex items-center justify-between text-white/60"
                  style={{ fontSize: 11, fontWeight: 600 }}
                >
                  <span>{data.xp.toLocaleString("en-US")} XP</span>
                  {data.nextTierXp != null ? (
                    <span>
                      {(data.nextTierXp - data.xp).toLocaleString("en-US")} XP to tier{" "}
                      {data.tier + 1}
                    </span>
                  ) : (
                    <span>MAX TIER</span>
                  )}
                </div>
                <div className="relative h-3 w-full overflow-hidden border border-white/20 bg-black">
                  <div
                    className="absolute inset-y-0 left-0 transition-all"
                    style={{
                      width: `${progressPct}%`,
                      background: "linear-gradient(90deg, #CCFF00, #FF2D87)",
                    }}
                  />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-5">
                <Mini
                  icon={<Trophy className="h-3.5 w-3.5" />}
                  label="TIERS"
                  value={`${unlockedTierCount}/${maxTier}`}
                />
                <Mini
                  icon={<Flame className="h-3.5 w-3.5" />}
                  label="STREAK"
                  value={data.streak > 0 ? `${data.streak}d` : "—"}
                  highlight={data.streak > 0}
                />
                <Mini
                  icon={<Zap className="h-3.5 w-3.5" />}
                  label="VOTES"
                  value={String(data.seasonVoteCount)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Mini({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "border border-white/10 px-3 py-2 " +
        (highlight ? "border-[#CCFF00]/40 bg-[#CCFF00]/5" : "")
      }
    >
      <div
        className={
          "flex items-center gap-1.5 " + (highlight ? "text-[#CCFF00]" : "text-white/50")
        }
      >
        {icon}
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.15em" }}>{label}</span>
      </div>
      <div
        className={"mt-1 " + (highlight ? "text-[#CCFF00]" : "text-white")}
        style={{
          fontWeight: 900,
          fontSize: 18,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}
