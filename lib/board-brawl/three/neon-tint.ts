import type { Object3D } from "three";
import { Color, Mesh, MeshStandardMaterial } from "three";

/**
 * Neon-Dungeon-Fusion tint: the low-poly models ship with a flat grey
 * DefaultMaterial. We override base color toward a slightly desaturated tint
 * and push the brutalist hue into emissive so the dungeon assets read as part
 * of the existing neon look.
 */
export function applyNeonTint(
  object: Object3D,
  hex: string,
  emissiveIntensity = 0.5
): void {
  const base = new Color(hex);
  // Desaturate the base a touch so the emissive glow reads cleanly.
  const desaturated = base.clone().lerp(new Color("#202020"), 0.45);

  const tintMaterial = (mat: unknown): MeshStandardMaterial => {
    const next =
      mat instanceof MeshStandardMaterial ? mat.clone() : new MeshStandardMaterial();
    next.color = desaturated.clone();
    next.emissive = base.clone();
    next.emissiveIntensity = emissiveIntensity;
    next.roughness = 0.85;
    next.metalness = 0.1;
    next.needsUpdate = true;
    return next;
  };

  object.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.material = Array.isArray(child.material)
      ? child.material.map(tintMaterial)
      : tintMaterial(child.material);
    child.castShadow = false;
    child.receiveShadow = false;
  });
}
