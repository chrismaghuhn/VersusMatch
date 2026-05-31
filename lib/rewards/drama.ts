import { CLOSE_PCT_MAX, CLOSE_PCT_MIN, UNDERDOG_PCT_THRESHOLD } from "./constants";

export type DramaKind = "underdog" | "close" | "winning";

export function getPostVoteDrama(userSidePct: number): { kind: DramaKind; message: string } {
  if (userSidePct < UNDERDOG_PCT_THRESHOLD) {
    return {
      kind: "underdog",
      message: `UNDERDOG — only ${userSidePct}% picked your side. Fight back.`,
    };
  }
  if (userSidePct >= CLOSE_PCT_MIN && userSidePct <= CLOSE_PCT_MAX) {
    return { kind: "close", message: "TOO CLOSE — every vote counts." };
  }
  return { kind: "winning", message: "YOUR SIDE IS WINNING — defend it." };
}
