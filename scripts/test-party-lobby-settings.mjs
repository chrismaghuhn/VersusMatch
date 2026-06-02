import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LOBBY_SETTINGS_KEYS,
  validateLobbySettingsPatch,
} from "../lib/party/lobby-settings.ts";

test("rejects empty patch", () => {
  const r = validateLobbySettingsPatch({});
  assert.equal(r.ok, false);
  assert.equal(r.error, "invalid_settings");
});

test("rejects unknown keys", () => {
  const r = validateLobbySettingsPatch({ foo: 1 });
  assert.equal(r.ok, false);
});

test("rejects null values", () => {
  const r = validateLobbySettingsPatch({ round_count: null });
  assert.equal(r.ok, false);
});

test("accepts partial valid patch", () => {
  const r = validateLobbySettingsPatch({ vote_duration_seconds: 45 });
  assert.equal(r.ok, true);
  assert.deepEqual(r.patch, { vote_duration_seconds: 45 });
});

test("caption must be 30-120 step 15", () => {
  assert.equal(validateLobbySettingsPatch({ caption_duration_seconds: 75 }).ok, true);
  assert.equal(validateLobbySettingsPatch({ caption_duration_seconds: 70 }).ok, false);
});

test("rerolls cannot exceed round_count in same patch", () => {
  const r = validateLobbySettingsPatch({ round_count: 3, rerolls_per_player: 4 });
  assert.equal(r.ok, false);
});

test("rejects string numbers (no coercion)", () => {
  assert.equal(validateLobbySettingsPatch({ caption_duration_seconds: "75" }).ok, false);
  assert.equal(validateLobbySettingsPatch({ vote_duration_seconds: "30" }).ok, false);
  assert.equal(validateLobbySettingsPatch({ max_players: "8" }).ok, false);
});

test("rerolls cannot exceed context round_count when only rerolls patched", () => {
  const r = validateLobbySettingsPatch({ rerolls_per_player: 7 }, { roundCount: 5 });
  assert.equal(r.ok, false);
});

test("allowlist is stable", () => {
  assert.ok(LOBBY_SETTINGS_KEYS.includes("max_players"));
});
