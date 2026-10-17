import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { BIOMES } from "../public/game-data.js";
import {
  separateIslandCenters,
  islandShoreRadius,
  MIN_ISLAND_GAP,
} from "../public/world-layout.js";
import { createBiomeScene, disposeBiome } from "../public/biome-scenes.js";
import {
  newGame,
  saveGame,
  loadGame,
  findSpace,
  placeItem,
} from "../public/economy.js";

test("enlarged islands leave open space between every pair, including all four starter bridges", () => {
  assert.equal(BIOMES.length, 28);
  assert.deepEqual(BIOMES.find((b) => b.id === "moon").center, [0, 0]);
  for (let i = 0; i < BIOMES.length; i++)
    for (let j = i + 1; j < BIOMES.length; j++) {
      const a = BIOMES[i],
        b = BIOMES[j];
      const gap =
        Math.hypot(a.center[0] - b.center[0], a.center[1] - b.center[1]) -
        islandShoreRadius(a) -
        islandShoreRadius(b);
      assert.ok(gap >= MIN_ISLAND_GAP - 1e-5, `${a.id}/${b.id}: gap ${gap}`);
    }
});

test("the old moon/whale and dinosaur/lotus overlaps are resolved without changing sizes or save coordinates", () => {
  const source = [
    { id: "moon", center: [0, 0] },
    { id: "winter", center: [27, 0], radius: 16 },
    { id: "volcano", center: [-54, 27], radius: 14.8 },
    { id: "ice", center: [-54, 54], radius: 14.8 },
  ];
  const radii = source.map((b) => b.radius),
    original = structuredClone(source);
  assert.ok(27 - 11.65 - 16 < 0);
  assert.ok(27 - 14.8 * 2 < 0);
  separateIslandCenters(source);
  assert.deepEqual(
    source.map((b) => b.radius),
    radii,
  );
  assert.deepEqual(source[0].center, original[0].center);
  // Running layout again is harmless (scene rebuilds cannot expand it again).
  const once = structuredClone(source);
  separateIslandCenters(source);
  assert.deepEqual(source, once);
  let game = newGame(1770000000000);
  game.unlocked.push("winter");
  game.catPosition = { biome: "winter", x: 1.5, z: 10 };
  game.inventory.mouse = 1;
  const spot = findSpace(game, "mouse", "winter");
  assert.ok(spot);
  game = placeItem(game, "mouse", "winter", spot.x, spot.z, 0, 1770000000000);
  const before = structuredClone(game);
  const data = new Map(),
    storage = {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => data.set(k, v),
      removeItem: (k) => data.delete(k),
    };
  saveGame(storage, game);
  const saved = loadGame(storage, 1770000000000, { advance: false });
  assert.deepEqual(saved.catPosition, before.catPosition);
  assert.deepEqual(saved.placements, before.placements);
  const positions = (records) =>
    records.map(({ id, biome, type, x, z, rotation, scale }) => ({
      id,
      biome,
      type,
      x,
      z,
      rotation,
      scale,
    }));
  assert.deepEqual(positions(saved.scenery), positions(before.scenery));
  assert.equal(saved.coins, before.coins);
});

test("real navigation meshes including bevels and cliff lips stay inside the reserved shoreline", () => {
  const point = new THREE.Vector3();
  for (const b of BIOMES) {
    const island = createBiomeScene(b, { lowOnly: true });
    const base = island.userData.navigationSurface;
    assert.ok(base, b.id);
    island.updateMatrixWorld(true);
    let maximum = 0,
      count = 0;
    base.traverse((mesh) => {
      if (!mesh.isMesh) return;
      const position = mesh.geometry.getAttribute("position");
      for (let i = 0; i < position.count; i++) {
        point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
        if (point.y < -0.08) continue;
        maximum = Math.max(maximum, Math.hypot(point.x, point.z));
        count++;
      }
    });
    assert.ok(count > 0, b.id);
    assert.ok(maximum <= islandShoreRadius(b) + 0.01, `${b.id}: ${maximum}`);
    disposeBiome(island);
  }
});
