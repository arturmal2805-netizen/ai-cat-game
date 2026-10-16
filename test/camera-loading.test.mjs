import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createChichiCamera } from "../public/chichi-camera.js";
import {
  createSceneScheduler,
  prepareSceneSteps,
} from "../public/scene-tasks.js";
import { createCat, animateCat, disposeCat } from "../public/cat-model.js";
import {
  kittenCacheSnapshot,
  installKittenCache,
} from "../public/chichi-sculpt.js";
import { initialScenery } from "../public/scenery-data.js";
import {
  restoreSculptCache,
  storeSculptCache,
} from "../public/sculpt-cache.js";

test("unavailable browser graphics storage never blocks the original renderer", async () => {
  assert.equal(await restoreSculptCache(), false);
  assert.equal(await storeSculptCache(), false);
});

function attributes(root) {
  const result = [];
  root.traverse((o) => {
    if (o.isMesh)
      result.push([
        o.name,
        Object.entries(o.geometry.attributes).map(([name, a]) => [
          name,
          a.itemSize,
          a.normalized,
          a.array.slice(),
        ]),
        o.geometry.index?.array.slice(),
      ]);
  });
  return result;
}
test("face camera holds only Chichi’s animated face in the centre through turns, altitude and phone rotation", () => {
  const carrier = new THREE.Group(),
    head = new THREE.Group(),
    camera = new THREE.PerspectiveCamera(40, 390 / 700, 0.5, 1200),
    look = new THREE.Vector3();
  head.position.set(0, 1.25, 0.46);
  carrier.add(head);
  camera.position.set(20, 20, 20);
  const follow = createChichiCamera(camera, head);
  follow.setEnabled(true, look);
  for (let i = 0; i < 240; i++) {
    carrier.position.set(i * 0.3, Math.sin(i * 0.03) * 18, -i * 0.2);
    carrier.rotation.set(0, i * 0.03, Math.sin(i * 0.1) * 0.06);
    head.rotation.x = -0.28 + Math.sin(i * 0.07) * 0.1;
    if (i === 120) {
      camera.aspect = 844 / 390;
      camera.updateProjectionMatrix();
    }
    camera.position.set(20, 20, 20);
    camera.lookAt(look);
    follow.update(1 / 60, look);
    camera.updateMatrixWorld();
    if (i > 45) {
      const point = follow.facePoint(new THREE.Vector3()).project(camera);
      assert.ok(Math.hypot(point.x, point.y) < 1e-6);
      assert.ok(point.z > 0 && point.z < 1);
      assert.ok(
        camera.position.distanceTo(follow.facePoint(new THREE.Vector3())) > 2,
      );
    }
  }
  follow.setEnabled(false, look);
  for (let i = 0; i < 45; i++) {
    camera.position.set(20, 20, 20);
    camera.lookAt(look);
    follow.update(1 / 60, look);
  }
  assert.equal(follow.enabled, false);
  assert.ok(camera.position.distanceTo(new THREE.Vector3(20, 20, 20)) < 1e-8);
});
test("reduced-motion portrait mode is immediate, bounds zoom and never alters cat animation or geometry", () => {
  const camera = new THREE.PerspectiveCamera(40, 0.55, 0.5, 1200),
    head = new THREE.Group(),
    look = new THREE.Vector3();
  camera.position.set(0, 4, 10);
  const c = createChichiCamera(camera, head, { reduced: true });
  c.setEnabled(true, look);
  c.zoom(-100);
  c.update(0, look);
  const near = camera.position.length();
  c.zoom(100);
  c.update(0, look);
  assert.ok(camera.position.length() > near);
  assert.ok(camera.position.length() < 7);
  assert.equal(c.enabled, true);
});
test("a selected island preempts background construction at the next slice and paused work resumes without loss", async () => {
  let priority = "beach",
    turn = 0;
  const order = [];
  function* build(id) {
    for (let i = 0; i < 4; i++) {
      order.push(id + i);
      yield;
    }
    return id + " complete";
  }
  const scheduler = createSceneScheduler({
    budget: 0,
    getPriority: () => priority,
    yieldTask: async () => {
      if (++turn === 2) priority = "summer";
    },
  });
  const a = prepareSceneSteps(build("beach"), { scheduler, priority: "beach" }),
    b = prepareSceneSteps(build("summer"), { scheduler, priority: "summer" });
  assert.deepEqual(await Promise.all([a, b]), [
    "beach complete",
    "summer complete",
  ]);
  assert.equal(order[0], "beach0");
  assert.deepEqual(order.slice(1, 5), [
    "summer0",
    "summer1",
    "summer2",
    "summer3",
  ]);
  assert.deepEqual(order.slice(5), ["beach1", "beach2", "beach3"]);
});
test("failed and cancelled scheduled builds close their generators without blocking another island", async () => {
  let closed = false;
  const control = new AbortController(),
    scheduler = createSceneScheduler({ budget: 0, yieldTask: async () => {} });
  function* failed() {
    try {
      yield;
      control.abort();
      yield;
    } finally {
      closed = true;
    }
  }
  const a = assert.rejects(
    scheduler.prepare(failed(), { signal: control.signal }),
    { name: "AbortError" },
  );
  const b = scheduler.prepare(
    (function* () {
      yield;
      return "ready";
    })(),
    {},
  );
  await a;
  assert.equal(await b, "ready");
  assert.equal(closed, true);
});
test("persistent sculpt buffers round-trip with identical hero skin, fur, triangles and rig poses; corrupt caches fall back", () => {
  const before = createCat("happy"),
    expected = attributes(before),
    snapshot = structuredClone(kittenCacheSnapshot());
  assert.equal(installKittenCache(snapshot), true);
  const after = createCat("happy");
  assert.deepEqual(attributes(after), expected);
  animateCat(before, 1, true);
  animateCat(after, 1, true);
  assert.deepEqual(
    before.userData.head.rotation.toArray(),
    after.userData.head.rotation.toArray(),
  );
  const bad = structuredClone(snapshot);
  bad.surfaces[0][1].attributes.position.array[0] = NaN;
  assert.equal(installKittenCache(bad), false);
  const restored = createCat("happy");
  assert.deepEqual(attributes(restored), expected);
  disposeCat(before);
  disposeCat(after);
  disposeCat(restored);
});
test("cached default scenery remains independent between worlds and reacts to changed placements", () => {
  const first = initialScenery(),
    expected = structuredClone(first);
  first[0].x += 10;
  assert.deepEqual(initialScenery(), expected);
  const yard = expected.find((p) => p.biome === "moon" && !p.stored),
    p = [
      {
        id: "new",
        item: "yarn",
        biome: "moon",
        x: yard.x,
        z: yard.z,
        rotation: 0,
      },
    ];
  const changed = initialScenery(p);
  assert.notDeepEqual(changed, expected);
  assert.deepEqual(initialScenery(), expected);
});
