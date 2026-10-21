import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { NEIGHBORS, BIOMES } from "../public/game-data.js";
import { activeCats, catAvailable } from "../public/cat-roster.js";
import {
  newGame,
  loadGame,
  saveGame,
  findSpace,
  worldSnapshot,
  storeItem,
} from "../public/economy.js";
import {
  moveResidentToBiome,
  completeResidentAction,
} from "../public/resident-actions.js";
import { createResidentPlay } from "../public/resident-play.js";
import { normalizeBusiness } from "../public/business.js";
import { mergeSharedWorld } from "../shared-world.mjs";
import { validateState } from "../ai.mjs";
const now = Date.now(),
  id = "hotdog-bun";
const storage = () => {
  const map = new Map();
  return {
    getItem: (k) => map.get(k) || null,
    setItem: (k, v) => map.set(k, v),
  };
};
function standGame() {
  const game = newGame(now),
    point = findSpace(game, "business-hotdog", "moon");
  assert.ok(point, "The stand fits real valid ground");
  game.placements.push({
    id: "kitten-stand",
    item: "business-hotdog",
    biome: "moon",
    ...point,
    rotation: 0,
    readyAt: 0,
  });
  game.business = normalizeBusiness(game.business, game, now);
  return game;
}
test("the tiny hot-dog helper appears only at a completed owned stand and never duplicates for multiple stands", () => {
  const g = standGame(),
    profile = NEIGHBORS.find((n) => n.id === id);
  assert.equal(
    activeCats(newGame(now)).some((n) => n.id === id),
    false,
  );
  assert.equal(activeCats(g).filter((n) => n.id === id).length, 1);
  const n = activeCats(g).find((n) => n.id === id);
  assert.equal(n.homeVenueId, "kitten-stand");
  assert.equal(n.size * 0.63, 0.36);
  assert.equal(n.breed, "munchkin");
  g.placements.push({ ...g.placements.at(-1), id: "another-stand" });
  assert.equal(activeCats(g).filter((n) => n.id === id).length, 1);
  g.placements
    .filter((p) => p.item === profile.venue)
    .forEach((p) => (p.readyAt = Date.now() + 3600000));
  assert.equal(catAvailable(g, profile), false);
  assert.throws(() => moveResidentToBiome(g, id, "moon"));
});
test("moving the helper saves his island and care through reloads, including after storing the stand", () => {
  let g = standGame();
  g.unlocked.push("sakura");
  g = moveResidentToBiome(g, id, "sakura");
  g.care.residents[id].hunger = 51;
  const db = storage();
  for (let i = 0; i < 20; i++) {
    saveGame(db, g);
    g = loadGame(db, now, { advance: false });
    assert.equal(g.catDestinations[id], "sakura");
    assert.equal(activeCats(g).filter((n) => n.id === id).length, 1);
    assert.equal(g.care.residents[id].hunger, 51);
  }
  g = storeItem(g, "kitten-stand", now);
  saveGame(db, g);
  const loaded = loadGame(db, now, { advance: false });
  assert.equal(loaded.catDestinations[id], "sakura");
  assert.equal(activeCats(loaded).find((n) => n.id === id).biome, "sakura");
  assert.equal(loaded.inventory["business-hotdog"], 1);
});
test("unreleased kitten reloads from the real saved stand; a forged locked destination is ignored", () => {
  const g = standGame(),
    db = storage();
  g.catDestinations[id] = "ice";
  saveGame(db, g);
  const loaded = loadGame(db, now, { advance: false });
  assert.equal(loaded.catDestinations[id], undefined);
  assert.equal(
    activeCats(loaded).find((n) => n.id === id).homeVenueId,
    "kitten-stand",
  );
  assert.equal(activeCats(loaded).find((n) => n.id === id).biome, "moon");
});
test("helper movements merge with another phone's income and survive reload without changing Chichi", () => {
  const base = standGame();
  base.unlocked.push("sakura");
  const a = moveResidentToBiome(base, id, "sakura"),
    b = structuredClone(base);
  b.coins += 75;
  b.totalEarned += 75;
  const merged = mergeSharedWorld(base, b, a),
    db = storage();
  saveGame(db, merged);
  const loaded = loadGame(db, now, { advance: false });
  assert.equal(loaded.catDestinations[id], "sakura");
  assert.equal(loaded.coins, base.coins + 75);
  assert.deepEqual(loaded.cat, base.cat);
  assert.deepEqual(loaded.placements, base.placements);
});
test("every resident, including all adopted breeds and the helper, can eat, swim, play and rest using the same real save actions", () => {
  let g = standGame();
  g.unlocked = BIOMES.map((b) => b.id);
  g.adoption.cats = NEIGHBORS.filter((n) => n.adoption).map((n) => ({
    id: n.id,
    homeBiome: "moon",
  }));
  const friends = activeCats(g);
  assert.equal(friends.length, NEIGHBORS.length);
  for (const n of friends) {
    const start = structuredClone(g);
    start.care.bowl = [{ crop: "wheat", portions: 2 }];
    start.care.residents[n.id].hunger = 80;
    let next = completeResidentAction(
      start,
      n.id,
      { action: "eat", activityId: "chichi-food" },
      now,
    );
    assert.equal(next.care.bowl[0].portions, 1, n.id);
    assert.ok(next.care.residents[n.id].hunger < 80, n.id);
    next = completeResidentAction(
      next,
      n.id,
      { action: "swim", activityId: "lake-summer" },
      now,
    );
    assert.equal(next.care.residents[n.id].lastSwimAt, now, n.id);
    next = completeResidentAction(
      next,
      n.id,
      { action: "play", activityId: "welcome-yarn" },
      now,
    );
    next = completeResidentAction(
      next,
      n.id,
      { action: "rest", activityId: "chichi-bed" },
      now,
    );
    assert.deepEqual(next.cat, start.cat, n.id);
  }
  const snapshot = worldSnapshot(g, now);
  assert.ok(snapshot.friends.some((f) => f.id === id));
  assert.ok(
    validateState({
      location: "garden",
      energy: 90,
      hunger: 10,
      happiness: 80,
      world: snapshot,
    }).world.friends.some((f) => f.id === id),
  );
});
test("a dragged resident enters and leaves a raised rotated/scaled lagoon at its shore height and disturbs the visible water", () => {
  const actor = {
      index: 2,
      profile: { biome: "moon" },
      carrier: new THREE.Group(),
    },
    pool = new THREE.Group();
  pool.position.set(10, 2.555, -12);
  pool.rotation.y = Math.PI / 2;
  pool.scale.setScalar(1.2);
  pool.userData = {
    swimBounds: { rx: 3, rz: 2 },
    shoreHeight: 2.55,
    placement: { biome: "autumn" },
  };
  let splashes = 0,
    completions = 0;
  const r = createResidentPlay({
    getCat: () => actor,
    getObject: () => pool,
    disturb: () => splashes++,
    onComplete: () => completions++,
  });
  assert.ok(r.start("test", { action: "swim", activityId: "upper" }, 0));
  const entrance = r.frame("test", 10000, 10);
  assert.equal(entrance.position.y, 2.55);
  const first = r.frame("test", 10000, 10);
  assert.ok(first.position.distanceTo(entrance.position) < 1e-8);
  const swim = r.frame("test", 15000, 15);
  assert.equal(swim.mood, "happy");
  assert.ok(swim.position.y < 2.555);
  const end = r.frame("test", 23000, 23);
  assert.equal(end.position.y, 2.55);
  assert.ok(end.position.distanceTo(entrance.position) < 1e-8);
  assert.ok(splashes >= 2);
  assert.equal(completions, 1);
});
test("toy reactions follow the object's rotation and do not force an awake cat to sleep", () => {
  const actor = {
      index: 0,
      profile: { biome: "moon" },
      carrier: new THREE.Group(),
    },
    object = new THREE.Group();
  object.rotation.y = 1.2;
  object.userData = {
    playFrame: () => ({ position: [1, 0.2, 0], yaw: 0.4, paw: 0.2 }),
    placement: { biome: "moon" },
  };
  const r = createResidentPlay({
    getCat: () => actor,
    getObject: () => object,
  });
  r.start("test", { action: "play", activityId: "toy" }, 0);
  r.frame("test", 10000, 10);
  const f = r.frame("test", 11000, 11);
  assert.equal(f.yaw, 1.6);
  assert.equal(f.mood, "happy");
  assert.equal(f.walking, true);
});
