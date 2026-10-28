import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as THREE from "three";
import { BIOMES as REGISTERED_BIOMES, byBiome } from "../public/game-data.js";
// Preserve the released-island snapshot; new magical farms have independent coverage.
const BIOMES = REGISTERED_BIOMES.filter(b => !b.magicFarm);
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
  footprint,
  storeItem,
  plantCrop,
} from "../public/economy.js";
import { mergeSharedWorld } from "../shared-world.mjs";
import { xpForLevel } from "../public/progression.js";
const before = JSON.parse(
    fs.readFileSync(
      new URL("./fixtures/building-expansion-before.json", import.meta.url),
    ),
  ),
  ids = Object.keys(BUILDING_EXPANSIONS).filter(id=>byBiome(id)),
  now = Date.UTC(2026, 9, 18, 12);
test("surviving expanded islands retain their area and themes after the requested map consolidation", () => {
  assert.deepEqual(ids.sort(), ["candy"]);
  assert.equal(BIOMES.length, before.filter(b=>byBiome(b.id)).length + 3);
  for(const original of before.filter(b=>byBiome(b.id))){
    const b=byBiome(original.id), {radius,center,buildableAreaMultiplier,...rest}=b,
      {radius:oldRadius,center:oldCenter,...oldRest}=original;
    assert.deepEqual(rest,oldRest);
    if(ids.includes(b.id)){
      assert.ok(Math.abs((radius/(original.radius||11.65))**2-5)<1e-10);
      assert.equal(buildableAreaMultiplier,5);
    }else if(b.id!=='homestead')assert.equal(radius,oldRadius);
  }
});

function cachedSmallIslandClient(game) {
  const raw = structuredClone(game);
  raw.placements = raw.placements.filter((p) => {
    const old = BUILDING_EXPANSIONS[p.biome];
    if (!old) return true;
    const [w, d] = footprint(p.item, p.rotation);
    return (
      Math.hypot(Math.abs(p.x) + w / 2, Math.abs(p.z) + d / 2) <=
      old.originalRadius - 0.7
    );
  });
  return loadGame(
    { getItem: (k) => (k === "chichi-world-v2" ? JSON.stringify(raw) : null) },
    now,
    { advance: false },
  );
}
function expansionGame() {
  let g = newGame(now);
  g.coins = 1000000;
  g.progression.xp = xpForLevel(20);
  for (const id of ids) if (!g.unlocked.includes(id)) g.unlocked.push(id);
  return g;
}
test("a cached pre-expansion phone cannot erase outer-land buildings, upgrade tiers, income or crops from the shared world", () => {
  let base = expansionGame();
  for (const id of ids) {
    base = placeItem(
      purchase(base, "business-hotdog", now),
      "business-hotdog",
      id,
      18,
      0,
      0,
      now,
    );
    const business = base.placements.at(-1);
    business.readyAt = 0;
    base.business.levels[business.id] = 3;
    base = placeItem(
      purchase(base, "farm-field", now),
      "farm-field",
      id,
      -18,
      0,
      0,
      now,
    );
    const farm = base.placements.at(-1);
    farm.readyAt = 0;
    base = plantCrop(base, farm.id, 0, "wheat", now);
  }
  const incoming = cachedSmallIslandClient(base),
    current = structuredClone(base),
    protectedIds = base.placements
      .filter((p) => ids.includes(p.biome))
      .map((p) => p.id);
  assert.ok(
    protectedIds.every((id) => !incoming.placements.some((p) => p.id === id)),
    "reproduce the old phone's actual shoreline filtering and load normalization",
  );
  current.coins += 17;
  current.totalEarned += 17;
  const harvested = current.placements.find(
    (p) => p.item === "farm-field" && ids.includes(p.biome),
  );
  current.farm.fields[harvested.id][0] = { crop: null, readyAt: 0 };
  current.farm.stock.wheat = (current.farm.stock.wheat || 0) + 1;
  for (const id of protectedIds)
    if (current.business.accounts[id])
      current.business.accounts[id] = {
        collectedAt: now + 1000,
        xpRemainder: 0.25,
      };
  let result = mergeSharedWorld(base, current, incoming);
  for (let pass = 0; pass < 10; pass++) {
    assert.deepEqual(result.placements, current.placements);
    assert.deepEqual(result.business.accounts, current.business.accounts);
    assert.deepEqual(result.business.levels, current.business.levels);
    assert.deepEqual(result.farm.fields, current.farm.fields);
    assert.equal(result.coins, current.coins);
    assert.equal(result.progression.xp, current.progression.xp);
    result = mergeSharedWorld(result, result, cachedSmallIslandClient(result));
  }
});
test("expanded-plot protection permits genuine storage, replacement and a stored inner building alongside a clipped outer purchase", () => {
  let base = expansionGame();
  base = placeItem(
    purchase(base, "business-hotdog", now),
    "business-hotdog",
    "candy",
    18,
    0,
    0,
    now,
  );
  const outer = base.placements.at(-1);
  outer.readyAt = 0;
  let stored = storeItem(base, outer.id, now),
    merged = mergeSharedWorld(base, base, stored);
  assert.ok(!merged.placements.some((p) => p.id === outer.id));
  assert.equal(merged.inventory[outer.item], 1);
  const stale = cachedSmallIslandClient(base),
    concurrentlyStored = mergeSharedWorld(base, stored, stale);
  assert.ok(
    !concurrentlyStored.placements.some((p) => p.id === outer.id),
    "a real store on the other phone must not be resurrected",
  );
  assert.equal(concurrentlyStored.inventory[outer.item], 1);
  const replaced = placeItem(stored, outer.item, "candy", -18, 0, 0, now);
  merged = mergeSharedWorld(base, base, replaced);
  assert.ok(!merged.placements.some((p) => p.id === outer.id));
  assert.equal(
    merged.placements.filter((p) => p.item === outer.item).length,
    1,
  );
  assert.equal(merged.inventory[outer.item], 0);
  assert.deepEqual(
    mergeSharedWorld(base, replaced, stale).placements,
    replaced.placements,
    "the other phone's replacement keeps its new ID without duplicating the old plot",
  );
  const space = findSpace(base, outer.item, "candy");
  base = placeItem(
    purchase(base, outer.item, now),
    outer.item,
    "candy",
    space.x,
    space.z,
    0,
    now,
  );
  const inner = base.placements.at(-1);
  inner.readyAt = 0;
  stored = storeItem(base, inner.id, now);
  merged = mergeSharedWorld(base, base, cachedSmallIslandClient(stored));
  assert.ok(merged.placements.some((p) => p.id === outer.id));
  assert.ok(!merged.placements.some((p) => p.id === inner.id));
  assert.equal(merged.inventory[outer.item], 1);
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
    ["adoption-center", "candy"],
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
    position = { biome: "candy", x: 18, z: 0 };
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
