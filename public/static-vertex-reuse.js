import { BufferAttribute } from "three";
import { indexExactVerticesSteps } from "./geometry-cache.js";
import { mergeSceneSteps } from "./geometry-tasks.js";

// Temporary construction metadata. Preserve every attribute, triangle order,
// winding and picking face; only identical vertex invocations can be reused.
const aliases = new WeakMap();

export function* prepareStaticVertexReuseSteps(copy, source) {
  // Missing normals are generated per triangle afterwards; aliasing before
  // that could join sharp corners. Missing UVs only receive uniform zeroes.
  if (copy.index || !copy.attributes.normal) return;
  yield* indexExactVerticesSteps(copy, { source });
  if (!copy.index) return;
  aliases.set(copy, copy.index.array);
  const original = new copy.index.array.constructor(copy.index.count);
  for (let i = 0; i < original.length; i++) {
    if ((i & 8191) === 0) yield;
    original[i] = i;
  }
  // Retain the released merge/vertex-cache order. Apply the aliases afterwards
  // so even coincident opaque triangles keep their original ordering.
  copy.setIndex(new BufferAttribute(original, 1));
}

export function* mergeStaticVertexReuseSteps(parts) {
  const geometry = yield* mergeSceneSteps(parts);
  if (!geometry || !parts.some(p => aliases.has(p))) return geometry;
  const vertices = parts.reduce((n, p) => n + p.attributes.position.count, 0),
    merged = new Uint32Array(vertices);
  let offset = 0;
  for (const part of parts) {
    const remap = aliases.get(part), count = part.attributes.position.count;
    for (let i = 0; i < count; i++) {
      if ((i & 8191) === 0) yield;
      merged[offset + i] = offset + (remap ? remap[i] : i);
    }
    offset += count;
    aliases.delete(part);
  }
  aliases.set(geometry, merged);
  return geometry;
}

export function* applyStaticVertexReuseSteps(geometry) {
  const remap = aliases.get(geometry);
  if (!remap || !geometry.index) return;
  const index = geometry.index.array;
  for (let i = 0; i < index.length; i++) {
    if ((i & 8191) === 0) yield;
    index[i] = remap[index[i]];
  }
  aliases.delete(geometry);
}
