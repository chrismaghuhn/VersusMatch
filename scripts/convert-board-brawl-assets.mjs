/**
 * Board Brawl asset conversion: FBX -> glb (Draco), neon-dungeon hot set.
 *
 * PREREQUISITE (one-time): the FBX2glTF standalone binary must exist at
 *   tools/FBX2glTF.exe  (Windows)  or  tools/FBX2glTF  (macOS/Linux).
 * Download from https://github.com/facebookincubator/FBX2glTF/releases
 * (v0.9.7 used here). The tools/ dir is git-ignored.
 *
 * Models are converted WITHOUT textures (the source FBX carry UVs but no
 * embedded texture references). Board Brawl uses a flat neon-tinted look:
 * base/emissive colors come from lib/board-brawl/three/models.ts (TINT_MAP)
 * applied at runtime via applyNeonTint(). Texture-baking is a possible future
 * enhancement and is intentionally out of scope here.
 *
 * Usage:  node scripts/convert-board-brawl-assets.mjs
 * Output: public/board-brawl/models/<name>.glb  (Draco-compressed)
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";

const ROOT = resolve(import.meta.dirname, "..");
const RPG = join(
  ROOT,
  "assets",
  "LowPoly_Pixel_RPG_Assets_devilsworkshop_v02",
  "3D",
  "FBX"
);
const DICECUP = join(ROOT, "assets", "diceCup_standardv1.1", "diceCup_standard");
const OUT_DIR = join(ROOT, "public", "board-brawl", "models");

const BIN = process.platform === "win32"
  ? join(ROOT, "tools", "FBX2glTF.exe")
  : join(ROOT, "tools", "FBX2glTF");

/** model output name -> source .fbx absolute path */
const HOT_SET = {
  // tiles
  ground01: join(RPG, "ground01.fbx"),
  ground01Cracked: join(RPG, "ground01Cracked.fbx"),
  ground02: join(RPG, "ground02.fbx"),
  // tile props
  arch: join(RPG, "arch.fbx"),
  chestA: join(RPG, "chestA.fbx"),
  torch: join(RPG, "torch.fbx"),
  gem: join(RPG, "gem.fbx"),
  crown: join(RPG, "crown.fbx"),
  coin: join(RPG, "coin.fbx"),
  // dice
  dice: join(RPG, "dice.fbx"),
  diceCup: join(DICECUP, "diceCup_standard.fbx"),
  // players
  char01: join(RPG, "char01.fbx"),
  char02: join(RPG, "char02.fbx"),
  char03: join(RPG, "char03.fbx"),
  char04: join(RPG, "char04.fbx"),
  // environment
  pillar01: join(RPG, "pillar01.fbx"),
  wallStone01: join(RPG, "wallStone01.fbx"),
  // minigame props
  shield: join(RPG, "shield.fbx"),
  skull: join(RPG, "skull.fbx"),
  flagA: join(RPG, "flagA.fbx"),
};

function main() {
  if (!existsSync(BIN)) {
    console.error(`FBX2glTF binary not found at ${BIN}.`);
    console.error("Download it from https://github.com/facebookincubator/FBX2glTF/releases into tools/.");
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  let ok = 0;
  let skipped = 0;
  for (const [name, src] of Object.entries(HOT_SET)) {
    if (!existsSync(src)) {
      console.warn(`SKIP ${name}: source missing (${src})`);
      skipped++;
      continue;
    }
    const out = join(OUT_DIR, name);
    execFileSync(BIN, ["-i", src, "-o", out, "--binary", "--draco"], {
      stdio: ["ignore", "ignore", "inherit"],
    });
    console.log(`OK   ${name}.glb`);
    ok++;
  }
  console.log(`\nDone: ${ok} converted, ${skipped} skipped -> ${OUT_DIR}`);
}

main();
