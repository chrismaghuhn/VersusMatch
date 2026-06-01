import type { MutableRefObject } from "react";
import type { PartySnapshot } from "@/lib/party/types";
import { isPhaseReadyForEarlyAdvance } from "@/lib/party/phase-ready";

const ADVANCE_COOLDOWN_MS = 500;

export type AdvancePhaseGuards = {
  advancingRef: MutableRefObject<boolean>;
  cooldownUntilRef: MutableRefObject<number>;
  cooldownTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
};

export type TryAdvancePhaseResult = {
  snapshot: PartySnapshot | null;
  advanced: boolean;
};

function isInCooldown(cooldownUntilRef: MutableRefObject<number>): boolean {
  return Date.now() < cooldownUntilRef.current;
}

function startCooldown(guards: AdvancePhaseGuards) {
  guards.cooldownUntilRef.current = Date.now() + ADVANCE_COOLDOWN_MS;
  if (guards.cooldownTimerRef.current) {
    clearTimeout(guards.cooldownTimerRef.current);
  }
  guards.cooldownTimerRef.current = setTimeout(() => {
    guards.cooldownUntilRef.current = 0;
    guards.cooldownTimerRef.current = null;
  }, ADVANCE_COOLDOWN_MS);
}

/** Client-side phase advance when timer expired or all players ready. */
export async function tryAdvancePhase(
  roomId: string,
  snapshot: PartySnapshot | null,
  guards: AdvancePhaseGuards,
  options?: { forceTimer?: boolean }
): Promise<TryAdvancePhaseResult> {
  if (!snapshot) return { snapshot: null, advanced: false };
  if (guards.advancingRef.current || isInCooldown(guards.cooldownUntilRef)) {
    return { snapshot, advanced: false };
  }

  const phase = snapshot.room.phase;
  if (phase !== "caption" && phase !== "voting" && phase !== "reveal") {
    return { snapshot, advanced: false };
  }

  const endsAt = snapshot.room.phaseEndsAt
    ? new Date(snapshot.room.phaseEndsAt).getTime()
    : NaN;
  const timerExpired = !Number.isNaN(endsAt) && Date.now() >= endsAt;
  const allReady = isPhaseReadyForEarlyAdvance(snapshot);

  if (!options?.forceTimer && phase !== "reveal" && !allReady && !timerExpired) {
    return { snapshot, advanced: false };
  }
  if (phase === "reveal" && !timerExpired) {
    return { snapshot, advanced: false };
  }

  guards.advancingRef.current = true;
  const phaseBefore = snapshot.room.phase;

  try {
    const res = await fetch("/api/party/advance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });

    const data = (await res.json()) as {
      ok?: boolean;
      snapshot?: PartySnapshot;
      error?: string;
    };

    const next = data.snapshot ?? snapshot;
    const phaseChanged = next.room.phase !== phaseBefore;
    const advanced = Boolean(data.ok && phaseChanged);

    if (advanced) {
      startCooldown(guards);
    }

    return { snapshot: data.snapshot ?? snapshot, advanced };
  } catch {
    return { snapshot, advanced: false };
  } finally {
    guards.advancingRef.current = false;
  }
}
