import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createSquishNavigation } from "../public/squish-navigation.js";
import { createSquishManual } from "../public/squish-manual.js";
import { createSquishToy } from "../public/squish-model.js";
function setup() {
  const interior = new T.Group(),
    toy = createSquishToy();
  toy.position.y = 0.35;
  interior.add(toy);
  interior.userData = { toys: [toy] };
  const actor = { position: new T.Vector3(0, 0, 4.8), yaw: Math.PI },
    nav = createSquishNavigation({
      getInterior: () => interior,
      floor: 0,
      inside: (p) => Math.abs(p.x) < 20 && Math.abs(p.z) < 20,
    }),
    manual = createSquishManual({
      getActor: () => actor,
      getNavigation: () => nav,
      isActive: () => true,
      getRadius: () => 0.3,
      floor: 0,
    });
  return { toy, actor, nav, manual };
}
test("floor walking cannot pass through the body; manual jump lands on actual toy skin", () => {
  const { toy, actor, nav, manual } = setup();
  const blocked = nav.support({ x: 0, y: 0, z: 0 }, 0.3);
  assert(
    blocked === null || blocked.y > 2,
    "not an invisible floor through the toy",
  );
  manual.transport({ forward: 1, side: 0, heading: Math.PI, jump: true });
  let max = 0,
    landed = false;
  for (let i = 0; i < 150; i++) {
    manual.update(1 / 60);
    const f = manual.frame;
    actor.position.copy(f.position);
    max = Math.max(max, f.position.y);
    if (i === 45)
      manual.transport({ forward: 0, side: 0, heading: Math.PI, jump: false });
    if (i > 60 && !manual.airborne && f.squish) {
      landed = true;
      assert(
        Math.abs(
          f.position.y - toy.userData.surface(f.position.x, f.position.z),
        ) < 0.02,
      );
      break;
    }
  }
  assert(max > 3);
  assert(landed, "real jump reaches a supported soft surface");
  toy.userData.dispose();
});
test("manual release while airborne keeps ownership until a gravity-based landing on a clear floor", () => {
  const { toy, actor, manual } = setup();
  manual.transport({ forward: 1, side: 0, heading: Math.PI, jump: true });
  let released = false;
  for (let i = 0; i < 600; i++) {
    manual.update(1 / 60);
    const f = manual.frame;
    actor.position.copy(f.position);
    if (i === 40) {
      assert(manual.airborne);
      assert.equal(manual.requestRelease(), false);
    }
    if (manual.safeToRelease) {
      released = true;
      assert(Math.abs(f.position.y) < 0.1);
      assert.equal(f.squish, null);
      break;
    }
  }
  assert(released);
  toy.userData.dispose();
});

test("manual camera cannot cut through the actual soft skin", () => {
  const { toy, nav } = setup();
  assert.equal(
    nav.cameraClear(new T.Vector3(0, 2, 5), new T.Vector3(0, 2, -5)),
    false,
  );
  assert.equal(
    nav.cameraClear(new T.Vector3(0, 8, 5), new T.Vector3(0, 8, -5)),
    true,
  );
  toy.userData.dispose();
});

test("actual deep-water Warehouse floor is walkable when no toy is underneath", () => {
  const floor = -450.308,
    interior = new T.Group();
  interior.position.set(3060, floor + 0.36, 1240);
  interior.userData = { toys: [] };
  const nav = createSquishNavigation({
      getInterior: () => interior,
      floor,
      inside: () => true,
    }),
    p = { x: 3040, y: floor, z: 1258 };
  assert.equal(
    nav.support(p, 0.6).y,
    floor,
    "do not compare a negative world height with an invented zero-height obstacle",
  );
  const toy = createSquishToy();
  toy.position.set(30, 0, -36);
  interior.add(toy);
  interior.userData.toys.push(toy);
  assert.equal(nav.support(p, 0.6).y, floor);
  assert.equal(nav.support({ x: 3090, y: floor, z: 1204 }, 0.6), null);
  toy.userData.dispose();
});

import { createSoftCameraAdjustment } from "../public/squish-navigation.js";
test("venue camera rises over soft ears instead of zooming into the native cat face", () => {
  const { toy, nav } = setup(),
    p = new T.Vector3(-0.7, toy.userData.surface(-0.7, 1.9), 1.9),
    actor = { position: p };
  const adjust = createSoftCameraAdjustment({
    getActor: () => actor,
    clear: nav.cameraClear,
  });
  const result = adjust({ yaw: 0.2, pitch: 0.2, distance: 6 }),
    anchor = p.clone();
  anchor.y += 1.1;
  const eye = new T.Vector3(
    -Math.sin(0.2) * Math.cos(result.pitch),
    Math.sin(result.pitch),
    -Math.cos(0.2) * Math.cos(result.pitch),
  )
    .multiplyScalar(6)
    .add(anchor);
  assert(nav.cameraClear(anchor, eye));
  assert.equal(result.distance, 6);
  assert(result.pitch >= 0.2 && result.pitch <= 0.8);
  toy.userData.dispose();
});

import { createWarehouseThirdPersonCamera } from "../public/squish-manual-camera.js";
test("scoped third-person adapter retains a full cat view above real ears", () => {
  const { toy, nav } = setup(),
    actor = {
      position: new T.Vector3(-0.7, toy.userData.surface(-0.7, 1.9), 1.9),
    },
    camera = new T.PerspectiveCamera(60, 1, 0.12, 100),
    look = new T.Vector3(),
    canvas = { addEventListener() {}, removeEventListener() {} };
  const adapter = createWarehouseThirdPersonCamera({
    canvas,
    camera,
    look,
    getActor: () => actor,
    isActive: () => true,
    clear: nav.cameraClear,
  });
  adapter.update(1 / 60, { yaw: 0.2, pitch: 0.2 });
  assert(camera.position.distanceTo(actor.position) > 3);
  adapter.dispose();
  toy.userData.dispose();
});
