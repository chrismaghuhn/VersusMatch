import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { limitTextBoxes } from "@/lib/party/limit-text-boxes";
import { seededShuffle } from "@/lib/party/shuffle";
import { partyGetMyVoteRpc } from "@/lib/supabase/party-rpc";
import { getPartyTemplateUrl } from "@/lib/party/template-url";
import type { PartyRoundModifier } from "@/lib/party/round-modifiers";
import type {
  PartySnapshot,
  PartyPhase,
  TextBox,
  PartyTemplateView,
  PartyReactionKey,
  CaptionDocument,
  CaptionDocumentV3,
} from "@/lib/party/types";

type PartyRoomRow = {
  id: string;
  code: string;
  status: string;
  phase: string;
  current_round: number;
  round_count: number;
  rerolls_per_player: number;
  canvas_editor_enabled: boolean;
  round_modifiers_enabled: boolean;
  current_modifier: PartyRoundModifier | null;
  caption_duration_seconds: number;
  phase_ends_at: string | null;
  template_id: string | null;
  phase_seed: number | null;
  caption_count: number;
  votes_cast_count: number;
  author_guess_enabled: boolean;
  author_guesses_count: number;
  round_winner_submission_id: string | null;
};

type PartyPlayerRow = {
  user_id: string;
  score: number;
  is_host: boolean;
  rerolls_used: number;
};

type PartySubmissionRow = {
  id: string;
  user_id: string;
  caption: string;
  caption_rich: unknown;
  template_id: string | null;
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

function toTemplateView(row: TemplateRow): PartyTemplateView {
  return {
    id: row.id,
    imageUrl: getPartyTemplateUrl(row.image_path) ?? "",
    textBoxes: limitTextBoxes(asTextBoxes(row.text_boxes)),
  };
}

function toTemplateViewFull(row: TemplateRow): PartyTemplateView {
  return {
    id: row.id,
    imageUrl: getPartyTemplateUrl(row.image_path) ?? "",
    textBoxes: asTextBoxes(row.text_boxes),
  };
}

function parseCaptionRich(raw: unknown): CaptionDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const doc = raw as {
    v?: unknown;
    boxes?: unknown;
    layoutRevision?: unknown;
    rawTexts?: unknown;
  };
  if (doc.v === 2 && Array.isArray(doc.boxes)) return doc as CaptionDocument;
  if (
    doc.v === 3 &&
    Array.isArray(doc.boxes) &&
    typeof doc.layoutRevision === "number" &&
    Array.isArray(doc.rawTexts)
  ) {
    return doc as CaptionDocument;
  }
  return null;
}

function parseCaptionDraftV3(raw: unknown): CaptionDocumentV3 | null {
  const doc = parseCaptionRich(raw);
  return doc?.v === 3 ? doc : null;
}

async function loadTemplatesByIds(
  supabase: SupabaseClient,
  ids: string[],
  fullBoxes = false
): Promise<Map<string, PartyTemplateView>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, PartyTemplateView>();
  if (unique.length === 0) return map;

  const { data } = await supabase
    .from("party_templates")
    .select("id, image_path, text_boxes")
    .in("id", unique);

  const toView = fullBoxes ? toTemplateViewFull : toTemplateView;
  for (const row of (data ?? []) as TemplateRow[]) {
    map.set(row.id, toView(row));
  }
  return map;
}

export async function buildPartySnapshot(
  supabase: SupabaseClient<Database>,
  roomId: string,
  userId: string
): Promise<PartySnapshot | null> {
  const { data: room, error: roomError } = await (supabase as SupabaseClient)
    .from("party_rooms")
    .select(
      "id, code, status, phase, current_round, round_count, rerolls_per_player, canvas_editor_enabled, round_modifiers_enabled, current_modifier, caption_duration_seconds, phase_ends_at, template_id, phase_seed, caption_count, votes_cast_count, author_guess_enabled, author_guesses_count, round_winner_submission_id"
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
    .select("user_id, score, is_host, rerolls_used")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  const playersRows = (playersRaw ?? []) as PartyPlayerRow[];
  const playerIds = playersRows.map((p) => p.user_id);
  const mePlayer = playersRows.find((p) => p.user_id === userId);
  const myRerollsRemaining = Math.max(
    0,
    roomRow.rerolls_per_player - (mePlayer?.rerolls_used ?? 0)
  );

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

  let myTemplate: PartyTemplateView | null = null;
  let layoutRevision = 0;
  let captionDraft: CaptionDocumentV3 | null = null;
  if (phase === "caption" && roomRow.current_round > 0) {
    const { data: roundRow } = await (supabase as SupabaseClient)
      .from("party_player_rounds")
      .select("template_id, caption_draft, layout_revision")
      .eq("room_id", roomId)
      .eq("round", roomRow.current_round)
      .eq("user_id", userId)
      .maybeSingle();

    if (roundRow) {
      layoutRevision = roundRow.layout_revision ?? 0;
      captionDraft = parseCaptionDraftV3(roundRow.caption_draft);
      if (roundRow.template_id) {
        const templates = await loadTemplatesByIds(supabase, [roundRow.template_id], true);
        myTemplate = templates.get(roundRow.template_id) ?? null;
      }
    }
  }

  let roomTemplate: PartySnapshot["room"]["template"] = null;
  if (phase !== "caption" && roomRow.template_id) {
    const templates = await loadTemplatesByIds(supabase, [roomRow.template_id]);
    roomTemplate = templates.get(roomRow.template_id) ?? null;
  }

  let submissions: PartySnapshot["submissions"] = [];
  let mySubmission: PartySnapshot["mySubmission"] = null;
  let roundWinnerSubmission: PartySnapshot["roundWinnerSubmission"] = null;
  let myAuthorGuess: PartySnapshot["myAuthorGuess"] = null;
  let authorGuessesCastCount: number | undefined;
  let eligibleGuesserCount: number | undefined;
  let iAmWinnerAuthor: boolean | undefined;
  let guessReveal: PartySnapshot["guessReveal"] = null;
  let voteTieCount: number | undefined;
  let tiedVoteCount: number | undefined;

  if (phase !== "waiting" && roomRow.current_round > 0) {
    if (phase === "tie") {
      submissions = [];
      const { data: resultRows } = await (supabase as SupabaseClient)
        .from("party_round_results")
        .select("vote_count")
        .eq("room_id", roomId)
        .eq("round", roomRow.current_round);

      const counts = ((resultRows ?? []) as { vote_count: number }[]).map(
        (r) => r.vote_count
      );
      const top = counts.length > 0 ? Math.max(...counts) : 0;
      tiedVoteCount = top;
      voteTieCount = counts.filter((c) => c === top).length;
    } else if (phase === "guess") {
      authorGuessesCastCount = roomRow.author_guesses_count ?? 0;
      submissions = [];

      const winnerId = roomRow.round_winner_submission_id;
      if (winnerId) {
        const { data: winnerRow } = await (supabase as SupabaseClient)
          .from("party_submissions")
          .select("id, user_id, caption, caption_rich, template_id")
          .eq("id", winnerId)
          .maybeSingle();

        const winner = winnerRow as PartySubmissionRow | null;
        if (winner) {
          iAmWinnerAuthor = winner.user_id === userId;
          const winnerInRoom = playersRows.some((p) => p.user_id === winner.user_id);
          eligibleGuesserCount = Math.max(0, playersRows.length - (winnerInRoom ? 1 : 0));

          let winnerTemplate: PartyTemplateView | undefined;
          if (winner.template_id) {
            const winnerTemplates = await loadTemplatesByIds(
              supabase,
              [winner.template_id],
              true
            );
            winnerTemplate = winnerTemplates.get(winner.template_id);
          }

          roundWinnerSubmission = {
            id: winner.id,
            caption: winner.caption,
            captionRich: parseCaptionRich(winner.caption_rich),
            ...(winnerTemplate ? { template: winnerTemplate } : {}),
          };
        } else {
          iAmWinnerAuthor = false;
          eligibleGuesserCount = playersRows.length;
        }
      } else {
        iAmWinnerAuthor = false;
        eligibleGuesserCount = playersRows.length;
      }

      const { data: myGuessRow } = await (supabase as SupabaseClient)
        .from("party_author_guesses")
        .select("guessed_user_id")
        .eq("room_id", roomId)
        .eq("round", roomRow.current_round)
        .eq("voter_id", userId)
        .maybeSingle();

      if (myGuessRow?.guessed_user_id) {
        myAuthorGuess = { guessedUserId: myGuessRow.guessed_user_id };
      }
    } else {
      const { data: submissionRows } = await (supabase as SupabaseClient)
        .from("party_submissions")
        .select("id, user_id, caption, caption_rich, template_id")
        .eq("room_id", roomId)
        .eq("round", roomRow.current_round);

      const allSubmissions = (submissionRows ?? []) as PartySubmissionRow[];
      const mine = allSubmissions.find((s) => s.user_id === userId);

      if (mine) {
        mySubmission = {
          id: mine.id,
          caption: mine.caption,
          captionRich: parseCaptionRich(mine.caption_rich),
        };
      }

      const templateIds = allSubmissions
        .map((s) => s.template_id)
        .filter((id): id is string => Boolean(id));
      const templatesById = await loadTemplatesByIds(supabase, templateIds, true);

      if (phase === "caption") {
        submissions = mine
          ? [
              {
                id: mine.id,
                userId: mine.user_id,
                caption: mine.caption,
                captionRich: parseCaptionRich(mine.caption_rich),
                ...(mine.template_id
                  ? { template: templatesById.get(mine.template_id) }
                  : {}),
              },
            ]
          : [];
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
          captionRich: parseCaptionRich(s.caption_rich),
          ...(s.template_id ? { template: templatesById.get(s.template_id) } : {}),
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
  }

  if ((phase === "reveal" || phase === "finished") && roomRow.current_round > 0) {
    const winnerId = roomRow.round_winner_submission_id;
    if (winnerId) {
      const { data: winnerAuthorRow } = await (supabase as SupabaseClient)
        .from("party_submissions")
        .select("user_id")
        .eq("id", winnerId)
        .maybeSingle();

      const winnerUserId = winnerAuthorRow?.user_id ?? null;
      if (winnerUserId) {
        const winnerInRoom = playersRows.some((p) => p.user_id === winnerUserId);
        const eligibleGuessers = Math.max(
          0,
          playersRows.length - (winnerInRoom ? 1 : 0)
        );

        const { data: guessRows } = await (supabase as SupabaseClient)
          .from("party_author_guesses")
          .select("voter_id, guessed_user_id")
          .eq("room_id", roomId)
          .eq("round", roomRow.current_round);

        const guesses =
          (guessRows as Array<{ voter_id: string; guessed_user_id: string }> | null) ?? [];
        const myGuess = guesses.find((row) => row.voter_id === userId) ?? null;
        const correctGuesses = guesses.filter(
          (row) =>
            row.voter_id !== winnerUserId && row.guessed_user_id === winnerUserId
        ).length;

        guessReveal = {
          winnerUserId,
          correctGuesses,
          eligibleGuessers,
          myGuessCorrect: myGuess ? myGuess.guessed_user_id === winnerUserId : null,
        };
      }
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
      rerollsPerPlayer: roomRow.rerolls_per_player,
      phaseEndsAt: roomRow.phase_ends_at,
      canvasEditorEnabled: roomRow.canvas_editor_enabled,
      roundModifiersEnabled: roomRow.round_modifiers_enabled,
      authorGuessEnabled: roomRow.author_guess_enabled,
      currentModifier: roomRow.current_modifier,
      roundWinnerSubmissionId: roomRow.round_winner_submission_id ?? null,
      captionDurationSeconds: roomRow.caption_duration_seconds,
      template: roomTemplate,
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
    roundWinnerSubmission,
    myAuthorGuess,
    authorGuessesCastCount,
    eligibleGuesserCount,
    iAmWinnerAuthor,
    guessReveal,
    voteTieCount,
    tiedVoteCount,
    myTemplate,
    myRerollsRemaining,
    recentReactions,
    layoutRevision,
    captionDraft,
  };
}
