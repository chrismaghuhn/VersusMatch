import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Lock, UserX, Users, WifiOff } from "lucide-react";
import { MODIFIER_LABELS, type PartyRoundModifier } from "@/lib/party/round-modifiers";

export type PartyErrorCode =
  | "room_full"
  | "bad_code"
  | "not_found"
  | "join_failed"
  | "create_failed"
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
  create_failed: {
    code: "create_failed",
    label: "CREATE FAILED",
    icon: AlertTriangle,
    color: "#FF2D87",
    title: "Couldn't create the lobby.",
    body: "Something broke on our end — try again in a moment.",
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
  if (key === "could_not_create_room") return "create_failed";
  if (key === "could_not_join_room") return "join_failed";
  if (key === "could_not_load_room") return "not_found";
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
  captionProgress: (done: number, total: number) => `${done}/${total} captioned`,
  captionProgressFlavor: (remaining: number) => {
    const pool = [
      "No pressure. Just speed.",
      "Cook fast. Chaos is hungry.",
      "Timer's ruthless. Keep typing.",
      "Don't overthink the punchline.",
      "Last-second captions still count.",
      "Speed beats perfect right now.",
    ] as const;
    const safeRemaining = Number.isFinite(remaining) ? Math.max(0, Math.floor(remaining)) : 0;
    return pool[safeRemaining % pool.length];
  },
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
  phaseTie: "TIE",
  phaseResults: "RESULTS",
  tiePhaseTitle: "IT'S A TIE",
  tiePhaseSubtitle: (tiedCount: number, votes: number) =>
    `${tiedCount} memes tied at ${votes} vote${votes === 1 ? "" : "s"} — breaking the deadlock…`,
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
  captionSyntaxHint: "~slant~ · *italic* · ^large^",
  modifierLabel: (modifier: PartyRoundModifier) => MODIFIER_LABELS[modifier],
  modifierViolation: (modifier: PartyRoundModifier) =>
    `Rule broken: ${MODIFIER_LABELS[modifier]}`,
  captionSubmitBlocked:
    "Could not send caption — check round rule, length, or layout.",
  rerollButton: "NEW MEME",
  rerollButtonBusy: "ROLLING…",
  rerollsRemaining: (n: number) => `${n} reroll${n === 1 ? "" : "s"} left`,
  rerollDraftHint: "Your text was kept — does it still fit?",
  rerollCustomWarningTitle: "Change meme?",
  rerollCustomWarningBody:
    "Reroll swaps your meme and removes all custom text boxes. Layout resets.",
  rerollCustomConfirm: "Reroll anyway",
  rerollCustomCancel: "Cancel",
  rerollNoBudget: "No rerolls left.",
  canvasAddText: "+ Text",
  canvasDeleteCustom: "Delete",
  canvasResetLayout: "Reset layout",
  canvasUndo: "Undo",
  canvasRedo: "Redo",
  canvasTextWhite: "White text",
  canvasTextBlack: "Black text",
  canvasPill: "Pill",
  canvasAlignLeft: "Align left",
  canvasAlignCenter: "Align center",
  canvasAlignRight: "Align right",
  canvasSnapH: "Snap horizontal",
  canvasSnapV: "Snap vertical",
  canvasPeek: "Preview",
  joinHeroTag: "THE PARTY GAME FOR BAD TAKES",
  joinHeroTitle1: "Worst",
  joinHeroTitle2: "wins",
  joinHaveCode: "GOT A CODE?",
  joinOr: "OR",
  joinRounds: "ROUNDS",
  joinRerolls: "REROLLS / PLAYER",
  joinCanvasEditor: "Canvas Editor (move text + extra boxes)",
  joinCanvasEditorHint: "90s caption timer · advanced layout",
  authorGuessToggleLabel: "Author Guess",
  authorGuessToggleHint: 'Add a 10s "who wrote this?" phase before reveal.',
  captionToolbarSlant: "Slant",
  joinCreateTitle: "CREATE NEW LOBBY",
  joinCreateSub: "Be the host. Invite friends with a 6-character code.",
  joinButton: "JOIN",
  joinTeaserHosting: (handle: string) => `@${handle} is hosting a party`,
  joinTeaserPlayers: (n: number, max: number) => `${n}/${max} players`,
  joinTeaserTagline: "Live meme captions · 2–8 players",
  joinTeaserCta: "JOIN THE CHAOS →",
  joinTeaserInGameTitle: (handle: string) => `@${handle} — party in progress`,
  joinTeaserInGameBody: (n: number, max: number) =>
    `${n}/${max} players · You can join when the lobby opens again.`,
  joinTeaserInGameCta: "GAME IN PROGRESS — WAIT",
  joinTeaserFinished: "This party is over.",
  joinTeaserFinishedRecap: "View recap →",
  joinTeaserNotFound: "Code not found.",
  joinTeaserClosed: "Room closed.",
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
  lobbyCanvasEditor: "CANVAS EDITOR",
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
  finishedRunItBack: "RUN IT BACK →",
  finishedNewRoom: "NEW ROOM →",
  finishedWaitingForHost: "Waiting for host to run it back…",
  finishedRematchError: "Could not reset room — try again.",
  finishedRematchNotHost: "Only the host can run it back.",
  recapPublicDisclosure: (url: string) => `Recap is public: ${url}`,
  tutorialSkip: "SKIP →",
  tutorialBack: "BACK",
  tutorialNext: "NEXT",
  tutorialDone: "LET'S GO",
  tutorialProgress: (i: number, total: number) => `${i} OF ${total}`,
  guessPhaseTitle: "WHO WROTE THE WINNER?",
  guessPhaseSubtitle: "Guess who cooked this cursed caption.",
  guessPhaseLocked: "You wrote this one. Act surprised.",
  guessErrors: {
    not_eligible: "You wrote the winner — no guessing for you.",
    already_guessed: "You already guessed this round.",
    invalid_guess: "That player isn't in the room.",
  } as const,
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
    body:
      "Everyone gets their own meme — type Top & Bottom. Host can enable Canvas Editor (90s, drag text, W/B, pill). Standard rooms get 60s. Reroll if you want a new meme.",
  },
  {
    num: "03",
    color: "#00E1FF",
    eyebrow: "VOTE",
    title: "Pick the funniest.",
    body: "All submissions anonymous. 30 seconds — funny beats clever.",
  },
  {
    num: "04",
    color: "#FFB800",
    eyebrow: "WIN",
    title: "Collect points.",
    body:
      "Round winner scores votes. After all rounds, top score wins. ShareCard: copy the invite link or download a PNG to post.",
  },
] as const;
