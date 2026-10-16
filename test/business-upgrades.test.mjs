import { test } from "node:test";
import assert from "node:assert/strict";
import { BUSINESSES } from "../public/business-data.js";
import { byItem } from "../public/game-data.js";
import {
  newGame,
  findSpace,
  storeItem,
  placeItem,
  saveGame,
  loadGame,
} from "../public/economy.js";
import {
  BUSINESS_LEVELS,
  businessLevel,
  businessUpgradeCost,
  revenueRate,
  businessXP,
  incomeFor,
  collectIncome,
  normalizeBusiness,
  upgradeBusiness,
  businessVenues,
} from "../public/business.js";
import { mergeSharedWorld, SharedConflict } from "../shared-world.mjs";
import { xpForLevel } from "../public/progression.js";
import { makeAttraction } from "../public/world-assets.js";
import { decorateBusiness } from "../public/business-decor.js";
const now = Date.now();
function seed(item = "business-hotdog") {
  const g = newGame(now);
  g.coins = 100000;
  g.progression.xp = xpForLevel(20);
  g.placements.push({
    id: "tier-shop",
    item,
    biome: "moon",
    ...findSpace(g, item, "moon"),
    rotation: 0,
    readyAt: 0,
  });
  g.business = normalizeBusiness(g.business, g, now);
  return g;
}
const reload = (g) => {
  const data = new Map(),
    s = {
      getItem: (k) => data.get(k) || null,
      setItem: (k, v) => data.set(k, v),
    };
  saveGame(s, g);
  return loadGame(s, now, { advance: false });
};
test("every business has five increasingly valuable, paid, persistent levels; legacy buildings start at one", () => {
  for (const item of BUSINESSES) {
    let g = seed(item.id),
      oldRate = revenueRate(item.id),
      oldXP = businessXP(item.id),
      oldCost = 0;
    assert.equal(businessLevel(g, "tier-shop"), 1);
    for (let level = 2; level <= BUSINESS_LEVELS.length; level++) {
      const cost = businessUpgradeCost(item.id, level - 1);
      assert.ok(cost > oldCost, item.id);
      const before = g.coins,
        result = upgradeBusiness(g, "tier-shop", now);
      g = result.game;
      assert.equal(result.cost, cost);
      assert.equal(before - g.coins, cost);
      assert.equal(businessLevel(g, "tier-shop"), level);
      assert.ok(revenueRate(item.id, level) > oldRate, item.id);
      assert.ok(businessXP(item.id, level) > oldXP, item.id);
      assert.equal(
        incomeFor(g, "tier-shop", now + 3600000),
        revenueRate(item.id, level),
      );
      g = reload(g);
      assert.equal(businessLevel(g, "tier-shop"), level);
      oldRate = revenueRate(item.id, level);
      oldXP = businessXP(item.id, level);
      oldCost = cost;
    }
    assert.throws(() => upgradeBusiness(g, "tier-shop", now));
  }
});
test("upgrading settles old-rate earnings once and pays new-rate coins and XP only for subsequent time", () => {
  const g = seed(),
    at = now + 1800000,
    cost = businessUpgradeCost("business-hotdog");
  const result = upgradeBusiness(g, "tier-shop", at);
  assert.equal(result.collected, 180);
  assert.equal(result.game.coins, g.coins + 180 - cost);
  assert.equal(incomeFor(result.game, "tier-shop", at), 0);
  const before = result.game.progression.xp,
    paid = collectIncome(result.game, "tier-shop", at + 3600000);
  assert.equal(paid.amount, revenueRate("business-hotdog", 2));
  assert.equal(paid.xp, businessXP("business-hotdog", 2));
  assert.equal(
    paid.game.progression.xp - before,
    businessXP("business-hotdog", 2),
  );
  assert.equal(incomeFor(paid.game, "tier-shop", at + 3600000), 0);
});
test("a fractional coin survives an upgrade and there is no retroactive multiplier for a full capped register", () => {
  const g = seed(),
    at = now + 5000,
    result = upgradeBusiness(g, "tier-shop", at);
  assert.equal(result.collected, 0);
  assert.equal(incomeFor(result.game, "tier-shop", at + 4000), 1); // .5 old + .58 new
  const long = upgradeBusiness(g, "tier-shop", now + 48 * 3600000);
  assert.equal(long.collected, 8 * revenueRate("business-hotdog"));
  assert.equal(incomeFor(long.game, "tier-shop", now + 48 * 3600000), 0);
});
test("insufficient funds, incomplete buildings and unknown IDs cannot mutate the save", () => {
  const g = seed();
  g.coins = 0;
  const original = structuredClone(g);
  assert.throws(() => upgradeBusiness(g, "tier-shop", now));
  g.coins = 10000;
  g.placements.at(-1).readyAt = now + 1000;
  assert.throws(() => upgradeBusiness(g, "tier-shop", now));
  assert.throws(() => upgradeBusiness(g, "missing", now));
  g.coins = 0;
  g.placements.at(-1).readyAt = 0;
  assert.deepEqual(g, original);
});
test("storing and replacing an upgraded business keeps its paid tier and instant built state through reloads", () => {
  let g = upgradeBusiness(seed(), "tier-shop", now).game;
  g = upgradeBusiness(g, "tier-shop", now).game;
  const coins = g.coins;
  g = reload(storeItem(g, "tier-shop", now));
  assert.equal(
    g.relocatedPurchases.find((p) => p.item === "business-hotdog")
      .businessLevel,
    3,
  );
  const spot = findSpace(g, "business-hotdog", "moon");
  assert.ok(spot);
  g = placeItem(g, "business-hotdog", "moon", spot.x, spot.z, 0, now);
  const placed = g.placements.at(-1);
  assert.equal(placed.readyAt, 0);
  assert.equal(businessLevel(g, placed.id), 3);
  g = reload(g);
  assert.equal(businessLevel(g, placed.id), 3);
  assert.equal(g.coins, coins);
  assert.equal(
    g.relocatedPurchases.some((p) => p.item === "business-hotdog"),
    false,
  );
});
test("two phones cannot both charge for the same tier; independent kitten movement and shop upgrades merge", () => {
  const base = seed(),
    a = upgradeBusiness(base, "tier-shop", now).game,
    b = upgradeBusiness(base, "tier-shop", now).game;
  assert.throws(() => mergeSharedWorld(base, a, b), SharedConflict);
  const moved = structuredClone(base);
  moved.catDestinations.luna = "moon";
  const merged = mergeSharedWorld(base, moved, a);
  assert.equal(businessLevel(merged, "tier-shop"), 2);
  assert.equal(merged.catDestinations.luna, "moon");
  assert.equal(merged.coins, a.coins);
});
test("SPA's existing pool bar and revenue-producing attractions share the same upgrade and income systems", () => {
  let g = seed("carousel");
  g.unlocked.push("water");
  g.business = normalizeBusiness(g.business, g, now);
  for (const p of businessVenues(g)) {
    g = upgradeBusiness(g, p.id, now).game;
    assert.equal(businessLevel(g, p.id), 2);
    assert.equal(incomeFor(g, p.id, now + 3600000), revenueRate(p.item, 2));
  }
  assert.equal(businessLevel(reload(g), "spa-bar"), 2);
});
test("each decoration tier adds distinct batched details without changing any cat mesh or the base venue", () => {
  for (const item of [
    ...BUSINESSES.map((b) => b.id),
    "cafe",
    "cat-barista",
    "carousel",
  ]) {
    const model = makeAttraction(item),
      original = [...model.children],
      staff = model.userData.staff,
      guests = model.userData.guests;
    let last = 0;
    for (let level = 1; level <= 5; level++) {
      decorateBusiness(model, item, level);
      let triangles = 0,
        calls = 0;
      model.userData.businessDecor?.traverse((o) => {
        if (o.isMesh) {
          calls++;
          triangles +=
            (o.geometry.index?.count || o.geometry.attributes.position.count) /
            3;
        }
      });
      if (level > 1) assert.ok(triangles > last, item + " tier " + level);
      assert.ok(calls <= 8, item + " decorations batch by palette");
      assert.deepEqual(model.children.slice(0, original.length), original);
      assert.equal(model.userData.staff, staff);
      assert.equal(model.userData.guests, guests);
      const decor = model.userData.businessDecor;
      decorateBusiness(model, item, level);
      assert.equal(
        model.userData.businessDecor,
        decor,
        "unchanged tiers do not rebuild on every save",
      );
      last = triangles;
    }
    decorateBusiness(model, item, 1);
    assert.deepEqual(model.children, original);
    assert.equal(model.userData.businessDecor, null);
  }
});
test("an older open tab cannot erase an already paid level during an unrelated save", () => {
  const base = upgradeBusiness(seed(), "tier-shop", now).game,
    older = structuredClone(base);
  delete older.business.levels;
  older.catDestinations.luna = "moon";
  const merged = mergeSharedWorld(base, base, older);
  assert.equal(businessLevel(merged, "tier-shop"), 2);
  assert.equal(merged.catDestinations.luna, "moon");
  assert.equal(merged.coins, base.coins);
});
