import assert from "node:assert/strict";
import { test } from "node:test";
import { getRevealTheatreLabel } from "../lib/party/reveal-theatre.ts";

test("PHOTO FINISH on 1-vote margin", () => {
  assert.equal(
    getRevealTheatreLabel([{ voteCount: 3 }, { voteCount: 2 }]),
    "PHOTO FINISH"
  );
});

test("UNANIMOUS when winner has all votes", () => {
  assert.equal(
    getRevealTheatreLabel([{ voteCount: 4 }, { voteCount: 0 }], 4),
    "UNANIMOUS"
  );
});

test("LANDSLIDE at 75%+", () => {
  assert.equal(
    getRevealTheatreLabel([{ voteCount: 3 }, { voteCount: 1 }], 4),
    "LANDSLIDE"
  );
});

test("null when fewer than 2 submissions", () => {
  assert.equal(getRevealTheatreLabel([{ voteCount: 1 }]), null);
});
