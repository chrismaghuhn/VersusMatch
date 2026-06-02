"use client";

import { Component, useLayoutEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import {
  Color,
  type BufferGeometry,
  type InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";
import type { ThreeElements } from "@react-three/fiber";

type GroupProps = ThreeElements["group"];
import { DRACO_PATH, MODEL_PATHS, TILE_VISUALS, type ModelKey } from "@/lib/board-brawl/three/models";
import { applyNeonTint } from "@/lib/board-brawl/three/neon-tint";
import { cellToWorld } from "@/lib/board-brawl/board/layout-3d";
import type { BoardMap } from "@/lib/board-brawl/board/map-types";
import type { TileType } from "@/lib/board-brawl/types";

/**
 * Catches glb load/parse errors so the board falls back to primitive geometry
 * instead of blanking the canvas.
 */
export class ModelErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Loads a glb, returns a neon-tinted deep clone (memoized). */
export function TintedModel({
  modelKey,
  tint,
  intensity = 0.5,
  ...groupProps
}: { modelKey: ModelKey; tint: string; intensity?: number } & GroupProps) {
  const { scene } = useGLTF(MODEL_PATHS[modelKey], DRACO_PATH);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    applyNeonTint(c, tint, intensity);
    return c;
  }, [scene, tint, intensity]);
  return (
    <group {...groupProps}>
      <primitive object={cloned} />
    </group>
  );
}

/** First mesh geometry + a tinted standard material extracted from a model. */
function useFloorMesh(modelKey: ModelKey, tint: string, intensity: number) {
  const { scene } = useGLTF(MODEL_PATHS[modelKey], DRACO_PATH);
  return useMemo(() => {
    let geometry: BufferGeometry | null = null;
    scene.traverse((child) => {
      if (!geometry && child instanceof Mesh) geometry = child.geometry;
    });
    const base = new Color(tint);
    const material = new MeshStandardMaterial({
      color: base.clone().lerp(new Color("#202020"), 0.45),
      emissive: base.clone(),
      emissiveIntensity: intensity,
      roughness: 0.9,
      metalness: 0.05,
    });
    return { geometry: geometry as BufferGeometry | null, material };
  }, [scene, tint, intensity]);
}

const M = new Matrix4();
const POS = new Vector3();
const ROT = new Quaternion();
const SCALE = new Vector3(1, 1, 1);

/** Instanced floor tiles for a single TileType. */
function FloorInstances({ map, type }: { map: BoardMap; type: TileType }) {
  const visual = TILE_VISUALS[type];
  const cells = useMemo(() => map.cells.filter((c) => c.type === type), [map, type]);
  const { geometry, material } = useFloorMesh(visual.model, visual.tint, visual.intensity);
  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const inst = ref.current;
    if (!inst) return;
    cells.forEach((cell, i) => {
      const w = cellToWorld(map, cell.id);
      POS.set(w.x, 0, w.z);
      M.compose(POS, ROT, SCALE);
      inst.setMatrixAt(i, M);
    });
    inst.instanceMatrix.needsUpdate = true;
  }, [cells, map]);

  if (!geometry || cells.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, cells.length]}
      castShadow={false}
      receiveShadow={false}
    />
  );
}

const TILE_TYPES: TileType[] = ["plus", "minus", "shop", "item", "event", "luck", "neutral"];

/** All floor tiles of the map, instanced per type. */
export function FloorTiles({ map }: { map: BoardMap }) {
  return (
    <group>
      {TILE_TYPES.map((type) => (
        <FloorInstances key={type} map={map} type={type} />
      ))}
    </group>
  );
}
