import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  createSquishTestScene,
  SQUISH_TEST_STATES,
} from "../public/squish-test-scene.js";

const doc = {
  createElement() {
    return { style: {}, dataset: {}, append() {}, remove() {} };
  },
};
test("developer bench keeps five real cat-head materials, deterministic states, original native rig and exact reset", () => {
  const parent = new T.Group();
  parent.position.set(3000, -450, 1200);
  const bench = createSquishTestScene({
    parent,
    container: { ownerDocument: doc, append() {} },
    environment: null,
    onCamera() {},
  });
  assert.equal(bench.toys.length, 5);
  const source =
    bench.actor.userData.body.geometry.attributes.position.array.slice();
  try {
    for (const material of Object.keys(SQUISH_TEST_STATES)) {
      assert(bench.select(material));
      const toy = bench.toys.find((t) => t.userData.material === material),
        u = toy.userData;
      assert(u.meshes.length >= 4, material + " keeps cat ears and face");
      assert(
        u.solver.size[1] > 4,
        "foam bench uses cat-head shape without deleting existing pad",
      );
      bench.advanceFixed(120);
      const d = bench.diagnostics;
      assert.equal(d.steps, 120);
      assert(Math.abs(d.time - 2) < 1e-10);
      assert(
        u.solver.diagnostics().maxDeformation > 0.005,
        material + " real contact-driven deformation",
      );
      assert(u.solver.position.every(Number.isFinite));
      assert(u.solver.diagnostics().minTetRatio > 0);
      if (material === "slime") {
        bench.advanceFixed(162);
        assert.equal(
          u.filaments.diagnostics.tears,
          0,
          "continuous stretch to twist does not arbitrarily tear the grip",
        );
        assert(Math.abs(u.solver.contacts.get("test-grip").twist) > 0.5);
        assert(u.filaments.diagnostics.active > 0);
      }
      assert.deepEqual(
        bench.actor.userData.body.geometry.attributes.position.array,
        source,
      );
      bench.reset();
      assert.equal(bench.diagnostics.steps, 0);
      assert.equal(u.solver.contacts.size, 0);
      assert.deepEqual(
        u.meshes[0].geometry.attributes.position.array,
        u.sources[0],
      );
    }
  } finally {
    bench.dispose();
  }
  assert.equal(parent.children.length, 0);
});
