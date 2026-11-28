import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
export function giantCatGeometry(size) {
  const [sx, sy, sz] = size,
    parts = [];
  const ellipsoid = (scale, centre, segments = 40) => {
    const g = new T.SphereGeometry(1, segments, 24);
    g.scale(...scale);
    g.translate(...centre);
    parts.push(g);
  };
  // Belly, head and four independently loaded paws all bind to the same volume.
  ellipsoid([sx * 0.43, sy * 0.32, sz * 0.34], [0, sy * 0.34, -sz * 0.12]);
  ellipsoid([sx * 0.33, sy * 0.29, sz * 0.24], [0, sy * 0.43, sz * 0.15]);
  for (const x of [-1, 1])
    for (const z of [-1, 1])
      ellipsoid(
        [sx * 0.17, sy * 0.115, sz * 0.16],
        [x * sx * 0.3, sy * 0.12, z * sz * 0.34],
        28,
      );
  const tail = new T.CatmullRomCurve3([
    new T.Vector3(sx * 0.22, sy * 0.22, -sz * 0.34),
    new T.Vector3(sx * 0.4, sy * 0.22, -sz * 0.42),
    new T.Vector3(sx * 0.48, sy * 0.3, -sz * 0.27),
    new T.Vector3(sx * 0.38, sy * 0.32, -sz * 0.23),
  ]);
  parts.push(new T.TubeGeometry(tail, 40, sy * 0.055, 10, false));
  const geometry = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  return geometry;
}
export function giantRestHeight(size, x, z) {
  const [sx, sy, sz] = size;
  let top = 0;
  const ellipse = (cx, cy, cz, rx, ry, rz) => {
    const q = 1 - ((x - cx) / rx) ** 2 - ((z - cz) / rz) ** 2;
    if (q >= 0) top = Math.max(top, cy + ry * Math.sqrt(q));
  };
  ellipse(0, sy * 0.34, -sz * 0.12, sx * 0.43, sy * 0.32, sz * 0.34);
  ellipse(0, sy * 0.43, sz * 0.15, sx * 0.33, sy * 0.29, sz * 0.24);
  for (const a of [-1, 1])
    for (const b of [-1, 1])
      ellipse(
        a * sx * 0.3,
        sy * 0.12,
        b * sz * 0.34,
        sx * 0.17,
        sy * 0.115,
        sz * 0.16,
      );
  return top;
}
