"use client";

import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { BoardBrawlPlayerState } from "@/lib/board-brawl/types";
import { resolveWinners } from "@/lib/board-brawl/match/win-condition";
import { avatarColor } from "@/lib/board-brawl/avatar-colors";
import { NEON, playerModelFor } from "@/lib/board-brawl/three/models";
import {
  ModelErrorBoundary,
  TintedModel,
} from "@/components/brutal/board-brawl/three/models3d";

export function FinaleScene({ players }: { players: BoardBrawlPlayerState[] }) {
  const fallback = <FinalePrimitive players={players} />;
  return (
    <ModelErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <FinaleModels players={players} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

function FinaleModels({ players }: { players: BoardBrawlPlayerState[] }) {
  const { winnerIds } = resolveWinners(players);
  const sorted = useMemo(
    () => [...players].sort((a, b) => b.stars - a.stars || b.coins - a.coins),
    [players]
  );
  // Podium order: winner center, runners-up at the sides.
  const slots = [1, 0, 2];

  return (
    <group>
      {sorted.slice(0, 3).map((player, index) => {
        const slot = slots[index] ?? index;
        const x = (slot - 1) * 2.6;
        const height = index === 0 ? 1.4 : index === 1 ? 1.0 : 0.7;
        const isWinner = winnerIds.includes(player.userId);
        return (
          <group key={player.userId} position={[x, 0, 0]}>
            {/* Podium block from a tinted pillar */}
            <TintedModel
              modelKey="pillar01"
              tint={isWinner ? NEON.gold : NEON.cyan}
              intensity={isWinner ? 0.5 : 0.2}
              scale={[1.1, height, 1.1]}
            />
            {/* Champion figure */}
            <TintedModel
              modelKey={playerModelFor(index)}
              tint={avatarColor(player.avatarId)}
              intensity={isWinner ? 0.8 : 0.35}
              scale={0.6}
              position={[0, height * 1.9, 0]}
            />
            {isWinner ? <SpinningCrown y={height * 1.9 + 1.1} /> : null}
          </group>
        );
      })}
    </group>
  );
}

function SpinningCrown({ y }: { y: number }) {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 1.2;
    ref.current.position.y = y + Math.sin(state.clock.elapsedTime * 2) * 0.1;
  });
  return (
    <group ref={ref} position={[0, y, 0]}>
      <TintedModel modelKey="crown" tint={NEON.gold} intensity={1} scale={0.5} />
    </group>
  );
}

function FinalePrimitive({ players }: { players: BoardBrawlPlayerState[] }) {
  const { winnerIds } = resolveWinners(players);
  const sorted = [...players].sort((a, b) => b.stars - a.stars || b.coins - a.coins);
  return (
    <group>
      {sorted.slice(0, 3).map((player, index) => {
        const x = (index - 1) * 2.5;
        const isWinner = winnerIds.includes(player.userId);
        return (
          <mesh key={player.userId} position={[x, 0.5 + index * 0.3, 0]}>
            <boxGeometry args={[1, 1 + index * 0.4, 1]} />
            <meshStandardMaterial
              color={avatarColor(player.avatarId)}
              emissive={isWinner ? "#CCFF00" : "#000000"}
              emissiveIntensity={isWinner ? 0.5 : 0}
              roughness={1}
            />
          </mesh>
        );
      })}
    </group>
  );
}
