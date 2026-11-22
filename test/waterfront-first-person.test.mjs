import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createWaterfrontFirstPerson } from "../public/waterfront-first-person.js";
import { createCat, animateCat } from "../public/cat-model.js";
function scene(cat = null) {
  const actor = new T.Group();
  actor.position.set(680, 1.312, 508);
  cat ??= new T.Group();
  if (!cat.userData.eyes) {
    const head = new T.Group(),
      eyes = [new T.Object3D(), new T.Object3D()];
    eyes[0].position.set(-0.24, 1.3, 0.6);
    eyes[1].position.set(0.24, 1.3, 0.6);
    head.add(...eyes);
    cat.add(head);
    cat.userData = { head, eyes };
  }
  actor.add(cat);
  const camera = new T.PerspectiveCamera(),
    look = new T.Vector3(),
    mount = createWaterfrontFirstPerson({
      getCat: () => cat,
      getActor: () => actor,
      camera,
      look,
    });
  return { actor, cat, camera, look, mount };
}
test("first-person mount follows the actual native eyes through high flight with a level horizon", () => {
  const s = scene();
  s.mount.update(1 / 60, { yaw: 0, pitch: 0.18 });
  const y = s.camera.position.y;
  assert.equal(s.camera.fov, 70);
  assert.equal(s.camera.near, 0.045);
  s.actor.position.y += 46;
  s.mount.update(0.1, { yaw: 0, pitch: 0.18 });
  assert.ok(
    Math.abs(s.camera.position.y - y - 46) < 1e-8,
    "no chase-camera lag inside the body",
  );
  assert.deepEqual(s.camera.up.toArray(), [0, 1, 0]);
  assert.ok(
    s.look
      .clone()
      .sub(s.camera.position)
      .normalize()
      .dot(new T.Vector3(0, 0, 1)) > 0.9999,
  );
  s.mount.update(0.1, { yaw: Math.PI / 2, pitch: 1.3 });
  assert.ok(s.look.y < s.camera.position.y - 30);
  s.mount.reset();
  assert.equal(s.mount.active, false);
});
test("native approved Chichi retains all meshes and anatomy, with an unobstructed forward eye camera", () => {
  const cat = createCat("happy"),
    s = scene(cat);
  animateCat(cat, 7, false, false);
  const before = [];
  cat.traverse((o) =>
    before.push({
      o,
      geometry: o.geometry,
      visible: o.visible,
      scale: o.scale.clone(),
    }),
  );
  s.mount.update(1 / 60, { yaw: 0, pitch: 0.18 });
  cat.traverse((o) => {
    if (o.isSkinnedMesh) o.skeleton?.update();
  });
  const direction = s.look.clone().sub(s.camera.position).normalize(),
    ray = new T.Raycaster(s.camera.position, direction, 0.045, 3),
    hits = ray.intersectObject(cat, true);
  assert.ok(
    !hits.some((h) => h.distance < 0.12),
    "no cornea/forehead blocks the forward view",
  );
  for (const b of before) {
    assert.equal(b.o.geometry, b.geometry);
    assert.equal(b.o.visible, b.visible);
    assert.deepEqual(b.o.scale, b.scale);
  }
  assert.ok(s.camera.position.y > 1.3);
});
