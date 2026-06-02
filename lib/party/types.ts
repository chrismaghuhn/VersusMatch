import type { CaptionDocument, CaptionDocumentV3 } from "@/lib/party/caption-rich/types";
import type { PartyRoundModifier } from "@/lib/party/round-modifiers";

export type PartyPhase = "waiting" | "caption" | "voting" | "guess" | "reveal" | "finished";

export type PartyRoomStatus = "open" | "in_progress" | "finished" | "abandoned";

export type PartyReactionKey = "laugh" | "eyes" | "fire";

export const PARTY_REACTION_KEYS: PartyReactionKey[] = ["laugh", "eyes", "fire"];

export const PARTY_REACTION_EMOJI: Record<PartyReactionKey, string> = {
  laugh: "😂",
  eyes: "👀",
  fire: "🔥",
};

export type TextBox = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  align: "left" | "center" | "right";
  maxLines: number;
};

export type { CaptionDocument, CaptionDocumentV3 };

export type PartyTemplateView = {
  id: string;
  imageUrl: string;
  textBoxes: TextBox[];
};

export type PartyRoundWinnerSubmission = {
  id: string;
  caption: string;
  captionRich?: CaptionDocument | null;
  template?: PartyTemplateView;
};

export type PartyGuessReveal = {
  winnerUserId: string;
  correctGuesses: number;
  eligibleGuessers: number;
  myGuessCorrect: boolean | null;
};

export type PartySnapshot = {
  room: {
    id: string;
    code: string;
    status: PartyRoomStatus;
    phase: PartyPhase;
    currentRound: number;
    roundCount: number;
    rerollsPerPlayer: number;
    phaseEndsAt: string | null;
    canvasEditorEnabled: boolean;
    roundModifiersEnabled: boolean;
    authorGuessEnabled: boolean;
    currentModifier: PartyRoundModifier | null;
    roundWinnerSubmissionId: string | null;
    captionDurationSeconds: number;
    /** @deprecated Use myTemplate (caption) or submission.template (vote/reveal) */
    template: PartyTemplateView | null;
  };
  /** Caption phase, current user — server layout revision for draft sync */
  layoutRevision: number;
  /** Caption phase, current user only */
  captionDraft: CaptionDocumentV3 | null;
  players: Array<{
    userId: string;
    handle: string;
    avatarUrl: string | null;
    score: number;
    isHost: boolean;
    isYou: boolean;
  }>;
  submissions: Array<{
    id: string;
    userId: string;
    caption: string;
    captionRich?: CaptionDocument | null;
    voteCount?: number;
    template?: PartyTemplateView;
  }>;
  captionCount: number;
  votesCastCount: number;
  mySubmission: { id: string; caption: string; captionRich?: CaptionDocument | null } | null;
  myVote: { submissionId: string } | null;
  roundWinnerSubmission?: PartyRoundWinnerSubmission | null;
  myAuthorGuess?: { guessedUserId: string } | null;
  authorGuessesCastCount?: number;
  eligibleGuesserCount?: number;
  iAmWinnerAuthor?: boolean;
  guessReveal?: PartyGuessReveal | null;
  myTemplate: PartyTemplateView | null;
  myRerollsRemaining: number;
  recentReactions: Array<{
    id: string;
    userId: string;
    handle: string;
    reactionKey: PartyReactionKey;
    createdAt: string;
  }>;
};
