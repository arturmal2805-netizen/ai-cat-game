import { test } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { copyGeometryBuffers, mergeSceneSteps } from "../public/geometry-tasks.js";
import { indexExactVerticesSteps, optimizeGeometryCache } from "../public/geometry-cache.js";
import { runSceneSteps } from "../public/scene-tasks.js";
import { prepareStaticVertexReuseSteps, mergeStaticVertexReuseSteps, applyStaticVertexReuseSteps } from "../public/static-vertex-reuse.js";
import { batchModelGeometry } from "../public/model-batching.js";

function exactTriangles(source, indexed) {
  const names = Object.keys(source.attributes);
  for (let i = 0; i < indexed.index.count; i++) {
    const original = source.index ? source.index.getX(i) : i,
      reused = indexed.index.getX(i);
    for (const name of names) {
      const a = source.attributes[name], b = indexed.attributes[name],
        stride = a.itemSize * a.array.BYTES_PER_ELEMENT,
        bytes = attr => new Uint8Array(attr.array.buffer, attr.array.byteOffset, attr.array.byteLength);
      assert.deepEqual(bytes(a).subarray(original * stride, (original + 1) * stride),
        bytes(b).subarray(reused * stride, (reused + 1) * stride), name);
    }
  }
}

test("static rounded building copies reuse exact vertices and keep every triangle corner, attribute and seam", () => {
  const source = new RoundedBoxGeometry(1, 1, 1, 2, .12), copy = copyGeometryBuffers(source),
    attrs = Object.values(copy.attributes), bytes = attrs.map(a => a.array.slice());
  const steps = indexExactVerticesSteps(copy); let slices = 0, result;
  do { result = steps.next(); slices++; } while (!result.done);
  assert.ok(slices > 3, "hashing cooperates with scene preparation");
  assert.equal(source.index, null);
  assert.equal(copy.index.count, source.attributes.position.count);
  assert.equal(new Set(copy.index.array).size, 212);
  assert.equal(copy.attributes.position.count, 900, "keep even unused original vertices");
  exactTriangles(source, copy);
  Object.values(copy.attributes).forEach((a, i) => {
    assert.equal(a, attrs[i]); assert.deepEqual(a.array, bytes[i]);
  });
});

test("only immutable shared primitives cache hashes; each copy owns its reorderable indices and edits invalidate", () => {
  const source = new RoundedBoxGeometry(1, 1, 1, 2, .12);
  source.userData.sharedScenery = true;
  const first = copyGeometryBuffers(source);
  runSceneSteps(indexExactVerticesSteps(first, { source }));
  const expected = first.index.array.slice();
  optimizeGeometryCache(first); first.index.array.fill(0);
  const second = copyGeometryBuffers(source), steps = indexExactVerticesSteps(second, { source });
  assert.equal(steps.next().done, true, "do not hash unchanged templates again");
  assert.deepEqual(second.index.array, expected);
  assert.notEqual(first.index, second.index); exactTriangles(source, second);
  const position = source.attributes.position;
  position.setX(1, position.getX(1) + .01); position.needsUpdate = true;
  const third = copyGeometryBuffers(source), edited = indexExactVerticesSteps(third, { source });
  assert.equal(edited.next().done, false);
  while (!edited.next().done) { /* finish preparation */ }
  exactTriangles(source, third);
  source.setAttribute("uv", source.attributes.uv.clone());
  const fourth = copyGeometryBuffers(source);
  assert.equal(indexExactVerticesSteps(fourth, { source }).next().done, false);
});

test("UV/normal/colour seams and Float16 bits stay exact; existing indices and unsupported animation layouts remain native", () => {
  const source = new T.SphereGeometry(1, 16, 12).toNonIndexed();
  source.setAttribute("color", new T.Uint8BufferAttribute(new Uint8Array(source.attributes.position.count * 3).fill(127), 3, true));
  const packed = new T.Float16BufferAttribute([], 1, false);
  packed.array = new Uint16Array(source.attributes.position.count); packed.count = packed.array.length;
  packed.array[1] = 0x8000; source.setAttribute("packed", packed);
  const copy = copyGeometryBuffers(source);
  runSceneSteps(indexExactVerticesSteps(copy)); exactTriangles(source, copy);
  const indexed = new T.BoxGeometry(), index = indexed.index;
  runSceneSteps(indexExactVerticesSteps(indexed)); assert.equal(indexed.index, index);
  const morph = source.clone(); morph.morphAttributes.position = [morph.attributes.position.clone()];
  runSceneSteps(indexExactVerticesSteps(morph)); assert.equal(morph.index, null);
  const interleaved = new T.BufferGeometry();
  interleaved.setAttribute("position", new T.InterleavedBufferAttribute(new T.InterleavedBuffer(new Float32Array(18), 3), 3, 0));
  runSceneSteps(indexExactVerticesSteps(interleaved)); assert.equal(interleaved.index, null);
});

test("mixed merging and the released cache optimiser retain exact triangle order, offsets, attributes and repeatability", () => {
  for (const optimise of [false, true]) {
    const sources = [new RoundedBoxGeometry(1, 1, 1, 2, .12), new T.BoxGeometry(), new RoundedBoxGeometry(1, 2, 1, 2, .12)],
      originals = [], copies = [];
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i], a = copyGeometryBuffers(source), b = copyGeometryBuffers(source);
      runSceneSteps(prepareStaticVertexReuseSteps(b, source));
      if (!a.index) a.setIndex(Array.from({ length: a.attributes.position.count }, (_, n) => n));
      a.translate(i * 2.1, 0, i * .37); b.translate(i * 2.1, 0, i * .37);
      originals.push(a); copies.push(b);
    }
    const native = runSceneSteps(mergeSceneSteps(originals)), reused = runSceneSteps(mergeStaticVertexReuseSteps(copies));
    if (optimise) { optimizeGeometryCache(native); optimizeGeometryCache(reused); }
    const before = reused.index.array.slice();
    runSceneSteps(applyStaticVertexReuseSteps(reused)); exactTriangles(native, reused);
    assert.notDeepEqual(reused.index.array, before);
    for (const name of Object.keys(native.attributes)) assert.deepEqual(reused.attributes[name].array, native.attributes[name].array);
    assert.ok(new Set(reused.index.array).size < new Set(native.index.array).size * .4);
    const index = reused.index.array.slice();
    runSceneSteps(applyStaticVertexReuseSteps(reused)); assert.deepEqual(reused.index.array, index);
  }
});

test("generated face normals keep sharp corners when a custom static source omits normals", () => {
  const source = new T.BufferGeometry();
  source.setAttribute("position", new T.Float32BufferAttribute([
    0,0,0, 1,0,0, 0,1,0, 0,0,0, 0,1,0, 0,0,1,
  ], 3));
  source.setAttribute("uv", new T.Float32BufferAttribute(new Float32Array(12), 2));
  const native = copyGeometryBuffers(source);
  native.setIndex([0,1,2,3,4,5]); native.computeVertexNormals();
  const root = new T.Group(); root.add(new T.Mesh(source, new T.MeshStandardMaterial()));
  const result = batchModelGeometry(root).children[0].geometry;
  exactTriangles(native, result);
  assert.equal(result.attributes.normal.getZ(0), 1);
  assert.equal(result.attributes.normal.getX(3), 1);
  assert.equal(source.attributes.normal, undefined, "preserve the editable source");
});
