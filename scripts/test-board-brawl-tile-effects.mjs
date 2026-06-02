import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTileLayout } from "../lib/board-brawl/board/tiles.ts";
import { applyTileEffect } from "../lib/board-brawl/board/effects.ts";

const basePlayer = {
  userId: "a",
  displayName: "A",
  avatarId: "frog",
  coins: 5,
  stars: 0,
  position: 0,
  items: [],
  ready: true,
  isHost: true,
  isDisconnected: false,
  minigameFirstPlaces: 0,
};

test("buildTileLayout is deterministic", () => {
  const a = buildTileLayout(42);
  const b = buildTileLayout(42);
  assert.deepEqual(a, b);
  assert.equal(a.length, 24);
  assert.equal(a[6], "shop");
});

test("plus tile adds coins (+1 underdog when stars <= 2)", () => {
  const { players } = applyTileEffect("plus", [basePlayer], "a");
  assert.equal(players[0].coins, 9);
});

test("plus tile without underdog bonus", () => {
  const rich = { ...basePlayer, stars: 3 };
  const { players } = applyTileEffect("plus", [rich], "a");
  assert.equal(players[0].coins, 8);
});
