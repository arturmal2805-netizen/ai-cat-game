import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newGame,
  loadGame,
  saveGame,
  placeItem,
  findSpace,
} from "../public/economy.js";
import { byItem } from "../public/game-data.js";
import { xpForLevel } from "../public/progression.js";
import {
  collectIncome,
  collectAllIncome,
  incomeFor,
  normalizeBusiness,
} from "../public/business.js";
import {
  activateBuilderBoost,
  builderSpeed,
  constructionDeadline,
  resolveConstructionBoosts,
  BUILDER_BOOST_MS,
} from "../public/construction-boost.js";
import { mergeSharedWorld, SharedConflict } from "../shared-world.mjs";
import { courtProject, COURT_VENUES } from "../public/foodcourt-data.js";
import {
  startCourtConstruction,
  islandProject,
} from "../public/island-construction.js";
import { COTTON_OBJECTS } from "../public/cotton-data.js";
import {
  createConstructionCrew,
  attachBuilderGlow,
} from "../public/construction-crew.js";
import { diamondMine } from "../public/diamond-mine.js";
import * as THREE from "three";
const now = Date.UTC(2026, 9, 17, 12),
  hour = 3600000;
function seed() {
  const g = newGame(now);
  g.coins = 100000;
  g.diamonds = 24;
  g.progression.xp = xpForLevel(20);
  return g;
}
function reload(g, t = now) {
  const map = new Map();
  const storage = {
    getItem: (k) => map.get(k) || null,
    setItem: (k, v) => map.set(k, v),
  };
  saveGame(storage, g);
  return loadGame(storage, t, { advance: false });
}
function mine(g) {
  g.placements.push({
    id: "mine-test",
    item: "diamond-mine",
    biome: "moon",
    ...findSpace(g, "diamond-mine", "moon"),
    rotation: 0,
    readyAt: 0,
  });
  g.business = normalizeBusiness(g.business, g, now);
  return g;
}
test("mine credits only rare diamonds and XP, preserves fractions, caps at eight hours and cannot be collected twice", () => {
  const g = mine(seed());
  assert.equal(byItem("diamond-mine").requiredLevel, 4);
  assert.equal(incomeFor(g, "mine-test", now + hour / 4), 0);
  let r = collectIncome(g, "mine-test", now + hour * 1.25);
  assert.equal(r.amount, 2);
  assert.equal(r.currency, "diamonds");
  assert.equal(r.game.diamonds, 26);
  assert.equal(r.game.coins, g.coins);
  assert.ok(r.xp > 0);
  assert.throws(() => collectIncome(r.game, "mine-test", now + hour * 1.25));
  r = collectIncome(reload(r.game), "mine-test", now + hour * 1.5);
  assert.equal(r.amount, 1);
  assert.equal(incomeFor(g, "mine-test", now + hour * 100), 16);
  const all = collectAllIncome(g, now + hour);
  assert.equal(all.amount, 0);
  assert.equal(all.diamonds, 2);
});
test("boost integrates prior work, expires at the exact saved hour, never extends on reload or compounds deadlines", () => {
  let g = seed();
  g.placements.push({
    id: "unfinished",
    item: "yarn",
    biome: "moon",
    ...findSpace(g, "yarn", "moon"),
    rotation: 0,
    startedAt: now - hour,
    readyAt: now + hour * 2,
  });
  const r = activateBuilderBoost(g, now);
  const p = r.placements.at(-1);
  assert.equal(r.diamonds, 16);
  assert.equal(p.readyAt, now + hour / 5);
  assert.equal(p.boostBaseReadyAt, now + hour * 2);
  assert.equal(g.diamonds, 24);
  assert.equal(builderSpeed(r, now), 10);
  assert.equal(builderSpeed(r, now + hour - 1), 10);
  assert.equal(builderSpeed(r, now + hour), 1);
  for (let i = 0; i < 30; i++) {
    const restored = reload(r, now + i * hour);
    assert.equal(restored.placements.at(-1).readyAt, p.readyAt);
    assert.equal(restored.builderBoosts[0].until, now + hour);
    assert.equal(restored.diamonds, 16);
  }
  assert.deepEqual(resolveConstructionBoosts(r), r);
  assert.throws(() => activateBuilderBoost(r, now + 1000));
  const poor = seed();
  poor.diamonds = 7;
  assert.throws(() => activateBuilderBoost(poor, now));
});
test("long projects retain only the real saved accelerated work, overlapping intervals cannot stack", () => {
  const e = { id: "boost-0000001", startedAt: now, until: now + hour };
  const p = { startedAt: now, readyAt: now + hour * 20 };
  assert.equal(constructionDeadline(p, [e]), now + hour * 11);
  assert.equal(
    constructionDeadline(p, [e, { ...e, id: "boost-0000002" }]),
    now + hour * 11,
  );
  assert.equal(
    constructionDeadline(p, [
      e,
      { id: "boost-0000003", startedAt: now + hour * 2, until: now + hour * 3 },
    ]),
    now + hour * 2.9,
  );
  assert.equal(
    constructionDeadline({ startedAt: now - hour * 2, readyAt: now - hour }, [
      e,
    ]),
    now - hour,
  );
});
test("new placed buildings and permanent island projects use the same boost without accelerating farming", () => {
  let g = activateBuilderBoost(seed(), now);
  g.inventory["diamond-mine"] = 1;
  g = placeItem(
    g,
    "diamond-mine",
    "moon",
    ...Object.values(findSpace(g, "diamond-mine", "moon")),
    0,
    now + 60000,
  );
  const p = g.placements.at(-1);
  assert.equal(p.readyAt, now + 60000 + 120000);
  assert.equal(g.business.accounts[p.id].collectedAt, p.readyAt);
  assert.equal(incomeFor(g, p.id, p.readyAt + hour), 2);
  g.unlocked.push("foodcourt", "clockwork");
  const v = COURT_VENUES.find((v) => v.requiresBuild);
  g = startCourtConstruction(g, v.id, now + 60000);
  assert.equal(
    courtProject(g, v.id, now).readyAt,
    now + 60000 + v.buildMinutes * 6000,
  );
  g.islandConstruction.clockwork = now;
  const cotton = COTTON_OBJECTS.find((o) => !o.type.startsWith("ride-pig-"));
  const normal = structuredClone(g);
  normal.builderBoosts = [];
  assert.equal(
    islandProject(g, cotton.id, now).readyAt,
    now + (islandProject(normal, cotton.id, now).readyAt - now) / 10,
  );
  assert.equal(
    g.farm.fields["welcome-farm"][0].readyAt,
    seed().farm.fields["welcome-farm"][0].readyAt,
  );
});
test("two phones preserve independent diamond income, new buildings and a remote boost; overlapping purchases cannot double charge", () => {
  const base = mine(seed());
  const a = activateBuilderBoost(base, now);
  const b = collectIncome(base, "mine-test", now + hour).game;
  const joined = mergeSharedWorld(base, a, b);
  assert.equal(joined.diamonds, 18);
  assert.equal(joined.builderBoosts.length, 1);
  const second = activateBuilderBoost(base, now + 1000);
  assert.throws(() => mergeSharedWorld(base, a, second), SharedConflict);
  const building = structuredClone(base);
  building.inventory.yarn = 1;
  const placed = placeItem(
    building,
    "yarn",
    "moon",
    ...Object.values(findSpace(building, "yarn", "moon")),
    0,
    now + 1000,
  );
  const combined = mergeSharedWorld(
    building,
    { ...a, inventory: building.inventory },
    placed,
  );
  assert.equal(combined.placements.length, placed.placements.length);
  assert.ok(
    combined.placements.at(-1).readyAt < placed.placements.at(-1).readyAt,
  );
  const old = structuredClone(base);
  delete old.diamonds;
  delete old.builderBoosts;
  delete old.business.totalDiamonds;
  old.cat.happiness--;
  const legacy = mergeSharedWorld(base, a, old);
  assert.equal(legacy.diamonds, 16);
  assert.deepEqual(legacy.builderBoosts, a.builderBoosts);
});
test("boosted builders actually move ten times faster and their temporary glow stays out of the approved cat geometry", () => {
  const sites = [
    { id: "work", biome: "moon", x: 0, z: 0, w: 2, d: 2, readyAt: now + hour },
  ];
  const make = (speed) =>
    createConstructionCrew({ getSites: () => sites, getSpeed: () => speed });
  const normal = make(1),
    fast = make(10),
    p = { x: 0, z: 7.2, y: 0.16 };
  const a = normal.frame("a", p, "moon", 0, 0.4, 1 / 60, 0, now),
    b = fast.frame("a", p, "moon", 0, 0.4, 1 / 60, 0, now);
  const distance = (q) => Math.hypot(q.position.x - p.x, q.position.z - p.z);
  assert.ok(Math.abs(distance(b) / distance(a) - 10) < 1e-6);
  assert.equal(b.speed, 10);
  const model = new THREE.Group(),
    glow = attachBuilderGlow(model);
  assert.equal(glow.count, 3);
  glow.userData.updateBoost(1, 10);
  assert.equal(glow.visible, true);
  glow.userData.updateBoost(2, 1);
  assert.equal(glow.visible, false);
});
test("diamond mine has an animated permanent miner and lightweight shared translucent crystals", () => {
  const model = diamondMine();
  assert.ok(model.userData.miner);
  const scale = model.userData.miner.scale.x;
  model.userData.update(1, false);
  model.userData.update(1.1, false);
  assert.equal(model.userData.miner.scale.x, scale);
  const crystals = [];
  model.traverse((o) => {
    if (o.material?.transparent && o.material?.color?.getHex() === 0xc29aff)
      crystals.push(o);
  });
  assert.ok(crystals.length);
  assert.ok(crystals.every((c) => c.material.transmission === 0));
  model.userData.disposeStaff?.();
});

test("a concurrent plot conflict preserves original boosted work when the paid building is placed from the bag", () => {
  const base = activateBuilderBoost(seed(), now);
  base.inventory.yarn = 2;
  const spot = findSpace(base, "yarn", "moon");
  const a = placeItem(base, "yarn", "moon", spot.x, spot.z, 0, now + 1000);
  const b = placeItem(base, "yarn", "moon", spot.x, spot.z, 0, now + 1000);
  const g = mergeSharedWorld(base, a, b);
  assert.equal(g.relocatedPurchases.length, 1);
  const original = b.placements.at(-1),
    relocated = g.relocatedPurchases[0];
  assert.equal(relocated.boostBaseReadyAt, original.boostBaseReadyAt);
  const newSpot = findSpace(g, "yarn", "moon");
  const placed = placeItem(
    reload(g),
    "yarn",
    "moon",
    newSpot.x,
    newSpot.z,
    0,
    now + 3000,
  ).placements.at(-1);
  assert.equal(placed.startedAt, original.startedAt);
  assert.equal(placed.readyAt, original.readyAt);
});
