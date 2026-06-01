import type { PartySnapshot } from "@/lib/party/types";
import type { AvatarId } from "@/lib/party/avatar-ids";
import { decodePartyAvatar } from "@/lib/party/avatar";

export type ShareCardData = {
  roomCode: string;
  roundCount: number;
  gameWinners: Array<{
    handle: string;
    score: number;
    isYou: boolean;
    avatarId: AvatarId;
    avatarColor: string;
  }>;
  roundWinner: {
    handle: string;
    caption: string;
    voteCount: number;
    avatarId: AvatarId;
    avatarColor: string;
    template: PartySnapshot["room"]["template"];
  } | null;
  template: PartySnapshot["room"]["template"];
};

export function buildShareCardData(snapshot: PartySnapshot): ShareCardData {
  const ranked = [...snapshot.players].sort((a, b) => b.score - a.score);
  const topScore = ranked[0]?.score ?? 0;
  const gameWinners = ranked
    .filter((p) => p.score === topScore && topScore > 0)
    .map((p) => {
      const avatar = decodePartyAvatar(p.avatarUrl);
      return {
        handle: p.isYou ? "you" : p.handle,
        score: p.score,
        isYou: p.isYou,
        avatarId: avatar.id,
        avatarColor: avatar.color,
      };
    });

  let roundWinner: ShareCardData["roundWinner"] = null;
  const withVotes = snapshot.submissions.filter((s) => s.voteCount !== undefined);
  if (withVotes.length > 0) {
    const best = withVotes.reduce((a, b) => ((b.voteCount ?? 0) > (a.voteCount ?? 0) ? b : a));
    const author = snapshot.players.find((p) => p.userId === best.userId);
    const avatar = decodePartyAvatar(author?.avatarUrl);
    roundWinner = {
      handle: author?.isYou ? "you" : (author?.handle ?? "?"),
      caption: best.caption,
      voteCount: best.voteCount ?? 0,
      avatarId: avatar.id,
      avatarColor: avatar.color,
      template: best.template ?? null,
    };
  }

  const roundTemplate = roundWinner?.template ?? null;

  return {
    roomCode: snapshot.room.code,
    roundCount: snapshot.room.roundCount,
    gameWinners,
    roundWinner,
    template: roundTemplate,
  };
}

export function buildShareTweetText(data: ShareCardData, joinUrl: string): string {
  const winnerLine =
    data.gameWinners.length === 1
      ? `@${data.gameWinners[0]!.handle} won`
      : data.gameWinners.length > 1
        ? `${data.gameWinners.length}-way tie`
        : "We finished";

  const roundLine = data.roundWinner
    ? ` Last round: "${data.roundWinner.caption.slice(0, 60)}${data.roundWinner.caption.length > 60 ? "…" : ""}" (${data.roundWinner.voteCount} votes).`
    : "";

  return `${winnerLine} in MemeFight Party room ${data.roomCode}.${roundLine}\n\nPlay → ${joinUrl}`;
}
