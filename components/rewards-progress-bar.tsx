import { PASS_TIERS } from "@/lib/rewards/constants";

type RewardsProgressBarProps = {
  tier: number;
  xp: number;
  nextTierXp: number | null;
  compact?: boolean;
};

export function RewardsProgressBar({
  tier,
  xp,
  nextTierXp,
  compact = false,
}: RewardsProgressBarProps) {
  const tierStart = PASS_TIERS.find((row) => row.tier === tier)?.xp ?? 0;
  const progressPct =
    nextTierXp != null && nextTierXp > tierStart
      ? Math.min(100, Math.round(((xp - tierStart) / (nextTierXp - tierStart)) * 100))
      : 100;

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div className="flex items-center justify-between gap-3">
        <span
          className="text-[#CCFF00]"
          style={{ fontSize: compact ? 10 : 11, fontWeight: 800, letterSpacing: "0.12em" }}
        >
          TIER {tier}
        </span>
        {nextTierXp != null ? (
          <span className="text-white/40" style={{ fontSize: compact ? 10 : 11 }}>
            {xp.toLocaleString("en-US")} / {nextTierXp.toLocaleString("en-US")} XP
          </span>
        ) : (
          <span className="text-white/40" style={{ fontSize: compact ? 10 : 11 }}>
            MAX TIER
          </span>
        )}
      </div>
      <div className={`w-full overflow-hidden bg-white/10 ${compact ? "h-1.5" : "h-2"}`}>
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${progressPct}%`,
            background: "linear-gradient(90deg, #CCFF00, #FF2D87)",
          }}
        />
      </div>
    </div>
  );
}
