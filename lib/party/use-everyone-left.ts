"use client";

import { useEffect, useState } from "react";
import type { PartySnapshot } from "@/lib/party/types";

const DEBOUNCE_MS = 2000;

export function useEveryoneLeft(snapshot: PartySnapshot | null): {
  isPending: boolean;
  isTriggered: boolean;
} {
  const [isTriggered, setIsTriggered] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const soloInProgress =
      snapshot?.room.status === "in_progress" && snapshot.players.length === 1;

    if (!soloInProgress) {
      setIsTriggered(false);
      setIsPending(false);
      return;
    }

    setIsPending(true);
    setIsTriggered(false);

    const timer = window.setTimeout(() => {
      setIsTriggered(true);
      setIsPending(false);
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [snapshot?.room.status, snapshot?.players.length]);

  return { isPending, isTriggered };
}
