import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { ADOPTION_CATS, catAppearance } from "../public/cat-breeds.js";
import {
  createCat,
  animateCat,
  reactCat,
  setCatMood,
  disposeCat,
} from "../public/cat-model.js";
import {
  enableCatRenderBatch,
  CAT_PICK_LAYER,
} from "../public/cat-render-batch.js";

test("draw batching leaves Chichi entirely untouched", () => {
  const cat = createCat();
  enableCatRenderBatch(cat);
  assert.equal(cat.userData.renderBatches, undefined);
  cat.traverse((o) => assert.equal(o.layers.mask, 1));
  disposeCat(cat);
});

test("every adoption breed, giant, tiny kitten and magical accessory retains the original rig and bounded draw palettes", () => {
  const expected = new THREE.Vector3(),
    actual = new THREE.Vector3(),
    sample = new THREE.Vector3(),
    matrix = new THREE.Matrix4();
  for (const profile of ADOPTION_CATS) {
    const cat = createCat("happy", catAppearance(profile));
    cat.scale.setScalar(0.63 * (profile.size || 1));
    enableCatRenderBatch(cat);
    const b = cat.userData.renderBatches;
    assert.ok(b, profile.id);
    for (const p of b.palettes) assert.ok(p.entries.length <= 32, profile.id);
    for (const time of [3, 8.5]) {
      animateCat(cat, time, true);
      reactCat(cat, { paw: 0.7, surprise: 0.8 });
      cat.updateMatrixWorld(true);
      b.update();
      for (let j = 0; j < b.batches.length; j++) {
        const g = b.batches[j].geometry,
          p = b.palettes[j];
        let offset = 0;
        for (const source of [...new Set(p.entries.map((e) => e.source))]) {
          const n = source.geometry.attributes.position.count;
          for (let v = 0; v < n; v += Math.max(1, Math.floor(n / 19))) {
            source
              .getVertexPosition(v, expected)
              .applyMatrix4(source.matrixWorld);
            actual.set(0, 0, 0);
            for (let k = 0; k < 4; k++) {
              const weight = g.attributes.aRigWeights.getComponent(
                offset + v,
                k,
              );
              if (!weight) continue;
              matrix.fromArray(
                p.positions.value,
                g.attributes.aRigJoints.getComponent(offset + v, k) * 16,
              );
              actual.addScaledVector(
                sample
                  .fromBufferAttribute(g.attributes.position, offset + v)
                  .applyMatrix4(matrix),
                weight,
              );
            }
            actual.applyMatrix4(cat.matrixWorld);
            assert.ok(
              actual.distanceTo(expected) < 0.00001,
              profile.id + " " + source.name,
            );
          }
          offset += n;
        }
      }
    }
    disposeCat(cat);
  }
});

test("batched neighbours preserve every animated original vertex, skin weight and material through walking, sleep and ride reactions", () => {
  const originalPoint = new THREE.Vector3(),
    actualPoint = new THREE.Vector3(),
    sample = new THREE.Vector3(),
    matrix = new THREE.Matrix4();
  for (const options of [
    { breed: "british", color: 0xaabbcc },
    { breed: "sphynx", color: 0xe1b3ae, build: "plush" },
    { breed: "maine", color: 0xcabcb1, build: "giant" },
  ]) {
    const cat = createCat("happy", options),
      root = new THREE.Group();
    root.add(cat);
    root.position.set(-335, 2, 95);
    root.rotation.set(0.2, 0.8, -0.3);
    cat.scale.setScalar(0.63);
    enableCatRenderBatch(cat);
    const batch = cat.userData.renderBatches;
    assert.ok(batch.batches.length <= 12);
    const originalGeometry = batch.sources.map((s) => [s.geometry, s.material]);
    for (const [mood, time, walking, reaction] of [
      ["happy", 3, true, {}],
      ["sleep", 8, false, {}],
      ["crazy hungry", 12, true, { paw: 0.9, surprise: 1 }],
      ["happy", 15, false, { crouch: 0.7, headPitch: 0.3, grip: 1 }],
    ]) {
      setCatMood(cat, mood, { immediate: true });
      animateCat(cat, time, walking);
      reactCat(cat, reaction);
      root.updateMatrixWorld(true);
      batch.update();
      for (let b = 0; b < batch.batches.length; b++) {
        const mesh = batch.batches[b],
          p = batch.palettes[b],
          g = mesh.geometry,
          joints = g.attributes.aRigJoints,
          weights = g.attributes.aRigWeights;
        let offset = 0;
        for (const source of [...new Set(p.entries.map((e) => e.source))]) {
          for (let i = 0; i < source.geometry.attributes.position.count; i++) {
            source
              .getVertexPosition(i, originalPoint)
              .applyMatrix4(source.matrixWorld);
            actualPoint.set(0, 0, 0);
            for (let k = 0; k < 4; k++) {
              const joint = joints.getComponent(offset + i, k),
                weight = weights.getComponent(offset + i, k);
              if (!weight) continue;
              matrix.fromArray(p.positions.value, joint * 16);
              sample
                .fromBufferAttribute(g.attributes.position, offset + i)
                .applyMatrix4(matrix);
              actualPoint.addScaledVector(sample, weight);
            }
            actualPoint.applyMatrix4(cat.matrixWorld);
            assert.ok(
              actualPoint.distanceTo(originalPoint) < 0.000004,
              source.name +
                " " +
                mood +
                " " +
                actualPoint.distanceTo(originalPoint),
            );
          }
          offset += source.geometry.attributes.position.count;
        }
      }
    }
    batch.sources.forEach((s, i) => {
      assert.equal(s.geometry, originalGeometry[i][0]);
      assert.equal(s.material, originalGeometry[i][1]);
      assert.ok(s.layers.isEnabled(CAT_PICK_LAYER));
    });
    const ray = new THREE.Raycaster();
    ray.layers.enable(CAT_PICK_LAYER);
    const face = cat.getObjectByName("Face"),
      center = face.getWorldPosition(new THREE.Vector3());
    ray.set(
      center.clone().add(new THREE.Vector3(0, 0, 5)),
      new THREE.Vector3(0, 0, -1),
    );
    assert.ok(
      ray.intersectObject(face).length,
      "original model remains draggable",
    );
    disposeCat(cat);
  }
});
