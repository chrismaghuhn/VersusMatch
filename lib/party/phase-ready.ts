import type { PartySnapshot } from "@/lib/party/types";
import { isGuessPhaseReady as isGuessReady } from "@/lib/party/guess-author";

export function isCaptionPhaseReady(snapshot: PartySnapshot): boolean {
  const n = snapshot.players.length;
  return n > 0 && snapshot.captionCount >= n;
}

export function isVotingPhaseReady(snapshot: PartySnapshot): boolean {
  const n = snapshot.players.length;
  return n > 0 && snapshot.votesCastCount >= n;
}

export function isGuessPhaseReady(snapshot: PartySnapshot): boolean {
  return isGuessReady(snapshot);
}

export function isPhaseReadyForEarlyAdvance(snapshot: PartySnapshot): boolean {
  if (snapshot.room.phase === "caption") return isCaptionPhaseReady(snapshot);
  if (snapshot.room.phase === "voting") return isVotingPhaseReady(snapshot);
  if (snapshot.room.phase === "guess") return isGuessPhaseReady(snapshot);
  return false;
}
