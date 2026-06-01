import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { CaptionDocument } from "@/lib/party/caption-rich/types";
import type { PartyReactionKey } from "@/lib/party/types";

type RpcSupabase = Pick<SupabaseClient<Database>, "rpc">;

function callRpc(
  supabase: RpcSupabase,
  fn: keyof Database["public"]["Functions"],
  args: Record<string, unknown>
) {
  return (supabase.rpc as SupabaseClient<Database>["rpc"])(fn, args as never);
}

export function partyCreateRoomRpc(
  supabase: RpcSupabase,
  roundCount: number = 5,
  rerollsPerPlayer: number = 0
) {
  return callRpc(supabase, "party_create_room", {
    p_round_count: roundCount,
    p_rerolls_per_player: rerollsPerPlayer,
  });
}

export function partyJoinRoomRpc(supabase: RpcSupabase, code: string) {
  return callRpc(supabase, "party_join_room", { p_code: code });
}

export function partyStartGameRpc(supabase: RpcSupabase, roomId: string) {
  return callRpc(supabase, "party_start_game", { p_room_id: roomId });
}

export function partySubmitCaptionRpc(
  supabase: RpcSupabase,
  roomId: string,
  caption: string,
  captionRich?: CaptionDocument | null
) {
  return callRpc(supabase, "party_submit_caption", {
    p_room_id: roomId,
    p_caption: caption,
    ...(captionRich != null ? { p_caption_rich: captionRich } : {}),
  });
}

export function partyCastVoteRpc(
  supabase: RpcSupabase,
  roomId: string,
  submissionId: string
) {
  return callRpc(supabase, "party_cast_vote", {
    p_room_id: roomId,
    p_submission_id: submissionId,
  });
}

export function partyHeartbeatRpc(supabase: RpcSupabase, roomId: string) {
  return callRpc(supabase, "party_heartbeat", { p_room_id: roomId });
}

export function partySendReactionRpc(
  supabase: RpcSupabase,
  roomId: string,
  reactionKey: PartyReactionKey
) {
  return callRpc(supabase, "party_send_reaction", {
    p_room_id: roomId,
    p_reaction_key: reactionKey,
  });
}

export function partyAdvancePhaseRpc(supabase: RpcSupabase, roomId: string) {
  return callRpc(supabase, "party_advance_phase", { p_room_id: roomId });
}

export function partyGetMyVoteRpc(supabase: RpcSupabase, roomId: string) {
  return callRpc(supabase, "party_get_my_vote", { p_room_id: roomId });
}

export function partyLeaveRoomRpc(supabase: RpcSupabase, roomId: string) {
  return callRpc(supabase, "party_leave_room", { p_room_id: roomId });
}

export function partyRetractCaptionRpc(supabase: RpcSupabase, roomId: string) {
  return callRpc(supabase, "party_retract_caption", { p_room_id: roomId });
}

export function partyRetractVoteRpc(supabase: RpcSupabase, roomId: string) {
  return callRpc(supabase, "party_retract_vote", { p_room_id: roomId });
}

export function partyRerollTemplateRpc(supabase: RpcSupabase, roomId: string) {
  return callRpc(supabase, "party_reroll_template", { p_room_id: roomId });
}
