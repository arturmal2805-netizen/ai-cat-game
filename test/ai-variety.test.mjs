import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateState,
  parseDecision,
  requestDecision,
  messages,
  decisionOptions,
} from "../ai.mjs";
import { newGame, worldSnapshot } from "../public/economy.js";

function context({
  recent = [],
  energy = 90,
  hunger = 10,
  coins = 420,
  growing = false,
  empty = false,
} = {}) {
  const g = newGame();
  g.unlocked.push("winter");
  g.coins = coins;
  if (growing)
    g.farm.fields["welcome-farm"] = Array.from({ length: 3 }, () => ({
      crop: "wheat",
      readyAt: Date.now() + 3600000,
    }));
  if (empty)
    g.farm.fields["welcome-farm"] = Array.from({ length: 3 }, () => ({
      crop: null,
      readyAt: 0,
    }));
  g.recentActivities = recent;
  return validateState({
    ...g.cat,
    energy,
    hunger,
    happiness: 90,
    world: worldSnapshot(g),
  });
}
const farm = {
  mood: "happy",
  action: "farm",
  activityId: "welcome-farm",
  thought: "Пойду на ферму.",
};
const farmHistory = [
  { action: "farm", activityId: "welcome-farm", source: "ai" },
];
test("growing plots and unaffordable seeds never advertise or accept a no-work farm action", () => {
  for (const state of [
    context({ growing: true }),
    context({ empty: true, coins: 1 }),
  ]) {
    assert.ok(
      !decisionOptions(state)
        .activities.find((a) => a.id === "welcome-farm")
        ?.actions.includes("farm"),
    );
    assert.throws(() => parseDecision(farm, state), /нечего собирать/);
    const payload = JSON.parse(messages(state)[1].content);
    assert.ok(
      !payload.world.activities
        .find((a) => a.id === "welcome-farm")
        ?.actions.includes("farm"),
    );
  }
});
test("first farming still works for ripe crops and affordable planting", () => {
  for (const state of [context(), context({ empty: true })])
    assert.equal(parseDecision(farm, state).action, "farm");
});
test("after a completed farm visit the healthy cat has actual toys, rides, swimming and friends instead of another farm visit", () => {
  const state = context({ recent: farmHistory }),
    options = decisionOptions(state),
    payload = JSON.parse(messages(state)[1].content);
  assert.equal(options.farmBreak, true);
  assert.ok(!options.activities.some((a) => a.type === "farm-field"));
  for (const action of ["play", "ride", "swim", "meet"])
    assert.ok(payload.world.availableChoices[action] > 0, action);
  assert.ok(payload.world.activities.some((a) => a.id === "island-whale-blue"));
  assert.ok(payload.world.activities.some((a) => a.id === "welcome-yarn"));
  assert.throws(() => parseDecision(farm, state), /только что была на ферме/);
});
test("a repetitive model gets one correction and the actual second AI choice is returned without local substitution", async () => {
  const state = context({ recent: farmHistory }),
    inputs = [],
    answer = {
      mood: "happy",
      action: "ride",
      activityId: "island-whale-blue",
      thought: "Хочу полетать на синем ките!",
    };
  const result = await requestDecision(state, async (input) => {
    inputs.push(input);
    return { response: inputs.length === 1 ? farm : answer };
  });
  assert.equal(inputs.length, 2);
  assert.equal(inputs[0].temperature, 0.35);
  assert.equal(result.activityId, answer.activityId);
  assert.equal(result.thought, answer.thought);
  assert.match(inputs[1].messages.at(-1).content, /только что была на ферме/);
});
test("two repetitive model choices fail clearly instead of pretending a random local action came from AI", async () => {
  let calls = 0;
  await assert.rejects(
    requestDecision(context({ recent: farmHistory }), async () => {
      calls++;
      return { response: farm };
    }),
    (e) => e.code === "AI_INVALID_DECISION",
  );
  assert.equal(calls, 2);
});
test("urgent food and sleep needs can still repeat useful care instead of enforcing variety", () => {
  const starving = context({ hunger: 98, recent: farmHistory });
  assert.equal(decisionOptions(starving).farmBreak, false);
  assert.equal(
    parseDecision({ ...farm, mood: "crazy hungry" }, starving).action,
    "farm",
  );
  const tired = context({ energy: 5, recent: farmHistory });
  assert.equal(decisionOptions(tired).farmBreak, false);
  assert.equal(
    parseDecision(
      {
        mood: "sleep",
        action: "rest",
        activityId: "chichi-bed",
        thought: "Посплю.",
      },
      tired,
    ).action,
    "rest",
  );
});
test("legacy tabs without crop telemetry keep their physical farming target usable", () => {
  const g = newGame(),
    world = worldSnapshot(g),
    f = world.activities.find((a) => a.id === "welcome-farm");
  delete f.harvestReady;
  delete f.emptyPlots;
  delete f.seedAffordable;
  const state = validateState({ ...g.cat, world });
  assert.equal(parseDecision(farm, state).action, "farm");
});
