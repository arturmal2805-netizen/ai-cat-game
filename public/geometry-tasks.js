import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

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
    const attribute = source.clone();
    attribute.array = values;
    attribute.count = values.length / source.itemSize;
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
  return result;
}
