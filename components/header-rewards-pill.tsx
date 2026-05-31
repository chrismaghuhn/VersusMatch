"use client";

import { useEffect, useState } from "react";
import { parseJsonResponse } from "@/lib/parse-json-response";

type RewardsMe = {
  streak: number;
  tier: number;
};

export function HeaderRewardsPill() {
  const [rewards, setRewards] = useState<RewardsMe | null>(null);

  useEffect(() => {
    fetch("/api/rewards/me")
      .then((res) => {
        if (!res.ok) return null;
        return parseJsonResponse<RewardsMe>(res);
      })
      .then((data) => {
        if (data && "streak" in data) setRewards(data);
      })
      .catch(() => setRewards(null));
  }, []);

  if (!rewards) return null;

  return (
    <div
      className="hidden items-center gap-2 border border-white/10 bg-white/5 px-2.5 py-1.5 sm:flex"
      title="Fight streak & Battle Pass tier"
    >
      {rewards.streak > 0 ? (
        <span className="text-white/80" style={{ fontSize: 11, fontWeight: 700 }}>
          🔥 {rewards.streak}
        </span>
      ) : null}
      <span
        className="text-[#CCFF00]"
        style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em" }}
      >
        TIER {rewards.tier}
      </span>
    </div>
  );
}
