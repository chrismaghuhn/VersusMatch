import type { BoardBrawlPlayerState, ItemId, TakeTurnResult } from "@/lib/board-brawl/types";
import { BONUS_ROLL_MAX_CHAIN } from "@/lib/board-brawl/constants";
import { applyTripwire, rollGoldenDice, rollStandardDice } from "@/lib/board-brawl/board/dice";
import { moveForward } from "@/lib/board-brawl/board/movement";
import { applyTileEffect } from "@/lib/board-brawl/board/effects";
import { buildTileLayout } from "@/lib/board-brawl/board/tiles";
import type { TileType } from "@/lib/board-brawl/types";

export type TakeTurnOptions = {
  forcedRoll?: number;
  hasGoldenDice?: boolean;
  hasCoinMagnet?: boolean;
  lastRoundFrenzy?: boolean;
  rng?: () => number;
};

export type TakeTurnOutcome = {
  players: BoardBrawlPlayerState[];
  result: TakeTurnResult;
  bonusRollsRemaining: number;
};

export function executeTakeTurn(
  players: BoardBrawlPlayerState[],
  activePlayerId: string,
  boardSeed: number,
  options: TakeTurnOptions = {}
): TakeTurnOutcome {
  const rng = options.rng ?? Math.random;
  const tiles = buildTileLayout(boardSeed);
  let working = players.map((p) => ({ ...p, items: [...p.items] }));
  let bonusRollsRemaining = 0;
  let chain = 0;
  let lastResult: TakeTurnResult = {
    roll: 1,
    newPosition: 0,
    tileType: "neutral",
    shopPrompt: false,
  };

  do {
    const active = working.find((p) => p.userId === activePlayerId);
    if (!active) break;

    let roll = options.forcedRoll ?? rollStandardDice(rng);
    if (options.hasGoldenDice && options.forcedRoll === undefined) {
      roll = rollGoldenDice(rng);
    }
    const hadTripwire = active.items.includes("tripwire_debuff");
    if (hadTripwire) {
      roll = applyTripwire(roll);
    }

    const newPosition = moveForward(active.position, roll);
    const tileType = tiles[newPosition] ?? "neutral";

    working = working.map((p) => {
      if (p.userId !== activePlayerId) return p;
      const items = hadTripwire ? p.items.filter((i) => i !== "tripwire_debuff") : p.items;
      return { ...p, position: newPosition, items };
    });

    const effect = applyTileEffect(tileType, working, activePlayerId, rng, {
      lastRoundFrenzy: options.lastRoundFrenzy,
      hasCoinMagnet: options.hasCoinMagnet,
    });
    working = effect.players;

    if (effect.bonusRoll && chain < BONUS_ROLL_MAX_CHAIN) {
      bonusRollsRemaining++;
    }

    lastResult = {
      roll,
      newPosition,
      tileType,
      eventId: effect.eventId,
      shopPrompt: tileType === "shop",
    };

    chain++;
    if (bonusRollsRemaining > 0) {
      bonusRollsRemaining--;
    } else {
      break;
    }
  } while (chain <= BONUS_ROLL_MAX_CHAIN + 1);

  return { players: working, result: lastResult, bonusRollsRemaining: 0 };
}

export function consumeItem(items: ItemId[], itemId: ItemId): ItemId[] {
  const index = items.indexOf(itemId);
  if (index === -1) return items;
  return items.filter((_, i) => i !== index);
}

export { buildTileLayout };
export type { TileType };
