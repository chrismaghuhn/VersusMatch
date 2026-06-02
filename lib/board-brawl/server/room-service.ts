import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import type {
  BoardBrawlPlayerState,
  BoardBrawlSnapshot,
  ItemId,
  MinigameInput,
  PendingAction,
} from "@/lib/board-brawl/types";
import type { BoardMap } from "@/lib/board-brawl/board/map-types";
import { generateDefaultMap } from "@/lib/board-brawl/board/default-map";
import { parseBoardMap } from "@/lib/board-brawl/board/parse-map";
import { BOARD_BRAWL_MAX_PLAYERS, BOARD_BRAWL_MIN_PLAYERS } from "@/lib/board-brawl/constants";
import { rewardCoinsForPlacement } from "@/lib/board-brawl/economy/coins";
import { starPurchaseCost, canBuyStar } from "@/lib/board-brawl/economy/stars";
import { executeTakeTurn } from "@/lib/board-brawl/match/take-turn";
import { shuffleTurnOrder, nextTurnIndex, sortTurnOrderUnderdog } from "@/lib/board-brawl/match/turn-order";
import { resolveWinners } from "@/lib/board-brawl/match/win-condition";
import {
  initMinigame,
  tickMinigame,
  drainInputs,
} from "@/lib/board-brawl/minigames/engine";
import { pickMinigameId, scoreMinigame } from "@/lib/board-brawl/minigames/registry";
import { isBoostItem, isSabotageItem } from "@/lib/board-brawl/items/catalog";
import { consumeItem } from "@/lib/board-brawl/match/take-turn";
import {
  BB_MINIGAME_RESULTS_MS,
  isPlayerDisconnected,
  markDisconnectedPlayers,
  migrateHostIfStale,
} from "@/lib/board-brawl/server/room-stale";
import { isAvatarId } from "@/lib/party/avatar-ids";

type AdminClient = SupabaseClient<Database>;

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]!;
  }
  return code;
}

type RoomRow = Database["public"]["Tables"]["bb_rooms"]["Row"];
type PlayerRow = Database["public"]["Tables"]["bb_players"]["Row"];

function parseItems(raw: unknown): ItemId[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is ItemId => typeof x === "string");
}

function mapPlayer(row: PlayerRow, profileHandle?: string): BoardBrawlPlayerState {
  return {
    userId: row.user_id,
    displayName: profileHandle ?? row.user_id.slice(0, 8),
    avatarId: isAvatarId(row.avatar_id) ? row.avatar_id : "frog",
    coins: row.coins,
    stars: row.stars,
    position: row.position,
    items: parseItems(row.items),
    ready: row.ready,
    isHost: row.is_host,
    isDisconnected: row.disconnected_at != null,
    minigameFirstPlaces: row.minigame_first_places,
  };
}

/**
 * Resolve the board geometry for a room. Uses a custom bb_maps definition when
 * room.map_id is set and valid, otherwise the deterministic default ring built
 * from board_seed. Falls back to the default on any invalid/missing data so a
 * live session never crashes on a malformed map.
 */
async function resolveMap(admin: AdminClient, room: RoomRow): Promise<BoardMap> {
  const mapId = (room as { map_id?: string | null }).map_id ?? null;
  if (mapId) {
    const { data: mapRow } = await admin
      .from("bb_maps")
      .select("definition")
      .eq("id", mapId)
      .maybeSingle();
    const parsed = mapRow ? parseBoardMap(mapRow.definition) : null;
    if (parsed) return parsed;
  }
  return generateDefaultMap(room.board_seed);
}

export async function buildSnapshot(
  admin: AdminClient,
  roomId: string,
  selfUserId: string
): Promise<BoardBrawlSnapshot | null> {
  const { data: room } = await admin.from("bb_rooms").select("*").eq("id", roomId).maybeSingle();
  if (!room) return null;

  const map = await resolveMap(admin, room);

  const { data: playerRows } = await admin.from("bb_players").select("*").eq("room_id", roomId);
  const { data: profiles } = await admin.from("profiles").select("user_id, handle");

  const handleByUser = new Map((profiles ?? []).map((p) => [p.user_id, p.handle]));

  const players = (playerRows ?? []).map((p) => mapPlayer(p, handleByUser.get(p.user_id)));

  const minigameState =
    room.minigame_state && typeof room.minigame_state === "object"
      ? (room.minigame_state as Record<string, unknown>)
      : null;

  const resultScores = minigameState?.resultScores as
    | Array<{ playerId: string; score: number; rank: number }>
    | undefined;

  const minigameScores: Record<string, number> = {};
  if (resultScores) {
    for (const row of resultScores) {
      minigameScores[row.playerId] = row.score;
    }
  } else if (room.minigame_id && minigameState && room.phase === "minigame") {
    for (const row of scoreMinigame(room.minigame_id, minigameState)) {
      minigameScores[row.playerId] = row.score;
    }
  }

  const pendingItemId =
    room.pending_action === "item_target" && room.turn_nonce
      ? (room.turn_nonce as ItemId)
      : null;

  return {
    room: {
      id: room.id,
      code: room.code,
      status: room.status as BoardBrawlSnapshot["room"]["status"],
      phase: room.phase as BoardBrawlSnapshot["room"]["phase"],
      roundCount: room.round_count,
      currentRound: room.current_round,
      phaseEndsAt: room.phase_ends_at,
      boardSeed: room.board_seed,
      minigameId: room.minigame_id,
      turnIndex: room.turn_index,
      activePlayerId: room.active_player_id,
      lastRoll: room.last_roll,
      pendingAction: (room.pending_action as PendingAction) ?? null,
      hostId: room.host_id,
      pendingItemId,
    },
    tiles: map.cells.map((c) => c.type),
    map,
    players,
    minigame: minigameState
      ? {
          state: minigameState,
          scores: minigameScores,
          endsAt: room.phase_ends_at,
          resultRows: resultScores ?? null,
        }
      : null,
    self: { userId: selfUserId },
  };
}

async function persistPlayers(
  admin: AdminClient,
  roomId: string,
  players: BoardBrawlPlayerState[]
): Promise<void> {
  for (const p of players) {
    await admin
      .from("bb_players")
      .update({
        coins: p.coins,
        stars: p.stars,
        position: p.position,
        items: p.items as Json,
      })
      .eq("room_id", roomId)
      .eq("user_id", p.userId);
  }
}

async function loadRoomContext(admin: AdminClient, roomId: string, userId: string) {
  const { data: room } = await admin.from("bb_rooms").select("*").eq("id", roomId).maybeSingle();
  if (!room) return { error: "not_found" as const };
  const { data: member } = await admin
    .from("bb_players")
    .select("user_id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!member) return { error: "not_in_room" as const };
  const { data: players } = await admin.from("bb_players").select("*").eq("room_id", roomId);
  return { room, players: players ?? [] };
}

export async function createRoom(
  admin: AdminClient,
  userId: string,
  roundCount: 3 | 5 | 7 = 5
): Promise<{ ok: true; roomId: string; code: string } | { ok: false; error: string }> {
  const code = generateRoomCode();
  const boardSeed = Math.floor(Math.random() * 1_000_000);

  const { data: room, error } = await admin
    .from("bb_rooms")
    .insert({
      code,
      host_id: userId,
      round_count: roundCount,
      board_seed: boardSeed,
    })
    .select("id, code")
    .single();

  if (error || !room) return { ok: false, error: "could_not_create_room" };

  await admin.from("bb_players").insert({
    room_id: room.id,
    user_id: userId,
    is_host: true,
    ready: false,
    avatar_id: "frog",
  });

  return { ok: true, roomId: room.id, code: room.code };
}

export async function joinRoom(
  admin: AdminClient,
  userId: string,
  code: string
): Promise<{ ok: true; roomId: string } | { ok: false; error: string }> {
  const normalized = code.trim().toUpperCase();
  const { data: room } = await admin
    .from("bb_rooms")
    .select("id, status")
    .eq("code", normalized)
    .maybeSingle();

  if (!room) return { ok: false, error: "bad_code" };
  if (room.status !== "open") return { ok: false, error: "wrong_phase" };

  const { count } = await admin
    .from("bb_players")
    .select("*", { count: "exact", head: true })
    .eq("room_id", room.id);

  if ((count ?? 0) >= BOARD_BRAWL_MAX_PLAYERS) return { ok: false, error: "room_full" };

  const { data: existing } = await admin
    .from("bb_players")
    .select("user_id")
    .eq("room_id", room.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    await admin.from("bb_players").insert({
      room_id: room.id,
      user_id: userId,
      ready: false,
    });
  }

  return { ok: true, roomId: room.id };
}

export async function setReady(
  admin: AdminClient,
  roomId: string,
  userId: string,
  ready: boolean,
  avatarId?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await loadRoomContext(admin, roomId, userId);
  if ("error" in ctx && ctx.error) return { ok: false, error: ctx.error };
  if (ctx.room!.phase !== "waiting") return { ok: false, error: "wrong_phase" };

  await admin
    .from("bb_players")
    .update({
      ready,
      ...(avatarId ? { avatar_id: avatarId } : {}),
      last_seen_at: new Date().toISOString(),
    })
    .eq("room_id", roomId)
    .eq("user_id", userId);

  return { ok: true };
}

export async function startGame(
  admin: AdminClient,
  roomId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await loadRoomContext(admin, roomId, userId);
  if ("error" in ctx && ctx.error) return { ok: false, error: ctx.error };
  const room = ctx.room!;
  if (room.host_id !== userId) return { ok: false, error: "not_host" };
  if (room.phase !== "waiting") return { ok: false, error: "wrong_phase" };

  const readyCount = ctx.players.filter((p) => p.ready).length;
  if (readyCount < BOARD_BRAWL_MIN_PLAYERS) return { ok: false, error: "invalid_action" };

  const turnOrder = shuffleTurnOrder(ctx.players.map((p) => p.user_id));
  const activePlayerId = turnOrder[0]!;

  await admin
    .from("bb_rooms")
    .update({
      status: "in_progress",
      phase: "board_turn",
      current_round: 1,
      turn_order: turnOrder,
      turn_index: 0,
      active_player_id: activePlayerId,
      pending_action: "take_turn",
      last_roll: null,
      turn_nonce: null,
    })
    .eq("id", roomId);

  await admin
    .from("bb_players")
    .update({ position: 0, coins: 0, stars: 0, items: [] })
    .eq("room_id", roomId);

  return { ok: true };
}

export async function takeTurn(
  admin: AdminClient,
  roomId: string,
  userId: string,
  turnNonce?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await processRoomMaintenance(admin, roomId);

  const ctx = await loadRoomContext(admin, roomId, userId);
  if ("error" in ctx && ctx.error) return { ok: false, error: ctx.error };
  const room = ctx.room!;

  if (room.phase !== "board_turn") return { ok: false, error: "wrong_phase" };
  if (room.active_player_id !== userId) return { ok: false, error: "not_active_player" };
  if (room.pending_action !== "take_turn") return { ok: false, error: "wrong_pending_action" };
  if (turnNonce && room.turn_nonce === turnNonce) return { ok: false, error: "duplicate_turn" };

  return runTakeTurnForPlayer(admin, room, ctx.players, userId, turnNonce);
}

async function runTakeTurnForPlayer(
  admin: AdminClient,
  room: RoomRow,
  playerRows: PlayerRow[],
  userId: string,
  turnNonce?: string,
  options?: { forcedRoll?: number; skipItems?: boolean }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const profiles = await admin.from("profiles").select("user_id, handle");
  const handleByUser = new Map((profiles.data ?? []).map((p) => [p.user_id, p.handle]));
  let players = playerRows.map((p) => mapPlayer(p, handleByUser.get(p.user_id)));

  const active = players.find((p) => p.userId === userId)!;
  const pendingBoost = room.turn_nonce;
  const hasGoldenDice =
    !options?.skipItems &&
    (active.items.includes("golden_dice") || pendingBoost === "golden_dice");
  const hasCoinMagnet =
    !options?.skipItems &&
    (active.items.includes("coin_magnet") || pendingBoost === "coin_magnet");

  const outcome = executeTakeTurn(players, userId, room.board_seed, {
    forcedRoll: options?.forcedRoll,
    hasGoldenDice,
    hasCoinMagnet,
    lastRoundFrenzy: room.current_round === room.round_count,
  });

  players = outcome.players;
  if (hasGoldenDice) {
    const p = players.find((x) => x.userId === userId)!;
    p.items = consumeItem(p.items, "golden_dice");
  }
  if (hasCoinMagnet) {
    const p = players.find((x) => x.userId === userId)!;
    p.items = consumeItem(p.items, "coin_magnet");
  }

  await persistPlayers(admin, room.id, players);

  if (outcome.result.shopPrompt) {
    await admin
      .from("bb_rooms")
      .update({
        last_roll: outcome.result.roll,
        pending_action: "shop",
        turn_nonce: turnNonce ?? null,
      })
      .eq("id", room.id);
    return { ok: true };
  }

  await admin
    .from("bb_rooms")
    .update({ turn_nonce: turnNonce ?? null })
    .eq("id", room.id);

  return advanceAfterTurn(admin, room, players, outcome.result.roll, turnNonce);
}

async function advanceAfterTurn(
  admin: AdminClient,
  room: RoomRow,
  players: BoardBrawlPlayerState[],
  lastRoll: number,
  turnNonce?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const turnOrder = room.turn_order ?? [];
  const nextIndex = nextTurnIndex(room.turn_index, turnOrder.length);

  if (nextIndex === 0) {
    const minigameId = pickMinigameId(players.length, room.board_seed + room.current_round);
    const playerStars = Object.fromEntries(players.map((p) => [p.userId, p.stars]));
    const state = initMinigame(minigameId, {
      playerIds: players.map((p) => p.userId),
      leaderId: [...players].sort((a, b) => b.stars - a.stars)[0]?.userId ?? null,
      roomSeed: room.board_seed,
      round: room.current_round,
      playerStars,
    });

    await admin
      .from("bb_rooms")
      .update({
        phase: "minigame",
        last_roll: lastRoll,
        pending_action: null,
        turn_nonce: turnNonce ?? null,
        minigame_id: minigameId,
        minigame_state: state as Json,
        minigame_pending_inputs: [] as Json,
        last_tick_at: null,
        phase_ends_at: new Date(Date.now() + 60_000).toISOString(),
      })
      .eq("id", room.id);

    return { ok: true };
  }

  const nextPlayerId = turnOrder[nextIndex]!;
  await admin
    .from("bb_rooms")
    .update({
      turn_index: nextIndex,
      active_player_id: nextPlayerId,
      last_roll: lastRoll,
      pending_action: "take_turn",
      turn_nonce: turnNonce ?? null,
    })
    .eq("id", room.id);

  return { ok: true };
}

export async function buyStar(
  admin: AdminClient,
  roomId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await loadRoomContext(admin, roomId, userId);
  if ("error" in ctx && ctx.error) return { ok: false, error: ctx.error };
  const room = ctx.room!;
  if (room.pending_action !== "shop" || room.active_player_id !== userId) {
    return { ok: false, error: "wrong_pending_action" };
  }

  const player = ctx.players.find((p) => p.user_id === userId)!;
  const items = parseItems(player.items);
  const hasDoubleShop = items.includes("double_shop");
  if (!canBuyStar(player.coins, player.stars, hasDoubleShop)) {
    return { ok: false, error: "invalid_action" };
  }

  const cost = starPurchaseCost(player.stars, hasDoubleShop);
  const newItems = hasDoubleShop ? items.filter((i) => i !== "double_shop") : items;
  await admin
    .from("bb_players")
    .update({
      coins: player.coins - cost,
      stars: player.stars + 1,
      items: newItems as Json,
    })
    .eq("room_id", roomId)
    .eq("user_id", userId);

  const profiles = await admin.from("profiles").select("user_id, handle");
  const handleByUser = new Map((profiles.data ?? []).map((p) => [p.user_id, p.handle]));
  const players = ctx.players.map((p) =>
    mapPlayer(
      p.user_id === userId
        ? { ...p, coins: p.coins - cost, stars: p.stars + 1, items: newItems }
        : p,
      handleByUser.get(p.user_id)
    )
  );

  return advanceAfterTurn(admin, room, players, room.last_roll ?? 1);
}

export async function skipShop(
  admin: AdminClient,
  roomId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await loadRoomContext(admin, roomId, userId);
  if ("error" in ctx && ctx.error) return { ok: false, error: ctx.error };
  const room = ctx.room!;
  if (room.pending_action !== "shop" || room.active_player_id !== userId) {
    return { ok: false, error: "wrong_pending_action" };
  }

  const profiles = await admin.from("profiles").select("user_id, handle");
  const handleByUser = new Map((profiles.data ?? []).map((p) => [p.user_id, p.handle]));
  const players = ctx.players.map((p) => mapPlayer(p, handleByUser.get(p.user_id)));

  return advanceAfterTurn(admin, room, players, room.last_roll ?? 1);
}

export async function submitMinigameInput(
  admin: AdminClient,
  roomId: string,
  userId: string,
  input: Omit<MinigameInput, "playerId" | "at">
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await loadRoomContext(admin, roomId, userId);
  if ("error" in ctx && ctx.error) return { ok: false, error: ctx.error };
  if (ctx.room!.phase !== "minigame") return { ok: false, error: "wrong_phase" };

  const pending = Array.isArray(ctx.room!.minigame_pending_inputs)
    ? (ctx.room!.minigame_pending_inputs as MinigameInput[])
    : [];

  pending.push({
    ...input,
    playerId: userId,
    at: Date.now(),
  } as MinigameInput);

  await admin.from("bb_rooms").update({ minigame_pending_inputs: pending as Json }).eq("id", roomId);
  return { ok: true };
}

export async function tickMinigameHost(
  admin: AdminClient,
  roomId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await processRoomMaintenance(admin, roomId);

  const ctx = await loadRoomContext(admin, roomId, userId);
  if ("error" in ctx && ctx.error) return { ok: false, error: ctx.error };
  const room = ctx.room!;
  const hostPlayer = ctx.players.find((p) => p.is_host);
  if (!hostPlayer || hostPlayer.user_id !== userId) return { ok: false, error: "not_host" };
  if (room.phase !== "minigame" || !room.minigame_id) return { ok: false, error: "wrong_phase" };

  const state = (room.minigame_state as Record<string, unknown>) ?? {};
  const pending = Array.isArray(room.minigame_pending_inputs)
    ? (room.minigame_pending_inputs as MinigameInput[])
    : [];

  const lastTickMs = room.last_tick_at ? new Date(room.last_tick_at).getTime() : null;
  const tickResult = tickMinigame(room.minigame_id, state, pending, lastTickMs);
  if (!tickResult.ok) return { ok: false, error: tickResult.reason };

  const now = new Date().toISOString();
  const { consumed, remaining } = drainInputs(pending, Date.now());

  if (tickResult.result.finished) {
    const resultState = {
      ...tickResult.result.state,
      resultScores: tickResult.result.scores,
    };

    await admin
      .from("bb_rooms")
      .update({
        phase: "minigame_results",
        pending_action: null,
        minigame_state: resultState as Json,
        minigame_pending_inputs: remaining as Json,
        last_tick_at: now,
        phase_ends_at: new Date(Date.now() + BB_MINIGAME_RESULTS_MS).toISOString(),
      })
      .eq("id", roomId);
  } else {
    await admin
      .from("bb_rooms")
      .update({
        minigame_state: tickResult.result.state as Json,
        minigame_pending_inputs: remaining as Json,
        last_tick_at: now,
      })
      .eq("id", roomId);
  }

  void consumed;
  return { ok: true };
}

export async function heartbeat(
  admin: AdminClient,
  roomId: string,
  userId: string
): Promise<void> {
  await admin
    .from("bb_players")
    .update({ last_seen_at: new Date().toISOString(), disconnected_at: null })
    .eq("room_id", roomId)
    .eq("user_id", userId);

  await processRoomMaintenance(admin, roomId);
}

export async function processRoomMaintenance(
  admin: AdminClient,
  roomId: string
): Promise<void> {
  const { data: room } = await admin.from("bb_rooms").select("*").eq("id", roomId).maybeSingle();
  if (!room || room.status === "finished" || room.status === "abandoned") return;

  await markDisconnectedPlayers(admin, roomId);
  await migrateHostIfStale(admin, roomId);

  if (room.phase === "minigame_results") {
    await advanceMinigameResults(admin, room);
    return;
  }

  if (room.phase !== "board_turn" && room.phase !== "minigame") return;

  const activeId = room.active_player_id;
  if (!activeId) return;

  const disconnected = await isPlayerDisconnected(admin, roomId, activeId);
  if (!disconnected) return;

  if (room.pending_action === "shop") {
    const { data: players } = await admin.from("bb_players").select("*").eq("room_id", roomId);
    const profiles = await admin.from("profiles").select("user_id, handle");
    const handleByUser = new Map((profiles.data ?? []).map((p) => [p.user_id, p.handle]));
    const mapped = (players ?? []).map((p) => mapPlayer(p, handleByUser.get(p.user_id)));
    await advanceAfterTurn(admin, room, mapped, room.last_roll ?? 1);
    return;
  }

  if (room.pending_action === "item_target") {
    await admin
      .from("bb_rooms")
      .update({ pending_action: "take_turn", turn_nonce: null })
      .eq("id", roomId);
    return;
  }

  if (room.pending_action === "take_turn") {
    const { data: players } = await admin.from("bb_players").select("*").eq("room_id", roomId);
    if (!players) return;
    await runTakeTurnForPlayer(admin, room, players, activeId, undefined, {
      forcedRoll: 1,
      skipItems: true,
    });
  }
}

async function advanceMinigameResults(admin: AdminClient, room: RoomRow): Promise<void> {
  if (room.phase !== "minigame_results") return;
  if (room.phase_ends_at && new Date(room.phase_ends_at).getTime() > Date.now()) return;

  const state = (room.minigame_state as Record<string, unknown>) ?? {};
  const scores = (state.resultScores as Array<{ playerId: string; rank: number }>) ?? [];

  const { data: playerRows } = await admin.from("bb_players").select("*").eq("room_id", room.id);
  const sorted = sortTurnOrderUnderdog((playerRows ?? []).map((p) => mapPlayer(p)));

  const nextRound = room.current_round + 1;
  const finished = nextRound > room.round_count;

  const roomUpdate = finished
    ? {
        phase: "finished" as const,
        status: "finished" as const,
        pending_action: null,
        phase_ends_at: null,
      }
    : {
        phase: "board_turn" as const,
        current_round: nextRound,
        turn_order: sorted,
        turn_index: 0,
        active_player_id: sorted[0] ?? null,
        pending_action: "take_turn" as const,
        minigame_id: null,
        minigame_state: null,
        minigame_pending_inputs: [] as Json,
        phase_ends_at: null,
      };

  const { data: claimed } = await admin
    .from("bb_rooms")
    .update(roomUpdate)
    .eq("id", room.id)
    .eq("phase", "minigame_results")
    .select("id")
    .maybeSingle();

  if (!claimed) return;

  for (const row of scores) {
    const coins = rewardCoinsForPlacement(row.rank);
    const { data: player } = await admin
      .from("bb_players")
      .select("coins, minigame_first_places")
      .eq("room_id", room.id)
      .eq("user_id", row.playerId)
      .maybeSingle();
    if (!player) continue;
    await admin
      .from("bb_players")
      .update({
        coins: player.coins + coins,
        minigame_first_places:
          row.rank === 1 ? player.minigame_first_places + 1 : player.minigame_first_places,
      })
      .eq("room_id", room.id)
      .eq("user_id", row.playerId);
  }
}

export async function useItem(
  admin: AdminClient,
  roomId: string,
  userId: string,
  itemId: ItemId,
  targetUserId?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await processRoomMaintenance(admin, roomId);

  const ctx = await loadRoomContext(admin, roomId, userId);
  if ("error" in ctx && ctx.error) return { ok: false, error: ctx.error };
  const room = ctx.room!;

  if (room.phase !== "board_turn") return { ok: false, error: "wrong_phase" };

  const player = ctx.players.find((p) => p.user_id === userId)!;
  const items = parseItems(player.items);
  if (!items.includes(itemId)) return { ok: false, error: "invalid_action" };

  if (room.pending_action === "item_target") {
    const pendingItem = room.turn_nonce as ItemId | null;
    if (!pendingItem || !targetUserId) return { ok: false, error: "invalid_action" };
    if (userId !== room.active_player_id) return { ok: false, error: "not_active_player" };

    const newItems = consumeItem(items, pendingItem);
    await admin
      .from("bb_players")
      .update({ items: newItems as Json })
      .eq("room_id", roomId)
      .eq("user_id", userId);

    const target = ctx.players.find((p) => p.user_id === targetUserId);
    if (!target) return { ok: false, error: "invalid_action" };

    let targetItems = parseItems(target.items);
    let targetCoins = target.coins;
    let targetStars = target.stars;

    if (pendingItem === "tripwire") {
      if (!targetItems.includes("tripwire_debuff")) {
        targetItems = [...targetItems, "tripwire_debuff"];
      }
    } else if (pendingItem === "coin_snatch") {
      const stolen = Math.min(5, targetCoins);
      targetCoins -= stolen;
      await admin
        .from("bb_players")
        .update({ coins: player.coins + stolen })
        .eq("room_id", roomId)
        .eq("user_id", userId);
    } else if (pendingItem === "star_tax" && targetStars > 0) {
      targetStars -= 1;
      await admin
        .from("bb_players")
        .update({ stars: player.stars + 1 })
        .eq("room_id", roomId)
        .eq("user_id", userId);
    }

    await admin
      .from("bb_players")
      .update({ coins: targetCoins, stars: targetStars, items: targetItems as Json })
      .eq("room_id", roomId)
      .eq("user_id", targetUserId);

    await admin
      .from("bb_rooms")
      .update({ pending_action: "take_turn", turn_nonce: null })
      .eq("id", roomId);

    return { ok: true };
  }

  if (room.active_player_id !== userId) return { ok: false, error: "not_active_player" };
  if (room.pending_action !== "take_turn") return { ok: false, error: "wrong_pending_action" };

  if (isBoostItem(itemId)) {
    if (itemId === "double_shop") {
      return { ok: true };
    }
    const newItems = consumeItem(items, itemId);
    await admin
      .from("bb_players")
      .update({ items: newItems as Json })
      .eq("room_id", roomId)
      .eq("user_id", userId);
    await admin.from("bb_rooms").update({ turn_nonce: itemId }).eq("id", roomId);
    return { ok: true };
  }

  if (isSabotageItem(itemId)) {
    if (!targetUserId || targetUserId === userId) {
      await admin
        .from("bb_rooms")
        .update({ pending_action: "item_target", turn_nonce: itemId })
        .eq("id", roomId);
      return { ok: true };
    }

    const newItems = consumeItem(items, itemId);
    await admin
      .from("bb_players")
      .update({ items: newItems as Json })
      .eq("room_id", roomId)
      .eq("user_id", userId);

    const target = ctx.players.find((p) => p.user_id === targetUserId)!;
    let targetItems = parseItems(target.items);
    let targetCoins = target.coins;
    let targetStars = target.stars;

    if (itemId === "tripwire") {
      targetItems = [...targetItems, "tripwire_debuff"];
    } else if (itemId === "coin_snatch") {
      const stolen = Math.min(5, targetCoins);
      targetCoins -= stolen;
      await admin
        .from("bb_players")
        .update({ coins: player.coins + stolen })
        .eq("room_id", roomId)
        .eq("user_id", userId);
    } else if (itemId === "star_tax" && targetStars > 0) {
      targetStars -= 1;
      await admin
        .from("bb_players")
        .update({ stars: player.stars + 1 })
        .eq("room_id", roomId)
        .eq("user_id", userId);
    }

    await admin
      .from("bb_players")
      .update({ coins: targetCoins, stars: targetStars, items: targetItems as Json })
      .eq("room_id", roomId)
      .eq("user_id", targetUserId);

    return { ok: true };
  }

  return { ok: false, error: "invalid_action" };
}

export async function leaveRoom(
  admin: AdminClient,
  roomId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await loadRoomContext(admin, roomId, userId);
  if ("error" in ctx && ctx.error) return { ok: false, error: ctx.error };

  await admin.from("bb_players").delete().eq("room_id", roomId).eq("user_id", userId);

  const { count } = await admin
    .from("bb_players")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId);

  if ((count ?? 0) === 0) {
    await admin.from("bb_rooms").update({ status: "abandoned" }).eq("id", roomId);
  } else if (ctx.room!.host_id === userId) {
    await migrateHostIfStale(admin, roomId);
    const { data: room } = await admin.from("bb_rooms").select("host_id").eq("id", roomId).single();
    if (room?.host_id === userId) {
      const { data: nextHost } = await admin
        .from("bb_players")
        .select("user_id")
        .eq("room_id", roomId)
        .order("joined_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (nextHost) {
        await admin.from("bb_players").update({ is_host: false }).eq("room_id", roomId);
        await admin
          .from("bb_players")
          .update({ is_host: true })
          .eq("room_id", roomId)
          .eq("user_id", nextHost.user_id);
        await admin.from("bb_rooms").update({ host_id: nextHost.user_id }).eq("id", roomId);
      }
    }
  }

  return { ok: true };
}

export async function rematch(
  admin: AdminClient,
  roomId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await loadRoomContext(admin, roomId, userId);
  if ("error" in ctx && ctx.error) return { ok: false, error: ctx.error };
  const room = ctx.room!;
  if (room.host_id !== userId) return { ok: false, error: "not_host" };
  if (room.phase !== "finished") return { ok: false, error: "wrong_phase" };

  await admin
    .from("bb_rooms")
    .update({
      status: "open",
      phase: "waiting",
      current_round: 0,
      turn_order: [],
      turn_index: 0,
      active_player_id: null,
      last_roll: null,
      pending_action: null,
      minigame_id: null,
      minigame_state: null,
      minigame_pending_inputs: [] as Json,
      last_tick_at: null,
      phase_ends_at: null,
      turn_nonce: null,
    })
    .eq("id", roomId);

  await admin
    .from("bb_players")
    .update({
      coins: 0,
      stars: 0,
      position: 0,
      items: [] as Json,
      ready: false,
      minigame_first_places: 0,
      disconnected_at: null,
    })
    .eq("room_id", roomId);

  return { ok: true };
}

export { resolveWinners };
