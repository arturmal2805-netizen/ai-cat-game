import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as THREE from "three";
import { BIOMES as REGISTERED_BIOMES, byBiome, NEIGHBORS } from "../public/game-data.js";
// Preserve the released-island snapshot; new destinations have independent coverage.
const BIOMES = REGISTERED_BIOMES.filter(b => !b.magicFarm && !b.zoo);
import {
  MOSA_RADIUS,
  MOSA_SEA,
  MOSA_DEPTH,
  mosaDryPoint,
} from "../public/mosasaur-data.js";
import {
  mosasaurFrame,
  mosasaurApproach,
  MOSA_DURATION,
  MOSA_SEAT,
  MOSA_SCALE,
  MOSA_TIMES,
  MOSA_GRAVITY,
} from "../public/mosasaur-motion.js";
import { createLagoon } from "../public/lagoon.js";
import { createBiomeScene } from "../public/biome-scenes.js";
import { makeAttraction, animateAttraction } from "../public/world-assets.js";
import {
  newGame,
  loadGame,
  saveGame,
  unlockBiome,
  worldSnapshot,
  canPlace,
  purchase,
} from "../public/economy.js";
import { xpForLevel } from "../public/progression.js";
import { manualInteraction } from "../public/interactions.js";
import { validateState, parseDecision } from "../ai.mjs";
import { createResidentPlay } from "../public/resident-play.js";
import {
  createCat,
  animateCat,
  reactCat,
  disposeCat,
} from "../public/cat-model.js";
import { createChichiCamera } from "../public/chichi-camera.js";
const now = Date.UTC(2026, 9, 17);
test("only the butterfly garden becomes the six-area ocean; level eight unlocks it and previous ownership remains", () => {
  assert.equal(byBiome("autumn").requiredLevel, 8);
  assert.equal(BIOMES.length, 18);
  assert.ok(Math.abs(MOSA_RADIUS ** 2 / 11.65 ** 2 - 6) < 1e-12);
  assert.deepEqual(
    BIOMES.filter(
      (b) =>
        ![
          "autumn",
          "foodcourt",
          "bikini",
          "homestead",
          "aquarium",
          "jobcity",
          "cat-homes",
          "atoll-park",
        ].includes(b.id),
    ),
    JSON.parse(
      fs.readFileSync(
        new URL("./fixtures/mosasaur-unaffected-biomes.json", import.meta.url),
      ),
    ),
  );
  const g = newGame(now);
  g.coins = 50000;
  g.progression.xp = xpForLevel(7);
  assert.throws(() => unlockBiome(g, "autumn", now), /уровне 8/);
  g.progression.xp = xpForLevel(8);
  assert.throws(() => purchase(g, "ride-mosasaur", now), /своём острове/);
  assert.ok(unlockBiome(g, "autumn", now).unlocked.includes("autumn"));
});
test("the measured mesh seabed is at least ten times deeper than every previous lagoon, including raised ones", () => {
  const deep = createBiomeScene(byBiome("autumn")),
    sea = deep.userData.ocean.sea;
  const actual = MOSA_SEA.surfaceY - sea.userData.bed.position.y;
  assert.equal(actual, MOSA_DEPTH);
  let deepest = 0;
  for (const b of BIOMES.filter(
    (b) =>
      ![
        "autumn",
        "foodcourt",
        "bikini",
        "homestead",
        "aquarium",
        "jobcity",
        "cat-homes",
      ].includes(b.id),
  )) {
    const island = createBiomeScene(b, { lowOnly: false });
    for (const pond of island.userData.lagoons?.values() || [])
      if (pond.userData.bed) {
        const depth = 0.155 - pond.userData.bed.position.y;
        deepest = Math.max(deepest, depth);
      }
    island.userData.dispose();
  }
  assert.ok(deepest > 0);
  assert.ok(actual >= deepest * 10);
  const ground = deep.userData.navigationSurface;
  ground.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(
    new THREE.Vector3(0, 20, 0),
    new THREE.Vector3(0, -1, 0),
  );
  assert.equal(
    ray.intersectObject(ground).length,
    0,
    "an actual opening, not water laid over solid ground",
  );
  deep.userData.dispose();
});
test("all moving geometry clears the real seabed and shores; the seat follows the exact body quaternion throughout the faster route", () => {
  const g = makeAttraction("ride-mosasaur"),
    m = g.userData.moving,
    points = [];
  m.position.set(0, 0, 0);
  m.quaternion.identity();
  m.updateMatrixWorld(true);
  m.traverse((o) => {
    if (o.isMesh) {
      const a = o.geometry.attributes.position;
      for (let i = 0; i < a.count; i += 4)
        points.push(
          new THREE.Vector3()
            .fromBufferAttribute(a, i)
            .applyMatrix4(o.matrixWorld),
        );
    }
  });
  const p = new THREE.Vector3();
  let submerged = false,
    leapt = false;
  for (let i = 0; i <= MOSA_DURATION * 30; i++) {
    const t = i / 30,
      f = mosasaurFrame(t),
      q = new THREE.Quaternion().fromArray(f.quaternion),
      origin = new THREE.Vector3(...f.bodyPosition);
    const expected = new THREE.Vector3(...MOSA_SEAT)
      .multiplyScalar(MOSA_SCALE)
      .applyQuaternion(q)
      .add(origin);
    assert.ok(expected.distanceTo(new THREE.Vector3(...f.position)) < 1e-10);
    for (const v of points) {
      p.copy(v).applyQuaternion(q).add(origin);
      assert.ok(p.y > MOSA_SEA.bedY + 1, "no mesh penetrates the bottom");
      if (p.y < 0.155)
        assert.ok(
          (p.x / 21) ** 2 + (p.z / 20) ** 2 < 0.9,
          "all underwater geometry stays clear of the banks",
        );
    }
    if (f.phase === "deep") {
      assert.ok(f.position[1] + 2.8 < 0.155);
      submerged = true;
    }
    if (f.position[1] > 11) {
      assert.ok(f.surprise > 0);
      leapt = true;
    }
  }
  assert.ok(submerged && leapt);
  assert.ok(
    new THREE.Vector3(...mosasaurFrame(0).position).distanceTo(
      new THREE.Vector3(...mosasaurFrame(MOSA_DURATION).position),
    ) < 1e-8,
  );
});
test("deep swimming is four times faster, and the leap has constant gravity, straight horizontal momentum and a nose-first re-entry", () => {
  const oldSpeed = (Math.PI * 2 * 8) / 48;
  for (const t of [6, 9, 12, 15]) {
    const f = mosasaurFrame(t);
    assert.ok(Math.hypot(f.velocity[0], f.velocity[2]) > oldSpeed * 4);
    assert.equal(f.phase, "deep");
  }
  const h = 0.001;
  for (let t = MOSA_TIMES.launch + 0.1; t < MOSA_TIMES.land - 0.1; t += 0.07) {
    const a = mosasaurFrame(t - h),
      b = mosasaurFrame(t),
      c = mosasaurFrame(t + h);
    const acceleration = (c.velocity[1] - a.velocity[1]) / (2 * h);
    assert.ok(Math.abs(acceleration + MOSA_GRAVITY) < 1e-7);
    assert.ok(Math.abs(c.velocity[0] - a.velocity[0]) < 1e-8);
    assert.equal(b.velocity[2], 0);
  }
  assert.ok(mosasaurFrame(MOSA_TIMES.launch + 0.1).pitch < -1.2);
  assert.ok(mosasaurFrame(MOSA_TIMES.land - 0.1).pitch > 1.2);
  assert.ok(
    mosasaurFrame((MOSA_TIMES.launch + MOSA_TIMES.land) / 2).bodyPosition[1] >
      15,
  );
  for (const t of [
    MOSA_TIMES.deep,
    MOSA_TIMES.ascent,
    MOSA_TIMES.launch,
    MOSA_TIMES.land,
    MOSA_TIMES.plunge,
    MOSA_TIMES.return,
  ]) {
    const a = mosasaurFrame(t - 1e-6),
      b = mosasaurFrame(t + 1e-6);
    assert.ok(
      new THREE.Vector3(...a.bodyPosition).distanceTo(
        new THREE.Vector3(...b.bodyPosition),
      ) < 0.0001,
    );
    assert.ok(
      new THREE.Vector3(...a.velocity).distanceTo(
        new THREE.Vector3(...b.velocity),
      ) < 0.0001,
    );
  }
});
test("the sculpt has separate broad skull and articulated toothed jaw, while breach and landing use bounded instanced spray", () => {
  const g = makeAttraction("ride-mosasaur"),
    d = g.userData;
  assert.ok(d.skull.geometry.attributes.position.count > 2000);
  assert.ok(d.jaw.children.length > 1);
  let vertices = 0;
  g.traverse((o) => {
    if (o.isMesh) vertices += o.geometry.attributes.position.count;
  });
  assert.ok(
    vertices < 65000,
    "the detailed creature and jetty retain a bounded geometry budget",
  );
  g.userData.rideElapsed = MOSA_TIMES.launch - 0.1;
  d.update(5);
  assert.equal(d.spray.visible, true);
  assert.equal(d.foam.visible, true);
  assert.equal(d.spray.count, 96);
  const first = d.jaw.rotation.x;
  g.userData.rideElapsed = MOSA_TIMES.launch + 0.5;
  d.update(5);
  assert.ok(d.jaw.rotation.x > first);
  g.userData.rideElapsed = MOSA_TIMES.land + 0.2;
  d.update(5);
  assert.ok(d.spray.visible && d.crown.visible);
  for (const value of d.spray.instanceMatrix.array)
    assert.ok(Number.isFinite(value));
  assert.ok(d.spray.material.opacity > 0);
  g.userData.rideElapsed = MOSA_TIMES.land + 2;
  d.update(5);
  assert.equal(d.spray.visible, false);
  d.update(5, true);
  assert.equal(d.foam.visible, false);
});
test("breach and re-entry disturb the real sea once each; repeated frames and reduced motion do not spam water effects", () => {
  const g = makeAttraction("ride-mosasaur"),
    hits = [];
  g.userData.onWaterImpact = (...args) => hits.push(args);
  for (let t = 0; t < MOSA_DURATION; t += 1 / 60) {
    g.userData.rideElapsed = t;
    g.userData.update(t);
    g.userData.update(t);
  }
  assert.equal(hits.length, 2);
  assert.ok(hits[1][3] > hits[0][3]);
  assert.ok(hits.every((hit) => hit.every(Number.isFinite)));
  delete g.userData.rideElapsed;
  g.userData.update(40);
  for (let t = 0; t < MOSA_DURATION; t += 0.1) {
    g.userData.rideElapsed = t;
    g.userData.update(t, true);
  }
  assert.equal(hits.length, 2);
});
test("all cat identities share boarding, a reserved saddle, diving, flight and safe dry dismount; real AI accepts this physical object", () => {
  const game = newGame(now);
  game.unlocked.push("autumn");
  const w = worldSnapshot(game, now),
    decision = manualInteraction(w, { activityId: "island-mosasaur" }, "happy");
  assert.equal(decision.action, "ride");
  assert.equal(
    parseDecision(decision, validateState({ ...game.cat, world: w }))
      .activityId,
    "island-mosasaur",
  );
  const g = makeAttraction("ride-mosasaur");
  g.position.set(-150, 0.16, -42);
  const n = {
    carrier: new THREE.Group(),
    profile: { biome: "autumn" },
    index: 0,
  };
  const r = createResidentPlay({
    getCat: () => n,
    getObject: (id) => (id === "island-mosasaur" ? g : null),
  });
  for (const cat of NEIGHBORS) {
    n.carrier.position.set(-150, 0.16, -19);
    assert.ok(r.start(cat.id, decision, 0), cat.id);
    assert.equal(r.start("other", decision, 0), false, "one rider per saddle");
    const approach = r.get(cat.id).travel;
    r.frame(cat.id, approach, 0);
    for (const t of [1, 4, 9, 16, 18.4, 20.4, 22.5, 27.5, MOSA_DURATION]) {
      const f = r.frame(cat.id, approach + t * 1000, t);
      const expected = g.localToWorld(
        new THREE.Vector3(...mosasaurFrame(t).position),
      );
      assert.ok(f.position.distanceTo(expected) < 1e-8, cat.id);
    }
    const finish = r.frame(
      cat.id,
      approach + (MOSA_DURATION + 1) * 1000,
      MOSA_DURATION + 1,
    );
    assert.equal(finish.completed, true);
    assert.equal(r.visits.size, 0);
    assert.equal(finish.quaternion, null);
    assert.ok(finish.position.z > -20, "back on the dry jetty");
  }
  assert.ok(
    !worldSnapshot(newGame(now), now).activities.some(
      (a) => a.id === "island-mosasaur",
    ),
  );
});
test("close Chichi camera stays aimed at her face, above the real bottom, through the surface, full submersion and leap", () => {
  const cat = createCat("happy"),
    carrier = new THREE.Group();
  carrier.add(cat);
  const camera = new THREE.PerspectiveCamera(40, 390 / 600, 0.05, 500),
    look = new THREE.Vector3();
  camera.position.set(0, 5, 15);
  const follow = createChichiCamera(camera, cat.userData.head);
  follow.setEnabled(true, look);
  let submerged = 0;
  const target = new THREE.Vector3(),
    direction = new THREE.Vector3();
  const eyes = cat.userData.eyes.map((e) => e.position.clone());
  for (let i = 0; i <= MOSA_DURATION * 30; i++) {
    const f = mosasaurFrame(i / 30);
    carrier.position.set(...f.position);
    carrier.quaternion.fromArray(f.quaternion);
    animateCat(cat, i / 30, false, false);
    reactCat(cat, { surprise: f.surprise });
    carrier.updateMatrixWorld(true);
    follow.facePoint(look);
    follow.update(0.05, look);
    camera.updateMatrixWorld(true);
    cat.userData.head.localToWorld(target.set(0, 0.035, 0.18));
    assert.ok(
      [...camera.position.toArray(), ...camera.quaternion.toArray()].every(
        Number.isFinite,
      ),
    );
    assert.ok(camera.position.y > MOSA_SEA.bedY + 1);
    if (i > 15) {
      camera.getWorldDirection(direction);
      assert.ok(
        direction.dot(target.clone().sub(camera.position).normalize()) >
          0.99999,
      );
    }
    if (f.phase === "deep") {
      assert.ok(camera.position.y < 0);
      submerged++;
    }
  }
  assert.ok(submerged > 100);
  animateCat(cat, 0, false, false);
  for (let i = 0; i < 2; i++)
    assert.equal(cat.userData.eyes[i].position.z, eyes[i].z);
  disposeCat(cat);
});
test("shore walking stays dry and migrated paid plots preserve every ID, deadline, crop and business tier", () => {
  for (let i = 0; i < 60; i++) {
    const p = mosaDryPoint(Math.sin(i) * 10, Math.cos(i) * 10);
    assert.ok((p.x / 21) ** 2 + (p.z / 20) ** 2 >= 1);
  }
  for (let i = 0; i <= 100; i++) {
    const p = mosasaurApproach([24, 0, 0], mosasaurFrame(0).position, i / 100);
    if (i < 72) assert.ok((p[0] / 21) ** 2 + (p[2] / 20) ** 2 >= 1);
  }
  const g = newGame(now);
  g.unlocked.push("autumn");
  g.coins = 8123;
  g.progression.xp = xpForLevel(8);
  g.placements.push({
    id: "legacy-ocean-business",
    item: "business-hotdog",
    biome: "autumn",
    x: 0,
    z: 0,
    rotation: 0,
    readyAt: now + 400000,
  });
  g.business.levels["legacy-ocean-business"] = 3;
  const data = new Map(),
    storage = {
      getItem: (k) => data.get(k) || null,
      setItem: (k, v) => data.set(k, v),
    };
  saveGame(storage, g);
  const loaded = loadGame(storage, now, { advance: false }),
    p = loaded.placements.find((p) => p.id === "legacy-ocean-business");
  assert.ok(p);
  assert.equal(p.readyAt, now + 400000);
  assert.equal(loaded.business.levels[p.id], 3);
  assert.equal(loaded.coins, g.coins);
  assert.ok(canPlace(loaded, p.item, p.biome, p.x, p.z, p.rotation, p.id).ok);
  saveGame(storage, loaded);
  assert.deepEqual(
    loadGame(storage, now, { advance: false }).placements,
    loaded.placements,
  );
});

test("idle fins animate and a cancelled deep ride returns Marin to the actual boarding transform", () => {
  const g = makeAttraction("ride-mosasaur"),
    n = { carrier: new THREE.Group(), profile: { biome: "autumn" }, index: 0 };
  const r = createResidentPlay({ getCat: () => n, getObject: () => g });
  assert.ok(
    r.start("chichi", { activityId: "island-mosasaur", action: "ride" }, 0),
  );
  const travel = r.get("chichi").travel;
  r.frame("chichi", travel, 0);
  r.frame("chichi", travel + 16000, 16);
  assert.ok(g.userData.moving.position.y < -10);
  r.cancel("chichi");
  animateAttraction(g, 50);
  assert.ok(
    g.userData.moving.position.distanceTo(
      new THREE.Vector3(...mosasaurFrame(0).bodyPosition),
    ) < 1e-9,
  );
  assert.equal(g.userData.phase, "boarding");
  const first = g.userData.fins[0].rotation.z;
  animateAttraction(g, 51);
  assert.notEqual(g.userData.fins[0].rotation.z, first);
});
