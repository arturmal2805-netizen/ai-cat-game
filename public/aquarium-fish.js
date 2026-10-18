import * as THREE from "three";
import {
  mergeVertices,
  mergeGeometries,
} from "three/addons/utils/BufferGeometryUtils.js";
import { part } from "./bikini-scenery.js";
import { line as lineGeometry } from "./fantasy-scenery.js";
import { batchModelSteps } from "./model-batching.js";
import { applyUnderwaterLighting } from "./water-shading.js";
import { aquariumFishFrame } from "./aquarium-data.js";
import { createFishPalette, applyFishMotion } from "./aquarium-motion.js";
import { runSceneSteps } from "./scene-tasks.js";

// One smoothly rounded model shared by all 50 fish. The marker is replaced by
// each fish's coat colour in the vertex shader; white cheeks and eyes stay white.
const COAT = 0xff00ff;
const round = new THREE.SphereGeometry(1, 24, 16);
round.userData.sharedScenery = true;
const smallRound = new THREE.SphereGeometry(1, 16, 12);
smallRound.userData.sharedScenery = true;
let templates, earGeometry, packed;
const glossy = new Map(),
  rayPaints = new Map();
function line(g, a, b, color, r) {
  const p = lineGeometry(g, a, b, color, r);
  if (!rayPaints.has(color)) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.68 });
    m.userData.sharedScenery = true;
    rayPaints.set(color, m);
  }
  p.material = rayPaints.get(color);
  return p;
}
function soft(g, color, x, y, z, sx, sy, sz, polished = false) {
  const p = part(g, "sphere", color, x, y, z, sx, sy, sz);
  p.geometry = sx > 0.6 || polished ? round : smallRound;
  if (polished) {
    p.position.z += 0.1;
    if (!glossy.has(color)) {
      const m = p.material.clone();
      m.roughness = 0.16;
      m.metalness = 0.025;
      m.userData.sharedScenery = true;
      glossy.set(color, m);
    }
    p.material = glossy.get(color);
  }
  return p;
}
function ear(g, color, x, y, z, sx, sy, sz) {
  if (!earGeometry) {
    const s = new THREE.Shape();
    s.moveTo(-0.47, -0.4);
    s.quadraticCurveTo(-0.6, -0.15, -0.28, 0.43);
    s.quadraticCurveTo(0, 0.94, 0.18, 0.55);
    s.quadraticCurveTo(0.55, -0.05, 0.48, -0.4);
    s.quadraticCurveTo(0, -0.56, -0.47, -0.4);
    earGeometry = new THREE.ExtrudeGeometry(s, {
      depth: 0.07,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.065,
      bevelSegments: 4,
      steps: 1,
      curveSegments: 10,
    });
    earGeometry.translate(0, 0, -0.035);
    earGeometry.computeVertexNormals();
    const unindexed = earGeometry;
    earGeometry = mergeVertices(unindexed, 1e-5);
    unindexed.dispose();
    earGeometry.userData.sharedScenery = true;
  }
  const p = part(g, "sphere", color, x, y, z, sx, sy, sz);
  p.geometry = earGeometry;
  return p;
}
// A single continuous, rounded surface avoids a pinched seam between the
// kitten's head and belly. Coat markings live on this surface, not glued beads.
function plushBody(g) {
  const profile = new THREE.CatmullRomCurve3(
    [
      [0, -1.35, -0.03],
      [0.48, -1.15, -0.03],
      [0.8, -0.75, -0.02],
      [0.94, -0.3, 0.02],
      [0.97, 0.25, 0.13],
      [0.94, 0.65, 0.18],
      [0.82, 0.96, 0.15],
      [0.62, 1.21, 0.1],
      [0.3, 1.4, 0.03],
      [0, 1.46, 0],
    ].map((p) => new THREE.Vector3(...p)),
    false,
    "centripetal",
  );
  const positions = [],
    colors = [],
    indices = [],
    rings = 48,
    sides = 40,
    c = new THREE.Color();
  const spots = [
    [-0.83, 0.18, 0.085],
    [-0.55, 0.39, 0.06],
    [-0.35, 0.17, 0.07],
    [-0.66, -0.12, 0.065],
    [-0.14, 0.42, 0.055],
  ];
  for (let j = 0; j <= rings; j++) {
    const p = profile.getPoint(j / rings),
      r = Math.max(0, p.x);
    for (let k = 0; k <= sides; k++) {
      const a = (k / sides) * Math.PI * 2,
        x = Math.cos(a) * r,
        y = p.z + Math.sin(a) * r * 0.88,
        z = p.y;
      positions.push(x, y, z);
      const white =
        (z > 0.63 && y < 0.69 - Math.abs(x) * 0.13) || (y < -0.29 && z < 1.1);
      const freckle =
        Math.abs(x) > 0.55 &&
        spots.some(([sz, sy, sr]) => (z - sz) ** 2 + (y - sy) ** 2 < sr ** 2);
      c.set(white ? 0xfffbf3 : freckle ? 0xffeddb : COAT);
      colors.push(c.r, c.g, c.b);
      if (j < rings && k < sides) {
        const n = j * (sides + 1) + k;
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
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = part(g, "sphere", 0xffffff, 0, 0, 0);
  mesh.geometry = geometry;
  mesh.material = mesh.material.clone();
  mesh.material.vertexColors = true;
  mesh.name = "Continuous plush kitten-fish body";
}
function fanPoint(angle, t, tail, face = 0) {
  const radius = (tail ? 0.85 : 0.8) * (1 + 0.075 * Math.cos(angle * 7)) * t,
    thickness = face * 0.035 * Math.sin(t * Math.PI);
  return tail
    ? [
        Math.sin(angle) * radius,
        (Math.cos(angle) - 0.2) * radius,
        -0.65 * t + thickness,
      ]
    : [thickness, -Math.cos(angle) * radius, -Math.sin(angle) * radius];
}
function flowingFan(g, tail = false) {
  const positions = [],
    colors = [],
    indices = [],
    rings = 10,
    sides = 32,
    stride = (rings + 1) * (sides + 1),
    start = tail ? -1.8 : -0.65,
    end = tail ? 1.8 : 1.25;
  const palette = [0xf6a4d0, 0xb9a6ef, 0x8ed4ef].map((c) => new THREE.Color(c)),
    color = new THREE.Color(),
    cream = new THREE.Color(0xffe9f4);
  for (let face = 0; face < 2; face++)
    for (let j = 0; j <= rings; j++)
      for (let k = 0; k <= sides; k++) {
        const t = j / rings,
          u = k / sides,
          a = start + (end - start) * u;
        positions.push(...fanPoint(a, t, tail, face === 0 ? 1 : -1));
        const v = u * 2,
          lo = Math.min(1, Math.floor(v));
        color
          .copy(palette[lo])
          .lerp(palette[lo + 1], v - lo)
          .lerp(cream, (1 - t) * 0.75);
        colors.push(color.r, color.g, color.b);
        if (j < rings && k < sides) {
          const n = face * stride + j * (sides + 1) + k,
            b = n + 1,
            c = n + sides + 1,
            d = c + 1;
          if ((face === 0) !== !tail) indices.push(n, b, c, b, d, c);
          else indices.push(n, c, b, b, c, d);
        }
      }
  for (const k of [0, sides])
    for (let j = 0; j < rings; j++) {
      const a = j * (sides + 1) + k,
        b = a + sides + 1;
      indices.push(a, b, a + stride, b, b + stride, a + stride);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = part(g, "sphere", 0xffffff, 0, 0, 0);
  mesh.geometry = geometry;
  mesh.material = mesh.material.clone();
  mesh.material.vertexColors = true;
  mesh.name = tail
    ? "Scalloped flowing tail fan"
    : "Continuous pearly side fin";
  for (let i = 0; i < 8; i++) {
    const a = start + ((end - start) * (i + 0.25)) / 8;
    for (const face of [-1, 1]) {
      const mid = fanPoint(a, 0.5, tail),
        tip = fanPoint(a, 0.98, tail);
      mid[tail ? 2 : 0] += face * 0.042;
      tip[tail ? 2 : 0] += face * 0.018;
      line(g, [0, 0, 0], mid, 0xffeaf7, 0.008);
      line(g, mid, tip, 0xffeaf7, 0.006);
    }
  }
}

// A continuous convex globe: large kitten pupils, a fine coloured limbus and
// crisp reflections. A single sculpted cap replaces seven intersecting spheres
// per eye; no hidden shells or dark wedges show through from grazing views.
function kittenFishEye(g, x, sign) {
  const positions = [],
    colors = [],
    indices = [],
    rings = 28,
    sides = 64,
    color = new THREE.Color(),
    pupil = new THREE.Color(0x192437),
    edge = new THREE.Color(0x445769),
    mint = new THREE.Color(0x8ed5bd),
    gold = new THREE.Color(0xd6d998),
    cream = new THREE.Color(0xfff5ec);
  for (let j = 0; j <= rings; j++) {
    const r = j / rings,
      depth = Math.sqrt(Math.max(0, 1 - r * r));
    for (let k = 0; k <= sides; k++) {
      const a = (k / sides) * Math.PI * 2,
        u = Math.cos(a) * r,
        v = Math.sin(a) * r;
      positions.push(u * 0.305, v * 0.337, depth * 0.32);
      const p = Math.hypot(u / 0.57, v / 0.72),
        iris = THREE.MathUtils.smoothstep(p, 0.96, 1.07),
        fiber =
          Math.sin(a * 43 + r * 31) * 0.035 + Math.sin(a * 23 - r * 19) * 0.025;
      color
        .copy(gold)
        .lerp(mint, THREE.MathUtils.smoothstep(r, 0.35, 0.83))
        .multiplyScalar(0.97 + fiber)
        .lerp(edge, THREE.MathUtils.smoothstep(r, 0.83, 0.94) * 0.8)
        .lerp(cream, THREE.MathUtils.smoothstep(r, 0.96, 1))
        .lerp(pupil, 1 - iris);
      colors.push(color.r, color.g, color.b);
      if (j < rings && k < sides) {
        const n = j * (sides + 1) + k;
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
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const globe = soft(g, 0xffffff, x, 0.34, 1.18, 1, 1, 1, true);
  globe.position.z = 1.18;
  globe.geometry = geometry;
  globe.material = globe.material.clone();
  globe.material.vertexColors = true;
  globe.name = "Convex kitten eye · iris and pupil";
  const glint = (dx, dy, sx, sy) => {
    const r2 = (dx / 0.305) ** 2 + (dy / 0.337) ** 2,
      z = 1.18 + 0.32 * Math.sqrt(1 - r2) + 0.007;
    const p = soft(g, 0xffffff, x + dx, 0.34 + dy, z, sx, sy, 0.014, true);
    p.position.z = z;
    p.name = "Kitten eye catchlight";
  };
  glint(-sign * 0.078, 0.118, 0.062, 0.073);
  glint(sign * 0.087, -0.116, 0.024, 0.031);
}

function* bake(g) {
  const b = yield* batchModelSteps(g, { combineColors: true });
  g.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  const parts = [];
  b.traverse((o) => {
    if (o.isMesh) {
      o.geometry.userData.sharedScenery = true;
      o.material.userData.sharedScenery = true;
      parts.push(o);
    }
  });
  return parts;
}
function* fishTemplates() {
  if (templates) return templates;
  const body = new THREE.Group(),
    tail = new THREE.Group(),
    fin = new THREE.Group();
  plushBody(body);
  for (const sign of [-1, 1]) {
    const outer = ear(body, COAT, sign * 0.62, 0.98, 0.45, 0.66, 0.62, 1.35);
    outer.rotation.z = sign * -0.22;
    const inner = ear(
      body,
      0xf5a7c8,
      sign * 0.62,
      1.005,
      0.58,
      0.39,
      0.42,
      0.24,
    );
    inner.rotation.z = sign * -0.22;
    soft(body, 0xfffbf3, sign * 0.27, -0.18, 1.24, 0.34, 0.255, 0.18);
    soft(body, 0xf7bad1, sign * 0.66, -0.07, 1.2, 0.17, 0.095, 0.035);
    const x = sign * 0.39;
    kittenFishEye(body, x, sign);
    // Muzzle dots, curved whiskers and tiny eyebrow tufts keep the face feline.
    for (let j = 0; j < 3; j++) {
      const points = [
        [sign * 0.37, -0.15 + j * 0.04, 1.4],
        [sign * 0.76, -0.11 + j * 0.09, 1.37],
        [sign * (1.12 + j * 0.06), -0.18 + j * 0.17, 1.18],
      ];
      line(body, points[0], points[1], 0xfff9ef, 0.009);
      line(body, points[1], points[2], 0xfff9ef, 0.007);
      soft(
        body,
        0xbc9daf,
        sign * (0.24 + j * 0.062),
        -0.14 + (j % 2) * 0.055,
        1.421,
        0.012,
        0.012,
        0.007,
      );
    }
    soft(body, COAT, sign * 0.37, 0.72, 0.99, 0.23, 0.065, 0.06).rotation.z =
      sign * -0.12;
  }
  // Heart-shaped kitten nose and a smiling open mouth, rather than a fish lip.
  soft(body, 0xe6a3bc, -0.046, -0.035, 1.456, 0.068, 0.045, 0.04);
  soft(body, 0xe6a3bc, 0.046, -0.035, 1.456, 0.068, 0.045, 0.04);
  const tip = part(
    body,
    "cone",
    0xe6a3bc,
    0,
    -0.085,
    1.45,
    0.072,
    0.095,
    0.048,
  );
  tip.rotation.z = Math.PI;
  soft(body, 0x936780, 0, -0.3, 1.343, 0.13, 0.107, 0.032);
  soft(body, 0xf5a9c6, 0, -0.342, 1.371, 0.084, 0.045, 0.015);
  line(body, [0, -0.12, 1.46], [0, -0.2, 1.447], 0x936780, 0.012);
  for (const sign of [-1, 1])
    line(body, [0, -0.2, 1.447], [sign * 0.11, -0.235, 1.43], 0x936780, 0.012);
  // A scalloped dorsal crest complements the continuous painted body.
  for (let i = 0; i < 5; i++) {
    const p = soft(
      body,
      i % 2 ? 0xcdb2f5 : 0xffc0db,
      0,
      0.65 + i * 0.005,
      -0.12 - i * 0.23,
      0.115,
      0.28,
      0.21,
    );
    p.rotation.x = -0.5;
  }
  flowingFan(tail, true);
  flowingFan(fin, false);
  return (templates = {
    body: yield* bake(body),
    tail: yield* bake(tail),
    fin: yield* bake(fin),
  });
}
function coatMaterial(source, clock, tint) {
  const m = applyUnderwaterLighting(source.clone(), clock, tint, {
    refract: false,
  });
  const previous = m.onBeforeCompile,
    key = m.customProgramCacheKey();
  m.onBeforeCompile = function (shader, ...args) {
    previous.call(this, shader, ...args);
    shader.vertexShader = shader.vertexShader.replace(
      "#include <color_vertex>",
      `#include <color_vertex>
#ifdef USE_INSTANCING_COLOR
 // Pure magenta marks fur only. Do not tint the whites, pupils or catchlights.
 if(color.r>.99 && color.g<.01 && color.b>.99) vColor.rgb=instanceColor;
 else vColor.rgb=color;
#endif`,
    );
  };
  m.customProgramCacheKey = () => key + "-kitten-coat-v1";
  m.userData.sharedScenery = false;
  return m;
}
function* packedFishSteps(parts) {
  if (packed) return packed;
  const geometries = [];
  for (const [id, sources] of [
    parts.body,
    parts.tail,
    parts.fin,
    parts.fin,
  ].entries())
    for (const p of sources) {
      const g = p.geometry.clone(),
        count = g.attributes.position.count,
        surface = new Float32Array(count * 2);
      for (let i = 0; i < count; i++) {
        surface[i * 2] = p.material.roughness;
        surface[i * 2 + 1] = p.material.metalness;
      }
      g.setAttribute(
        "aFishPart",
        new THREE.Float32BufferAttribute(new Float32Array(count).fill(id), 1),
      );
      g.setAttribute(
        "aFishSurface",
        new THREE.Float32BufferAttribute(surface, 2),
      );
      geometries.push(g);
      yield;
    }
  packed = mergeGeometries(geometries);
  if (!packed) throw Error("Incompatible kitten-fish surfaces");
  geometries.forEach((g) => g.dispose());
  packed.userData.sharedScenery = true;
  return packed;
}
export function* aquariumShoalSteps(tank, clock) {
  const root = new THREE.Group(),
    parts = yield* fishTemplates(),
    geometry = yield* packedFishSteps(parts),
    palette = createFishPalette(tank),
    material = applyFishMotion(
      coatMaterial(
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          vertexColors: true,
          roughness: 1,
        }),
        clock,
        tank.color,
      ),
      palette,
    ),
    mesh = new THREE.InstancedMesh(geometry, material, tank.fish),
    bounds = new THREE.Sphere(
      new THREE.Vector3(0, tank.h / 2, 0),
      Math.hypot(tank.w / 2, tank.h / 2, tank.d / 2),
    ),
    colliders = [];
  mesh.name = "Aquarium catfish · packed articulated kittens";
  mesh.userData.aquariumFish = true;
  mesh.boundingSphere = bounds;
  mesh.getMatrixAt = (i, target) => palette.matrixAt(i, "body", target);
  for (const [name, sources] of [
    ["body", parts.body],
    ["tail", parts.tail],
    ["leftFin", parts.fin],
    ["rightFin", parts.fin],
  ])
    for (const p of sources) {
      const collider = new THREE.InstancedMesh(
        p.geometry,
        p.material,
        tank.fish,
      );
      collider.name = "Aquarium picking · " + name;
      collider.getMatrixAt = (i, target) => palette.matrixAt(i, name, target);
      collider.boundingSphere = bounds;
      colliders.push(collider);
    }
  // Use the articulated surfaces for picking. The packed mesh's bind-pose
  // fins alone cannot describe their displayed positions during a tail stroke.
  mesh.raycast = (raycaster, hits) => {
    const first = hits.length;
    for (const c of colliders) {
      c.matrixWorld.copy(mesh.matrixWorld);
      c.raycast(raycaster, hits);
    }
    for (let i = first; i < hits.length; i++) hits[i].object = mesh;
  };
  const color = new THREE.Color();
  for (let i = 0; i < tank.fish; i++)
    mesh.setColorAt(i, color.set(aquariumFishFrame(tank, i, 0).color));
  root.add(mesh);
  root.userData.palette = palette;
  root.userData.collisionParts = colliders;
  root.userData.update = palette.update;
  root.userData.stats = { fish: tank.fish, draws: 1, sharedTemplates: true };
  return root;
}

export function createAquariumShoal(...args) {
  return runSceneSteps(aquariumShoalSteps(...args));
}
