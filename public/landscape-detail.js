import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { byItem } from "./game-data.js";

// Authored arrangements rather than a uniform ring of repeated trees.
const layouts = {
  moon: [
    [-1, -8, "enchanted", 1],
    [6, -3, "willow", 1.08],
    [-5, 6, "enchanted", 0.82],
  ],
  autumn: [
    [-4, 5, "maple", 1.12],
    [5, -5, "maple", 0.91],
    [7, 3, "apple", 0.76],
  ],
  winter: [
    [-4, 5, "snow", 1.13],
    [5, -4, "crystal", 0.92],
    [7, 4, "snow", 0.72],
  ],
  beach: [
    [-8, 3, "palm", 1.1],
    [6, 5, "palm", 1.04],
  ],
  water: [
    [6, -4, "willow", 1.15],
    [5, 6, "palm", 0.9],
  ],
  wizard: [
    [-3, 6, "mushroom", 1.12],
    [6, -4, "enchanted", 1.03],
    [7, 3, "mushroom", 0.74],
  ],
  summer: [
    [-5, 4, "apple", 1.1],
    [5, -5, "apple", 0.84],
    [7, 2, "willow", 0.9],
  ],
  nature: [
    [-5, 4, "willow", 1.12],
    [5, -5, "apple", 0.94],
    [7, 2, "enchanted", 0.76],
  ],
  sakura: [
    [6, -5, "sakura", 1.12],
    [1, 7, "sakura", 0.95],
    [-7, 3, "willow", 0.8],
  ],
  clouds: [
    [-4, 5, "crystal", 0.96],
    [6.5, -3.5, "enchanted", 0.9],
  ],
  desert: [
    [4, -5, "palm", 1.05],
    [-3, 7, "palm", 0.8],
  ],
  stars: [
    [-5, 4, "enchanted", 1.04],
    [6, -3, "crystal", 0.81],
  ],
  volcano: [
    [-5, 4, "maple", 0.91],
    [5, -3, "mushroom", 0.84],
  ],
  crystal: [
    [-4, 5, "crystal", 1.15],
    [6, -4, "crystal", 0.87],
    [7, 3, "enchanted", 0.72],
  ],
  candy: [
    [-5, 4, "sakura", 0.97],
    [5, -4, "apple", 1.02],
    [7, 3, "mushroom", 0.77],
  ],
  rainbow: [
    [-4, 5, "sakura", 1.08],
    [5, -4, "willow", 0.99],
    [7, 3, "crystal", 0.72],
  ],
  bamboo: [
    [-5, 4, "bamboo", 1.13],
    [5, -5, "bamboo", 0.98],
    [7, 2, "willow", 0.78],
  ],
  mushrooms: [
    [-4, 5, "mushroom", 1.17],
    [6, -4, "mushroom", 0.9],
    [6, 5, "enchanted", 0.76],
  ],
  galaxy: [
    [-5, 4, "crystal", 1.03],
    [6, -3, "mushroom", 0.92],
  ],
  coral: [
    [-7.8, 2.3, "palm", 1.14],
    [5.8, 6.2, "palm", 1.07],
  ],
  lotus: [
    [6, -4, "willow", 1.16],
    [4, 7, "bamboo", 0.91],
  ],
  ice: [
    [-4, 5, "crystal", 1.16],
    [6, -4, "snow", 0.92],
  ],
  clockwork: [
    [-5, 4, "maple", 1.03],
    [5, -4, "apple", 0.91],
    [7, 3, "enchanted", 0.74],
  ],
  dusk: [
    [-4, 5, "willow", 1.12],
    [6, -4, "enchanted", 1],
    [7, 3, "mushroom", 0.74],
  ],
};
const artKinds = {
  enchanted: [false, 0, "oak"],
  sakura: [false, 1, "sakura"],
  palm: [false, 2, "palm"],
  snow: [false, 3, "snow"],
  willow: [true, 0, "oak"],
  maple: [true, 1, "maple"],
  bamboo: [true, 2, "bamboo"],
  apple: [true, 3, "fruit"],
  crystal: [true, 4, "snow"],
  mushroom: [true, 5, "oak"],
};
export function landscapedTrees(id) {
  return (layouts[id] || []).map(([x, z, kind, scale], index) => {
    const [trees, cell, fallback] = artKinds[kind];
    return {
      id: `tree-${id}-${index}`,
      x,
      z,
      kind,
      scale,
      trees,
      cell,
      fallback,
      height: 4.7 * scale,
      width: 4.3 * scale,
    };
  });
}
export function placementClearance(items = []) {
  const bounds = items.map((p) => {
    const size = byItem(p.item)?.footprint || [2, 2];
    const [w, d] = p.rotation % 2 ? [size[1], size[0]] : size;
    return { x: p.x, z: p.z, w, d };
  });
  return (x, z, w = 0, d = w) =>
    !bounds.some(
      (p) =>
        Math.abs(x - p.x) < (w + p.w) / 2 + 0.22 &&
        Math.abs(z - p.z) < (d + p.d) / 2 + 0.22,
    );
}
export function meadowPalette(style, id) {
  if (["winter", "ice", "crystal"].includes(id))
    return [0xbedbe3, 0x9fc6cb, 0xe3ede7];
  if (["desert", "beach", "coral"].includes(id))
    return [0x9eae68, 0xc4bb78, 0x91b97b];
  if (id === "volcano") return [0xaa8f77, 0xb8a284, 0x8fa173];
  const green = new THREE.Color(style.ground).lerp(
    new THREE.Color(0xabc279),
    0.57,
  );
  return [
    green.getHex(),
    green.clone().multiplyScalar(0.85).getHex(),
    green.clone().lerp(new THREE.Color(0xe6d39b), 0.35).getHex(),
  ];
}
function randomGenerator(id) {
  let state = [...id].reduce(
    (n, c) => Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0,
    2166136261,
  );
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
const cached = new Map();
function foliageGeometry(kind) {
  if (cached.has(kind)) return cached.get(kind);
  let geometry;
  if (kind === "grass") {
    const positions = [],
      indices = [];
    for (let blade = 0; blade < 4; blade++) {
      const angle = blade * 2.4,
        dx = Math.sin(angle) * 0.045,
        dz = Math.cos(angle) * 0.045,
        first = positions.length / 3;
      for (let level = 0; level < 4; level++) {
        const t = level / 3,
          w = 0.025 * (1 - t) + 0.002,
          bend = t * t * 0.1;
        for (const side of [-1, 1])
          positions.push(
            dx + Math.cos(angle) * side * w + Math.sin(angle) * bend,
            t * (0.21 + blade * 0.025),
            dz + Math.sin(angle) * side * w + Math.cos(angle) * bend,
          );
        if (level < 3) {
          const a = first + level * 2;
          indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
    }
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
  } else if (kind === "flower") {
    const parts = [],
      add = (g, color) => {
        if (g.index) g = g.toNonIndexed();
        const c = new THREE.Color(color),
          data = Array.from({ length: g.getAttribute("position").count }, () =>
            c.toArray(),
          ).flat();
        g.setAttribute("color", new THREE.Float32BufferAttribute(data, 3));
        parts.push(g);
      };
    add(
      new THREE.CylinderGeometry(0.009, 0.014, 0.19, 4).translate(0, 0.095, 0),
      0x718d60,
    );
    for (let p = 0; p < 5; p++) {
      const a = (p * Math.PI * 2) / 5,
        g = new THREE.SphereGeometry(1, 5, 3);
      g.scale(0.072, 0.025, 0.034);
      g.rotateY(-a);
      g.translate(Math.cos(a) * 0.075, 0.2, Math.sin(a) * 0.075);
      add(g, 0xffffff);
    }
    add(
      new THREE.SphereGeometry(0.032, 6, 4)
        .scale(1, 0.55, 1)
        .translate(0, 0.212, 0),
      0xffdb83,
    );
    geometry = mergeGeometries(parts);
    parts.forEach((g) => g.dispose());
  } else if (kind === "fern") {
    const positions = [],
      indices = [];
    for (let branch = 0; branch < 5; branch++) {
      const a = branch * 2.4;
      for (let side of [-1, 1])
        for (let p = 0; p < 4; p++) {
          const t = (p + 1) / 5,
            length = (1 - t) * 0.16,
            y = t * 0.3,
            x = Math.sin(a) * t * 0.19,
            z = Math.cos(a) * t * 0.19,
            n = positions.length / 3;
          positions.push(
            x,
            y,
            z,
            x + Math.cos(a) * length * side,
            y + 0.045,
            z - Math.sin(a) * length * side,
            x + Math.sin(a) * 0.06,
            y + 0.065,
            z + Math.cos(a) * 0.06,
          );
          indices.push(n, n + 1, n + 2);
        }
    }
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
  } else geometry = new THREE.SphereGeometry(1, 8, 5).scale(0.32, 0.055, 0.27);
  geometry.userData.sharedScenery = true;
  cached.set(kind, geometry);
  return geometry;
}
export function createGroundCover(
  style,
  id,
  { placements = [], preview = false, seed = 0 } = {},
) {
  const group = new THREE.Group();
  group.name = "Living ground cover";
  const random = randomGenerator(id + seed),
    clear = placementClearance(placements),
    palette = meadowPalette(style, id),
    points = [];
  const routeSeed = [...id].reduce((n, c) => n + c.charCodeAt(0), 0),
    dry = ["desert", "volcano"].includes(id),
    cold = ["winter", "ice"].includes(id);
  const target = Math.round(
    (preview ? 530 : 900) * (dry ? 0.58 : cold ? 0.75 : 1),
  );
  for (
    let attempt = 0;
    attempt < target * 3 && points.length < target;
    attempt++
  ) {
    const angle = random() * Math.PI * 2,
      radius = Math.sqrt(random()) * 10.8,
      x = Math.cos(angle) * radius,
      z = Math.sin(angle) * radius;
    if (radius < 1.35 || !clear(x, z, 0.55)) continue;
    if (style.water) {
      const [px, pz, rx, rz] = style.water;
      if (((x - px) / (rx + 0.2)) ** 2 + ((z - pz) / (rz + 0.2)) ** 2 < 1)
        continue;
    }
    if (Math.hypot(x + 7.8, z + 7.8) < 2.6) continue;
    let onPath = false;
    for (let route = 0; route < 3; route++) {
      const a = route * 2.094 + routeSeed * 0.01,
        along = x * Math.cos(a) + z * Math.sin(a),
        across = -x * Math.sin(a) + z * Math.cos(a);
      if (along > 0 && along < 8.7 && Math.abs(across) < 0.48) {
        onPath = true;
        break;
      }
    }
    if (onPath) continue;
    const patch =
      0.5 + 0.5 * Math.sin(x * 0.85 + routeSeed) * Math.cos(z * 0.71);
    if (random() > 0.35 + patch * 0.65) continue;
    points.push({
      x,
      z,
      turn: random() * Math.PI * 2,
      scale: 0.7 + random() * 0.7,
      kind: random(),
      color: Math.floor(random() * 3),
    });
  }
  const clock = { value: 0 },
    amplitude = { value: 1 },
    dummy = new THREE.Object3D();
  const buckets = {
    grass: points.filter((p) => p.kind < 0.46),
    flower: points.filter((p) => p.kind >= 0.46 && p.kind < 0.82),
    fern: points.filter((p) => p.kind >= 0.82 && p.kind < 0.92),
    moss: points.filter((p) => p.kind >= 0.92),
  };
  for (const [kind, list] of Object.entries(buckets)) {
    if (!list.length) continue;
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: kind === "flower",
      roughness: 0.92,
      side: THREE.DoubleSide,
    });
    if (kind !== "moss") {
      material.onBeforeCompile = (shader) => {
        shader.uniforms.meadowTime = clock;
        shader.uniforms.meadowMotion = amplitude;
        shader.vertexShader =
          "uniform float meadowTime; uniform float meadowMotion;\n" +
          shader.vertexShader.replace(
            "#include <begin_vertex>",
            "#include <begin_vertex>\nfloat phase=instanceMatrix[3].x*1.7+instanceMatrix[3].z*2.3; transformed.x+=sin(meadowTime*1.1+phase)*position.y*position.y*.16*meadowMotion;",
          );
      };
      material.customProgramCacheKey = () => "meadow-breeze-v1";
    }
    const mesh = new THREE.InstancedMesh(
      foliageGeometry(kind),
      material,
      list.length,
    );
    mesh.name = "Meadow " + kind;
    mesh.frustumCulled = false;
    list.forEach((point, index) => {
      dummy.position.set(point.x, 0.145, point.z);
      dummy.rotation.set(0, point.turn, 0);
      dummy.scale.setScalar(point.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      const color =
        kind === "flower"
          ? [style.flower, 0xffe5a6, cold ? 0xe9ffff : 0xf4b6be][point.color]
          : palette[point.color];
      mesh.setColorAt(index, new THREE.Color(color));
    });
    group.add(mesh);
  }
  group.userData.samples = points;
  group.userData.stats = {
    tufts: buckets.grass.length,
    flowers: buckets.flower.length,
    ferns: buckets.fern.length,
    moss: buckets.moss.length,
  };
  group.userData.update = (time, reduced = false) => {
    clock.value = time;
    amplitude.value = reduced ? 0 : 1;
  };
  return group;
}
