import test from "node:test";
import assert from "node:assert/strict";
import { FoamImprints } from "../public/squish-foam.js";
const contact = (x = 0, z = 0) => ({
  point: [x, 1.4, z],
  normal: [0, 1, 0],
  displacement: [0, -0.7, 0],
  force: 100,
  radius: 1,
  kind: "press",
});
test("palm and four toes form separate actual topographic pads with held memory", () => {
  const f = new FoamImprints([5, 1.4, 4.5]),
    c = new Map([["a", contact()]]);
  for (let i = 0; i < 90; i++) f.step(1 / 60, c);
  assert(f.sample(0, -0.15) > 0.1);
  assert(f.sample(-0.36, 0.17) > 0.05);
  assert(f.sample(0, 0.5) < 0.02);
  assert.equal(f.sample(2.5, 0), 0);
  const loaded = f.sample(0, -0.15);
  c.clear();
  for (let i = 0; i < 100; i++) f.step(1 / 60, c);
  assert(f.sample(0, -0.15) > loaded * 0.98);
  for (let i = 0; i < 1200; i++) f.step(1 / 60, c);
  assert(f.sample(0, -0.15) < loaded * 0.03);
  f.reset();
  assert.equal(f.sample(0, 0), 0);
});
test("separate pads retain independent imprints and bound stalled frames", () => {
  const f = new FoamImprints([5, 1.4, 4.5]),
    c = new Map([
      ["a", contact(-1, 0)],
      ["b", contact(1, 0)],
    ]);
  for (let i = 0; i < 90; i++) f.step(1 / 60, c);
  assert(f.sample(-1, -0.15) > 0.1 && f.sample(1, -0.15) > 0.1);
  assert(f.sample(0, 0) < 0.001);
  const n = f.steps;
  f.step(10, c);
  assert(f.steps - n <= 6);
  assert(f.depth.every(Number.isFinite));
});

import * as T from "three";
import { createSquishToy } from "../public/squish-model.js";
test("crunchy fillers shift under local load, sleep without uploads and reset exactly", () => {
  const toy = createSquishToy({ material: "crunchy" }),
    s = toy.userData.solver,
    f = toy.userData.crunchy;
  const initial = f.positions.slice(),
    uploads = f.diagnostics.uploads;
  for (let i = 0; i < 10; i++) toy.userData.update(1 / 60);
  assert.equal(f.diagnostics.uploads, uploads, "no idle instance uploads");
  s.setContact("paw", {
    point: [0.2, 2.6, 0],
    displacement: [0.1, -0.8, 0],
    radius: 1.4,
    force: 100,
  });
  for (let i = 0; i < 80; i++) {
    s.step(1 / 60);
    toy.userData.update(1 / 60);
  }
  assert(f.positions.some((v, i) => Math.abs(v - initial[i]) > 0.02));
  assert(f.diagnostics.finite);
  assert.equal(f.mesh.count, 96);
  toy.userData.reset();
  assert.deepEqual(f.positions, initial);
  toy.userData.dispose();
});
test("foam imprint changes actual CPU picked mesh and reset restores it", () => {
  const toy = createSquishToy({ material: "foam" }),
    s = toy.userData.solver;
  s.setContact("paw", contact());
  for (let i = 0; i < 70; i++) {
    s.step(1 / 60);
    toy.userData.update(1 / 60);
  }
  assert(toy.userData.foam.diagnostics.deepest > 0.15);
  assert.equal(
    s.diagnostics().limitedSteps,
    0,
    "mounted foam no longer repeatedly hits the inversion barrier",
  );
  const pos = toy.userData.meshes[0].geometry.attributes.position;
  assert(pos.array.every(Number.isFinite));
  assert(toy.userData.surface(0, -0.15) < 1.35);
  toy.userData.reset();
  assert.equal(toy.userData.foam.diagnostics.deepest, 0);
  assert.deepEqual(pos.array, toy.userData.sources[0]);
  toy.userData.dispose();
});
