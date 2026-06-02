"use client";

import type { BoardBrawlSnapshot } from "@/lib/board-brawl/types";
import { ButtonMashArena } from "@/components/brutal/board-brawl/three/minigames/ButtonMashArena";
import { PrecisionAimArena } from "@/components/brutal/board-brawl/three/minigames/PrecisionAimArena";
import { RelayDashArena } from "@/components/brutal/board-brawl/three/minigames/RelayDashArena";

type MinigameSceneRouterProps = {
  snapshot: BoardBrawlSnapshot;
  onInput?: (type: string, payload: Record<string, unknown>) => void;
};

export function MinigameSceneRouter({ snapshot, onInput }: MinigameSceneRouterProps) {
  const id = snapshot.room.minigameId;
  const state = snapshot.minigame?.state ?? {};

  if (id === "button_mash") {
    return <ButtonMashArena state={state} onInput={onInput} />;
  }
  if (id === "precision_aim") {
    return <PrecisionAimArena state={state} onInput={onInput} />;
  }
  if (id === "relay_dash") {
    return <RelayDashArena state={state} onInput={onInput} />;
  }

  return (
    <mesh>
      <boxGeometry args={[4, 0.2, 4]} />
      <meshStandardMaterial color="#1A1A1A" />
    </mesh>
  );
}
