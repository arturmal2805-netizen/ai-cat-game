import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  BIOMES,
  byBiome,
  byItem,
  biomeReservations,
} from "../public/game-data.js";
import {
  CAPYBARA_POOLS,
  CAPYBARA_OBJECTS,
  CAPYBARA_RIDES,
  capybaraHeight,
  capybaraDryPoint,
} from "../public/capybara-data.js";
import {
  newGame,
  worldSnapshot,
  loadGame,
  saveGame,
  canPlace,
  findSpace,
  purchase,
} from "../public/economy.js";
import { mergeSharedWorld } from "../shared-world.mjs";
import { manualInteraction } from "../public/interactions.js";
import { validateState, parseDecision } from "../ai.mjs";
import { makeAttraction } from "../public/world-assets.js";
import {
  createBiomeScene,
  prepareBiomeScene,
  disposeBiome,
} from "../public/biome-scenes.js";
import { createCapybara } from "../public/capybara-model.js";
import { islandShoreRadius, MIN_ISLAND_GAP } from "../public/world-layout.js";
const now = Date.UTC(2026, 9, 16, 12);
function game() {
  const g = newGame(now);
  g.unlocked.push("summer");
  return g;
}
test("capybara lagoon replaces summer in place, triples area and leaves all shores separate", () => {
  const b = byBiome("summer");
  assert.equal(BIOMES.length, 20);
  assert.equal(b.name, "Блакитна лагуна капібар");
  assert.ok(Math.abs((b.radius / 11.65) ** 2 - 3) < 1e-10);
  assert.equal(b.requiredLevel, 4);
  for (const other of BIOMES.filter((o) => o !== b))
    assert.ok(
      Math.hypot(b.center[0] - other.center[0], b.center[1] - other.center[1]) -
        islandShoreRadius(b) -
        islandShoreRadius(other) >=
        MIN_ISLAND_GAP - 1e-5,
      other.id,
    );
  for (let x = -10; x <= 10; x++)
    for (let z = -10; z <= 10; z++)
      if (Math.hypot(x, z) < 10.8) assert.equal(capybaraHeight(x, z), 0);
  for (const o of CAPYBARA_OBJECTS)
    assert.ok(
      biomeReservations("summer").some((r) => r.x === o.x && r.z === o.z),
    );
});
test("all four capybaras are physical manual and AI ride choices only after summer unlocks", () => {
  const g = game(),
    world = worldSnapshot(g),
    state = validateState({
      ...g.cat,
      energy: 90,
      hunger: 10,
      happiness: 90,
      world,
    });
  for (const o of CAPYBARA_OBJECTS) {
    assert.equal(manualInteraction(world, { activityId: o.id }).action, "ride");
    assert.equal(
      parseDecision(
        {
          mood: "happy",
          action: "ride",
          activityId: o.id,
          thought: "Хочу на спинку цієї капібари!",
        },
        state,
      ).activityId,
      o.id,
    );
    assert.throws(() =>
      manualInteraction(worldSnapshot(newGame(now)), { activityId: o.id }),
    );
    assert.deepEqual(byItem(o.type).actions, ["ride"]);
  }
  for (const p of CAPYBARA_POOLS) {
    assert.equal(manualInteraction(world, { activityId: p.id }).action, "swim");
    assert.equal(canPlace(g, "yarn", "summer", p.x, p.z).ok, false);
  }
});
test("every animated capybara carries its rider on its exact moving seat around a closed stable journey", () => {
  for (const s of CAPYBARA_RIDES) {
    const r = makeAttraction(s.id),
      { rideFrame: frame, duration, animal } = r.userData;
    r.position.set(12, 3, -8);
    r.rotation.y = 0.47;
    assert.ok(
      new THREE.Vector3(...frame(0).position).distanceTo(
        new THREE.Vector3(...frame(duration).position),
      ) < 1e-8,
      s.id,
    );
    let travel = 0,
      previous;
    for (let t = 0; t <= duration; t += 0.25) {
      const f = frame(t);
      assert.ok([...f.position, f.yaw].every(Number.isFinite));
      if (previous)
        travel += new THREE.Vector3(...previous).distanceTo(
          new THREE.Vector3(...f.position),
        );
      previous = f.position;
      r.userData.rideElapsed = t;
      r.userData.update(999);
      r.updateMatrixWorld(true);
      const actual = animal.userData.seat.getWorldPosition(new THREE.Vector3()),
        expected = r.localToWorld(new THREE.Vector3(...f.position));
      assert.ok(actual.distanceTo(expected) < 1e-6, s.id + " seat at " + t);
    }
    assert.ok(travel > 7);
    r.userData.update(2, true);
    assert.ok(frame(2, true).position.every(Number.isFinite));
    assert.ok(animal.userData.legs.every((l) => l.rotation.x === 0));
    disposeBiome(r);
  }
});
test("capybaras have continuous closed skin, short animated paws, round ears and blinking eyes", () => {
  const c = createCapybara({ saddle: true }),
    skin = c.userData.skinGeometry;
  const edges = new Map(),
    indices = skin.index.array;
  for (let i = 0; i < indices.length; i += 3)
    for (const [a, b] of [
      [indices[i], indices[i + 1]],
      [indices[i + 1], indices[i + 2]],
      [indices[i + 2], indices[i]],
    ]) {
      const key = a < b ? a + ":" + b : b + ":" + a;
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  assert.ok(
    [...edges.values()].every((count) => count === 2),
    "Cheeks and belly have no holes",
  );
  // Static batching keeps the sculpt as one connected surface within its mesh.
  assert.ok(
    c.userData.body.children.some((g) =>
      g.children.some((m) => m.geometry?.attributes.position.count > 1000),
    ),
  );
  c.userData.update(1);
  const legs = c.userData.legs.map((l) => l.rotation.x),
    ears = c.userData.ears.map((e) => e.rotation.x);
  c.userData.update(2);
  assert.notDeepEqual(
    c.userData.legs.map((l) => l.rotation.x),
    legs,
  );
  assert.notDeepEqual(
    c.userData.ears.map((e) => e.rotation.x),
    ears,
  );
  c.userData.update(4.32);
  assert.ok(c.userData.eyes.every((e) => e.scale.y < 0.2));
  c.userData.update(3, true);
  assert.ok(c.userData.eyes.every((e) => e.scale.y === 1));
  disposeBiome(c);
});
test("resting cats stay on dry banks while every real capybara route stays on its intended surface", () => {
  for (const p of CAPYBARA_POOLS) {
    const dry = capybaraDryPoint(p.x, p.z);
    assert.ok(((dry.x - p.x) / p.rx) ** 2 + ((dry.z - p.z) / p.rz) ** 2 > 1);
    assert.ok(Math.hypot(dry.x, dry.z) < byBiome("summer").radius);
  }
  const swimming = CAPYBARA_OBJECTS.find((o) => o.id === "capybara-float"),
    pool = CAPYBARA_POOLS[0],
    rig = makeAttraction(swimming.type);
  for (let t = 0; t <= rig.userData.duration; t += 0.25) {
    const f = rig.userData.rideFrame(t);
    assert.ok(
      ((swimming.x + f.position[0] - pool.x) / pool.rx) ** 2 +
        ((swimming.z + f.position[2] - pool.z) / pool.rz) ** 2 <
        0.4,
    );
  }
  const [x, , z] = swimming.dismount;
  assert.ok(
    ((swimming.x + x - pool.x) / pool.rx) ** 2 +
      ((swimming.z + z - pool.z) / pool.rz) ** 2 >
      1,
  );
  disposeBiome(rig);
});
test("the real island has four open swimming basins, ten moving waterfalls and an instanced capybara family", () => {
  const s = createBiomeScene(byBiome("summer"), { preview: true });
  s.updateMatrixWorld(true);
  assert.equal(s.userData.lagoons.size, 4);
  assert.equal(s.userData.capybara.waterfalls.length, 10);
  assert.ok(s.userData.capybara.crowd.length >= 15);
  assert.ok(s.userData.trees.length >= 14);
  assert.ok(s.userData.stats.staticMeshes <= 8);
  assert.ok(s.userData.groundCover.userData.stats.flowers > 200);
  for (const p of CAPYBARA_POOLS) {
    const ray = new THREE.Raycaster(
      new THREE.Vector3(p.x, p.y + 1, p.z),
      new THREE.Vector3(0, -1, 0),
    );
    assert.ok(
      !ray
        .intersectObjects(s.userData.navigationSurface.children)
        .some((h) => h.point.y > p.y - 0.6 && h.point.y < p.y + 0.2),
      p.id + " water floor must stay visible",
    );
  }
  const fall = s.userData.capybara.waterfalls[0],
    spray = fall.children.find((c) => c.isInstancedMesh);
  s.userData.update(1);
  const matrix = [...spray.instanceMatrix.array];
  s.userData.update(2);
  assert.notDeepEqual([...spray.instanceMatrix.array], matrix);
  disposeBiome(s);
  const low = createBiomeScene(byBiome("summer"), { lowOnly: true });
  assert.equal(low.userData.detail.visible, false);
  assert.equal(low.userData.lowDetail.visible, true);
  assert.equal(low.userData.stats.fishCount, 0);
  disposeBiome(low);
});
test("cooperative and synchronous lagoon builders preserve all authored geometry and crowds", async () => {
  const options = { preview: true },
    a = createBiomeScene(byBiome("summer"), options),
    b = await prepareBiomeScene(byBiome("summer"), options, {
      yieldTask: async () => {},
    }),
    counts = (root) => {
      const result = { meshes: 0, triangles: 0, instances: 0 };
      root.traverse((o) => {
        if (!o.isMesh) return;
        result.meshes++;
        result.triangles +=
          (o.geometry.index?.count || o.geometry.attributes.position.count) / 3;
        result.instances += o.isInstancedMesh ? o.count : 0;
      });
      return result;
    };
  assert.deepEqual(counts(a), counts(b));
  assert.deepEqual(a.userData.stats, b.userData.stats);
  assert.equal(
    a.userData.capybara.crowd.length,
    b.userData.capybara.crowd.length,
  );
  disposeBiome(a);
  disposeBiome(b);
});
test("old meadow ownership, placed farm, crop deadlines, coins, XP and moved palms survive 30 reloads", () => {
  let g = game();
  g.coins = 8765;
  g.progression.xp = 1234;
  g.placements.push({
    id: "old-meadow-farm",
    item: "farm-field",
    biome: "summer",
    x: -3,
    z: -3,
    rotation: 0,
    readyAt: now + 14400000,
  });
  g.farm.fields["old-meadow-farm"] = [
    { crop: "wheat", readyAt: now + 1800000 },
    { crop: null, readyAt: 0 },
    { crop: null, readyAt: 0 },
  ];
  g.catPosition = { biome: "summer", x: 0, z: 8 };
  const tree = g.scenery.find(
      (r) =>
        r.biome === "summer" && r.type === "scenery-tree-palm" && !r.stored,
    ),
    spot = { x: -2, z: 3 }; // A saved tree now stands inside the enlarged lagoon.
  Object.assign(tree, spot, { rotation: 1 });
  const expected = structuredClone(g),
    map = new Map(),
    storage = {
      getItem: (k) => map.get(k) || null,
      setItem: (k, v) => map.set(k, v),
    };
  for (let i = 0; i < 30; i++) {
    assert.ok(saveGame(storage, g));
    g = loadGame(storage, now, { advance: false });
    assert.equal(g.coins, expected.coins);
    assert.deepEqual(g.progression, expected.progression);
    assert.deepEqual(g.placements, expected.placements);
    assert.deepEqual(g.farm.fields, expected.farm.fields);
    assert.deepEqual(g.catPosition, expected.catPosition);
    assert.deepEqual(
      g.scenery.find((r) => r.id === tree.id),
      { ...tree, stored: false },
    );
    assert.ok(g.unlocked.includes("summer"));
  }
  const scene = createBiomeScene(byBiome("summer"), {
    preview: true,
    placements: g.placements.filter((p) => p.biome === "summer"),
    scenery: g.scenery.filter((p) => p.biome === "summer"),
  });
  assert.ok(scene.userData.legacyPlatforms.includes("old-meadow-farm"));
  assert.ok(scene.userData.legacyPlatforms.includes(tree.id));
  disposeBiome(scene);
});

test("normalizing a visible legacy tree inside the new lake cannot block cooperative cloud saves", () => {
  const legacy = game();
  legacy.coins = 9876;
  legacy.scenery = legacy.scenery.filter(
    (p) => p.biome !== "summer" || Number(p.id.split("-").at(-1)) < 10,
  );
  const tree = legacy.scenery.find((p) => p.id === "decor-summer-1");
  Object.assign(tree, { x: -2, z: 3, rotation: 1 });
  // Early clients omitted false flags in saved visible scenery.
  for (const p of legacy.scenery) if (!p.stored) delete p.stored;
  const restored = loadGame(
    {
      getItem: (k) => (k === "chichi-world-v2" ? JSON.stringify(legacy) : null),
    },
    now,
    { advance: false },
  );
  const visible = restored.scenery.find((p) => p.id === tree.id);
  assert.equal(visible.x, tree.x);
  assert.equal(visible.z, tree.z);
  assert.equal(visible.stored, false);
  assert.equal(
    canPlace(restored, tree.type, "summer", tree.x, tree.z, 1, tree.id).ok,
    false,
  );
  const merged = mergeSharedWorld(legacy, legacy, restored),
    bought = purchase(merged, "yarn", now),
    saved = mergeSharedWorld(merged, merged, bought);
  assert.equal(saved.coins, bought.coins);
  assert.deepEqual(
    saved.scenery.find((p) => p.id === tree.id),
    visible,
  );
  assert.equal(saved.inventory.yarn, 1);
  // Actual attempts to move a tree into occupied water remain rejected.
  const moved = structuredClone(saved);
  moved.scenery.find((p) => p.id === tree.id).x += 0.1;
  assert.throws(() => mergeSharedWorld(saved, saved, moved), /декора/);
});
