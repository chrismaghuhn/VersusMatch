import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { FeaturedBattleInfo } from "@/lib/rewards/featured-battle";

type FightOfTheDayHeroProps = {
  battle: FeaturedBattleInfo;
};

export function FightOfTheDayHero({ battle }: FightOfTheDayHeroProps) {
  return (
    <section className="border-b border-white/10 bg-black">
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href={`/b/${battle.slug}`}
          className="group relative block overflow-hidden border border-[#CCFF00]/30 bg-[#0a0a0a] transition hover:border-[#CCFF00] hover:shadow-[0_0_80px_rgba(204,255,0,0.1)]"
        >
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#CCFF00] opacity-[0.08] blur-[80px] transition group-hover:opacity-[0.14]" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[#FF2D87] opacity-[0.06] blur-[60px]" />

          <div className="relative z-10 flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-12">
            <div className="min-w-0 flex-1">
              <div
                className="mb-4 inline-flex items-center gap-2 border border-[#CCFF00]/40 bg-[#CCFF00]/10 px-3 py-1.5"
                style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em" }}
              >
                <span aria-hidden>🔥</span>
                <span className="text-[#CCFF00]">FIGHT OF THE DAY</span>
              </div>

              <h2
                className="text-white transition group-hover:text-[#CCFF00]"
                style={{
                  fontWeight: 900,
                  fontSize: "clamp(28px, 5vw, 48px)",
                  letterSpacing: "-0.04em",
                  lineHeight: 1.05,
                }}
              >
                {battle.title}
              </h2>

              <p className="mt-3 text-white/50" style={{ fontSize: 14, lineHeight: 1.5 }}>
                Today&apos;s featured battle — log in and vote for{" "}
                <span className="text-[#CCFF00]">+25 XP</span>.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 self-start sm:self-center">
              <span
                className="flex items-center gap-2 bg-[#CCFF00] px-6 py-3.5 text-black transition group-hover:bg-white"
                style={{ fontWeight: 800, fontSize: 13, letterSpacing: "0.06em" }}
              >
                PICK A SIDE
                <ArrowRight
                  className="h-4 w-4 transition group-hover:translate-x-1"
                  strokeWidth={2.5}
                />
              </span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
