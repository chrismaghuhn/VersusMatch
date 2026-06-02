import assert from "node:assert/strict";
import { test } from "node:test";

import { parsePartyPeek } from "../lib/party/peek.ts";
import { partyRpcStatus } from "../lib/party/rpc-response.ts";

test("parsePartyPeek returns success payload", () => {
  const result = parsePartyPeek({
    ok: true,
    code: "ABCD12",
    host_handle: "hoster",
    player_count: 3,
    max_players: 8,
    in_game: false,
    is_finished: false,
    phase: "waiting",
  });

  assert.deepEqual(result, {
    ok: true,
    code: "ABCD12",
    hostHandle: "hoster",
    playerCount: 3,
    maxPlayers: 8,
    inGame: false,
    isFinished: false,
    phase: "waiting",
  });
});

test("parsePartyPeek maps in_game responses to in_progress", () => {
  const result = parsePartyPeek({
    ok: true,
    code: "ROOM9X",
    host_handle: "captain",
    player_count: 6,
    max_players: 10,
    in_game: true,
    is_finished: false,
    phase: "reveal",
  });

  assert.deepEqual(result, {
    ok: true,
    code: "ROOM9X",
    hostHandle: "captain",
    playerCount: 6,
    maxPlayers: 10,
    inGame: true,
    isFinished: false,
    phase: "in_progress",
  });
});

test("partyRpcStatus maps lobby and kick errors", () => {
  assert.equal(partyRpcStatus("kicked"), 403);
  assert.equal(partyRpcStatus("not_in_room"), 403);
  assert.equal(partyRpcStatus("banned_from_room"), 409);
  assert.equal(partyRpcStatus("invalid_settings"), 409);
  assert.equal(partyRpcStatus("too_many_players"), 409);
  assert.equal(partyRpcStatus("cannot_kick_self"), 409);
  assert.equal(partyRpcStatus("cannot_kick_last"), 409);
  assert.equal(partyRpcStatus("player_not_found"), 409);
});
