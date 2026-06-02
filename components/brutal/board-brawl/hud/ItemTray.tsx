"use client";

import { BB_COPY } from "@/lib/board-brawl/copy";
import type { BoardBrawlSnapshot, ItemId } from "@/lib/board-brawl/types";

type ItemTrayProps = {
  snapshot: BoardBrawlSnapshot;
  busy: boolean;
  onUseItem: (itemId: ItemId) => void;
};

export function ItemTray({ snapshot, busy, onUseItem }: ItemTrayProps) {
  const me = snapshot.players.find((p) => p.userId === snapshot.self.userId);
  if (!me?.items.length) return null;
  if (snapshot.room.phase !== "board_turn") return null;
  if (snapshot.room.activePlayerId !== snapshot.self.userId) return null;
  if (
    snapshot.room.pendingAction !== "take_turn" &&
    snapshot.room.pendingAction !== "item_target"
  ) {
    return null;
  }

  return (
    <div>
      <div className="mb-2 text-white/40" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em" }}>
        {BB_COPY.itemsLabel}
      </div>
      <div className="flex flex-wrap gap-2">
        {me.items
          .filter((id) => id !== "tripwire_debuff")
          .map((itemId) => (
            <button
              key={itemId}
              type="button"
              disabled={busy || snapshot.room.pendingAction === "item_target"}
              onClick={() => onUseItem(itemId)}
              className="border border-[#FFB800]/60 bg-[#FFB800]/10 px-2 py-1 text-[#FFB800] hover:bg-[#FFB800]/25 disabled:opacity-40"
              style={{ fontSize: 11, fontWeight: 700 }}
            >
              {BB_COPY.itemLabels[itemId] ?? itemId}
            </button>
          ))}
      </div>
    </div>
  );
}
