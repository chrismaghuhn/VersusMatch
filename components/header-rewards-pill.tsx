"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { parseJsonResponse } from "@/lib/parse-json-response";
import type { RewardsMe } from "@/lib/rewards/types";

export function HeaderRewardsPill() {
  const [rewards, setRewards] = useState<Pick<RewardsMe, "streak" | "tier"> | null>(null);

  useEffect(() => {
    fetch("/api/rewards/me")
      .then((res) => {
        if (!res.ok) return null;
        return parseJsonResponse<RewardsMe>(res);
      })
      .then((data) => {
        if (data && "streak" in data) {
          setRewards({ streak: data.streak, tier: data.tier });
        }
      })
      .catch(() => setRewards(null));
  }, []);

  if (!rewards) return null;

  return (
    <Link
      href="/rewards"
      className="hidden items-center gap-2 border border-white/10 bg-white/[0.03] px-2.5 py-1.5 transition hover:border-[#CCFF00]/40 hover:bg-[#CCFF00]/5 sm:flex"
      title="Fight streak & Battle Pass — 100% free"
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
    </Link>
  );
}
