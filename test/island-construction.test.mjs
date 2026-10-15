import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newGame,
  unlockBiome,
  worldSnapshot,
  loadGame,
  saveGame,
  SAVE_KEY,
  purchase,
} from "../public/economy.js";
import { byBiome } from "../public/game-data.js";
import { xpForLevel } from "../public/progression.js";
import {
  islandProjects,
  startIslandConstruction,
} from "../public/island-construction.js";
import { islandObjects } from "../public/world-objects.js";
import { manualInteraction } from "../public/interactions.js";
import { validateState, parseDecision } from "../ai.mjs";
import { mergeSharedWorld } from "../shared-world.mjs";
import { islandProjectModel } from "../public/island-project-model.js";
import { disposeBiome } from "../public/biome-scenes.js";
const now = Date.now(),
  hour = 3600000;
function openable() {
  const g = newGame(now);
  g.progression.xp = xpForLevel(18) + 100;
  g.coins = 50000;
  g.friendship.luna = 80;
  g.friendship.moti = 80;
  for (const id of ["luna", "moti"])
    Object.assign(g.social.relationships[id], {
      points: 80,
      meetings: 16,
      plays: 7,
    });
  return g;
}
function opened() {
  return unlockBiome(openable(), "clockwork", now);
}
test("opening the cotton island pays once and automatically starts all four included attractions; pigs and pools are immediately available", () => {
  const before = openable(),
    g = unlockBiome(before, "clockwork", now),
    p = islandProjects(g, "clockwork", now);
  assert.equal(g.coins, before.coins - byBiome("clockwork").price);
  assert.equal(p.length, 4);
  assert.equal(g.islandConstruction.clockwork, now);
  assert.ok(p.every((x) => !x.built && x.progress === 0 && x.readyAt > now));
  assert.equal(new Set(p.map((x) => x.readyAt)).size, 4);
  assert.equal(
    islandObjects(g, { includeBuilding: true, now }).filter((x) =>
      x.id.startsWith("cotton-"),
    ).length,
    7,
  );
  assert.equal(
    islandObjects(g, { now }).filter((x) => x.id.startsWith("cotton-")).length,
    3,
  );
  assert.throws(() => unlockBiome(g, "clockwork", now + 100));
  assert.equal(startIslandConstruction(g, "clockwork", now + hour), g);
});
test("unfinished rides are excluded from manual and AI choices and become usable exactly at their deadline without another purchase", () => {
  const g = opened(),
    p = islandProjects(g, "clockwork", now);
  for (const project of p) {
    const before = worldSnapshot(g, project.readyAt - 1),
      after = worldSnapshot(g, project.readyAt);
    assert.throws(() => manualInteraction(before, { activityId: project.id }));
    const state = validateState({
      ...g.cat,
      energy: 90,
      hunger: 10,
      happiness: 90,
      world: before,
    });
    assert.throws(() =>
      parseDecision(
        {
          mood: "happy",
          action: "ride",
          activityId: project.id,
          thought: "Покататься!",
        },
        state,
      ),
    );
    assert.equal(
      manualInteraction(after, { activityId: project.id }).action,
      "ride",
    );
    assert.ok(
      islandObjects(g, { now: project.readyAt }).some(
        (o) => o.id === project.id,
      ),
    );
  }
  assert.ok(
    islandProjects(g, "clockwork", now + 7 * hour).every(
      (p) => p.built && p.progress === 1,
    ),
  );
});
test("construction deadlines survive repeated saves, closed-site elapsed time and old already-open worlds without resetting purchases", () => {
  let g = opened();
  const original = islandProjects(g, "clockwork", now).map((p) => p.readyAt),
    map = new Map(),
    storage = {
      getItem: (k) => map.get(k) || null,
      setItem: (k, v) => map.set(k, v),
    };
  for (let i = 0; i < 25; i++) {
    saveGame(storage, g);
    g = loadGame(storage, now + i * 60000, { advance: false });
    assert.equal(g.islandConstruction.clockwork, now);
    assert.deepEqual(
      islandProjects(g, "clockwork").map((p) => p.readyAt),
      original,
    );
  }
  saveGame(storage, g);
  g = loadGame(storage, now + 7 * hour, { advance: false });
  assert.ok(
    islandProjects(g, "clockwork", now + 7 * hour).every((p) => p.built),
  );
  assert.equal(g.coins, opened().coins);
  const old = structuredClone(g);
  delete old.islandConstruction;
  const restored = loadGame(
    { getItem: (k) => (k === SAVE_KEY ? JSON.stringify(old) : null) },
    now,
    { advance: false },
  );
  assert.ok(islandProjects(restored, "clockwork", now).every((p) => p.built));
  assert.deepEqual(restored.placements, old.placements);
});
test("a second phone, an old tab missing the field, and simultaneous first writes cannot restart or erase island construction", () => {
  const base = opened(),
    current = structuredClone(base);
  current.cat.happiness -= 1;
  const old = structuredClone(base);
  delete old.islandConstruction;
  let merged = mergeSharedWorld(base, current, purchase(old, "mouse", now));
  assert.equal(merged.islandConstruction.clockwork, now);
  assert.equal(merged.inventory.mouse, 1);
  merged = mergeSharedWorld(base, base, purchase(old, "mouse", now));
  assert.equal(merged.islandConstruction.clockwork, now);
  const a = structuredClone(base),
    b = structuredClone(base),
    legacy = structuredClone(base);
  delete legacy.islandConstruction;
  a.islandConstruction.clockwork = now + 500;
  b.islandConstruction.clockwork = now + 900;
  assert.equal(
    mergeSharedWorld(legacy, a, b).islandConstruction.clockwork,
    now + 500,
  );
});
test("construction contains the actual colorful future attraction and fences with independent transparent materials", () => {
  const g = islandProjectModel("ride-cupcake-wheel"),
    future = g.getObjectByName("Future island attraction");
  assert.ok(future);
  assert.ok(future.userData.rideFrame);
  let meshes = 0;
  future.traverse((o) => {
    if (o.isMesh) {
      meshes++;
      assert.equal(o.material.transparent, true);
      assert.equal(o.material.opacity, 0.32);
      assert.equal(o.material.userData.sharedScenery, false);
    }
  });
  assert.ok(meshes > 10);
  g.userData.update(3);
  assert.notEqual(g.userData.moving.rotation.z, 0);
  disposeBiome(g);
});
