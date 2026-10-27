import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOG } from "../public/game-data.js";
import { newGame, saveGame, loadGame } from "../public/economy.js";
import {
  BUSINESS_LEVELS,
  BUSINESS_CAP_HOURS,
  revenueRate,
  businessXP,
  normalizeBusiness,
  collectIncome,
  collectAllIncome,
  incomeFor,
} from "../public/business.js";
import {
  addXP,
  newProgression,
  normalizeProgression,
  DAILY_XP_LIMIT,
  MAX_LEVEL,
  xpForLevel,
} from "../public/progression.js";
import { mergeSharedWorld } from "../shared-world.mjs";

const now = Date.UTC(2026, 9, 18, 12),
  hour = 3600000;
function seed(items = ["business-coffee"], capped = true) {
  const g = capped ? addXP(newGame(now), DAILY_XP_LIMIT, now) : newGame(now);
  g.unlocked.push("homestead");
  for (const [i, item] of items.entries())
    g.placements.push({
      id: "xp-register-" + i,
      item,
      biome: "homestead",
      x: -30 + (i % 4) * 16,
      z: -24 + Math.floor(i / 4) * 16,
      rotation: 0,
      readyAt: now,
    });
  g.business = normalizeBusiness(g.business, g, now);
  return g;
}
const reload = (g, at) => {
  const data = new Map(),
    storage = {
      getItem: (k) => data.get(k) || null,
      setItem: (k, v) => data.set(k, v),
    };
  saveGame(storage, g);
  return loadGame(storage, at, { advance: false });
};

test("every income-producing catalogue item pays its advertised XP at every tier after the activity limit", () => {
  const items = CATALOG.filter((p) => revenueRate(p.id));
  assert.ok(
    items.length > 60,
    "cover businesses, rides, cafes, mine and restaurants",
  );
  for (const item of items)
    for (let level = 1; level <= BUSINESS_LEVELS.length; level++) {
      const g = seed([item.id]);
      g.business.levels["xp-register-0"] = level;
      const paid = collectIncome(g, "xp-register-0", now + hour);
      assert.equal(
        paid.xp,
        Math.min(businessXP(item.id, level),xpForLevel(MAX_LEVEL)-g.progression.xp),
        item.id + " tier " + level,
      );
      assert.equal(paid.amount, revenueRate(item.id, level), item.id);
      assert.equal(paid.game.progression.businessXP, paid.xp);
      assert.equal(paid.game.progression.dailyXP, DAILY_XP_LIMIT);
      assert.throws(() =>
        collectIncome(paid.game, "xp-register-0", now + hour),
      );
    }
});

test("collect-all pays every register beyond 1800 XP and matches individual collection exactly", () => {
  const items = [
      "business-coffee",
      "business-hotdog",
      "business-artist",
      "business-pizza",
      "business-candy",
      "business-toymaker",
    ],
    base = seed(items),
    at = now + 2 * hour;
  let individual = base;
  for (let i = 0; i < items.length; i++)
    individual = collectIncome(individual, "xp-register-" + i, at).game;
  const all = collectAllIncome(base, at),
    expected = items.reduce((s, item) => s + 2 * businessXP(item), 0);
  assert.ok(expected > DAILY_XP_LIMIT);
  assert.equal(all.xp, expected);
  assert.equal(all.count, items.length);
  assert.deepEqual(all.game, individual);
  assert.equal(all.game.progression.dailyXP, DAILY_XP_LIMIT);
  const restored = reload(all.game, at);
  assert.equal(restored.progression.xp, all.game.progression.xp);
  assert.equal(restored.progression.businessXP, expected);
  assert.equal(restored.coins, all.game.coins);
  assert.throws(() => collectAllIncome(restored, at));
});

test("business XP leaves the activity allowance available and preserves fractional XP across reloads", () => {
  const base = seed(["business-coffee"], false),
    at = now + hour,
    once = collectIncome(base, "xp-register-0", at).game;
  let frequent = base;
  for (let i = 1; i <= 180; i++) {
    frequent = collectIncome(frequent, "xp-register-0", now + i * 20000).game;
    if (i % 30 === 0) frequent = reload(frequent, now + i * 20000);
  }
  assert.equal(frequent.progression.xp, once.progression.xp);
  assert.equal(frequent.progression.businessXP, once.progression.businessXP);
  assert.equal(frequent.coins, once.coins);
  assert.equal(frequent.progression.dailyXP, 0);
  const withActivity = addXP(frequent, DAILY_XP_LIMIT, at);
  assert.equal(
    withActivity.progression.xp,
    once.progression.xp + DAILY_XP_LIMIT,
  );
  assert.equal(
    withActivity.progression.businessXP,
    once.progression.businessXP,
  );
});

test("construction, eight-hour offline cap, clock rollback and max level remain bounded", () => {
  const base = seed(["business-coffee"]);
  base.placements.at(-1).readyAt = now + hour;
  base.business = normalizeBusiness(base.business, base, now);
  assert.equal(incomeFor(base, "xp-register-0", now + hour - 1), 0);
  const paid = collectIncome(base, "xp-register-0", now + 48 * hour);
  assert.equal(paid.xp, BUSINESS_CAP_HOURS * businessXP("business-coffee"));
  assert.throws(() => collectIncome(paid.game, "xp-register-0", now));
  const nearMax = seed();
  nearMax.progression.xp = xpForLevel(MAX_LEVEL) - 7;
  const last = collectIncome(nearMax, "xp-register-0", now + hour);
  assert.equal(last.xp, 7);
  assert.equal(last.game.progression.businessXP, 7);
  const atMax = collectIncome(last.game, "xp-register-0", now + 2 * hour);
  assert.equal(atMax.xp, 0);
  assert.equal(atMax.amount, revenueRate("business-coffee"));
});

test("legacy progression loads without changing earned XP or daily allowance", () => {
  const g = seed(),
    raw = { ...g.progression };
  delete raw.businessXP;
  const normalized = normalizeProgression(raw, g);
  assert.equal(normalized.businessXP, 0);
  assert.equal(normalized.xp, raw.xp);
  assert.equal(normalized.dailyXP, raw.dailyXP);
  assert.equal(newProgression().businessXP, 0);
});

test("two phones collecting distinct registers keep all business XP; the same register cannot pay twice", () => {
  const base = seed(["business-coffee", "business-hotdog"]),
    at = now + hour,
    a = collectIncome(base, "xp-register-0", at).game,
    b = collectIncome(base, "xp-register-1", at).game,
    expected = businessXP("business-coffee") + businessXP("business-hotdog");
  for (const merged of [
    mergeSharedWorld(base, a, b),
    mergeSharedWorld(base, b, a),
  ]) {
    assert.equal(merged.progression.xp, base.progression.xp + expected);
    assert.equal(merged.progression.businessXP, expected);
    assert.equal(merged.progression.dailyXP, DAILY_XP_LIMIT);
    assert.equal(incomeFor(merged, "xp-register-0", at), 0);
    assert.equal(incomeFor(merged, "xp-register-1", at), 0);
  }
  assert.throws(() => mergeSharedWorld(base, a, a), /другом телефоне/);
});

test("shared activity cap cannot consume business XP; cached clients cannot reset its ledger", () => {
  const base = seed(),
    at = now + hour;
  base.progression.dailyXP = DAILY_XP_LIMIT - 10;
  const a = collectIncome(addXP(base, 10, at), "xp-register-0", at).game,
    b = addXP(base, 10, at),
    merged = mergeSharedWorld(base, b, a);
  assert.equal(
    merged.progression.xp,
    base.progression.xp + 10 + businessXP("business-coffee"),
  );
  assert.equal(merged.progression.dailyXP, DAILY_XP_LIMIT);
  const cached = structuredClone(merged);
  delete cached.progression.businessXP;
  cached.inventory.mouse = (cached.inventory.mouse || 0) + 1;
  const kept = mergeSharedWorld(merged, merged, cached);
  assert.equal(kept.progression.businessXP, merged.progression.businessXP);
  assert.equal(kept.progression.xp, merged.progression.xp);
  assert.equal(kept.inventory.mouse, cached.inventory.mouse);
});
