import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { BIOMES, byBiome } from "../public/game-data.js";
import {
  SPA_RADIUS,
  SPA_POOL,
  SPA_JACUZZI,
  SPA_SEATS,
  SPA_OBJECTS,
} from "../public/spa-data.js";
import {
  newGame,
  loadGame,
  worldSnapshot,
  saveGame,
  SAVE_KEY,
} from "../public/economy.js";
import {
  newSpa,
  normalizeSpa,
  completeSpaVisit,
  selectSpaDrink,
} from "../public/spa-system.js";
import { createSpaRuntime } from "../public/spa-runtime.js";
import {
  spaPath,
  spaWalkable,
  spaDistance,
  spaClear,
} from "../public/spa-navigation.js";
import {
  businessVenues,
  normalizeBusiness,
  incomeFor,
  collectIncome,
} from "../public/business.js";
import { manualInteraction } from "../public/interactions.js";
import { mergeSharedWorld } from "../shared-world.mjs";
import { validateState, parseDecision } from "../ai.mjs";
import { createBiomeScene, prepareBiomeScene } from "../public/biome-scenes.js";
const now = Date.UTC(2026, 9, 16, 12),
  game = () => {
    const g = newGame(now);
    g.unlocked.push("water");
    g.business = normalizeBusiness(g.business, g, now);
    return g;
  };
test("SPA replaces the original lagoon in place, triples playable area and preserves the map arrangement", () => {
  assert.equal(BIOMES.length, 24);
  assert.equal(byBiome("water").name, "Cat SPA");
  assert.deepEqual(byBiome("water").center, [0, -40]);
  assert.ok(Math.abs(SPA_RADIUS ** 2 / 11.65 ** 2 - 3) < 1e-12);
  assert.deepEqual(SPA_OBJECTS.map((o) => o.id).sort(), [
    "lake-water",
    "spa-bar",
    "spa-jacuzzi",
    "spa-lounge",
  ]);
  for (const b of BIOMES.filter((b) => b.id !== "water"))
    assert.ok(
      Math.hypot(b.center[0], b.center[1] + 40) >
        SPA_RADIUS + (b.radius || 11.65) + 4.29,
    );
});
test("all four SPA facilities are specific manual and real AI targets after unlocking, including a drink without food in the farm bowl", () => {
  const g = game(),
    world = worldSnapshot(g, now),
    state = validateState({ ...g.cat, world });
  for (const o of SPA_OBJECTS) {
    const d = manualInteraction(world, { activityId: o.id }, "happy");
    assert.equal(d.activityId, o.id);
    assert.equal(
      parseDecision({ ...d, thought: "SPA" }, state).activityId,
      o.id,
    );
  }
  assert.equal(g.care.bowl.length, 0);
  assert.equal(
    manualInteraction(world, { activityId: "spa-bar" }, "happy").action,
    "eat",
  );
  assert.throws(() =>
    manualInteraction(
      worldSnapshot(newGame(now)),
      { activityId: "spa-lounge" },
      "happy",
    ),
  );
  g.coins = 0;
  assert.throws(
    () =>
      manualInteraction(worldSnapshot(g), { activityId: "spa-bar" }, "happy"),
    /монет/,
  );
  const broke = validateState({ ...g.cat, world: worldSnapshot(g) });
  assert.throws(
    () =>
      parseDecision(
        {
          mood: "happy",
          thought: "drink",
          action: "eat",
          activityId: "spa-bar",
        },
        broke,
      ),
    /монет/,
  );
  assert.throws(
    () =>
      parseDecision(
        {
          mood: "happy",
          thought: "party",
          action: "party",
          activityId: "spa-bar",
        },
        state,
      ),
    /unavailable/,
  );
});
test("dry routes clear pool walls, furniture and a placed building without cutting diagonal corners", () => {
  const obstacles = [
    { x: -8, z: 4, w: 2, d: 3 },
    { x: 6, z: -5, radius: 1 },
  ];
  for (const to of [
    { x: -14.2, z: 5.2 },
    { x: 14.1, z: 10 },
    { x: 8, z: -5.7 },
  ]) {
    const path = spaPath({ x: 0, z: 15.6 }, to, 0.55, obstacles);
    assert.ok(path?.length);
    for (let i = 1; i < path.length; i++)
      for (let j = 0; j <= 12; j++) {
        const p = {
          x: path[i - 1].x + ((path[i].x - path[i - 1].x) * j) / 12,
          z: path[i - 1].z + ((path[i].z - path[i - 1].z) * j) / 12,
        };
        assert.ok(spaWalkable(p, 0.55, obstacles), JSON.stringify(p));
      }
  }
  assert.equal(spaWalkable({ x: 0, z: 1 }), false);
  assert.equal(spaWalkable({ x: 14.1, z: 4.5 }), false);
});
test("four cats finish every facility through real approach, enter, relax and exit phases without stacking or leaking reservations", () => {
  for (const objectId of SPA_OBJECTS.map((o) => o.id)) {
    const receipts = [],
      runtime = createSpaRuntime({ onComplete: (r) => receipts.push(r) }),
      phases = new Set();
    for (let i = 0; i < 4; i++)
      assert.ok(
        runtime.start({
          catId: "test-" + i,
          objectId,
          position: { x: -4 + i * 2.5, z: 13, y: 0.16 },
          now,
        }),
      );
    for (let frame = 0; frame < 6000 && runtime.visits.size; frame++) {
      runtime.step(1 / 30, frame / 30);
      const agents = [...runtime.visits.values()];
      for (const a of agents) {
        phases.add(a.phase);
        for (const b of agents)
          if (a !== b)
            assert.ok(
              spaDistance(a.position, b.position) >= a.radius + b.radius + 0.02,
              objectId + " " + a.phase + " / " + b.phase,
            );
      }
    }
    assert.equal(receipts.length, 4, objectId + " must not deadlock");
    assert.equal(runtime.visits.size, 0);
    for (const phase of ["approach", "enter", "relax", "leave"])
      assert.ok(phases.has(phase), phase);
    assert.ok(
      runtime.start({
        catId: "again",
        objectId,
        position: { x: 0, z: 15.6, y: 0.16 },
        now,
      }),
    );
    runtime.clear();
    assert.equal(runtime.visits.size, 0);
  }
});
test("rear daybed places climb above the solid backrest on entry and exit", () => {
  let completed = false;
  const runtime = createSpaRuntime({ onComplete: () => (completed = true) });
  assert.ok(
    runtime.start({
      catId: "chichi",
      objectId: "spa-lounge",
      position: { x: 0, z: 15.6, y: 0.16 },
      now,
    }),
  );
  const crossed = new Set();
  for (let i = 0; i < 6000 && !completed; i++) {
    runtime.step(1 / 30, i / 30);
    const v = runtime.get("chichi");
    if (
      v &&
      ["enter", "leave"].includes(v.phase) &&
      v.position.z > -3 &&
      v.position.z < -1.5
    ) {
      crossed.add(v.phase);
      assert.ok(v.position.y > 1.8, "Clear the 1.75m backrest");
    }
  }
  assert.equal(completed, true);
  assert.deepEqual(crossed, new Set(["enter", "leave"]));
});
test("large cats reserve enough mattress space, bar queue is bounded and cancellation does not produce a charge", () => {
  const receipts = [],
    runtime = createSpaRuntime({ onComplete: (r) => receipts.push(r) });
  for (let i = 0; i < 12; i++)
    runtime.start({
      catId: "big-" + i,
      objectId: "spa-lounge",
      radius: 1.12,
      position: { x: 0, z: 15, y: 0.16 },
      now,
    });
  const places = [...runtime.visits.values()];
  assert.ok(places.length > 0 && places.length < 6);
  for (const a of places)
    for (const b of places)
      if (a !== b)
        assert.ok(spaDistance(a.seat, b.seat) >= a.radius + b.radius + 0.35);
  runtime.clear();
  let accepted = 0;
  for (let i = 0; i < 10; i++)
    if (
      runtime.start({
        catId: "bar-" + i,
        objectId: "spa-bar",
        position: { x: 0, z: 15, y: 0.16 },
        now,
      })
    )
      accepted++;
  assert.equal(accepted, 7);
  runtime.clear();
  assert.deepEqual(receipts, []);
});
test("pool routes avoid legacy timber plots and a seven-cat bar queue drains without overlapping at a shared arrival", () => {
  const obstacles = [
      { x: 1, z: 2, w: 3, d: 4 },
      { x: -3, z: 1, radius: 0.5 },
    ],
    done = [];
  const pool = createSpaRuntime({
    getObstacles: () => obstacles,
    onComplete: (r) => done.push(r),
  });
  assert.ok(
    pool.start({
      catId: "legacy-swimmer",
      objectId: "lake-water",
      position: { x: 0, z: 15, y: 0.16 },
      now,
    }),
  );
  for (let i = 0; i < 6000 && pool.visits.size; i++) {
    pool.step(1 / 30, i / 30);
    for (const v of pool.visits.values())
      assert.ok(spaClear(v.position, v.radius, obstacles));
  }
  assert.equal(done.length, 1);
  const queue = createSpaRuntime({ onComplete: (r) => done.push(r) });
  for (let i = 0; i < 7; i++)
    assert.ok(
      queue.start({
        catId: "queued-" + i,
        objectId: "spa-bar",
        position: { x: 0, z: 15, y: 0.16 },
        now,
      }),
    );
  for (let i = 0; i < 12000 && queue.visits.size; i++) {
    queue.step(1 / 30, i / 30);
    const all = [...queue.visits.values()];
    for (const a of all)
      for (const b of all)
        if (a !== b)
          assert.ok(
            spaDistance(a.position, b.position) >= a.radius + b.radius + 0.02,
          );
  }
  assert.equal(done.length, 8);
  assert.equal(queue.visits.size, 0);
});
test("drinks debit once with needs in one saved snapshot; a finished lounge visit restores energy without persistent bed teleporting", () => {
  const g = game();
  g.cat.hunger = 75;
  g.cat.energy = 30;
  g.cat.happiness = 30;
  const selected = selectSpaDrink(g, "berry"),
    r = {
      id: "served-one",
      catId: "chichi",
      objectId: "spa-bar",
      drinkId: "berry",
      position: { x: 8, z: -5.7 },
    };
  assert.equal(selected.coins, g.coins);
  let next = completeSpaVisit(selected, r, now);
  assert.equal(next.coins, g.coins - 24);
  assert.equal(next.cat.hunger, 43);
  assert.equal(next.cat.energy, 40);
  assert.equal(next.spa.selectedDrink, "berry");
  assert.equal(completeSpaVisit(next, r, now), next);
  next = completeSpaVisit(
    next,
    { id: "rest-one", catId: "chichi", objectId: "spa-lounge" },
    now,
  );
  assert.equal(next.cat.energy, 58);
  assert.equal(next.care.resting, null);
  const empty = structuredClone(g);
  empty.coins = 0;
  assert.throws(() => completeSpaVisit(empty, r, now), /монет/);
  assert.equal(empty.coins, 0);
});
test("SPA bar uses the existing coin/XP register, and collected income cannot be collected again at the same instant", () => {
  let g = game();
  assert.ok(businessVenues(g).some((v) => v.id === "spa-bar"));
  assert.equal(
    g.placements.some((p) => p.id === "spa-bar"),
    false,
  );
  assert.equal(incomeFor(g, "spa-bar", now + 3600000), 320);
  const result = collectIncome(g, "spa-bar", now + 3600000);
  assert.equal(result.amount, 320);
  assert.ok(result.xp > 0);
  assert.equal(result.game.coins >= g.coins + 320, true);
  assert.equal(incomeFor(result.game, "spa-bar", now + 3600000), 0);
});
test("thirty reloads preserve old lagoon purchases, crop/construction deadlines, moved trees, coins, level and SPA receipts", () => {
  let g = game();
  g.coins = 9876;
  g.progression.xp = 1300;
  g.inventory.yarn = 3;
  g.placements.push({
    id: "legacy-lagoon-farm",
    item: "farm-field",
    biome: "water",
    x: 1,
    z: 2,
    rotation: 1,
    readyAt: now + 14400000,
  });
  g.farm.fields["legacy-lagoon-farm"] = [
    { crop: "wheat", readyAt: now + 7200000 },
    { crop: null, readyAt: 0 },
    { crop: null, readyAt: 0 },
  ];
  const tree = g.scenery.find(
    (r) => r.biome === "water" && r.type.includes("tree") && !r.stored,
  );
  Object.assign(tree, { x: -3, z: 1, rotation: 2 });
  g = completeSpaVisit(
    selectSpaDrink(g, "coconut"),
    {
      id: "saved-drink",
      catId: "chichi",
      objectId: "spa-bar",
      drinkId: "coconut",
    },
    now,
  );
  const expected = structuredClone(g),
    storage = {
      value: null,
      getItem(k) {
        return k === SAVE_KEY ? this.value : null;
      },
      setItem(k, v) {
        if (k === SAVE_KEY) this.value = v;
      },
    };
  for (let i = 0; i < 30; i++) {
    assert.equal(saveGame(storage, g), true);
    g = loadGame(storage, now, { advance: false });
  }
  for (const key of ["coins", "placements", "progression", "unlocked", "spa"])
    assert.deepEqual(g[key], expected[key], key);
  assert.deepEqual(
    Object.fromEntries(Object.entries(g.inventory).filter(([, v]) => v)),
    expected.inventory,
  );
  assert.deepEqual(g.farm.fields, expected.farm.fields);
  assert.equal(g.farm.harvests, expected.farm.harvests);
  for (const [id, value] of Object.entries(expected.farm.stock))
    assert.equal(g.farm.stock[id] || 0, value);
  const restored = g.scenery.find((r) => r.id === tree.id);
  for (const k of ["x", "z", "rotation", "stored"])
    assert.equal(restored[k] || false, tree[k] || false);
  const scene = createBiomeScene(byBiome("water"), {
    placements: g.placements.filter((p) => p.biome === "water"),
    scenery: g.scenery.filter((r) => r.biome === "water"),
  });
  assert.ok(scene.userData.legacyPlatforms.includes("legacy-lagoon-farm"));
  assert.ok(scene.userData.legacyPlatforms.includes(tree.id));
  scene.userData.dispose();
});
test("two phones can save independent SPA visits plus a purchase, while duplicate served receipts reject a second debit", () => {
  const base = game(),
    a = completeSpaVisit(
      base,
      { id: "phone-a", catId: "chichi", objectId: "spa-bar", drinkId: "milk" },
      now,
    ),
    b = structuredClone(base);
  b.coins -= 100;
  b.inventory.yarn = 1;
  const merged = mergeSharedWorld(base, a, b);
  assert.equal(merged.coins, base.coins - 112);
  assert.equal(merged.inventory.yarn, 1);
  assert.ok(merged.spa.receipts.includes("phone-a"));
  assert.throws(() => mergeSharedWorld(base, a, a), /візит/);
  const other = completeSpaVisit(
    base,
    { id: "phone-b", catId: "chichi", objectId: "spa-jacuzzi" },
    now + 1,
  );
  const both = mergeSharedWorld(base, a, other);
  assert.deepEqual(new Set(both.spa.receipts), new Set(["phone-a", "phone-b"]));
});
test("the actual SPA has open water basins, animated bubbles/steam and equivalent cooperative geometry", async () => {
  const b = byBiome("water"),
    a = createBiomeScene(b, { scenery: [] }),
    c = await prepareBiomeScene(
      b,
      { scenery: [] },
      { budget: 4, yieldTask: async () => {} },
    );
  for (const p of [SPA_POOL, SPA_JACUZZI]) {
    a.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(
      new THREE.Vector3(p.x, 10, p.z),
      new THREE.Vector3(0, -1, 0),
    );
    assert.equal(
      ray.intersectObject(a.userData.navigationSurface.children[0]).length,
      0,
    );
    assert.ok(a.userData.lagoons.has(p.id));
  }
  const steam = [];
  a.traverse((o) => {
    if (o.isInstancedMesh && [8, 24].includes(o.count)) steam.push(o);
  });
  const before = steam.map((m) => [...m.instanceMatrix.array]);
  a.userData.update(4);
  assert.ok(
    steam.some(
      (m, i) =>
        JSON.stringify([...m.instanceMatrix.array]) !==
        JSON.stringify(before[i]),
    ),
  );
  const geometry = (root) => {
    const meshes = [];
    root.traverse((o) => {
      if (o.isMesh)
        meshes.push([o.geometry.attributes.position.count, o.count || 0]);
    });
    return meshes;
  };
  assert.deepEqual(geometry(a), geometry(c));
  a.userData.dispose();
  c.userData.dispose();
});
