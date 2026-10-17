import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  newGame,
  worldSnapshot,
  loadGame,
  SAVE_KEY,
  canPlace,
} from "../public/economy.js";
import { BIOMES, byBiome, JOBS } from "../public/game-data.js";
import { ISLAND_RIDES } from "../public/renewal-data.js";
import { makeAttraction, animateAttraction } from "../public/world-assets.js";
import { createBiomeScene } from "../public/biome-scenes.js";
import { gatherCats } from "../public/adoption.js";
import {
  manualInteraction,
  resolveInteraction,
} from "../public/interactions.js";
import { validateState, parseDecision } from "../ai.mjs";
const now = Date.UTC(2026, 9, 15, 12);
function lagoonGame() {
  const g = newGame(now);
  g.unlocked.push("winter");
  return g;
}

test("Snowy Tale is replaced in place by a whale lagoon with swimming, fish and animated cascades", () => {
  const b = byBiome("winter");
  assert.equal(BIOMES.length, 26);
  assert.equal(b.name, "Китовая лагуна звёзд");
  assert.equal(b.requiredLevel, 4);
  assert.ok(JOBS.find((j) => j.id === "fishing").biomes.includes("winter"));
  const scene = createBiomeScene(b);
  assert.equal(scene.userData.renewal.hero, "whale");
  assert.equal(
    scene.userData.lagoons.get("lake-winter").userData.fishCount,
    58,
  );
  assert.equal(
    scene.userData.lagoons.get("lake-winter-upper").userData.fishCount,
    22,
  );
  assert.equal(scene.userData.renewal.waterfalls.length, 5);
  const whale = scene.userData.renewal.flyers[0];
  scene.userData.update(2);
  const before = whale.userData.moving.position.clone();
  scene.userData.update(4);
  assert.notDeepEqual(whale.userData.moving.position, before);
  scene.userData.dispose();
});
test("all four physical whales and both lagoons are available to manual commands and validated AI choices only on the open island", () => {
  const g = lagoonGame(),
    state = validateState({
      ...g.cat,
      energy: 90,
      hunger: 5,
      happiness: 90,
      world: worldSnapshot(g),
    }),
    rides = ISLAND_RIDES.filter((r) => r.biome === "winter");
  assert.equal(rides.length, 4);
  for (const r of rides) {
    assert.equal(
      manualInteraction(worldSnapshot(g), { activityId: r.id }).action,
      "ride",
    );
    const d = parseDecision(
      JSON.stringify({
        mood: "happy",
        action: "ride",
        activityId: r.id,
        thought: "Хочу полетать на этом ките над лагуной!",
      }),
      state,
    );
    assert.equal(resolveInteraction(state.world, d).activityId, r.id);
    assert.throws(() =>
      manualInteraction(worldSnapshot(newGame(now)), { activityId: r.id }),
    );
  }
  for (const id of ["lake-winter", "lake-winter-upper"])
    assert.equal(
      manualInteraction(worldSnapshot(g), { activityId: id }).action,
      "swim",
    );
  assert.equal(canPlace(g, "yarn", "winter", 0, -0.5).ok, false);
});
test("sculpted whales have outward facing skin and animated fins and carry a rider through a finite closed flight", () => {
  for (const id of ["ride-whale", "ride-whale-aurora"]) {
    const rig = makeAttraction(id),
      body = rig.getObjectByName("Sculpted whale body"),
      p = body.geometry.attributes.position,
      n = body.geometry.attributes.normal;
    assert.ok(p.count > 2000);
    let outward = 0;
    for (let i = 0; i < p.count; i++) {
      assert.ok(
        [
          p.getX(i),
          p.getY(i),
          p.getZ(i),
          n.getX(i),
          n.getY(i),
          n.getZ(i),
        ].every(Number.isFinite),
      );
      if (p.getX(i) * n.getX(i) + p.getY(i) * n.getY(i) > 0) outward++;
    }
    assert.ok(outward > p.count * 0.9);
    const start = rig.userData.rideFrame(0),
      middle = rig.userData.rideFrame(10),
      end = rig.userData.rideFrame(20);
    assert.ok(
      new THREE.Vector3(...start.position).distanceTo(
        new THREE.Vector3(...end.position),
      ) < 0.01,
    );
    assert.ok(middle.position[1] > 6);
    assert.ok(Math.abs(middle.position[0]) > 10);
    animateAttraction(rig, 2);
    const tail = rig.userData.tail.rotation.x;
    animateAttraction(rig, 4);
    assert.notEqual(rig.userData.tail.rotation.x, tail);
    rig.userData.spout.traverse((node) => {
      if (node.geometry?.type === "SphereGeometry")
        assert.ok(
          node.scale.x < 0.15 && node.scale.y < 0.15,
          "Whale fountain droplets must stay small while animating",
        );
    });
    for (let t = 0; t <= 20; t += 0.25)
      assert.ok(rig.userData.rideFrame(t).position.every(Number.isFinite));
  }
});
test("old winter ownership, purchases, crop timers and the new shore destination survive reload", () => {
  let g = lagoonGame();
  g.coins = 3210;
  g.placements.push({
    id: "old-winter-coaster",
    item: "coaster",
    biome: "winter",
    x: 0,
    z: 0,
    rotation: 0,
    readyAt: now + 14400000,
  });
  g.farm.fields["welcome-farm"][0] = { crop: "wheat", readyAt: now + 600000 };
  g = gatherCats(g, "winter");
  assert.deepEqual(g.catPosition, { biome: "winter", x: 0, z: 13 });
  const restored = loadGame(
    { getItem: (k) => (k === SAVE_KEY ? JSON.stringify(g) : null) },
    now,
  );
  assert.equal(restored.coins, 3210);
  assert.deepEqual(restored.unlocked, g.unlocked);
  assert.equal(
    restored.placements.find((p) => p.id === "old-winter-coaster").readyAt,
    now + 14400000,
  );
  assert.equal(restored.farm.fields["welcome-farm"][0].readyAt, now + 600000);
  assert.deepEqual(restored.catPosition, g.catPosition);
  assert.deepEqual(restored.catDestinations, g.catDestinations);
});
