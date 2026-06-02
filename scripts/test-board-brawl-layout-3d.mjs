import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  tileIndexToWorld,
  tilePathWaypoints,
  gridToWorld,
  cellToWorld,
  pathWaypoints,
} from "../lib/board-brawl/board/layout-3d.ts";
import { generateDefaultMap } from "../lib/board-brawl/board/default-map.ts";

test("tileIndexToWorld returns plain Vec3 objects", () => {
  const p = tileIndexToWorld(0);
  assert.equal(typeof p.x, "number");
  assert.equal(typeof p.y, "number");
  assert.equal(typeof p.z, "number");
  assert.equal(Object.getPrototypeOf(p), Object.prototype);
});

test("tilePathWaypoints walks forward", () => {
  const path = tilePathWaypoints(0, 2);
  assert.equal(path.length, 2);
});

test("gridToWorld centers the grid on origin", () => {
  const center = gridToWorld(3, 3, 7, 7);
  assert.equal(center.x, 0);
  assert.equal(center.z, 0);
});

test("cellToWorld matches the legacy ring for the default map", () => {
  const map = generateDefaultMap(123);
  for (let i = 0; i < map.cells.length; i++) {
    const a = cellToWorld(map, i);
    const b = tileIndexToWorld(i);
    assert.equal(a.x, b.x);
    assert.equal(a.z, b.z);
  }
});

test("pathWaypoints walks forward and wraps", () => {
  const map = generateDefaultMap(1);
  const n = map.cells.length;
  assert.equal(pathWaypoints(map, 0, 2).length, 2);
  assert.equal(pathWaypoints(map, n - 1, 1).length, 2);
});

test("layout-3d.ts does not import three", () => {
  const src = readFileSync(new URL("../lib/board-brawl/board/layout-3d.ts", import.meta.url), "utf8");
  assert.doesNotMatch(src, /from ['"]three['"]/);
  assert.doesNotMatch(src, /from ['"]@react-three/);
});
