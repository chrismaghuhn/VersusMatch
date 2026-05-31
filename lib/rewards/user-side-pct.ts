import type { BattleResult } from "@/lib/database.types";

export function getUserSidePct(results: BattleResult[], optionId: string): number {
  const totalVotes = results.reduce((sum, row) => sum + row.vote_count, 0);
  if (totalVotes === 0) {
    return 50;
  }

  const optionVotes = results.find((row) => row.option_id === optionId)?.vote_count ?? 0;
  return Math.round((optionVotes / totalVotes) * 100);
}
