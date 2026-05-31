import assert from "node:assert/strict";
import { describe, it } from "node:test";

const UNDERDOG_PCT_THRESHOLD = 40;
const CLOSE_PCT_MIN = 45;
const CLOSE_PCT_MAX = 55;

const PASS_TIERS = [
  { tier: 1, xp: 50, reward: "title:rookie" },
  { tier: 2, xp: 200, reward: "badge:bronze" },
  { tier: 3, xp: 450, reward: "share_card:style2" },
  { tier: 4, xp: 800, reward: "title:debater" },
  { tier: 5, xp: 1500, reward: "title:fight_legend+badge:legend" },
];

function getPostVoteDrama(userSidePct) {
  if (userSidePct < UNDERDOG_PCT_THRESHOLD) {
    return {
      kind: "underdog",
      message: `UNDERDOG — only ${userSidePct}% picked your side. Fight back.`,
    };
  }
  if (userSidePct >= CLOSE_PCT_MIN && userSidePct <= CLOSE_PCT_MAX) {
    return { kind: "close", message: "TOO CLOSE — every vote counts." };
  }
  return { kind: "winning", message: "YOUR SIDE IS WINNING — defend it." };
}

function getTierForXp(xp) {
  let current = PASS_TIERS[0];
  for (const row of PASS_TIERS) {
    if (xp >= row.xp) current = row;
  }
  const next = PASS_TIERS.find((row) => row.xp > xp) ?? null;
  return { current, next, xp };
}

describe("getPostVoteDrama", () => {
  it("returns underdog for low side pct", () => {
    const result = getPostVoteDrama(23);
    assert.equal(result.kind, "underdog");
    assert.match(result.message, /23%/);
  });

  it("returns close for mid-range pct", () => {
    const result = getPostVoteDrama(50);
    assert.equal(result.kind, "close");
    assert.equal(result.message, "TOO CLOSE — every vote counts.");
  });

  it("returns winning for high side pct", () => {
    const result = getPostVoteDrama(70);
    assert.equal(result.kind, "winning");
    assert.equal(result.message, "YOUR SIDE IS WINNING — defend it.");
  });
});

describe("getTierForXp", () => {
  it("returns tier 1 as current at 0 xp with tier 1 as next", () => {
    const result = getTierForXp(0);
    assert.equal(result.current.tier, 1);
    assert.equal(result.current.xp, 50);
    assert.equal(result.next?.tier, 1);
    assert.equal(result.xp, 0);
  });

  it("returns tier 5 at 1500 xp with no next tier", () => {
    const result = getTierForXp(1500);
    assert.equal(result.current.tier, 5);
    assert.equal(result.current.xp, 1500);
    assert.equal(result.next, null);
    assert.equal(result.xp, 1500);
  });
});
