import * as THREE from "three";
import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { shape, line } from "./fantasy-scenery.js";
import { batchModelGeometry } from "./model-batching.js";

const surfaces = new Map();
function sculpt(size = 36) {
  if (surfaces.has(size)) return surfaces.get(size);
  const domain = 2.65,
    clay = new MarchingCubes(
      size,
      new THREE.MeshBasicMaterial(),
      false,
      false,
      22000,
    );
  clay.isolation = 0;
  // Read the same sculpt primitives for every voxel without allocating a new
  // nested array each time. This only changes construction work, not geometry.
  const ellipsoids = [
    [0, 0.96, -0.3, 0.98, 0.86, 1.26],
    [0, 1.18, 0.55, 0.73, 0.72, 0.72],
    [0, 1.5, 1.04, 0.64, 0.58, 0.64],
  ];
  for (let z = 0; z < size; z++)
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const px = ((x / size) * 2 - 1) * domain,
          py = ((y / size) * 2 - 1) * domain,
          pz = ((z / size) * 2 - 1) * domain;
        let d = 10;
        for (const [cx, cy, cz, rx, ry, rz] of ellipsoids) {
          const v =
              (Math.hypot((px - cx) / rx, (py - cy) / ry, (pz - cz) / rz) - 1) *
              Math.min(rx, ry, rz),
            h = Math.max(0.25 - Math.abs(d - v), 0) / 0.25;
          d = Math.min(d, v) - h * h * 0.25 * 0.25;
        }
        // A capybara's long, rounded rectangular muzzle is part of the same
        // continuous skin as its cheeks and belly, not a pig nose or cat face.
        const qx = Math.abs(px) - 0.36,
          qy = Math.abs(py - 1.28) - 0.19,
          qz = Math.abs(pz - 1.46) - 0.25,
          muzzle =
            Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) +
            Math.min(Math.max(qx, qy, qz), 0) -
            0.2,
          h = Math.max(0.2 - Math.abs(d - muzzle), 0) / 0.2;
        d = Math.min(d, muzzle) - h * h * 0.2 * 0.25;
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
  const bodySurface = mergeVertices(raw, 0.0001);
  const cleanIndices = [];
  for (let i = 0; i < bodySurface.index.count; i += 3) {
    const a = bodySurface.index.getX(i),
      b = bodySurface.index.getX(i + 1),
      c = bodySurface.index.getX(i + 2);
    if (a !== b && b !== c && c !== a) cleanIndices.push(a, b, c);
  }
  bodySurface.setIndex(cleanIndices);
  // Smooth the sampled clay without shrinking the chubby silhouette.
  const positions = bodySurface.attributes.position.array,
    neighbors = Array.from({ length: positions.length / 3 }, () => new Set()),
    index = bodySurface.index.array,
    next = new Float32Array(positions.length);
  for (let i = 0; i < index.length; i += 3) {
    const [a, b, c] = index.slice(i, i + 3);
    for (const [u, v] of [
      [a, b],
      [b, c],
      [c, a],
    ]) {
      neighbors[u].add(v);
      neighbors[v].add(u);
    }
  }
  for (let pass = 0; pass < 4; pass++)
    for (const factor of [0.45, -0.47]) {
      for (let i = 0; i < neighbors.length; i++)
        for (let axis = 0; axis < 3; axis++) {
          let sum = 0;
          for (const n of neighbors[i]) sum += positions[n * 3 + axis];
          next[i * 3 + axis] = neighbors[i].size
            ? positions[i * 3 + axis] +
              (sum / neighbors[i].size - positions[i * 3 + axis]) * factor
            : positions[i * 3 + axis];
        }
      positions.set(next);
    }
  bodySurface.computeVertexNormals();
  const p = bodySurface.attributes.position,
    colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const light =
      0.96 +
      Math.max(0, 0.8 - p.getY(i)) * 0.12 +
      Math.sin(p.getX(i) * 99 + p.getZ(i) * 127) * 0.018;
    colors.set([light, light * 0.98, light * 0.94], i * 3);
  }
  bodySurface.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  bodySurface.userData.sharedScenery = true;
  raw.dispose();
  clay.geometry.dispose();
  clay.material.dispose();
  surfaces.set(size, bodySurface);
  return bodySurface;
}
export function capybaraPose(
  time,
  reduced = false,
  swimming = false,
  duration = 0,
) {
  const t = reduced ? 0 : time,
    phase = duration ? (t / duration) * Math.PI * 2 : 0,
    steps = duration ? phase * (swimming ? 5 : 14) : t * (swimming ? 3.2 : 5.4);
  return {
    bob: reduced
      ? 0
      : Math.sin(
          duration ? phase * (swimming ? 4 : 14) : t * (swimming ? 2.2 : 5.4),
        ) * (swimming ? 0.055 : 0.028),
    roll: reduced
      ? 0
      : Math.sin(
          duration ? phase * (swimming ? 2 : 14) : t * (swimming ? 1.3 : 5.4),
        ) * 0.022,
    breath:
      1 + (reduced ? 0 : Math.sin(duration ? phase * 4 : t * 1.5) * 0.007),
    blink:
      reduced ||
      (duration ? (phase * 3 + 1.3) % (Math.PI * 2) : (t + 1.3) % 5.6) > 0.16
        ? 1
        : 0.1,
    steps,
    ears: duration ? phase * 5 : t * 1.6,
  };
}
export function createCapybara({
  color = 0xb9834a,
  saddle = false,
  swimming = false,
  flower = false,
  detail = "full",
} = {}) {
  const root = new THREE.Group(),
    body = new THREE.Group(),
    statics = new THREE.Group(),
    eyes = [],
    ears = [],
    legs = [],
    coat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.76,
      vertexColors: true,
    }),
    skin = new THREE.MeshStandardMaterial({ color, roughness: 0.76 }),
    dark = new THREE.MeshStandardMaterial({ color: 0x32271e, roughness: 0.26 }),
    tan = new THREE.MeshStandardMaterial({ color: 0x9a6846, roughness: 0.76 }),
    claw = new THREE.MeshStandardMaterial({ color: 0x5d4430, roughness: 0.76 }),
    shine = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.26,
    });
  root.name = "Living chubby capybara";
  root.add(body);
  body.add(statics);
  const skinGeometry = sculpt(detail === "crowd" ? 24 : 36),
    torso = new THREE.Mesh(skinGeometry, coat);
  torso.name = "Continuous capybara skin";
  torso.castShadow = true;
  torso.receiveShadow = true;
  statics.add(torso);
  const furPositions = [],
    furColors = [],
    point = new THREE.Vector3(),
    normal = new THREE.Vector3(),
    across = new THREE.Vector3(),
    up = new THREE.Vector3(0, 1, 0),
    strands = detail === "crowd" ? 100 : 520,
    positions = skinGeometry.attributes.position,
    normals = skinGeometry.attributes.normal;
  for (let i = 0; i < strands; i++) {
    const index = (i * 1999 + 83) % positions.count;
    point.fromBufferAttribute(positions, index);
    normal.fromBufferAttribute(normals, index).normalize();
    if (point.y < 0.4) continue;
    across.crossVectors(normal, up);
    if (across.lengthSq() < 0.01) across.set(1, 0, 0);
    across.normalize().multiplyScalar(0.0045);
    const base = point.clone().addScaledVector(normal, 0.004),
      tip = point
        .clone()
        .addScaledVector(normal, 0.027)
        .add(new THREE.Vector3(0, -0.005, -0.012));
    furPositions.push(
      ...base.clone().sub(across).toArray(),
      ...base.clone().add(across).toArray(),
      ...tip.toArray(),
    );
    furColors.push(0.82, 0.81, 0.78, 0.82, 0.81, 0.78, 1.06, 1.04, 1);
  }
  const furGeometry = new THREE.BufferGeometry();
  furGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(furPositions, 3),
  );
  furGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(furColors, 3),
  );
  furGeometry.computeVertexNormals();
  const fur = new THREE.Mesh(furGeometry, coat);
  fur.name = "Short capybara coat strands";
  fur.castShadow = true;
  statics.add(fur);
  const smooth = (parent, material, x, y, z, sx, sy, sz) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), material);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(side * 0.49, 1.68, 1.49);
    eye.rotation.y = side * 0.25;
    body.add(eye);
    smooth(eye, dark, 0, 0, 0, 0.105, 0.112, 0.068);
    smooth(eye, shine, -0.025, 0.038, 0.057, 0.031, 0.034, 0.016);
    eyes.push(eye);
    smooth(statics, dark, side * 0.22, 1.39, 1.895, 0.073, 0.045, 0.028);
    const ear = new THREE.Group();
    ear.position.set(side * 0.48, 1.94, 0.91);
    ear.rotation.z = -side * 0.25;
    body.add(ear);
    smooth(ear, skin, 0, 0, 0, 0.19, 0.235, 0.115);
    smooth(ear, tan, 0, 0.01, 0.09, 0.115, 0.155, 0.035);
    ears.push(ear);
    for (const z of [-0.86, 0.67]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.64, 0.48, z);
      root.add(leg);
      smooth(leg, skin, 0, -0.12, 0, 0.235, 0.4, 0.25);
      smooth(leg, tan, 0, -0.36, 0.06, 0.255, 0.135, 0.3);
      for (const toe of [-1, 0, 1])
        smooth(leg, claw, toe * 0.11, -0.36, 0.31, 0.035, 0.035, 0.035);
      legs.push(leg);
    }
  }
  for (const side of [-1, 1]) {
    line(statics, [0, 1.12, 1.916], [side * 0.18, 1.17, 1.9], 0x674a35, 0.016);
    for (let i = 0; i < 3; i++)
      line(
        statics,
        [side * 0.38, 1.28 - i * 0.06, 1.82],
        [side * (0.72 + i * 0.06), 1.31 - i * 0.08, 1.9],
        0xe6c89f,
        0.007,
      );
  }
  if (saddle) {
    shape(statics, "sphere", 0x57a87c, 0, 1.78, -0.22, 0.66, 0.055, 0.63);
    for (const side of [-1, 1])
      line(
        statics,
        [side * 0.58, 1.77, -0.5],
        [side * 0.72, 1.3, -0.5],
        0xe5bd72,
        0.035,
      );
  }
  if (flower) {
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      shape(
        statics,
        "petal",
        0xffd2a5,
        0.58 + Math.sin(a) * 0.11,
        1.96 + Math.cos(a) * 0.11,
        0.98,
        0.09,
        0.13,
        0.035,
      );
    }
    shape(
      statics,
      "sphere",
      0xffc953,
      0.58,
      1.96,
      1.02,
      0.07,
      0.07,
      0.025,
      true,
    );
  }
  const baked = batchModelGeometry(statics, { combineColors: true });
  body.remove(statics);
  body.add(baked);
  statics.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  // Batch within animated pivots, preserving every toe, highlight and ear.
  for (const pivot of [...legs, ...ears, ...eyes]) {
    const source = [...pivot.children],
      baked = batchModelGeometry(pivot, { combineColors: true });
    pivot.clear();
    pivot.add(baked);
    for (const mesh of source)
      if (!mesh.geometry.userData.sharedScenery) mesh.geometry.dispose();
  }
  const seat = new THREE.Object3D();
  seat.name = "Capybara rider seat";
  seat.position.set(0, 1.83, -0.22);
  body.add(seat);
  root.userData = {
    body,
    eyes,
    ears,
    legs,
    seat,
    seatHeight: 1.83,
    swimming,
    skinGeometry,
  };
  root.userData.update = (time, reduced = false, duration = 0) => {
    const p = capybaraPose(time, reduced, swimming, duration);
    body.position.y = p.bob;
    body.rotation.z = p.roll;
    body.scale.y = p.breath;
    eyes.forEach((e) => (e.scale.y = p.blink));
    ears.forEach(
      (e, i) => (e.rotation.x = reduced ? 0 : Math.sin(p.ears + i) * 0.07),
    );
    legs.forEach((l, i) => {
      l.rotation.x = reduced
        ? 0
        : Math.sin(p.steps + (i === 0 || i === 3 ? 0 : Math.PI)) *
          (swimming ? 0.3 : 0.2);
    });
  };
  root.userData.update(0, true);
  return root;
}
