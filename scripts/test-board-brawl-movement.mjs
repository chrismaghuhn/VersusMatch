import assert from "node:assert/strict";
import { test } from "node:test";
import { moveForward } from "../lib/board-brawl/board/movement.ts";

test("moveForward wraps on 24 tile board", () => {
  assert.equal(moveForward(22, 3), 1);
  assert.equal(moveForward(0, 1), 1);
});

test("moveForward respects explicit cell count", () => {
  assert.equal(moveForward(10, 4, 12), 2);
  assert.equal(moveForward(0, 12, 12), 0);
});
