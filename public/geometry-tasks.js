import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Baking needs an independent copy of the existing buffers, not a second
// procedural primitive. Geometry.clone() invokes its subclass constructor:
// SphereGeometry, TorusGeometry and RoundedBoxGeometry regenerate a default
// mesh before copy() immediately throws those newly computed arrays away.
// Use only for buffer baking, never for an editable procedural source model.
export function copyGeometryBuffers(source) {
  return new THREE.BufferGeometry().copy(source);
}

// Same indexed triangles and attributes as BufferGeometryUtils.mergeGeometries,
// but copying a large island's buffers must not monopolise one animation frame.
export function* mergeSceneSteps(parts) {
  if (!parts.length) return null;
  if (parts.some((g) => Object.keys(g.morphAttributes).length))
    return mergeGeometries(parts);
  const result = new THREE.BufferGeometry(),
    first = parts[0],
    names = Object.keys(first.attributes);
  if (
    parts.some(
      (g) =>
        !!g.index !== !!first.index ||
        Object.keys(g.attributes).length !== names.length,
    )
  )
    return null;
  for (const name of names) {
    const source = first.attributes[name];
    if (
      parts.some(
        (g) =>
          !g.attributes[name] ||
          g.attributes[name].array.constructor !== source.array.constructor ||
          g.attributes[name].itemSize !== source.itemSize ||
          g.attributes[name].normalized !== source.normalized,
      )
    )
      return null;
    const length = parts.reduce(
      (n, g) => n + g.attributes[name].array.length,
      0,
    );
    const values = new source.array.constructor(length);
    let offset = 0;
    for (const geometry of parts) {
      const data = geometry.attributes[name].array;
      for (let start = 0; start < data.length; start += 65536) {
        values.set(data.subarray(start, start + 65536), offset + start);
        yield;
      }
      offset += data.length;
    }
    // Preserve Float16/normalisation semantics without copying the complete
    // island-sized array a second time in a typed attribute constructor.
    const attribute = source.isFloat16BufferAttribute
      ? new THREE.Float16BufferAttribute([], source.itemSize, source.normalized)
      : new THREE.BufferAttribute(values, source.itemSize, source.normalized);
    attribute.array = values;
    attribute.count = values.length / source.itemSize;
    attribute.name = source.name;
    attribute.usage = source.usage;
    attribute.gpuType = source.gpuType;
    result.setAttribute(name, attribute);
    yield;
  }
  if (first.index) {
    const vertices = parts.reduce((n, g) => n + g.attributes.position.count, 0),
      length = parts.reduce((n, g) => n + g.index.count, 0);
    const values =
      vertices > 65535 ? new Uint32Array(length) : new Uint16Array(length);
    let offset = 0,
      base = 0;
    for (const geometry of parts) {
      const data = geometry.index;
      for (let start = 0; start < data.count; start += 8192) {
        for (let i = start; i < Math.min(data.count, start + 8192); i++)
          values[offset + i] = data.getX(i) + base;
        yield;
      }
      offset += data.count;
      base += geometry.attributes.position.count;
    }
    result.setIndex(new THREE.BufferAttribute(values, 1));
  }
  // First-view culling must not synchronously scan an island-sized buffer.
  // Compute the same bounds during the cooperative preparation slices.
  yield* geometryBoundsSteps(result);
  return result;
}

export function* geometryBoundsSteps(geometry) {
  const a = geometry.attributes.position;
  if (!a) return;
  const box = new THREE.Box3(),
    p = new THREE.Vector3(),
    center = new THREE.Vector3();
  for (let i = 0; i < a.count; i++) {
    if ((i & 4095) === 0) yield;
    p.fromBufferAttribute(a, i);
    box.expandByPoint(p);
  }
  box.getCenter(center);
  let radiusSq = 0;
  for (let i = 0; i < a.count; i++) {
    if ((i & 4095) === 0) yield;
    radiusSq = Math.max(
      radiusSq,
      p.fromBufferAttribute(a, i).distanceToSquared(center),
    );
  }
  geometry.boundingBox = box;
  geometry.boundingSphere = new THREE.Sphere(center, Math.sqrt(radiusSq));
}
