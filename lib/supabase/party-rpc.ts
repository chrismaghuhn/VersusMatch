import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { CaptionDocument, CaptionDocumentV3 } from "@/lib/party/caption-rich/types";
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
  rerollsPerPlayer: number = 2,
  canvasEditorEnabled: boolean = true,
  roundModifiersEnabled: boolean = false,
  authorGuessEnabled: boolean = true
) {
  return callRpc(supabase, "party_create_room", {
    p_round_count: roundCount,
    p_rerolls_per_player: rerollsPerPlayer,
    p_canvas_editor_enabled: canvasEditorEnabled,
    p_round_modifiers_enabled: roundModifiersEnabled,
    p_author_guess_enabled: authorGuessEnabled,
  });
}

export function partySyncCaptionDraftRpc(
  supabase: RpcSupabase,
  roomId: string,
  draft: CaptionDocumentV3,
  layoutRevision: number
) {
  return callRpc(supabase, "party_sync_caption_draft", {
    p_room_id: roomId,
    p_draft: draft,
    p_layout_revision: layoutRevision,
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

export function partySubmitAuthorGuessRpc(
  supabase: RpcSupabase,
  roomId: string,
  guessedUserId: string
) {
  return callRpc(supabase, "party_submit_author_guess", {
    p_room_id: roomId,
    p_guessed_user_id: guessedUserId,
  });
}

export function partyHeartbeatRpc(supabase: RpcSupabase, roomId: string) {
  return callRpc(supabase, "party_heartbeat", { p_room_id: roomId });
}

export function partyCastLobbyPollVoteRpc(
  supabase: RpcSupabase,
  roomId: string,
  optionIndex: number
) {
  return callRpc(supabase, "party_cast_lobby_poll_vote", {
    p_room_id: roomId,
    p_option_index: optionIndex,
  });
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

export function partyRematchRpc(supabase: RpcSupabase, roomId: string) {
  return callRpc(supabase, "party_rematch", { p_room_id: roomId });
}

export function partyPeekRoomRpc(supabase: RpcSupabase, code: string) {
  return callRpc(supabase, "party_peek_room", { p_code: code });
}

export function partyGetRecapRpc(supabase: RpcSupabase, code: string) {
  return callRpc(supabase, "party_get_recap", { p_code: code });
}

export function partyUpdateLobbySettingsRpc(
  supabase: RpcSupabase,
  roomId: string,
  settings: Record<string, unknown>
) {
  return callRpc(supabase, "party_update_lobby_settings", {
    p_room_id: roomId,
    p_settings: settings,
  });
}

export function partyKickPlayerRpc(
  supabase: RpcSupabase,
  roomId: string,
  targetUserId: string,
  blockRejoin = false
) {
  return callRpc(supabase, "party_kick_player", {
    p_room_id: roomId,
    p_target_user_id: targetUserId,
    p_block_rejoin: blockRejoin,
  });
}

export function partyUpdateLobbySettingsRpc(
  supabase: RpcSupabase,
  roomId: string,
  settings: Record<string, unknown>
) {
  return callRpc(supabase, "party_update_lobby_settings", {
    p_room_id: roomId,
    p_settings: settings,
  });
}

export function partyKickPlayerRpc(
  supabase: RpcSupabase,
  roomId: string,
  targetUserId: string,
  blockRejoin = false
) {
  return callRpc(supabase, "party_kick_player", {
    p_room_id: roomId,
    p_target_user_id: targetUserId,
    p_block_rejoin: blockRejoin,
  });
}
