import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as THREE from "three";
import { BIOMES, byBiome } from "../public/game-data.js";
import {
  COURT_RADIUS,
  COURT_VENUES,
  courtSeats,
  courtProject,
} from "../public/foodcourt-data.js";
import {
  newGame,
  loadGame,
  saveGame,
  worldSnapshot,
  unlockBiome,
  purchase,
} from "../public/economy.js";
import { startCourtConstruction } from "../public/island-construction.js";
import {
  courtObstacles,
  courtPath,
  courtWalkable,
  courtSegment,
} from "../public/foodcourt-navigation.js";
import { createCourtRuntime } from "../public/foodcourt-runtime.js";
import { courtVenue, courtFood } from "../public/foodcourt-assets.js";
import { createBiomeScene, prepareBiomeScene } from "../public/biome-scenes.js";
import { completeSpaVisit } from "../public/spa-system.js";
import {
  businessVenues,
  incomeFor,
  collectIncome,
  upgradeBusiness,
  businessLevel,
} from "../public/business.js";
import { mergeSharedWorld } from "../shared-world.mjs";
import { manualInteraction } from "../public/interactions.js";
import { parseDecision, validateState } from "../ai.mjs";
import { levelForXP, xpForLevel } from "../public/progression.js";
const levelCoins = (a, b) => {
  let n = 0;
  for (
    let l = levelForXP(a.progression.xp) + 1;
    l <= levelForXP(b.progression.xp);
    l++
  )
    n += 30 + l * 15;
  return n;
};
const now = Date.UTC(2026, 9, 17),
  game = () => {
    const g = newGame(now);
    g.coins = 50000;
    g.progression.xp = xpForLevel(6);
    return unlockBiome(g, "foodcourt", now);
  };
test("food court is an eighth-area separate island; every one of the other 24 records is identical", () => {
  assert.equal(BIOMES.length, 17);
  assert.deepEqual(
    BIOMES.filter(
      (b) =>
        ![
          "foodcourt",
          "bikini",
          "homestead",
          "aquarium",
          "jobcity",
          "cat-homes",
        ].includes(b.id),
    ),
    JSON.parse(
      fs.readFileSync(
        new URL("./fixtures/foodcourt-unaffected-biomes.json", import.meta.url),
      ),
    ),
  );
  assert.ok(Math.abs(COURT_RADIUS ** 2 / 11.65 ** 2 - 8) < 1e-10);
  const g = game();
  assert.equal(g.coins, 47200);
  assert.equal(COURT_VENUES.length, 5);
  assert.equal(new Set(COURT_VENUES.map((o) => o.kind)).size, 5);
  assert.throws(() => purchase(g, "court-burger", now), /своём острове/);
});
test("three paid construction sites charge once, keep exact deadlines through 30 reloads and become physical AI choices only when finished", () => {
  let g = game();
  assert.ok(
    worldSnapshot(g, now).activities.some((a) => a.id === "court-coffee"),
  );
  assert.ok(
    !worldSnapshot(g, now).activities.some((a) => a.id === "court-burger"),
  );
  for (const o of COURT_VENUES.filter((o) => o.requiresBuild)) {
    const before = g.coins,
      prior = g;
    g = startCourtConstruction(g, o.id, now);
    assert.equal(g.coins, before - o.price + levelCoins(prior, g));
    assert.throws(() => startCourtConstruction(g, o.id, now + 1), /уже начато/);
    const p = courtProject(g, o.id, now);
    assert.equal(p.readyAt, now + o.buildMinutes * 60000);
    assert.equal(p.built, false);
    const data = new Map(),
      storage = {
        getItem: (k) => data.get(k) || null,
        setItem: (k, v) => data.set(k, v),
        removeItem: (k) => data.delete(k),
      };
    for (let i = 0; i < 30; i++) {
      saveGame(storage, g);
      const coins = g.coins,
        xp = g.progression.xp;
      g = loadGame(storage, now + 1000, { advance: false });
      assert.equal(g.coins, coins);
      assert.equal(g.progression.xp, xp);
      assert.equal(courtProject(g, o.id, now).readyAt, p.readyAt);
    }
    assert.ok(
      !worldSnapshot(g, p.readyAt - 1).activities.some((a) => a.id === o.id),
    );
    const w = worldSnapshot(g, p.readyAt),
      d = manualInteraction(w, { activityId: o.id }, "happy");
    assert.equal(d.action, "eat");
    assert.equal(
      parseDecision(d, validateState({ ...g.cat, world: w })).activityId,
      o.id,
    );
  }
});
test("independent phone builds merge and same-site second payment is rejected without losing either wallet", () => {
  const base = game(),
    a = startCourtConstruction(base, "court-burger", now),
    b = startCourtConstruction(base, "court-boba", now + 1),
    merged = mergeSharedWorld(base, a, b);
  assert.equal(
    merged.coins,
    base.coins - 950 - 1200 + levelCoins(base, a) + levelCoins(base, b),
  );
  assert.equal(courtProject(merged, "court-burger", now).startedAt, now);
  assert.equal(courtProject(merged, "court-boba", now).startedAt, now + 1);
  assert.throws(
    () =>
      mergeSharedWorld(
        base,
        a,
        startCourtConstruction(base, "court-burger", now + 100),
      ),
    /уже|повтор|начато|строй/i,
  );
});
test("free and paid venues earn ordinary coins and XP, wait for completion, support saved upgrades and cap offline accrual", () => {
  let g = game();
  g = startCourtConstruction(g, "court-burger", now);
  const p = courtProject(g, "court-burger", now);
  assert.equal(incomeFor(g, p.id, p.readyAt - 1), 0);
  assert.ok(incomeFor(g, p.id, p.readyAt + 3600000) > 0);
  assert.equal(businessVenues(g).length, 3);
  const before = g.coins,
    r = collectIncome(g, "court-coffee", now + 3600000);
  assert.ok(r.amount > 0);
  assert.ok(r.xp > 0);
  assert.equal(r.game.coins, before + r.amount + levelCoins(g, r.game));
  g = upgradeBusiness(r.game, "court-coffee", now + 3600001).game;
  assert.equal(businessLevel(g, "court-coffee"), 2);
  assert.ok(incomeFor(g, "court-coffee", now + 2 * 3600000) > 0);
});
test("served food changes needs and charges only once; simultaneous distinct visitors survive shared merging", () => {
  let g = game();
  g.cat.hunger = 70;
  const v = {
      id: "court-meal-1",
      catId: "chichi",
      objectId: "court-coffee",
      position: { x: 10, z: 0 },
    },
    a = completeSpaVisit(g, v, now);
  assert.equal(a.coins, g.coins - 4);
  assert.equal(a.cat.hunger, 52);
  assert.equal(completeSpaVisit(a, v, now + 1), a);
  assert.throws(() => mergeSharedWorld(g, a, a), /візит/);
  const b = completeSpaVisit(
    g,
    { ...v, id: "court-meal-2", objectId: "court-cinema" },
    now,
  );
  const merged = mergeSharedWorld(g, a, b);
  assert.ok(merged.spa.receipts.includes(v.id));
  assert.ok(merged.spa.receipts.includes("court-meal-2"));
});
test("all seats and doors clear regular and giant cats, with continuous paths around the actual furniture", () => {
  const obs = courtObstacles();
  for (const radius of [0.55, 0.85, 1.12, 1.2])
    for (const o of COURT_VENUES)
      for (const seat of courtSeats(o)) {
        assert.ok(courtWalkable(seat, radius, obs), o.id);
        const path = courtPath({ x: 0, z: 29 }, seat, radius, obs);
        assert.ok(path?.length, o.id);
        let p = { x: 0, z: 29 };
        for (const q of path) {
          assert.ok(courtSegment(p, q, radius, obs), o.id);
          p = q;
        }
      }
});
test("twenty mixed-size customers queue, receive visible food, eat or watch and leave with no overlap or leaked seats", () => {
  for (const o of COURT_VENUES) {
    const done = [],
      r = createCourtRuntime({ onComplete: (v) => done.push(v) }),
      phases = new Set();
    let started = 0;
    for (let i = 0; i < 18000; i++) {
      if (i % 120 === 0 && started < 4) {
        if (
          r.start({
            catId: "cat-" + started,
            objectId: o.id,
            position: { x: -4 + started * 2.8, z: 28 },
            radius: started === 3 ? 1.2 : 0.55,
            now,
          })
        )
          started++;
      }
      r.step(1 / 30, i / 30);
      const vs = [...r.visits.values()];
      for (const v of vs) {
        phases.add(v.phase);
        for (const b of vs)
          if (b !== v)
            assert.ok(
              Math.hypot(
                v.position.x - b.position.x,
                v.position.z - b.position.z,
              ) >=
                v.radius + b.radius,
              o.id,
            );
      }
      if (started === 4 && !vs.length) break;
    }
    assert.equal(started, 4);
    assert.equal(done.length, 4, o.id);
    assert.equal(r.visits.size, 0);
    assert.ok(phases.has("consume"));
    if (o.kind !== "cinema")
      for (const p of ["queue", "prepare", "serve", "table"])
        assert.ok(phases.has(p), p);
  }
});
test("cancel and manual redirect release table and door reservations immediately", () => {
  const r = createCourtRuntime();
  r.start({ catId: "a", objectId: "court-coffee", position: { x: 0, z: 29 } });
  r.cancel("a");
  assert.equal(r.visits.size, 0);
  assert.ok(
    r.start({
      catId: "a",
      objectId: "court-coffee",
      position: { x: 0, z: 29 },
    }),
  );
  r.clear();
  assert.equal(r.visits.size, 0);
});
test("authored venue roofs are separate, approved chef rigs animate preparation, and food contains actual geometry", () => {
  for (const o of COURT_VENUES) {
    const g = courtVenue(o);
    assert.ok(g.userData.roof);
    if (o.kind === "cinema") {
      assert.ok(g.userData.videoSurface.isMesh);
      continue;
    }
    const f = courtFood(o.kind);
    let n = 0;
    f.traverse((m) => {
      if (m.isMesh) n += m.geometry.attributes.position.count;
    });
    assert.ok(n > 100);
    g.userData.servingVisit = { phase: "prepare", elapsed: 2 };
    g.userData.update(1);
    assert.equal(g.userData.servicePhase, "prepare");
    g.userData.servingVisit = { phase: "serve", elapsed: 1 };
    g.userData.update(2);
    assert.equal(g.userData.servicePhase, "handover");
    assert.ok(g.userData.staff.userData.head);
    g.updateMatrixWorld(true);
    const head = g.userData.staff.userData.head.getWorldPosition(
      new THREE.Vector3(),
    );
    assert.ok(
      head.y > 1.9,
      "chef face must remain visible above the counter after the animated bob",
    );
    g.userData.disposeStaff();
  }
});
test("the floating island has real rock depth, animated water, batched gardens and cooperative loading", async () => {
  let slices = 0;
  const g = await prepareBiomeScene(
    byBiome("foodcourt"),
    {},
    { budget: 2, onSlice: () => slices++ },
  );
  assert.ok(slices > 10);
  assert.ok(new THREE.Box3().setFromObject(g).min.y < -10);
  assert.ok(g.userData.stats.staticMeshes <= 6);
  assert.ok(g.userData.stats.sourceMeshes > 200);
  assert.ok(g.userData.lagoons.has("lake-foodcourt"));
  g.userData.update(4);
  g.userData.dispose();
});

test("idle cats are real dynamic obstacles and a visitor walks around them", () => {
  const done = [],
    r = createCourtRuntime({ onComplete: (v) => done.push(v) }),
    v = r.start({
      catId: "visitor",
      objectId: "court-coffee",
      position: { x: 0, z: 26 },
    });
  const idle = [{ catId: "sleepy", position: { x: 8, z: 10 }, radius: 0.9 }];
  for (let i = 0; i < 14000 && r.get("visitor"); i++)
    r.step(1 / 30, i / 30, idle);
  assert.equal(done.length, 1);
});

test("twenty visitors across the entire court, including multiple giant cats, finish without a global queue deadlock", () => {
  const rt = createCourtRuntime(),
    done = [];
  let n = 0;
  for (let i = 0; i < 12000; i++) {
    if (i % 90 === 0)
      for (const o of COURT_VENUES)
        if (
          n < 20 &&
          rt.start({
            catId: "crowd-" + n,
            objectId: o.id,
            position: { x: -3 + (n % 3) * 3, z: 27 - (n % 2) * 2 },
            radius: n % 4 === 3 ? 1.2 : 0.55,
            now,
          })
        )
          n++;
    rt.step(1 / 30, i / 30);
    const a = [...rt.visits.values()];
    for (let j = 0; j < a.length; j++)
      for (let k = j + 1; k < a.length; k++)
        assert.ok(
          Math.hypot(
            a[j].position.x - a[k].position.x,
            a[j].position.z - a[k].position.z,
          ) >=
            a[j].radius + a[k].radius,
          "crowd overlap",
        );
  }
  assert.equal(n, 20);
  assert.equal(rt.visits.size, 0);
});

test("the reserved seat heights match the real cushions and poufs rather than intersecting them", () => {
  for (const o of COURT_VENUES) {
    const g = courtVenue(o, { staff: false });
    g.position.set(o.x, 0.16, o.z);
    g.updateMatrixWorld(true);
    const furniture = g.getObjectByName("Batched interior and furniture");
    for (const s of courtSeats(o)) {
      const ray = new THREE.Raycaster(
        new THREE.Vector3(s.x, 4, s.z),
        new THREE.Vector3(0, -1, 0),
      );
      const hit = ray.intersectObject(furniture, true)[0];
      assert.ok(hit, o.id);
      assert.ok(
        Math.abs(hit.point.y - s.y) < 0.035,
        o.id + " " + hit.point.y + "/" + s.y,
      );
    }
  }
});
