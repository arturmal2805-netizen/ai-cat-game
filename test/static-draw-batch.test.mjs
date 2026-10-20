import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  createStaticDrawBatch,
  STATIC_PICK_LAYER,
} from "../public/static-draw-batch.js";

function setup(enabled = true) {
  const scene = new T.Scene(),
    roots = [];
  for (let i = 0; i < 8; i++) {
    const root = new T.Group();
    root.position.set(i * 3, 0, -i);
    const mesh = new T.Mesh(
      new T.BoxGeometry(1, 2, 3),
      new T.MeshStandardMaterial({ color: 0xaabbcc }),
    );
    mesh.geometry.clearGroups();
    mesh.userData.staticModel = true;
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
    scene.add(root);
    roots.push(root);
  }
  const renderer = {
    extensions: { has: () => enabled },
  };
  const runtime = createStaticDrawBatch(scene, renderer);
  runtime.sync(roots);
  return { scene, roots, runtime, renderer };
}
test("equal opaque static props share submissions while every original triangle, vertex and pick surface remains", () => {
  const { scene, roots, runtime, renderer } = setup();
  assert.deepEqual(runtime.stats, { sources: 8, batches: 1 });
  const batch = scene.children.find((o) => o.isBatchedMesh);
  assert.ok(batch.castShadow && batch.receiveShadow);
  assert.equal(batch.perObjectFrustumCulled, true);
  for (let i = 0; i < roots.length; i++) {
    const source = roots[i].children[0],
      g = source.geometry;
    assert.equal(source.layers.isEnabled(STATIC_PICK_LAYER), true);
    const range = batch.getGeometryRangeAt(i);
    for (const [name, a] of Object.entries(g.attributes))
      assert.deepEqual(
        batch.geometry.attributes[name].array.slice(
          range.vertexStart * a.itemSize,
          (range.vertexStart + a.count) * a.itemSize,
        ),
        a.array,
      );
    for (let j = 0; j < g.index.count; j++)
      assert.equal(
        batch.geometry.index.getX(range.start + j) - range.vertexStart,
        g.index.getX(j),
      );
  }
  const matrices = batch._matricesTexture.version;
  for (let i = 0; i < 60; i++) {
    scene.updateMatrixWorld(true);
    scene.onBeforeRender();
  }
  assert.equal(
    batch._matricesTexture.version,
    matrices,
    "no unchanged matrix uploads",
  );
  const mesh = roots[0].children[0];
  const ray = new T.Raycaster(new T.Vector3(0, 0, 10), new T.Vector3(0, 0, -1));
  ray.layers.enable(STATIC_PICK_LAYER);
  assert.ok(ray.intersectObject(mesh).length);
  const material = mesh.material,
    geometry = mesh.geometry;
  renderer.extensions.has = () => false;
  scene.onBeforeRender();
  assert.equal(batch.visible, false);
  assert.ok(roots.every((r) => r.children[0].layers.mask === 1));
  runtime.dispose();
  assert.equal(mesh.material, material);
  assert.equal(mesh.geometry, geometry);
  assert.equal(mesh.layers.mask, 1);
});
test("hidden parents, reappearance, moved buildings, storage and changed shaders retain native visibility", () => {
  const { scene, roots, runtime } = setup();
  const batch = scene.children.find((o) => o.isBatchedMesh),
    matrix = new T.Matrix4();
  roots[0].visible = false;
  scene.onBeforeRender();
  assert.equal(batch.getVisibleAt(0), false);
  roots[0].visible = true;
  roots[0].position.x = 31;
  scene.updateMatrixWorld(true);
  scene.onBeforeRender();
  assert.equal(batch.getVisibleAt(0), true);
  batch.getMatrixAt(0, matrix);
  assert.equal(matrix.elements[12], 31);
  roots[1].removeFromParent();
  scene.onBeforeRender();
  assert.equal(batch.getVisibleAt(1), false);
  roots[2].children[0].material.onBeforeCompile = () => {};
  scene.onBeforeRender();
  assert.equal(roots[2].children[0].layers.mask, 1);
  assert.equal(batch.getVisibleAt(2), false);
  runtime.setEnabled(false);
  assert.ok(roots.every((r) => r.children[0].layers.mask === 1));
  runtime.dispose();
});
test("unsupported devices retain native props; animation, transparency and large range batches are excluded", () => {
  const { scene, roots, runtime } = setup(false);
  assert.equal(runtime.stats.sources, 0);
  assert.ok(roots.every((r) => r.children[0].layers.mask === 1));
  runtime.dispose();
  const enabled = createStaticDrawBatch(scene, {
    extensions: { has: () => true },
  });
  for (const root of roots.slice(0, 3))
    root.children[0].material.transparent = true;
  for (const root of roots.slice(3, 6))
    root.children[0].material.onBeforeCompile = () => {};
  enabled.sync(roots);
  assert.equal(enabled.stats.sources, 0);
  enabled.dispose();
});
test("native fallback covers live material/geometry changes and unsupported transforms, while retired batches release their resources", () => {
  const { scene, roots, runtime } = setup();
  const batch = scene.children.find((o) => o.isBatchedMesh);
  runtime.sync(roots);
  assert.equal(
    scene.children.find((o) => o.isBatchedMesh),
    batch,
  );
  roots[0].children[0].material.opacity = 0.3;
  roots[1].children[0].material.color.set(0xffffff);
  roots[2].children[0].geometry = new T.SphereGeometry();
  roots[3].scale.x = -1;
  roots[4].matrixAutoUpdate = false;
  roots[4].matrix.makeShear(0.3, 0, 0, 0, 0, 0);
  roots[5].children[0].onBeforeRender = () => {};
  scene.updateMatrixWorld(true);
  scene.onBeforeRender();
  for (let i = 0; i < 6; i++) {
    assert.equal(roots[i].children[0].layers.mask, 1);
    assert.equal(batch.getVisibleAt(i), false);
  }
  let disposed = 0;
  batch.geometry.addEventListener("dispose", () => disposed++);
  runtime.sync([]);
  assert.equal(disposed, 1);
  assert.deepEqual(runtime.stats, { sources: 0, batches: 0 });
  assert.equal(
    scene.children.some((o) => o.isBatchedMesh),
    false,
  );
  assert.ok(roots.every((r) => r.children[0].layers.mask === 1));
  runtime.dispose();
});
test("moving raft templates and guest clones keep native layers so later multi-rider copies cannot disappear", () => {
  const { scene, roots, runtime } = setup(false);
  runtime.dispose();
  for (const root of roots) root.userData.moving = root.children[0];
  const manager = createStaticDrawBatch(scene, {
    extensions: { has: () => true },
  });
  manager.sync(roots);
  assert.equal(manager.stats.sources, 0);
  for (const root of roots) {
    const guest = root.userData.moving.clone(true);
    assert.equal(guest.layers.mask, 1);
    root.add(guest);
    root.userData.slideVehicles = [root.userData.moving, guest];
  }
  manager.sync(roots);
  assert.equal(manager.stats.sources, 0);
  manager.dispose();
});
test("grouping textured props never serializes or PNG-encodes their source images", () => {
  const { scene, roots, runtime } = setup(false);
  runtime.dispose();
  const texture = new T.Texture();
  texture.source.toJSON = () => {
    throw Error("No image encoding on a world edit");
  };
  for (const root of roots) root.children[0].material.map = texture;
  const manager = createStaticDrawBatch(scene, {
    extensions: { has: () => true },
  });
  manager.sync(roots);
  assert.deepEqual(manager.stats, { sources: 8, batches: 1 });
  assert.equal(
    scene.children.find((o) => o.isBatchedMesh).material.map,
    texture,
  );
  manager.dispose();
});
test("native props stay visible until parallel shader preparation finishes, including retirement before preparation completes", async () => {
  const { scene, roots, runtime } = setup(false);
  runtime.dispose();
  let ready;
  const manager = createStaticDrawBatch(
    scene,
    {
      extensions: { has: () => true },
      compileAsync: () =>
        new Promise((resolve) => {
          ready = resolve;
        }),
    },
    new T.PerspectiveCamera(),
  );
  manager.sync(roots);
  assert.ok(roots.every((r) => r.children[0].layers.mask === 1));
  const batch = scene.children.find((o) => o.isBatchedMesh);
  assert.equal(batch.visible, false);
  assert.equal(ready, undefined, "sync must not eagerly prepare remote props");
  scene.onBeforeRender();
  ready();
  await Promise.resolve();
  scene.onBeforeRender();
  assert.equal(batch.visible, true);
  assert.ok(
    roots.every((r) => r.children[0].layers.isEnabled(STATIC_PICK_LAYER)),
  );
  manager.sync([]);
  manager.sync(roots);
  const pending = scene.children.find((o) => o.isBatchedMesh);
  scene.onBeforeRender();
  manager.dispose();
  ready();
  await Promise.resolve();
  assert.equal(pending.parent, null);
  assert.ok(roots.every((r) => r.children[0].layers.mask === 1));
});

test("remote hidden businesses do not request shader preparation until their native props become visible", async () => {
  const { scene, roots, runtime } = setup(false);
  runtime.dispose();
  let calls = 0;
  const manager = createStaticDrawBatch(scene, {
    extensions: { has: () => true }, compileAsync: async () => { calls++; },
  }, new T.PerspectiveCamera());
  for (const root of roots) root.visible = false;
  manager.sync(roots);
  scene.onBeforeRender();
  await Promise.resolve();
  assert.equal(calls, 0);
  roots[0].visible = true;
  scene.onBeforeRender();
  await Promise.resolve();
  assert.equal(calls, 1);
  scene.onBeforeRender();
  assert.equal(calls, 1, "the visible batch must share its pending preparation");
  manager.dispose();
});

test("hidden sources wake with current transforms and native fallbacks after material/geometry changes", () => {
  const { scene, roots, runtime } = setup();
  const batch = scene.children.find((o) => o.isBatchedMesh);
  roots[0].visible = false;
  scene.onBeforeRender();
  roots[0].position.set(25, 2, 7);
  roots[0].children[0].material.opacity = 0.4;
  roots[1].visible = false;
  roots[1].children[0].geometry = new T.SphereGeometry();
  scene.updateMatrixWorld(true);
  scene.onBeforeRender();
  assert.equal(batch.getVisibleAt(0), false);
  assert.equal(batch.getVisibleAt(1), false);
  roots[0].visible = roots[1].visible = true;
  scene.updateMatrixWorld(true);
  scene.onBeforeRender();
  assert.equal(roots[0].children[0].layers.mask, 1);
  assert.equal(roots[1].children[0].layers.mask, 1);
  assert.equal(batch.getVisibleAt(0), false);
  assert.equal(batch.getVisibleAt(1), false);
  roots[0].children[0].material.opacity = 1;
  scene.onBeforeRender();
  const matrix = new T.Matrix4();
  batch.getMatrixAt(0, matrix);
  assert.deepEqual(matrix.elements, roots[0].children[0].matrixWorld.elements);
  assert.equal(batch.getVisibleAt(0), true);
  runtime.dispose();
});
