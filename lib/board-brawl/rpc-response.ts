export type BbRpcResponse = {
  ok: boolean;
  error?: string;
  room_id?: string;
  code?: string;
};

export function parseBbRpc(data: unknown): BbRpcResponse {
  if (data && typeof data === "object" && "ok" in data) {
    return data as BbRpcResponse;
  }
  return { ok: false, error: "invalid_response" };
}

export function bbRpcStatus(error: string | undefined): number {
  switch (error) {
    case "unauthorized":
      return 401;
    case "not_in_room":
    case "not_host":
    case "not_active_player":
    case "wrong_pending_action":
      return 403;
    case "not_found":
    case "bad_code":
      return 404;
    case "room_full":
    case "duplicate_turn":
    case "too_soon":
      return 409;
    case "wrong_phase":
    case "invalid_action":
    case "invalid_request":
      return 400;
    default:
      return 500;
  }
}
