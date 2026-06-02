"use client";

import { BB_COPY, bbErrorMessage } from "@/lib/board-brawl/copy";
import type { BoardBrawlSnapshot } from "@/lib/board-brawl/types";

type ActionBarProps = {
  snapshot: BoardBrawlSnapshot;
  busy: boolean;
  error: string | null;
  statusLine: string;
  onRoll: () => void;
  onBuyStar: () => void;
  onSkipShop: () => void;
  onStart: () => void;
  onToggleReady: () => void;
  onMinigameTap: () => void;
  onRematch?: () => void;
};

export function ActionBar({
  snapshot,
  busy,
  error,
  statusLine,
  onRoll,
  onBuyStar,
  onSkipShop,
  onStart,
  onToggleReady,
  onMinigameTap,
  onRematch,
}: ActionBarProps) {
  const { room, players, self } = snapshot;
  const me = players.find((p) => p.userId === self.userId);
  const isHost = me?.isHost ?? false;
  const isMyTurn = room.activePlayerId === self.userId;

  return (
    <div className="shrink-0 border-t border-white/10 bg-black/95 px-4 py-4">
      <p className="mb-3 text-center font-bold text-white" style={{ fontSize: 15 }}>
        {statusLine}
      </p>
      {error ? (
        <p className="mb-3 bg-[#FF2D87] px-3 py-2 text-center text-sm font-bold text-white">
          {bbErrorMessage(error)}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {room.phase === "waiting" ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={onToggleReady}
              className="bg-[#CCFF00] px-8 py-3 font-extrabold text-black disabled:opacity-50"
            >
              {me?.ready ? BB_COPY.notReady : BB_COPY.ready}
            </button>
            {isHost ? (
              <button
                type="button"
                disabled={busy}
                onClick={onStart}
                className="border-2 border-white px-8 py-3 font-extrabold text-white disabled:opacity-50"
              >
                {BB_COPY.startGame}
              </button>
            ) : null}
          </>
        ) : null}

        {room.phase === "board_turn" && room.pendingAction === "take_turn" && isMyTurn ? (
          <button
            type="button"
            disabled={busy}
            onClick={onRoll}
            className="bg-[#CCFF00] px-12 py-4 text-xl font-black text-black disabled:opacity-50"
          >
            {BB_COPY.roll}
          </button>
        ) : null}

        {room.pendingAction === "shop" && isMyTurn ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={onBuyStar}
              className="bg-[#CCFF00] px-8 py-3 font-extrabold text-black disabled:opacity-50"
            >
              {BB_COPY.buyStar}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onSkipShop}
              className="border-2 border-white px-8 py-3 font-extrabold text-white disabled:opacity-50"
            >
              {BB_COPY.skipShop}
            </button>
          </>
        ) : null}

        {room.phase === "finished" && isHost && onRematch ? (
          <button
            type="button"
            disabled={busy}
            onClick={onRematch}
            className="bg-[#CCFF00] px-8 py-3 font-extrabold text-black disabled:opacity-50"
          >
            {BB_COPY.rematch}
          </button>
        ) : null}

        {room.phase === "minigame" ? (
          <button
            type="button"
            disabled={busy}
            onClick={onMinigameTap}
            className="bg-[#FF2D87] px-12 py-4 text-xl font-black text-white disabled:opacity-50"
          >
            ACTION (SPACE)
          </button>
        ) : null}
      </div>
    </div>
  );
}
