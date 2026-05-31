import Link from "next/link";
import { Plus, Upload, Share2, BarChart3, ArrowRight } from "lucide-react";
import { formatStatNumber } from "@/lib/utils";

const steps = [
  {
    n: "01",
    icon: Plus,
    title: "Pick your beef",
    desc: "Titel deines Battles — Memes, Food, Gaming, alles geht.",
  },
  {
    n: "02",
    icon: Upload,
    title: "Drop two options",
    desc: "Text oder Bild. Side A. Side B. Fertig.",
  },
  {
    n: "03",
    icon: Share2,
    title: "Send the link",
    desc: "In den Group Chat — kein Login zum Voten nötig.",
  },
  {
    n: "04",
    icon: BarChart3,
    title: "Watch chaos",
    desc: "Live-Ergebnisse in Echtzeit.",
  },
];

type BrutalCreateCtaProps = {
  totalVotes?: number;
};

export function BrutalCreateCta({ totalVotes = 0 }: BrutalCreateCtaProps) {
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

      <div className="relative mx-auto max-w-[1440px] px-4 py-20 sm:px-6 sm:py-28">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 border border-black/20 bg-black/5 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-black" />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em" }}>
                HOW IT WORKS
              </span>
            </div>
            <h2
              style={{
                fontWeight: 900,
                fontSize: "clamp(40px, 6vw, 96px)",
                letterSpacing: "-0.055em",
                lineHeight: 0.88,
              }}
            >
              60 seconds.
              <br />
              No signup.
              <br />
              <span className="relative inline-block">
                <span className="relative z-10 text-[#CCFF00]" style={{ paddingInline: "0.06em" }}>
                  Pure carnage.
                </span>
                <span className="absolute inset-y-[0.06em] inset-x-[-0.03em] z-0 bg-black" />
              </span>
            </h2>
            <p className="mt-10 max-w-md text-black/70" style={{ fontSize: 18, lineHeight: 1.5 }}>
              Battle erstellen, Link teilen, live voten lassen. Login nur zum Erstellen.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/create"
                className="group relative flex items-center gap-3 bg-black px-8 py-4 text-[#CCFF00] transition hover:bg-white hover:text-black"
              >
                <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: "0.08em" }}>
                  START A FIGHT NOW
                </span>
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" strokeWidth={2.5} />
                <span className="absolute -bottom-1.5 -right-1.5 -z-10 h-full w-full bg-[#FF2D87]" />
              </Link>
            </div>
            {totalVotes > 0 && (
              <div className="mt-10 flex items-center gap-4 border-t border-black/20 pt-6">
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>
                    {formatStatNumber(totalVotes)} votes and counting
                  </div>
                  <div className="text-black/60" style={{ fontSize: 12 }}>
                    MemeFight.lol — für Group Chats gebaut.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-px bg-black sm:grid-cols-2">
            {steps.map((step, index) => (
              <div key={step.n} className="group relative bg-[#CCFF00] p-7 transition hover:bg-white">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center bg-black text-[#CCFF00] transition group-hover:bg-[#FF2D87] group-hover:text-white">
                    <step.icon className="h-5 w-5" strokeWidth={2.5} />
                  </div>
                  <span
                    className="text-black/15 transition group-hover:text-black/30"
                    style={{ fontWeight: 900, fontSize: 56, letterSpacing: "-0.05em", lineHeight: 1 }}
                  >
                    {step.n}
                  </span>
                </div>
                <div
                  className="mt-10 text-black"
                  style={{ fontWeight: 900, fontSize: 24, letterSpacing: "-0.025em", lineHeight: 1 }}
                >
                  {step.title}
                </div>
                <p className="mt-2.5 text-black/70" style={{ fontSize: 13, lineHeight: 1.5 }}>
                  {step.desc}
                </p>
                {index < steps.length - 1 && (
                  <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-black/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
