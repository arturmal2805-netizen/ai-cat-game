import { MeshoptEncoder } from "meshoptimizer/encoder";
import { BufferAttribute } from "three";

// Repeated triangle vertices in authored non-indexed static props can reuse the
// exact same GPU vertex result. Keep ALL source attribute buffers and compare
// bytes, including normals/UVs/colours: this is not a tolerance-based weld.
const sharedIndices = new WeakMap();
// Only the static copy builders pass immutable sharedScenery primitives.
// Each copy owns its index; edits/reordering cannot poison the template.
export function* indexExactVerticesSteps(geometry, { source = null } = {}) {
  if (geometry.index || Object.keys(geometry.morphAttributes).length)
    return geometry;
  const attributes = Object.values(geometry.attributes);
  if (
    !attributes.length ||
    attributes.some((a) => a.isInterleavedBufferAttribute)
  )
    return geometry;
  const count = geometry.attributes.position?.count;
  if (!count || attributes.some((a) => a.count !== count)) return geometry;
  const shared = source?.userData.sharedScenery && !source.index,
    originals = shared ? Object.entries(source.attributes) : null,
    known = shared ? sharedIndices.get(source) : null;
  if (known && originals.length === known.attributes.length &&
      originals.every(([name,a], i) => name === known.attributes[i][0] &&
        a === known.attributes[i][1] && a.version === known.attributes[i][2])) {
    geometry.setIndex(known.index.clone());
    return geometry;
  }
  const streams = attributes.map((a) => ({
    bytes: new Uint8Array(
      a.array.buffer,
      a.array.byteOffset,
      a.array.byteLength,
    ),
    stride: a.itemSize * a.array.BYTES_PER_ELEMENT,
  }));
  const indices =
      count > 65535 ? new Uint32Array(count) : new Uint16Array(count),
    buckets = new Map();
  const equal = (a, b) =>
    streams.every(({ bytes, stride }) => {
      for (let i = 0; i < stride; i++)
        if (bytes[a * stride + i] !== bytes[b * stride + i]) return false;
      return true;
    });
  for (let vertex = 0; vertex < count; vertex++) {
    if ((vertex & 255) === 0) yield;
    let hash = 2166136261;
    for (const { bytes, stride } of streams)
      for (let i = vertex * stride; i < (vertex + 1) * stride; i++)
        hash = Math.imul(hash ^ bytes[i], 16777619);
    const previous = buckets.get(hash);
    let same;
    if (previous) same = previous.find((i) => equal(i, vertex));
    if (same === undefined) {
      indices[vertex] = vertex;
      if (previous) previous.push(vertex);
      else buckets.set(hash, [vertex]);
    } else indices[vertex] = same;
  }
  geometry.setIndex(new BufferAttribute(indices, 1));
  if (shared) sharedIndices.set(source, {
    index: geometry.index.clone(),
    attributes: originals.map(([name,a]) => [name,a,a.version]),
  });
  return geometry;
}

export function indexExactVertices(geometry) {
  const steps = indexExactVerticesSteps(geometry);
  let result;
  do { result = steps.next(); } while (!result.done);
  return result.value;
}

// Triangle order only: every vertex, strand, attribute, winding and triangle
// remains byte-exact. Neighbouring triangles reuse GPU vertex work instead of
// repeatedly running the skin/fish/material vertex shaders.
let ready = false;
if (MeshoptEncoder.supported)
  await MeshoptEncoder.ready.then(
    () => {
      ready = true;
    },
    () => {},
  );

export function optimizeGeometryCache(geometry) {
  if (
    !ready ||
    !geometry.index ||
    geometry.groups.length ||
    geometry.userData.strands ||
    geometry.userData.vertexCacheOptimized
  )
    return geometry;
  const source = geometry.index.array;
  if (source.length < 300) return geometry;
  const reordered = new Uint32Array(source),
    [remap, count] = MeshoptEncoder.reorderMesh(reordered, true, false),
    original = new Uint32Array(count),
    indices = new source.constructor(source.length);
  // Undo the library's vertex remap, preserving ALL existing vertex streams,
  // including skin weights, packed normals, fur coordinates and picking data.
  for (let i = 0; i < remap.length; i++)
    if (remap[i] !== 0xffffffff) original[remap[i]] = i;
  for (let i = 0; i < reordered.length; i++)
    indices[i] = original[reordered[i]];
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.userData.vertexCacheOptimized = true;
  return geometry;
}
