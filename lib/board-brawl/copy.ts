export const BB_COPY = {
  title: "Board Brawl",
  createRoom: "Create room",
  joinRoom: "Join room",
  startGame: "Start game",
  roll: "Roll dice",
  buyStar: "Buy star (20 coins)",
  skipShop: "Skip shop",
  ready: "Ready",
  notReady: "Not ready",
  roomCode: "Room code",
  copyLink: "Copy invite link",
  copied: "Copied!",
  lobbyShareHint: "Share the link or code — friends join from /board-brawl.",
  lobbyPlayers: (joined: number, max: number) => `${joined}/${max} in lobby`,
  lobbyHostHint: (min: number) => `You are host. Start when at least ${min} players are ready.`,
  lobbyGuestHint: "Mark ready when you're set. Host starts the match.",
  waitingForHost: "Waiting for host to start…",
  yourTurn: "Your turn",
  waitingForPlayer: (name: string) => `Waiting for ${name}…`,
  rollHint: "Roll to move around the board. Land on tiles for coins, items, or the star shop.",
  shopHint: "You're on a star shop tile. Buy a star or keep moving next round.",
  minigameButtonMash: "Mash SPACE or tap ACTION — most taps wins coins.",
  minigameRelayDash: "Tap ACTION or SPACE to boost your lane.",
  minigamePrecisionAim: "Click the green targets in the 3D view. Avoid pink decoys.",
  minigameGeneric: "Follow the on-screen action before time runs out.",
  boardLegend: "Tile colors",
  tilePlus: "+3 coins",
  tileMinus: "−2 coins",
  tileShop: "Star shop",
  tileItem: "Random item",
  tileEvent: "Event",
  tileLuck: "Luck",
  tileNeutral: "Neutral",
  lastRoll: (n: number) => `Last roll: ${n}`,
  roundLabel: (current: number, total: number) => `Round ${current} / ${total}`,
  useItem: "Use",
  pickTarget: "Tap a player to target your item",
  itemsLabel: "Items",
  rematch: "Rematch",
  leaveRoom: "Leave room",
  minigameResults: "Minigame results",
  minigameResultsWait: "Coin rewards incoming — board resumes in a few seconds…",
  itemLabels: {
    golden_dice: "Golden dice",
    coin_magnet: "Coin magnet",
    double_shop: "Half-price star",
    tripwire: "Tripwire",
    coin_snatch: "Coin snatch",
    star_tax: "Star tax",
  } as Record<string, string>,
  backToLobby: "Back to lobby",
  loading: "Loading room…",
  comingSoon: "Board Brawl is coming soon.",
  webglUnsupported: "WebGL is not available in this browser.",
  errors: {
    not_available: "Board Brawl is not available.",
    unauthorized: "Please sign in to play.",
    not_in_room: "You are not in this room.",
    not_host: "Only the host can do that.",
    not_active_player: "Wait for your turn.",
    wrong_phase: "Not allowed in this phase.",
    wrong_pending_action: "That action is not available right now.",
    room_full: "Room is full (max 8 players).",
    bad_code: "Invalid room code.",
    not_found: "Room not found.",
    duplicate_turn: "Turn already taken.",
    too_soon: "Please wait before the next tick.",
    invalid_action: "Invalid action.",
    network_error: "Network error. Try again.",
    could_not_create_room: "Could not create room.",
    could_not_join_room: "Could not join room.",
  },
} as const;

export function bbErrorMessage(code: string | undefined): string {
  if (!code) return "Something went wrong.";
  return BB_COPY.errors[code as keyof typeof BB_COPY.errors] ?? code;
}

export function bbMinigameTitle(id: string | null): string {
  if (id === "button_mash") return "Button Mash";
  if (id === "relay_dash") return "Relay Dash";
  if (id === "precision_aim") return "Precision Aim";
  return "Minigame";
}

export function bbMinigameHint(id: string | null): string {
  if (id === "button_mash") return BB_COPY.minigameButtonMash;
  if (id === "relay_dash") return BB_COPY.minigameRelayDash;
  if (id === "precision_aim") return BB_COPY.minigamePrecisionAim;
  return BB_COPY.minigameGeneric;
}
