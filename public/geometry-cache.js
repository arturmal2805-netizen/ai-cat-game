import { MeshoptEncoder } from "meshoptimizer/encoder";
import { BufferAttribute } from "three";

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
