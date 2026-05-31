import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { Noise } from "@/components/brutal/noise";
import { formatStatNumber } from "@/lib/utils";
import type { SiteStats } from "@/lib/stats";

type BrutalHeroProps = {
  stats: SiteStats;
};

export function BrutalHero({ stats }: BrutalHeroProps) {
  const statItems = [
    [formatStatNumber(stats.activeBattles), "BATTLES LIVE", "#CCFF00"],
    [formatStatNumber(stats.totalVotes), "VOTES CAST", "#FF2D87"],
    [formatStatNumber(stats.votesLast24h), "VOTES TODAY", "#00E1FF"],
  ] as const;

  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-black">
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
      <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-[#CCFF00] opacity-[0.18] blur-[140px]" />
      <div className="absolute -right-40 top-40 h-[500px] w-[500px] rounded-full bg-[#FF2D87] opacity-[0.18] blur-[140px]" />
      <Noise opacity={0.12} />

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 pb-8 pt-16 sm:px-6 md:pt-24">
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 border border-white/15 bg-white/[0.03] px-3 py-1.5 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#FF2D87]" />
            <span
              className="text-white/80"
              style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em" }}
            >
              {stats.activeBattles > 0
                ? `${stats.activeBattles} BATTLES LIVE`
                : "BATTLES LIVE NOW"}
            </span>
          </div>
        </div>

        <h1
          className="max-w-4xl text-white"
          style={{
            fontWeight: 900,
            fontSize: "clamp(48px, 10vw, 140px)",
            lineHeight: 0.82,
            letterSpacing: "-0.065em",
          }}
        >
          <span className="block">PICK A</span>
          <span className="relative inline-block">
            <span className="relative z-10 text-white">SIDE</span>
            <svg
              className="absolute -bottom-2 left-0 right-0 w-full"
              height="22"
              viewBox="0 0 400 22"
              preserveAspectRatio="none"
            >
              <path
                d="M2 12 Q 100 2, 200 10 T 398 8"
                stroke="#CCFF00"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="text-white/25">.</span>
          <br />
          <span className="text-white/25">START A</span>{" "}
          <span className="relative inline-block">
            <span className="relative z-10 text-black" style={{ paddingInline: "0.08em" }}>
              FIGHT
            </span>
            <span className="absolute inset-y-[0.08em] inset-x-[-0.04em] z-0 -skew-x-6 bg-[#CCFF00]" />
          </span>
          <span className="text-[#CCFF00]">.</span>
        </h1>

        <div className="mt-10 flex max-w-2xl items-start gap-6">
          <div className="mt-3 h-px w-16 bg-[#CCFF00]" />
          <p className="text-white/70" style={{ fontSize: 18, lineHeight: 1.45 }}>
            Shareable A-vs-B Battles auf memefight.lol.
            <span className="text-white"> Zwei Optionen. Ein Gewinner. Live-Ergebnisse.</span>
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            href="/create"
            className="group relative flex items-center gap-3 bg-white px-7 py-4 text-black transition hover:bg-[#CCFF00]"
          >
            <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: "0.06em" }}>
              CREATE A BATTLE
            </span>
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" strokeWidth={2.5} />
            <span className="absolute -bottom-1.5 -right-1.5 -z-10 h-full w-full bg-[#FF2D87]" />
          </Link>
          <Link
            href="/feed"
            className="group flex items-center gap-3 border border-white/20 px-7 py-4 text-white transition hover:border-white/60 hover:bg-white/5"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 transition group-hover:bg-[#CCFF00] group-hover:text-black">
              <Play className="h-3 w-3 fill-current" />
            </span>
            <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: "0.04em" }}>
              WATCH THE LIVE FEED
            </span>
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-x-12 gap-y-8 border-t border-white/10 pt-10 sm:grid-cols-3">
          {statItems.map(([value, label, color]) => (
            <div key={label} className="group">
              <div className="flex items-baseline gap-2">
                <div className="h-3 w-3" style={{ background: color }} />
                <div
                  className="text-white transition group-hover:text-[color:var(--c)]"
                  style={{
                    ["--c" as string]: color,
                    fontWeight: 900,
                    fontSize: 52,
                    letterSpacing: "-0.05em",
                    lineHeight: 1,
                  }}
                >
                  {value}
                </div>
              </div>
              <div
                className="mt-2 text-white/40"
                style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em" }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
