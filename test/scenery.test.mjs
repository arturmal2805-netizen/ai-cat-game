import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  newGame,
  loadGame,
  saveGame,
  SAVE_KEY,
  moveScenery,
  storeScenery,
  canPlace,
  findSpace,
  worldSnapshot,
} from "../public/economy.js";
import { BIOMES } from "../public/game-data.js";
import {
  byScenery,
  initialScenery,
  SCENERY_TYPES,
} from "../public/scenery-data.js";
import {
  createSceneryModel,
  fadeScenery,
  disposeScenery,
} from "../public/scenery-models.js";
import { createBiomeScene } from "../public/biome-scenes.js";
import { makeAttraction } from "../public/world-assets.js";
const storage = () => {
  const values = new Map();
  return {
    getItem: (k) => values.get(k) || null,
    setItem: (k, v) => values.set(k, v),
  };
};

test("all islands start with independently identified trees, houses, rocks and a clear starter ride yard", () => {
  const g = newGame();
  assert.equal(g.scenery.length, initialScenery(g.placements).length);
  assert.equal(
    new Set(g.scenery.map((r) => r.id)).size,
    initialScenery(g.placements).length,
  );
  for (const r of g.scenery)
    assert.ok(
      canPlace(g, r.type, r.biome, r.x, r.z, r.rotation, r.id, {
        allowLocked: true,
      }).ok,
      r.id,
    );
  for (const b of BIOMES.filter(
    (b) => !["homestead", "aquarium", "jobcity", "cat-homes"].includes(b.id),
  ))
    for (const kind of ["aquapark", "autumn", "foodcourt", "bikini"].includes(
      b.id,
    )
      ? ["tree", "rock"]
      : ["tree", "house", "rock", "landmark"])
      assert.ok(
        g.scenery.some(
          (r) => r.biome === b.id && byScenery(r.type).category === kind,
        ),
      );
  assert.ok(findSpace(g, "coaster", "moon"));
});
test("tree, cottage and boulder moves, rotations and cross-island transfers survive a verified save", () => {
  let g = newGame();
  g.unlocked.push("autumn");
  const before = structuredClone(g),
    s = storage();
  for (const kind of ["tree", "house", "rock"]) {
    const record = g.scenery.find(
        (r) => r.biome === "moon" && byScenery(r.type).category === kind,
      ),
      p = findSpace(g, record.type, "autumn", 1, record.id);
    assert.ok(p);
    g = moveScenery(g, record.id, "autumn", p.x, p.z, 1);
    assert.ok(saveGame(s, g));
    const restored = loadGame(s);
    const moved = restored.scenery.find((r) => r.id === record.id);
    assert.equal(moved.biome, "autumn");
    assert.equal(moved.x, p.x);
    assert.equal(moved.z, p.z);
    assert.equal(moved.rotation, 1);
    assert.equal(moved.scale, record.scale);
    g = restored;
  }
  assert.equal(g.coins, before.coins);
  assert.deepEqual(g.placements, before.placements);
  assert.deepEqual(
    worldSnapshot(g).activities,
    worldSnapshot(before).activities,
  );
});
test("stored scenery does not respawn after reload and restoring it neither charges coins nor creates copies", () => {
  let g = newGame();
  const id = g.scenery.find(
      (r) => r.biome === "moon" && r.type.startsWith("scenery-tree-"),
    ).id,
    s = storage(),
    coins = g.coins;
  g = storeScenery(g, id);
  assert.ok(saveGame(s, g));
  g = loadGame(s);
  assert.equal(g.scenery.find((r) => r.id === id).stored, true);
  const record = g.scenery.find((r) => r.id === id),
    p = findSpace(g, record.type, "moon", 2, id);
  assert.ok(p);
  g = moveScenery(g, id, "moon", p.x, p.z, 2);
  assert.equal(g.scenery.filter((r) => r.id === id).length, 1);
  assert.equal(g.scenery.find((r) => r.id === id).stored, false);
  assert.equal(g.coins, coins);
});
test("storing a transferred decoration retains its last island, position and rotation after reload", () => {
  let g = newGame();
  g.unlocked.push("autumn");
  const r = g.scenery.find(
      (r) => r.biome === "moon" && r.type === "scenery-boulder",
    ),
    p = findSpace(g, r.type, "autumn", 3, r.id);
  g = moveScenery(g, r.id, "autumn", p.x, p.z, 3);
  g = storeScenery(g, r.id);
  const s = storage();
  saveGame(s, g);
  const after = loadGame(s).scenery.find((item) => item.id === r.id);
  assert.equal(after.stored, true);
  assert.equal(after.biome, "autumn");
  assert.equal(after.x, p.x);
  assert.equal(after.z, p.z);
  assert.equal(after.rotation, 3);
});
test("scenery rejects collisions with purchases, permanent care objects, water, island edges and locked land", () => {
  const g = newGame(),
    r = g.scenery.find(
      (r) => r.biome === "moon" && byScenery(r.type).category === "rock",
    ),
    before = structuredClone(g);
  for (const [b, x, z] of [
    ["moon", -5, 2],
    ["moon", -6, -4],
    ["moon", 5, 4],
    ["moon", 11, 11],
    ["autumn", 0, 0],
  ])
    assert.throws(() => moveScenery(g, r.id, b, x, z, 0));
  assert.throws(() => moveScenery(g, r.id, "moon", NaN, 0, 0));
  assert.throws(() => moveScenery(g, r.id, "moon", 0, 0, 5));
  assert.deepEqual(g, before);
});
test("old saves retain all sixty purchases, currency, friends and construction timers during scenery migration", () => {
  const legacy = newGame(100000);
  delete legacy.scenery;
  legacy.unlocked = BIOMES.map((b) => b.id);
  legacy.coins = 98765;
  legacy.friendship = { luna: 45 };
  Object.assign(legacy.social.relationships.luna, {
    points: 45,
    meetings: 6,
    plays: 3,
  });
  legacy.placements = [];
  for (let i = 0; i < 60; i++)
    legacy.placements.push({
      id: "legacy-" + i,
      item: "mouse",
      biome: BIOMES[i % 24].id,
      x: Math.floor(i / 24) * 4 - 4,
      z: 0,
      rotation: i % 4,
      startedAt: 500,
      readyAt: 9999999,
    });
  const s = storage();
  saveGame(s, legacy);
  const restored = loadGame(s, 100000);
  assert.deepEqual(
    restored.placements.filter((p) => p.biome !== "autumn"),
    legacy.placements.filter((p) => p.biome !== "autumn"),
  );
  for (const before of legacy.placements.filter((p) => p.biome === "autumn")) {
    const after = restored.placements.find((p) => p.id === before.id);
    assert.deepEqual({ ...after, x: before.x, z: before.z }, before);
    assert.ok(
      canPlace(
        restored,
        after.item,
        "autumn",
        after.x,
        after.z,
        after.rotation,
        after.id,
      ).ok,
    );
  }
  assert.equal(restored.coins, legacy.coins);
  assert.equal(restored.friendship.luna, 45);
  assert.equal(
    restored.scenery.length,
    initialScenery(restored.placements).length,
  );
  assert.ok(saveGame(s, restored));
  assert.deepEqual(loadGame(s, 100000).placements, restored.placements);
  const rock = restored.scenery.find(
    (r) => r.biome === "moon" && r.type === "scenery-boulder",
  );
  const p = findSpace(restored, rock.type, "moon", 0, rock.id);
  assert.ok(p);
  assert.equal(
    moveScenery(restored, rock.id, "moon", p.x, p.z).placements.length,
    60,
  );
});
test("invalid decoration records cannot alter identities, geometry scale or introduce unknown objects", () => {
  const original = newGame(),
    s = storage();
  original.scenery[0] = {
    ...original.scenery[0],
    x: Infinity,
    rotation: 99,
    type: "unknown",
    scale: 900,
  };
  original.scenery.push({ id: "injected", type: "unknown", biome: "moon" });
  saveGame(s, original);
  const g = loadGame(s);
  assert.equal(g.scenery.length, initialScenery(g.placements).length);
  assert.ok(!g.scenery.some((r) => r.id === "injected"));
  assert.equal(g.scenery[0].type, "scenery-landmark");
  assert.equal(g.scenery[0].scale, 0.88);
  assert.ok(Number.isFinite(g.scenery[0].x));
});
test("every decorative design has volumetric lit geometry and bounded draw/triangle counts", () => {
  const records = newGame().scenery,
    types = new Set();
  // Legacy snow trees remain renderable even though the marine replacement
  // no longer plants them. Exercise every supported stored design as well.
  for (const type of Object.keys(SCENERY_TYPES))
    if (!records.some((r) => r.type === type))
      records.push({
        id: "legacy-design-" + type,
        type,
        biome: "winter",
        originBiome: "winter",
        x: 0,
        z: 0,
        rotation: 0,
        scale: 1,
      });
  for (const r of records) {
    if (types.has(r.type)) continue;
    types.add(r.type);
    const model = createSceneryModel(r);
    model.updateMatrixWorld(true);
    const size = new THREE.Box3()
      .setFromObject(model)
      .getSize(new THREE.Vector3());
    assert.ok(size.x > 0.5 && size.y > 0.6 && size.z > 0.5, r.type);
    let triangles = 0;
    model.traverse((o) => {
      if (!o.isMesh) return;
      assert.ok(
        o.material.isMeshStandardMaterial || o.material.isMeshBasicMaterial,
      );
      assert.ok(
        [...o.geometry.attributes.position.array].every(Number.isFinite),
      );
      triangles +=
        (o.geometry.index?.count || o.geometry.attributes.position.count) / 3;
    });
    assert.ok(model.children.length <= 6);
    assert.ok(triangles < 35000, r.type + " " + triangles);
    disposeScenery(model);
  }
  assert.equal(types.size, Object.keys(SCENERY_TYPES).length);
});
test("cached geometry remains valid after removing another instance, while fading affects only the occluding object", () => {
  const record = newGame().scenery.find(
      (r) => r.type === "scenery-tree-willow",
    ),
    a = createSceneryModel(record),
    b = createSceneryModel(record);
  assert.equal(a.children[0].geometry, b.children[0].geometry);
  assert.notEqual(a.children[0].material, b.children[0].material);
  let disposed = false;
  b.children[0].geometry.addEventListener("dispose", () => (disposed = true));
  fadeScenery(a, 0.27);
  assert.ok(a.children.every((m) => m.material.opacity === 0.27));
  assert.ok(b.children.every((m) => m.material.opacity === 1));
  disposeScenery(a);
  assert.equal(disposed, false);
  assert.ok(b.children[0].geometry.attributes.position.count);
  disposeScenery(b);
});
test("removing an attraction preserves material caches still used by its neighbour", () => {
  const a = makeAttraction("yarn"),
    b = makeAttraction("yarn");
  let disposed = false;
  let material;
  a.traverse((o) => {
    if (o.isMesh && o.material.userData.sharedScenery) material ||= o.material;
  });
  assert.ok(material);
  let shared = false;
  b.traverse((o) => {
    if (o.isMesh && o.material === material) shared = true;
  });
  assert.ok(shared);
  material.addEventListener("dispose", () => (disposed = true));
  disposeScenery(a);
  assert.equal(disposed, false);
  disposeScenery(b);
});
