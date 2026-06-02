"use client";

import { BB_COPY, bbMinigameHint, bbMinigameTitle } from "@/lib/board-brawl/copy";
import type { BoardBrawlSnapshot } from "@/lib/board-brawl/types";
import { ActionBar } from "@/components/brutal/board-brawl/hud/ActionBar";
import { BoardMinimap } from "@/components/brutal/board-brawl/hud/BoardMinimap";
import { PlayerRoster } from "@/components/brutal/board-brawl/hud/PlayerRoster";
import { SharePanel } from "@/components/brutal/board-brawl/hud/SharePanel";
import { ItemTray } from "@/components/brutal/board-brawl/hud/ItemTray";
import type { ItemId } from "@/lib/board-brawl/types";
import type { ReactNode } from "react";

type GameLayoutProps = {
  snapshot: BoardBrawlSnapshot;
  busy: boolean;
  error: string | null;
  viewport: ReactNode;
  onRoll: () => void;
  onBuyStar: () => void;
  onSkipShop: () => void;
  onStart: () => void;
  onToggleReady: () => void;
  onMinigameTap: () => void;
  onCopyLink: () => void;
  onUseItem: (itemId: ItemId) => void;
  onSelectTarget: (userId: string) => void;
  onLeave: () => void;
  onRematch?: () => void;
  footer?: ReactNode;
};

function statusLineFor(snapshot: BoardBrawlSnapshot): string {
  const { room, players, self } = snapshot;
  const me = players.find((p) => p.userId === self.userId);
  const active = players.find((p) => p.userId === room.activePlayerId);
  const activeName = active?.userId === self.userId ? "You" : (active?.displayName ?? "…");

  if (room.phase === "waiting") {
    return me?.isHost ? BB_COPY.lobbyHostHint(2) : BB_COPY.waitingForHost;
  }
  if (room.phase === "minigame") {
    return `${bbMinigameTitle(room.minigameId)} — ${bbMinigameHint(room.minigameId)}`;
  }
  if (room.phase === "minigame_results") {
    return BB_COPY.minigameResultsWait;
  }
  if (room.pendingAction === "item_target" && room.activePlayerId === self.userId) {
    return BB_COPY.pickTarget;
  }
  if (room.phase === "finished") {
    return "Match over — check the podium in the 3D view.";
  }
  if (room.pendingAction === "shop" && room.activePlayerId === self.userId) {
    return BB_COPY.shopHint;
  }
  if (room.pendingAction === "take_turn" && room.activePlayerId === self.userId) {
    return `${BB_COPY.yourTurn} — ${BB_COPY.rollHint}`;
  }
  if (room.phase === "board_turn" || room.phase === "board_resolve") {
    return BB_COPY.waitingForPlayer(activeName);
  }
  return BB_COPY.roundLabel(room.currentRound, room.roundCount);
}

export function GameLayout({
  snapshot,
  busy,
  error,
  viewport,
  onRoll,
  onBuyStar,
  onSkipShop,
  onStart,
  onToggleReady,
  onMinigameTap,
  onCopyLink,
  onUseItem,
  onSelectTarget,
  onLeave,
  onRematch,
  footer,
}: GameLayoutProps) {
  const { room, players, self, map } = snapshot;
  const me = players.find((p) => p.userId === self.userId);
  const showBoard =
    room.phase === "board_turn" ||
    room.phase === "board_resolve" ||
    room.phase === "round_end";

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-[520px] flex-col bg-[#0a0a0a] text-white">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-2">
        <div>
          <span className="text-[#CCFF00]" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em" }}>
            BOARD BRAWL
          </span>
          <div className="font-black" style={{ fontSize: 16 }}>
            {room.phase === "waiting" ? "LOBBY" : room.phase.replace(/_/g, " ").toUpperCase()}
            {" · "}
            {BB_COPY.roundLabel(room.currentRound, room.roundCount)}
          </div>
        </div>
        {room.lastRoll != null ? (
          <span className="text-white/50" style={{ fontSize: 12 }}>
            {BB_COPY.lastRoll(room.lastRoll)}
          </span>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-white/10 p-4">
          {room.phase === "waiting" ? (
            <SharePanel
              code={room.code}
              playerCount={players.length}
              isHost={me?.isHost ?? false}
              onCopyLink={onCopyLink}
            />
          ) : null}
          <div>
            <div className="mb-2 text-white/40" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em" }}>
              PLAYERS
            </div>
            <PlayerRoster
              players={players}
              selfUserId={self.userId}
              activePlayerId={room.phase === "minigame_results" ? null : room.activePlayerId}
              showReady={room.phase === "waiting"}
              pickTargetMode={
                room.pendingAction === "item_target" && room.activePlayerId === self.userId
              }
              onSelectPlayer={onSelectTarget}
            />
          </div>
          <ItemTray snapshot={snapshot} busy={busy} onUseItem={onUseItem} />
          {room.phase === "minigame_results" && snapshot.minigame?.resultRows ? (
            <div className="border border-white/15 bg-black/60 p-3">
              <div className="mb-2 text-white/40" style={{ fontSize: 10, fontWeight: 700 }}>
                {BB_COPY.minigameResults}
              </div>
              <ul className="space-y-1">
                {snapshot.minigame.resultRows.map((row) => {
                  const p = players.find((pl) => pl.userId === row.playerId);
                  return (
                    <li key={row.playerId} className="flex justify-between text-sm text-white">
                      <span>
                        #{row.rank} {p?.displayName ?? row.playerId.slice(0, 6)}
                      </span>
                      <span className="text-[#CCFF00]">{row.score} pts</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          <button
            type="button"
            onClick={onLeave}
            className="text-white/40 hover:text-white"
            style={{ fontSize: 11, fontWeight: 700 }}
          >
            {BB_COPY.leaveRoom}
          </button>
          {showBoard ? (
            <BoardMinimap
              map={map}
              players={players}
              activePlayerId={room.activePlayerId}
            />
          ) : null}
        </aside>

        <main className="relative min-w-0 flex-1 bg-[#111]">
          {viewport}
          {room.phase === "minigame" ? (
            <div className="pointer-events-none absolute left-4 right-4 top-4 border border-[#FF2D87]/50 bg-black/80 px-4 py-3 text-center">
              <div className="font-black text-[#FF2D87]" style={{ fontSize: 14 }}>
                {bbMinigameTitle(room.minigameId)}
              </div>
              <p className="mt-1 text-white/70" style={{ fontSize: 12 }}>
                {bbMinigameHint(room.minigameId)}
              </p>
            </div>
          ) : null}
          {room.phase === "minigame_results" ? (
            <div className="pointer-events-none absolute left-4 right-4 top-4 border border-[#CCFF00]/50 bg-black/80 px-4 py-3 text-center">
              <div className="font-black text-[#CCFF00]" style={{ fontSize: 14 }}>
                {BB_COPY.minigameResults}
              </div>
              <p className="mt-1 text-white/70" style={{ fontSize: 12 }}>
                {BB_COPY.minigameResultsWait}
              </p>
            </div>
          ) : null}
        </main>
      </div>

      <ActionBar
        snapshot={snapshot}
        busy={busy}
        error={error}
        statusLine={statusLineFor(snapshot)}
        onRoll={onRoll}
        onBuyStar={onBuyStar}
        onSkipShop={onSkipShop}
        onStart={onStart}
        onToggleReady={onToggleReady}
        onMinigameTap={onMinigameTap}
        onRematch={onRematch}
      />
      {footer}
    </div>
  );
}
