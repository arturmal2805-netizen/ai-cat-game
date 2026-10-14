import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newGame,
  saveGame,
  loadGame,
  worldSnapshot,
  harvestField,
  sellHarvest,
  SAVE_KEY,
} from "../public/economy.js";
import { CROPS, NEIGHBORS } from "../public/game-data.js";
import {
  fillBowl,
  foodYield,
  bowlPortions,
  eatFromBowl,
  advanceCare,
  startRest,
  colonyNeeds,
  BOWL_CAPACITY,
} from "../public/care-system.js";
import {
  recordSocialEncounter,
  relationshipStage,
  bestEligible,
  SOCIAL_COOLDOWN,
} from "../public/social-system.js";
import { socialFrame, socialDuration } from "../public/social-animation.js";
import { validateState, parseDecision } from "../ai.mjs";
import { resolveInteraction } from "../public/interactions.js";
const now = 1791979200000;
const restore = (g) =>
  loadGame(
    { getItem: (k) => (k === SAVE_KEY ? JSON.stringify(g) : null) },
    now,
  );
test("harvest becomes finite portions or sale proceeds, never both", () => {
  let g = harvestField(newGame(now), "welcome-farm", now).game;
  assert.equal(g.farm.stock.wheat, 2);
  const before = structuredClone(g);
  g = fillBowl(g, "wheat", 2);
  assert.equal(before.farm.stock.wheat, 2);
  assert.equal(g.farm.stock.wheat, 0);
  assert.equal(
    bowlPortions(g),
    foodYield(CROPS.find((c) => c.id === "wheat")) * 2,
  );
  assert.equal(g.coins, before.coins);
  assert.throws(() => fillBowl(g, "wheat"), /не хватает/);
  assert.throws(() => sellHarvest(g), /Склад урожая пока пустой/);
  const portions = bowlPortions(g);
  for (let i = 0; i < portions; i++)
    g = eatFromBowl(g, i % 2 ? "luna" : "chichi", now + i).game;
  assert.equal(bowlPortions(g), 0);
  assert.equal(g.care.mealId, portions);
  assert.throws(() => eatFromBowl(g), /Миска пустая/);
  assert.throws(
    () =>
      resolveInteraction(worldSnapshot(g), {
        action: "eat",
        activityId: "chichi-food",
      }),
    /Миска пустая/,
  );
});
test("bowl rejects invalid stock, over-capacity deposits and unavailable cats without changing state", () => {
  const g = newGame(now);
  g.farm.stock.wheat = 100;
  const before = structuredClone(g);
  for (const [crop, amount] of [
    ["wheat", 0],
    ["wheat", 1.5],
    ["wheat", 21],
    ["unknown", 1],
  ])
    assert.throws(() => fillBowl(g, crop, amount));
  let filled = fillBowl(g, "wheat", 20);
  assert.ok(bowlPortions(filled) <= BOWL_CAPACITY);
  assert.throws(() => fillBowl(filled, "wheat", 20), /места/);
  assert.throws(() => eatFromBowl(filled, "honey"), /недоступен/);
  assert.deepEqual(g, before);
});
test("offline needs consume finite food exactly once and do not change purchases, coins or friendships", () => {
  let g = newGame(now);
  g.farm.stock.wheat = 1;
  g = fillBowl(g, "wheat");
  const food = bowlPortions(g),
    original = structuredClone(g);
  const after = advanceCare(g, now + 48 * 3600000, { offline: true });
  assert.equal(bowlPortions(after), 0);
  assert.equal(after.care.mealId, food);
  assert.equal(after.cat.hunger, 100);
  assert.deepEqual(after.placements, original.placements);
  assert.equal(after.coins, original.coins);
  assert.deepEqual(after.social, original.social);
  assert.equal(
    advanceCare(after, now + 48 * 3600000, { offline: true }),
    after,
  );
  assert.equal(advanceCare(after, now - 60000, { offline: true }), after);
  assert.equal(restore(after).care.mealId, food);
});
test("online needs never debit meals before a physical feeding animation", () => {
  let g = newGame(now);
  g.farm.stock.wheat = 1;
  g = fillBowl(g, "wheat");
  const advanced = advanceCare(g, now + 60 * 60000);
  assert.equal(bowlPortions(advanced), bowlPortions(g));
  assert.equal(advanced.care.mealId, 0);
  assert.equal(advanced.cat.hunger, 100);
  assert.equal(eatFromBowl(advanced).game.care.mealId, 1);
});
test("sleep is a saved physical state: energy rises gradually, persists and wakes at full energy", () => {
  let g = newGame(now);
  g.cat.energy = 10;
  const awake = advanceCare(g, now + 60000);
  assert.ok(awake.cat.energy < 10);
  assert.throws(() => startRest(g, "welcome-yarn"));
  g = startRest(g, "chichi-bed", now);
  assert.equal(g.cat.energy, 10);
  assert.equal(restore(g).care.resting.activityId, "chichi-bed");
  const rested = advanceCare(g, now + 5 * 60000);
  assert.ok(Math.abs(rested.cat.energy - 26) < 1e-9);
  assert.equal(rested.care.resting.activityId, "chichi-bed");
  assert.equal(advanceCare(g, now + 30 * 60000).care.resting, null);
});
test("colony indicators exclude Chichi and locked residents", () => {
  const g = newGame(now),
    residents = NEIGHBORS.filter((n) => n.biome === "moon");
  for (const n of residents) {
    g.care.residents[n.id].hunger = 60;
    g.care.residents[n.id].happiness = 40;
  }
  g.cat.hunger = 0;
  g.cat.happiness = 100;
  g.care.residents.honey.hunger = 100;
  assert.deepEqual(colonyNeeds(g), {
    count: residents.length,
    hunger: 60,
    happiness: 40,
  });
});
test("friendship migration resets the old meter once and preserves the rest of the world", () => {
  const g = newGame(now);
  delete g.social;
  g.friendship = { luna: 100, moti: 100 };
  g.coins = 3456;
  g.farm.stock.wheat = 9;
  const migrated = restore(g);
  assert.equal(migrated.friendship.luna, 0);
  assert.equal(migrated.coins, 3456);
  assert.equal(migrated.farm.stock.wheat, 9);
  assert.deepEqual(migrated.placements, g.placements);
  const met = recordSocialEncounter(migrated, "luna", "play", "ai", now);
  assert.equal(met.social.relationships.luna.points, 2);
  assert.equal(met.social.relationships.luna.plays, 0);
  assert.equal(restore(met).social.relationships.luna.points, 2);
});
test("friendship grows only for the chosen cat, with distinct meetings and cooldown", () => {
  let g = recordSocialEncounter(newGame(now), "luna", "play", "ai", now);
  assert.equal(relationshipStage(g.social.relationships.luna), "acquaintance");
  assert.equal(relationshipStage(g.social.relationships.moti), "unknown");
  g = recordSocialEncounter(g, "luna", "play", "manual", now + 1);
  assert.equal(g.social.relationships.luna.meetings, 1);
  assert.equal(g.social.relationships.luna.points, 2);
  for (let i = 1; i <= 7; i++)
    g = recordSocialEncounter(
      g,
      "luna",
      "play",
      "ai",
      now + i * SOCIAL_COOLDOWN,
    );
  assert.equal(relationshipStage(g.social.relationships.luna), "friend");
  assert.equal(bestEligible(g.social.relationships.luna), false);
  assert.equal(g.social.relationships.moti.points, 0);
  assert.throws(() => recordSocialEncounter(g, "honey", "play", "ai", now));
});
test("only Chichi AI can select a best friend after many visible meetings and games", () => {
  let g = newGame(now);
  for (let i = 0; i < 18; i++)
    g = recordSocialEncounter(
      g,
      "luna",
      "play",
      "ai",
      now + i * SOCIAL_COOLDOWN,
    );
  assert.equal(bestEligible(g.social.relationships.luna), true);
  assert.equal(relationshipStage(g.social.relationships.luna), "close");
  assert.equal(
    recordSocialEncounter(
      g,
      "luna",
      "best_friend",
      "manual",
      now + 40 * SOCIAL_COOLDOWN,
    ).social.bestFriendId,
    null,
  );
  g = recordSocialEncounter(
    g,
    "luna",
    "best_friend",
    "ai",
    now + 40 * SOCIAL_COOLDOWN,
  );
  assert.equal(g.social.bestFriendId, "luna");
  assert.equal(restore(g).social.bestFriendId, "luna");
});
test("AI receives finite food and friendship eligibility; invented best friends and empty meals are rejected", () => {
  const g = newGame(now),
    state = validateState({ ...g.cat, world: worldSnapshot(g) });
  assert.equal(
    state.world.activities.find((a) => a.id === "chichi-food").foodPortions,
    0,
  );
  assert.throws(() =>
    parseDecision(
      {
        mood: "happy",
        action: "eat",
        activityId: "chichi-food",
        thought: "Обед",
      },
      state,
    ),
  );
  assert.throws(() =>
    parseDecision(
      {
        mood: "happy",
        action: "meet",
        friendId: "luna",
        socialIntent: "best_friend",
        thought: "Друг",
      },
      state,
    ),
  );
  const greeting = parseDecision(
    {
      mood: "happy",
      action: "meet",
      friendId: "luna",
      socialIntent: "greet",
      thought: "Познакомимся",
    },
    state,
  );
  assert.equal(greeting.socialIntent, "greet");
});
test("social animation includes two distinct moving cats and gentle pounces, respecting reduced motion", () => {
  const positions = new Set();
  let pounces = 0;
  for (let t = 0; t < socialDuration("play"); t += 0.1) {
    const f = socialFrame(t, "play");
    positions.add(f.hero.x.toFixed(2));
    for (const p of [f.hero, f.friend])
      for (const v of Object.values(p))
        if (typeof v === "number") assert.ok(Number.isFinite(v));
    if (f.hero.jump > 0) pounces++;
    assert.notDeepEqual(f.hero, f.friend);
  }
  assert.ok(positions.size > 40);
  assert.ok(pounces > 10);
  const a = socialFrame(3, "play", true),
    b = socialFrame(11, "play", true);
  assert.deepEqual(a, b);
  assert.equal(a.hero.jump, 0);
  assert.equal(a.friend.running, false);
});
