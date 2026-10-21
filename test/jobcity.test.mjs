import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as T from "three";
import { BIOMES, byBiome, CATALOG } from "../public/game-data.js";
import {
  newGame,
  unlockBiome,
  loadGame,
  saveGame,
  SAVE_KEY,
} from "../public/economy.js";
import { xpForLevel } from "../public/progression.js";
import {
  JOB_BUSINESSES,
  JOB_CARS,
  JOB_CITY_RADIUS,
  JOB_CITY_CENTER,
  jobStations,
} from "../public/jobcity-data.js";
import {
  ensureJobCity,
  applyJobPlan,
  localJobPlan,
  advanceJobCity,
  recordJobAttendance,
  recordJobAttendanceBatch,
  buyCatProduct,
  cityClock,
  jobAIState,
  careerReviewAllowed,
  catProducts,
  pauseCatCareer,
  advanceCityEvening,
  startCatDrive,
  finishCatDrive,
} from "../public/jobcity-system.js";
import {
  cityRoadPath,
  cityWalkPath,
  workplacePath,
  pathFrame,
  pathLength,
  cityPoint,
  cityGroundClear,
  CITY_ROADS,
  nearestRoad,
  cityParking,
} from "../public/jobcity-navigation.js";
import {
  createJobCityRuntime,
  jobCatFrame,
} from "../public/jobcity-runtime.js";
import {
  jobBuilding,
  cityCar,
  animateCityCar,
} from "../public/jobcity-assets.js";
import { createBiomeScene, disposeBiome } from "../public/biome-scenes.js";
import { mergeSharedWorld } from "../shared-world.mjs";
import {
  requestCityPlan,
  validateCityAIState,
  JOB_AI_LIMIT,
} from "../jobcity-ai.mjs";
import worker from "../worker.mjs";
import {
  businessVenues,
  collectIncome,
  normalizeBusiness,
} from "../public/business.js";
const now = Date.UTC(2026, 9, 19, 12);
function seed() {
  let g = newGame(now);
  g.coins = 90000;
  g.progression.xp = xpForLevel(14);
  g = unlockBiome(g, "jobcity", now);
  return applyJobPlan(g, localJobPlan(Object.values(g.jobCity.profiles), 0), 0);
}
function restore(g, at = now) {
  return loadGame(
    { getItem: (k) => (k === SAVE_KEY ? JSON.stringify(g) : null) },
    at,
    { advance: false },
  );
}
function rested(g) {
  const next = structuredClone(g);
  for (const p of Object.values(next.jobCity.profiles))
    p.schedule = { day: 0, job: "rest", evening: "walk" };
  return next;
}
test("simultaneous shift arrivals are one immutable batch with the exact ordered attendance and wages of individual events", () => {
  const g = seed(),
    before = structuredClone(g),
    events = [];
  const minute = 1000;
  for (const p of Object.values(g.jobCity.profiles)) {
    const job = p.schedule.job;
    events.push({ id: p.id, job, active: true, now: now + minute });
    events.push({ id: p.id, job, active: false, now: now + 8 * minute });
    events.push({ id: p.id, job, active: true, now: now + 9 * minute });
  }
  const expected = events.reduce(
    (state, e) => recordJobAttendance(state, e.id, e.job, e.active, e.now),
    g,
  );
  const actual = recordJobAttendanceBatch(g, events);
  assert.notDeepEqual(actual, g);
  assert.deepEqual(actual, expected);
  assert.deepEqual(g, before);
  assert.deepEqual(
    advanceJobCity(actual, now + 8 * 60 * minute),
    advanceJobCity(expected, now + 8 * 60 * minute),
  );
  assert.equal(
    recordJobAttendanceBatch(g, [
      { id: "missing", job: "bank", active: true, now },
    ]),
    g,
  );
});
test("Cat Job City appends a separate island without changing a single established island record", () => {
  const old = JSON.parse(
    fs.readFileSync(
      new URL("./fixtures/jobcity-unaffected-biomes.json", import.meta.url),
    ),
  );
  assert.deepEqual(
    BIOMES.filter((b) => !["jobcity", "cat-homes"].includes(b.id)),
    old,
  );
  assert.equal(BIOMES.length, 20);
  const b = byBiome("jobcity");
  assert.deepEqual(b.center, JOB_CITY_CENTER);
  assert.equal(b.radius, JOB_CITY_RADIUS);
  for (const a of old)
    assert.ok(
      Math.hypot(a.center[0] - b.center[0], a.center[1] - b.center[1]) >
        (a.radius || 11.65) + b.radius + 3,
      a.id,
    );
  const g = seed();
  assert.equal(g.coins, 90000 - b.price);
  assert.deepEqual(g.placements, newGame(now).placements);
  assert.equal(
    businessVenues(g).filter((v) => v.id.startsWith("job-")).length,
    6,
  );
});
test("professions remain permanent across days, AI changes require circumstances, a reason and at most three changes", () => {
  let g = seed();
  const original = Object.fromEntries(
    Object.values(g.jobCity.profiles).map((p) => [p.id, p.profession]),
  );
  for (let day = 1; day < 30; day++)
    g = applyJobPlan(
      g,
      localJobPlan(Object.values(g.jobCity.profiles), day),
      day,
    );
  assert.deepEqual(
    Object.fromEntries(
      Object.values(g.jobCity.profiles).map((p) => [p.id, p.profession]),
    ),
    original,
  );
  g = seed();
  const id = "chichi";
  const change = (g, day, source) => {
    const assignments = localJobPlan(Object.values(g.jobCity.profiles), day);
    const a = assignments.find((a) => a.id === id);
    a.profession = JOB_BUSINESSES.find(
      (b) =>
        b.kind !== g.jobCity.profiles[id].profession &&
        assignments.filter((x) => x.job === b.kind).length < 6,
    ).kind;
    a.job = a.profession;
    a.reason = "Нова навичка та бажання допомагати клієнтам";
    return applyJobPlan(g, assignments, day, source);
  };
  assert.throws(() => change(g, 1, "ai"), /постійна/);
  assert.throws(() => change(g, 3, "local"), /постійна/);
  for (const day of [3, 6, 9]) {
    assert.equal(careerReviewAllowed(g.jobCity.profiles[id], day), true);
    g = change(g, day, "ai");
  }
  assert.equal(g.jobCity.profiles[id].professionChanges, 3);
  assert.equal(g.jobCity.profiles[id].career.length, 4);
  assert.throws(() => change(g, 12, "ai"), /постійна/);
  const loaded = restore(g);
  assert.deepEqual(
    loaded.jobCity.profiles[id].career,
    g.jobCity.profiles[id].career,
  );
});
test("initial provisional local careers can be chosen by the single AI batch without consuming a career change", () => {
  let g = seed();
  g.jobCity = null;
  g = ensureJobCity(g, now);
  g = applyJobPlan(
    g,
    localJobPlan(Object.values(g.jobCity.profiles), 0),
    0,
    "pending",
  );
  const state = jobAIState(g, now);
  assert.ok(state.cats.every((c) => c.profession === null));
  const plan = localJobPlan(Object.values(g.jobCity.profiles), 0);
  g = applyJobPlan(g, plan, 0, "ai");
  assert.ok(
    Object.values(g.jobCity.profiles).every(
      (p) => p.professionChanges === 0 && p.career.length === 1,
    ),
  );
});
test("09–17 work schedule pays only attended time, pauses retain credit and refresh never pays twice", () => {
  let g = seed();
  const id = Object.keys(g.jobCity.profiles).find(
      (id) => g.jobCity.profiles[id].schedule.job !== "rest",
    ),
    p = g.jobCity.profiles[id],
    b = JOB_BUSINESSES.find((b) => b.kind === p.schedule.job),
    playerCoins = g.coins;
  assert.equal(cityClock(g.jobCity, now).label, "12:00");
  assert.equal(cityClock(g.jobCity, now + 300000).label, "17:00");
  g = recordJobAttendance(g, id, b.kind, true, now + 60000);
  g = pauseCatCareer(g, id, now + 120000);
  assert.equal(g.jobCity.profiles[id].attendance.active, false);
  g = recordJobAttendance(g, id, b.kind, true, now + 180000);
  g = advanceJobCity(g, now + 300000);
  const p2 = g.jobCity.profiles[id];
  assert.equal(p2.coins, b.wage * 3);
  assert.equal(p2.earnedTotal, b.wage * 3);
  assert.equal(p2.shifts[0].minutes, 180);
  assert.equal(g.coins, playerCoins);
  for (let i = 0; i < 20; i++)
    g = advanceJobCity(restore(g, now + 300000), now + 300000);
  assert.equal(g.jobCity.profiles[id].coins, p2.coins);
  assert.equal(
    g.jobCity.profiles[id].transactions.filter((t) => t.kind === "wage").length,
    1,
  );
  const fresh = advanceJobCity(seed(), now + 300000);
  assert.ok(Object.values(fresh.jobCity.profiles).every((p) => p.coins === 0));
});
test("private purchases validate funds, survive history pruning and never spend player coins", () => {
  let g = seed();
  g.jobCity.profiles.chichi.coins = 20000;
  const balance = g.coins,
    product = catProducts(g).find((p) => p.id === "yarn");
  assert.ok(product);
  for (let i = 1; i <= 16; i++)
    g = buyCatProduct(g, "chichi", "yarn", "buy-chichi-" + i, now + i);
  const p = g.jobCity.profiles.chichi;
  assert.equal(p.inventory.yarn, 16);
  assert.equal(p.spentTotal, product.price * 16);
  assert.equal(g.coins, balance);
  assert.equal(p.transactions.length, 12);
  assert.equal(buyCatProduct(g, "chichi", "yarn", "buy-chichi-1"), g);
  assert.throws(
    () => buyCatProduct(g, "chichi", "yarn", "buy-chichi-20"),
    /Оновіть/,
  );
  g.jobCity.profiles.chichi.coins = 0;
  assert.throws(
    () => buyCatProduct(g, "chichi", JOB_CARS[4].id, "buy-chichi-17"),
    /недостатньо/,
  );
  assert.deepEqual(
    restore(g).jobCity.profiles.chichi.inventory,
    g.jobCity.profiles.chichi.inventory,
  );
});
test("old saves migrate lazily; concurrent different cats merge, same wallet conflicts atomically and cached clients preserve city progress", () => {
  const old = newGame(now);
  assert.equal(restore(old).jobCity, null);
  const base = seed();
  base.jobCity.profiles.chichi.coins = 10000;
  const id = Object.keys(base.jobCity.profiles).find((k) => k !== "chichi");
  base.jobCity.profiles[id].coins = 10000;
  const first = buyCatProduct(base, "chichi", "car-peach", "buy-chichi-1"),
    second = buyCatProduct(base, id, "car-cloud", "buy-" + id + "-1");
  const merged = mergeSharedWorld(base, first, second, now);
  assert.equal(merged.jobCity.profiles.chichi.inventory["car-peach"], 1);
  assert.equal(merged.jobCity.profiles[id].inventory["car-cloud"], 1);
  assert.throws(() =>
    mergeSharedWorld(
      base,
      first,
      buyCatProduct(base, "chichi", "car-cloud", "buy-chichi-1"),
      now,
    ),
  );
  const cached = structuredClone(base);
  delete cached.jobCity;
  cached.unlocked = cached.unlocked.filter((i) => i !== "jobcity");
  const kept = mergeSharedWorld(base, first, cached, now);
  assert.deepEqual(kept.jobCity, first.jobCity);
  assert.ok(kept.unlocked.includes("jobcity"));
});
test("batch AI validates every cat, capacity and persistent professions; unavailable, malformed and timed out APIs fail safely", async () => {
  const g = seed(),
    state = validateCityAIState(jobAIState(g, now)),
    plan = localJobPlan(Object.values(g.jobCity.profiles), 0);
  let calls = 0;
  const result = await requestCityPlan(state, async (input) => {
    calls++;
    assert.equal(
      JSON.parse(input.messages[1].content).cats.length,
      state.cats.length,
    );
    return { response: JSON.stringify({ assignments: plan }) };
  });
  assert.equal(calls, 1);
  assert.equal(result.assignments.length, state.cats.length);
  await assert.rejects(
    requestCityPlan(state, async () => ({ response: "oops" })),
  );
  await assert.rejects(
    requestCityPlan(state, async () => ({
      response: { assignments: plan.slice(1) },
    })),
  );
  await assert.rejects(
    requestCityPlan(state, () => new Promise(() => {}), 5),
    /timeout/,
  );
  const request = () =>
    new Request("https://game.local/api/jobcity/plan", {
      method: "POST",
      body: JSON.stringify({
        ...state,
        cats: state.cats.map((p) => ({ ...p, profession: null })),
      }),
    });
  assert.equal((await worker.fetch(request(), {})).status, 503);
  assert.equal(
    (
      await worker.fetch(request(), {
        AI: { run: async () => ({ response: "bad" }) },
      })
    ).status,
    502,
  );
  assert.equal(
    (
      await worker.fetch(request(), {
        AI: { run: async () => ({ response: { assignments: plan } }) },
      })
    ).status,
    200,
  );
  assert.ok(Buffer.byteLength(JSON.stringify(state)) < JOB_AI_LIMIT);
});
test("each work and visitor station has a ground route around buildings, a continuous staircase and separate occupied slots", () => {
  for (const b of JOB_BUSINESSES)
    for (let i = 0; i < 6; i++) {
      const path = workplacePath({ x: 0, z: 59 }, b, i);
      assert.ok(path, b.id);
      const front = path.findIndex(
        (p) => p.x === b.x && Math.abs(p.z - b.z - 11.7) < 1e-6,
      );
      for (let k = 1; k <= front; k++)
        assert.ok(
          cityGroundClear(path[k - 1], path[k]),
          b.id + " outdoor " + k,
        );
      assert.deepEqual(path.at(-1), jobStations(b)[i]);
      assert.equal(path.at(-1).y, 0.32 + Math.floor(i / 2) * 4.6);
      if (i >= 2)
        assert.ok(
          path.some(
            (p, k) =>
              k > 0 &&
              p.y > path[k - 1].y &&
              Math.abs(p.z - path[k - 1].z) >= 15.9,
          ),
        );
      const visitor = workplacePath({ x: 0, z: 59 }, b, i, true);
      assert.ok(visitor);
      assert.ok(Math.abs(visitor.at(-1).z - path.at(-1).z) > 3);
    }
  let g = seed(),
    paid = [];
  const runtime = createJobCityRuntime({
      onAttendance: (id, job, active) => {
        if (active) paid.push(id);
      },
    }),
    actors = Object.keys(g.jobCity.profiles).map((id, index) => ({
      id,
      index,
      biome: "jobcity",
      local: {
        x: (index % 5) * 1.8 - 4,
        y: 0.32,
        z: 56 + Math.floor(index / 5) * 1.8,
      },
    }));
  for (let i = 0; i < 1500; i++) {
    runtime.step(g, actors, 0.1, i * 0.1, { now: now + i * 100 });
    for (const actor of actors) {
      const v = runtime.get(actor.id);
      if (v) actor.local = { ...v.position };
    }
  }
  const working = [...runtime.states.values()].filter(
    (v) => v.phase === "work",
  );
  assert.ok(working.length >= 12, "arrived " + working.length);
  assert.equal(new Set(working.map((v) => v.slotKey)).size, working.length);
  assert.equal(new Set(paid).size, paid.length);
  const active = working[0];
  runtime.step(g, actors, 0.1, 150, {
    now: now + 150000,
    blocked: (a) => a.id === active.id,
  });
  assert.equal(runtime.has(active.id), false);
  runtime.clear();
  assert.equal(runtime.slots.size, 0);
});
test("owned cars follow bounded streets, animate entry/driving/braking/exit and cannot restart a finished trip", () => {
  let g = rested(seed());
  const id = "chichi";
  g.jobCity.profiles[id].coins = 10000;
  g = buyCatProduct(g, id, "car-peach", "buy-chichi-1");
  g = startCatDrive(g, id, "car-peach", { x: -16, z: -38 }, now);
  const runtime = createJobCityRuntime({
      onTripDone: (cat, trip) => {
        g = finishCatDrive(g, cat, trip);
      },
    }),
    actors = [
      { id, index: 0, biome: "jobcity", local: { x: 0, z: 56, y: 0.32 } },
    ],
    phases = new Set();
  let previous = null,
    maxJump = 0;
  for (let i = 0; i < 1500; i++) {
    runtime.step(g, actors, 0.1, i * 0.1, { now: now + i * 100 });
    const v = runtime.get(id);
    if (!v) continue;
    phases.add(v.phase);
    const f = jobCatFrame(v, i * 0.1);
    actors[0].local = { ...f.position };
    assert.ok(cityPoint(f.position, 0));
    if (v.phase === "drive") {
      assert.ok(
        Math.hypot(
          nearestRoad(v.position).x - v.position.x,
          nearestRoad(v.position).z - v.position.z,
        ) < 1.7,
      );
      if (previous)
        maxJump = Math.max(
          maxJump,
          Math.hypot(
            f.carPosition.x - previous.x,
            f.carPosition.z - previous.z,
          ),
        );
      previous = f.carPosition;
    } else previous = null;
  }
  for (const phase of ["to-car", "enter-car", "drive", "park", "exit-car"])
    assert.ok(phases.has(phase), phase);
  assert.ok(maxJump < 1.5, maxJump);
  assert.equal(g.jobCity.profiles[id].trip, null);
  assert.equal(g.jobCity.profiles[id].parkedAt.z, -38);
  assert.throws(() => startCatDrive(g, id, "car-sun", { x: 0, z: 0 }), /немає/);
  assert.throws(
    () => startCatDrive(g, id, "car-peach", { x: 100, z: 0 }),
    /точку/,
  );
});
test("six detailed open-front models use batched static geometry, fixed conveyor buffers, unchanged approved cat assets and visible interiors", () => {
  for (const b of JOB_BUSINESSES) {
    const model = jobBuilding(b.id);
    assert.ok(model.userData.stats.sourceMeshes > 300, b.kind);
    assert.equal(model.userData.stats.floors, 3);
    assert.equal(model.userData.stats.workplaces, 6);
    const box = new T.Box3().setFromObject(model),
      size = box.getSize(new T.Vector3());
    assert.ok(size.x > 25 && size.y > 14 && size.z >= 20);
    assert.ok(model.userData.stats.staticMeshes < 25);
    const matrices = [];
    model.traverse((o) => {
      if (o.isInstancedMesh)
        matrices.push([o.instanceMatrix, o.instanceMatrix.version]);
    });
    for (let i = 0; i < 60; i++) model.userData.update(i / 30, false);
    for (const [buffer, version] of matrices)
      assert.equal(buffer.version, version);
    // A ray across the open entrance reaches the desks, not a facade wall.
    const ray = new T.Raycaster(
      new T.Vector3(0, 2, 15),
      new T.Vector3(0, 0, -1),
    );
    model.updateMatrixWorld(true);
    const hits = ray.intersectObject(model, true);
    assert.ok(hits.every((h) => h.point.z < 9));
  }
  const car = cityCar("car-peach"),
    clone = cityCar("car-peach");
  assert.notEqual(car, clone);
  assert.equal(
    car.getObjectByName("CityWheel").children[0].geometry,
    clone.getObjectByName("CityWheel").children[0].geometry,
  );
  animateCityCar(car, 4, 0.2);
  assert.notEqual(car.getObjectByName("CityWheel").rotation.x, 0);
  const scene = createBiomeScene(byBiome("jobcity"));
  assert.equal(scene.userData.lowDetail.visible, false);
  assert.ok(scene.userData.stats.sourceMeshes > 300);
  disposeBiome(scene);
});

test("a pending plan on a later day sends the established profession to AI instead of treating the cat as a new hire", () => {
  let g = seed();
  const before = g.jobCity.profiles.chichi.profession;
  g = applyJobPlan(
    g,
    localJobPlan(Object.values(g.jobCity.profiles), 1),
    1,
    "pending",
  );
  assert.equal(
    jobAIState(g, now + 1440000).cats.find((c) => c.id === "chichi").profession,
    before,
  );
});

test("manual business visits reserve a separate customer seat, use stairs, finish naturally and release the seat", () => {
  const g = rested(seed()),
    id = "chichi",
    actor = { id, index: 0, biome: "jobcity", local: { x: 0, z: 56, y: 0.32 } };
  let finished = 0;
  const runtime = createJobCityRuntime({
    onVisitDone: (who, decision) => {
      assert.equal(who, id);
      assert.equal(decision.activityId, "job-bank");
      finished++;
    },
  });
  assert.ok(
    runtime.visit(id, "job-bank", actor.local, {
      activityId: "job-bank",
      action: "explore",
    }),
  );
  const phases = new Set();
  for (let i = 0; i < 1800; i++) {
    runtime.step(g, [actor], 0.1, i * 0.1, { now: now + i * 100 });
    const v = runtime.get(id);
    if (v) {
      phases.add(v.phase);
      actor.local = { ...v.position };
    }
  }
  assert.ok(phases.has("talk"));
  assert.ok(phases.has("leave-visit"));
  assert.equal(finished, 1);
  runtime.clear();
  assert.equal(runtime.slots.size, 0);
});

test("several owned cars can finish independent trips without sharing the same lane or leaving the island", () => {
  let g = rested(seed());
  const ids = Object.keys(g.jobCity.profiles).slice(0, 3),
    actors = ids.map((id, index) => ({
      id,
      index,
      biome: "jobcity",
      local: { x: index * 5, z: 55, y: 0.32 },
    }));
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    g.jobCity.profiles[id].coins = 6000;
    g = buyCatProduct(g, id, "car-peach", "buy-" + id + "-1");
    g = startCatDrive(g, id, "car-peach", { x: [-50, 16, 50][i], z: -38 }, now);
  }
  const runtime = createJobCityRuntime({
    onTripDone: (id, trip, p) => {
      g = finishCatDrive(g, id, trip, p);
    },
  });
  let closest = Infinity;
  for (let i = 0; i < 3000; i++) {
    runtime.step(g, actors, 0.1, i * 0.1, { now: now + i * 100 });
    for (const actor of actors) {
      const v = runtime.get(actor.id);
      if (v) actor.local = { ...v.position };
    }
    const driving = [...runtime.states.values()].filter(
      (v) => v.phase === "drive",
    );
    for (let a = 0; a < driving.length; a++)
      for (let b = a + 1; b < driving.length; b++)
        closest = Math.min(
          closest,
          Math.hypot(
            driving[a].position.x - driving[b].position.x,
            driving[a].position.z - driving[b].position.z,
          ),
        );
  }
  assert.ok(
    ids.every((id) => !g.jobCity.profiles[id].trip),
    JSON.stringify(
      [...runtime.states.values()].map((v) => ({
        id: v.id,
        phase: v.phase,
        p: v.position,
      })),
    ),
  );
  assert.ok(closest > 1.9, closest);
});

test("the close dollhouse camera can see the head of a seated worker on every floor without a floor slab or roof blocking it", async () => {
  const { attractionCameraView } = await import("../public/camera-views.js");
  const b = JOB_BUSINESSES[0],
    model = jobBuilding(b.id),
    box = new T.Box3().setFromObject(model),
    view = attractionCameraView(box, 40, 1.5, 0, 0.12);
  const camera = view.target
    .clone()
    .add(
      new T.Vector3(
        Math.sin(view.azimuth) * Math.cos(view.elevation),
        Math.sin(view.elevation),
        Math.cos(view.azimuth) * Math.cos(view.elevation),
      ).multiplyScalar(view.distance),
    );
  model.updateMatrixWorld(true);
  for (let floor = 0; floor < 3; floor++)
    for (const x of [-4, 4]) {
      const head = new T.Vector3(x, floor * 4.6 + 1.7, 2.15),
        direction = head.clone().sub(camera),
        ray = new T.Raycaster(
          camera,
          direction.clone().normalize(),
          0,
          direction.length() - 0.1,
        ),
        hits = ray.intersectObject(model, true);
      assert.equal(
        hits.length,
        0,
        "floor " +
          floor +
          " worker " +
          x +
          " blocked at " +
          JSON.stringify(hits.slice(0, 3).map((h) => h.point.toArray())),
      );
    }
});

test("interior inspection masks only foreground city buildings and restores the complete normal view", async () => {
  const { cityViewOccluders } = await import("../public/jobcity-navigation.js");
  const mask = cityViewOccluders("job-bank", { x: -25, y: 14, z: 24 });
  assert.ok(mask.has("job-furniture"));
  assert.equal(mask.has("job-bank"), false);
  assert.equal(mask.has("job-cars"), false);
  assert.equal(cityViewOccluders(null, { x: 0, y: 100, z: 100 }).size, 0);
  assert.equal(cityViewOccluders("job-bank", { x: -32, y: 60, z: 24 }).size, 0);
});

test("every new city business gives the player both coins and XP without spending private cat wallets", () => {
  for (const business of JOB_BUSINESSES) {
    const g = seed(),
      wallets = structuredClone(g.jobCity),
      result = collectIncome(g, business.id, now + 3600000);
    assert.ok(result.amount > 0, business.id);
    assert.ok(result.xp > 0, business.id);
    assert.deepEqual(result.game.jobCity, wallets);
    assert.throws(() => collectIncome(result.game, business.id, now + 3600000));
  }
});

test("an automatic work arrival merges with a manual purchase on the same cat from the other phone", () => {
  const base = seed(),
    id = Object.keys(base.jobCity.profiles).find(
      (id) => base.jobCity.profiles[id].schedule.job !== "rest",
    );
  base.jobCity.profiles[id].coins = 5000;
  const arrival = recordJobAttendance(
      base,
      id,
      base.jobCity.profiles[id].schedule.job,
      true,
      now + 1000,
    ),
    purchase = buyCatProduct(base, id, "car-peach", "buy-" + id + "-1");
  for (const [current, incoming] of [
    [arrival, purchase],
    [purchase, arrival],
  ]) {
    const merged = mergeSharedWorld(base, current, incoming);
    assert.equal(merged.jobCity.profiles[id].coins, 3800);
    assert.equal(merged.jobCity.profiles[id].inventory["car-peach"], 1);
    assert.equal(merged.jobCity.profiles[id].attendance.active, true);
  }
});

test("new private profiles are exactly stable under repeated save normalization", () => {
  const g = seed();
  let saved = g;
  for (let i = 0; i < 5; i++) saved = restore(saved);
  assert.deepEqual(saved.jobCity, g.jobCity);
});
