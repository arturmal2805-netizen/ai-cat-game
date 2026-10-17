import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as THREE from "three";
import { BIOMES, byBiome, CATALOG, NEIGHBORS } from "../public/game-data.js";
import {
  AQUARIUM_BUILDING as B,
  AQUARIUM_RADIUS,
  AQUARIUM_GATE,
  AQUARIUM_TANKS,
  AQUARIUM_LOCALS,
  aquariumSeats,
  aquariumFishFrame,
  aquariumOutline,
} from "../public/aquarium-data.js";
import { createBiomeScene, disposeBiome } from "../public/biome-scenes.js";
import { courtVenue } from "../public/foodcourt-assets.js";
import {
  courtObstacles,
  courtPath,
  courtSegment,
  courtWalkable,
} from "../public/foodcourt-navigation.js";
import { createCourtRuntime } from "../public/foodcourt-runtime.js";
import {
  newGame,
  unlockBiome,
  worldSnapshot,
  loadGame,
  saveGame,
} from "../public/economy.js";
import {
  manualInteraction,
  resolveInteraction,
} from "../public/interactions.js";
import { completeSpaVisit } from "../public/spa-system.js";
import { xpForLevel } from "../public/progression.js";
const now = Date.UTC(2026, 9, 18, 12);
function seed() {
  let g = newGame(now);
  g.coins = 15000;
  g.progression.xp = xpForLevel(14);
  return unlockBiome(g, "aquarium", now);
}
test("aquarium is appended separately and every established biome is byte-identical", () => {
  const fixture = JSON.parse(
    fs.readFileSync(
      new URL("./fixtures/aquarium-unaffected-biomes.json", import.meta.url),
    ),
  );
  assert.deepEqual(
    BIOMES.filter((b) => b.id !== "aquarium"),
    fixture,
  );
  assert.equal(BIOMES.length, 28);
  const b = byBiome("aquarium");
  assert.equal(b.requiredLevel, 14);
  assert.ok(b.radius > 11.65 * 3);
  for (const other of fixture)
    assert.ok(
      Math.hypot(b.center[0] - other.center[0], b.center[1] - other.center[1]) >
        b.radius + (other.radius || 11.65) + 3,
    );
  const building = B.w * B.d - (4 - Math.PI) * B.r ** 2;
  assert.ok(building / (Math.PI * AQUARIUM_RADIUS ** 2) > 0.7);
  const tanks = AQUARIUM_TANKS.reduce(
    (n, o) =>
      n +
      (o.circular ? Math.PI * o.r * o.r : o.w * o.d - (4 - Math.PI) * o.r ** 2),
    0,
  );
  assert.ok(tanks / building > 0.5);
});
test("all viewing seats have clear physical routes through the real front entrance around the glass tanks", () => {
  const obstacles = courtObstacles([], "aquarium");
  for (const radius of [0.45, 0.6, 1.1])
    for (const tank of AQUARIUM_TANKS) {
      let valid = 0;
      for (const seat of aquariumSeats(tank)) {
        if (!courtWalkable(seat, radius, obstacles, "aquarium")) continue;
        const path = courtPath(
          AQUARIUM_GATE,
          seat,
          radius,
          obstacles,
          "aquarium",
        );
        if (!path) continue;
        valid++;
        let previous = AQUARIUM_GATE;
        for (const p of path) {
          assert.ok(courtSegment(previous, p, radius, obstacles, "aquarium"));
          previous = p;
        }
      }
      assert.ok(valid >= 2, tank.id + " radius " + radius);
    }
  for (const o of AQUARIUM_TANKS)
    assert.equal(courtWalkable(o, 0.6, obstacles, "aquarium"), false);
  for (const p of aquariumOutline(B.w, B.d, B.r, 12).filter(
    (p) => Math.abs(p.x) > 6,
  ))
    assert.equal(courtWalkable(p, 0.6, obstacles, "aquarium"), false);
});
test("five tanks have huge friendly catfish and smaller companions, sharing animated instanced geometry", () => {
  let total = 0;
  for (const o of AQUARIUM_TANKS) {
    const model = courtVenue(o);
    total += o.fish;
    assert.ok(model.userData.glass.material.transparent);
    assert.ok(model.userData.glass.material.opacity < 0.1);
    assert.ok(model.userData.stats.instancedFishDraws <= 8);
    assert.ok(o.hero > 2.5 * (0.32 + 3 * 0.13));
    let travel = 0,
      last = null;
    for (let t = 0; t <= 80; t += 0.2) {
      model.userData.update(t);
      const f = aquariumFishFrame(o, 0, t);
      if (last) travel += Math.hypot(f.x - last.x, f.z - last.z);
      last = f;
      for (let i = 0; i < o.fish; i++) {
        const a = aquariumFishFrame(o, i, t);
        assert.ok(a.y - a.scale * 1.05 > 0.15);
        assert.ok(a.y + a.scale * 1.05 < o.h - 0.1);
        assert.ok(Math.abs(a.x) + a.scale * 2.05 < o.w / 2);
        assert.ok(Math.abs(a.z) + a.scale * 2.05 < o.d / 2);
      }
    }
    assert.ok(travel > 2, o.id);
    const matrices = model.userData.shoal.children.map((m) =>
      m.instanceMatrix.array.slice(),
    );
    model.userData.update(2, true);
    const reduced = model.userData.shoal.children.map((m) =>
      m.instanceMatrix.array.slice(),
    );
    model.userData.update(20, true);
    model.userData.shoal.children.forEach((m, i) =>
      assert.deepEqual(m.instanceMatrix.array, reduced[i]),
    );
    assert.notDeepEqual(matrices[0], reduced[0]);
    const headPart = model.userData.shoal.children[0];
    assert.ok(headPart.geometry.attributes.position.count > 2000);
    assert.equal(headPart.count, o.fish);
  }
  assert.equal(total, 50);
});
test("one glass palace has a transparent dome, a rocky underside, clouds and animated falls; close view restores its roof", () => {
  const g = createBiomeScene(byBiome("aquarium"), { scenery: [] });
  assert.ok(g.userData.roof.material.transparent);
  assert.ok(g.userData.roof.material.opacity <= 0.08);
  assert.equal(g.userData.walls.material.transparent, true);
  assert.ok(g.userData.stats.buildingArea / g.userData.stats.islandArea > 0.7);
  const box = new THREE.Box3().setFromObject(g);
  assert.ok(box.min.y < -20);
  assert.ok(box.max.y > 19);
  assert.ok(box.max.y < 25);
  assert.ok(
    box.max.x < 45 && box.min.x > -45 && box.max.z < 45 && box.min.z > -45,
  );
  g.userData.setInteriorView(true);
  assert.ok(g.userData.roof.material.opacity < 0.03);
  assert.equal(g.userData.roofRibs.visible, false);
  g.userData.setInteriorView(false);
  assert.equal(g.userData.roof.material.opacity, 0.075);
  assert.equal(g.userData.roofRibs.visible, true);
  g.userData.update(3);
  assert.ok(
    g.userData.detail.children.some(
      (o) => o.name === "Waterfall" || o.userData.waterfall,
    ),
  );
  disposeBiome(g);
});
test("ordinary visitors reserve separate seats, walk, watch moving fish and lift a paw, then complete the existing receipt ledger", () => {
  const done = [],
    r = createCourtRuntime({ onComplete: (v) => done.push(v) });
  const starts = [
    [-6, 32],
    [-2, 33],
    [2, 33],
    [6, 32],
    [0, 30],
    [-4, 29],
    [4, 29],
    [0, 35],
  ];
  for (let i = 0; i < starts.length; i++) {
    const o = AQUARIUM_TANKS[i % 5];
    assert.ok(
      r.start({
        catId: "guest-" + i,
        objectId: o.id,
        position: { x: starts[i][0], z: starts[i][1] },
        radius: 0.5,
        now,
      }),
    );
  }
  const obstacles = courtObstacles([], "aquarium");
  let lifted = false,
    watch = false;
  for (let i = 0; i < 16000 && r.visits.size; i++) {
    r.step(1 / 30, i / 30);
    const all = [...r.visits.values()];
    for (let a = 0; a < all.length; a++) {
      const v = all[a];
      if (v.phase === "watch") {
        watch = true;
        lifted ||= v.reaction?.paw > 0.3;
        assert.equal(v.holding, false);
      }
      assert.ok(courtWalkable(v.position, v.radius, obstacles, "aquarium"));
      for (let b = a + 1; b < all.length; b++)
        assert.ok(
          Math.hypot(
            v.position.x - all[b].position.x,
            v.position.z - all[b].position.z,
          ) >=
            v.radius + all[b].radius - 0.001,
        );
    }
  }
  assert.ok(watch && lifted);
  assert.equal(done.length, starts.length);
  assert.equal(r.visits.size, 0);
  assert.equal(AQUARIUM_LOCALS.length, 4);
  for (const c of AQUARIUM_LOCALS) {
    assert.ok(NEIGHBORS.some((n) => n.id === c.id));
    assert.ok(!c.fish);
  }
});
test("manual and AI actions, unlocks and completed visits use existing saves without changing purchases or creating meal charges", () => {
  let g = seed();
  const before = g.coins,
    placed = structuredClone(g.placements);
  const w = worldSnapshot(g);
  for (const o of AQUARIUM_TANKS) {
    const d = manualInteraction(w, { activityId: o.id }, "happy");
    assert.equal(d.action, "play");
    assert.equal(resolveInteraction(w, d).activityId, o.id);
    assert.ok(CATALOG.some((i) => i.id === o.type && i.islandOnly));
  }
  g.cat.happiness = 40;
  const receipt = {
    id: "court-aquarium-test-001",
    catId: "chichi",
    objectId: AQUARIUM_TANKS[0].id,
    position: { x: 0, z: 24 },
  };
  g = completeSpaVisit(g, receipt, now);
  assert.equal(g.cat.happiness, 52);
  assert.equal(g.coins, before);
  assert.deepEqual(g.placements, placed);
  assert.equal(completeSpaVisit(g, receipt, now), g);
  const data = new Map(),
    storage = {
      getItem: (k) => data.get(k) || null,
      setItem: (k, v) => data.set(k, v),
    };
  saveGame(storage, g);
  for (let i = 0; i < 15; i++) {
    g = loadGame(storage, now + i * 1000, { advance: false });
    assert.ok(g.unlocked.includes("aquarium"));
    assert.equal(g.catPosition.biome, "aquarium");
    assert.deepEqual(g.placements, placed);
    assert.equal(g.coins, before);
    saveGame(storage, g);
  }
});

test("level 14 is enforced and the actual animated fish vertices remain inside the glass in every tank", () => {
  const locked = newGame(now);
  locked.coins = 20000;
  locked.progression.xp = xpForLevel(13);
  assert.throws(() => unlockBiome(locked, "aquarium", now), /14/);
  const p = new THREE.Vector3(),
    m = new THREE.Matrix4();
  for (const o of AQUARIUM_TANKS) {
    const tank = courtVenue(o),
      shoal = tank.userData.shoal;
    for (const t of [0, 2.4, 5.7, 10.1, 18.8, 27.2, 39.1]) {
      tank.userData.update(t);
      for (const mesh of shoal.children) {
        mesh.getMatrixAt(0, m);
        const a = mesh.geometry.attributes.position;
        for (let i = 0; i < a.count; i++) {
          p.fromBufferAttribute(a, i).applyMatrix4(m);
          assert.ok(p.y > 0.14 && p.y < o.h - 0.05, o.id + " vertical " + p.y);
          assert.ok(
            Math.abs(p.x) < o.w / 2 && Math.abs(p.z) < o.d / 2,
            o.id + " glass",
          );
          if (o.circular)
            assert.ok(Math.hypot(p.x, p.z) < o.r, o.id + " curved glass");
        }
      }
    }
  }
});
