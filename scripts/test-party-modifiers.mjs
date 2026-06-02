import assert from "node:assert/strict";
import { test } from "node:test";

import { validateRoundModifier } from "../lib/party/round-modifiers.ts";

test("three_words rejects fourth word in one box", () => {
  assert.equal(validateRoundModifier("three_words", "one two three"), true);
  assert.equal(validateRoundModifier("three_words", "one two three four"), false);
});

test("three_words allows three words per caption box", () => {
  assert.equal(validateRoundModifier("three_words", "one two three\nfour five six"), true);
  assert.equal(validateRoundModifier("three_words", "one two\nthree four five six"), false);
});

test("forty_chars enforces trimmed character cap", () => {
  assert.equal(validateRoundModifier("forty_chars", "a".repeat(40)), true);
  assert.equal(validateRoundModifier("forty_chars", ` ${"a".repeat(41)} `), false);
});

test("all_caps requires literal uppercase plain text", () => {
  assert.equal(validateRoundModifier("all_caps", "HELLO 123!?"), true);
  assert.equal(validateRoundModifier("all_caps", "Hello"), false);
});
