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
    label: "RAUM VOLL",
    icon: Users,
    color: "#FFB800",
    title: "Die Party ist voll.",
    body: "Schon 8 Spieler drin. Warte bis jemand geht oder such eine andere Lobby.",
    cta: "ANDERE LOBBY",
  },
  bad_code: {
    code: "bad_code",
    label: "FALSCHER CODE",
    icon: Lock,
    color: "#FF2D87",
    title: "Dieser Raum existiert nicht.",
    body: "Tippfehler oder der Host hat zugemacht. Codes sind 6 Zeichen, Groß/Klein egal.",
    cta: "NOCHMAL",
  },
  not_found: {
    code: "not_found",
    label: "NICHT GEFUNDEN",
    icon: Lock,
    color: "#FF2D87",
    title: "Dieser Raum existiert nicht.",
    body: "Vielleicht ist die Lobby schon vorbei oder der Link ist abgelaufen.",
    cta: "ZURÜCK ZUR PARTY",
  },
  join_failed: {
    code: "join_failed",
    label: "BEITRITT FEHL",
    icon: Lock,
    color: "#FF2D87",
    title: "Beitritt fehlgeschlagen.",
    body: "Konnte den Raum nicht betreten. Probier den Code nochmal oder frag den Host.",
    cta: "NOCHMAL",
  },
  disconnected: {
    code: "disconnected",
    label: "OFFLINE",
    icon: WifiOff,
    color: "#FF3B3B",
    title: "Verbindung unterbrochen.",
    body: "WLAN, Handy oder Server — irgendwas hakt. Dein Platz bleibt kurz reserviert.",
    cta: "VERBINDE…",
    progress: 60,
  },
  everyone_left: {
    code: "everyone_left",
    label: "ALLE WEG",
    icon: UserX,
    color: "#94A3B8",
    title: "Du bist allein übrig.",
    body: "Alle anderen sind gegangen. Alleine spielen geht nicht — starte eine neue Lobby.",
    cta: "NEUE LOBBY",
  },
  network_error: {
    code: "network_error",
    label: "NETZWERK",
    icon: WifiOff,
    color: "#FF3B3B",
    title: "Netzwerkfehler.",
    body: "Konnte den Server nicht erreichen. Check deine Verbindung und versuch es nochmal.",
    cta: "NOCHMAL",
  },
  unknown: {
    code: "unknown",
    label: "FEHLER",
    icon: AlertTriangle,
    color: "#CCFF00",
    title: "Da ist was schiefgelaufen.",
    body: "Kein Plan was — aber du kannst es nochmal versuchen.",
    cta: "ZURÜCK ZUR PARTY",
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
  loadingRoom: "Raum lädt…",
  checkingConnection: "Verbindung wird geprüft…",
  working: "Einen Moment…",
  joinCodeInvalid: "Gib einen 6-stelligen Raumcode ein.",
  couldNotJoin: "Raum beitreten fehlgeschlagen.",
  couldNotCreate: "Raum erstellen fehlgeschlagen.",
  couldNotLoadRoom: "Raum konnte nicht geladen werden.",
  timerAllReady: "ALLE FERTIG — START…",
  captionLockedIn: "Eingereicht — warte auf andere…",
  captionAllReady: "Alle fertig — Abstimmung startet…",
  captionPhaseChanging: "Nächste Phase…",
  captionProgress: (done: number, total: number) => `${done}/${total} haben abgeschickt`,
  voteLockedIn: "STIMME ABGEBEN",
  voteAllReady: "Alle haben gevotet — Ergebnis kommt…",
  voteWaiting: "Warte auf die anderen…",
  votePhaseChanging: "Nächste Phase…",
  voteChange: "STIMME ÄNDERN",
  voteUnlocking: "Wird freigegeben…",
  voteSkip: "ÜBERSPRINGEN →",
  voteHeart: "♥ VOTEN",
  voteProgress: (done: number, total: number) => `${done}/${total} haben gevotet`,
  voteOf: (index: number, total: number) => `${index} VON ${total}`,
  voteNothing: "Nichts zum Voten in dieser Runde.",
  revealWinner: "★ RUNDEN-SIEGER",
  revealVotes: (n: number) => `+${n} Stimmen`,
  revealAll: "ALLE EINREICHUNGEN",
  roundMeta: (round: number, total: number, phase: string) =>
    `RUNDE ${round}/${total} · ${phase}`,
  phaseCaption: "CAPTION",
  phaseVote: "VOTE",
  phaseResults: "ERGEBNIS",
  lockIn: "ABSCHICKEN",
  lockInSending: "SENDE…",
  unlockCaption: "BEARBEITEN",
  unlockCaptionBusy: "WIRD FREIGEGEBEN…",
  captionPlaceholder: "Dein Caption — max. 120 Zeichen",
  captionRemaining: (n: number) => `${n} Zeichen übrig`,
  captionLabel: "CAPTION · OBEN & UNTEN",
  captionFieldTop: "Oben",
  captionFieldBottom: "Unten",
  captionExample: "Zwei Zeilen — max. 120 Zeichen gesamt",
  rerollButton: "NEUES MEME",
  rerollButtonBusy: "WIRD GEZOGEN…",
  rerollsRemaining: (n: number) => `${n} Reroll${n === 1 ? "" : "s"} übrig`,
  rerollDraftHint: "Dein Text wurde übernommen — passt er noch?",
  joinHeroTag: "DAS PARTY-SPIEL FÜR SCHLECHTE TAKES",
  joinHeroTitle1: "Schlechteste",
  joinHeroTitle2: "gewinnt",
  joinHaveCode: "CODE DA?",
  joinOr: "ODER",
  joinRounds: "RUNDEN",
  joinRerolls: "REROLLS / SPIELER",
  joinCreateTitle: "NEUE LOBBY",
  joinCreateSub: "Sei Host. Freunde einladen mit 6-stelligem Code.",
  joinButton: "BEITRETEN",
  lobbyHosting: "DU BIST HOST",
  lobbyWaiting: "WARTE AUF HOST",
  lobbyWelcomeHost: "Willkommen,",
  lobbyWelcomeHostAccent: "Kriegsherr",
  lobbyWelcomeGuest: "Lobby",
  lobbyWelcomeGuestAccent: "lädt",
  lobbyShare: "Code teilen. Reactions droppen. Host startet ab",
  lobbyRoomCode: "DEIN RAUMCODE",
  lobbyCopyLink: "LINK KOPIEREN",
  lobbyStartHint: (min: number, need: number) =>
    need > 0
      ? `Start bei ${min}+ Spielern. Noch ${need} fehlen.`
      : `Start bei ${min}+ Spielern.`,
  lobbyPlayers: (joined: number, max: number, need: number) =>
    `${joined} von ${max}${need > 0 ? ` · noch ${need}` : " · bereit"}`,
  lobbyReady: "Bereit wenn du es bist.",
  lobbyStartNeed: (min: number) => `Mindestens ${min} Spieler zum Starten.`,
  lobbyStartReady: "Alle da — Spiel starten.",
  lobbyStart: "SPIEL STARTEN →",
  lobbyLeave: "LOBBY VERLASSEN",
  lobbySettings: "EINSTELLUNGEN",
  lobbyCaptionTimer: "CAPTION-TIMER",
  lobbyVoteTimer: "VOTE-TIMER",
  lobbyPlayersSetting: "SPIELER",
  lobbyRoundsSetting: "RUNDEN",
  lobbyRerollsSetting: "REROLLS",
  finishedGameOver: "SPIEL VORBEI",
  finishedWinner: (handle: string) => `@${handle} gewinnt.`,
  finishedTie: (n: number) => `${n}-Wege-Unentschieden`,
  finishedScores: "Endstand.",
  finishedRoom: (code: string, rounds: number) => `Raum ${code} · ${rounds} Runden`,
  finishedPlayAgain: "NOCHMAL SPIELEN →",
  tutorialSkip: "ÜBERSPRINGEN →",
  tutorialBack: "ZURÜCK",
  tutorialNext: "WEITER",
  tutorialDone: "LOS GEHT'S",
  tutorialProgress: (i: number, total: number) => `${i} VON ${total}`,
} as const;

export const PARTY_TUTORIAL_SLIDES = [
  {
    num: "01",
    color: "#CCFF00",
    eyebrow: "LOBBY",
    title: "Raum besorgen.",
    body: "6-stelligen Code von Freunden eingeben oder CREATE für deine eigene Lobby.",
  },
  {
    num: "02",
    color: "#FF2D87",
    eyebrow: "CAPTION",
    title: "Caption schreiben.",
    body: "60 Sekunden. Jeder bekommt ein eigenes Meme — Oben & Unten tippen. Optional Reroll.",
  },
  {
    num: "03",
    color: "#00E1FF",
    eyebrow: "VOTE",
    title: "Lustigste wählen.",
    body: "Alle Einreichungen anonym. 30 Sekunden — Bauchgefühl schlägt Kopf.",
  },
  {
    num: "04",
    color: "#FFB800",
    eyebrow: "SIEG",
    title: "Punkte abholen.",
    body: "Rundensieger +400 Pts. Nach allen Runden gewinnt die Spitze. Share-Card mitnehmen.",
  },
] as const;
