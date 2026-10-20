import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { deferHiddenLeafMatrices } from "../public/scene-visibility.js";
import {
  createCat,
  animateCat,
  reactCat,
  disposeCat,
  setCatMood,
} from "../public/cat-model.js";
import { enableCatRenderBatch } from "../public/cat-render-batch.js";

test("hidden leaves defer ordinary traversal, refresh explicit queries and wake with current parents; child bones always update", () => {
  const root = new T.Group(),
    leaf = new T.Mesh(new T.BoxGeometry(), new T.MeshBasicMaterial());
  root.add(leaf);
  leaf.visible = false;
  deferHiddenLeafMatrices(root);
  let work = 0;
  const multiply = leaf.matrixWorld.multiplyMatrices;
  leaf.matrixWorld.multiplyMatrices = function (...args) {
    work++;
    return multiply.apply(this, args);
  };
  for (let i = 0; i < 60; i++) {
    root.position.x = i;
    root.updateMatrixWorld(true);
  }
  assert.equal(work, 0);
  assert.equal(leaf.getWorldPosition(new T.Vector3()).x, 59);
  leaf.visible = true;
  root.position.x = 70;
  root.updateMatrixWorld(true);
  assert.equal(leaf.matrixWorld.elements[12], 70);
  const bone = new T.Bone();
  leaf.add(bone);
  leaf.visible = false;
  bone.position.z = 3;
  root.position.x = 80;
  root.updateMatrixWorld(true);
  assert.equal(bone.matrixWorld.elements[12], 80);
  assert.equal(bone.matrixWorld.elements[14], 3);
});

test("approved non-hero rigs retain exact visible matrices and hidden skinned picking queries through poses and reappearance", () => {
  const cats = [0, 1].map(() =>
      createCat("happy", { breed: "british", color: 0xaabbcc }),
    ),
    roots = cats.map((c) => {
      const r = new T.Group();
      r.add(c);
      enableCatRenderBatch(c);
      return r;
    });
  cats[0].userData.renderBatches.matrixDeferral.enabled = false;
  for (const [mood, time, walking] of [
    ["happy", 0, true],
    ["sleep", 3, false],
    ["crazy hungry", 8, true],
    ["happy", 15, false],
  ]) {
    for (let i = 0; i < 2; i++) {
      const c = cats[i],
        r = roots[i];
      r.position.set(time * 0.2, 0.3, -5);
      r.rotation.y = time * 0.13;
      setCatMood(c, mood, { immediate: true });
      animateCat(c, time, walking);
      reactCat(c, { surprise: 0.5, paw: 0.6 });
      r.updateMatrixWorld(true);
    }
    const a = [],
      b = [];
    cats[0].traverse((o) => a.push(o));
    cats[1].traverse((o) => b.push(o));
    assert.equal(a.length, b.length);
    for (let i = 0; i < a.length; i++) {
      if (!a[i].visible && a[i].isMesh) {
        a[i].getWorldPosition(new T.Vector3());
        b[i].getWorldPosition(new T.Vector3());
      }
      assert.deepEqual(
        b[i].matrixWorld.elements,
        a[i].matrixWorld.elements,
        a[i].name,
      );
      if (a[i].isSkinnedMesh)
        assert.deepEqual(
          b[i].bindMatrixInverse.elements,
          a[i].bindMatrixInverse.elements,
          a[i].name,
        );
    }
    for (const c of cats) c.userData.renderBatches.update();
    cats[0].userData.renderBatches.palettes.forEach((p, i) => {
      assert.deepEqual(
        cats[1].userData.renderBatches.palettes[i].positions.value,
        p.positions.value,
      );
      assert.deepEqual(
        cats[1].userData.renderBatches.palettes[i].normals.value,
        p.normals.value,
      );
    });
  }
  cats.forEach(disposeCat);
});
