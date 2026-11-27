import * as T from "three";
// Opaque curved fleece tufts, one immutable rest mesh, skinned by the same cage
// when active. No alpha planes, extra fur pass or per-strand runtime objects.
export function cloudFleeceGeometry(size, count = 768) {
  const p = [],
    n = [],
    uv = [],
    [sx, sy, sz] = size,
    c = new T.Vector3(),
    normal = new T.Vector3(),
    t = new T.Vector3(),
    b = new T.Vector3(),
    up = new T.Vector3(0, 1, 0);
  for (let i = 0; i < count; i++) {
    const q = 0.04 + (0.94 * (i + 0.5)) / count,
      a = i * 2.3999632297,
      r = Math.sqrt(1 - (2 * q - 1) ** 2),
      x = Math.cos(a) * r,
      z = Math.sin(a) * r,
      y = 2 * q - 1;
    c.set(x * sx * 0.49, sy * 0.38 + y * sy * 0.37, z * sz * 0.49);
    if (c.y < 0.2) continue;
    normal.set(x / (sx * 0.49), y / (sy * 0.37), z / (sz * 0.49)).normalize();
    t.crossVectors(normal, up);
    if (t.lengthSq() < 0.001) t.set(1, 0, 0);
    t.normalize();
    b.crossVectors(normal, t).normalize();
    const h = 0.07 + 0.035 * Math.sin(i * 1.7),
      w = 0.027;
    for (const axis of [t, b])
      for (let s = 0; s < 2; s++) {
        const f = s * 0.5,
          g = (s + 1) * 0.5;
        const vertex = (u, v) => {
          const width = w * (1 - v * 0.8),
            curl = Math.sin(v * Math.PI) * 0.025;
          p.push(
            c.x + normal.x * h * v + axis.x * width * u + b.x * curl,
            c.y + normal.y * h * v + axis.y * width * u + b.y * curl,
            c.z + normal.z * h * v + axis.z * width * u + b.z * curl,
          );
          n.push(normal.x, normal.y, normal.z);
          uv.push(u * 0.5 + 0.5, v);
        };
        for (const [u, v] of [
          [-1, f],
          [1, f],
          [-1, g],
          [1, f],
          [1, g],
          [-1, g],
        ])
          vertex(u, v);
      }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(p, 3));
  g.setAttribute("normal", new T.Float32BufferAttribute(n, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  return g;
}
