"use client";

import { PartyDesktopTie } from "@/components/brutal/party/desktop/PartyDesktopTie";
import { PartyMobileTie } from "@/components/brutal/party/mobile/PartyMobileTie";
import { usePartyDesktop } from "@/lib/party/use-party-desktop";
import type { PartySnapshot } from "@/lib/party/types";

type PartyTieScreenProps = {
  snapshot: PartySnapshot;
};

export function PartyTieScreen({ snapshot }: PartyTieScreenProps) {
  const desktop = usePartyDesktop();
  if (desktop) {
    return <PartyDesktopTie snapshot={snapshot} />;
  }
  return <PartyMobileTie snapshot={snapshot} />;
}
