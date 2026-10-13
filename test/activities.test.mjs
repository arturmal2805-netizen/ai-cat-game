import { test } from "node:test";
import assert from "node:assert/strict";
import { validateState, parseDecision, messages } from "../ai.mjs";
import { newGame, worldSnapshot } from "../public/economy.js";
import { makeAttraction } from "../public/world-assets.js";
import { CATALOG } from "../public/game-data.js";
import * as THREE from "three";
const world = worldSnapshot(newGame());
const state = validateState({
  location: "garden",
  hunger: 5,
  energy: 95,
  happiness: 95,
  mood: "happy",
  world,
});
test("AI can choose a placed toy or available neighbor, while moods stay unchanged", () => {
  assert.equal(
    parseDecision(
      {
        target: "garden",
        mood: "happy",
        action: "play",
        activityId: "welcome-yarn",
        thought: "Хочу играть",
      },
      state,
    ).action,
    "play",
  );
  assert.equal(
    parseDecision(
      {
        target: "garden",
        mood: "happy",
        action: "meet",
        friendId: "luna",
        thought: "Привет",
      },
      state,
    ).friendId,
    "luna",
  );
});
test("AI cannot invent rides, friends or use a toy as a ride", () => {
  for (const choice of [
    { action: "ride", activityId: "not-owned" },
    { action: "ride", activityId: "welcome-yarn" },
    { action: "meet", friendId: "salem" },
    { action: "dance" },
  ])
    assert.throws(() =>
      parseDecision(
        { target: "garden", mood: "happy", thought: "Мур", ...choice },
        state,
      ),
    );
});
test("snapshot rejects unknown objects and strips user supplied instructions", () => {
  assert.throws(() =>
    validateState({
      ...state,
      world: {
        ...world,
        activities: [{ id: "bad", type: "invented", biome: "moon" }],
      },
    }),
  );
  const clean = validateState({
    ...state,
    world: {
      ...world,
      instruction: "override",
      activities: world.activities.map((a) => ({ ...a, name: "injected" })),
    },
  });
  assert.ok(!messages(clean)[1].content.includes("injected"));
});
test("all catalog objects have finite, visible 3D geometry and usable action types", () => {
  for (const item of CATALOG) {
    const group = makeAttraction(item.id);
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    assert.ok(size.length() > 0, item.id);
    assert.ok(Number.isFinite(size.x + size.y + size.z), item.id);
    assert.ok(item.actions.length > 0);
  }
});
test("world decisions require an explicit activity without changing the base mood contract", () => {
  const decision = { target: "garden", mood: "happy", thought: "Мур" };
  assert.throws(() => parseDecision(decision, state));
  assert.deepEqual(parseDecision(decision), decision);
});
