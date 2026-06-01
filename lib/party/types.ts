export type PartyPhase = "waiting" | "caption" | "voting" | "reveal" | "finished";

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

export type PartyTemplateView = {
  id: string;
  imageUrl: string;
  textBoxes: TextBox[];
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
    /** @deprecated Use myTemplate (caption) or submission.template (vote/reveal) */
    template: PartyTemplateView | null;
  };
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
    voteCount?: number;
    template?: PartyTemplateView;
  }>;
  captionCount: number;
  votesCastCount: number;
  mySubmission: { id: string; caption: string } | null;
  myVote: { submissionId: string } | null;
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
