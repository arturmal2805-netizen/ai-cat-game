import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  cacheSceneMatrices,
  cacheSceneAdditions,
} from "../public/matrix-cache.js";
import { pauseHiddenMatrixUpdates } from "../public/scene-visibility.js";

test("cached props retain exact native matrices through movement, queries, manual edits and reparenting", () => {
  const a = new THREE.Group(),
    b = new THREE.Group();
  for (const root of [a, b]) {
    root.position.set(9, 2, -3);
    const child = new THREE.Group();
    child.position.set(1, 2, 3);
    root.add(child);
    child.add(
      new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()),
    );
  }
  cacheSceneMatrices(b);
  for (let i = 0; i < 80; i++) {
    for (const root of [a, b]) {
      if (i % 7 === 0) root.rotation.y = i * 0.04;
      if (i % 9 === 0) root.children[0].scale.set(1 + i * 0.01, 0.7, 2);
      if (i === 15) {
        root.children[0].matrix.makeTranslation(123, 456, 789);
      }
      if (i === 20) {
        const parent = new THREE.Group();
        parent.position.x = 4;
        const child = root.children[0];
        root.add(parent);
        parent.add(child);
      }
      root.updateMatrixWorld();
      if (i % 8 === 0) root.children[0].getWorldPosition(new THREE.Vector3());
    }
    const aa = [],
      bb = [];
    a.traverse((o) => aa.push(o));
    b.traverse((o) => bb.push(o));
    aa.forEach((o, n) => {
      assert.deepEqual(bb[n].matrix.elements, o.matrix.elements);
      assert.deepEqual(bb[n].matrixWorld.elements, o.matrixWorld.elements);
      assert.equal(bb[n].matrixAutoUpdate, o.matrixAutoUpdate);
    });
  }
});
test("stationary native props stop dirtying their world matrices, while explicit updateMatrix remains native", () => {
  const root = new THREE.Group(),
    child = new THREE.Group();
  root.add(child);
  cacheSceneMatrices(root);
  let multiplies = 0;
  const multiply = child.matrixWorld.multiplyMatrices;
  child.matrixWorld.multiplyMatrices = function (...args) {
    multiplies++;
    return multiply.apply(this, args);
  };
  root.updateMatrixWorld();
  const first = multiplies;
  for (let i = 0; i < 100; i++) root.updateMatrixWorld();
  assert.equal(multiplies, first);
  child.updateMatrix();
  root.updateMatrixWorld();
  assert.equal(multiplies, first + 1);
  child.position.x = 3;
  root.updateMatrixWorld();
  assert.equal(child.matrixWorld.elements[12], 3);
});
test("hidden deferred branches wake with all local changes and newly attached props are cached", () => {
  const scene = new THREE.Scene();
  cacheSceneAdditions(scene);
  const root = new THREE.Group(),
    child = new THREE.Group();
  root.add(child);
  pauseHiddenMatrixUpdates(root);
  root.visible = false;
  root.position.x = 6;
  child.position.z = 8;
  scene.add(root);
  scene.updateMatrixWorld();
  root.position.x = 12;
  child.position.z = 16;
  scene.updateMatrixWorld();
  root.visible = true;
  scene.updateMatrixWorld();
  assert.equal(child.matrixWorld.elements[12], 12);
  assert.equal(child.matrixWorld.elements[14], 16);
  assert.equal(root.matrixAutoUpdate, true);
  const hero = new THREE.Group();
  hero.userData.reference = true;
  const native = hero.updateMatrixWorld;
  scene.add(hero);
  assert.equal(hero.updateMatrixWorld, native);
});
