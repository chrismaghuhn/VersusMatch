import assert from "node:assert/strict";
import { test } from "node:test";
import { rollGoldenDice, rollStandardDice, applyTripwire } from "../lib/board-brawl/board/dice.ts";

test("rollStandardDice returns 1-10", () => {
  const rng = () => 0;
  assert.equal(rollStandardDice(rng), 1);
  assert.equal(rollStandardDice(() => 0.999), 10);
});

test("rollGoldenDice returns 6-10", () => {
  assert.equal(rollGoldenDice(() => 0), 6);
  assert.equal(rollGoldenDice(() => 0.999), 10);
});

test("applyTripwire floors at 1", () => {
  assert.equal(applyTripwire(5), 2);
  assert.equal(applyTripwire(2), 1);
});
