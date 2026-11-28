import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createSquishToy } from "../public/squish-model.js";
import { SquishSoftBody } from "../public/squish-soft-body.js";

test("angular contact twists opposite parts of the local volume in opposite directions", () => {
  const s = new SquishSoftBody({ material: "jelly" });
  s.setContact("twist", {
    point: [0, 3, 0],
    normal: [0, 1, 0],
    displacement: [0, -0.12, 0],
    radius: 1.4,
    force: 100,
    twist: 0.8,
  });
  for (let i = 0; i < 60; i++) s.step(1 / 60);
  const left = s.sample(-0.7, 3, 0, new Float64Array(3)),
    right = s.sample(0.7, 3, 0, new Float64Array(3));
  assert(Math.abs(left[2]) > 0.03 && Math.abs(right[2]) > 0.03);
  assert(
    left[2] * right[2] < 0,
    "torsion deforms space, not a common translation",
  );
  assert(s.diagnostics().minTetRatio > 0);
  assert.equal(s.diagnostics().faults, 0);
  assert.equal(
    s.setContact("bad", { point: [0, 3, 0], normal: [0, 0, 0], twist: 1 }),
    false,
  );
});

test("deformed rotated mesh picking resolves the original rest anchor instead of grabbing air", () => {
  const toy = createSquishToy({ material: "slime" }),
    u = toy.userData;
  toy.rotation.y = 0.45;
  toy.position.set(3000, -450, 1200);
  u.solver.setContact("press", {
    point: [0, 2.6, 1.9],
    displacement: [0.4, -0.4, 0],
    radius: 1.1,
    force: 100,
  });
  for (let i = 0; i < 45; i++) {
    u.solver.step(1 / 60);
    u.update(1 / 60);
  }
  const p = u.meshes[0].geometry.attributes.position,
    base = u.sources[0];
  let vertex = 0,
    best = -Infinity;
  for (let i = 0; i < p.count; i++)
    if (
      base[i * 3 + 1] > 1.6 &&
      base[i * 3 + 1] < 2.5 &&
      base[i * 3 + 2] > best
    ) {
      best = base[i * 3 + 2];
      vertex = i;
    }
  const original = new T.Vector3(...base.slice(vertex * 3, vertex * 3 + 3));
  const current = new T.Vector3().fromBufferAttribute(p, vertex);
  assert(original.distanceTo(current) > 0.05);
  toy.updateWorldMatrix(true, true);
  const point = toy.localToWorld(current.clone()),
    direction = new T.Vector3(0, 0, -1).transformDirection(toy.matrixWorld);
  const ray = new T.Raycaster(
    point.clone().addScaledVector(direction, -6),
    direction,
  );
  const hit = ray.intersectObject(u.meshes[0], false)[0];
  assert(hit);
  const rest = u.restPoint(hit);
  assert(
    rest.distanceTo(original) < 0.0002,
    "rest anchor follows original triangle barycentrics",
  );
  u.dispose();
});
