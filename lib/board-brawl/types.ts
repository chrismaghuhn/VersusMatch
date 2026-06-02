import type { BoardMap } from "@/lib/board-brawl/board/map-types";

export type BoardBrawlPhase =
  | "waiting"
  | "board_turn"
  | "board_resolve"
  | "minigame"
  | "minigame_results"
  | "round_end"
  | "finished";

export type BoardBrawlStatus = "open" | "in_progress" | "finished" | "abandoned";

export type PendingAction = "take_turn" | "shop" | "item_target" | null;

export type TileType = "plus" | "minus" | "event" | "item" | "luck" | "neutral" | "shop";

export type ItemId =
  | "golden_dice"
  | "coin_magnet"
  | "double_shop"
  | "tripwire"
  | "coin_snatch"
  | "star_tax"
  | "tripwire_debuff";

export type Vec3 = { x: number; y: number; z: number };

export type BoardBrawlPlayerState = {
  userId: string;
  displayName: string;
  avatarId: string;
  coins: number;
  stars: number;
  position: number;
  items: ItemId[];
  ready: boolean;
  isHost: boolean;
  isDisconnected: boolean;
  minigameFirstPlaces: number;
};

export type BoardBrawlRoomState = {
  id: string;
  code: string;
  status: BoardBrawlStatus;
  phase: BoardBrawlPhase;
  roundCount: number;
  currentRound: number;
  boardSeed: number;
  turnOrder: string[];
  turnIndex: number;
  activePlayerId: string | null;
  lastRoll: number | null;
  pendingAction: PendingAction;
  minigameId: string | null;
  minigameState: Record<string, unknown> | null;
  minigamePendingInputs: MinigameInput[];
  lastTickAt: string | null;
  phaseEndsAt: string | null;
  turnNonce: string | null;
  hostId: string;
};

export type MinigameInput = {
  playerId: string;
  type: string;
  payload: Record<string, unknown>;
  at: number;
};

export type BoardBrawlSnapshot = {
  room: {
    id: string;
    code: string;
    status: BoardBrawlStatus;
    phase: BoardBrawlPhase;
    roundCount: number;
    currentRound: number;
    phaseEndsAt: string | null;
    boardSeed: number;
    minigameId: string | null;
    turnIndex: number;
    activePlayerId: string | null;
    lastRoll: number | null;
    pendingAction: PendingAction;
    hostId: string;
    pendingItemId: ItemId | null;
  };
  tiles: TileType[];
  map: BoardMap;
  players: BoardBrawlPlayerState[];
  minigame: {
    state: Record<string, unknown>;
    scores: Record<string, number>;
    endsAt: string | null;
    resultRows?: Array<{ playerId: string; score: number; rank: number }> | null;
  } | null;
  self: { userId: string };
};

export type TakeTurnResult = {
  roll: number;
  newPosition: number;
  tileType: TileType;
  eventId?: string;
  shopPrompt: boolean;
};
