import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveWinners } from "../lib/board-brawl/match/win-condition.ts";

test("resolveWinners by stars", () => {
  const players = [
    { userId: "a", stars: 2, coins: 0, minigameFirstPlaces: 0 },
    { userId: "b", stars: 3, coins: 0, minigameFirstPlaces: 0 },
  ].map((p) => ({
    ...p,
    displayName: p.userId,
    avatarId: "frog",
    position: 0,
    items: [],
    ready: true,
    isHost: false,
    isDisconnected: false,
  }));

  const result = resolveWinners(players);
  assert.deepEqual(result.winnerIds, ["b"]);
});
