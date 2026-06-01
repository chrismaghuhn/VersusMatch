"use client";

import { useState } from "react";
import { Shuffle, ArrowRight } from "lucide-react";
import { Shell, Meta } from "@/components/brutal/party/shared/Shell";
import { COLORS } from "@/components/brutal/party/shared/theme";
import { Avatar, AVATAR_IDS, AvatarId } from "@/components/brutal/party/shared/Avatar";

const SUGGEST = ["VoteGremlin", "SaltSlinger", "PettyMcPetty", "HotTakeHal", "ChaosCarl", "RoastedDog", "MoodMagnet"];

export function AvatarPicker() {
  const [avatar, setAvatar] = useState<AvatarId>("fox");
  const [color, setColor] = useState("#CCFF00");
  const [name, setName] = useState("FoxOnFire");

  const randomize = () => {
    setAvatar(AVATAR_IDS[Math.floor(Math.random() * AVATAR_IDS.length)]);
    setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
    setName(SUGGEST[Math.floor(Math.random() * SUGGEST.length)]);
  };

  return (
    <Shell>
      <div className="mx-auto max-w-[1100px] px-6 py-16">
        <div className="mb-10 text-center">
          <Meta color="#CCFF00">━━ STEP 1 OF 2 · YOU</Meta>
          <h1 className="mt-3 text-white" style={{ fontWeight: 900, fontSize: "clamp(44px, 7vw, 96px)", letterSpacing: "-0.05em", lineHeight: 0.9 }}>
            Who are you, <span className="italic text-[#CCFF00]">really</span>?
          </h1>
          <p className="mt-3 text-white/50" style={{ fontSize: 15 }}>Pick a vibe. You can change it between rounds.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="border border-white/10 bg-black p-8 text-center">
            <Meta>LIVE PREVIEW</Meta>
            <div className="relative mt-6 flex flex-col items-center">
              <div className="border-4" style={{ borderColor: color }}>
                <Avatar id={avatar} color={color} size={168} />
              </div>
              <div className="mt-5 text-white" style={{ fontWeight: 900, fontSize: 28, letterSpacing: "-0.03em" }}>{name || "Anonymous"}</div>
              <div className="mt-1 text-white/40" style={{ fontSize: 12 }}>Rookie · 0 wins</div>
            </div>
            <button onClick={randomize} className="mt-6 flex w-full items-center justify-center gap-2 border border-white/20 py-3 text-white transition hover:border-[#CCFF00] hover:text-[#CCFF00]" style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em" }}>
              <Shuffle className="h-3.5 w-3.5" /> ROLL THE DICE
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="border border-white/10 bg-black p-5">
              <Meta>USERNAME</Meta>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 16))}
                placeholder="YourName"
                className="mt-2 w-full border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white outline-none transition focus:border-[#CCFF00]"
                style={{ fontFamily: "ui-monospace, monospace", fontSize: 18, fontWeight: 700 }}
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {SUGGEST.map((s) => (
                  <button key={s} onClick={() => setName(s)} className="border border-white/10 px-2 py-1 text-white/50 hover:border-white/40 hover:text-white" style={{ fontSize: 11 }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-white/10 bg-black p-5">
              <div className="flex items-center justify-between">
                <Meta>AVATAR · {AVATAR_IDS.length} CHARACTERS</Meta>
                <span className="text-white/30" style={{ fontSize: 10 }}>tap to select</span>
              </div>
              <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-8">
                {AVATAR_IDS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAvatar(a)}
                    className={"aspect-square overflow-hidden border-2 transition hover:scale-105 " + (avatar === a ? "border-[#CCFF00]" : "border-white/10 hover:border-white/40")}
                  >
                    <Avatar id={a} color={avatar === a ? color : "#1a1a1a"} size={64} />
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-white/10 bg-black p-5">
              <Meta>BACKGROUND COLOR</Meta>
              <div className="mt-3 grid grid-cols-6 gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={"aspect-square border-2 transition " + (color === c ? "border-white" : "border-white/10 hover:border-white/40")}
                    style={{ background: c }}
                  >
                    {color === c && <span className="text-black" style={{ fontSize: 14, fontWeight: 900 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <button className="group flex items-center justify-center gap-3 bg-[#CCFF00] py-5 text-black transition hover:bg-white">
              <span style={{ fontWeight: 900, fontSize: 14, letterSpacing: "0.2em" }}>ENTER LOBBY</span>
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
