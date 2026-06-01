"use client";

import { useState } from "react";
import { Play, Plus, Users, Flame, ArrowRight, Globe } from "lucide-react";
import { PARTY_COPY } from "@/lib/party/copy-de";
import { Shell, Meta } from "@/components/brutal/party/shared/Shell";

const publicLobbies = [
  { code: "MEME-77A", host: "PettyQueen", players: 6, max: 8, lang: "EN", nsfw: true },
  { code: "LATE-NITE", host: "v0te_demon", players: 4, max: 8, lang: "EN", nsfw: false },
  { code: "GERMAN-9X", host: "ragebaiter", players: 3, max: 8, lang: "DE", nsfw: true },
  { code: "CHILLZONE", host: "moodring", players: 7, max: 8, lang: "EN", nsfw: false },
];

export type PartyJoinScreenProps = {
  designPreview?: boolean;
  roundCount?: 3 | 5 | 7;
  onRoundCountChange?: (count: 3 | 5 | 7) => void;
  rerollsPerPlayer?: number;
  onRerollsPerPlayerChange?: (count: number) => void;
  onJoin?: (code: string) => void;
  onCreate?: () => void;
};

export function PartyJoinScreen({
  designPreview = false,
  roundCount = 5,
  onRoundCountChange,
  rerollsPerPlayer = 0,
  onRerollsPerPlayerChange,
  onJoin,
  onCreate,
}: PartyJoinScreenProps) {
  const [code, setCode] = useState("");

  return (
    <Shell>
      <div className="relative overflow-hidden">
        <div className="absolute -right-32 top-0 h-[600px] w-[600px] rounded-full bg-[#CCFF00] opacity-10 blur-[140px]" />
        <div className="absolute -left-32 bottom-0 h-[400px] w-[400px] rounded-full bg-[#FF2D87] opacity-15 blur-[140px]" />

        <div className="relative mx-auto max-w-[1280px] px-6 py-16">
          <div className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center bg-[#CCFF00]" style={{ fontSize: 18 }}>
                🎨
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: "-0.02em" }}>MEMEFIGHT</div>
                <Meta>PARTY</Meta>
              </div>
            </div>
            {designPreview && (
              <div className="flex items-center gap-2 border border-white/10 px-3 py-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#CCFF00]" />
                <span className="text-white/70" style={{ fontSize: 11 }}>
                  <span className="text-white" style={{ fontWeight: 800 }}>
                    12,408
                  </span>{" "}
                  playing now
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <Meta color="#CCFF00">━━ {PARTY_COPY.joinHeroTag}</Meta>
              <h1
                className="mt-4 text-white"
                style={{
                  fontWeight: 900,
                  fontSize: "clamp(56px, 9vw, 144px)",
                  letterSpacing: "-0.06em",
                  lineHeight: 0.82,
                }}
              >
                {PARTY_COPY.joinHeroTitle1}
                <br />
                <span className="italic text-[#CCFF00]">{PARTY_COPY.joinHeroTitle2}</span>
                <span className="text-[#FF2D87]">.</span>
              </h1>
            </div>

            <div className="border border-white/10 bg-black p-5">
              <div className="mb-4">
                <Meta>{PARTY_COPY.joinHaveCode}</Meta>
                <div className="mt-2 flex gap-2">
                  <input
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))
                    }
                    placeholder="ABC123"
                    className="w-full border-2 border-white/10 bg-[#0a0a0a] px-4 py-4 text-white outline-none transition focus:border-[#CCFF00]"
                    style={{
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 22,
                      fontWeight: 900,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => onJoin?.(code)}
                    className="flex items-center gap-2 bg-[#CCFF00] px-5 text-black transition hover:bg-white"
                    style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.18em" }}
                  >
                    {PARTY_COPY.joinButton} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-white/30" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em" }}>
                  {PARTY_COPY.joinOr}
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {onRoundCountChange ? (
                <div className="mb-4">
                  <Meta>{PARTY_COPY.joinRounds}</Meta>
                  <div className="mt-2 flex gap-2">
                    {([3, 5, 7] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => onRoundCountChange(n)}
                        className={
                          "flex-1 border-2 py-2.5 transition " +
                          (roundCount === n
                            ? "border-[#CCFF00] bg-[#CCFF00]/15 text-[#CCFF00]"
                            : "border-white/10 text-white/50 hover:border-white/30 hover:text-white")
                        }
                        style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.12em" }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {onRerollsPerPlayerChange ? (
                <div className="mb-4">
                  <Meta>{PARTY_COPY.joinRerolls}</Meta>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Array.from({ length: roundCount + 1 }, (_, n) => n).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => onRerollsPerPlayerChange(n)}
                        className={
                          "min-w-[2.5rem] flex-1 border-2 py-2.5 transition " +
                          (rerollsPerPlayer === n
                            ? "border-[#00E1FF] bg-[#00E1FF]/15 text-[#00E1FF]"
                            : "border-white/10 text-white/50 hover:border-white/30 hover:text-white")
                        }
                        style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.12em" }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={onCreate}
                className="group flex w-full items-center justify-between border-2 border-white/15 bg-[#0a0a0a] p-4 transition hover:border-[#FF2D87]"
              >
                <div className="text-left">
                  <div className="flex items-center gap-2 text-white" style={{ fontWeight: 900, fontSize: 16 }}>
                    <Plus className="h-4 w-4" strokeWidth={3} /> {PARTY_COPY.joinCreateTitle}
                  </div>
                  <div className="mt-0.5 text-white/40" style={{ fontSize: 11 }}>
                    {PARTY_COPY.joinCreateSub}
                  </div>
                </div>
                <div className="bg-[#FF2D87] p-2 text-white transition group-hover:translate-x-1">
                  <Play className="h-3 w-3 fill-current" />
                </div>
              </button>

              {designPreview && (
                <button
                  type="button"
                  className="mt-2 flex w-full items-center justify-center gap-2 border border-white/10 py-3 text-white/60 transition hover:border-white/30 hover:text-white"
                  style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em" }}
                >
                  <Flame className="h-3 w-3" /> QUICK PLAY · DROP ME ANYWHERE
                </button>
              )}
            </div>
          </div>

          {designPreview && (
            <div className="mt-16">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <Meta>━━ OR HOP INTO A PUBLIC LOBBY</Meta>
                  <h2 className="mt-2 text-white" style={{ fontWeight: 900, fontSize: 28, letterSpacing: "-0.03em" }}>
                    Rooms looking for chaos
                  </h2>
                  <p className="mt-1 text-white/40" style={{ fontSize: 12 }}>
                    Phase 3 — not in P1 prod
                  </p>
                </div>
                <div className="flex gap-1">
                  {["ALL", "EN", "DE", "NSFW", "CHILL"].map((f, i) => (
                    <button
                      key={f}
                      type="button"
                      className={
                        "px-3 py-1.5 transition " +
                        (i === 0
                          ? "bg-[#CCFF00] text-black"
                          : "border border-white/10 text-white/60 hover:border-white/40 hover:text-white")
                      }
                      style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em" }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {publicLobbies.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    className="group flex items-center justify-between border border-white/10 bg-[#0a0a0a] p-4 text-left transition hover:border-[#CCFF00]"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="bg-black px-3 py-2 text-[#CCFF00]"
                        style={{
                          fontFamily: "ui-monospace, monospace",
                          fontWeight: 900,
                          fontSize: 16,
                          letterSpacing: "0.1em",
                        }}
                      >
                        {l.code}
                      </div>
                      <div>
                        <div className="text-white" style={{ fontWeight: 700, fontSize: 13 }}>
                          Hosted by {l.host}
                        </div>
                        <div className="flex items-center gap-2 text-white/40" style={{ fontSize: 11 }}>
                          <Users className="h-3 w-3" /> {l.players}/{l.max}
                          <Globe className="ml-1 h-3 w-3" /> {l.lang}
                          {l.nsfw && (
                            <span
                              className="ml-1 border border-[#FF2D87] px-1 text-[#FF2D87]"
                              style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em" }}
                            >
                              18+
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span
                      className="text-white/40 transition group-hover:text-[#CCFF00]"
                      style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em" }}
                    >
                      JOIN →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

export function JoinScreen() {
  return <PartyJoinScreen designPreview />;
}
