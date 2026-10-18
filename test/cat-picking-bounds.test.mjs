import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  createCat,
  animateCat,
  reactCat,
  disposeCat,
} from "../public/cat-model.js";
import {
  prepareCatPicking,
  updateCatPickingBounds,
} from "../public/cat-picking-bounds.js";

test("joint bounds contain actual skinned vertices through walking, crouch and ride reactions without per-vertex sphere scans", () => {
  let checked = 0;
  for (const options of [
    {},
    { detail: "npc", breed: "british", build: "giant" },
    { detail: "npc", breed: "sphynx", size: 0.35 },
  ]) {
    const cat = createCat("happy", options),
      meshes = [];
    cat.position.set(23, 4, -16);
    cat.scale.setScalar(0.71);
    cat.rotation.y = 0.43;
    cat.traverse((m) => {
      if (m.isSkinnedMesh) {
        meshes.push(m);
        m.computeBoundingSphere = () => {
          throw Error("expensive skinning scan during a gesture");
        };
      }
    });
    for (const [time, reaction] of [
      [0, {}],
      [3, {}],
      [8, { crouch: 0.8, paw: 0.7, headPitch: 0.2 }],
      [15, { surprise: 1, bracing: 0.9 }],
    ]) {
      animateCat(cat, time, true);
      reactCat(cat, reaction);
      cat.updateMatrixWorld(true);
      prepareCatPicking(cat);
      const p = new T.Vector3();
      for (const m of meshes)
        for (let i = 0; i < m.geometry.attributes.position.count; i += 3) {
          m.getVertexPosition(i, p);
          checked++;
          assert.ok(m.boundingBox.containsPoint(p), m.name + " box " + time);
          assert.ok(
            m.boundingSphere.containsPoint(p),
            m.name + " sphere " + time,
          );
        }
    }
    disposeCat(cat);
  }
  assert.ok(checked > 100000);
});
test("the faster bounds preserve exact hit points, faces and distances on articulated paws", () => {
  const cat = createCat("happy"),
    meshes = [],
    ray = new T.Raycaster(),
    p = new T.Vector3();
  cat.position.set(-4, 2, 7);
  cat.rotation.y = 0.7;
  cat.scale.setScalar(0.63);
  animateCat(cat, 3, true);
  reactCat(cat, { crouch: 0.4 });
  cat.updateMatrixWorld(true);
  cat.traverse((m) => {
    if (m.isSkinnedMesh && m.name === "Shin") meshes.push(m);
  });
  let contacts = 0;
  for (const m of meshes) {
    m.computeBoundingSphere();
    const center = m.boundingSphere.center.clone().applyMatrix4(m.matrixWorld);
    for (const direction of [
      [1, 0.1, 1],
      [-1, 0.2, 1],
      [0, 0.1, -1],
    ]) {
      const d = new T.Vector3(...direction).normalize();
      p.copy(center).addScaledVector(d, 5);
      ray.set(p, d.negate());
      m.boundingBox = null;
      m.computeBoundingSphere();
      const before = ray
        .intersectObject(m, false)
        .map((h) => [h.distance, h.faceIndex, ...h.point.toArray()]);
      updateCatPickingBounds(m);
      const after = ray
        .intersectObject(m, false)
        .map((h) => [h.distance, h.faceIndex, ...h.point.toArray()]);
      assert.deepEqual(after, before);
      contacts += before.length;
    }
  }
  assert.ok(contacts >= meshes.length);
  disposeCat(cat);
});
