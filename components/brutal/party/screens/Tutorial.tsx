"use client";

import { useState } from "react";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Shell, Meta } from "@/components/brutal/party/shared/Shell";
import { MemeFrame } from "@/components/brutal/party/shared/MemeFrame";
import { Avatar } from "@/components/brutal/party/shared/Avatar";

const SLIDES = [
  {
    num: "01",
    color: "#CCFF00",
    eyebrow: "LOBBY",
    title: "Get a room.",
    body: "Type a 6-char code from a friend, or hit CREATE to mint your own. Public lobbies are listed if you wanna roll with strangers.",
    visual: (
      <div className="flex h-full items-center justify-center">
        <div className="border-2 border-[#CCFF00] bg-black p-6 text-center">
          <div className="text-white/40" style={{ fontSize: 10, letterSpacing: "0.2em", fontWeight: 800 }}>ROOM CODE</div>
          <div className="mt-2 flex gap-1">
            {"FIGHT-42K".split("").map((c, i) => (
              <span key={i} className={"flex h-12 w-9 items-center justify-center border " + (c === "-" ? "border-transparent" : "border-[#CCFF00] bg-[#CCFF00]/10 text-[#CCFF00]")} style={{ fontFamily: "ui-monospace, monospace", fontWeight: 900, fontSize: 22 }}>{c}</span>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    num: "02",
    color: "#FF2D87",
    eyebrow: "CAPTION",
    title: "Cook a caption.",
    body: "60 seconds. A template appears, you fill in top + bottom text. Best one wins votes — funny beats clever beats correct.",
    visual: (
      <div className="flex h-full flex-col gap-2">
        <div className="flex-1"><MemeFrame template="drake" caption="MY PRODUCTIVITY APP|OPENING TWITTER 47 TIMES" /></div>
        <input defaultValue="HAVING A LIFE" className="border border-[#FF2D87] bg-black px-3 py-2 text-white" style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }} readOnly />
      </div>
    ),
  },
  {
    num: "03",
    color: "#00E1FF",
    eyebrow: "VOTE",
    title: "Pick the funniest.",
    body: "All submissions show up anonymously. You can't vote for your own. 30 seconds — go with the gut, not the brain.",
    visual: (
      <div className="grid h-full grid-cols-2 gap-2">
        <div className="relative border border-white/10">
          <MemeFrame template="drake" caption="ANON|ENTRY" mini />
          <div className="absolute inset-x-0 bottom-0 border-t-2 border-[#CCFF00] bg-[#CCFF00] py-1 text-center text-black" style={{ fontWeight: 900, fontSize: 11, letterSpacing: "0.15em" }}>♥ VOTED</div>
        </div>
        <div className="border border-white/10 opacity-50"><MemeFrame template="drake" caption="OTHER|ENTRY" mini /></div>
      </div>
    ),
  },
  {
    num: "04",
    color: "#FFB800",
    eyebrow: "WIN",
    title: "Get the bag.",
    body: "Round winner gets +400 pts. Survive 7 rounds, top of the board wins the lobby. Take the share card, fund the bit.",
    visual: (
      <div className="flex h-full flex-col items-center justify-center bg-gradient-to-b from-[#FFB800]/20 to-transparent p-6">
        <div className="border-4 border-[#FFB800]"><Avatar id="crown" color="#FFB800" size={88} /></div>
        <div className="mt-4 text-[#FFB800]" style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.2em" }}>★ CHAMPION</div>
        <div className="mt-1 text-white" style={{ fontWeight: 900, fontSize: 24 }}>PettyQueen</div>
        <div className="mt-1 text-white/50" style={{ fontFamily: "ui-monospace, monospace", fontSize: 14 }}>1,840 PTS</div>
      </div>
    ),
  },
];

export function Tutorial() {
  const [i, setI] = useState(0);
  const s = SLIDES[i];
  const last = i === SLIDES.length - 1;

  return (
    <Shell>
      <div className="mx-auto max-w-[1100px] px-6 py-16">
        <div className="mb-8 flex items-center justify-between">
          <Meta color={s.color}>━━ HOW IT WORKS · {i + 1} OF {SLIDES.length}</Meta>
          <button className="text-white/40 hover:text-white" style={{ fontSize: 11, letterSpacing: "0.15em", fontWeight: 700 }}>SKIP TUTORIAL →</button>
        </div>

        <div className="mb-6 flex gap-1">
          {SLIDES.map((_, idx) => (
            <button key={idx} onClick={() => setI(idx)} className={"h-1 flex-1 transition " + (idx === i ? "" : idx < i ? "bg-white/40" : "bg-white/10 hover:bg-white/20")} style={idx === i ? { background: s.color } : {}} />
          ))}
        </div>

        <div className="grid min-h-[480px] grid-cols-1 gap-0 border border-white/10 bg-black md:grid-cols-2">
          <div className="flex flex-col justify-between border-b border-white/10 p-10 md:border-b-0 md:border-r">
            <div>
              <div style={{ color: s.color, fontWeight: 900, fontSize: 96, letterSpacing: "-0.06em", lineHeight: 0.9 }}>{s.num}</div>
              <div className="mt-1 text-white/40" style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.2em" }}>{s.eyebrow}</div>
              <h2 className="mt-4 text-white" style={{ fontWeight: 900, fontSize: 52, letterSpacing: "-0.04em", lineHeight: 0.95 }}>
                {s.title}
              </h2>
              <p className="mt-4 text-white/60" style={{ fontSize: 15, lineHeight: 1.55 }}>{s.body}</p>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} className="flex items-center gap-2 text-white/50 hover:text-white disabled:opacity-30" style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.15em" }}>
                <ArrowLeft className="h-3.5 w-3.5" /> BACK
              </button>
              <button onClick={() => last ? null : setI(i + 1)} className="flex items-center gap-2 px-5 py-3 text-black hover:bg-white" style={{ background: s.color, fontSize: 12, fontWeight: 900, letterSpacing: "0.18em" }}>
                {last ? <><Check className="h-3.5 w-3.5" /> LET'S GO</> : <>NEXT <ArrowRight className="h-3.5 w-3.5" /></>}
              </button>
            </div>
          </div>

          <div className="relative bg-[#0a0a0a] p-8">
            <div className="absolute right-3 top-3 text-white/20" style={{ fontSize: 10, letterSpacing: "0.2em", fontWeight: 800 }}>EXAMPLE</div>
            <div className="h-full">{s.visual}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
          {SLIDES.map((sl, idx) => (
            <button key={idx} onClick={() => setI(idx)} className={"border p-3 text-left transition " + (idx === i ? "border-white bg-white/5" : "border-white/10 bg-[#0a0a0a] hover:border-white/30")}>
              <div style={{ color: sl.color, fontWeight: 900, fontSize: 18 }}>{sl.num}</div>
              <div className="text-white" style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em" }}>{sl.eyebrow}</div>
            </button>
          ))}
        </div>
      </div>
    </Shell>
  );
}
