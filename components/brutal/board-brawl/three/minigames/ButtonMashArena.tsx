"use client";

type ButtonMashArenaProps = {
  state: Record<string, unknown>;
  onInput?: (type: string, payload: Record<string, unknown>) => void;
};

export function ButtonMashArena({ state, onInput }: ButtonMashArenaProps) {
  const taps = (state.taps as Record<string, number>) ?? {};

  return (
    <group>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[3, 0.4, 3]} />
        <meshStandardMaterial color="#CCFF00" roughness={1} />
      </mesh>
      {Object.entries(taps).map(([id], index) => {
        const angle = (index / Math.max(Object.keys(taps).length, 1)) * Math.PI * 2;
        const scale = 0.5 + (taps[id] ?? 0) * 0.02;
        return (
          <mesh key={id} position={[Math.cos(angle) * 3, scale, Math.sin(angle) * 3]}>
            <capsuleGeometry args={[0.2, 0.4, 4, 8]} />
            <meshStandardMaterial color="#FF2D87" roughness={1} />
          </mesh>
        );
      })}
      <mesh
        position={[0, 1, 0]}
        visible={false}
        onClick={() => onInput?.("tap", {})}
      >
        <boxGeometry args={[10, 10, 10]} />
      </mesh>
    </group>
  );
}
