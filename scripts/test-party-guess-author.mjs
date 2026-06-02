import assert from "node:assert/strict";
import { test } from "node:test";
import {
  countEligibleGuessers,
  isGuessPhaseReady,
  shouldSkipGuessPhase,
  formatGuessRevealLine,
} from "../lib/party/guess-author.ts";

test("shouldSkipGuessPhase true when fewer than 2 submissions", () => {
  assert.equal(shouldSkipGuessPhase(0), true);
  assert.equal(shouldSkipGuessPhase(1), true);
  assert.equal(shouldSkipGuessPhase(2), false);
});

test("countEligibleGuessers excludes winner author", () => {
  assert.equal(countEligibleGuessers(4, true), 3);
  assert.equal(countEligibleGuessers(1, true), 0);
});

test("isGuessPhaseReady when all eligible guessed", () => {
  assert.equal(
    isGuessPhaseReady({
      eligibleGuesserCount: 3,
      authorGuessesCastCount: 3,
    }),
    true
  );
  assert.equal(
    isGuessPhaseReady({
      eligibleGuesserCount: 3,
      authorGuessesCastCount: 2,
    }),
    false
  );
});

test("formatGuessRevealLine", () => {
  assert.equal(formatGuessRevealLine(2, 3, "alice"), "2/3 guessed @alice");
});
