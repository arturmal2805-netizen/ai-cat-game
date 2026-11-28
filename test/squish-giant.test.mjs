import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createSquishToy } from "../public/squish-model.js";
import { giantRestHeight } from "../public/squish-giant.js";
test("giant has body, head, four soft paws and tail with real surface support", () => {
  const t = createSquishToy({ material: "giant" }),
    d = t.userData;
  const centre = d.surface(0, 0),
    paw = d.surface(4.2, 6),
    side = d.surface(6.7, 0);
  assert(centre > 4 && centre < 7);
  assert(paw > 1 && paw < 3);
  assert.equal(side, null);
  assert(Math.abs(centre - giantRestHeight([14, 9, 14], 0, 0)) < 0.04);
  assert(d.surface(-4.2, -4.76) > 1, "rear paw is a supported soft volume");
  d.dispose();
});
test("eight independent giant contacts preserve positive volumes and leave distant skin quiet", () => {
  const t = createSquishToy({ material: "giant" }),
    s = t.userData.solver;
  const sample = s.sample(-6, 2, -5).slice();
  for (let i = 0; i < 8; i++) {
    const x = ((i % 4) - 1.5) * 1.5,
      z = Math.floor(i / 4) * 2 - 1;
    s.setContact("paw" + i, {
      kind: "paw",
      point: [x, giantRestHeight(s.size, x, z), z],
      displacement: [i % 2 ? 0.12 : -0.12, -0.6, 0],
      radius: 0.9,
      force: 30,
    });
  }
  for (let i = 0; i < 90; i++) s.step(1 / 60);
  t.userData.update(1 / 60);
  const d = s.diagnostics();
  assert.equal(d.contacts, 8);
  assert.equal(d.faults, 0);
  assert(d.minTetRatio > 0);
  assert(d.maxDeformation > 0.08);
  const far = s.sample(-6, 2, -5);
  assert(Math.hypot(...far.map((v, i) => v - sample[i])) < 0.05);
  assert(
    t.userData.meshes.every((m) =>
      m.geometry.attributes.position.array.every(Number.isFinite),
    ),
  );
  t.userData.reset();
  assert.equal(s.contacts.size, 0);
  t.userData.dispose();
});
