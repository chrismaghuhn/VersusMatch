export type PartyRpcResponse = {
  ok: boolean;
  error?: string;
  room_id?: string;
  code?: string;
  submission_id?: string;
  reaction_id?: string;
  phase?: string;
};

export function parsePartyRpc(data: unknown): PartyRpcResponse {
  if (data && typeof data === "object" && "ok" in data) {
    return data as PartyRpcResponse;
  }
  return { ok: false, error: "invalid_response" };
}

/** Map PostgREST/Postgres transport failures to stable client error codes. */
export function partyRpcTransportError(
  context: "create" | "join" | "start" | "leave",
  message: string
): string {
  const msg = message.toLowerCase();
  if (!msg.includes("could not choose") && !msg.includes("function public.party_")) {
    return message;
  }
  switch (context) {
    case "create":
      return "could_not_create_room";
    case "join":
      return "could_not_join_room";
    case "start":
      return "could_not_start_game";
    case "leave":
      return "could_not_leave_room";
    default:
      return message;
  }
}

export function partyRpcStatus(error: string | undefined): number {
  switch (error) {
    case "unauthorized":
      return 401;
    case "not_in_room":
    case "not_host":
    case "kicked":
      return 403;
    case "not_found":
    case "bad_code":
      return 404;
    case "wrong_phase":
    case "already_submitted":
    case "already_voted":
    case "rate_limited":
    case "not_enough_players":
    case "room_full":
    case "invalid_caption":
    case "profanity_rejected":
    case "invalid_reaction":
    case "invalid_submission":
    case "not_ready":
    case "not_submitted":
    case "not_voted":
    case "no_rerolls_left":
    case "invalid_rerolls":
    case "no_template":
    case "stale_revision":
    case "invalid_draft":
    case "modifier_violation":
    case "not_finished":
    case "room_closed":
    case "not_eligible":
    case "already_guessed":
    case "invalid_guess":
    case "invalid_settings":
    case "too_many_players":
    case "cannot_kick_self":
    case "cannot_kick_last":
    case "player_not_found":
    case "banned_from_room":
      return 409;
    default:
      return 400;
  }
}
