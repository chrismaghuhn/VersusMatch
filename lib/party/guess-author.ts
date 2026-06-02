import type { PartySnapshot } from "@/lib/party/types";

export function countEligibleGuessers(
  playerCount: number,
  winnerAuthorPresent: boolean
): number {
  return winnerAuthorPresent ? Math.max(0, playerCount - 1) : playerCount;
}

export function isGuessPhaseReady(snapshot: PartySnapshot): boolean {
  const eligible = snapshot.eligibleGuesserCount ?? 0;
  const cast = snapshot.authorGuessesCastCount ?? 0;
  return eligible > 0 && cast >= eligible;
}

export function shouldSkipGuessPhase(submissionCount: number): boolean {
  return submissionCount < 2;
}

export function formatGuessRevealLine(
  correct: number,
  eligible: number,
  winnerHandle: string
): string {
  if (eligible <= 0) return "";
  return `${correct}/${eligible} guessed @${winnerHandle}`;
}
