import * as THREE from "three";
import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

// Reference kitten, in metres. These are surfaces, not overlapping cheek balls.
// The rig stays in cat-model.js; all fur here is exportable triangle geometry.
export const CHICHI_COAT = 0x777c80;
export const CHICHI_EYES = 0xadc35e;
export const CHICHI_ANATOMY = Object.freeze({
  bodyY: 0.79,
  bodyX: 0.405,
  bodyHeight: 0.43,
  bodyLength: 0.585,
  headY: 1.25,
  headZ: 0.46,
  headPitch: -0.28,
  headRoll: 0.08,
  pupilX: 0.094,
  pupilY: 0.108,
  jawY: -0.24,
  legY: 0.48,
});
const cache = new Map();
const furCache = new Map();

// Remove marching-grid ripples without shrinking the silhouette or the paws.
function polishSurface(g) {
  const p = g.attributes.position,
    neighbors = Array.from({ length: p.count }, () => new Set()),
    index = g.index;
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i),
      b = index.getX(i + 1),
      c = index.getX(i + 2);
    for (const [x, y] of [
      [a, b],
      [b, c],
      [c, a],
    ]) {
      neighbors[x].add(y);
      neighbors[y].add(x);
    }
  }
  const positions = p.array,
    next = new Float32Array(positions.length);
  for (let iteration = 0; iteration < 3; iteration++)
    for (const factor of [0.45, -0.47]) {
      for (let i = 0; i < p.count; i++)
        for (let axis = 0; axis < 3; axis++) {
          let sum = 0;
          for (const v of neighbors[i]) sum += positions[v * 3 + axis];
          next[i * 3 + axis] =
            positions[i * 3 + axis] +
            (sum / neighbors[i].size - positions[i * 3 + axis]) * factor;
        }
      positions.set(next);
    }
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

function randomSequence(seed) {
  return () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
}

export function kittenSurface(kind, detailed) {
  const key = kind + detailed;
  if (!cache.has(key)) {
    const size = detailed ? 76 : 34,
      domain = 1.34,
      clay = new MarchingCubes(
        size,
        new THREE.MeshBasicMaterial(),
        false,
        false,
        35000,
      );
    clay.isolation = 0;
    const shapes =
      kind === "face"
        ? [
            [0, 0.06, -0.09, 0.99, 0.91, 0.86],
            [-0.58, -0.25, 0.1, 0.43, 0.43, 0.65],
            [0.58, -0.25, 0.1, 0.43, 0.43, 0.65],
            [-0.43, 0.24, 0.47, 0.34, 0.25, 0.37],
            [0.43, 0.24, 0.47, 0.34, 0.25, 0.37],
            [-0.25, -0.42, 0.76, 0.42, 0.28, 0.34],
            [0.25, -0.42, 0.76, 0.42, 0.28, 0.34],
            [0, -0.6, 0.59, 0.46, 0.22, 0.3],
          ]
        : [
            [0, 0, -0.09, 0.94, 0.95, 0.95],
            [0, 0.22, 0.49, 0.76, 0.91, 0.56],
            [-0.47, -0.24, -0.48, 0.48, 0.63, 0.5],
            [0.47, -0.24, -0.48, 0.48, 0.63, 0.5],
          ];
    const soft = 0.23;
    for (let z = 0; z < size; z++)
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const px = ((x / size) * 2 - 1) * domain,
            py = ((y / size) * 2 - 1) * domain,
            pz = ((z / size) * 2 - 1) * domain;
          let d = 10;
          for (const [cx, cy, cz, rx, ry, rz] of shapes) {
            const v =
                (Math.hypot((px - cx) / rx, (py - cy) / ry, (pz - cz) / rz) -
                  1) *
                Math.min(rx, ry, rz),
              h = Math.max(soft - Math.abs(d - v), 0) / soft;
            d = Math.min(d, v) - h * h * soft * 0.25;
          }
          // Shallow eye sockets wrap the large globes rather than perch them on top.
          if (kind === "face" && pz > 0.48) {
            for (const side of [-1, 1]) {
              const socket =
                (Math.hypot(
                  (px - side * 0.403) / 0.27,
                  (py - 0.025) / 0.29,
                  (pz - 0.83) / 0.37,
                ) -
                  1) *
                0.3;
              d = Math.max(d, -socket);
            }
          }
          clay.field[x + y * size + z * size * size] = -d;
        }
    clay.update();
    const raw = new THREE.BufferGeometry();
    raw.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        clay.geometry.attributes.position.array.slice(0, clay.count * 3),
        3,
      ),
    );
    raw.scale(domain, domain, domain);
    const g = mergeVertices(raw, 0.00005);
    raw.dispose();
    clay.geometry.dispose();
    clay.material.dispose();
    polishSurface(g);
    cache.set(key, g);
  }
  const g = cache.get(key).clone();
  if (kind === "face") g.scale(0.545, 0.443, 0.435);
  const p = g.attributes.position,
    colors = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const c = new THREE.Color(0xffffff);
    let light =
      0.94 +
      Math.sin(x * 193 + y * 167 + z * 133) *
        Math.sin(z * 211 - y * 117) *
        0.018;
    if (kind === "face") {
      const muzzle =
        Math.exp(-((x / 0.31) ** 2 + ((y + 0.19) / 0.16) ** 2)) *
        THREE.MathUtils.smoothstep(z, 0.31, 0.44);
      light += muzzle * 0.29;
      // Gentle darker brows and cheek roots, with no tabby stripes.
      light -=
        Math.exp(
          -(((Math.abs(x) - 0.25) / 0.2) ** 2 + ((y - 0.18) / 0.09) ** 2),
        ) * 0.055;
    }
    c.multiplyScalar(light / (kind === "face" ? 1.3 : 1));
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return g;
}

// Area-weighted sampling on the actual sculpt. Every root lies on its triangle;
// the groom follows skin normals and a tangent, including the cheeks and ears.
export function groomFur(
  surface,
  count,
  {
    seed = 1427,
    length = 0.019,
    width = 0.00075,
    region = "body",
    colorRange = 1.5,
  } = {},
) {
  const key = [
    region,
    count,
    seed,
    length,
    width,
    colorRange,
    surface.attributes.position.count,
  ].join(":");
  if (furCache.has(key)) return furCache.get(key).clone();
  const p = surface.attributes.position,
    n = surface.attributes.normal,
    c = surface.attributes.color,
    idx = surface.index,
    triangles = (idx ? idx.count : p.count) / 3,
    areas = new Float64Array(triangles),
    a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    d = new THREE.Vector3(),
    cross = new THREE.Vector3();
  let total = 0;
  for (let t = 0; t < triangles; t++) {
    a.fromBufferAttribute(p, idx ? idx.getX(t * 3) : t * 3);
    b.fromBufferAttribute(p, idx ? idx.getX(t * 3 + 1) : t * 3 + 1).sub(a);
    d.fromBufferAttribute(p, idx ? idx.getX(t * 3 + 2) : t * 3 + 2).sub(a);
    total += cross.crossVectors(b, d).length() * 0.5;
    areas[t] = total;
  }
  const random = randomSequence(seed),
    vertices = [],
    normals = [],
    colors = [],
    indices = [],
    root = new THREE.Vector3(),
    normal = new THREE.Vector3(),
    groom = new THREE.Vector3(),
    across = new THREE.Vector3(),
    up = new THREE.Vector3(),
    base = new THREE.Vector3(),
    color = new THREE.Color();
  let strands = 0;
  for (let i = 0; i < count; i++) {
    const target = random() * total;
    let lo = 0,
      hi = triangles - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (areas[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    const triangle = [0, 1, 2].map((k) =>
        idx ? idx.getX(lo * 3 + k) : lo * 3 + k,
      ),
      s = Math.sqrt(random()),
      weights = [1 - s, s * (1 - random()), 0];
    weights[2] = 1 - weights[0] - weights[1];
    root.set(0, 0, 0);
    normal.set(0, 0, 0);
    color.setRGB(0, 0, 0);
    for (let k = 0; k < 3; k++) {
      root.addScaledVector(a.fromBufferAttribute(p, triangle[k]), weights[k]);
      normal.addScaledVector(a.fromBufferAttribute(n, triangle[k]), weights[k]);
      if (c) {
        color.r += c.getX(triangle[k]) * weights[k];
        color.g += c.getY(triangle[k]) * weights[k];
        color.b += c.getZ(triangle[k]) * weights[k];
      }
    }
    normal.normalize();
    if (!c) color.set(0xffffff);
    // Leave the soft ear skin and recessed eye sockets clear.
    if (
      region === "ear" &&
      normal.z > 0.4 &&
      Math.abs(root.x) < 0.13 &&
      root.y > 0.08 &&
      root.y < 0.35
    )
      continue;
    if (
      region === "face" &&
      root.z > 0.22 &&
      Math.abs(Math.abs(root.x) - 0.235) < 0.15 &&
      Math.abs(root.y - 0.012) < 0.15
    )
      continue;
    if (region === "face") {
      groom.set(root.x * 0.65, root.y > 0.03 ? 0.4 : -0.6, 0.08);
      if (root.y > 0.12) groom.set(root.x * 0.4, 0.6, -0.1);
    } else if (region === "tail") groom.set(0, 1, -0.15);
    else if (region === "ear") groom.set(0, 1, 0);
    else groom.set(0, -0.65, -0.75);
    groom.addScaledVector(normal, -groom.dot(normal)).normalize();
    if (groom.lengthSq() < 0.1)
      groom.set(1, 0, 0).addScaledVector(normal, -normal.x).normalize();
    across.crossVectors(normal, groom).normalize();
    const len = length * (0.65 + random() * 0.7),
      w = width * (0.65 + random() * 0.5),
      shade = 0.79 + random() * 0.28;
    base.copy(root).addScaledVector(normal, -0.0006);
    const start = vertices.length / 3;
    for (let step = 0; step < 3; step++) {
      const t = step / 2;
      up.copy(base)
        .addScaledVector(groom, len * t * 0.68)
        .addScaledVector(normal, len * (t * 0.48 - t * t * 0.12));
      for (const side of step === 2 ? [0] : [-1, 1]) {
        a.copy(up).addScaledVector(across, side * w * (1 - t) * 0.5);
        vertices.push(...a);
        normals.push(...normal);
        const value = shade + t * 0.12;
        colors.push(color.r * value, color.g * value, color.b * value);
      }
    }
    indices.push(
      start,
      start + 2,
      start + 1,
      start + 1,
      start + 2,
      start + 3,
      start + 2,
      start + 4,
      start + 3,
    );
    strands++;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  // Normalised attributes preserve every strand at a fraction of float-buffer
  // cost. 1/32767 normals and 1.5/255 coat colours have sub-pixel error.
  g.setAttribute(
    "normal",
    new THREE.Int16BufferAttribute(
      normals.map((v) => Math.round(THREE.MathUtils.clamp(v, -1, 1) * 32767)),
      3,
      true,
    ),
  );
  g.setAttribute(
    "color",
    new THREE.Uint8BufferAttribute(
      colors.map((v) =>
        Math.round(THREE.MathUtils.clamp(v / colorRange, 0, 1) * 255),
      ),
      3,
      true,
    ),
  );
  g.setIndex(indices);
  g.userData.strands = strands;
  furCache.set(key, g.clone());
  return g;
}

export function kittenLeg(front, detailed) {
  const key = "leg:" + front + ":" + detailed;
  if (cache.has(key)) return cache.get(key).clone();
  const size = detailed ? 54 : 28,
    clay = new MarchingCubes(
      size,
      new THREE.MeshBasicMaterial(),
      false,
      false,
      18000,
    );
  clay.isolation = 0;
  const volumes = [
    [
      0,
      0.015,
      front > 0 ? -0.025 : -0.05,
      0.139,
      0.285,
      front > 0 ? 0.13 : 0.15,
    ],
    [0, -0.23, 0, 0.112, 0.19, 0.115],
    [0, -0.389, 0.065, 0.143, 0.094, 0.173],
    [-0.071, -0.4, 0.177, 0.055, 0.056, 0.062],
    [0, -0.405, 0.187, 0.055, 0.054, 0.062],
    [0.071, -0.4, 0.177, 0.055, 0.056, 0.062],
  ];
  for (let z = 0; z < size; z++)
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const px = ((x / size) * 2 - 1) * 0.235,
          py = ((y / size) * 2 - 1) * 0.43 - 0.1,
          pz = ((z / size) * 2 - 1) * 0.28;
        let d = 10;
        for (const [cx, cy, cz, rx, ry, rz] of volumes) {
          const v =
              (Math.hypot((px - cx) / rx, (py - cy) / ry, (pz - cz) / rz) - 1) *
              Math.min(rx, ry, rz),
            h = Math.max(0.036 - Math.abs(d - v), 0) / 0.036;
          d = Math.min(d, v) - h * h * 0.009;
        }
        clay.field[x + y * size + z * size * size] = -d;
      }
  clay.update();
  const raw = new THREE.BufferGeometry();
  raw.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      clay.geometry.attributes.position.array.slice(0, clay.count * 3),
      3,
    ),
  );
  raw.scale(0.235, 0.43, 0.28);
  raw.translate(0, -0.1, 0);
  const g = mergeVertices(raw, 0.00001);
  raw.dispose();
  clay.geometry.dispose();
  clay.material.dispose();
  polishSurface(g);
  g.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(
      new Float32Array(g.attributes.position.count * 3).fill(0.97),
      3,
    ),
  );
  cache.set(key, g.clone());
  return g;
}

export function kittenEar(side) {
  const vertices = [],
    colors = [],
    indices = [],
    rows = 24,
    cols = 18,
    gray = new THREE.Color(CHICHI_COAT),
    pink = new THREE.Color(0x926f74);
  for (let back = 0; back < 2; back++)
    for (let j = 0; j <= rows; j++)
      for (let i = 0; i <= cols; i++) {
        const t = j / rows,
          u = (i / cols) * 2 - 1,
          w = 0.205 * Math.pow(1 - t, 0.73) + 0.003,
          y = t * 0.46,
          z =
            (back ? -0.052 : 0.057) -
            Math.sin(t * Math.PI) * (1 - u * u) * (back ? -0.018 : 0.046) -
            t * t * 0.075;
        vertices.push(u * w + side * 0.028 * t, y, z);
        const interior = back
          ? 0
          : THREE.MathUtils.smoothstep(t, 0.09, 0.23) *
            (1 - THREE.MathUtils.smoothstep(t, 0.82, 0.98)) *
            (1 - THREE.MathUtils.smoothstep(Math.abs(u), 0.55, 0.88));
        const color = gray.clone().lerp(pink, interior * 0.88);
        colors.push(color.r, color.g, color.b);
      }
  const offset = (rows + 1) * (cols + 1);
  for (let back = 0; back < 2; back++)
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const v = back * offset + j * (cols + 1) + i;
        if (back)
          indices.push(
            v,
            v + cols + 1,
            v + 1,
            v + 1,
            v + cols + 1,
            v + cols + 2,
          );
        else
          indices.push(
            v,
            v + 1,
            v + cols + 1,
            v + 1,
            v + cols + 2,
            v + cols + 1,
          );
      }
  for (let j = 0; j < rows; j++)
    for (const i of [0, cols]) {
      const v = j * (cols + 1) + i,
        w = v + cols + 1;
      if (i === 0) indices.push(v, w, v + offset, w, w + offset, v + offset);
      else indices.push(v, v + offset, w, w, v + offset, w + offset);
    }
  for (let i = 0; i < cols; i++) {
    const v = rows * (cols + 1) + i;
    indices.push(v, v + 1, v + offset, v + 1, v + offset + 1, v + offset);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export function kittenIris(detailed) {
  const rings = detailed ? 14 : 6,
    segments = detailed ? 256 : 40,
    vertices = [0, 0, 0.034],
    colors = [],
    indices = [],
    light = new THREE.Color(CHICHI_EYES),
    gold = new THREE.Color(0xd1c77a),
    edge = new THREE.Color(0x536349);
  colors.push(gold.r, gold.g, gold.b);
  for (let j = 1; j <= rings; j++)
    for (let i = 0; i <= segments; i++) {
      const r = j / rings,
        a = (i / segments) * Math.PI * 2;
      vertices.push(Math.cos(a) * r, Math.sin(a) * r, 0.034 * (1 - r * r));
      const ray =
          Math.sin(a * 57 + Math.sin(a * 31) * 2 + r * 37) * 0.07 +
          Math.sin(a * 113 - r * 23) * 0.035,
        color = gold
          .clone()
          .lerp(light, THREE.MathUtils.smoothstep(r, 0.3, 0.82));
      color
        .lerp(edge, THREE.MathUtils.smoothstep(r, 0.88, 1) * 0.9)
        .multiplyScalar(0.92 + ray);
      colors.push(color.r, color.g, color.b);
    }
  for (let i = 0; i < segments; i++) indices.push(0, 1 + i, 2 + i);
  for (let j = 0; j < rings - 1; j++)
    for (let i = 0; i < segments; i++) {
      const k = 1 + j * (segments + 1) + i;
      indices.push(
        k,
        k + segments + 1,
        k + 1,
        k + 1,
        k + segments + 1,
        k + segments + 2,
      );
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

export function kittenPupil(detailed) {
  const g = kittenIris(detailed),
    p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = (p.getX(i) * CHICHI_ANATOMY.pupilX) / 0.143,
      y = (p.getY(i) * CHICHI_ANATOMY.pupilY) / 0.151;
    p.setZ(i, 0.035 - 0.034 * (x * x + y * y));
  }
  g.deleteAttribute("color");
  g.computeVertexNormals();
  return g;
}
