"use client";

import { useEffect, useState } from "react";
import { RewardsProgressBar } from "@/components/rewards-progress-bar";
import { PASS_TIERS } from "@/lib/rewards/constants";
import { parseJsonResponse } from "@/lib/parse-json-response";

type RewardsMe = {
  xp: number;
  tier: number;
  nextTierXp: number | null;
  streak: number;
  badges: string[];
  season: { name: string; endsAt: string } | null;
};

const ACHIEVEMENT_BADGES = [
  { key: "first_blood", label: "First Blood", description: "First rewarded vote" },
  { key: "week_warrior", label: "Week Warrior", description: "7-day streak" },
  { key: "underdog", label: "Underdog", description: "5 underdog picks" },
  { key: "fight_fanatic", label: "Fight Fanatic", description: "50 votes in one season" },
  { key: "bronze", label: "Bronze", description: "Battle Pass Tier 2" },
  { key: "legend", label: "Legend", description: "Battle Pass Tier 5" },
] as const;

function formatPassReward(reward: string): string {
  return reward
    .split("+")
    .map((part) => {
      const [kind, value] = part.split(":");
      const label = value?.replace(/_/g, " ") ?? part;
      if (kind === "title") return `Title: ${label}`;
      if (kind === "badge") return `Badge: ${label}`;
      if (kind === "share_card") return `Share card: ${label}`;
      return part;
    })
    .join(" · ");
}

function seasonDaysRemaining(endsAt: string): number {
  const ms = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function RewardsPageContent() {
  const [data, setData] = useState<RewardsMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rewards/me")
      .then((res) => parseJsonResponse<RewardsMe>(res))
      .then((json) => {
        if (json && "xp" in json) setData(json);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <p className="border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-white/50">
        Loading your battle pass…
      </p>
    );
  }

  if (!data) {
    return (
      <p className="border border-[#FF2D87]/40 bg-[#FF2D87]/10 px-4 py-8 text-center text-sm text-[#FF2D87]">
        Could not load rewards. Refresh to try again.
      </p>
    );
  }

  const daysLeft = data.season ? seasonDaysRemaining(data.season.endsAt) : null;

  return (
    <div className="space-y-8">
      {data.season ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-[#CCFF00]/30 bg-[#CCFF00]/5 px-4 py-3">
          <div>
            <p
              className="text-[#CCFF00]"
              style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em" }}
            >
              SEASON
            </p>
            <p className="mt-1 font-bold text-white">{data.season.name}</p>
          </div>
          <p className="text-sm text-white/70">
            {daysLeft === 0 ? (
              <span className="font-bold text-[#FF2D87]">Season ending soon</span>
            ) : (
              <>
                <span className="font-black text-white">{daysLeft}</span> day
                {daysLeft === 1 ? "" : "s"} left
              </>
            )}
          </p>
        </div>
      ) : (
        <p className="border border-dashed border-white/20 px-4 py-3 text-sm text-white/50">
          No active season — check back soon.
        </p>
      )}

      <section className="border border-white/10 bg-[#0a0a0a] p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white">Battle Pass</h2>
            <p className="mt-1 text-sm text-white/50">
              {data.streak > 0 ? (
                <>
                  <span className="font-bold text-white">🔥 {data.streak}-day</span> fight streak
                </>
              ) : (
                "Vote daily to build your streak"
              )}
            </p>
          </div>
          <p className="text-sm text-white/40">
            {data.xp.toLocaleString("en-US")} XP this season
          </p>
        </div>
        <RewardsProgressBar
          tier={data.tier}
          xp={data.xp}
          nextTierXp={data.nextTierXp}
        />
      </section>

      <section>
        <h2
          className="mb-4 text-white"
          style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.03em" }}
        >
          Tiers
        </h2>
        <ul className="space-y-2">
          {PASS_TIERS.map((row) => {
            const unlocked = data.xp >= row.xp;
            const isCurrent = data.tier === row.tier;
            return (
              <li
                key={row.tier}
                className="flex flex-wrap items-center justify-between gap-3 border px-4 py-3"
                style={{
                  borderColor: isCurrent ? "rgba(204,255,0,0.4)" : "rgba(255,255,255,0.1)",
                  background: isCurrent ? "rgba(204,255,0,0.06)" : "#0a0a0a",
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 items-center justify-center text-xs font-black"
                    style={{
                      background: unlocked ? "#CCFF00" : "rgba(255,255,255,0.08)",
                      color: unlocked ? "#000" : "rgba(255,255,255,0.4)",
                    }}
                  >
                    {row.tier}
                  </span>
                  <div>
                    <p className="font-bold text-white">
                      Tier {row.tier}
                      {isCurrent ? (
                        <span className="ml-2 text-xs font-bold uppercase tracking-wider text-[#CCFF00]">
                          Current
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-white/50">{formatPassReward(row.reward)}</p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className={unlocked ? "font-bold text-[#CCFF00]" : "text-white/40"}>
                    {unlocked ? "Unlocked" : `${row.xp.toLocaleString("en-US")} XP`}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2
          className="mb-4 text-white"
          style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.03em" }}
        >
          Badges
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ACHIEVEMENT_BADGES.map((badge) => {
            const earned = data.badges.includes(badge.key);
            return (
              <div
                key={badge.key}
                className="border px-4 py-4 text-center"
                style={{
                  borderColor: earned ? "rgba(204,255,0,0.35)" : "rgba(255,255,255,0.1)",
                  background: earned ? "rgba(204,255,0,0.06)" : "#0a0a0a",
                  opacity: earned ? 1 : 0.55,
                }}
              >
                <div
                  className="mx-auto mb-2 flex h-12 w-12 items-center justify-center text-xl"
                  style={{
                    background: earned ? "#CCFF00" : "rgba(255,255,255,0.06)",
                    color: earned ? "#000" : "rgba(255,255,255,0.25)",
                  }}
                >
                  {earned ? "✓" : "?"}
                </div>
                <p className="font-bold text-white" style={{ fontSize: 13 }}>
                  {badge.label}
                </p>
                <p className="mt-1 text-xs text-white/45">{badge.description}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
