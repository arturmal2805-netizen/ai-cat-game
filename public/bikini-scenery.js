import * as THREE from "three";
import { shape, line, torus, lantern } from "./fantasy-scenery.js";
const paints = new Map();
export function part(g, kind, color, ...v) {
  const p = shape(g, kind, color, ...v);
  if (!paints.has(color)) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.68 });
    m.userData.sharedScenery = true;
    paints.set(color, m);
  }
  p.material = paints.get(color);
  return p;
}
function window(g, x, y, z, r = 0.5) {
  const ring = torus(g, 0x8dc3db, r, 0.11, x, y, z);
  ring.rotation.x = 0;
  const glass = part(
    g,
    "pole",
    0x3aa7de,
    x,
    y,
    z + 0.03,
    r * 0.83,
    0.08,
    r * 0.83,
  );
  glass.rotation.x = Math.PI / 2;
  for (let j = 0; j < 8; j++)
    part(
      g,
      "sphere",
      0xe1edda,
      x + Math.cos((j * Math.PI) / 4) * r,
      y + Math.sin((j * Math.PI) / 4) * r,
      z + 0.06,
      0.035,
      0.035,
      0.035,
    );
  part(
    g,
    "sphere",
    0xbfe6ef,
    x - r * 0.22,
    y + r * 0.25,
    z + 0.09,
    r * 0.17,
    r * 0.29,
    0.025,
  );
}
export function* pineappleHouseSteps(g) {
  part(g, "sphere", 0xf6ae40, 0, 3.7, 0, 2.65, 3.7, 2.65);
  // Intersecting diamond lines follow the actual curved fruit surface.
  for (const side of [-1, 1])
    for (let i = 0; i < 16; i++) {
      let previous;
      for (let j = 0; j <= 24; j++) {
        const a = -1.25 + (j * 2.5) / 24,
          angle = (i * Math.PI) / 8 + side * a * 1.3,
          r = Math.cos(a) * 2.68,
          p = [
            Math.sin(angle) * r,
            3.7 + Math.sin(a) * 3.7,
            Math.cos(angle) * r,
          ];
        if (previous) line(g, previous, p, 0xd98a34, 0.025);
        previous = p;
      }
      yield;
    }
  for (let j = 0; j < 15; j++) {
    const a = j * 2.399,
      r = 1 + (j % 3) * 0.32;
    const leaf = part(
      g,
      "petal",
      [0x729d35, 0x9fbd49, 0x609b39][j % 3],
      Math.sin(a) * r * 0.55,
      8 + (j % 3) * 0.6,
      Math.cos(a) * r * 0.55,
      0.32,
      2.2 + (j % 2) * 0.45,
      0.13,
    );
    leaf.rotation.set(Math.cos(a) * 0.42, a, -Math.sin(a) * 0.42);
    yield;
  }
  window(g, -1.15, 4.6, 2.1, 0.53);
  window(g, 1.3, 3.4, 2.25, 0.48);
  part(g, "sphere", 0x6db4db, 0, 1.25, 2.55, 0.87, 1.25, 0.18);
  window(g, 0, 1.35, 2.77, 0.57);
  line(g, [0, 0.85, 2.93], [0, 1.75, 2.93], 0xd3e7da, 0.06);
  line(g, [-0.43, 1.3, 2.93], [0.43, 1.3, 2.93], 0xd3e7da, 0.06);
  part(g, "pole", 0xc8bba4, 0, 0.2, 3.1, 1.3, 0.3, 0.8);
}
export function moaiHouse(g) {
  part(g, "cube", 0x8095a5, 0, 3.4, 0, 4, 6.8, 3.3);
  part(g, "cube", 0x7b8e9e, 0, 6.9, 0, 3.7, 0.5, 3.1);
  for (const s of [-1, 1]) {
    window(g, s * 1.03, 4.9, 1.77, 0.56);
    part(g, "cube", 0x697e91, s * 0.97, 5.6, 1.82, 1.55, 0.35, 0.45);
  }
  part(g, "cube", 0x708498, 0, 3.8, 2, 0.73, 2.2, 0.83);
  part(g, "cube", 0x5d778f, 0, 2.45, 1.94, 2.35, 0.39, 0.5);
  part(g, "sphere", 0x5d99b0, 0, 0.95, 1.75, 0.65, 0.95, 0.13);
  part(g, "sphere", 0xe4d593, 0.32, 1, 1.9, 0.06, 0.06, 0.04);
}
export function rockHouse(g) {
  part(g, "dome", 0xa9958b, 0, 0, 0, 3.3, 2.5, 2.8);
  part(g, "sphere", 0x978778, 0, 0.18, 0, 3.4, 0.23, 2.9);
  const antenna = part(g, "pole", 0xb9a578, 0, 3.2, 0, 0.045, 2, 0.045);
  for (const s of [-1, 1])
    line(g, [0, 3.8, 0], [s * 0.8, 4.15, 0], 0x967e65, 0.035);
  part(g, "cube", 0xe4d4a7, 2.6, 1, 1.7, 0.8, 0.55, 0.08);
  line(g, [2.6, 0, 1.7], [2.6, 1.3, 1.7], 0x9b8260, 0.06);
}
export function tubeHouse(g, lighthouse = false) {
  for (let j = 0; j < 5; j++)
    part(
      g,
      "pole",
      lighthouse ? (j % 2 ? 0xefb9a7 : 0xffe8ce) : 0xaca7d6,
      0,
      0.7 + j * 0.85,
      0,
      1.2 - j * 0.05,
      0.88,
      1.2 - j * 0.05,
    );
  part(g, "pole", 0x829dbb, 0, 5.4, 0, 0.63, 1.7, 0.63);
  part(g, "pole", 0x7c91b3, 0, 6.3, 0, 0.82, 0.16, 0.82);
  window(g, 0, 2.7, 1.1, 0.35);
  part(g, "sphere", 0x678bb0, 0, 0.8, 1.15, 0.42, 0.7, 0.08);
  if (lighthouse) lantern(g, 0, 5.4, 0, 0.6);
}
export function seaGarden(g, x, z, index, y = 0.16) {
  const colors = [0xeaa2bd, 0xf1c665, 0xad9ed8, 0x6bbba3];
  for (let j = 0; j < 4; j++) {
    const a = j * 2.399 + index,
      px = x + Math.sin(a) * 0.4,
      pz = z + Math.cos(a) * 0.4,
      h = 0.45 + (j % 3) * 0.35;
    line(
      g,
      [px, y, pz],
      [px + Math.sin(a) * 0.12, y + h, pz],
      colors[index % colors.length],
      0.065,
    );
    for (const s of [-1, 1])
      line(
        g,
        [px, y + h * 0.5, pz],
        [px + s * 0.22, y + h * 0.8, pz + 0.05],
        colors[index % colors.length],
        0.05,
      );
  }
  for (let j = 0; j < 3; j++) {
    const leaf = part(
      g,
      "petal",
      j % 2 ? 0x7dba73 : 0x9dbd71,
      x + Math.sin(j * 2.4) * 0.7,
      y + 0.55,
      z + Math.cos(j * 2.4) * 0.7,
      0.14,
      0.75 + j * 0.22,
      0.055,
    );
    leaf.rotation.z = Math.sin(index + j) * 0.35;
  }
  if (index % 2 === 0) {
    part(g, "sphere", 0xf4e0cc, x + 0.8, y + 0.08, z, 0.32, 0.13, 0.27);
    for (let j = 0; j < 5; j++)
      line(
        g,
        [x + 0.8, y + 0.16, z - 0.15],
        [x + 0.62 + j * 0.09, y + 0.17, z + 0.17],
        0xd5b9ac,
        0.014,
      );
  }
}
