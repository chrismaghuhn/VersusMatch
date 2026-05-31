import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

export function FreeForeverBanner() {
  return (
    <section className="relative overflow-hidden border-b border-black/10 bg-[#CCFF00] text-black">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(black 1px, transparent 1px), linear-gradient(90deg, black 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute right-[-100px] top-[-100px] h-[400px] w-[400px] rounded-full bg-black opacity-[0.04] blur-3xl" />

      <div className="relative mx-auto max-w-[1440px] px-4 py-20 sm:px-6 sm:py-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 border border-black/20 bg-black/5 px-3 py-1.5">
              <Zap className="h-3 w-3 fill-black" strokeWidth={2.5} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em" }}>
                NO PAYWALL
              </span>
            </div>
            <h2
              style={{
                fontWeight: 900,
                fontSize: "clamp(48px, 7vw, 96px)",
                letterSpacing: "-0.055em",
                lineHeight: 0.88,
              }}
            >
              Free
              <br />
              <span className="relative inline-block">
                <span className="relative z-10 text-[#CCFF00]" style={{ paddingInline: "0.06em" }}>
                  forever
                </span>
                <span className="absolute inset-y-[0.06em] inset-x-[-0.03em] z-0 bg-black" />
              </span>
              .
            </h2>
            <p className="mt-8 max-w-md text-black/70" style={{ fontSize: 17, lineHeight: 1.5 }}>
              Every tier. Every season. Vote, stack streaks, flex titles and badges — no wallet
              required. This isn&apos;t a freemium trap; it&apos;s the whole game.
            </p>
          </div>

          <Link
            href="/feed"
            className="group relative inline-flex items-center gap-3 self-start bg-black px-8 py-5 text-[#CCFF00] transition hover:bg-[#FF2D87] hover:text-white"
          >
            <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "0.08em" }}>
              GO VOTE NOW
            </span>
            <ArrowRight
              className="h-4 w-4 transition group-hover:translate-x-1"
              strokeWidth={2.5}
            />
            <span className="absolute -bottom-1.5 -right-1.5 -z-10 h-full w-full bg-[#FF2D87]" />
          </Link>
        </div>
      </div>
    </section>
  );
}
