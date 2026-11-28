import test from "node:test";
import assert from "node:assert/strict";
import { SquishSoftBody } from "../public/squish-soft-body.js";
import { createSquishToy } from "../public/squish-model.js";
import { measureSquish } from "../public/squish-diagnostics.js";

test("sub-cell paw influence is applied once, without losing remote locality or positive volume", () => {
  const s = new SquishSoftBody({
    material: "cloud",
    size: [5, 4.4, 4.5],
    resolution: [7, 7, 7],
  });
  s.setContact("paw", {
    point: [-0.5, 3.3, 0],
    displacement: [0, -0.45, 0],
    radius: 0.65,
    force: 42,
  });
  for (let i = 0; i < 90; i++) s.step(1 / 60);
  const depth = 3.265 - s.sample(-0.5, 3.265, 0)[1];
  assert(
    depth > 0.2 && depth < 0.45,
    "effective paw pressure, not the old 0.06m double attenuation: " + depth,
  );
  const distant = s.sample(2.2, 3.265, 0);
  assert(Math.abs(distant[1] - 3.265) < 0.06);
  const d = s.diagnostics();
  assert(d.minTetRatio > 0 && d.faults === 0 && d.limitedSteps === 0);
});

test("contact diagnostics measure the real mutable mesh/support and preserve coordinate spaces", () => {
  const toy = createSquishToy({ material: "cloud" }),
    u = toy.userData;
  toy.position.set(3000, -450, 1200);
  toy.rotation.y = 0.7;
  u.solver.setContact("paw", {
    point: [-0.5, 3.3, 0],
    normal: [0, 1, 0],
    displacement: [0, -0.45, 0],
    radius: 0.65,
    force: 42,
    duration: 1.5,
    supportShare: 0.5,
  });
  for (let i = 0; i < 90; i++) {
    u.solver.step(1 / 60);
    u.update(1 / 60);
  }
  const d = measureSquish(toy);
  assert(d.maxVertexDisplacement > 0.2);
  assert(d.maxContactDepth > 0.15);
  assert.equal(d.contacts.length, 1);
  assert.equal(d.contacts[0].supportShare, 0.5);
  assert.equal(d.contacts[0].duration, 1.5);
  assert(d.contacts[0].point[0] > 2990 && d.contacts[0].point[1] < -440);
  assert(Math.abs(Math.hypot(...d.contacts[0].normal) - 1) < 1e-6);
  assert.equal(d.colliderGeometry, u.meshes[0].geometry.uuid);
  u.reset();
  assert(measureSquish(toy).maxVertexDisplacement < 1e-6);
  u.dispose();
});
