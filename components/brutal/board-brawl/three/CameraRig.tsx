"use client";

import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import type { BoardBrawlPhase } from "@/lib/board-brawl/types";
import { getMinigameById } from "@/lib/board-brawl/minigames/registry";

const PRESETS: Record<
  Exclude<BoardBrawlPhase, "minigame" | "minigame_results">,
  { position: [number, number, number]; zoom: number }
> = {
  waiting: { position: [14, 18, 14], zoom: 26 },
  board_turn: { position: [16, 22, 16], zoom: 30 },
  board_resolve: { position: [16, 22, 16], zoom: 30 },
  round_end: { position: [16, 22, 16], zoom: 30 },
  finished: { position: [12, 16, 12], zoom: 28 },
};

function CameraLookAtOrigin() {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  });
  return null;
}

type CameraRigProps = {
  phase: BoardBrawlPhase;
  minigameId: string | null;
};

export function CameraRig({ phase, minigameId }: CameraRigProps) {
  if (phase === "minigame" || phase === "minigame_results") {
    const game = minigameId ? getMinigameById(minigameId) : null;
    const preset = game?.cameraPreset ?? { position: { x: 0, y: 10, z: 10 }, zoom: 28 };
    return (
      <>
        <OrthographicCamera
          makeDefault
          position={[preset.position.x, preset.position.y, preset.position.z]}
          zoom={preset.zoom}
          near={0.1}
          far={200}
        />
        <CameraLookAtOrigin />
      </>
    );
  }

  const preset = PRESETS[phase as keyof typeof PRESETS] ?? PRESETS.board_turn;
  return (
    <>
      <OrthographicCamera
        makeDefault
        position={preset.position}
        zoom={preset.zoom}
        near={0.1}
        far={200}
      />
      <CameraLookAtOrigin />
    </>
  );
}
