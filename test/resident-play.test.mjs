import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createResidentPlay } from "../public/resident-play.js";
import {
  completeResidentAction,
  moveResidentToBiome,
} from "../public/resident-actions.js";
import { makeAttraction } from "../public/world-assets.js";
import { CATALOG, BIOMES, byItem } from "../public/game-data.js";
import { newGame, loadGame, saveGame, SAVE_KEY } from "../public/economy.js";
import { eatFromBowl, bowlPortions } from "../public/care-system.js";
const now = Date.UTC(2026, 9, 16);
const cat = (index = 0) => ({
  index,
  carrier: new THREE.Group(),
  profile: { id: "luna", biome: "moon" },
});
test("all existing catalog actions work for a neighbour through the real ride/toy/swim frames and complete once", () => {
  const actor = cat();
  let finished = 0;
  for (const spec of CATALOG) {
    const object = makeAttraction(spec.id);
    object.position.set(3, 0, 2);
    object.userData.placement = { biome: "moon" };
    for (const action of spec.actions) {
      const runtime = createResidentPlay({
          getCat: (id) => (id === "luna" ? actor : null),
          getObject: () => object,
          onComplete: () => finished++,
        }),
        before = finished;
      assert.equal(
        runtime.start("luna", { action, activityId: "object" }, 0),
        true,
        spec.id + " " + action,
      );
      runtime.frame("luna", 10000, 10, false);
      for (const t of [0.1, 1, 2.5, 4.6]) {
        const f = runtime.frame("luna", 10000 + t * 1000, 10 + t, false);
        if (f) {
          assert.ok(f.position.toArray().every(Number.isFinite), spec.id);
          assert.ok(Number.isFinite(f.yaw), spec.id);
        }
      }
      runtime.frame("luna", 200000, 200, false);
      assert.equal(finished, before + 1, spec.id);
      assert.equal(runtime.get("luna"), undefined);
      runtime.frame("luna", 300000, 300, false);
      assert.equal(finished, before + 1);
    }
  }
});
test("one moving seat or ball cannot be claimed by two neighbours at the same time", () => {
  const actor = cat(),
    object = makeAttraction("yarn"),
    r = createResidentPlay({ getCat: () => actor, getObject: () => object });
  assert.ok(r.start("luna", { action: "play", activityId: "yarn" }, 0));
  assert.equal(
    r.start("moti", { action: "play", activityId: "yarn" }, 0),
    false,
  );
  r.cancel("luna");
  assert.equal(object.userData.playing, false);
  assert.ok(r.start("moti", { action: "play", activityId: "yarn" }, 0));
  r.clear();
  assert.equal(r.visits.size, 0);
});
test("moving any resident saves only their island and leaves Chichi, models and other residents unchanged across reloads", () => {
  const g = newGame(now);
  g.unlocked.push("sakura");
  const hero = structuredClone(g.cat),
    destinations = { ...g.catDestinations },
    next = moveResidentToBiome(g, "moti", "sakura");
  assert.equal(next.catDestinations.moti, "sakura");
  assert.deepEqual(next.cat, hero);
  assert.deepEqual(g.catDestinations, destinations);
  const db = new Map(),
    storage = {
      getItem: (k) => db.get(k) || null,
      setItem: (k, v) => db.set(k, v),
    };
  saveGame(storage, next);
  const loaded = loadGame(storage, now, { advance: false });
  assert.equal(loaded.catDestinations.moti, "sakura");
  assert.deepEqual(loaded.cat, hero);
  assert.throws(() => moveResidentToBiome(g, "unknown", "sakura"));
  assert.throws(() => moveResidentToBiome(g, "moti", "stars"));
});
test("a neighbour eating consumes one real portion and never changes Chichi hunger; games improve only the selected resident", () => {
  const g = newGame(now);
  g.care.bowl = [{ crop: "wheat", portions: 3 }];
  g.care.residents.luna.hunger = 80;
  const next = completeResidentAction(
    g,
    "luna",
    { action: "eat", activityId: "chichi-food" },
    now,
  );
  assert.equal(bowlPortions(next), 2);
  assert.ok(next.care.residents.luna.hunger < 80);
  assert.deepEqual(next.cat, g.cat);
  const played = completeResidentAction(
    next,
    "moti",
    { action: "play", activityId: "welcome-yarn" },
    now,
  );
  assert.ok(
    played.care.residents.moti.happiness > next.care.residents.moti.happiness,
  );
  assert.deepEqual(played.cat, g.cat);
});

test("a manually assigned neighbour harvests a real farm into the existing stock without changing Chichi", () => {
  const g = newGame(now),
    hero = structuredClone(g.cat);
  g.farm.fields["welcome-farm"] = [
    { crop: "wheat", readyAt: now - 1 },
    { crop: null, readyAt: 0 },
    { crop: null, readyAt: 0 },
  ];
  const next = completeResidentAction(
    g,
    "luna",
    { action: "farm", activityId: "welcome-farm" },
    now,
  );
  assert.ok((next.farm.stock.wheat || 0) > (g.farm.stock.wheat || 0));
  assert.deepEqual(next.cat, hero);
  assert.equal(next.coins, g.coins);
  assert.equal(next.farm.fields["welcome-farm"][0].crop, null);
});
