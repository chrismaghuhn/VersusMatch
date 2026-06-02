"use client";

import { cellToWorld, gridToWorld } from "@/lib/board-brawl/board/layout-3d";
import type { BoardMap } from "@/lib/board-brawl/board/map-types";
import { TILE_COLORS } from "@/lib/board-brawl/avatar-colors";
import { BB_COPY } from "@/lib/board-brawl/copy";
import type { BoardBrawlPlayerState, TileType } from "@/lib/board-brawl/types";

const TILE_LABELS: Record<TileType, string> = {
  plus: BB_COPY.tilePlus,
  minus: BB_COPY.tileMinus,
  shop: BB_COPY.tileShop,
  item: BB_COPY.tileItem,
  event: BB_COPY.tileEvent,
  luck: BB_COPY.tileLuck,
  neutral: BB_COPY.tileNeutral,
};

type BoardMinimapProps = {
  map: BoardMap;
  players: BoardBrawlPlayerState[];
  activePlayerId: string | null;
};

export function BoardMinimap({ map, players, activePlayerId }: BoardMinimapProps) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const scale = 7.5;

  return (
    <div className="border border-white/15 bg-black/85 p-3">
      <div className="mb-2 text-white/40" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em" }}>
        {BB_COPY.boardLegend}
      </div>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto block">
        {map.cells.map((cell) => {
          const w = gridToWorld(cell.gridX, cell.gridY, map.width, map.height);
          const x = cx + w.x * scale;
          const y = cy + w.z * scale;
          const fill = TILE_COLORS[cell.type] ?? TILE_COLORS.neutral;
          return (
            <rect
              key={cell.id}
              x={x - 5}
              y={y - 5}
              width={10}
              height={10}
              fill={fill}
              stroke={cell.type === "shop" ? "#CCFF00" : "rgba(255,255,255,0.15)"}
              strokeWidth={cell.type === "shop" ? 1.5 : 0.5}
            />
          );
        })}
        {players.map((player) => {
          const w = cellToWorld(map, player.position);
          const x = cx + w.x * scale;
          const y = cy + w.z * scale;
          const active = player.userId === activePlayerId;
          return (
            <circle
              key={player.userId}
              cx={x}
              cy={y}
              r={active ? 5 : 4}
              fill={active ? "#CCFF00" : "#FFFFFF"}
              stroke="#000"
              strokeWidth={1}
            />
          );
        })}
      </svg>
      <ul className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-white/45" style={{ fontSize: 10 }}>
        {(Object.keys(TILE_LABELS) as TileType[]).map((type) => (
          <li key={type} className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0" style={{ backgroundColor: TILE_COLORS[type] }} />
            {TILE_LABELS[type]}
          </li>
        ))}
      </ul>
    </div>
  );
}
