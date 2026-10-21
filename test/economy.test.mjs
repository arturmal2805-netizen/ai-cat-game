import { byItem, byBiome } from "../public/game-data.js";
import { xpForLevel } from "../public/progression.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newGame,
  claimRewards,
  attentionReward,
  purchase,
  unlockBiome,
  findSpace,
  placeItem,
  moveItem,
  storeItem,
  loadGame,
  saveGame,
  worldSnapshot,
  befriend,
  HOUR,
  SAVE_KEY,
  canPlace,
} from "../public/economy.js";
const now = Date.UTC(2026, 9, 14, 12);
const storage = () => {
  const values = new Map();
  return {
    getItem: (k) => values.get(k) || null,
    setItem: (k, v) => values.set(k, v),
  };
};
test("daily visit and full hours pay exactly once, retaining partial hours", () => {
  let result = claimRewards(newGame(now), now, true);
  assert.equal(result.game.coins, 490);
  assert.equal(claimRewards(result.game, now, true).game.coins, 490);
  result = claimRewards(result.game, now + 2.5 * HOUR, true);
  assert.equal(result.game.coins, 610);
  assert.equal(result.game.lastHourly, now + 2 * HOUR);
  assert.equal(claimRewards(result.game, now + 2.9 * HOUR).rewards.length, 0);
});
test("offline rewards cap at 24 hours and clock rollback cannot pay twice", () => {
  const result = claimRewards(newGame(now), now + 48 * HOUR);
  assert.equal(result.game.coins, 420 + 24 * 60);
  assert.equal(claimRewards(result.game, now + 48 * HOUR).rewards.length, 0);
  assert.equal(
    claimRewards(result.game, now - 2 * HOUR, true).rewards.length,
    0,
  );
});
test("reloading across Kyiv midnight preserves the balance and awards the new daily visit only once", () => {
  const beforeMidnight = Date.UTC(2026, 9, 14, 20, 59, 59),
    afterMidnight = beforeMidnight + 2000,
    s = storage();
  const before = claimRewards(
    newGame(beforeMidnight),
    beforeMidnight,
    true,
  ).game;
  saveGame(s, before);
  const after = claimRewards(
    loadGame(s, afterMidnight),
    afterMidnight,
    true,
  ).game;
  assert.equal(after.coins, before.coins + 70);
  assert.equal(after.progression.xp, before.progression.xp + 40);
  saveGame(s, after);
  const again = claimRewards(
    loadGame(s, afterMidnight),
    afterMidnight,
    true,
  ).game;
  assert.equal(again.coins, after.coins);
  assert.equal(again.progression.xp, after.progression.xp);
});
test("attention rewards require a meaningful action and ten minute cooldown", () => {
  const game = newGame(now);
  assert.equal(attentionReward(game, now, false).amount, 0);
  const reward = attentionReward(game, now);
  assert.equal(reward.amount, 10);
  assert.equal(attentionReward(reward.game, now + 1000).amount, 0);
  assert.equal(attentionReward(reward.game, now + 600000).amount, 10);
});
test("purchase debits once and placement uses inventory without another debit", () => {
  const initial = newGame(now);
  initial.coins = byItem("coaster").price + 160;
  initial.progression.xp = xpForLevel(6);
  const bought = purchase(initial, "coaster");
  assert.equal(initial.coins, byItem("coaster").price + 160);
  assert.equal(bought.coins, 160);
  const position = findSpace(bought, "coaster", "moon");
  assert.ok(position);
  const placed = placeItem(bought, "coaster", "moon", position.x, position.z);
  assert.equal(placed.coins, 160);
  assert.equal(placed.inventory.coaster, 0);
  assert.throws(() => placeItem(placed, "coaster", "moon", 0, 0));
  assert.throws(() => purchase(placed, "ferris"));
});
test("placement rejects occupied positions, locked land and outside island", () => {
  const game = purchase(newGame(now), "yarn");
  assert.equal(canPlace(game, "yarn", "moon", -5, 2).ok, false);
  assert.equal(canPlace(game, "yarn", "autumn", 0, 0).ok, false);
  assert.equal(canPlace(game, "yarn", "moon", 11, 11).ok, false);
  assert.throws(() => placeItem(game, "yarn", "moon", -5, 2));
  assert.equal(game.inventory.yarn, 1);
});
test("objects can be moved and returned to bag, with no coin duplication", () => {
  const game = newGame(now),
    before = game.coins;
  const pos = findSpace(game, "yarn", "moon", 1, "welcome-yarn");
  let next = moveItem(game, "welcome-yarn", "moon", pos.x, pos.z, 1);
  next = storeItem(next, "welcome-yarn");
  assert.equal(next.coins, before);
  assert.equal(next.inventory.yarn, 1);
  assert.throws(() => storeItem(next, "welcome-yarn"));
});
test("land unlock is permanent, costs once and enables new neighbors", () => {
  const seed = newGame(now);
  seed.coins = byBiome("autumn").price + 180;
  seed.progression.xp = xpForLevel(8);
  const game = unlockBiome(seed, "autumn");
  assert.equal(game.coins, 180);
  assert.ok(worldSnapshot(game).friends.some((f) => f.id === "honey"));
  assert.throws(() => unlockBiome(game, "autumn"));
  assert.throws(() => unlockBiome(game, "stars"));
});
test("purchases, placement and friendship survive reload", () => {
  const store = storage();
  let game = purchase(newGame(now), "mouse");
  const pos = findSpace(game, "mouse", "moon");
  game = placeItem(game, "mouse", "moon", pos.x, pos.z);
  game = befriend(game, "luna", 30);
  assert.ok(saveGame(store, game));
  const restored = loadGame(store, now + HOUR);
  assert.equal(restored.coins, game.coins);
  assert.deepEqual(restored.placements, game.placements);
  assert.equal(restored.friendship.luna, 30);
  assert.equal(restored.lastHourly, now);
});
test("malformed saves recover, and unavailable neighbors cannot gain friendship", () => {
  const store = storage();
  store.setItem(SAVE_KEY, "broken");
  assert.equal(loadGame(store, now).coins, 420);
  assert.deepEqual(befriend(newGame(now), "neighbor-galaxy").friendship, {});
});
test("scenery landmarks stay clear when new islands are unlocked", () => {
  const game = newGame(now);
  game.coins = 3000;
  game.progression.xp = xpForLevel(5);
  const next = unlockBiome(game, "winter"), obstacle=next.scenery.find(r=>r.biome==="winter"&&!r.stored);
  assert.ok(obstacle);
  assert.equal(canPlace(next, "yarn", "winter", obstacle.x, obstacle.z).ok, false);
  assert.ok(findSpace(next, "yarn", "winter"));
});
