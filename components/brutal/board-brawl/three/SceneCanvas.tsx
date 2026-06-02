"use client";

import { Canvas } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import type { BoardBrawlPhase, BoardBrawlSnapshot } from "@/lib/board-brawl/types";
import { CameraRig } from "@/components/brutal/board-brawl/three/CameraRig";
import { BoardScene } from "@/components/brutal/board-brawl/three/BoardScene";
import { LobbyScene } from "@/components/brutal/board-brawl/three/LobbyScene";
import { FinaleScene } from "@/components/brutal/board-brawl/three/FinaleScene";
import { MinigameSceneRouter } from "@/components/brutal/board-brawl/three/minigames/MinigameSceneRouter";
import { preloadBoardBrawlModels } from "@/lib/board-brawl/three/models";

type SceneCanvasProps = {
  phase: BoardBrawlPhase;
  snapshot: BoardBrawlSnapshot;
  onMinigameInput?: (type: string, payload: Record<string, unknown>) => void;
};

const lowQuality = process.env.NEXT_PUBLIC_BOARD_BRAWL_LOW_QUALITY === "true";

preloadBoardBrawlModels();

export function SceneCanvas({ phase, snapshot, onMinigameInput }: SceneCanvasProps) {
  const dpr: [number, number] = lowQuality ? [0.75, 1] : [1, 1.5];

  return (
    <Canvas className="h-full w-full" dpr={dpr} gl={{ antialias: !lowQuality, alpha: false }}>
      <color attach="background" args={["#141414"]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[12, 24, 8]} intensity={1.05} />
      <directionalLight position={[-8, 12, -6]} intensity={0.35} />
      {!lowQuality ? <pointLight position={[0, 6, 0]} intensity={0.6} color="#CCFF00" distance={26} /> : null}
      <CameraRig phase={phase} minigameId={snapshot.room.minigameId} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[48, 48]} />
        <meshStandardMaterial color="#1c1c1c" roughness={1} />
      </mesh>
      <Grid
        args={[48, 48]}
        cellSize={1}
        cellThickness={0.4}
        sectionSize={4}
        sectionThickness={0.8}
        fadeDistance={40}
        fadeStrength={1}
        cellColor="#2a2a2a"
        sectionColor="#CCFF00"
        position={[0, 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      {phase === "waiting" ? <LobbyScene players={snapshot.players} /> : null}
      {phase === "board_turn" || phase === "board_resolve" ? (
        <BoardScene snapshot={snapshot} />
      ) : null}
      {phase === "minigame" ? (
        <MinigameSceneRouter snapshot={snapshot} onInput={onMinigameInput} />
      ) : null}
      {phase === "minigame_results" ? (
        <MinigameSceneRouter snapshot={snapshot} />
      ) : null}
      {phase === "finished" ? <FinaleScene players={snapshot.players} /> : null}
    </Canvas>
  );
}
