import type { BoardBrawlPlayerState, TileType } from "@/lib/board-brawl/types";
import { clampCoins } from "@/lib/board-brawl/economy/coins";
import { ITEM_IDS, randomItemGrant } from "@/lib/board-brawl/items/catalog";
import type { ItemId } from "@/lib/board-brawl/types";

export type EventId = "coin_shower" | "taxman" | "swap" | "bonus_roll" | "nothing";

export type TileEffectResult = {
  eventId?: EventId;
  bonusRoll?: boolean;
  players: BoardBrawlPlayerState[];
};

export function applyTileEffect(
  tileType: TileType,
  players: BoardBrawlPlayerState[],
  activePlayerId: string,
  rng: () => number = Math.random,
  options?: { lastRoundFrenzy?: boolean; hasCoinMagnet?: boolean }
): TileEffectResult {
  const active = players.find((p) => p.userId === activePlayerId);
  if (!active) return { players };

  switch (tileType) {
    case "plus": {
      const bonus = options?.lastRoundFrenzy ? 1 : 0;
      const underdog = active.stars <= 2 ? 1 : 0;
      const base = (options?.hasCoinMagnet ? 5 : 3 + bonus) + underdog;
      return {
        players: players.map((p) =>
          p.userId === activePlayerId ? { ...p, coins: clampCoins(p.coins + base) } : p
        ),
      };
    }
    case "minus":
      return {
        players: players.map((p) =>
          p.userId === activePlayerId ? { ...p, coins: clampCoins(p.coins - 2) } : p
        ),
      };
    case "event":
      return applyEvent(players, activePlayerId, rng);
    case "item":
      return grantRandomItem(players, activePlayerId, rng);
    case "luck":
      return applyLuck(players, activePlayerId, rng);
    case "shop":
    case "neutral":
    default:
      return { players };
  }
}

function applyEvent(
  players: BoardBrawlPlayerState[],
  activePlayerId: string,
  rng: () => number
): TileEffectResult {
  const roll = rng();
  if (roll < 0.3) {
    return {
      eventId: "coin_shower",
      players: players.map((p) => ({ ...p, coins: clampCoins(p.coins + 2) })),
    };
  }
  if (roll < 0.55) {
    const maxStars = Math.max(...players.map((p) => p.stars));
    const targets = players.filter((p) => p.stars === maxStars && maxStars > 0);
    const targetIds = new Set(targets.map((t) => t.userId));
    return {
      eventId: "taxman",
      players: players.map((p) =>
        targetIds.has(p.userId) ? { ...p, coins: clampCoins(p.coins - 3) } : p
      ),
    };
  }
  if (roll < 0.75) {
    const opponents = players.filter((p) => p.userId !== activePlayerId);
    if (opponents.length === 0) return { eventId: "swap", players };
    const target = opponents[Math.floor(rng() * opponents.length)]!;
    const active = players.find((p) => p.userId === activePlayerId)!;
    return {
      eventId: "swap",
      players: players.map((p) => {
        if (p.userId === activePlayerId) return { ...p, position: target.position };
        if (p.userId === target.userId) return { ...p, position: active.position };
        return p;
      }),
    };
  }
  if (roll < 0.9) {
    return { eventId: "bonus_roll", bonusRoll: true, players };
  }
  return { eventId: "nothing", players };
}

function grantRandomItem(
  players: BoardBrawlPlayerState[],
  activePlayerId: string,
  rng: () => number
): TileEffectResult {
  return {
    players: players.map((p) => {
      if (p.userId !== activePlayerId || p.items.length >= 2) return p;
      const grant = randomItemGrant(rng);
      if (!grant) return p;
      return { ...p, items: [...p.items, grant] };
    }),
  };
}

function applyLuck(
  players: BoardBrawlPlayerState[],
  activePlayerId: string,
  rng: () => number
): TileEffectResult {
  if (rng() < 0.5) {
    return {
      players: players.map((p) =>
        p.userId === activePlayerId ? { ...p, coins: clampCoins(p.coins + 5) } : p
      ),
    };
  }
  // star-chance token represented as temporary item slot — V1: +3 coins fallback
  return {
    players: players.map((p) =>
      p.userId === activePlayerId ? { ...p, coins: clampCoins(p.coins + 3) } : p
    ),
  };
}

export { ITEM_IDS };
