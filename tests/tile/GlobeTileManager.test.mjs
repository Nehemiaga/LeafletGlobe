import test from "node:test";
import assert from "node:assert/strict";

import { GlobeTileManager } from "../../dist/tile/GlobeTileManager.js";

test("GlobeTileManager selects a bounded set of visible tiles", () => {
  const manager = new GlobeTileManager({ subdivision: 8 });
  const tiles = manager.getVisibleTiles({ zoom: 2, center: { lat: 0, lng: 0 } });
  assert.ok(tiles.length > 0);
  assert.ok(tiles.every((tile) => tile.z === 2));
});

test("GlobeTileManager builds tile mesh geometry with indices", () => {
  const manager = new GlobeTileManager({ subdivision: 4 });
  const mesh = manager.buildTileMesh({ z: 1, x: 1, y: 0 });
  assert.ok(mesh.positions.length > 0);
  assert.ok(mesh.uvs.length > 0);
  assert.ok(mesh.indices.length > 0);
});

