"use client";

import { useRef } from "react";
import {
  Award,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Lock,
  Share2,
  Star,
  Trophy,
} from "lucide-react";
import { PASS_TIERS } from "@/lib/rewards/constants";
import { formatPassReward } from "@/lib/rewards/format-pass-reward";
import type { RewardsMe } from "@/lib/rewards/types";

type TierTrackProps = {
  data: RewardsMe;
};

const tierIcons: Record<number, React.ReactNode> = {
  1: <Star className="h-6 w-6" />,
  2: <Award className="h-6 w-6" />,
  3: <Share2 className="h-6 w-6" />,
  4: <Trophy className="h-6 w-6" />,
  5: <Crown className="h-6 w-6" />,
};

export function TierTrack({ data }: TierTrackProps) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 400, behavior: "smooth" });

  return (
    <section className="border-b border-white/10 bg-[#0a0a0a]">
      <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div
              className="mb-3 text-white/40"
              style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em" }}
            >
              ━━ THE PASS
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
              5 tiers of <span className="text-[#CCFF00]">loot</span>.
            </h2>
            <p className="mt-3 text-white/50" style={{ fontSize: 14, lineHeight: 1.5 }}>
              One free track — every reward unlocks by voting. Login required to earn XP.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 border border-[#CCFF00]/30 px-3 py-2">
              <div className="h-2 w-2 bg-[#CCFF00]" />
              <span
                className="text-[#CCFF00]"
                style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em" }}
              >
                FREE TRACK
              </span>
            </div>
            <div className="flex">
              <button
                type="button"
                onClick={() => scroll(-1)}
                className="flex h-10 w-10 items-center justify-center border border-white/15 text-white/60 transition hover:border-white hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scroll(1)}
                className="flex h-10 w-10 items-center justify-center border border-l-0 border-white/15 text-white/60 transition hover:border-white hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div ref={ref} className="relative overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
          <div className="relative flex gap-3" style={{ minWidth: "max-content" }}>
            {PASS_TIERS.map((row) => {
              const unlocked = data.xp >= row.xp;
              const isCurrent = data.tier === row.tier;
              const icon = tierIcons[row.tier] ?? <Star className="h-6 w-6" />;
              const isLegendary = row.tier === 5;
              const accent = isLegendary ? "#FFB800" : row.tier >= 3 ? "#FF2D87" : "#CCFF00";

              return (
                <div key={row.tier} className="flex w-[140px] flex-col items-stretch gap-3">
                  <div
                    className={
                      "relative flex h-[140px] flex-col items-center justify-between overflow-hidden border bg-black p-4 transition " +
                      (unlocked ? "border-white/20 hover:border-white/60" : "border-white/10")
                    }
                    style={{ opacity: unlocked ? 1 : 0.5 }}
                  >
                    <div
                      className="absolute left-0 top-0 h-1 w-full"
                      style={{ background: accent, opacity: unlocked ? 1 : 0.3 }}
                    />
                    <div
                      className="relative flex h-14 w-14 items-center justify-center"
                      style={{
                        background: unlocked ? `${accent}15` : "transparent",
                        border: `1px solid ${unlocked ? accent : "rgba(255,255,255,0.1)"}`,
                        color: unlocked ? accent : "rgba(255,255,255,0.3)",
                      }}
                    >
                      {icon}
                      {!unlocked && (
                        <Lock className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-black p-0.5 text-white/40" />
                      )}
                      {unlocked && (
                        <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-black">
                          <Check className="h-2.5 w-2.5 text-[#CCFF00]" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <div
                      className="text-center text-white"
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: "0.05em",
                        lineHeight: 1.2,
                      }}
                    >
                      {formatPassReward(row.reward)}
                    </div>
                    {isLegendary && (
                      <div
                        className="absolute bottom-1 right-1 px-1"
                        style={{
                          background: accent,
                          color: "#000",
                          fontSize: 7,
                          fontWeight: 900,
                          letterSpacing: "0.15em",
                        }}
                      >
                        LEGENDARY
                      </div>
                    )}
                  </div>

                  <div
                    className={
                      "relative flex h-12 items-center justify-center border-2 " +
                      (isCurrent
                        ? "border-[#CCFF00] bg-[#CCFF00] text-black"
                        : unlocked
                          ? "border-white/40 bg-white/5 text-white"
                          : "border-white/15 bg-black text-white/40")
                    }
                  >
                    <span
                      style={{
                        fontWeight: 900,
                        fontSize: 22,
                        letterSpacing: "-0.04em",
                        lineHeight: 1,
                      }}
                    >
                      {row.tier}
                    </span>
                    {isCurrent && (
                      <div
                        className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#FF2D87] px-2 py-0.5 text-white"
                        style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.15em" }}
                      >
                        ▼ YOU ARE HERE
                      </div>
                    )}
                  </div>

                  <div className="text-center text-white/40" style={{ fontSize: 10, fontWeight: 600 }}>
                    {unlocked ? (
                      <span className="text-[#CCFF00]">UNLOCKED</span>
                    ) : (
                      <span>{row.xp.toLocaleString("en-US")} XP</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
