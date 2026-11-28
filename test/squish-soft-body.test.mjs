import test from "node:test";
import assert from "node:assert/strict";
import { SquishSoftBody } from "../public/squish-soft-body.js";
const simulate = (b, n) => {
  for (let i = 0; i < n; i++) b.step(1 / 60);
};
test("local pressure keeps distant silhouette, positive tetrahedra and near-constant jelly volume", () => {
  const b = new SquishSoftBody();
  b.setContact("paw", {
    point: [0, 3, 0],
    displacement: [0, -0.7, 0],
    radius: 0.9,
  });
  simulate(b, 60);
  const near = Array.from(b.sample(0, 3, 0)),
    far = Array.from(b.sample(2.5, 3, 2)),
    d = b.diagnostics();
  assert(3 - near[1] > 0.35);
  assert(Math.abs(far[1] - 3) < 0.05);
  assert(d.volumeRatio > 0.96 && d.volumeRatio < 1.04);
  assert(d.minTetRatio > 0.25);
  b.release("paw");
  simulate(b, 180);
  assert(b.diagnostics().maxDeformation < 0.025);
});
test("four independent contacts and opposing tangential loads do not rotate whole body", () => {
  const b = new SquishSoftBody();
  for (const [i, x, z] of [
    [0, -1, -0.8],
    [1, 1, -0.8],
    [2, -1, 0.8],
    [3, 1, 0.8],
  ])
    b.setContact("paw" + i, {
      point: [x, 3, z],
      displacement: [z * 0.22, -0.35, -x * 0.22],
      radius: 0.6,
    });
  simulate(b, 60);
  assert.equal(b.contacts.size, 4);
  assert(b.sample(-1, 3, -0.8)[0] < -1.01);
  assert(b.sample(1, 3, 0.8)[0] > 1.01);
  for (let i = 0; i < b.count; i++)
    if (!b.inverseMass[i]) assert.equal(b.position[i * 3], b.original[i * 3]);
  assert.equal(b.faults, 0);
  assert(b.diagnostics().minTetRatio > 0);
});
test("fixed time step makes 30/60/120 render cadence equivalent and caps stalls", () => {
  const values = [];
  for (const hz of [30, 60, 120]) {
    const b = new SquishSoftBody();
    b.setContact("paw", { point: [0, 3, 0] });
    for (let i = 0; i < hz; i++) b.step(1 / hz);
    values.push(b.position);
    assert.equal(b.steps, 60);
  }
  for (let j = 1; j < 3; j++)
    for (let i = 0; i < values[0].length; i++)
      assert(Math.abs(values[0][i] - values[j][i]) < 1e-9);
  const b = new SquishSoftBody();
  b.setContact("active", { point: [0, 3, 0] });
  assert.equal(b.step(50), 6);
  assert(b.droppedTime > 49);
  assert.equal(b.step(NaN), 0);
});
test("rapid impacts and eight contacts stay bounded without negative tetrahedra", () => {
  const b = new SquishSoftBody();
  for (let t = 0; t < 240; t++) {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      if (t % 3)
        b.setContact(i, {
          point: [Math.cos(a) * 1.4, 3, Math.sin(a)],
          displacement: [Math.sin(a) * 0.15, -0.45, Math.cos(a) * 0.15],
          radius: 0.45,
          force: 100,
        });
      else b.release(i);
    }
    b.step(1 / 60);
  }
  const d = b.diagnostics();
  assert.equal(d.faults, 0);
  assert(d.minTetRatio > 0);
  assert(d.maxDeformation <= b.profile.maximumDeformation + 0.001);
});
