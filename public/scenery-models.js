import { junglePalmSteps, tropicalHut } from "./jungle-props.js";
import { runSceneSteps } from "./scene-tasks.js";
import { cottonTree, cupcake } from "./cotton-props.js";
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
  batchScenerySteps,
} from "./fantasy-scenery.js";
import { BIOME_STYLES } from "./biome-styles.js";
import { byScenery } from "./scenery-data.js";
import { buildLandmark } from "./scenery-landmarks.js";
import { opaqueSceneryPaint, updateSceneryBlend } from "./scenery-blending.js";

const templates = new Map();
const paints = new WeakMap(),
  instancePaint = new WeakMap();
function clonePaint(material) {
  const copy = material.clone();
  copy.onBeforeCompile = material.onBeforeCompile;
  copy.customProgramCacheKey = material.customProgramCacheKey;
  copy.userData.sharedScenery = false;
  return copy;
}
// Template geometry already shares every authored vertex. Share its identical
// paint/clock too; only a tree actually fading in front of the camera needs its
// own material. All visible scenery receives the same absolute animation time.
function sceneryPaint(source, breeze, geometry) {
  const mode = `${Number(breeze)}:${geometry?.attributes.color?.itemSize || 0}`;
  let modes = paints.get(source);
  if (!modes) paints.set(source, (modes = new Map()));
  if (modes.has(mode)) return modes.get(mode);
  const material = source.clone(),
    clock = { value: 0 },
    motion = { value: 1 };
  material.transparent = true;
  material.userData.sharedScenery = true;
  material.userData.opaqueSceneryBlend = opaqueSceneryPaint(material, geometry);
  updateSceneryBlend(material);
  if (breeze) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.gardenTime = clock;
      shader.uniforms.gardenMotion = motion;
      shader.vertexShader =
        "uniform float gardenTime; uniform float gardenMotion;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\ntransformed.x+=sin(gardenTime*.8+position.y)*smoothstep(1.8,3.8,position.y)*.025*gardenMotion;",
        );
    };
    material.customProgramCacheKey = () => "volumetric-garden-breeze-v1";
  }
  const paint = { material, clock, motion };
  modes.set(mode, paint);
  return paint;
}
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
function* sceneryTreeSteps(source, kind, style, low) {
  yield;
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
  yield;
  if (low) {
    yield;
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
    yield;
    return;
  }
  yield;
  if (["palm", "snow", "bamboo"].includes(kind)) {
    yield;
    fluffyTree(source, 0, 0, leaf, kind, 1.15);
    yield;
    if (kind === "bamboo")
      for (const x of [-0.55, 0.5]) {
        yield;
        lantern(source, x, 1.5, 0.1, 0.32);
      }
    yield;
    if (kind === "snow")
      for (let i = 0; i < 7; i++) {
        yield;
        const a = i * 2.399;
        yield;
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
    yield;
    fluffyTree(source, 0, 0, 0x8ebdcc, "snow", 1.04);
    yield;
    for (let i = 0; i < 7; i++) {
      yield;
      const a = i * 2.399;
      yield;
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
      yield;
      c.rotation.z = Math.sin(i) * 0.2;
    }
  } else {
    yield;
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
    yield;
    for (let i = 0; i < 5; i++) {
      yield;
      const a = i * 2.399;
      yield;
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
    yield;
    const crown = [
      [0, 3.4, 0, 1.05],
      [-1, 2.95, 0, 0.85],
      [1, 3, 0.1, 0.85],
      [0, 2.9, -0.9, 0.9],
      [0, 3, 1, 0.9],
    ];
    yield;
    if (kind === "mushroom") {
      yield;
      for (const [x, y, z, r] of crown) {
        yield;
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
        yield;
        torus(source, 0xe9c7d5, r * 0.9, 0.05, x, y, z).rotation.x =
          Math.PI / 2;
        yield;
        for (let i = 0; i < 3; i++) {
          yield;
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
      }
    } else {
      yield;
      for (let i = 0; i < crown.length; i++) {
        yield;
        const [x, y, z, r] = crown[i];
        yield;
        const color = new THREE.Color(leaf).lerp(
          new THREE.Color(i % 2 ? 0xe8dfc3 : 0x516855),
          i % 2 ? 0.12 : 0.06,
        );
        yield;
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
      yield;
      if (kind === "willow" || kind === "enchanted")
        for (let i = 0; i < 14; i++) {
          yield;
          const a = i * 2.399,
            x = Math.sin(a) * 1.25,
            z = Math.cos(a) * 1.1;
          yield;
          for (let j = 0; j < 3; j++) {
            yield;
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
        }
      yield;
      if (kind === "sakura" || kind === "enchanted")
        for (let i = 0; i < 18; i++) {
          yield;
          const a = i * 2.399,
            [cx, cy, cz, r] = crown[i % crown.length],
            x = cx + Math.sin(a) * r * 0.35,
            z = cz + Math.cos(a) * r * 0.35,
            y = cy + r * 0.85 * 0.96;
          yield;
          for (let p = 0; p < 5; p++) {
            yield;
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
          }
          yield;
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
      yield;
      if (kind === "apple")
        for (let i = 0; i < 9; i++) {
          yield;
          const a = i * 2.399,
            [cx, cy, cz, r] = crown[i % crown.length];
          yield;
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
    yield;
    for (const x of [-0.9, 0.95]) {
      yield;
      lantern(source, x, 1.3, 0.9, 0.42);
    }
  }
  yield;
  if (!low) {
    yield;
    for (const x of [-0.65, 0.55]) {
      yield;
      flowerCluster(source, x, 0.5, style.flower, 0.65);
    }
    yield;
    for (let i = 0; i < 3; i++) {
      yield;
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
}
function* sceneryTemplateSteps(record, low) {
  yield;
  const key = [record.type, record.originBiome, low].join(":");
  yield;
  if (templates.has(key)) return templates.get(key);
  yield;
  const source = new THREE.Group(),
    style = BIOME_STYLES[record.originBiome],
    spec = byScenery(record.type);
  yield;
  if (["capybara", "spa"].includes(style.hero) && spec.category === "tree")
    yield* junglePalmSteps(
      source,
      low,
      spec.kind === "willow" ? 1 : spec.kind === "apple" ? 2 : 0,
    );
  else if (
    style.hero === "spa" &&
    (spec.category === "house" || record.type === "scenery-landmark")
  ) {
    shape(source, "pole", 0xf0dfc3, 0, 1.5, 0, 1.6, 3, 1.5);
    shape(source, "dome", 0x93c7c4, 0, 3.1, 0, 2.1, 0.75, 1.95);
    shape(source, "sphere", 0xffdda3, 0, 1.5, 1.46, 0.4, 0.6, 0.06, true);
    if (!low) {
      flowerCluster(source, -1.2, 0.1, style.flower, 0.8);
      lantern(source, 1.25, 0.12, 1.25, 0.55);
    }
  } else if (
    style.hero === "capybara" &&
    (spec.category === "house" || record.type === "scenery-landmark")
  )
    tropicalHut(source, low);
  else if (style.hero === "cotton" && spec.category === "tree")
    cottonTree(source, style.leaf, low ? 0.8 : 1);
  else if (
    style.hero === "cotton" &&
    (spec.category === "house" || record.type === "scenery-landmark")
  )
    cupcake(
      source,
      style.roof,
      record.type === "scenery-landmark" ? 1.25 : 1,
      true,
    );
  else if (spec.category === "tree")
    yield* sceneryTreeSteps(source, spec.kind, style, low);
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
    yield;
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
    yield;
    if (!low) {
      yield;
      shape(source, "sphere", 0x95aa76, -0.18, 0.86, 0.1, 0.38, 0.055, 0.3);
      yield;
      flowerCluster(source, 0.58, 0.25, style.flower, 0.5);
    }
  } else if (low && spec.category === "house") {
    yield;
    shape(source, "pole", 0xe2d2bb, 0, 0.8, 0, 1, 1.6, 0.95);
    yield;
    shape(source, "dome", style.roof, 0, 1.6, 0, 1.25, 0.7, 1.2);
  } else if (record.type === "scenery-cottage")
    wizardCottage(source, 0, 0, 0, style.roof, 0.92);
  else if (record.type === "scenery-mushroom")
    mushroomHouse(source, 0, 0, 0, style.roof, 1.06, true);
  else if (record.type === "scenery-tea")
    teaPavilion(source, 0, 0, 0, style.roof, 0.85);
  else if (low) {
    yield;
    shape(source, "pole", 0xe0cfb6, 0, 1, 0, 1.1, 2, 1.1);
    yield;
    shape(source, "cone", style.roof, 0, 2.5, 0, 1.3, 1.5, 1.3);
  } else buildLandmark(source, style, record.originBiome);
  yield;
  const batched = yield* batchScenerySteps(source, {
    // A single organic surface keeps the many new jungle palms inexpensive;
    // the full crown, trunk rings, leaf veins, colours and geometry stay present.
    surfaceKind: ["capybara", "spa"].includes(style.hero) ? "leaf" : null,
  });
  yield;
  source.traverse((o) => {
    if (o.isMesh) {
      if (!o.geometry.userData.sharedScenery) o.geometry.dispose();
      if (!o.material.userData.sharedScenery) o.material.dispose();
    }
  });
  yield;
  for (const mesh of batched.children) {
    yield;
    mesh.geometry.userData.sharedScenery = true;
    yield;
    mesh.material.userData.sharedScenery = true;
  }
  yield;
  templates.set(key, batched);
  yield;
  return batched;
}
export function* sceneryModelSteps(record, { low = false } = {}) {
  yield;
  const group = (yield* sceneryTemplateSteps(record, low)).clone(),
    animationPaints = new Set();
  yield;
  group.name = record.id;
  yield;
  group.userData.sceneryId = record.id;
  yield;
  group.userData.sceneryRecord = record;
  yield;
  group.userData.opacity = 1;
  yield;
  group.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const paint = sceneryPaint(
      mesh.material,
      byScenery(record.type).category === "tree" &&
        mesh.material.userData.surfaceKind === "leaf" &&
        !low,
      mesh.geometry,
    );
    mesh.material = paint.material;
    instancePaint.set(mesh, paint);
    animationPaints.add(paint);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
  yield;
  group.userData.update = (time, reduced) => {
    for (const paint of animationPaints) {
      paint.clock.value = time;
      paint.motion.value = reduced ? 0 : 1;
    }
  };
  yield;
  positionScenery(group, record);
  yield;
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
    const shared = instancePaint.get(mesh)?.material;
    if (shared && opacity === 1 && mesh.material !== shared) {
      mesh.material.dispose();
      mesh.material = shared;
    } else if (shared && opacity !== 1 && mesh.material === shared) {
      mesh.material = clonePaint(shared);
    }
    mesh.material.opacity = opacity;
    updateSceneryBlend(mesh.material, opacity);
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
    if (mesh.customDepthMaterial) materials.add(mesh.customDepthMaterial);
    if (mesh.customDistanceMaterial) materials.add(mesh.customDistanceMaterial);
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}

function tree(...args) {
  return runSceneSteps(sceneryTreeSteps(...args));
}

function template(...args) {
  return runSceneSteps(sceneryTemplateSteps(...args));
}

export function createSceneryModel(...args) {
  return runSceneSteps(sceneryModelSteps(...args));
}
