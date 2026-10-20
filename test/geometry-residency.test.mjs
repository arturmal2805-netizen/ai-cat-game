import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createGeometryResidency } from "../public/geometry-residency.js";

function fixture(options = {}) {
  let now = 0;
  const calls = [],
    renderer = {
      renderBufferDirect(...args) {
        calls.push(args);
      },
    };
  const original = renderer.renderBufferDirect;
  const residency = createGeometryResidency(renderer, {
    budget: 0,
    grace: 10,
    clock: () => now,
    ...options,
  });
  return {
    renderer,
    residency,
    original,
    calls,
    time(value) {
      now = value;
    },
    draw(geometry) {
      renderer.renderBufferDirect(null, null, geometry);
    },
  };
}

test("old GPU geometry is retired without altering CPU vertices and can be drawn again", () => {
  const f = fixture(),
    geometry = new THREE.BoxGeometry(),
    copy = geometry.clone();
  let retired = 0;
  geometry.addEventListener("dispose", () => retired++);
  f.draw(geometry);
  const bytes = f.residency.stats.bytes;
  assert.ok(bytes > 0);
  f.time(11);
  f.residency.sweep();
  assert.equal(retired, 1);
  assert.equal(f.residency.stats.bytes, 0);
  assert.deepEqual(
    geometry.attributes.position.array,
    copy.attributes.position.array,
  );
  assert.deepEqual(geometry.index.array, copy.index.array);
  f.draw(geometry);
  assert.equal(f.residency.stats.bytes, bytes);
  assert.equal(f.calls.length, 2);
  f.residency.dispose();
  assert.equal(f.renderer.renderBufferDirect, f.original);
  assert.equal(
    retired,
    1,
    "uninstalling a cache does not retire live draw buffers",
  );
});

test("recent shadow/colour owners protect every shared-attribute geometry", () => {
  const f = fixture(),
    a = new THREE.BoxGeometry(),
    b = a.clone();
  b.setAttribute("position", a.attributes.position);
  let retired = 0;
  a.addEventListener("dispose", () => retired++);
  b.addEventListener("dispose", () => retired++);
  f.draw(a);
  f.draw(b);
  const expected =
    Object.values(a.attributes).reduce(
      (n, x) => n + x.array.byteLength,
      a.index.array.byteLength,
    ) +
    Object.entries(b.attributes)
      .filter(([k]) => k !== "position")
      .reduce((n, [, x]) => n + x.array.byteLength, b.index.array.byteLength);
  assert.equal(f.residency.stats.bytes, expected);
  f.time(9);
  f.draw(b);
  f.time(15);
  f.residency.sweep();
  assert.equal(
    retired,
    0,
    "retiring a must not delete a buffer still used by b",
  );
  f.time(1016);
  f.residency.sweep();
  assert.equal(retired, 2);
  assert.equal(f.residency.stats.bytes, 0);
});

test("budget retains the most recently used geometry and external disposal is accounted once", () => {
  const geometry = new THREE.BoxGeometry(),
    size = Object.values(geometry.attributes).reduce(
      (n, x) => n + x.array.byteLength,
      geometry.index.array.byteLength,
    );
  const f = fixture({ budget: size }),
    recent = geometry.clone();
  f.draw(geometry);
  f.time(5);
  f.draw(recent);
  f.time(20);
  f.residency.sweep();
  assert.equal(f.residency.stats.evicted, 1);
  assert.equal(f.residency.stats.bytes, size);
  recent.dispose();
  recent.dispose();
  assert.equal(f.residency.stats.bytes, 0);
  assert.equal(f.residency.stats.geometries, 0);
});

test("GPU-only eviction preserves a living cat and its pose slots across repeated returns", async () => {
  const { createCat, disposeCat } = await import("../public/cat-model.js");
  const { enableCatRenderBatch } = await import(
    "../public/cat-render-batch.js"
  );
  const { createCatPoseAtlas } = await import("../public/cat-pose-atlas.js");
  const scene = new THREE.Scene(),
    atlas = createCatPoseAtlas(scene);
  const cat = createCat("happy", { breed: "british", detail: "npc" });
  scene.add(cat);
  enableCatRenderBatch(cat, atlas);
  const initial = { cats: atlas.stats.cats, entries: atlas.stats.entries };
  assert.equal(initial.cats, 1);
  assert.ok(initial.entries > 0);
  const buffers = cat.userData.renderBatches.batches,
    f = fixture();
  const slots = cat.userData.renderBatches.palettes.map(
    (p) => p.slot.offset.value,
  );
  for (let round = 0; round < 3; round++) {
    f.time(round * 2000);
    for (const mesh of buffers) {
      mesh.userData.nativeBuffersResident = true;
      f.draw(mesh.geometry);
    }
    f.time(round * 2000 + 11);
    f.residency.sweep();
    assert.equal(f.residency.stats.bytes, 0);
    assert.equal(
      atlas.stats.cats,
      initial.cats,
      "cache eviction must never unregister a living cat",
    );
    assert.equal(
      atlas.stats.entries,
      initial.entries,
      "joint slots must not be reused by another cat",
    );
    assert.deepEqual(
      cat.userData.renderBatches.palettes.map((p) => p.slot.offset.value),
      slots,
    );
    assert.ok(buffers.every((m) => m.geometry.attributes.position.count > 0));
  }
  disposeCat(cat);
  assert.equal(atlas.stats.cats, 0);
  assert.equal(atlas.stats.entries, 0);
  f.residency.dispose();
  atlas.dispose();
});
