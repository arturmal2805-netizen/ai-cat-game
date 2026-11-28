import * as T from "three";
import { groomFur } from "./chichi-sculpt.js";
// Reuse the original game's continuous groom authoring for a NEW toy prop.
// This returns its own clone; no approved cat geometry/anatomy is modified.
export function cloudFleeceGeometry(size, count = 8000) {
  const surface = new T.SphereGeometry(1, 48, 32);
  surface.scale(size[0] * 0.49, size[1] * 0.37, size[2] * 0.49);
  surface.translate(0, size[1] * 0.38, 0);
  const g = groomFur(surface, count, {
    seed: 4419,
    length: 0.12,
    width: 0.003,
    region: "warehouse-cloud",
    colorRange: 1,
    surfaceKey: "warehouse-cloud-wool-v3-" + size.join(","),
  });
  surface.dispose();
  const p = g.attributes.position,
    uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = Math.atan2(p.getX(i), p.getZ(i)) / (Math.PI * 2) + 0.5;
    uv[i * 2 + 1] = p.getY(i) / size[1];
  }
  g.setAttribute("uv", new T.BufferAttribute(uv, 2));
  return g;
}
