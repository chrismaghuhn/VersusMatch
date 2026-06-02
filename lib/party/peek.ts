export type PartyPeekResult =
  | {
      ok: true;
      code: string;
      hostHandle: string;
      playerCount: number;
      maxPlayers: number;
      inGame: boolean;
      isFinished: boolean;
      phase: "waiting" | "in_progress";
    }
  | { ok: false; error: string };

export function parsePartyPeek(data: unknown): PartyPeekResult {
  if (!data || typeof data !== "object" || !("ok" in data)) {
    return { ok: false, error: "invalid_response" };
  }
  const row = data as Record<string, unknown>;
  if (row.ok !== true) {
    return { ok: false, error: String(row.error ?? "unknown") };
  }
  return {
    ok: true,
    code: String(row.code),
    hostHandle: String(row.host_handle),
    playerCount: Number(row.player_count),
    maxPlayers: Number(row.max_players ?? 8),
    inGame: Boolean(row.in_game),
    isFinished: Boolean(row.is_finished),
    phase: row.phase === "waiting" ? "waiting" : "in_progress",
  };
}
