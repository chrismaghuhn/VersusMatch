"use client";

import { Suspense } from "react";
import { NEON } from "@/lib/board-brawl/three/models";
import {
  ModelErrorBoundary,
  TintedModel,
} from "@/components/brutal/board-brawl/three/models3d";

type RelayDashArenaProps = {
  state: Record<string, unknown>;
  onInput?: (type: string, payload: Record<string, unknown>) => void;
};

export function RelayDashArena({ state, onInput }: RelayDashArenaProps) {
  const progress = (state.progress as Record<string, number>) ?? {};
  const entries = Object.entries(progress);

  return (
    <group>
      <mesh position={[-2, 0.1, 0]}>
        <boxGeometry args={[1, 0.2, 8]} />
        <meshStandardMaterial color={NEON.lime} emissive={NEON.lime} emissiveIntensity={0.2} roughness={1} />
      </mesh>
      <mesh position={[2, 0.1, 0]}>
        <boxGeometry args={[1, 0.2, 8]} />
        <meshStandardMaterial color={NEON.pink} emissive={NEON.pink} emissiveIntensity={0.2} roughness={1} />
      </mesh>

      {/* Finish-line flags */}
      <FinishFlag x={-2} tint={NEON.lime} />
      <FinishFlag x={2} tint={NEON.pink} />

      {entries.map(([id, pct], index) => {
        const lane = index % 2 === 0 ? -2 : 2;
        const z = -3 + (pct / 100) * 6;
        return (
          <mesh key={id} position={[lane, 0.5, z]}>
            <capsuleGeometry args={[0.2, 0.4, 4, 8]} />
            <meshStandardMaterial
              color={lane < 0 ? NEON.lime : NEON.pink}
              emissive={lane < 0 ? NEON.lime : NEON.pink}
              emissiveIntensity={0.3}
              roughness={1}
            />
          </mesh>
        );
      })}
      <mesh visible={false} onClick={() => onInput?.("boost", {})}>
        <boxGeometry args={[20, 10, 20]} />
      </mesh>
    </group>
  );
}

function FinishFlag({ x, tint }: { x: number; tint: string }) {
  const primitive = (
    <mesh position={[0, 1, 0]}>
      <boxGeometry args={[0.1, 2, 0.1]} />
      <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.4} />
    </mesh>
  );
  return (
    <group position={[x, 0, 3.6]}>
      <ModelErrorBoundary fallback={primitive}>
        <Suspense fallback={primitive}>
          <TintedModel modelKey="flagA" tint={tint} intensity={0.7} scale={1.1} />
        </Suspense>
      </ModelErrorBoundary>
    </group>
  );
}
