import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCat, animateCat, disposeCat } from "../public/cat-model.js";
import { catNavigationRadius } from "../public/cat-navigation-size.js";
import { ADOPTION_CATS, catAppearance } from "../public/cat-breeds.js";
import {
  courtPath,
  courtObstacles,
  courtNavigationStats,
  COURT_MASK_LIMIT,
  courtSegment,
} from "../public/foodcourt-navigation.js";
import { courtVenue } from "../public/foodcourt-assets.js";
import { AQUARIUM_TANKS } from "../public/aquarium-data.js";
import { createWorldMotes } from "../public/world-effects.js";
import { prepareSceneSteps } from "../public/scene-tasks.js";
import { mergeSceneSteps } from "../public/geometry-tasks.js";
import { newGame, claimRewards, HOUR } from "../public/economy.js";
import { gameDay } from "../public/progression.js";
import {
  incomeFor,
  incomeForVenue,
  businessVenues,
  normalizeBusiness,
} from "../public/business.js";
import { pauseHiddenMatrixUpdates } from "../public/scene-visibility.js";

test("navigation radius stays constant through breathing for ordinary, tiny and giant approved cats", () => {
  const options = [
    {},
    ...["adopt-crumb", "adopt-marshmallow", "adopt-doughnut"].map((id) =>
      catAppearance(ADOPTION_CATS.find((c) => c.id === id)),
    ),
  ];
  for (const appearance of options) {
    const cat = createCat("happy", appearance);
    cat.scale.setScalar(appearance.size || 0.7);
    const radius = catNavigationRadius(cat);
    for (let i = 0; i < 400; i++) {
      animateCat(cat, i / 20, i % 2 === 0);
      assert.equal(catNavigationRadius(cat), radius);
      assert.ok(
        radius >=
          Math.max(
            0.48,
            cat.userData.body.scale.x *
              cat.scale.x *
              (cat.userData.appearance?.width || 1) +
              0.16,
          ) -
            1e-12,
      );
    }
    disposeCat(cat);
  }
});

test("hidden scene branches skip all descendant matrix work and refresh correctly after movement or explicit camera queries", () => {
  const scene = new THREE.Scene(),
    branch = new THREE.Group(),
    mesh = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial(),
    );
  scene.add(branch);
  branch.add(mesh);
  scene.updateMatrixWorld(true);
  const original = mesh.updateMatrixWorld;
  let calls = 0;
  mesh.updateMatrixWorld = function (...a) {
    calls++;
    original.apply(this, a);
  };
  pauseHiddenMatrixUpdates(branch);
  branch.visible = false;
  branch.position.set(8, 3, -5);
  mesh.position.set(2, 4, 6);
  for (let i = 0; i < 300; i++) scene.updateMatrixWorld(true);
  assert.equal(calls, 0);
  assert.deepEqual(
    mesh.getWorldPosition(new THREE.Vector3()).toArray(),
    [10, 7, 1],
  );
  mesh.position.x = 5;
  branch.visible = true;
  scene.updateMatrixWorld();
  assert.equal(calls, 1);
  assert.deepEqual(
    mesh.getWorldPosition(new THREE.Vector3()).toArray(),
    [13, 7, 1],
  );
  mesh.geometry.dispose();
  mesh.material.dispose();
});

test("navigation cache is bounded even when many different actor sizes request routes", () => {
  const obstacles = courtObstacles([], "aquarium"),
    start = { x: 0, z: 33 },
    goal = { x: -20, z: 22 };
  for (let i = 0; i < 100; i++) {
    const radius = 0.48 + i * 0.000731;
    const route = courtPath(start, goal, radius, obstacles, "aquarium");
    assert.ok(route?.length);
    let from = start;
    for (const p of route) {
      assert.ok(courtSegment(from, p, radius, obstacles, "aquarium"));
      from = p;
    }
    assert.ok(courtNavigationStats(obstacles).masks <= COURT_MASK_LIMIT);
  }
  assert.equal(courtNavigationStats(obstacles).masks, COURT_MASK_LIMIT);
  assert.ok(courtNavigationStats(obstacles).bytes < 1_100_000);
});

test("all 50 fish and 120 bubbles keep geometry and GPU instance buffers stable during swimming and reduced motion", () => {
  const templates = new Set();
  for (const o of AQUARIUM_TANKS) {
    const tank = courtVenue(o),
      shoal = tank.userData.shoal,
      mesh = shoal.children[0],
      bubble = tank.getObjectByName("Aquarium bubbles · fixed GPU instances"),
      attributes = [
        mesh.instanceMatrix,
        mesh.instanceColor,
        bubble.instanceMatrix,
        ...Object.values(mesh.geometry.attributes),
      ],
      before = attributes.map((a) => ({
        array: a.array,
        version: a.version,
        bytes: a.array.slice(),
      })),
      poses = shoal.userData.palette.poses.slice();
    templates.add(mesh.geometry);
    assert.equal(shoal.children.length, 1);
    assert.equal(mesh.count, o.fish);
    assert.equal(bubble.count, 24);
    for (let i = 0; i < 600; i++)
      tank.userData.update(i / 60, i > 300 && i < 400);
    for (let i = 0; i < attributes.length; i++) {
      assert.equal(attributes[i].array, before[i].array);
      assert.equal(attributes[i].version, before[i].version);
      assert.deepEqual(attributes[i].array, before[i].bytes);
    }
    shoal.userData.palette.poses.forEach((p, i) => assert.equal(p, poses[i]));
    const body = new THREE.Matrix4();
    mesh.getMatrixAt(0, body);
    assert.ok(
      Math.abs(body.elements[12] - shoal.userData.palette.place.value[0]) <
        1e-6,
    );
  }
  assert.equal(templates.size, 1);
});

test("55 fireflies retain their exact sphere detail and three colours without per-frame matrix uploads", () => {
  const root = createWorldMotes(),
    look = new THREE.Vector3(123, 0, -28),
    all = root.children,
    versions = all.map((m) => m.instanceMatrix.version),
    arrays = all.map((m) => m.instanceMatrix.array.slice());
  assert.equal(all.length, 3);
  assert.equal(
    all.reduce((n, m) => n + m.count, 0),
    55,
  );
  for (let i = 0; i < 300; i++) root.userData.update(i / 60, look);
  all.forEach((m, i) => {
    assert.equal(m.instanceMatrix.version, versions[i]);
    assert.deepEqual(m.instanceMatrix.array, arrays[i]);
    assert.equal(m.geometry.attributes.position.count, 77);
  });
  assert.equal(root.position.x, look.x);
  assert.equal(root.position.z, look.z);
  root.userData.update(9, look, true);
  assert.deepEqual(root.position.toArray(), [0, 0, 0]);
  root.userData.dispose();
});

test("cooperative geometry bounds match Three exactly and preserve half-float data without a duplicate buffer", async () => {
  const a = new THREE.BoxGeometry(2, 3, 4),
    b = a.clone().translate(6, 2, -8);
  for (const g of [a, b]) {
    const p = g.attributes.position,
      v = new Uint16Array(p.array.length);
    for (let i = 0; i < v.length; i++)
      v[i] = THREE.DataUtils.toHalfFloat(p.array[i]);
    g.setAttribute("position", new THREE.Float16BufferAttribute(v, 3));
  }
  const result = await prepareSceneSteps(mergeSceneSteps([a, b]), {
      budget: 0,
      yieldTask: async () => {},
    }),
    expected = result.clone();
  expected.computeBoundingBox();
  expected.computeBoundingSphere();
  assert.equal(result.attributes.position.isFloat16BufferAttribute, true);
  assert.deepEqual(result.boundingBox, expected.boundingBox);
  assert.deepEqual(result.boundingSphere, expected.boundingSphere);
  assert.equal(
    result.attributes.position.getX(a.attributes.position.count),
    b.attributes.position.getX(0),
  );
});

test("idle reward polls reuse the world and cached Kyiv dates respect midnight and DST", () => {
  const now = Date.UTC(2026, 9, 18, 12),
    g = claimRewards(newGame(now), now, true).game;
  for (let i = 0; i < 500; i++)
    assert.equal(claimRewards(g, now + i * 1000, true).game, g);
  const paid = claimRewards(g, now + HOUR, true);
  assert.equal(paid.rewards[0].amount, 60);
  assert.notEqual(paid.game, g);
  for (const t of [
    Date.UTC(2026, 2, 29, 0, 59),
    Date.UTC(2026, 2, 29, 1, 1),
    Date.UTC(2026, 9, 25, 0, 59),
    Date.UTC(2026, 9, 25, 1, 1),
    Date.UTC(2026, 9, 18, 21, 0),
  ])
    assert.equal(
      gameDay(t),
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Kyiv",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(t)),
    );
});

test("linear bulk register reads preserve coins, diamonds and XP timers for a large world", () => {
  const now = Date.UTC(2026, 9, 18, 12),
    g = newGame(now);
  g.placements = Array.from({ length: 160 }, (_, i) => ({
    id: "perf-business-" + i,
    item: i % 7 === 0 ? "diamond-mine" : "cat-barista",
    biome: "moon",
    x: i,
    z: 0,
    rotation: 0,
    readyAt: now - 2 * HOUR,
  }));
  g.business = normalizeBusiness({}, g, now - HOUR);
  for (const p of businessVenues(g))
    for (const t of [now - HOUR, now, now + 9 * HOUR])
      assert.equal(incomeForVenue(g, p, t), incomeFor(g, p.id, t));
});
