import * as T from "three";
// Rounded fleece clusters share one opaque skinned buffer. Curved normals avoid
// the sharp paper ribbons of the rejected first fleece; no per-fibre runtime.
export function cloudFleeceGeometry(size, count = 1152) {
  const source = new T.SphereGeometry(1, 8, 6),
    sp = source.attributes.position,
    sn = source.attributes.normal,
    si = source.index,
    positions = [],
    normals = [],
    uvs = [],
    indices = [];
  const c = new T.Vector3(),
    normal = new T.Vector3(),
    up = new T.Vector3(0, 1, 0),
    q = new T.Quaternion(),
    v = new T.Vector3();
  for (let i = 0; i < count; i++) {
    const f = (i + 0.5) / count,
      y = 2 * f - 1,
      a = i * 2.3999632297,
      r = Math.sqrt(1 - y * y),
      x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    c.set(
      x * size[0] * 0.49,
      size[1] * 0.38 + y * size[1] * 0.37,
      z * size[2] * 0.49,
    );
    if (c.y < 0.18) continue;
    normal
      .set(x / (size[0] * 0.49), y / (size[1] * 0.37), z / (size[2] * 0.49))
      .normalize();
    q.setFromUnitVectors(up, normal);
    const offset = positions.length / 3,
      width = 0.062 + 0.012 * Math.sin(i * 1.7),
      height = 0.055 + 0.015 * Math.cos(i * 0.7);
    for (let j = 0; j < sp.count; j++) {
      v.fromBufferAttribute(sp, j)
        .multiply(new T.Vector3(width, height, width))
        .applyQuaternion(q)
        .add(c);
      positions.push(v.x, v.y, v.z);
      v.fromBufferAttribute(sn, j).applyQuaternion(q);
      normals.push(v.x, v.y, v.z);
      uvs.push(source.attributes.uv.getX(j), source.attributes.uv.getY(j));
    }
    for (let j = 0; j < si.count; j++) indices.push(si.array[j] + offset);
  }
  source.dispose();
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new T.Float32BufferAttribute(normals, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  return g;
}
