import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { MEGA_RIDES, outsideMegaPlots } from "../public/mega-ride-data.js";
import { createMegaRoute, funnelFloor } from "../public/mega-ride-motion.js";
import { makeAttraction } from "../public/world-assets.js";
import { disposeScenery } from "../public/scenery-models.js";
import {
  createCat,
  animateCat,
  reactCat,
  disposeCat,
} from "../public/cat-model.js";
import { catAppearance, ADOPTION_CATS } from "../public/cat-breeds.js";
import { CATALOG, byBiome } from "../public/game-data.js";
import {
  newGame,
  purchase,
  placeItem,
  storeItem,
  unlockBiome,
  saveGame,
  loadGame,
  worldSnapshot,
  isBuilt,
} from "../public/economy.js";
import { xpForLevel } from "../public/progression.js";
import { collectIncome, incomeFor, businessXP } from "../public/business.js";
import { manualInteraction, dropTarget } from "../public/interactions.js";
import { parseDecision } from "../ai.mjs";
import { createResidentPlay } from "../public/resident-play.js";
const now = Date.UTC(2026, 9, 17, 18),
  memory = () => {
    const m = new Map();
    return { getItem: (k) => m.get(k) || null, setItem: (k, v) => m.set(k, v) };
  };
function prepared() {
  let g = newGame(now);
  g.coins = 2000000;
  g.progression.xp = xpForLevel(20);
  return unlockBiome(g, "homestead", now);
}
test("wandering cats of different sizes stay clear of raised pools and supports without blocking scripted riders", () => {
  const plots = [{ biome: "homestead", x: 0, z: 0, w: 26, d: 28 }];
  for (const r of [0.2, 0.6, 1.7])
    for (let x = -15; x <= 15; x++)
      for (let z = -16; z <= 16; z++) {
        const p = outsideMegaPlots(x, z, plots, "homestead", r);
        assert.ok(
          Math.abs(p.x) >= 13 + r + 0.079 || Math.abs(p.z) >= 14 + r + 0.079,
        );
        assert.deepEqual(outsideMegaPlots(p.x, p.z, plots, "homestead", r), p);
      }
  assert.deepEqual(outsideMegaPlots(1, 2, plots, "moon"), { x: 1, z: 2 });
});
test("ten distinct legendary complexes can be built on the player's island with bounded complete footprints", () => {
  assert.equal(MEGA_RIDES.length, 10);
  assert.equal(new Set(MEGA_RIDES.map((r) => r.kind)).size, 10);
  for (const spec of MEGA_RIDES) {
    assert.ok(
      CATALOG.some((c) => c.id === spec.id && c.rarity === "Легендарное"),
    );
    assert.ok(spec.height >= 16 && spec.footprint[0] >= 22);
    assert.ok(spec.price >= 6000 && spec.requiredLevel >= 6);
  }
});
test("all routes stay within their purchased plot, meet continuously, return to safe dry ground and reach fast ride speeds", () => {
  for (const spec of MEGA_RIDES) {
    const route = createMegaRoute(spec);
    let speed = 0,
      prev;
    for (let i = 0; i <= Math.ceil(route.duration * 100); i++) {
      const time = Math.min(route.duration, i / 100),
        f = route.frame(time);
      assert.ok(f.position.every(Number.isFinite), spec.id);
      assert.ok(
        Math.abs(f.position[0]) < spec.footprint[0] / 2 &&
          Math.abs(f.position[2]) < spec.footprint[1] / 2,
        spec.id + " outside reserved land",
      );
      assert.ok(f.position[1] >= 0.05, spec.id + " below ground");
      if (prev && ["ride", "vortex", "flight"].includes(f.phase))
        speed = Math.max(
          speed,
          Math.hypot(...f.position.map((v, j) => v - prev[j])) * 100,
        );
      prev = f.position;
    }
    assert.ok(speed >= 10 && speed < 100, spec.id + " speed " + speed);
    for (let i = 1; i < route.legs.length; i++) {
      const a = route.legs[i - 1].fn(1).position,
        b = route.legs[i].fn(0).position;
      assert.ok(
        Math.hypot(...a.map((v, j) => v - b[j])) < 1e-7,
        spec.id + " discontinuous phase",
      );
    }
    assert.deepEqual(route.frame(0).position, route.entry);
    assert.deepEqual(route.frame(route.duration).position, route.entry);
    assert.deepEqual(route.frame(5, true), route.frame(50, true));
  }
});
test("the three-height tower and launch slides use real gravity, three separate impacts and temporary surprised faces", () => {
  const tower = createMegaRoute(MEGA_RIDES.find((r) => r.kind === "dive"));
  assert.equal(tower.impacts.length, 3);
  const heights = tower.legs
    .filter((l) => l.phase === "flight")
    .map((l) => l.fn(0).position[1] - 0.22);
  assert.deepEqual(heights, [10, 20, 30]);
  for (const spec of MEGA_RIDES) {
    const r = createMegaRoute(spec);
    for (const l of r.legs.filter((l) => l.phase === "flight")) {
      const mid = l.start + l.duration * 0.5,
        dt = 0.001,
        a = r.frame(mid - dt),
        b = r.frame(mid),
        c = r.frame(mid + dt);
      const acceleration =
        (c.position[1] - 2 * b.position[1] + a.position[1]) / (dt * dt);
      assert.ok(Math.abs(acceleration + 9.81) < 1e-5);
      assert.ok(b.surprise > 0.9);
      assert.ok(l.fn(0).surprise === 0 && l.fn(1).surprise < 1e-10);
      assert.equal(r.frame(l.start + l.duration + 0.001).phase, "splash");
    }
  }
});
test("the vortex rides on the concave bowl and coasters really invert with normalized cat/cart orientations", () => {
  const funnel = createMegaRoute(MEGA_RIDES.find((r) => r.kind === "funnel")),
    swirl = funnel.legs.find((l) => l.phase === "vortex");
  for (let u = 0; u <= 1; u += 0.05) {
    const p = swirl.fn(u).position;
    assert.ok(Math.abs(p[1] - funnelFloor(Math.hypot(p[0], p[2]))) < 0.07);
  }
  for (const spec of MEGA_RIDES.filter((r) => r.id.startsWith("coaster"))) {
    const r = createMegaRoute(spec);
    let up = 1;
    for (let t = 0; t < r.duration; t += 0.01) {
      const f = r.frame(t);
      if (f.quaternion) {
        const q = new THREE.Quaternion().fromArray(f.quaternion);
        assert.ok(Math.abs(q.length() - 1) < 1e-10);
        up = Math.min(up, new THREE.Vector3(0, 1, 0).applyQuaternion(q).y);
      }
    }
    assert.ok(up < -0.98, spec.id + " does not fully invert");
  }
});
test("authored models keep all static geometry within the footprint and bounded draw/triangle costs; water and impacts animate", () => {
  for (const spec of MEGA_RIDES) {
    const g = makeAttraction(spec.id),
      bounds = new THREE.Box3().setFromObject(g);
    let tris = 0,
      draws = 0;
    assert.ok(
      bounds.min.x >= -spec.footprint[0] / 2 - 0.01 &&
        bounds.max.x <= spec.footprint[0] / 2 + 0.01,
      spec.id,
    );
    assert.ok(
      bounds.min.z >= -spec.footprint[1] / 2 - 0.01 &&
        bounds.max.z <= spec.footprint[1] / 2 + 0.01,
      spec.id,
    );
    g.traverseVisible((o) => {
      if (!o.isMesh) return;
      draws++;
      tris +=
        ((o.geometry.index?.count || o.geometry.attributes.position.count) /
          3) *
        (o.isInstancedMesh ? o.count : 1);
      assert.ok(
        [...o.geometry.attributes.position.array].every(Number.isFinite),
      );
    });
    assert.ok(
      draws <= 36 && tris <= 160000,
      spec.id + " " + draws + "/" + tris,
    );
    assert.ok(g.userData.stats.staticMeshes <= 7);
    for (const m of g.userData.waterMaterials)
      assert.equal(m.isShaderMaterial, true);
    if (spec.kind === "dive") assert.equal(g.userData.labels.length, 3);
    if (g.userData.route.impacts.length) {
      g.userData.rideElapsed = g.userData.route.impacts[0].time + 0.01;
      g.userData.update(100);
      assert.ok(g.userData.pool.userData.water.uniforms.uRippleCount.value > 0);
    }
    disposeScenery(g);
  }
});
test("Chichi, tiny kittens and giant cats follow the same moving seat, including inversions and landing reactions", () => {
  const models = [
    createCat(),
    ...["adopt-crumb", "adopt-doughnut"].map((id) => {
      const p = ADOPTION_CATS.find((p) => p.id === id),
        c = createCat("happy", catAppearance(p));
      c.scale.setScalar(0.63 * p.size);
      return c;
    }),
  ];
  for (const spec of MEGA_RIDES) {
    const g = makeAttraction(spec.id),
      r = g.userData.route;
    for (const l of r.legs.filter((l) =>
      ["ride", "vortex", "flight"].includes(l.phase),
    ))
      for (const u of [0.25, 0.5, 0.75]) {
        const elapsed = l.start + l.duration * u,
          f = r.frame(elapsed);
        g.userData.rideElapsed = elapsed;
        g.userData.update(100 + elapsed);
        assert.ok(
          g.userData.moving.position.distanceTo(
            new THREE.Vector3(...f.position),
          ) < 1e-7,
        );
        for (const c of models) {
          const carrier = new THREE.Group();
          carrier.add(c);
          carrier.position.set(...f.position);
          if (f.quaternion) carrier.quaternion.fromArray(f.quaternion);
          else carrier.rotation.set(f.pitch || 0, f.yaw || 0, f.roll || 0);
          animateCat(c, elapsed);
          reactCat(c, { surprise: f.surprise || 0, paw: f.paw || 0 });
          carrier.updateMatrixWorld(true);
          assert.ok(
            c.userData.head.matrixWorld.elements.every(Number.isFinite),
          );
          c.removeFromParent();
        }
      }
    disposeScenery(g);
  }
  models.forEach(disposeCat);
});
test("purchases, construction, physical AI targets, coins and XP survive reloads, with income collected only once", () => {
  let g = prepared(),
    previous,
    cursor = now;
  const db = memory();
  for (const spec of MEGA_RIDES) {
    if (previous) g = storeItem(g, previous, cursor);
    g = placeItem(
      purchase(g, spec.id, cursor),
      spec.id,
      "homestead",
      0,
      0,
      0,
      cursor,
    );
    const p = g.placements.at(-1);
    previous = p.id;
    assert.equal(isBuilt(p, cursor), false);
    assert.equal(isBuilt(p, p.readyAt), true);
    const before = worldSnapshot(g, p.readyAt);
    assert.equal(
      manualInteraction(before, { activityId: p.id }, "happy").action,
      "ride",
    );
    assert.equal(
      parseDecision(
        { mood: "happy", action: "ride", activityId: p.id, thought: "Уии!" },
        { ...g.cat, world: before },
      ).activityId,
      p.id,
    );
    const due = p.readyAt + 3600000,
      amount = incomeFor(g, p.id, due);
    assert.ok(amount > 0 && businessXP(spec.id) > 0);
    g = collectIncome(g, p.id, due).game;
    const wallet = g.coins,
      xp = g.progression.xp;
    cursor = due + 1000;
    for (let i = 0; i < 8; i++) {
      saveGame(db, g);
      g = loadGame(db, due, { advance: false });
      assert.equal(g.coins, wallet);
      assert.equal(g.progression.xp, xp);
      assert.equal(g.placements.find((x) => x.id === p.id).item, spec.id);
    }
    assert.throws(() => collectIncome(g, p.id, due));
  }
});
test("manual drops reserve every complex, residents keep exact world-space seats and cancelling an inversion releases the ride upright", () => {
  for (const spec of MEGA_RIDES) {
    const g = makeAttraction(spec.id);
    g.position.set(12, 0.16, -5);
    g.rotation.y = 0.7;
    g.userData.placement = { biome: "homestead" };
    assert.deepEqual(
      dropTarget(
        { x: spec.footprint[0] / 2 - 0.2, z: 0 },
        [{ id: "test", type: spec.id, x: 0, z: 0, built: true }],
        [],
        { touch: true },
      ),
      { activityId: "test" },
    );
    const actor = {
      index: 0,
      profile: { biome: "homestead" },
      carrier: new THREE.Group(),
    };
    let completions = 0;
    const r = createResidentPlay({
      getCat: () => actor,
      getObject: () => g,
      onComplete: () => completions++,
    });
    assert.ok(r.start("kitten", { action: "ride", activityId: "test" }, 0));
    assert.equal(
      r.start("giant", { action: "ride", activityId: "test" }, 0),
      false,
    );
    r.frame("kitten", 10000, 10);
    const segment = g.userData.route.legs.find(
        (l) => l.phase === "ride" || l.phase === "flight",
      ),
      elapsed = segment.start + segment.duration * 0.5;
    const f = r.frame("kitten", 10000 + elapsed * 1000, 10 + elapsed),
      target = g.localToWorld(
        new THREE.Vector3(...g.userData.rideFrame(elapsed).position),
      );
    assert.ok(f.position.distanceTo(target) < 1e-7);
    actor.carrier.rotation.set(1, 0.7, 2);
    r.cancel("kitten");
    assert.equal(actor.carrier.rotation.x, 0);
    assert.equal(actor.carrier.rotation.z, 0);
    assert.equal(g.userData.rideElapsed, undefined);
    assert.ok(r.start("giant", { action: "ride", activityId: "test" }, 200000));
    r.frame("giant", 210000, 210);
    r.frame(
      "giant",
      210000 + (g.userData.duration + 1) * 1000,
      211 + g.userData.duration,
    );
    assert.equal(completions, 1);
    assert.equal(r.get("giant"), undefined);
    disposeScenery(g);
  }
});
