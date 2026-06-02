"use client";

import { Suspense } from "react";
import { NEON } from "@/lib/board-brawl/three/models";
import {
  ModelErrorBoundary,
  TintedModel,
} from "@/components/brutal/board-brawl/three/models3d";

type PrecisionAimArenaProps = {
  state: Record<string, unknown>;
  onInput?: (type: string, payload: Record<string, unknown>) => void;
};

type Target = { id: string; x: number; y: number; z: number; decoy: boolean; hit: boolean };

export function PrecisionAimArena({ state, onInput }: PrecisionAimArenaProps) {
  const targets = (state.targets as Target[]) ?? [];

  return (
    <group>
      {targets
        .filter((t) => !t.hit)
        .map((target) => {
          const handleClick = (e: { stopPropagation: () => void }) => {
            e.stopPropagation();
            onInput?.("aim", {
              targetId: target.id,
              worldPoint: { x: target.x, y: target.y, z: target.z },
            });
          };
          const tint = target.decoy ? NEON.pink : NEON.lime;
          const primitive = (
            <mesh onClick={handleClick}>
              <boxGeometry args={[0.8, 0.8, 0.8]} />
              <meshStandardMaterial color={tint} roughness={1} />
            </mesh>
          );
          return (
            <group key={target.id} position={[target.x, target.y, target.z]} onClick={handleClick}>
              <ModelErrorBoundary fallback={primitive}>
                <Suspense fallback={primitive}>
                  <TintedModel
                    modelKey={target.decoy ? "skull" : "shield"}
                    tint={tint}
                    intensity={0.7}
                    scale={0.9}
                  />
                </Suspense>
              </ModelErrorBoundary>
            </group>
          );
        })}
    </group>
  );
}
