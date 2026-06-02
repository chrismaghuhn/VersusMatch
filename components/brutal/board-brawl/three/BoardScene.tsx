"use client";

import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { Group, Mesh } from "three";
import type { BoardBrawlSnapshot } from "@/lib/board-brawl/types";
import type { BoardMap } from "@/lib/board-brawl/board/map-types";
import { cellToWorld, tileIndexToWorld } from "@/lib/board-brawl/board/layout-3d";
import { TILE_COLORS, avatarColor } from "@/lib/board-brawl/avatar-colors";
import {
  DRACO_PATH,
  MODEL_PATHS,
  NEON,
  TILE_PROPS,
  playerModelFor,
} from "@/lib/board-brawl/three/models";
import { applyNeonTint } from "@/lib/board-brawl/three/neon-tint";
import {
  FloorTiles,
  ModelErrorBoundary,
  TintedModel,
} from "@/components/brutal/board-brawl/three/models3d";

type BoardSceneProps = {
  snapshot: BoardBrawlSnapshot;
};

const LOW_QUALITY = process.env.NEXT_PUBLIC_BOARD_BRAWL_LOW_QUALITY === "true";

export function BoardScene({ snapshot }: BoardSceneProps) {
  const fallback = <BoardScenePrimitive snapshot={snapshot} />;
  return (
    <ModelErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <BoardSceneModels snapshot={snapshot} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

function BoardSceneModels({ snapshot }: BoardSceneProps) {
  const map = snapshot.map;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, 0]}>
        <ringGeometry args={[5.5, 11.5, 48]} />
        <meshStandardMaterial color="#202020" roughness={1} emissive="#0a0a0a" />
      </mesh>

      <FloorTiles map={map} />

      <EnvironmentRing />

      {snapshot.room.lastRoll != null &&
      (snapshot.room.phase === "board_resolve" || snapshot.room.phase === "board_turn") ? (
        <DiceThrow3D roll={snapshot.room.lastRoll} nonce={snapshot.room.turnIndex} />
      ) : null}

      {map.cells.map((cell) => {
        const prop = TILE_PROPS[cell.type];
        if (!prop) return null;
        const w = cellToWorld(map, cell.id);
        return (
          <group key={`prop-${cell.id}`} position={[w.x, 0.18, w.z]}>
            <TintedModel
              modelKey={prop.model}
              tint={prop.tint}
              intensity={prop.intensity}
              scale={0.85}
            />
            {cell.type === "shop" ? (
              <FloatingCrown />
            ) : null}
          </group>
        );
      })}

      {snapshot.players.map((player, index) => (
        <PlayerToken
          key={player.userId}
          map={map}
          targetIndex={player.position}
          modelIndex={index}
          color={avatarColor(player.avatarId)}
          isActive={player.userId === snapshot.room.activePlayerId}
        />
      ))}
    </group>
  );
}

/** Decorative dungeon ring: pillars with torches and a stone backdrop. */
function EnvironmentRing() {
  const R = 12.5;
  const pillars = useMemo(() => {
    const count = LOW_QUALITY ? 4 : 8;
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2;
      return { x: Math.cos(a) * R, z: Math.sin(a) * R, rot: -a + Math.PI / 2 };
    });
  }, []);
  return (
    <group>
      {pillars.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.rot, 0]}>
          <TintedModel modelKey="pillar01" tint={NEON.cyan} intensity={0.25} scale={1.2} />
          {i % 2 === 0 ? (
            <TintedModel
              modelKey="torch"
              tint={NEON.amber}
              intensity={0.9}
              scale={0.9}
              position={[0, 2.4, 0]}
            />
          ) : null}
        </group>
      ))}
      {!LOW_QUALITY
        ? pillars.map((p, i) => (
            <TintedModel
              key={`wall-${i}`}
              modelKey="wallStone01"
              tint={NEON.cyan}
              intensity={0.12}
              scale={1.1}
              position={[p.x * 1.12, 0, p.z * 1.12]}
              rotation={[0, p.rot, 0]}
            />
          ))
        : null}
    </group>
  );
}

/** Client-side 3D dice toss driven by the server roll. */
function DiceThrow3D({ roll, nonce }: { roll: number; nonce: number }) {
  const ref = useRef<Group>(null);
  const start = useRef<number>(0);
  const key = `${roll}-${nonce}`;
  const lastKey = useRef<string>("");

  useFrame((state) => {
    if (!ref.current) return;
    if (lastKey.current !== key) {
      lastKey.current = key;
      start.current = state.clock.elapsedTime;
    }
    const t = state.clock.elapsedTime - start.current;
    const settling = Math.min(1, t / 0.8);
    const spin = (1 - settling) * 16;
    ref.current.rotation.x = spin * 0.7 + roll;
    ref.current.rotation.y = spin;
    ref.current.position.y = 1.4 + Math.sin(settling * Math.PI) * 1.2;
  });

  return (
    <group position={[0, 0, 0]}>
      <TintedModel modelKey="diceCup" tint={NEON.lime} intensity={0.4} scale={1.1} />
      <group ref={ref} position={[0, 1.4, 0]}>
        <TintedModel modelKey="dice" tint={NEON.pink} intensity={0.7} scale={0.7} />
      </group>
    </group>
  );
}

function FloatingCrown() {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.8;
    ref.current.position.y = 1.5 + Math.sin(state.clock.elapsedTime * 2) * 0.08;
  });
  return (
    <group ref={ref} position={[0, 1.5, 0]}>
      <TintedModel modelKey="crown" tint={NEON.gold} intensity={0.9} scale={0.4} />
    </group>
  );
}

function PlayerToken({
  map,
  targetIndex,
  modelIndex,
  color,
  isActive,
}: {
  map: BoardMap;
  targetIndex: number;
  modelIndex: number;
  color: string;
  isActive: boolean;
}) {
  const modelKey = playerModelFor(modelIndex);
  const { scene } = useGLTF(MODEL_PATHS[modelKey], DRACO_PATH);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    applyNeonTint(c, color, isActive ? 0.75 : 0.35);
    return c;
  }, [scene, color, isActive]);

  const ref = useRef<Group>(null);
  const target = useMemo(() => cellToWorld(map, targetIndex), [map, targetIndex]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    const k = Math.min(1, delta * 4);
    ref.current.position.x += (target.x - ref.current.position.x) * k;
    ref.current.position.z += (target.z - ref.current.position.z) * k;
    const bob = isActive ? Math.abs(Math.sin(state.clock.elapsedTime * 4)) * 0.12 : 0;
    ref.current.position.y += (0.2 + bob - ref.current.position.y) * k;
    const facing = target.x >= 0 ? Math.PI : 0;
    ref.current.rotation.y += (facing - ref.current.rotation.y) * k;
  });

  return (
    <group ref={ref} position={[target.x, 0.2, target.z]} scale={isActive ? 0.62 : 0.55}>
      <primitive object={cloned} />
    </group>
  );
}

/** Primitive fallback (original geometry) used while models load or on error. */
function BoardScenePrimitive({ snapshot }: BoardSceneProps) {
  const tiles = snapshot.tiles;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[6, 11, 48]} />
        <meshStandardMaterial color="#252525" roughness={1} />
      </mesh>
      {tiles.map((type, index) => {
        const pos = tileIndexToWorld(index);
        const color = TILE_COLORS[type] ?? "#333333";
        const height = type === "shop" ? 0.7 : 0.45;
        return (
          <group key={index} position={[pos.x, 0, pos.z]}>
            <mesh position={[0, height / 2, 0]}>
              <boxGeometry args={[1.85, height, 1.85]} />
              <meshStandardMaterial color={color} roughness={0.9} metalness={0} />
            </mesh>
            <mesh position={[0, height + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[1.5, 1.5]} />
              <meshStandardMaterial
                color={type === "shop" ? "#CCFF00" : "#ffffff"}
                transparent
                opacity={type === "neutral" ? 0.08 : 0.2}
              />
            </mesh>
          </group>
        );
      })}
      {snapshot.players.map((player) => (
        <PlayerTokenMesh
          key={player.userId}
          targetIndex={player.position}
          color={avatarColor(player.avatarId)}
          isActive={player.userId === snapshot.room.activePlayerId}
        />
      ))}
    </group>
  );
}

function PlayerTokenMesh({
  targetIndex,
  color,
  isActive,
}: {
  targetIndex: number;
  color: string;
  isActive: boolean;
}) {
  const ref = useRef<Mesh>(null);
  const target = useMemo(() => tileIndexToWorld(targetIndex), [targetIndex]);

  useFrame((_state, delta) => {
    if (!ref.current) return;
    const y = isActive ? 0.85 : 0.65;
    ref.current.position.x += (target.x - ref.current.position.x) * Math.min(1, delta * 4);
    ref.current.position.y += (y - ref.current.position.y) * Math.min(1, delta * 4);
    ref.current.position.z += (target.z - ref.current.position.z) * Math.min(1, delta * 4);
  });

  return (
    <mesh ref={ref} position={[target.x, 0.65, target.z]}>
      <capsuleGeometry args={[0.28, 0.55, 4, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={isActive ? color : "#111111"}
        emissiveIntensity={isActive ? 0.55 : 0.1}
        roughness={0.8}
      />
    </mesh>
  );
}
