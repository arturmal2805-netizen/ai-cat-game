import { applyUnderwaterLighting } from "./water-shading.js";
import { runSceneSteps } from "./scene-tasks.js";
import * as THREE from "three";
import {
  shape,
  line,
  torus,
  batchScenery,
  batchScenerySteps,
} from "./fantasy-scenery.js";

const palette = [0xf49cac, 0xb798dc, 0xffcf7e, 0x87d5c1, 0xea9bc8, 0x8dbde3];
export function coralCluster(parent, x, z, size = 1, variant = 0, y = 0) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.scale.setScalar(size);
  parent.add(root);
  const color = palette[variant % palette.length];
  shape(root, "stone", 0xd4cfaf, 0, 0.06, 0, 0.31, 0.1, 0.25);
  if (variant % 5 === 0) {
    for (let branch = 0; branch < 5; branch++) {
      const a = branch * 2.4,
        dx = Math.sin(a) * 0.21,
        dz = Math.cos(a) * 0.16,
        h = 0.26 + (branch % 3) * 0.09;
      line(root, [0, 0.07, 0], [dx, h, dz], color, 0.036);
      for (const side of [-1, 1]) {
        const tip = [dx + side * 0.13, h + 0.16, dz + 0.045];
        line(root, [dx, h * 0.7, dz], tip, color, 0.024);
        shape(root, "sphere", color, ...tip, 0.04, 0.04, 0.04);
      }
    }
  } else if (variant % 5 === 1) {
    const fan = shape(root, "sphere", color, 0, 0.32, 0, 0.32, 0.28, 0.026);
    fan.rotation.y = 0.45;
    for (let rib = 0; rib < 7; rib++) {
      const a = (rib / 6 - 0.5) * Math.PI * 0.8;
      line(
        root,
        [0, 0.08, 0.015],
        [Math.sin(a) * 0.29, 0.32 + Math.cos(a) * 0.25, 0.018],
        0xffd8cf,
        0.012,
      );
    }
  } else if (variant % 5 === 2) {
    shape(root, "sphere", color, 0, 0.15, 0, 0.26, 0.17, 0.23);
    for (let i = 0; i < 4; i++) {
      const ridge = torus(
        root,
        0xffe1a7,
        0.12 + i * 0.025,
        0.017,
        0,
        0.23 - i * 0.022,
        0,
      );
      ridge.rotation.x = Math.PI / 2;
      ridge.scale.y = 0.82;
    }
  } else if (variant % 5 === 3) {
    for (let tube = 0; tube < 4; tube++) {
      const a = tube * 2.4,
        x = Math.sin(a) * 0.19,
        z = Math.cos(a) * 0.19,
        h = 0.24 + (tube % 3) * 0.09;
      line(root, [x, 0.06, z], [x + 0.02, h, z], color, 0.055);
      torus(root, 0xffe5ca, 0.047, 0.015, x + 0.02, h, z).rotation.x =
        Math.PI / 2;
      shape(
        root,
        "sphere",
        0x886faa,
        x + 0.02,
        h - 0.005,
        z,
        0.032,
        0.008,
        0.032,
      );
    }
  } else {
    shape(root, "sphere", 0xe8cdad, 0, 0.09, 0, 0.19, 0.11, 0.19);
    for (let petal = 0; petal < 9; petal++) {
      const a = (petal * Math.PI * 2) / 9,
        stem = shape(
          root,
          "sphere",
          color,
          Math.sin(a) * 0.15,
          0.22,
          Math.cos(a) * 0.15,
          0.038,
          0.17,
          0.038,
        );
      stem.rotation.z = -Math.sin(a) * 0.48;
      stem.rotation.x = Math.cos(a) * 0.48;
    }
    shape(root, "sphere", 0xffd57e, 0, 0.19, 0, 0.08, 0.05, 0.08);
  }
  return root;
}
export function* reefSteps({
  rx = 3,
  rz = 2,
  seed = 1,
  count = 14,
  waterLevel,
} = {}) {
  yield;
  const source = new THREE.Group();
  yield;
  for (let i = 0; i < count; i++) {
    yield;
    const a = i * 2.399 + seed,
      r = 0.48 + (i % 4) * 0.105;
    yield;
    coralCluster(
      source,
      Math.cos(a) * rx * r,
      Math.sin(a) * rz * r,
      0.63 + (i % 3) * 0.09,
      i,
      -0.61,
    );
    yield;
    for (let leaf = 0; leaf < 3; leaf++) {
      yield;
      const kelp = shape(
        source,
        "sphere",
        leaf % 2 ? 0x79baa3 : 0xb2cc88,
        Math.cos(a) * rx * r + 0.15 + leaf * 0.045,
        -0.43 + leaf * 0.025,
        Math.sin(a) * rz * r,
        0.023,
        0.16 + leaf * 0.02,
        0.058,
      );
      yield;
      kelp.rotation.z = Math.sin(i + leaf) * 0.24;
    }
  }
  yield;
  const root = yield* batchScenerySteps(source);
  yield;
  root.name = "Underwater coral garden";
  yield;
  root.userData.clusterCount = count;
  yield;
  const clock = { value: 0 },
    motion = { value: 1 };
  yield;
  root.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.material.isMeshStandardMaterial) return;
    const material = mesh.material;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.reefTime = clock;
      shader.uniforms.reefMotion = motion;
      shader.vertexShader =
        "uniform float reefTime;uniform float reefMotion;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\ntransformed.x+=sin(reefTime*.7+position.z*3.0)*max(0.0,position.y+.61)*.018*reefMotion;",
        );
    };
    material.customProgramCacheKey = () => "reef-current-v1";
    applyUnderwaterLighting(material, clock, undefined, { level: waterLevel });
  });
  yield;
  root.userData.update = (time, reduced = false) => {
    clock.value = reduced ? 0 : time;
    motion.value = reduced ? 0 : 1;
  };
  yield;
  return root;
}

export function createReef(...args) {
  return runSceneSteps(reefSteps(...args));
}
