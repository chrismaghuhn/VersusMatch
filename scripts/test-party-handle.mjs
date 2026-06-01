import assert from "node:assert/strict";
import { test } from "node:test";

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

function normalizeHandle(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 20);
}

function validateHandle(handle) {
  if (!HANDLE_RE.test(handle)) {
    return { ok: false };
  }
  return { ok: true };
}

test("normalizeHandle lowercases and strips invalid chars", () => {
  assert.equal(normalizeHandle("VoteGremlin"), "votegremlin");
  assert.equal(normalizeHandle("  Hot-Take!!  "), "hot_take");
});

test("validateHandle accepts spec format", () => {
  assert.equal(validateHandle("abc").ok, true);
  assert.equal(validateHandle("ab").ok, false);
  assert.equal(validateHandle("UPPER").ok, false);
});
