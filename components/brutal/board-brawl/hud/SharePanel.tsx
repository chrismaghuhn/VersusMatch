"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { BB_COPY } from "@/lib/board-brawl/copy";
import { BOARD_BRAWL_MAX_PLAYERS, BOARD_BRAWL_MIN_PLAYERS } from "@/lib/board-brawl/constants";

type SharePanelProps = {
  code: string;
  playerCount: number;
  isHost: boolean;
  onCopyLink: () => void;
};

export function SharePanel({ code, playerCount, isHost, onCopyLink }: SharePanelProps) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="border border-[#CCFF00]/40 bg-gradient-to-br from-[#CCFF00]/10 via-black to-black p-4">
      <div className="text-[#CCFF00]" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em" }}>
        {BB_COPY.roomCode}
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {code.split("").map((char, index) => (
          <div
            key={`${char}-${index}`}
            className="flex h-12 w-9 items-center justify-center border-2 border-[#CCFF00] bg-[#CCFF00]/15 text-[#CCFF00]"
            style={{ fontFamily: "ui-monospace, monospace", fontWeight: 900, fontSize: 22 }}
          >
            {char}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          onCopyLink();
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        }}
        className="mt-3 flex w-full items-center justify-center gap-2 bg-[#CCFF00] px-4 py-2.5 font-extrabold text-black hover:bg-white"
        style={{ fontSize: 11, letterSpacing: "0.14em" }}
      >
        <Copy className="h-3.5 w-3.5" />
        {copied ? BB_COPY.copied : BB_COPY.copyLink}
      </button>
      <p className="mt-3 text-white/55" style={{ fontSize: 12, lineHeight: 1.45 }}>
        {BB_COPY.lobbyShareHint}
        <br />
        {BB_COPY.lobbyPlayers(playerCount, BOARD_BRAWL_MAX_PLAYERS)} · min {BOARD_BRAWL_MIN_PLAYERS} to start
        <br />
        {isHost ? BB_COPY.lobbyHostHint(BOARD_BRAWL_MIN_PLAYERS) : BB_COPY.lobbyGuestHint}
      </p>
    </div>
  );
}
