"use client";

import { PartyMobileVoting } from "@/components/brutal/party/mobile/PartyMobileVoting";
import { PartyDesktopVoting } from "@/components/brutal/party/desktop";
import { usePartyDesktop } from "@/lib/party/use-party-desktop";
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
  const desktop = usePartyDesktop();
  if (desktop) {
    return <PartyDesktopVoting {...props} />;
  }
  return <PartyMobileVoting {...props} />;
}
