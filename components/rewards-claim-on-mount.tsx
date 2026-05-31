"use client";

import { useEffect } from "react";
import { parseJsonResponse } from "@/lib/parse-json-response";

const CLAIM_DONE_KEY = "rewards-claim-done";

type RewardsClaimOnMountProps = {
  embed?: boolean;
};

export function RewardsClaimOnMount({ embed = false }: RewardsClaimOnMountProps) {
  useEffect(() => {
    if (embed) return;
    if (sessionStorage.getItem(CLAIM_DONE_KEY)) return;

    let cancelled = false;

    async function tryClaim() {
      const meRes = await fetch("/api/me");
      const meData = await parseJsonResponse<{ user: { id: string } | null }>(meRes);

      if (cancelled || !meData?.user) return;

      const claimRes = await fetch("/api/rewards/claim", { method: "POST" });
      const claimData = await parseJsonResponse<{
        granted?: boolean;
        xpAwarded?: number;
        tier?: number;
      }>(claimRes);

      if (cancelled || !claimRes.ok || !claimData?.granted) return;

      sessionStorage.setItem(CLAIM_DONE_KEY, "1");

      if (claimData.xpAwarded != null) {
        console.info(
          `[rewards] Pending vote claim granted: +${claimData.xpAwarded} XP (Tier ${claimData.tier ?? "?"})`
        );
      }
    }

    void tryClaim();

    return () => {
      cancelled = true;
    };
  }, [embed]);

  return null;
}
