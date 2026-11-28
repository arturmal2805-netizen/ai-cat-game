import test from "node:test";
import assert from "node:assert/strict";
import { createSquishToy } from "../public/squish-model.js";

test("nested promotion preserves solver/contact identity, deformed shape, plasticity and clock", () => {
  const toy = createSquishToy({ material: "jelly" }),
    u = toy.userData,
    s = u.solver;
  u.preparePhysics({ distance: 300, visible: true });
  assert.deepEqual(s.resolution, [4, 4, 4]);
  assert.equal(u.physicsLOD.level, "STATIC");
  for (let i = 0; i < s.count; i++) {
    const j = i * 3;
    const depth = 0.12 * (s.original[j + 1] / s.size[1]);
    s.position[j + 1] -= depth;
    s.rest[j + 1] -= depth * 0.3;
    s.velocity[j] = 0.02;
    s.damage[i] = 0.04;
  }
  s.time = 4.25;
  s.steps = 255;
  const points = Array.from({ length: 31 }, (_, i) => [
    -2.3 + i * 0.15,
    0.31 + (i % 7) * 0.5,
    -1.8 + (i % 9) * 0.4,
  ]);
  const previous = points.map((p) => s.sample(...p, new Float64Array(3)));
  const contacts = s.contacts;
  s.setContact("paw", { point: [0, 3.3, 0], force: 35 });
  assert.equal(u.solver, s);
  assert.equal(s.contacts, contacts);
  assert.equal(s.contacts.size, 1);
  assert.deepEqual(s.resolution, [7, 7, 7]);
  assert.equal(u.physicsLOD.level, "HERO");
  assert.equal(s.time, 4.25);
  assert.equal(s.steps, 255);
  assert(s.damage.every((v) => Math.abs(v - 0.04) < 1e-6));
  for (let i = 0; i < points.length; i++) {
    const p = s.sample(...points[i], new Float64Array(3));
    assert(
      Math.hypot(...p.map((v, k) => v - previous[i][k])) < 1e-8,
      "no visible field pop",
    );
  }
  u.dispose();
});

test("damaged or recovering soft bodies are never replaced by an idle lower LOD", () => {
  const toy = createSquishToy({ material: "butter" }),
    u = toy.userData,
    s = u.solver;
  s.damage[4] = 0.6;
  s.sleeping = true;
  u.preparePhysics({ distance: 400, visible: false });
  assert.deepEqual(s.resolution, [7, 7, 7]);
  assert.equal(s.damage[4], Math.fround(0.6));
  s.sleeping = false;
  s.position[31] += 0.1;
  u.preparePhysics({ distance: 400, visible: false });
  assert.deepEqual(s.resolution, [7, 7, 7]);
  assert.equal(u.physicsLOD.level, "ACTIVE");
  u.dispose();
});

test("full cloud groom buffers stay immutable while cage data updates and idle upload stops", () => {
  const toy = createSquishToy({ material: "cloud" }),
    u = toy.userData,
    s = u.solver;
  const hair = u.meshes.find((m) => m.userData.squishGpuCage),
    g = u.gpuBindings[0];
  const positions = hair.geometry.attributes.position.array.slice();
  const normals = hair.geometry.attributes.normal.array.slice();
  const version = hair.geometry.attributes.position.version;
  s.setContact("paw", {
    point: [0, 3.3, 0],
    force: 50,
    displacement: [0, -0.5, 0],
    radius: 0.8,
  });
  for (let i = 0; i < 60; i++) {
    s.step(1 / 60);
    u.update(1 / 60);
  }
  assert.deepEqual(hair.geometry.attributes.position.array, positions);
  assert.deepEqual(hair.geometry.attributes.normal.array, normals);
  assert.equal(hair.geometry.attributes.position.version, version);
  assert(g.diagnostics.uploads > 1);
  const uploads = g.diagnostics.uploads;
  u.update(0);
  assert.equal(g.diagnostics.uploads, uploads);
  assert(
    !u.pickMeshes.includes(hair),
    "picking uses the actual CPU solid surface, not undeformed shader input",
  );
  u.dispose();
});
