type SubmissionVotes = { voteCount?: number };

export function getRevealTheatreLabel(
  submissions: SubmissionVotes[],
  totalVotes?: number
): string | null {
  if (submissions.length < 2) return null;

  const sorted = [...submissions].sort(
    (a, b) => (b.voteCount ?? 0) - (a.voteCount ?? 0)
  );
  const winner = sorted[0]?.voteCount ?? 0;
  const runnerUp = sorted[1]?.voteCount ?? 0;
  const total =
    totalVotes ??
    submissions.reduce((sum, submission) => sum + (submission.voteCount ?? 0), 0);

  if (total <= 0 || winner <= 0) return null;
  if (winner === total) return "UNANIMOUS";
  if (winner - runnerUp === 1) return "PHOTO FINISH";
  if (winner / total >= 0.75) return "LANDSLIDE";
  return null;
}
