import assert from "node:assert/strict";
import { test } from "node:test";
import {
  generateDefaultMap,
  defaultRingLength,
  ringCoords,
} from "../lib/board-brawl/board/default-map.ts";
import { buildTileLayout } from "../lib/board-brawl/board/tiles.ts";
import { BOARD_TILE_COUNT } from "../lib/board-brawl/constants.ts";
import { parseBoardMap } from "../lib/board-brawl/board/parse-map.ts";

test("default ring length equals gameplay tile count", () => {
  assert.equal(defaultRingLength(), BOARD_TILE_COUNT);
});

test("ringCoords are unique perimeter cells in path order", () => {
  const coords = ringCoords();
  assert.equal(coords.length, BOARD_TILE_COUNT);
  const seen = new Set(coords.map((c) => `${c.gridX},${c.gridY}`));
  assert.equal(seen.size, coords.length);
});

test("generateDefaultMap tile types match buildTileLayout exactly", () => {
  for (const seed of [0, 1, 42, 123, 999999]) {
    const map = generateDefaultMap(seed);
    const layout = buildTileLayout(seed);
    assert.equal(map.cells.length, layout.length);
    for (let i = 0; i < layout.length; i++) {
      assert.equal(map.cells[i].id, i);
      assert.equal(map.cells[i].type, layout[i]);
    }
  }
});

test("parseBoardMap accepts a valid default map round-trip", () => {
  const map = generateDefaultMap(7);
  const parsed = parseBoardMap(JSON.parse(JSON.stringify(map)));
  assert.ok(parsed);
  assert.equal(parsed.cells.length, map.cells.length);
  assert.equal(parsed.startId, map.startId);
});

test("parseBoardMap rejects malformed definitions", () => {
  assert.equal(parseBoardMap(null), null);
  assert.equal(parseBoardMap({}), null);
  assert.equal(parseBoardMap({ version: 2, name: "x", width: 7, height: 7, startId: 0, cells: [] }), null);
  assert.equal(
    parseBoardMap({ version: 1, name: "x", width: 7, height: 7, startId: 0, cells: [] }),
    null
  );
  // cell out of grid bounds
  assert.equal(
    parseBoardMap({
      version: 1,
      name: "x",
      width: 2,
      height: 2,
      startId: 0,
      cells: [{ id: 0, gridX: 9, gridY: 0, type: "plus" }],
    }),
    null
  );
  // non-monotonic ids
  assert.equal(
    parseBoardMap({
      version: 1,
      name: "x",
      width: 2,
      height: 2,
      startId: 0,
      cells: [{ id: 5, gridX: 0, gridY: 0, type: "plus" }],
    }),
    null
  );
  // bad tile type
  assert.equal(
    parseBoardMap({
      version: 1,
      name: "x",
      width: 2,
      height: 2,
      startId: 0,
      cells: [{ id: 0, gridX: 0, gridY: 0, type: "lava" }],
    }),
    null
  );
});
