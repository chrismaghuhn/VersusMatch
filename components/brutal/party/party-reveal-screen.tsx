"use client";

import { PartyMobileReveal } from "@/components/brutal/party/mobile/PartyMobileReveal";
import type { PartySnapshot } from "@/lib/party/types";

type PartyRevealScreenProps = {
  snapshot: PartySnapshot;
};

export function PartyRevealScreen({ snapshot }: PartyRevealScreenProps) {
  return <PartyMobileReveal snapshot={snapshot} />;
}
