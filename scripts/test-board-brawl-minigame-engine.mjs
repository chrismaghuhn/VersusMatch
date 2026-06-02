import assert from "node:assert/strict";
import { test } from "node:test";
import { tickMinigame, initMinigame } from "../lib/board-brawl/minigames/engine.ts";
import { getMinigameTickInterval } from "../lib/board-brawl/minigames/registry.ts";

test("button_mash tick interval is at least 200ms", () => {
  assert.ok(getMinigameTickInterval("button_mash") >= 200);
});

test("initMinigame creates button mash state", () => {
  const state = initMinigame("button_mash", {
    playerIds: ["a", "b"],
    leaderId: null,
    roomSeed: 1,
    round: 1,
  });
  assert.ok(state);
  assert.ok(state.taps);
});

test("tickMinigame rejects too-soon ticks", () => {
  const state = initMinigame("button_mash", {
    playerIds: ["a"],
    leaderId: null,
    roomSeed: 1,
    round: 1,
  });
  assert.ok(state);
  const now = Date.now();
  const first = tickMinigame("button_mash", state, [], null, now);
  assert.equal(first.ok, true);
  const second = tickMinigame("button_mash", first.result.state, [], now, now + 10);
  assert.equal(second.ok, false);
});
