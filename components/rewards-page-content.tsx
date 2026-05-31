"use client";

import { useEffect, useState } from "react";
import { FeaturedRewards } from "@/components/brutal/rewards/featured-rewards";
import { FreeForeverBanner } from "@/components/brutal/rewards/free-forever-banner";
import { MilestoneProgressCards } from "@/components/brutal/rewards/milestone-progress-cards";
import { RewardsHero } from "@/components/brutal/rewards/rewards-hero";
import { SeasonStats } from "@/components/brutal/rewards/season-stats";
import { TierTrack } from "@/components/brutal/rewards/tier-track";
import { parseJsonResponse } from "@/lib/parse-json-response";
import type { RewardsMe } from "@/lib/rewards/types";

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
      <p className="border border-white/10 bg-white/5 px-4 py-16 text-center text-sm text-white/50">
        Loading your battle pass…
      </p>
    );
  }

  if (!data) {
    return (
      <p className="border border-[#FF2D87]/40 bg-[#FF2D87]/10 px-4 py-16 text-center text-sm text-[#FF2D87]">
        Could not load rewards. Refresh to try again.
      </p>
    );
  }

  return (
    <>
      <RewardsHero data={data} />
      <TierTrack data={data} />
      <FeaturedRewards data={data} />
      <MilestoneProgressCards data={data} />
      <SeasonStats data={data} />
      <FreeForeverBanner />
    </>
  );
}
