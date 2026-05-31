"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DramaKind } from "@/lib/rewards/drama";
import { RewardsProgressBar } from "@/components/rewards-progress-bar";
import { parseJsonResponse } from "@/lib/parse-json-response";
import type { RewardsMe } from "@/lib/rewards/types";

export type VoteGrantResult = {
  xpAwarded: number;
  tier: number;
  badgesEarned: string[];
};

type PostVoteRewardsBannerProps = {
  drama: { kind: DramaKind; message: string };
  isLoggedIn: boolean;
  returnTo: string;
  grantResult?: VoteGrantResult | null;
};

const dramaAccent: Record<DramaKind, string> = {
  underdog: "#FF2D87",
  close: "#CCFF00",
  winning: "#CCFF00",
};

type ProgressSlice = Pick<RewardsMe, "xp" | "tier" | "nextTierXp">;

export function PostVoteRewardsBanner({
  drama,
  isLoggedIn,
  returnTo,
  grantResult,
}: PostVoteRewardsBannerProps) {
  const [progress, setProgress] = useState<ProgressSlice | null>(null);
  const accent = dramaAccent[drama.kind];

  useEffect(() => {
    if (!isLoggedIn) return;

    fetch("/api/rewards/me")
      .then((res) => parseJsonResponse<RewardsMe>(res))
      .then((data) => {
        if (data && "xp" in data) setProgress(data);
      })
      .catch(() => {});
  }, [isLoggedIn, grantResult?.xpAwarded]);

  const loginHref = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div
      className="relative mt-6 overflow-hidden border px-5 py-4"
      style={{
        borderColor: `${accent}4D`,
        background: `${accent}0D`,
      }}
    >
      <div
        className="absolute left-0 top-0 h-1 w-full"
        style={{ background: accent, opacity: 0.85 }}
      />
      <p
        style={{
          color: accent,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.15em",
        }}
      >
        {drama.message}
      </p>

      {!isLoggedIn ? (
        <p className="mt-2 text-sm text-white/70">
          <Link
            href={loginHref}
            className="font-semibold text-[#CCFF00] underline underline-offset-4 hover:text-white"
          >
            Log in to claim XP for this vote
          </Link>
        </p>
      ) : grantResult ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-white">
            <span className="font-bold text-[#CCFF00]">+{grantResult.xpAwarded} XP</span>
            {grantResult.badgesEarned.length > 0 ? (
              <span className="text-white/60">
                {" "}
                · Badge{grantResult.badgesEarned.length > 1 ? "s" : ""} unlocked
              </span>
            ) : null}
          </p>
          {progress ? (
            <RewardsProgressBar
              tier={progress.tier}
              xp={progress.xp}
              nextTierXp={progress.nextTierXp}
              compact
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
