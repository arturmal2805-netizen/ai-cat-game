import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as THREE from "three";
import { BIOMES, byBiome } from "../public/game-data.js";
import { BUILDING_EXPANSIONS } from "../public/building-expansions.js";
import { BIOME_STYLES } from "../public/biome-styles.js";
import { createBiomeScene, disposeBiome } from "../public/biome-scenes.js";
import {
  newGame,
  canPlace,
  purchase,
  placeItem,
  findSpace,
  saveGame,
  loadGame,
} from "../public/economy.js";
import { xpForLevel } from "../public/progression.js";
const before = JSON.parse(
    fs.readFileSync(
      new URL("./fixtures/building-expansion-before.json", import.meta.url),
    ),
  ),
  ids = Object.keys(BUILDING_EXPANSIONS),
  now = Date.UTC(2026, 9, 18, 12);
test("only the four requested islands expand to exactly five times the original area, with every name, palette, ID, price and level retained", () => {
  assert.deepEqual(ids.sort(), ["candy", "clouds", "nature", "rainbow"]);
  assert.equal(BIOMES.length, before.length);
  for (const original of before) {
    const b = byBiome(original.id);
    if (!ids.includes(b.id)) {
      assert.deepEqual(b, original);
      continue;
    }
    const { radius, center, buildableAreaMultiplier, ...rest } = b,
      { radius: oldRadius, center: oldCenter, ...oldRest } = original;
    assert.deepEqual(rest, oldRest);
    assert.ok(Math.abs((radius / (original.radius || 11.65)) ** 2 - 5) < 1e-10);
    assert.equal(buildableAreaMultiplier, 5);
  }
  for (let i = 0; i < BIOMES.length; i++)
    for (let j = i + 1; j < BIOMES.length; j++) {
      const a = BIOMES[i],
        b = BIOMES[j];
      assert.ok(
        Math.hypot(a.center[0] - b.center[0], a.center[1] - b.center[1]) >
          (a.radius || 11.65) + (b.radius || 11.65) + 3,
        a.id + " overlaps " + b.id,
      );
    }
});
function topArea(g) {
  const p = g.attributes.position,
    n = g.attributes.normal,
    index = g.index;
  let area = 0;
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3();
  for (let i = 0; i < (index?.count || p.count); i += 3) {
    const ia = index ? index.getX(i) : i,
      ib = index ? index.getX(i + 1) : i + 1,
      ic = index ? index.getX(i + 2) : i + 2;
    if (n.getY(ia) < 0.95 || n.getY(ib) < 0.95 || n.getY(ic) < 0.95) continue;
    a.fromBufferAttribute(p, ia);
    b.fromBufferAttribute(p, ib);
    c.fromBufferAttribute(p, ic);
    area += new THREE.Triangle(a, b, c).getArea();
  }
  return area;
}
test("the rendered ground really grows while decorations stay at their normal scale; the new meadow is cosmetic and yields to building footprints", () => {
  for (const id of ids) {
    const biome = byBiome(id),
      original = before.find((b) => b.id === id),
      old = createBiomeScene(original, { scenery: [], preview: true }),
      large = createBiomeScene(biome, { scenery: [], preview: true });
    const a = topArea(old.userData.navigationSurface.children[0].geometry),
      b = topArea(large.userData.navigationSurface.children[0].geometry);
    assert.ok(b / a > 4.9 && b / a < 5.1, id + " only the preview grew");
    assert.deepEqual(large.scale.toArray(), [1, 1, 1]);
    assert.equal(
      large.userData.stats.sourceMeshes,
      old.userData.stats.sourceMeshes,
    );
    const points = [];
    large.userData.groundCover.traverse((o) => {
      if (o.userData.samples) points.push(...o.userData.samples);
    });
    assert.ok(
      points.some((p) => Math.hypot(p.x, p.z) > 18),
      id + " outer ground is missing",
    );
    assert.ok(BIOME_STYLES[id].hero);
    disposeBiome(old);
    disposeBiome(large);
  }
});
test("each expanded island accepts nine independent new businesses on the outer land and every existing/new record survives repeated saves", () => {
  const db = new Map(),
    storage = {
      getItem: (k) => db.get(k) || null,
      setItem: (k, v) => db.set(k, v),
    };
  let g = newGame(now);
  saveGame(storage, g);
  g = loadGame(storage, now, { advance: false });
  g.coins = 1000000;
  g.progression.xp = xpForLevel(20);
  for (const id of ids) if (!g.unlocked.includes(id)) g.unlocked.push(id);
  const scenery = structuredClone(g.scenery),
    old = [];
  for (const [item, biome] of [
    ["waterslide", "candy"],
    ["adoption-center", "nature"],
  ]) {
    const p = findSpace(g, item, biome);
    assert.ok(p);
    g = placeItem(purchase(g, item, now), item, biome, p.x, p.z, 0, now);
    old.push(structuredClone(g.placements.at(-1)));
  }
  for (const id of ids)
    for (const [x, z] of [
      [-18, -10],
      [-18, 0],
      [-18, 10],
      [18, -10],
      [18, 0],
      [18, 10],
      [-7, 18],
      [0, 18],
      [7, 18],
    ]) {
      assert.equal(
        canPlace(g, "business-hotdog", id, x, z).ok,
        true,
        id + " " + x + "," + z,
      );
      g = placeItem(
        purchase(g, "business-hotdog", now),
        "business-hotdog",
        id,
        x,
        z,
        0,
        now,
      );
    }
  const placements = structuredClone(g.placements),
    coins = g.coins,
    position = { biome: "rainbow", x: 18, z: 0 };
  g.catPosition = position;
  for (let i = 0; i < 20; i++) {
    saveGame(storage, g);
    g = loadGame(storage, now, { advance: false });
    assert.deepEqual(g.placements, placements);
    assert.deepEqual(g.scenery, scenery);
    assert.deepEqual(g.catPosition, position);
    assert.equal(g.coins, coins);
  }
  for (const p of old)
    assert.deepEqual(
      g.placements.find((r) => r.id === p.id),
      p,
    );
});
