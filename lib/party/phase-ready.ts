import type { PartySnapshot } from "@/lib/party/types";

export function isCaptionPhaseReady(snapshot: PartySnapshot): boolean {
  const n = snapshot.players.length;
  return n > 0 && snapshot.captionCount >= n;
}

export function isVotingPhaseReady(snapshot: PartySnapshot): boolean {
  const n = snapshot.players.length;
  return n > 0 && snapshot.votesCastCount >= n;
}

export function isPhaseReadyForEarlyAdvance(snapshot: PartySnapshot): boolean {
  if (snapshot.room.phase === "caption") return isCaptionPhaseReady(snapshot);
  if (snapshot.room.phase === "voting") return isVotingPhaseReady(snapshot);
  return false;
}
