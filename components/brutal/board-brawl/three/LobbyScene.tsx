"use client";

import type { BoardBrawlPlayerState } from "@/lib/board-brawl/types";
import { avatarColor } from "@/lib/board-brawl/avatar-colors";

export function LobbyScene({ players }: { players: BoardBrawlPlayerState[] }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[5, 32]} />
        <meshStandardMaterial color="#CCFF00" transparent opacity={0.12} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[4.5, 5, 32]} />
        <meshStandardMaterial color="#CCFF00" roughness={1} />
      </mesh>
      {players.map((player, index) => {
        const angle = (index / Math.max(players.length, 1)) * Math.PI * 2;
        const x = Math.cos(angle) * 3.5;
        const z = Math.sin(angle) * 3.5;
        const color = avatarColor(player.avatarId);
        return (
          <group key={player.userId} position={[x, 0, z]}>
            <mesh position={[0, 0.15, 0]}>
              <cylinderGeometry args={[0.5, 0.55, 0.3, 6]} />
              <meshStandardMaterial color="#222" roughness={1} />
            </mesh>
            <mesh position={[0, 0.75, 0]}>
              <boxGeometry args={[0.9, 1.1, 0.9]} />
              <meshStandardMaterial
                color={color}
                emissive={player.ready ? color : "#000000"}
                emissiveIntensity={player.ready ? 0.35 : 0}
                roughness={0.9}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
