import * as THREE from "three";
import { shellHouse } from "./whale-diorama.js";
import {
  shape,
  line,
  torus,
  fluffyTree,
  lantern,
  flowerCluster,
  mushroomHouse,
  wizardCottage,
  teaPavilion,
  batchScenery,
} from "./fantasy-scenery.js";
import { BIOME_STYLES } from "./biome-styles.js";
import { byScenery } from "./scenery-data.js";
import { buildLandmark } from "./scenery-landmarks.js";

const templates = new Map();
function curvedBranch(parent, points, radius, color) {
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
      14,
      radius,
      8,
      false,
    ),
    new THREE.MeshStandardMaterial({ color }),
  );
  mesh.material.userData.surfaceKind = "wood";
  parent.add(mesh);
}
function tree(source, kind, style, low) {
  const leaf = ["jelly", "butterfly", "bloom", "dinosaur", "whale"].includes(
    style.hero,
  )
    ? style.leaf
    : kind === "sakura"
      ? 0xe5aac5
      : kind === "willow"
        ? 0x8dae77
        : kind === "apple"
          ? 0x8cb370
          : kind === "maple"
            ? 0xdc9854
            : style.leaf;
  if (low) {
    fluffyTree(
      source,
      0,
      0,
      leaf,
      kind === "crystal"
        ? "snow"
        : kind === "apple"
          ? "fruit"
          : kind === "enchanted" || kind === "willow" || kind === "mushroom"
            ? "oak"
            : kind,
      0.95,
    );
    return;
  }
  if (["palm", "snow", "bamboo"].includes(kind)) {
    fluffyTree(source, 0, 0, leaf, kind, 1.15);
    if (kind === "bamboo")
      for (const x of [-0.55, 0.5]) lantern(source, x, 1.5, 0.1, 0.32);
    if (kind === "snow")
      for (let i = 0; i < 7; i++) {
        const a = i * 2.399;
        shape(
          source,
          "sphere",
          0xffdd9c,
          Math.sin(a) * (0.9 - i * 0.06),
          1.4 + i * 0.3,
          Math.cos(a) * (0.9 - i * 0.06),
          0.075,
          0.075,
          0.075,
          true,
        );
      }
  } else if (kind === "crystal") {
    fluffyTree(source, 0, 0, 0x8ebdcc, "snow", 1.04);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.399;
      const c = shape(
        source,
        "stone",
        [0xa3d9e8, 0xc0a2dc, 0xb4e0d2][i % 3],
        Math.sin(a) * 0.8,
        0.5 + (i % 3) * 0.75,
        Math.cos(a) * 0.8,
        0.18,
        0.52,
        0.18,
      );
      c.rotation.z = Math.sin(i) * 0.2;
    }
  } else {
    curvedBranch(
      source,
      [
        [0, 0, 0],
        [-0.2, 0.8, 0.1],
        [0.25, 1.7, 0],
        [0, 2.6, 0],
      ],
      0.22,
      0x9e795a,
    );
    for (let i = 0; i < 5; i++) {
      const a = i * 2.399;
      curvedBranch(
        source,
        [
          [0.08, 1.1, 0],
          [Math.sin(a) * 0.65, 2.1, Math.cos(a) * 0.5],
          [Math.sin(a) * 1.05, 2.9, Math.cos(a) * 0.85],
        ],
        0.1,
        0x9e795a,
      );
    }
    const crown = [
      [0, 3.4, 0, 1.05],
      [-1, 2.95, 0, 0.85],
      [1, 3, 0.1, 0.85],
      [0, 2.9, -0.9, 0.9],
      [0, 3, 1, 0.9],
    ];
    if (kind === "mushroom") {
      for (const [x, y, z, r] of crown) {
        shape(
          source,
          "dome",
          x < 0 ? 0x96bfbc : style.roof,
          x,
          y,
          z,
          r,
          0.48 * r,
          r,
        );
        torus(source, 0xe9c7d5, r * 0.9, 0.05, x, y, z).rotation.x =
          Math.PI / 2;
        for (let i = 0; i < 3; i++)
          shape(
            source,
            "sphere",
            0xf5e0cb,
            x + Math.sin(i * 2.4) * r * 0.5,
            y + 0.35 * r,
            z + Math.cos(i * 2.4) * r * 0.5,
            0.1,
            0.035,
            0.1,
          );
      }
    } else {
      for (let i = 0; i < crown.length; i++) {
        const [x, y, z, r] = crown[i];
        const color = new THREE.Color(leaf).lerp(
          new THREE.Color(i % 2 ? 0xe8dfc3 : 0x516855),
          i % 2 ? 0.12 : 0.06,
        );
        shape(
          source,
          "sphere",
          color.getHex(),
          x,
          y,
          z,
          r,
          r * (kind === "maple" ? 0.7 : 0.85),
          r,
        );
      }
      if (kind === "willow" || kind === "enchanted")
        for (let i = 0; i < 14; i++) {
          const a = i * 2.399,
            x = Math.sin(a) * 1.25,
            z = Math.cos(a) * 1.1;
          for (let j = 0; j < 3; j++)
            shape(
              source,
              "sphere",
              leaf,
              x + Math.sin(a) * j * 0.04,
              2.65 - j * 0.43,
              z,
              0.14,
              0.36,
              0.16,
            );
        }
      if (kind === "sakura" || kind === "enchanted")
        for (let i = 0; i < 18; i++) {
          const a = i * 2.399,
            [cx, cy, cz, r] = crown[i % crown.length],
            x = cx + Math.sin(a) * r * 0.35,
            z = cz + Math.cos(a) * r * 0.35,
            y = cy + r * 0.85 * 0.96;
          for (let p = 0; p < 5; p++)
            shape(
              source,
              "petal",
              i % 3 ? 0xefc0da : 0xf7dce7,
              x + Math.cos(p * 1.256) * 0.09,
              y,
              z + Math.sin(p * 1.256) * 0.09,
              0.09,
              0.045,
              0.09,
            );
          shape(
            source,
            "sphere",
            0xffe3a2,
            x,
            y + 0.025,
            z,
            0.035,
            0.025,
            0.035,
          );
        }
      if (kind === "apple")
        for (let i = 0; i < 9; i++) {
          const a = i * 2.399,
            [cx, cy, cz, r] = crown[i % crown.length];
          shape(
            source,
            "sphere",
            0xd88b6c,
            cx + Math.sin(a) * r * 0.3,
            cy - r * 0.85 - 0.09,
            cz + Math.cos(a) * r * 0.3,
            0.14,
            0.16,
            0.14,
          );
        }
    }
    for (const x of [-0.9, 0.95]) lantern(source, x, 1.3, 0.9, 0.42);
  }
  if (!low) {
    for (const x of [-0.65, 0.55])
      flowerCluster(source, x, 0.5, style.flower, 0.65);
    for (let i = 0; i < 3; i++)
      shape(
        source,
        "stone",
        0xc2b2a0,
        Math.sin(i * 2.4) * 0.55,
        0.17,
        Math.cos(i * 2.4) * 0.5,
        0.25,
        0.18,
        0.22,
      );
  }
}
function template(record, low) {
  const key = [record.type, record.originBiome, low].join(":");
  if (templates.has(key)) return templates.get(key);
  const source = new THREE.Group(),
    style = BIOME_STYLES[record.originBiome],
    spec = byScenery(record.type);
  if (spec.category === "tree") tree(source, spec.kind, style, low);
  else if (
    !low &&
    style.hero === "whale" &&
    (spec.category === "house" || record.type === "scenery-landmark")
  )
    shellHouse(
      source,
      style.roof,
      record.type === "scenery-landmark" ? 1.1 : 0.92,
    );
  else if (record.type === "scenery-boulder") {
    shape(
      source,
      "stone",
      new THREE.Color(style.ground)
        .lerp(new THREE.Color(0xc1b3a9), 0.8)
        .getHex(),
      0,
      0.48,
      0,
      0.82,
      0.62,
      0.68,
    );
    if (!low) {
      shape(source, "sphere", 0x95aa76, -0.18, 0.86, 0.1, 0.38, 0.055, 0.3);
      flowerCluster(source, 0.58, 0.25, style.flower, 0.5);
    }
  } else if (low && spec.category === "house") {
    shape(source, "pole", 0xe2d2bb, 0, 0.8, 0, 1, 1.6, 0.95);
    shape(source, "dome", style.roof, 0, 1.6, 0, 1.25, 0.7, 1.2);
  } else if (record.type === "scenery-cottage")
    wizardCottage(source, 0, 0, 0, style.roof, 0.92);
  else if (record.type === "scenery-mushroom")
    mushroomHouse(source, 0, 0, 0, style.roof, 1.06, true);
  else if (record.type === "scenery-tea")
    teaPavilion(source, 0, 0, 0, style.roof, 0.85);
  else if (low) {
    shape(source, "pole", 0xe0cfb6, 0, 1, 0, 1.1, 2, 1.1);
    shape(source, "cone", style.roof, 0, 2.5, 0, 1.3, 1.5, 1.3);
  } else buildLandmark(source, style, record.originBiome);
  const batched = batchScenery(source);
  source.traverse((o) => {
    if (o.isMesh) {
      if (!o.geometry.userData.sharedScenery) o.geometry.dispose();
      if (!o.material.userData.sharedScenery) o.material.dispose();
    }
  });
  for (const mesh of batched.children) {
    mesh.geometry.userData.sharedScenery = true;
    mesh.material.userData.sharedScenery = true;
  }
  templates.set(key, batched);
  return batched;
}
export function createSceneryModel(record, { low = false } = {}) {
  const group = template(record, low).clone(),
    clock = { value: 0 },
    motion = { value: 1 };
  group.name = record.id;
  group.userData.sceneryId = record.id;
  group.userData.sceneryRecord = record;
  group.userData.opacity = 1;
  group.traverse((mesh) => {
    if (!mesh.isMesh) return;
    mesh.material = mesh.material.clone();
    mesh.material.userData.sharedScenery = false;
    mesh.material.transparent = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (
      byScenery(record.type).category === "tree" &&
      mesh.material.userData.surfaceKind === "leaf" &&
      !low
    ) {
      mesh.material.onBeforeCompile = (shader) => {
        shader.uniforms.gardenTime = clock;
        shader.uniforms.gardenMotion = motion;
        shader.vertexShader =
          "uniform float gardenTime; uniform float gardenMotion;\n" +
          shader.vertexShader.replace(
            "#include <begin_vertex>",
            "#include <begin_vertex>\ntransformed.x+=sin(gardenTime*.8+position.y)*smoothstep(1.8,3.8,position.y)*.025*gardenMotion;",
          );
      };
      mesh.material.customProgramCacheKey = () => "volumetric-garden-breeze-v1";
    }
  });
  group.userData.update = (time, reduced) => {
    clock.value = time;
    motion.value = reduced ? 0 : 1;
  };
  positionScenery(group, record);
  return group;
}
export function positionScenery(group, record) {
  group.position.set(record.x, 0.145, record.z);
  group.rotation.y = ((record.rotation || 0) * Math.PI) / 2;
  group.scale.setScalar(record.scale || 1);
  group.userData.sceneryRecord = record;
}
export function fadeScenery(group, opacity) {
  group.userData.opacity = opacity;
  group.traverse((mesh) => {
    if (!mesh.isMesh) return;
    mesh.material.opacity = opacity;
    mesh.material.depthWrite = opacity > 0.85;
    mesh.castShadow = opacity > 0.85;
  });
}
export function disposeScenery(group) {
  const geometries = new Set(),
    materials = new Set();
  group.traverse((mesh) => {
    if (!mesh.isMesh) return;
    if (mesh.isInstancedMesh) mesh.dispose();
    if (!mesh.geometry.userData.sharedScenery) geometries.add(mesh.geometry);
    for (const material of Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material])
      if (!material.userData.sharedScenery) materials.add(material);
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}
