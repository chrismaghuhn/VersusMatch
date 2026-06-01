import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { seededShuffle } from "@/lib/party/shuffle";
import { partyGetMyVoteRpc } from "@/lib/supabase/party-rpc";
import { getPartyTemplateUrl } from "@/lib/party/template-url";
import type { PartySnapshot, PartyPhase, TextBox, PartyReactionKey } from "@/lib/party/types";

type PartyRoomRow = {
  id: string;
  code: string;
  status: string;
  phase: string;
  current_round: number;
  round_count: number;
  phase_ends_at: string | null;
  template_id: string | null;
  phase_seed: number | null;
  caption_count: number;
  votes_cast_count: number;
};

type PartyPlayerRow = {
  user_id: string;
  score: number;
  is_host: boolean;
};

type PartySubmissionRow = {
  id: string;
  user_id: string;
  caption: string;
};

type PartyRoundResultRow = {
  submission_id: string;
  vote_count: number;
};

type PartyReactionRow = {
  id: string;
  user_id: string;
  reaction_key: string;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  handle: string;
  avatar_url: string | null;
};

type TemplateRow = {
  id: string;
  image_path: string;
  text_boxes: unknown;
};

function asTextBoxes(raw: unknown): TextBox[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (box): box is TextBox =>
      box &&
      typeof box === "object" &&
      typeof (box as TextBox).id === "string" &&
      typeof (box as TextBox).x === "number"
  );
}

export async function buildPartySnapshot(
  supabase: SupabaseClient<Database>,
  roomId: string,
  userId: string
): Promise<PartySnapshot | null> {
  const { data: room, error: roomError } = await (supabase as SupabaseClient)
    .from("party_rooms")
    .select(
      "id, code, status, phase, current_round, round_count, phase_ends_at, template_id, phase_seed, caption_count, votes_cast_count"
    )
    .eq("id", roomId)
    .maybeSingle();

  if (roomError || !room) {
    return null;
  }

  const roomRow = room as PartyRoomRow;
  const phase = roomRow.phase as PartyPhase;

  const { data: playersRaw } = await (supabase as SupabaseClient)
    .from("party_players")
    .select("user_id, score, is_host")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  const playersRows = (playersRaw ?? []) as PartyPlayerRow[];
  const playerIds = playersRows.map((p) => p.user_id);

  const profilesByUser = new Map<string, ProfileRow>();
  if (playerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, handle, avatar_url")
      .in("user_id", playerIds);

    for (const profile of profiles ?? []) {
      profilesByUser.set(profile.user_id, profile as ProfileRow);
    }
  }

  let template: PartySnapshot["room"]["template"] = null;
  if (roomRow.template_id) {
    const { data: templateRow } = await (supabase as SupabaseClient)
      .from("party_templates")
      .select("id, image_path, text_boxes")
      .eq("id", roomRow.template_id)
      .maybeSingle();

    if (templateRow) {
      const t = templateRow as TemplateRow;
      template = {
        id: t.id,
        imageUrl: getPartyTemplateUrl(t.image_path) ?? "",
        textBoxes: asTextBoxes(t.text_boxes),
      };
    }
  }

  let submissions: PartySnapshot["submissions"] = [];
  let mySubmission: PartySnapshot["mySubmission"] = null;

  if (phase !== "waiting" && roomRow.current_round > 0) {
    const { data: submissionRows } = await (supabase as SupabaseClient)
      .from("party_submissions")
      .select("id, user_id, caption")
      .eq("room_id", roomId)
      .eq("round", roomRow.current_round);

    const allSubmissions = (submissionRows ?? []) as PartySubmissionRow[];
    const mine = allSubmissions.find((s) => s.user_id === userId);

    if (mine) {
      mySubmission = { id: mine.id, caption: mine.caption };
    }

    if (phase === "caption") {
      submissions = mine ? [{ id: mine.id, userId: mine.user_id, caption: mine.caption }] : [];
    } else {
      const voteCounts = new Map<string, number>();
      if (phase === "reveal" || phase === "finished") {
        const { data: results } = await (supabase as SupabaseClient)
          .from("party_round_results")
          .select("submission_id, vote_count")
          .eq("room_id", roomId)
          .eq("round", roomRow.current_round);

        for (const row of (results ?? []) as PartyRoundResultRow[]) {
          voteCounts.set(row.submission_id, row.vote_count);
        }
      }

      const mapped = allSubmissions.map((s) => ({
        id: s.id,
        userId: s.user_id,
        caption: s.caption,
        ...(phase === "reveal" || phase === "finished"
          ? { voteCount: voteCounts.get(s.id) ?? 0 }
          : {}),
      }));

      submissions =
        phase === "voting" || phase === "reveal" || phase === "finished"
          ? seededShuffle(mapped, roomRow.phase_seed ?? 0, (s) => s.id)
          : mapped;
    }
  }

  let myVote: PartySnapshot["myVote"] = null;
  if (phase === "voting" || phase === "reveal" || phase === "finished") {
    const { data: voteData } = await partyGetMyVoteRpc(supabase, roomId);
    const voteResult = voteData as { ok?: boolean; submission_id?: string | null } | null;
    if (voteResult?.ok && voteResult.submission_id) {
      myVote = { submissionId: voteResult.submission_id };
    }
  }

  let recentReactions: PartySnapshot["recentReactions"] = [];
  if (phase === "waiting") {
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    const { data: reactionRows } = await (supabase as SupabaseClient)
      .from("party_reactions")
      .select("id, user_id, reaction_key, created_at")
      .eq("room_id", roomId)
      .gt("created_at", fiveSecondsAgo)
      .order("created_at", { ascending: false })
      .limit(20);

    const reactionUserIds = [...new Set(((reactionRows ?? []) as PartyReactionRow[]).map((r) => r.user_id))];
    const reactionProfiles = new Map<string, string>();

    if (reactionUserIds.length > 0) {
      const { data: reactionProfileRows } = await supabase
        .from("profiles")
        .select("user_id, handle")
        .in("user_id", reactionUserIds);

      for (const p of reactionProfileRows ?? []) {
        reactionProfiles.set(p.user_id, p.handle);
      }
    }

    recentReactions = ((reactionRows ?? []) as PartyReactionRow[]).map((r) => ({
      id: r.id,
      userId: r.user_id,
      handle: reactionProfiles.get(r.user_id) ?? "?",
      reactionKey: r.reaction_key as PartyReactionKey,
      createdAt: r.created_at,
    }));
  }

  return {
    room: {
      id: roomRow.id,
      code: roomRow.code,
      status: roomRow.status as PartySnapshot["room"]["status"],
      phase,
      currentRound: roomRow.current_round,
      roundCount: roomRow.round_count,
      phaseEndsAt: roomRow.phase_ends_at,
      template,
    },
    players: playersRows.map((p) => {
      const profile = profilesByUser.get(p.user_id);
      return {
        userId: p.user_id,
        handle: profile?.handle ?? "?",
        avatarUrl: profile?.avatar_url ?? null,
        score: p.score,
        isHost: p.is_host,
        isYou: p.user_id === userId,
      };
    }),
    submissions,
    captionCount: roomRow.caption_count,
    votesCastCount: roomRow.votes_cast_count,
    mySubmission,
    myVote,
    recentReactions,
  };
}
