import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Lock, UserX, Users, WifiOff } from "lucide-react";

export type PartyErrorCode =
  | "room_full"
  | "bad_code"
  | "not_found"
  | "join_failed"
  | "disconnected"
  | "everyone_left"
  | "network_error"
  | "unknown";

export type PartyErrorDefinition = {
  code: PartyErrorCode;
  label: string;
  icon: LucideIcon;
  color: string;
  title: string;
  body: string;
  cta: string;
  progress?: number;
};

export const PARTY_ERROR_DEFINITIONS: Record<PartyErrorCode, PartyErrorDefinition> = {
  room_full: {
    code: "room_full",
    label: "ROOM FULL",
    icon: Users,
    color: "#FFB800",
    title: "This party is full.",
    body: "Already 8 players in. Wait for someone to leave or find another lobby.",
    cta: "OTHER LOBBY",
  },
  bad_code: {
    code: "bad_code",
    label: "BAD CODE",
    icon: Lock,
    color: "#FF2D87",
    title: "This room doesn't exist.",
    body: "Typo or the host closed it. Codes are 6 characters — case doesn't matter.",
    cta: "TRY AGAIN",
  },
  not_found: {
    code: "not_found",
    label: "NOT FOUND",
    icon: Lock,
    color: "#FF2D87",
    title: "This room doesn't exist.",
    body: "Maybe the lobby already ended or the link expired.",
    cta: "BACK TO PARTY",
  },
  join_failed: {
    code: "join_failed",
    label: "JOIN FAILED",
    icon: Lock,
    color: "#FF2D87",
    title: "Couldn't join the room.",
    body: "Try the code again or ask the host.",
    cta: "TRY AGAIN",
  },
  disconnected: {
    code: "disconnected",
    label: "OFFLINE",
    icon: WifiOff,
    color: "#FF3B3B",
    title: "Connection lost.",
    body: "Wi‑Fi, phone, or server — something hiccuped. Your spot stays reserved briefly.",
    cta: "RECONNECTING…",
    progress: 60,
  },
  everyone_left: {
    code: "everyone_left",
    label: "EVERYONE LEFT",
    icon: UserX,
    color: "#94A3B8",
    title: "You're the only one left.",
    body: "Everyone else left. Can't play solo — start a new lobby.",
    cta: "NEW LOBBY",
  },
  network_error: {
    code: "network_error",
    label: "NETWORK",
    icon: WifiOff,
    color: "#FF3B3B",
    title: "Network error.",
    body: "Couldn't reach the server. Check your connection and try again.",
    cta: "TRY AGAIN",
  },
  unknown: {
    code: "unknown",
    label: "ERROR",
    icon: AlertTriangle,
    color: "#CCFF00",
    title: "Something went wrong.",
    body: "No idea what — but you can try again.",
    cta: "BACK TO PARTY",
  },
};

/** Design-preview-only errors (no RPC backing). */
export const PARTY_ERROR_PREVIEW_DEFINITIONS = [
  {
    code: "NO SUBMISSIONS",
    label: "NO SUBMISSIONS",
    icon: AlertTriangle,
    color: "#CCFF00",
    title: "Nobody wrote anything.",
    body: "Everyone ghosted the round. Skipping ahead. (We'll skip the host too if they keep this up.)",
    cta: "NEXT ROUND",
  },
  {
    code: "BANNED FROM ROOM",
    label: "BANNED FROM ROOM",
    icon: Lock,
    color: "#9333ea",
    title: "Host kicked you out.",
    body: "Probably for cause. Probably not. You can join a different room — but FIGHT-42K is closed to you for 24h.",
    cta: "BROWSE LOBBIES",
  },
] as const;

export function normalizePartyErrorCode(raw: string | null | undefined): PartyErrorCode {
  if (!raw) return "unknown";
  const key = raw.toLowerCase().replace(/-/g, "_");
  if (key in PARTY_ERROR_DEFINITIONS) {
    return key as PartyErrorCode;
  }
  if (key === "could_not_join" || key === "invalid_response") return "unknown";
  if (key === "could_not_load_room" || key === "could_not_join_room" || key === "could_not_create_room") {
    return key === "could_not_load_room" ? "not_found" : "unknown";
  }
  return "unknown";
}

export const PARTY_COPY = {
  loadingRoom: "Loading room…",
  checkingConnection: "Checking connection…",
  working: "One moment…",
  joinCodeInvalid: "Enter a 6-character room code.",
  couldNotJoin: "Couldn't join room.",
  couldNotCreate: "Couldn't create room.",
  couldNotLoadRoom: "Couldn't load room.",
  timerAllReady: "ALL READY — STARTING…",
  captionLockedIn: "Locked in — waiting on others…",
  captionAllReady: "Everyone's ready — voting starts…",
  captionPhaseChanging: "Next phase…",
  captionProgress: (done: number, total: number) => `${done}/${total} submitted`,
  voteLockedIn: "VOTE LOCKED IN",
  voteAllReady: "Everyone voted — results incoming…",
  voteWaiting: "Waiting on the others…",
  votePhaseChanging: "Next phase…",
  voteChange: "CHANGE VOTE",
  voteUnlocking: "Unlocking…",
  voteSkip: "SKIP →",
  voteHeart: "♥ VOTE",
  voteProgress: (done: number, total: number) => `${done}/${total} voted`,
  voteOf: (index: number, total: number) => `${index} OF ${total}`,
  voteNothing: "Nothing to vote on this round.",
  revealWinner: "★ ROUND WINNER",
  revealVotes: (n: number) => `+${n} votes`,
  revealAll: "ALL SUBMISSIONS",
  roundMeta: (round: number, total: number, phase: string) =>
    `ROUND ${round}/${total} · ${phase}`,
  phaseCaption: "CAPTION",
  phaseVote: "VOTE",
  phaseResults: "RESULTS",
  lockIn: "LOCK IN",
  lockInSending: "SENDING…",
  unlockCaption: "EDIT CAPTION",
  unlockCaptionBusy: "UNLOCKING…",
  captionPlaceholder: "Your caption — max 120 characters",
  captionRemaining: (n: number) => `${n} characters left`,
  captionLabel: "CAPTION · TOP & BOTTOM",
  captionFieldTop: "Top",
  captionFieldBottom: "Bottom",
  captionExample: "Two lines — 120 characters total max",
  rerollButton: "NEW MEME",
  rerollButtonBusy: "ROLLING…",
  rerollsRemaining: (n: number) => `${n} reroll${n === 1 ? "" : "s"} left`,
  rerollDraftHint: "Your text was kept — does it still fit?",
  joinHeroTag: "THE PARTY GAME FOR BAD TAKES",
  joinHeroTitle1: "Worst",
  joinHeroTitle2: "wins",
  joinHaveCode: "GOT A CODE?",
  joinOr: "OR",
  joinRounds: "ROUNDS",
  joinRerolls: "REROLLS / PLAYER",
  joinCreateTitle: "CREATE NEW LOBBY",
  joinCreateSub: "Be the host. Invite friends with a 6-character code.",
  joinButton: "JOIN",
  lobbyHosting: "YOU'RE HOSTING",
  lobbyWaiting: "WAITING FOR HOST",
  lobbyWelcomeHost: "Welcome,",
  lobbyWelcomeHostAccent: "warlord",
  lobbyWelcomeGuest: "Lobby",
  lobbyWelcomeGuestAccent: "loading",
  lobbyShare: (min: number) =>
    `Share the code. Drop reactions. Host starts the game at ${min}+ players.`,
  lobbyRoomCode: "YOUR ROOM CODE",
  lobbyCopyLink: "COPY LINK",
  lobbyStartHint: (min: number, need: number) =>
    need > 0
      ? `Starts at ${min}+ players. ${need} more needed.`
      : `Starts at ${min}+ players.`,
  lobbyPlayers: (joined: number, max: number, need: number) =>
    `${joined} of ${max}${need > 0 ? ` · ${need} more` : " · ready"}`,
  lobbyReady: "Ready when you are.",
  lobbyStartNeed: (min: number) => `Need at least ${min} players to start.`,
  lobbyStartReady: "Everyone's here — start the game.",
  lobbyStart: "START GAME →",
  lobbyLeave: "LEAVE LOBBY",
  lobbySettings: "SETTINGS",
  lobbyCaptionTimer: "CAPTION TIMER",
  lobbyVoteTimer: "VOTE TIMER",
  lobbyPlayersSetting: "PLAYERS",
  lobbyRoundsSetting: "ROUNDS",
  lobbyRerollsSetting: "REROLLS",
  finishedGameOver: "GAME OVER",
  finishedWinner: (handle: string) => `@${handle} wins.`,
  finishedTie: (n: number) => `${n}-way tie`,
  finishedScores: "Final scores.",
  finishedRoom: (code: string, rounds: number) => `Room ${code} · ${rounds} rounds`,
  finishedPlayAgain: "PLAY AGAIN →",
  tutorialSkip: "SKIP →",
  tutorialBack: "BACK",
  tutorialNext: "NEXT",
  tutorialDone: "LET'S GO",
  tutorialProgress: (i: number, total: number) => `${i} OF ${total}`,
} as const;

export const PARTY_TUTORIAL_SLIDES = [
  {
    num: "01",
    color: "#CCFF00",
    eyebrow: "LOBBY",
    title: "Get a room.",
    body: "Enter a 6-character code from friends or CREATE your own lobby.",
  },
  {
    num: "02",
    color: "#FF2D87",
    eyebrow: "CAPTION",
    title: "Write your caption.",
    body: "60 seconds. Everyone gets their own meme — type Top & Bottom. Optional reroll.",
  },
  {
    num: "03",
    color: "#00E1FF",
    eyebrow: "VOTE",
    title: "Pick the funniest.",
    body: "All submissions anonymous. 30 seconds — gut beats brain.",
  },
  {
    num: "04",
    color: "#FFB800",
    eyebrow: "WIN",
    title: "Collect points.",
    body: "Round winner scores votes. After all rounds, top score wins. Grab the share card.",
  },
] as const;
