import * as THREE from "three";

// Cross-sections of a muscular marine reptile. Width, dorsal and ventral
// surfaces are independent, so the skull is broad and flat rather than a cone.
const BODY = [
  [-10.6, 0.015, -0.08, -0.13],
  [-9.6, 0.22, 0.12, -0.35],
  [-8, 0.48, 0.4, -0.65],
  [-6, 0.9, 0.75, -0.92],
  [-4, 1.38, 1.22, -1.35],
  [-1.8, 1.75, 1.45, -1.55],
  [0, 1.85, 1.36, -1.5],
  [1.7, 1.64, 1.3, -1.4],
  [2.9, 1.32, 1.09, -0.91],
  [3.8, 1.12, 0.92, -0.65],
  [4.35, 0.65, 0.6, -0.4],
];
const SKULL = [
  [2.95, 0.75, 0.85, -0.65],
  [3.65, 1.24, 1.15, -0.67],
  [4.3, 1.43, 1.19, -0.24],
  [5.1, 1.26, 1.02, -0.1],
  [6.5, 1.03, 0.87, 0.03],
  [8, 0.83, 0.73, 0.15],
  [9, 0.67, 0.68, 0.22],
  [9.4, 0.48, 0.62, 0.26],
  [9.65, 0.035, 0.48, 0.4],
];
// Jaw coordinates are relative to the actual hinge at z=3.35, y=-.32.
const JAW = [
  [0, 0.85, 0.06, -0.48],
  [0.7, 1.23, 0.15, -0.46],
  [2, 1.15, 0.25, -0.48],
  [3.8, 0.9, 0.34, -0.25],
  [5.1, 0.58, 0.43, -0.02],
  [5.95, 0.035, 0.39, 0.32],
];
const cache = new Map();
function slope(a, b) {
  return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
}
function section(rows, z, c) {
  let i = 1;
  while (i < rows.length - 1 && rows[i][0] < z) i++;
  const a = rows[i - 1],
    b = rows[i],
    d = b[0] - a[0],
    u = THREE.MathUtils.clamp((z - a[0]) / d, 0, 1),
    v = (b[c] - a[c]) / d,
    before = rows[Math.max(0, i - 2)],
    after = rows[Math.min(rows.length - 1, i + 1)],
    m0 = i === 1 ? v : slope((a[c] - before[c]) / (a[0] - before[0]), v),
    m1 =
      i === rows.length - 1
        ? v
        : slope(v, (after[c] - b[c]) / (after[0] - b[0]));
  return (
    (2 * u ** 3 - 3 * u * u + 1) * a[c] +
    (u ** 3 - 2 * u * u + u) * d * m0 +
    (-2 * u ** 3 + 3 * u * u) * b[c] +
    (u ** 3 - u * u) * d * m1
  );
}
function surface(
  rows,
  { rings = 96, sides = 36, skull = false, jaw = false } = {},
) {
  const positions = [],
    colors = [],
    uv = [],
    indices = [],
    blue = new THREE.Color(jaw ? 0xbad8db : 0x286b94),
    light = new THREE.Color(0xdce7dc),
    dark = new THREE.Color(0x184b74),
    color = new THREE.Color();
  for (let i = 0; i <= rings; i++) {
    const z = THREE.MathUtils.lerp(rows[0][0], rows.at(-1)[0], i / rings),
      width = section(rows, z, 1),
      top = section(rows, z, 2),
      bottom = section(rows, z, 3),
      middle = (top + bottom) / 2,
      height = (top - bottom) / 2;
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2,
        sn = Math.sin(a),
        cs = Math.cos(a),
        x = Math.sign(cs) * Math.abs(cs) ** (skull ? 0.73 : 0.94) * width,
        y =
          middle +
          Math.sign(sn) * Math.abs(sn) ** (skull ? 0.72 : 0.93) * height,
        belly = THREE.MathUtils.smoothstep(-sn, 0.05, 0.72),
        patches = Math.sin(z * 3.8 + cs * 9) * Math.cos(a * 8 - z * 2.4),
        speckle = THREE.MathUtils.smoothstep(patches, 0.35, 0.95) * 0.28;
      color
        .copy(blue)
        .lerp(dark, Math.max(0, sn) * 0.24 + speckle * (1 - belly));
      color.lerp(light, jaw ? 0.32 + belly * 0.6 : belly * 0.96);
      color.multiplyScalar(0.96 + Math.sin(z * 17 + a * 21) * 0.025);
      positions.push(x, y, z);
      colors.push(color.r, color.g, color.b);
      uv.push((j / sides) * 3, z * 0.24);
      if (i < rings && j < sides) {
        const n = i * (sides + 1) + j;
        indices.push(
          n,
          n + 1,
          n + sides + 1,
          n + 1,
          n + sides + 2,
          n + sides + 1,
        );
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
function paddle() {
  const positions = [],
    colors = [],
    uv = [],
    indices = [],
    rings = 28,
    sides = 20,
    top = new THREE.Color(0x367c9e),
    bottom = new THREE.Color(0xb8d5d4),
    color = new THREE.Color();
  for (let i = 0; i <= rings; i++) {
    const t = i / rings,
      x = t * 3.6,
      centerZ = -0.1 - t * 1.65,
      centerY = -t * t * 0.26,
      width = 0.04 + Math.sin(Math.PI * t) ** 0.7 * (0.8 - t * 0.18),
      thick = 0.015 + 0.23 * (1 - t) * Math.sin(Math.PI * (t * 0.8 + 0.1));
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2;
      positions.push(
        x,
        centerY + Math.sin(a) * thick,
        centerZ + Math.cos(a) * width,
      );
      color
        .copy(top)
        .lerp(bottom, THREE.MathUtils.smoothstep(-Math.sin(a), 0, 0.8));
      colors.push(color.r, color.g, color.b);
      uv.push(t * 2, j / sides);
      if (i < rings && j < sides) {
        const n = i * (sides + 1) + j;
        indices.push(
          n,
          n + sides + 1,
          n + 1,
          n + 1,
          n + sides + 1,
          n + sides + 2,
        );
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
export function mosasaurGeometry(kind) {
  if (cache.has(kind)) return cache.get(kind);
  let g;
  if (kind === "body") g = surface(BODY);
  else if (kind === "skull") g = surface(SKULL, { rings: 72, skull: true });
  else if (kind === "jaw")
    g = surface(JAW, { rings: 60, sides: 28, skull: true, jaw: true });
  else if (kind === "paddle") g = paddle();
  else throw new RangeError("Unknown mosasaur surface");
  g.userData.sharedScenery = true;
  cache.set(kind, g);
  return g;
}
let scales;
export function mosasaurScales() {
  if (scales) return scales;
  const n = 256,
    data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const row = Math.floor(y / 16),
        u = (((x + (row % 2) * 8) % 16) - 8) / 8,
        v = ((y % 16) - 8) / 8,
        r = Math.hypot(u, v * 0.85),
        seam = THREE.MathUtils.smoothstep(r, 0.65, 0.95),
        value = Math.round(190 - seam * 38 + Math.sin(x * 2.1 + y * 1.8) * 3),
        i = (y * n + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    }
  scales = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  scales.name = "Shared small reptile scale relief";
  scales.wrapS = scales.wrapT = THREE.RepeatWrapping;
  scales.generateMipmaps = true;
  scales.minFilter = THREE.LinearMipmapLinearFilter;
  scales.magFilter = THREE.LinearFilter;
  scales.needsUpdate = true;
  scales.userData.sharedScenery = true;
  return scales;
}
