import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createSquishToy } from "../public/squish-model.js";
import { SlimeFilament } from "../public/squish-slime.js";
const tick = (toy, n) => {
  for (let i = 0; i < n; i++) {
    toy.userData.solver.step(1 / 60);
    toy.userData.update(1 / 60);
  }
};
test("actual butter rind accumulates local cracks and sheds bounded physical fragments above a separate core", () => {
  const toy = createSquishToy({ material: "butter" }),
    s = toy.userData.solver;
  assert(toy.children.some((m) => m.name.includes("exposed core")));
  s.setContact("paw", {
    point: [0, 2.6, 1.9],
    displacement: [0, -0.1, -0.65],
    radius: 0.95,
    force: 80,
  });
  tick(toy, 60);
  assert(toy.userData.butter.diagnostics.crackedVertices > 0);
  assert.equal(toy.userData.butter.diagnostics.detached, 0);
  s.setContact("paw", {
    point: [0, 2.6, 1.9],
    displacement: [0, -0.2, -1],
    radius: 0.95,
    force: 160,
  });
  tick(toy, 180);
  assert(toy.userData.butter.diagnostics.detached > 0);
  const pool = toy.children.find((m) => m.isInstancedMesh);
  assert(pool && pool.instanceMatrix.count === 24);
  s.release("paw");
  tick(toy, 240);
  assert.equal(toy.userData.butter.diagnostics.activeFragments, 0);
  const matrix = new T.Matrix4();
  for (let i = 0; i < pool.count; i++) {
    pool.getMatrixAt(i, matrix);
    assert(matrix.elements.every(Number.isFinite));
    assert(matrix.elements[13] >= 0.024);
  }
  toy.userData.reset();
  assert.equal(toy.userData.butter.diagnostics.detached, 0);
  const core = toy.userData.meshes[0].geometry.attributes.position.array,
    original = toy.userData.sources[0];
  assert.deepEqual(
    core,
    original,
    "reset updates the actual renderer even though the solver now sleeps",
  );
  toy.userData.dispose();
});
test("XPBD filament sags under gravity, thins by volume and pins both physical endpoints", () => {
  const f = new SlimeFilament(),
    a = new T.Vector3(),
    b = new T.Vector3(0.4, 0.5, 0);
  f.reset(a, b);
  const initialVolume = f.radius ** 2 * f.restLength;
  for (let i = 0; i < 120; i++) {
    b.x = 0.4 + (i / 120) * 1.4;
    f.step(1 / 60, a, b);
  }
  assert(f.radius < 0.045);
  assert(Math.abs(f.radius ** 2 * a.distanceTo(b) - initialVolume) < 1e-7);
  assert(f.position[13] < 0.25, "middle sags below the straight segment");
  assert.deepEqual(Array.from(f.position.slice(0, 3)), a.toArray());
  assert.deepEqual(Array.from(f.position.slice(-3)), b.toArray());
  assert(f.position.every(Number.isFinite));
});
test("real slime grip produces pooled strands and tears instead of permanently adhering", () => {
  const toy = createSquishToy({ material: "slime" }),
    s = toy.userData.solver;
  s.setContact("hand", {
    kind: "stretch",
    point: [0, 2.8, 1],
    displacement: [0.6, 0.5, 0.3],
    force: 90,
  });
  tick(toy, 20);
  assert(toy.userData.filaments.diagnostics.active > 0);
  s.setContact("hand", {
    kind: "stretch",
    point: [0, 2.8, 1],
    displacement: [3.4, 0, 0],
    force: 90,
  });
  tick(toy, 40);
  assert(s.contacts.get("hand").torn);
  assert(toy.userData.filaments.diagnostics.tears > 0);
  assert.equal(s.diagnostics().faults, 0);
  s.release("hand");
  tick(toy, 120);
  assert.equal(toy.userData.filaments.diagnostics.active, 0);
  toy.userData.dispose();
});
test("two actual implicit slime surfaces coalesce and separate with approximately conserved occupied volume", () => {
  const toy = createSquishToy({ material: "slime" }),
    m = toy.userData.coalescence;
  assert.equal(m.diagnostics.components, 2);
  m.merge();
  tick(toy, 240);
  const merged = m.diagnostics;
  assert.equal(merged.phase, "merged");
  assert.equal(merged.components, 1);
  assert(Math.abs(merged.volumeProxyRatio - 1) < 0.1);
  assert(merged.vertices > 0);
  m.split();
  tick(toy, 240);
  assert.equal(m.diagnostics.components, 2);
  assert(Math.abs(m.diagnostics.volumeProxyRatio - 1) < 0.1);
  toy.userData.dispose();
});

test("actual filament triangles have outward winding and continuous radial frames", () => {
  const toy = createSquishToy({ material: "slime" }),
    s = toy.userData.solver;
  s.setContact("grip", {
    kind: "stretch",
    point: [0, 2.8, 1],
    displacement: [0.7, 0.5, 0.3],
    force: 90,
  });
  tick(toy, 20);
  const mesh = toy.children.find((m) => m.name === "Slime physical filament 0"),
    g = mesh.geometry,
    p = g.attributes.position,
    n = g.attributes.normal,
    index = g.index.array,
    a = new T.Vector3(),
    b = new T.Vector3(),
    c = new T.Vector3(),
    normal = new T.Vector3();
  let good = 0;
  for (let i = 0; i < index.length; i += 3) {
    a.fromBufferAttribute(p, index[i]);
    b.fromBufferAttribute(p, index[i + 1]).sub(a);
    c.fromBufferAttribute(p, index[i + 2]).sub(a);
    normal.fromBufferAttribute(n, index[i]);
    if (b.cross(c).dot(normal) > 0) good++;
  }
  assert(
    (good / index.length) * 3 > 0.9,
    "tube surfaces face outward rather than showing dark inside-out fans",
  );
  toy.userData.dispose();
});
