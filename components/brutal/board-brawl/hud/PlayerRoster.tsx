"use client";

import { Crown } from "lucide-react";
import { avatarColor } from "@/lib/board-brawl/avatar-colors";
import type { BoardBrawlPlayerState } from "@/lib/board-brawl/types";

type PlayerRosterProps = {
  players: BoardBrawlPlayerState[];
  selfUserId: string;
  activePlayerId: string | null;
  showReady?: boolean;
  pickTargetMode?: boolean;
  onSelectPlayer?: (userId: string) => void;
};

export function PlayerRoster({
  players,
  selfUserId,
  activePlayerId,
  showReady = false,
  pickTargetMode = false,
  onSelectPlayer,
}: PlayerRosterProps) {
  return (
    <ul className="flex flex-col gap-2">
      {players.map((player) => {
        const isYou = player.userId === selfUserId;
        const isActive = player.userId === activePlayerId;
        const color = avatarColor(player.avatarId);
        const canTarget = pickTargetMode && !isYou && onSelectPlayer;

        const content = (
          <>
            <span
              className="h-8 w-8 shrink-0 border-2"
              style={{ backgroundColor: color, borderColor: isActive ? "#CCFF00" : color }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 truncate font-bold text-white" style={{ fontSize: 13 }}>
                {player.isHost ? <Crown className="h-3.5 w-3.5 text-[#FFB800]" /> : null}
                {isYou ? "You" : player.displayName}
                {isActive ? (
                  <span className="text-[#CCFF00]" style={{ fontSize: 10, letterSpacing: "0.12em" }}>
                    TURN
                  </span>
                ) : null}
                {player.isDisconnected ? (
                  <span className="text-[#FF2D87]" style={{ fontSize: 10 }}>
                    DC
                  </span>
                ) : null}
              </div>
              <div className="text-white/50" style={{ fontSize: 11 }}>
                {player.coins} coins · {player.stars} stars
                {showReady ? (player.ready ? " · ready" : " · not ready") : null}
              </div>
            </div>
          </>
        );

        return (
          <li
            key={player.userId}
            className={
              "flex items-center gap-3 border px-3 py-2 " +
              (isActive ? "border-[#CCFF00] bg-[#CCFF00]/10" : "border-white/15 bg-black/60") +
              (canTarget ? " hover:border-[#FF2D87]" : "")
            }
          >
            {canTarget ? (
              <button
                type="button"
                className="flex w-full items-center gap-3 text-left"
                onClick={() => onSelectPlayer(player.userId)}
              >
                {content}
              </button>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
