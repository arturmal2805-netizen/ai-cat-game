import { createHash } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as THREE from "three";
import { BIOMES, byBiome } from "../public/game-data.js";
import {
  CHILL_RADIUS,
  CHILL_HOUSES,
  CHILL_OBJECTS,
  CHILL_GATE,
  chillSeats,
  chillEntrance,
} from "../public/chill-data.js";
import { createChillRuntime } from "../public/chill-runtime.js";
import { chillWalkable, chillPath } from "../public/chill-navigation.js";
import { chillHouseModel } from "../public/chill-assets.js";
import {
  newGame,
  saveGame,
  loadGame,
  worldSnapshot,
  SAVE_KEY,
} from "../public/economy.js";
import { completeSpaVisit } from "../public/spa-system.js";
import { manualInteraction } from "../public/interactions.js";
import { validateState, parseDecision } from "../ai.mjs";
import { createBiomeScene, prepareBiomeScene } from "../public/biome-scenes.js";
const now = Date.UTC(2026, 9, 16),
  game = () => {
    const g = newGame(now);
    g.unlocked.push("sakura");
    return g;
  };
test("Chill Land replaces only the dream garden, with five times the playable area and the same stable unlock ID", () => {
  assert.equal(BIOMES.length, 26);
  assert.equal(byBiome("sakura").name, "Chill Land");
  assert.ok(Math.abs(CHILL_RADIUS ** 2 / 11.65 ** 2 - 5) < 1e-12);
  assert.equal(byBiome("crystal").name, "Кристальное королевство");
  assert.deepEqual(byBiome("crystal").center, [80, -40]);
  assert.equal(byBiome("stars").name, "Звёздная долина");
  assert.deepEqual(byBiome("stars").center, [40, -40]);
  assert.equal(CHILL_HOUSES.length, 7);
  assert.equal(new Set(CHILL_HOUSES.map((h) => h.form)).size, 7);
});
test("each house has one wide bed for two, a separate bath and a clear front entrance for large cats", () => {
  for (const h of CHILL_HOUSES) {
    const bed = CHILL_OBJECTS.find(
        (o) => o.houseId === h.id && o.kind === "bed",
      ),
      bath = CHILL_OBJECTS.find((o) => o.houseId === h.id && o.kind === "bath");
    assert.equal(chillSeats(bed).length, 2);
    assert.ok(Math.abs(chillSeats(bed)[0].x - chillSeats(bed)[1].x) >= 3);
    assert.equal(chillSeats(bath).length, 1);
    for (const o of [bed, bath])
      for (let i = 0; i < chillSeats(o).length; i++)
        assert.ok(chillWalkable(chillEntrance(o, i), 1.12), o.id);
  }
});
test("all fourteen beds and baths are physical manual and real AI choices after unlocking", () => {
  const g = game(),
    w = worldSnapshot(g, now),
    state = validateState({ ...g.cat, world: w });
  for (const o of CHILL_OBJECTS) {
    const d = manualInteraction(w, { activityId: o.id }, "happy");
    assert.equal(d.action, o.kind === "bed" ? "rest" : "swim");
    assert.equal(parseDecision(d, state).activityId, o.id);
  }
  assert.throws(() =>
    manualInteraction(
      worldSnapshot(newGame(now)),
      { activityId: CHILL_OBJECTS[0].id },
      "happy",
    ),
  );
});
test("every bed accepts two cats and every bath one; all finish entry, rest and exit and release reservations", () => {
  for (const o of CHILL_OBJECTS) {
    const done = [],
      r = createChillRuntime({ onComplete: (v) => done.push(v) }),
      phases = new Set(),
      count = o.kind === "bed" ? 2 : 1;
    for (let i = 0; i < count; i++)
      assert.ok(
        r.start({
          catId: "cat-" + i,
          objectId: o.id,
          position: { x: -3 + i * 3, z: 18, y: 0.16 },
          now,
        }),
        o.id,
      );
    assert.equal(
      r.start({
        catId: "full",
        objectId: o.id,
        position: { ...CHILL_GATE, y: 0.16 },
        now,
      }),
      null,
    );
    for (let f = 0; f < 7500 && r.visits.size; f++) {
      r.step(1 / 30, f / 30);
      const all = [...r.visits.values()];
      for (const a of all) {
        phases.add(a.phase);
        for (const b of all)
          if (a !== b)
            assert.ok(
              Math.hypot(
                a.position.x - b.position.x,
                a.position.z - b.position.z,
              ) >=
                a.radius + b.radius + 0.02,
              o.id,
            );
      }
    }
    assert.equal(done.length, count, o.id);
    assert.equal(r.visits.size, 0, o.id);
    for (const p of ["approach", "enter", "relax", "leave"])
      assert.ok(phases.has(p), o.id + " " + p);
  }
});
test("two giant cats fit the same mattress, dry routes avoid houses and placed scenery", () => {
  const o = CHILL_OBJECTS[0],
    r = createChillRuntime(),
    a = chillSeats(o);
  for (let i = 0; i < 2; i++)
    assert.ok(
      r.start({
        catId: "giant-" + i,
        objectId: o.id,
        radius: 1.12,
        position: { x: -3 + i * 4, z: 18, y: 0.16 },
        now,
      }),
    );
  const path = chillPath(CHILL_GATE, chillEntrance(o), 0.55, [
    { x: -6, z: 17, w: 2, d: 2 },
  ]);
  assert.ok(path?.length);
  for (const p of path)
    assert.ok(chillWalkable(p, 0.55, [{ x: -6, z: 17, w: 2, d: 2 }]));
  r.clear();
  assert.equal(r.visits.size, 0);
});
test("warm baths and shared naps use the saved idempotent needs ledger without taking coins or creating persistent bed teleportation", () => {
  let g = game();
  g.cat.energy = 10;
  g.cat.happiness = 20;
  const receipt = {
    id: "chill-saved-visit",
    catId: "chichi",
    objectId: CHILL_OBJECTS[0].id,
    position: chillEntrance(CHILL_OBJECTS[0]),
  };
  const next = completeSpaVisit(g, receipt, now);
  assert.equal(next.coins, g.coins);
  assert.equal(next.cat.energy, 34);
  assert.equal(next.care.resting, null);
  assert.equal(next.catPosition.biome, "sakura");
  assert.equal(completeSpaVisit(next, receipt, now), next);
  const data = new Map(),
    storage = {
      getItem: (k) => data.get(k) || null,
      setItem: (k, v) => data.set(k, v),
    };
  let saved = next;
  for (let i = 0; i < 30; i++) {
    assert.equal(saveGame(storage, saved), true);
    saved = loadGame(storage, now, { advance: false });
  }
  assert.deepEqual(saved.spa, next.spa);
  assert.deepEqual(saved.placements, next.placements);
  assert.equal(saved.coins, next.coins);
});
test("front rooms have no glass; both pillows and the bath are visible from an elevated camera", () => {
  for (const h of CHILL_HOUSES) {
    const model = chillHouseModel(h);
    model.updateMatrixWorld(true);
    const glass = [];
    model.traverse((o) => {
      if (o.isMesh && (o.material.transmission > 0 || o.material.opacity < 1))
        glass.push(o);
    });
    assert.equal(glass.length, 0);
    for (const target of [
      new THREE.Vector3(-4.05, 1.85, 0.65),
      new THREE.Vector3(-1.05, 1.85, 0.65),
      new THREE.Vector3(3.05, 1.95, 0.65),
    ]) {
      const position = new THREE.Vector3(0, 24, 25),
        delta = target.clone().sub(position),
        ray = new THREE.Raycaster(
          position,
          delta.clone().normalize(),
          0,
          delta.length() - 0.05,
        );
      const hits = ray.intersectObject(model, true);
      assert.equal(
        hits.length,
        0,
        h.id + " " + JSON.stringify(hits.map((h) => h.object.name)),
      );
    }
  }
});

test("the other approved biome records remain unchanged except the later mosasaur replacement", () => {
  assert.equal(
    createHash("sha256")
      .update(
        JSON.stringify(
          BIOMES.filter(
            (b) => !["sakura", "autumn", "foodcourt", "bikini"].includes(b.id),
          ),
        ),
      )
      .digest("hex"),
    "c197127c8e59fea9b628cda08f51ed88cc4d61aba32d7ac586a2333ba68f0427",
  );
});
test("fourteen concurrent visitors across seven mansions all finish without leaking a reservation", () => {
  const done = [],
    r = createChillRuntime({ onComplete: (v) => done.push(v) });
  for (let i = 0; i < 14; i++)
    assert.ok(
      r.start({
        catId: "stress-" + i,
        objectId: CHILL_OBJECTS[i].id,
        position: {
          x: ((i % 5) - 2) * 3,
          z: 18 - Math.floor(i / 5) * 2,
          y: 0.16,
        },
        now,
      }),
    );
  for (let f = 0; f < 30000 && r.visits.size; f++) r.step(1 / 30, f / 30);
  assert.equal(done.length, 14);
  assert.equal(r.visits.size, 0);
});
