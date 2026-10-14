import { initialScenery } from "../public/scenery-data.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newGame,
  loadGame,
  saveGame,
  SAVE_KEY,
  purchase,
  moveItem,
  worldSnapshot,
  unlockBiome,
  biomeRequirement,
  harvestField,
  claimRewards,
} from "../public/economy.js";
import {
  addXP,
  levelForXP,
  xpForLevel,
  DAILY_XP_LIMIT,
  adventureXP,
  visitXP,
} from "../public/progression.js";
import { byItem, BIOMES } from "../public/game-data.js";
import { permanentObjects, PARK_RIDES } from "../public/world-objects.js";
import { makeAttraction, animateAttraction } from "../public/world-assets.js";
import { createBiomeScene, disposeBiome } from "../public/biome-scenes.js";
import { createLagoon } from "../public/lagoon.js";
import { validateState, parseDecision } from "../ai.mjs";
import { swimFrame } from "../public/swimming.js";
const now = Date.UTC(2026, 9, 14, 12);
const storage = () => {
  const map = new Map();
  return {
    getItem: (k) => map.get(k) || null,
    setItem: (k, v) => map.set(k, v),
  };
};
test("novice cannot buy late attractions or legendary land with money alone", () => {
  const g = newGame(now);
  g.coins = 999999;
  assert.throws(() => purchase(g, "coaster-comet-flight"), /уровне 18/);
  assert.throws(() => unlockBiome(g, "aquapark"), /уровне 20/);
  assert.match(biomeRequirement(g, "beach"), /уровне 5/);
  assert.ok(purchase(g, "mouse").inventory.mouse);
});
test("XP is progressive and daily bounded; clock rollback and refresh cannot bypass the pace", () => {
  let g = addXP(newGame(now), 1000000, now);
  assert.equal(g.progression.xp, DAILY_XP_LIMIT);
  assert.ok(levelForXP(g.progression.xp) < 8);
  assert.equal(addXP(g, 1000, now).progression.xp, DAILY_XP_LIMIT);
  assert.equal(addXP(g, 1000, now - 86400000).progression.xp, DAILY_XP_LIMIT);
  g = addXP(g, DAILY_XP_LIMIT, now + 86400000);
  assert.equal(g.progression.xp, DAILY_XP_LIMIT * 2);
  for (let i = 2; i <= 30; i++) assert.ok(xpForLevel(i) > xpForLevel(i - 1));
  const s = storage();
  saveGame(s, g);
  assert.equal(loadGame(s, now + 86400000).progression.xp, g.progression.xp);
});
test("first purchase awards XP once, duplicates and rearrangement never farm experience", () => {
  const g = purchase(newGame(now), "mouse"),
    again = purchase(g, "mouse");
  assert.ok(g.progression.xp > 0);
  assert.equal(again.progression.xp, g.progression.xp);
  assert.equal(
    moveItem(g, "welcome-yarn", "moon", -5, 2).progression.xp,
    g.progression.xp,
  );
});
test("only completed actual harvests and spaced adventures award XP; daily visits count once", () => {
  let g = harvestField(newGame(now), "welcome-farm", now).game;
  assert.equal(g.progression.xp, 20);
  assert.throws(() => harvestField(g, "welcome-farm", now));
  g = adventureXP(g, now);
  assert.equal(adventureXP(g, now + 1).progression.xp, g.progression.xp);
  g = visitXP(g, now);
  assert.equal(visitXP(g, now + 1).progression.visits, 1);
  assert.equal(visitXP(g, now - 86400000).progression.visits, 1);
  assert.equal(visitXP(g, now + 86400000).progression.visits, 2);
});
test("legendary access requires level, farming, friends and visits, then adds actual usable routes", () => {
  const g = newGame(now);
  g.coins = 999999;
  g.progression.xp = xpForLevel(20);
  g.farm.harvests = 180;
  g.progression.visits = 7;
  assert.throws(() => unlockBiome(g, "aquapark"), /подружитесь/);
  for (const id of ["luna", "moti", "pixel"])
    Object.assign(g.social.relationships[id], {
      points: 40,
      meetings: 8,
      plays: 4,
    });
  const opened = unlockBiome(g, "aquapark");
  for (const r of PARK_RIDES)
    assert.ok(worldSnapshot(opened).activities.some((a) => a.id === r.id));
  assert.equal(
    worldSnapshot(g).activities.some((a) => a.id === "royal-cascade"),
    false,
  );
  assert.ok(opened.coins < g.coins);
});
test("old purchased objects, inventory, deadlines, currency and unlocked land migrate without relocking", () => {
  const g = newGame(now);
  delete g.progression;
  g.unlocked = BIOMES.filter((b) => b.id !== "aquapark").map((b) => b.id);
  g.inventory["coaster-comet-flight"] = 1;
  g.coins = 8765;
  const s = storage();
  saveGame(s, g);
  const restored = loadGame(s, now);
  assert.deepEqual(restored.unlocked, g.unlocked);
  assert.deepEqual(restored.placements, g.placements);
  assert.equal(restored.coins, g.coins);
  assert.equal(restored.inventory["coaster-comet-flight"], 1);
  const xp = restored.progression.xp;
  saveGame(s, restored);
  assert.equal(loadGame(s, now).progression.xp, xp);
  assert.equal(restored.scenery.length, initialScenery(g.placements).length);
});
test("six new rides have distinct finite trajectories and a real catapult flight", () => {
  const ids = [
      "coaster-rainbow-launch",
      "slide-royal-cascade",
      "slide-vortex-bowl",
      "coaster-comet-flight",
      "ride-jellyfish",
      "ride-dragon-cloud",
    ],
    routes = [];
  for (const id of ids) {
    const g = makeAttraction(id);
    assert.ok(g.userData.rideFrame);
    const samples = Array.from({ length: 60 }, (_, i) =>
      g.userData.rideFrame((g.userData.duration * i) / 60),
    );
    for (const f of samples) assert.ok(f.position.every(Number.isFinite));
    routes.push(
      JSON.stringify(samples.map((f) => f.position.map((x) => x.toFixed(2)))),
    );
    if (g.userData.flight) {
      const f = samples.find((f) => f.phase === "flight");
      assert.ok(f);
      assert.ok(Math.max(...samples.map((f) => f.position[1])) > 10);
      assert.ok(f.paw > 0.8);
      assert.ok(
        !samples.some(
          (_, i) =>
            g.userData.rideFrame((g.userData.duration * i) / 60, true).phase ===
            "flight",
        ),
      );
    }
    const before = g.userData.moving.position.clone();
    animateAttraction(g, 3);
    assert.ok(g.userData.moving.position.distanceTo(before) > 0.1);
  }
  assert.equal(new Set(routes).size, ids.length);
});
test("all natural lakes are canonical physical AI and manual targets, while locked park stays unavailable", () => {
  const g = newGame(now),
    state = validateState({ ...g.cat, world: worldSnapshot(g) });
  assert.equal(
    parseDecision(
      {
        mood: "happy",
        action: "swim",
        activityId: "lake-moon",
        thought: "Поплаваю в лунном пруду",
      },
      state,
    ).target,
    "pond",
  );
  assert.throws(() =>
    parseDecision(
      {
        mood: "happy",
        action: "ride",
        activityId: "royal-rainbow",
        thought: "Горка",
      },
      state,
    ),
  );
  const opened = { ...g, unlocked: BIOMES.map((b) => b.id) };
  assert.ok(permanentObjects(opened.unlocked).length > 8);
  const spoof = worldSnapshot(g);
  spoof.activities.push({
    id: "lake-aquapark",
    type: "swim-lagoon",
    biome: "aquapark",
  });
  assert.throws(() => validateState({ ...g.cat, world: spoof }));
});
test("swimming stays inside lagoons and player splashes alter water uniforms and fish transforms", () => {
  const lagoon = createLagoon({ rx: 3, rz: 2, fishCount: 12 });
  for (let t = 0; t < 30; t += 0.2) {
    const f = swimFrame(t, { rx: 3, rz: 2 });
    assert.ok((f.x / 3) ** 2 + (f.z / 2) ** 2 < 1);
    assert.ok(Number.isFinite(f.yaw));
  }
  const fish = lagoon.children.find((o) => o.isInstancedMesh && o.count === 12);
  lagoon.userData.update(2);
  const before = fish.instanceMatrix.array.slice();
  lagoon.userData.disturb(0.8, 0.2, 2, 1);
  lagoon.userData.update(2.2);
  assert.ok(
    lagoon.userData.water.uniforms.uRipples.value.some((r) => r.w === 1),
  );
  assert.notDeepEqual(fish.instanceMatrix.array, before);
});
test("legendary scene is genuinely larger, contains a castle and cascades and supports saved movable trees", () => {
  const g = newGame(now),
    b = BIOMES.find((b) => b.id === "aquapark"),
    scene = createBiomeScene(b, {
      scenery: g.scenery.filter((r) => r.biome === b.id),
    });
  assert.equal(b.radius, 19);
  assert.equal(scene.userData.stats.fishCount, 52);
  assert.ok(scene.userData.stats.sourceMeshes > 600);
  assert.equal(scene.userData.trees.length, 5);
  assert.equal(scene.userData.sceneryObjects.size, 9);
  assert.ok([...scene.userData.lagoons.keys()].includes("lake-aquapark"));
  disposeBiome(scene);
});
test("barista cafe contains an animated volumetric cat, steam, real cups and pantry-dependent meals", () => {
  const g = makeAttraction("cat-barista");
  assert.ok(g.userData.barista);
  assert.equal(g.userData.barista.userData.mood, "happy");
  assert.ok(g.userData.moving.children.length >= 7);
  g.userData.update(1);
  g.userData.update(3);
  const world = newGame(now);
  world.placements.push({
    id: "bistro",
    item: "cat-barista",
    biome: "moon",
    x: 0,
    z: 0,
    rotation: 0,
  });
  assert.equal(
    worldSnapshot(world).activities.find((a) => a.id === "bistro").foodPortions,
    0,
  );
});
test("castle and cafe decorations stay within their authored physical proportions", async () => {
  const THREE = await import("three");
  const { royalCastle } = await import("../public/legendary-assets.js");
  const castle = new THREE.Group();
  royalCastle(castle);
  const size = new THREE.Box3()
    .setFromObject(castle)
    .getSize(new THREE.Vector3());
  assert.ok(size.x < 9 && size.z < 8 && size.y < 11, JSON.stringify(size));
  const cafe = makeAttraction("cat-barista"),
    bounds = new THREE.Box3().setFromObject(cafe).getSize(new THREE.Vector3());
  assert.ok(bounds.x < 6 && bounds.z < 6);
});
test("older open clients are never sent new physical targets absent from their scene", () => {
  const g = newGame(now),
    world = worldSnapshot(g);
  world.activities = world.activities.filter((a) => !a.id.startsWith("lake-"));
  const state = validateState({ ...g.cat, world });
  assert.equal(
    state.world.activities.some((a) => a.id.startsWith("lake-")),
    false,
  );
});
