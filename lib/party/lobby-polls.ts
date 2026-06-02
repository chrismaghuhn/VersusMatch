export type LobbyWarmupPoll = {
  key: string;
  question: string;
  options: [string, string, string];
};

export const LOBBY_WARMUP_POLLS: LobbyWarmupPoll[] = [
  {
    key: "warmup-0",
    question: "Who's the funniest in this lobby?",
    options: ["Definitely me", "The host", "Someone else"],
  },
  {
    key: "warmup-1",
    question: "Pick your caption strategy:",
    options: ["Short & punchy", "Chaos energy", "Wholesome bait"],
  },
  {
    key: "warmup-2",
    question: "How hyped are you?",
    options: ["Let's go", "Mild panic", "Already lost"],
  },
  {
    key: "warmup-3",
    question: "Meme quality tonight?",
    options: ["Cinema", "Mid", "Unhinged"],
  },
];

export function pollIndexForRoom(roomId: string): number {
  let h = 0;
  for (let i = 0; i < roomId.length; i++) {
    h = (h * 31 + roomId.charCodeAt(i)) >>> 0;
  }
  return h % LOBBY_WARMUP_POLLS.length;
}

export function lobbyPollForRoom(roomId: string): LobbyWarmupPoll {
  return LOBBY_WARMUP_POLLS[pollIndexForRoom(roomId)]!;
}

export type LobbyPollSnapshot = {
  key: string;
  question: string;
  options: string[];
  tallies: number[];
  myOptionIndex: number | null;
};

export function buildLobbyPollTallies(
  poll: LobbyWarmupPoll,
  votes: Array<{ option_index: number }>,
  myOptionIndex: number | null
): LobbyPollSnapshot {
  const tallies = poll.options.map(() => 0);
  for (const vote of votes) {
    if (vote.option_index >= 0 && vote.option_index < tallies.length) {
      tallies[vote.option_index]! += 1;
    }
  }
  return {
    key: poll.key,
    question: poll.question,
    options: [...poll.options],
    tallies,
    myOptionIndex,
  };
}
