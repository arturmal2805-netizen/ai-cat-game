import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as THREE from "three";
import {
  BIOMES,
  NEIGHBORS,
  byBiome,
  biomeReservations,
} from "../public/game-data.js";
import { ADOPTION_CATS, BREEDS, catAppearance } from "../public/cat-breeds.js";
import {
  EXTRA_CATS,
  NEW_TINY_CATS,
  NEW_ADULT_CATS,
  NEW_MAGIC_CATS,
  TINY_CAT_SIZE,
} from "../public/cat-expansion.js";
import { createCat, animateCat, disposeCat } from "../public/cat-model.js";
import { createBiomeScene, disposeBiome } from "../public/biome-scenes.js";
import {
  newGame,
  unlockBiome,
  purchase,
  placeItem,
  canPlace,
  findSpace,
  moveScenery,
  saveGame,
  loadGame,
  worldSnapshot,
} from "../public/economy.js";
import { adoptCat } from "../public/adoption.js";
import { activeCats } from "../public/cat-roster.js";
import { completeResidentAction } from "../public/resident-actions.js";
import { permanentObjects } from "../public/world-objects.js";
import { xpForLevel, levelForXP } from "../public/progression.js";
import { mergeSharedWorld } from "../shared-world.mjs";
import { validateState } from "../ai.mjs";
const now = Date.UTC(2026, 9, 17),
  memory = () => {
    const m = new Map();
    return { getItem: (k) => m.get(k) || null, setItem: (k, v) => m.set(k, v) };
  };
function prepared() {
  let g = newGame(now);
  g.coins = 2000000;
  g.progression.xp = xpForLevel(20);
  g = unlockBiome(g, "homestead", now);
  return g;
}
test("the expanded 384-area blank island is appended without changing any of the 26 approved islands", () => {
  assert.deepEqual(
    BIOMES.filter(
      (b) => !["homestead", "aquarium", "jobcity", "cat-homes"].includes(b.id),
    ),
    JSON.parse(
      fs.readFileSync(
        new URL("./fixtures/homestead-unaffected-biomes.json", import.meta.url),
      ),
    ),
  );
  assert.ok(
    Math.abs(byBiome("homestead").radius ** 2 / 11.65 ** 2 - 384) < 1e-10,
  );
  const g = prepared();
  assert.deepEqual(
    g.scenery.filter((s) => s.biome === "homestead"),
    [],
  );
  assert.deepEqual(permanentObjects(["homestead"]), []);
  assert.deepEqual(biomeReservations("homestead"), []);
  assert.ok(activeCats(g).filter((c) => c.biome === "homestead").length > 0);
});
test("ground cover never reserves building land, real buildings fit throughout the lawn and remain after reload", () => {
  let g = prepared();
  const db = memory();
  for (const [x, z] of [
    [0, 0],
    [30, 0],
    [-30, 0],
    [0, 30],
    [0, -30],
    [23, 23],
    [-23, -23],
  ]) {
    assert.ok(canPlace(g, "business-hotdog", "homestead", x, z).ok);
    g = placeItem(
      purchase(g, "business-hotdog", now),
      "business-hotdog",
      "homestead",
      x,
      z,
      0,
      now,
    );
  }
  const records = structuredClone(g.placements),
    coins = g.coins;
  for (let i = 0; i < 25; i++) {
    assert.ok(saveGame(db, g));
    g = loadGame(db, now, { advance: false });
    assert.deepEqual(g.placements, records);
    assert.equal(g.coins, coins);
  }
  const island = createBiomeScene(byBiome("homestead"), {
    placements: g.placements,
    scenery: [],
  });
  assert.equal(island.userData.emptyPlot, true);
  const samples = [];
  island.traverse((o) => {
    if (o.userData.samples) samples.push(...o.userData.samples);
  });
  assert.ok(samples.length > 100);
  for (const s of samples)
    for (const p of records.filter((p) => p.biome === "homestead"))
      assert.ok(
        Math.abs(s.x - p.x) > 2.5 || Math.abs(s.z - p.z) > 2.5,
        "flowers yield to actual business footprint",
      );
  disposeBiome(island);
});
test("space finding uses the outer building area and transferred trees still work on the empty island", () => {
  let g = prepared();
  // Occupy the old +/-17 search square with real footprints.
  for (let x = -18; x <= 18; x += 4)
    for (let z = -18; z <= 18; z += 4)
      g.placements.push({
        id: `occupied-${x}-${z}`,
        item: "business-hotdog",
        biome: "homestead",
        x,
        z,
        rotation: 0,
      });
  const p = findSpace(g, "business-hotdog", "homestead");
  assert.ok(p);
  assert.ok(Math.max(Math.abs(p.x), Math.abs(p.z)) > 17);
  const tree = g.scenery.find(
    (s) => s.biome === "moon" && s.type.startsWith("scenery-tree-"),
  );
  const target = findSpace(g, tree.type, "homestead", 0, tree.id);
  assert.ok(target);
  g = moveScenery(g, tree.id, "homestead", target.x, target.z, 0);
  const island = createBiomeScene(byBiome("homestead"), {
    scenery: g.scenery.filter((s) => s.biome === "homestead"),
  });
  assert.ok(island.userData.sceneryObjects.has(tree.id));
  disposeBiome(island);
});
test("60 additional cats include the exact hot-dog helper size, 16 new adult breeds and twelve paired magical families", () => {
  assert.equal(EXTRA_CATS.length, 60);
  assert.equal(ADOPTION_CATS.length, 95);
  assert.equal(NEW_TINY_CATS.length, 20);
  assert.equal(NEW_ADULT_CATS.length, 16);
  assert.equal(NEW_MAGIC_CATS.length, 24);
  const helper = NEIGHBORS.find((c) => c.id === "hotdog-bun");
  for (const c of EXTRA_CATS) {
    assert.ok(BREEDS[c.breed]);
    if (c.tiny) {
      assert.equal(c.size, helper.size);
      assert.equal(c.size * 0.63, 0.36);
    }
    assert.ok(c.price > 0 && c.requiredLevel >= 2);
  }
  assert.equal(new Set(EXTRA_CATS.map((c) => c.id)).size, 60);
  assert.ok(
    NEW_TINY_CATS.filter((c) =>
      ["giant", "colossal"].includes(catAppearance(c).build),
    ).length >= 8,
  );
  assert.equal(TINY_CAT_SIZE, helper.size);
});
test("magic ornaments remain attached, finite and bounded through walking/swimming/rest poses, without changing the hero", () => {
  const hero = createCat();
  assert.equal(hero.userData.magic, undefined);
  disposeCat(hero);
  for (const profile of NEW_MAGIC_CATS.filter((p) => !p.tiny)) {
    const model = createCat("happy", catAppearance(profile));
    const magic = model.userData.magic;
    assert.equal(magic.kind, profile.magic);
    assert.ok(magic.draws <= 5);
    assert.ok(magic.vertices < 12000);
    for (let t = 0; t < 3; t += 0.15) {
      animateCat(model, t, true);
      model.updateMatrixWorld(true);
      model.traverse((o) =>
        assert.ok(o.matrixWorld.elements.every(Number.isFinite)),
      );
    }
    animateCat(model, 4, false, true);
    assert.ok(model.getObjectByName("Magic crown · " + profile.magic));
    disposeCat(model);
  }
});
test("all 60 new adoptees, their care, tiny sizes and destinations survive repeated saves and two-phone merging", () => {
  let g = prepared();
  g.placements.push({
    id: "new-adoption-center",
    item: "adoption-center",
    biome: "homestead",
    x: 0,
    z: 0,
    rotation: 0,
    readyAt: 0,
  });
  const wallet = g.coins,
    startingLevel = levelForXP(g.progression.xp);
  for (const c of EXTRA_CATS) g = adoptCat(g, c.id, "new-adoption-center", now);
  assert.equal(g.adoption.cats.length, 60);
  let levelCoins = 0;
  for (
    let level = startingLevel + 1;
    level <= levelForXP(g.progression.xp);
    level++
  )
    levelCoins += 30 + level * 15;
  assert.equal(
    g.coins,
    wallet - EXTRA_CATS.reduce((n, c) => n + c.price, 0) + levelCoins,
  );
  assert.throws(() =>
    adoptCat(g, EXTRA_CATS[0].id, "new-adoption-center", now),
  );
  for (const c of EXTRA_CATS) {
    g.care.bowl = [{ crop: "wheat", portions: 2 }];
    g = completeResidentAction(
      g,
      c.id,
      { action: "eat", activityId: "chichi-food" },
      now,
    );
    assert.equal(g.care.bowl[0].portions, 1);
  }
  const db = memory(),
    records = structuredClone(g.adoption),
    needs = structuredClone(g.care.residents);
  for (let i = 0; i < 25; i++) {
    saveGame(db, g);
    g = loadGame(db, now, { advance: false });
    assert.deepEqual(g.adoption, records);
    assert.deepEqual(g.care.residents, needs);
    assert.equal(activeCats(g).filter((c) => c.adoption).length, 60);
  }
  const a = structuredClone(g),
    b = structuredClone(g);
  a.catDestinations[EXTRA_CATS[0].id] = "moon";
  b.coins += 140;
  b.totalEarned += 140;
  const merged = mergeSharedWorld(g, b, a);
  saveGame(db, merged);
  const loaded = loadGame(db, now, { advance: false });
  assert.equal(loaded.coins, g.coins + 140);
  assert.equal(loaded.catDestinations[EXTRA_CATS[0].id], "moon");
  assert.deepEqual(loaded.adoption, records);
  const snapshot = worldSnapshot(loaded);
  assert.equal(
    validateState({
      ...loaded.cat,
      energy: 70,
      hunger: 30,
      happiness: 80,
      mood: "happy",
      world: snapshot,
    }).world.friends.length,
    snapshot.friends.length,
  );
});
