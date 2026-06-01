"use client";

import { PartyMobileVoting } from "@/components/brutal/party/mobile/PartyMobileVoting";
import type { PartySnapshot } from "@/lib/party/types";

type PartyVotingScreenProps = {
  snapshot: PartySnapshot;
  onVote: (submissionId: string) => Promise<void>;
  onRetractVote?: () => Promise<void>;
  voting?: boolean;
  retracting?: boolean;
  retractDisabled?: boolean;
  phaseTransitioning?: boolean;
};

export function PartyVotingScreen(props: PartyVotingScreenProps) {
  return <PartyMobileVoting {...props} />;
}
