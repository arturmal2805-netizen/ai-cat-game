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

test("V22 temporal bench uses persistent native static paws and leaves loaded shape independent of age scripts", () => {
  const parent = new T.Group();
  parent.position.set(3000, -450, 1200);
  const bench = createSquishTestScene({
    parent,
    container: { ownerDocument: doc, append() {} },
    environment: null,
    onCamera() {},
  });
  try {
    assert(bench.startTemporal("foam"));
    const toy = bench.toys.find((t) => t.userData.material === "foam"),
      s = toy.userData.solver;
    assert.equal(s.steps, 0);
    assert.equal(s.contacts.size, 4);
    const buffers =
      bench.actor.userData.body.geometry.attributes.position.array.slice();
    assert.equal(s.diagnostics().staticLoad, 8.5 * 9.81);
    bench.advanceFixed(120);
    const early = bench.diagnostics.materials.find(
      (m) => m.material === "foam",
    );
    bench.advanceFixed(240);
    const later = bench.diagnostics.materials.find(
      (m) => m.material === "foam",
    );
    assert.equal(bench.diagnostics.steps, 360);
    assert(
      later.maxContactDepth > early.maxContactDepth + 0.03,
      "actual native sustained-load creep",
    );
    assert(bench.diagnostics.nativePaws.every((p) => Math.abs(p.error) < 0.03));
    assert.equal(
      s.impactEvents,
      0,
      "static test never manufactures a landing velocity",
    );
    assert.deepEqual(
      bench.actor.userData.body.geometry.attributes.position.array,
      buffers,
    );
    assert(bench.releaseTemporal());
    bench.advanceFixed(120);
    assert.equal(s.contacts.size, 0);
    assert(s.diagnostics().minTetRatio > 0);
    assert.equal(bench.diagnostics.temporal.loading, false);
    bench.reset();
    assert.equal(bench.diagnostics.temporal, null);
  } finally {
    bench.dispose();
  }
});

test("temporal release refreshes native attached skin bindings before CPU queries and lands on the actual floor", () => {
  const parent = new T.Group();
  parent.position.set(3060, -449.948, 1240);
  const bench = createSquishTestScene({
    parent,
    container: { ownerDocument: doc, append() {} },
    environment: null,
    onCamera() {},
  });
  const vertex = new T.Vector3();
  const nativeMinimum = () => {
    let minimum = Infinity,
      count = 0;
    // Intentionally no render or manual skin refresh here: the bench must have
    // made all native CPU skinned vertices current when it advanced the pose.
    bench.actor.traverse((mesh) => {
      const position = mesh.geometry?.attributes?.position;
      if (!mesh.isMesh || !position) return;
      for (let i = 0; i < position.count; i++) {
        mesh.getVertexPosition(i, vertex);
        mesh.localToWorld(vertex);
        assert(Number.isFinite(vertex.y));
        minimum = Math.min(minimum, vertex.y);
        count++;
      }
    });
    assert(count > 1000);
    return minimum;
  };
  try {
    bench.startTemporal("jelly");
    bench.advanceFixed(120);
    const loaded = nativeMinimum();
    assert(
      loaded > parent.position.y + 1,
      "native actor starts on elevated actual jelly",
    );
    assert(bench.releaseTemporal());
    bench.advanceFixed(120);
    const d = bench.diagnostics,
      released = nativeMinimum();
    assert(Math.abs(d.floor.localY + 0.372) < 1e-8);
    assert(Math.abs(bench.carrier.position.y + 0.36) < 1e-8);
    assert(
      released >= d.floor.worldY - 0.02,
      "all actual native rendered vertices stay above floor after release: " +
        released +
        " vs " +
        d.floor.worldY,
    );
    assert(
      released < d.floor.worldY + 0.03,
      "actual feet reach authored Warehouse floor",
    );
    const plinth = bench.root.children.find(
      (o) => o.name === "Developer bench · five floor-supported plinths",
    );
    assert(plinth?.isInstancedMesh);
    assert.equal(plinth.count, 5);
    const matrix = new T.Matrix4(),
      centre = new T.Vector3(),
      scale = new T.Vector3();
    for (let i = 0; i < 5; i++) {
      plinth.getMatrixAt(i, matrix);
      centre.setFromMatrixPosition(matrix);
      scale.setFromMatrixScale(matrix);
      const toy = bench.toys[i],
        rest = toy.userData.sources[0];
      let restBottom = Infinity;
      for (let j = 1; j < rest.length; j += 3)
        restBottom = Math.min(restBottom, rest[j]);
      assert(
        Math.abs(centre.y - scale.y * 0.5 - d.floor.localY) < 1e-7,
        "plinth reaches floor",
      );
      assert(
        Math.abs(centre.y + scale.y * 0.5 - restBottom) < 1e-7,
        "plinth supports real rendered rest bottom",
      );
    }
  } finally {
    bench.dispose();
  }
});
