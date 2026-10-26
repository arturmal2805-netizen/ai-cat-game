import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCatPoseAtlas } from "../public/cat-pose-atlas.js";
import { createColonyRenderBatch } from "../public/colony-render-batch.js";
import { enableCatRenderBatch } from "../public/cat-render-batch.js";
import {
  createCat,
  animateCat,
  reactCat,
  disposeCat,
} from "../public/cat-model.js";

test("pose storage preserves all Float32 matrix/normal bytes, uploads only changed rows and reuses released ranges", () => {
  const scene = new THREE.Scene(),
    atlas = createCatPoseAtlas(scene),
    slot = atlas.allocate(3),
    texture = atlas.uniform.value,
    data = texture.image.data,
    palette = {
      positions: {
        value: Float32Array.from({ length: 48 }, (_, i) => Math.sin(i) * 3),
      },
      normals: {
        value: Float32Array.from({ length: 27 }, (_, i) => Math.cos(i) / 3),
      },
      shown: { value: new Float32Array([1, 0, 1]) },
    };
  slot.write(palette);
  atlas.flush();
  assert.equal(atlas.stats.rows, 1);
  assert.equal(atlas.stats.bytes, 8192);
  for (let entry = 0; entry < 3; entry++) {
    assert.deepEqual(
      data.slice(entry * 32, entry * 32 + 16),
      palette.positions.value.slice(entry * 16, entry * 16 + 16),
    );
    for (let k = 0; k < 9; k++)
      assert.equal(
        data[entry * 32 + 16 + Math.floor(k / 3) * 4 + (k % 3)],
        palette.normals.value[entry * 9 + k],
      );
    assert.equal(data[entry * 32 + 28], palette.shown.value[entry]);
  }
  const version = texture.version;
  texture.clearUpdateRanges();
  for (let i = 0; i < 100; i++) {
    slot.write(palette);
    atlas.flush();
  }
  assert.equal(texture.version, version);
  assert.equal(atlas.stats.bytes, 0);
  palette.shown.value[1] = 1;
  slot.write(palette);
  atlas.flush();
  assert.equal(texture.version, version + 1);
  for (let i = 0; i < 400; i++) {
    palette.positions.value[0] += 0.001;
    slot.write(palette);
    atlas.flush();
  }
  assert.equal(
    texture.updateRanges.length,
    1,
    "hidden renderers retain one range per changed row, never an unbounded queue",
  );
  const offset = slot.offset.value;
  slot.release();
  slot.release();
  assert.equal(atlas.stats.entries, 0);
  assert.equal(atlas.allocate(3).offset.value, offset);
  assert.equal(
    atlas.allocate(32769),
    null,
    "bounded storage falls back to native uniforms",
  );
  atlas.dispose();
});

test("colony draws preserve half-float vertices, weighted joints, material tints, current bounds and original picking through rebuilds", async () => {
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(),
    renderer = {
      extensions: { has: () => true },
      compileAsync: async () => {},
      info: { render: { frame: 0 } },
    },
    atlas = createCatPoseAtlas(scene),
    colony = createColonyRenderBatch(scene, renderer, camera, atlas, {
      minimumCats: 1,
    }),
    cats = [];
  async function settle(predicate) {
    for (let i = 0; i < 300; i++) {
      if (predicate()) return;
      await new Promise((r) => setTimeout(r, 5));
    }
    assert.fail("cooperative colony preparation did not complete");
  }
  function add(color) {
    const cat = createCat("happy", { breed: "british", color, build: "plush" });
    cat.position.set(cats.length * 2, 0.2, -20);
    cat.rotation.y = 0.7;
    cat.scale.setScalar(0.63);
    scene.add(cat);
    enableCatRenderBatch(cat, atlas);
    cats.push(cat);
    return cat;
  }
  for (const color of [0xaabbcc, 0xeabb87, 0xbbccaa]) add(color);
  scene.updateMatrixWorld(true);
  const originalData = cats
    .flatMap(c => c.userData.renderBatches.batches)
    .map(mesh => {
      const g = mesh.geometry;
      return {
        g, index: g.index, attributes: { ...g.attributes },
        bytes: [g.index, ...Object.values(g.attributes)].map(a =>
          new Uint8Array(a.array.buffer, a.array.byteOffset, a.array.byteLength).slice(),
        ),
      };
    });
  let stagingClones = 0, sourceDisposals = 0;
  for (const { g } of originalData) {
    const clone = g.clone;
    g.clone = function (...args) {
      stagingClones++;
      return clone.apply(this, args);
    };
    g.addEventListener("dispose", () => sourceDisposals++);
  }
  colony.sync();
  await settle(() => colony.stats.ready);
  assert.equal(stagingClones, 0, "preparation must not allocate temporary copies of every native cat buffer");
  assert.equal(sourceDisposals, 0, "disposing an unrendered staging wrapper must not dispose the native owner");
  for (const { g, index, attributes, bytes } of originalData) {
    assert.equal(g.index, index);
    for (const [name, a] of Object.entries(attributes))
      assert.equal(g.attributes[name], a);
    [g.index, ...Object.values(g.attributes)].forEach((a, i) =>
      assert.deepEqual(
        new Uint8Array(a.array.buffer, a.array.byteOffset, a.array.byteLength),
        bytes[i],
        "preparation must not mutate native indices, positions, normals, weights or joints",
      ),
    );
  }
  scene.updateMatrixWorld(true);
  scene.onBeforeRender(renderer, scene, camera);
  const groups = scene.children.filter((o) =>
    o.name.startsWith("Exact colony cats"),
  );
  assert.ok(groups.length > 3 && groups.length < cats.length * 8);
  const originals = cats.flatMap((c) => c.userData.renderBatches.batches);
  assert.ok(originals.every((s) => !s.layers.isEnabled(0)));
  for (const cat of cats) {
    const b = cat.userData.renderBatches;
    for (let i = 0; i < b.batches.length; i++) {
      const source = b.batches[i];
      const shared = groups.find((g) =>
        g._instanceInfo.some((instance, j) => {
          const info = g._geometryInfo[instance.geometryIndex];
          const joints = g.geometry.attributes.aRigJoints;
          return (
            joints.getX(info.vertexStart) ===
            b.palettes[i].slot.offset.value / 8 +
              source.geometry.attributes.aRigJoints.getX(0)
          );
        }),
      );
      assert.ok(shared, source.name);
      const info = shared._geometryInfo.find(
        (info) =>
          shared.geometry.attributes.aRigJoints.getX(info.vertexStart) ===
          b.palettes[i].slot.offset.value / 8 +
            source.geometry.attributes.aRigJoints.getX(0),
      );
      for (const name of ["position", "normal", "color", "aRigWeights"]) {
        const a = source.geometry.attributes[name],
          s = shared.geometry.attributes[name];
        assert.equal(
          !!s.isFloat16BufferAttribute,
          !!a.isFloat16BufferAttribute,
        );
        assert.deepEqual(
          s.array.slice(
            info.vertexStart * a.itemSize,
            (info.vertexStart + a.count) * a.itemSize,
          ),
          a.array,
          name,
        );
        assert.notEqual(s.array.buffer, a.array.buffer, "the final batch must own independent attribute storage");
      }
      assert.deepEqual(
        Array.from(
          shared.geometry.index.array.slice(
            info.indexStart,
            info.indexStart + info.indexCount,
          ),
        ),
        Array.from(source.geometry.index.array, (v) => v + info.vertexStart),
      );
    }
  }
  for (const cat of cats) {
    animateCat(cat, 3, true);
    reactCat(cat, { surprise: 1, paw: 0.7 });
  }
  scene.updateMatrixWorld(true);
  scene.onBeforeRender(renderer, scene, camera);
  atlas.setEnabled(false);
  scene.onBeforeRender(renderer, scene, camera);
  assert.ok(originals.every((s) => s.layers.isEnabled(0)));
  assert.ok(groups.every((g) => !g.visible));
  atlas.setEnabled(true);
  scene.onBeforeRender(renderer, scene, camera);
  const before = colony.stats.sources;
  add(0xeecbaa);
  scene.updateMatrixWorld(true);
  colony.sync();
  await settle(() => colony.stats.sources > before);
  atlas.setEnabled(false);
  scene.onBeforeRender(renderer, scene, camera);
  assert.ok(
    originals.every((s) => s.layers.isEnabled(0)),
    "a rebuild must restore original layer zero, never an old temporary source layer",
  );
  let cacheDisposals = 0;
  for (const mesh of originals)
    mesh.geometry.addEventListener("dispose", () => cacheDisposals++);
  for (let i = 0; i < 12; i++) {
    atlas.setEnabled(false);
    scene.onBeforeRender(renderer, scene, camera);
    scene.onAfterRender(renderer, scene, camera);
    for (const mesh of originals) mesh.userData.nativeBuffersResident = true;
    atlas.setEnabled(true);
    scene.onBeforeRender(renderer, scene, camera);
    scene.onAfterRender(renderer, scene, camera);
  }
  assert.equal(cacheDisposals, 0, "camera mode changes must reuse native fallback buffers, not delete/re-upload them");
  atlas.setEnabled(false);
  scene.onBeforeRender(renderer, scene, camera);
  scene.onAfterRender(renderer, scene, camera);
  const entries = atlas.stats.entries;
  const source = cats[0].userData.renderBatches.batches[0],
    geometry = source.geometry;
  source.userData.nativeBuffersResident = true;
  source.userData.releaseDrawBuffers();
  assert.equal(
    atlas.stats.entries,
    entries,
    "GPU-only eviction must not release a live pose slot",
  );
  assert.equal(source.geometry, geometry);
  assert.ok(
    geometry.attributes.position.count > 0,
    "the exact fallback/picking data remains available",
  );
  cats[0].removeFromParent();
  disposeCat(cats[0]);
  assert.ok(atlas.stats.entries < entries);
  colony.dispose();
  atlas.dispose();
  for (const cat of cats.slice(1)) disposeCat(cat);
});

test("render traversal omits CPU-only rig branches, restores original child arrays after draws and exceptions, and retains added effects", () => {
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(),
    cat = createCat("happy", { breed: "british", color: 0xaabbcc });
  scene.add(cat);
  let fail = false,
    drawNodes = 0;
  const renderer = {
    extensions: { has: () => true },
    compileAsync: async () => {},
    info: { render: { frame: 0 } },
    render(s, c) {
      s.updateMatrixWorld();
      s.onBeforeRender(this, s, c);
      cat.traverse(() => drawNodes++);
      if (fail) throw Error("simulated context failure");
      s.onAfterRender(this, s, c);
      this.info.render.frame++;
    },
  };
  const atlas = createCatPoseAtlas(scene, null, { minimumCats: 7 }),
    colony = createColonyRenderBatch(scene, renderer, camera, atlas);
  enableCatRenderBatch(cat, atlas);
  const children = cat.children,
    face = cat.getObjectByName("Face");
  let fullNodes = 0;
  cat.traverse(() => fullNodes++);
  renderer.render(scene, camera);
  assert.equal(cat.children, children);
  assert.equal(cat.getObjectByName("Face"), face);
  assert.ok(drawNodes < fullNodes / 3, { drawNodes, fullNodes });
  const effect = new THREE.Mesh(
    new THREE.SphereGeometry(0.1),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5 }),
  );
  cat.add(effect);
  renderer.render(scene, camera);
  assert.equal(cat.children, children);
  assert.ok(cat.children.includes(effect));
  fail = true;
  assert.throws(() => renderer.render(scene, camera), /simulated/);
  assert.equal(cat.children, children);
  assert.equal(cat.getObjectByName("Face"), face);
  cat.userData.renderBatches.setEnabled(false);
  fail = false;
  drawNodes = 0;
  renderer.render(scene, camera);
  assert.ok(drawNodes >= fullNodes);
  colony.dispose();
  atlas.dispose();
  disposeCat(cat);
});

test("an animated apron sharing a range-only static material stays on its native rig without breaking colony shader helpers", async () => {
  const { staticSubmissionSteps } = await import(
    "../public/static-submissions.js"
  );
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(),
    renderer = {
      extensions: { has: () => true },
      compileAsync: async () => {},
      info: { render: { frame: 0 } },
    },
    atlas = createCatPoseAtlas(scene),
    colony = createColonyRenderBatch(scene, renderer, camera, atlas, {
      minimumCats: 1,
    }),
    paint = new THREE.MeshStandardMaterial({ color: 0xccaaaa }),
    prop = new THREE.Mesh(new THREE.SphereGeometry(3, 64, 32), paint),
    cats = [];
  const steps = staticSubmissionSteps(prop, { force: true });
  while (!steps.next().done) {}
  assert.match(paint.customProgramCacheKey(), /static-ranges/);
  for (let i = 0; i < 3; i++) {
    const cat = createCat("happy", {
      breed: "british",
      color: 0xaabbcc + i * 1000,
    });
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.05), paint);
    apron.position.set(0, 0.8, 0.55);
    cat.add(apron);
    scene.add(cat);
    enableCatRenderBatch(cat, atlas);
    cats.push(cat);
  }
  scene.updateMatrixWorld(true);
  colony.sync();
  for (let i = 0; i < 300 && !colony.stats.ready; i++)
    await new Promise((r) => setTimeout(r, 5));
  assert.equal(colony.stats.ready, true);
  scene.onBeforeRender(renderer, scene, camera);
  for (const cat of cats) {
    const parts = cat.userData.renderBatches.batches;
    const apron = parts.find((p) => p.userData.rigMaterialSource === paint);
    assert.ok(
      apron?.layers.isEnabled(0),
      "the complete original animated apron remains rendered",
    );
    assert.ok(
      parts.some((p) => p !== apron && !p.layers.isEnabled(0)),
      "the compatible approved sculpt still shares draws",
    );
  }
  colony.dispose();
  atlas.dispose();
  cats.forEach(disposeCat);
  prop.geometry.dispose();
  prop.customDepthMaterial.dispose();
  paint.dispose();
});
