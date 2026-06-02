/**
 * Board Brawl integration E2E against Supabase (service role).
 *
 * Usage:
 *   node --import ./scripts/resolve-ts-alias.mjs --experimental-strip-types scripts/test-board-brawl-e2e.mjs
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createRoom,
  joinRoom,
  setReady,
  startGame,
  takeTurn,
  buildSnapshot,
  submitMinigameInput,
  tickMinigameHost,
} from "../lib/board-brawl/server/room-service.ts";

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function getTwoUserIds() {
  const { data, error } = await admin.from("profiles").select("user_id").limit(2);
  if (error) throw error;
  if (!data || data.length < 2) {
    throw new Error("Need at least 2 profiles in the database for E2E");
  }
  return [data[0].user_id, data[1].user_id];
}

async function cleanupRoom(roomId) {
  await admin.from("bb_players").delete().eq("room_id", roomId);
  await admin.from("bb_rooms").delete().eq("id", roomId);
}

async function main() {
  console.log("Board Brawl E2E — starting…");

  const [hostId, guestId] = await getTwoUserIds();
  let roomId;

  try {
    const created = await createRoom(admin, hostId, 3);
    assert.equal(created.ok, true, `createRoom failed: ${created.ok ? "" : created.error}`);
    roomId = created.roomId;
    console.log(`  ✓ room created (${created.code})`);

    const joined = await joinRoom(admin, guestId, created.code);
    assert.equal(joined.ok, true, `joinRoom failed: ${joined.ok ? "" : joined.error}`);
    console.log("  ✓ guest joined");

    assert.equal((await setReady(admin, roomId, hostId, true)).ok, true);
    assert.equal((await setReady(admin, roomId, guestId, true)).ok, true);
    console.log("  ✓ both players ready");

    assert.equal((await startGame(admin, roomId, hostId)).ok, true);
    let snap = await buildSnapshot(admin, roomId, hostId);
    assert.ok(snap);
    assert.equal(snap.room.phase, "board_turn");
    assert.equal(snap.room.pendingAction, "take_turn");
    console.log("  ✓ game started (board_turn)");

    let turns = 0;
    while (snap && snap.room.phase === "board_turn" && turns < 4) {
      const activeId = snap.room.activePlayerId;
      assert.ok(activeId, "missing active player");
      const result = await takeTurn(admin, roomId, activeId, crypto.randomUUID());
      assert.equal(result.ok, true, `takeTurn failed: ${result.ok ? "" : result.error}`);
      snap = await buildSnapshot(admin, roomId, activeId);
      assert.ok(snap);
      turns += 1;
    }
    console.log(`  ✓ ${turns} board turn(s) resolved`);

    if (snap?.room.phase === "minigame") {
      console.log(`  → minigame: ${snap.room.minigameId}`);
      for (const player of snap.players) {
        await submitMinigameInput(admin, roomId, player.userId, {
          type: snap.room.minigameId === "relay_dash" ? "boost" : "tap",
          payload: {},
        });
      }

      const hostSnap = snap.players.find((p) => p.isHost);
      assert.ok(hostSnap);

      let ticks = 0;
      while (snap && snap.room.phase === "minigame" && ticks < 120) {
        await tickMinigameHost(admin, roomId, hostSnap.userId);
        snap = await buildSnapshot(admin, roomId, hostSnap.userId);
        ticks += 1;
      }
      assert.notEqual(snap?.room.phase, "minigame", "minigame did not finish within tick budget");
      console.log(`  ✓ minigame finished after ${ticks} host tick(s) → ${snap?.room.phase}`);
    }

    assert.ok(snap);
    console.log(`  ✓ final phase: ${snap.room.phase}, round ${snap.room.currentRound}/${snap.room.roundCount}`);
    console.log("Board Brawl E2E — passed");
  } finally {
    if (roomId) {
      await cleanupRoom(roomId);
      console.log("  ✓ test room cleaned up");
    }
  }
}

main().catch((err) => {
  console.error("Board Brawl E2E — failed");
  console.error(err);
  process.exit(1);
});
