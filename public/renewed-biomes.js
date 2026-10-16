import { capybaraHeight } from "./capybara-data.js";
import { runSceneSteps } from "./scene-tasks.js";
import { cottonHeight } from "./cotton-data.js";
import * as THREE from "three";
import { RENEWED_ISLANDS } from "./renewal-data.js";
import {
  shape,
  line,
  flowerCluster,
  lantern,
  teaPavilion,
  crescentGate,
  batchScenery,
  batchScenerySteps,
  fluffyTree,
  surfaceTexture,
} from "./fantasy-scenery.js";
import {
  createLagoon,
  lagoonSteps,
  createWaterfall,
  waterfallSteps,
} from "./lagoon.js";
import { creatureRide } from "./creature-rides.js";
import { whaleBiomeSteps } from "./whale-diorama.js";
export function islandHeight(biome, x, z) {
  if (biome === "clockwork") return cottonHeight(x, z);
  if (biome === "summer") return capybaraHeight(x, z);
  const upper = RENEWED_ISLANDS[biome]?.upper;
  if (!upper) return 0;
  return ((x - upper[0]) / (upper[2] + 1.8)) ** 2 +
    ((z - upper[1]) / (upper[3] + 1.5)) ** 2 <=
    1
    ? 2.4
    : 0;
}
function lotus(parent, x, y, z, size = 1, color = 0xf2add4) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.scale.setScalar(size);
  parent.add(root);
  shape(root, "sphere", 0x88b997, 0, 0, 0, 1.05, 0.035, 1.05);
  for (let layer = 0; layer < 2; layer++)
    for (let i = 0; i < 9; i++) {
      const a = (i * Math.PI * 2) / 9 + layer * 0.3,
        r = 0.52 - layer * 0.18;
      const petal = shape(
        root,
        "petal",
        layer
          ? new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.4).getHex()
          : color,
        Math.sin(a) * r,
        0.3 + layer * 0.16,
        Math.cos(a) * r,
        0.27,
        0.66 - layer * 0.12,
        0.13,
        true,
      );
      petal.rotation.y = a;
      petal.rotation.z = Math.sin(a) * 0.5;
    }
  shape(root, "sphere", 0xffda7c, 0, 0.48, 0, 0.24, 0.14, 0.24, true);
  return root;
}
function bridge(parent, x, z, length = 8, height = 0.45) {
  for (let i = 0; i < 22; i++) {
    const px = x - length / 2 + (i * length) / 21,
      py = height + Math.sin((i * Math.PI) / 21) * 0.22;
    shape(
      parent,
      "cube",
      i % 2 ? 0xc89868 : 0xdfb788,
      px,
      py,
      z,
      length / 20,
      0.09,
      1.4,
    );
    if (i % 3 === 0)
      for (const side of [-1, 1]) {
        line(
          parent,
          [px, py, z + side * 0.64],
          [px, py + 0.65, z + side * 0.64],
          0xb38a65,
          0.045,
        );
        lantern(parent, px, py + 0.7, z + side * 0.64, 0.2);
      }
  }
  for (const side of [-1, 1])
    line(
      parent,
      [x - length / 2, height + 0.64, z + side * 0.66],
      [x + length / 2, height + 0.64, z + side * 0.66],
      0xd1aa75,
      0.04,
    );
}
export function* renewedBiomeSteps(
  root,
  biome,
  { preview = false, lowOnly = false } = {},
) {
  yield;
  const style = RENEWED_ISLANDS[biome.id];
  yield;
  if (!style) return root;
  yield;
  if (style.hero === "whale")
    return yield* whaleBiomeSteps(root, biome, { preview, lowOnly });
  yield;
  const detail = root.userData.detail,
    props = new THREE.Group(),
    animated = [],
    flowers = [];
  yield;
  const low = root.userData.lowDetail;
  yield;
  if (lowOnly) {
    yield;
    shape(low, "stone", style.ground, -4, 1.2, -8, 4.4, 1.2, 3.1);
    yield;
    shape(low, "dome", style.roof, 5, 2, 4, 1.6, 1.8, 1.6);
    yield;
    return root;
  }
  yield;
  const outline = new THREE.Shape();
  yield;
  outline.absellipse(-4, 8, 4.5, 3, 0, Math.PI * 2, false);
  yield;
  const hole = new THREE.Path();
  yield;
  hole.absellipse(-4, 8, 2.7, 1.5, 0, Math.PI * 2, true);
  yield;
  outline.holes.push(hole);
  yield;
  const terrace = new THREE.Mesh(
    new THREE.ExtrudeGeometry(outline, {
      depth: 2.3,
      bevelEnabled: true,
      bevelSize: 0.07,
      bevelThickness: 0.05,
      bevelSegments: 2,
      curveSegments: 32,
    }),
    new THREE.MeshStandardMaterial({
      color: style.ground,
      roughness: 0.88,
      map: surfaceTexture("stone"),
    }),
  );
  yield;
  terrace.geometry.rotateX(-Math.PI / 2);
  yield;
  terrace.position.y = 0.1;
  yield;
  props.add(terrace);
  yield;
  const upper = yield* lagoonSteps({
    x: -4,
    z: -8,
    rx: 2.7,
    rz: 1.5,
    fishCount: preview ? 8 : 18,
    seed: 19,
  });
  yield;
  upper.position.y = 2.4;
  yield;
  detail.add(upper);
  yield;
  animated.push(upper);
  yield;
  root.userData.lagoons ||= new Map();
  yield;
  root.userData.lagoons.set("lake-" + biome.id + "-upper", upper);
  yield;
  for (const [x, z, width, height, rotation, lift] of [
    [-4, -6.35, 2.1, 2.4, 0, 2.4],
    [-4, 11.6, 2.2, 6, 0, 0],
    [9.2, 4, 1.3, 5, -Math.PI / 2, 0],
  ]) {
    yield;
    const fall = yield* waterfallSteps(x, z, width, height);
    yield;
    fall.position.y += lift;
    yield;
    fall.rotation.y = rotation;
    yield;
    detail.add(fall);
    yield;
    animated.push(fall);
  }
  yield;
  if (style.river) {
    yield;
    const [x, z, rx, rz, count] = style.river,
      river = yield* lagoonSteps({
        x,
        z,
        rx,
        rz,
        fishCount: preview ? 8 : count,
        seed: 47,
      });
    yield;
    detail.add(river);
    yield;
    animated.push(river);
    yield;
    root.userData.lagoons.set("lake-" + biome.id + "-river", river);
    yield;
    const outfall = yield* waterfallSteps(x, 14.2, 2.3, 6.2);
    yield;
    detail.add(outfall);
    yield;
    animated.push(outfall);
    yield;
    for (const [pz, depth] of [
      [0.45, 0.6],
      [13.9, 0.7],
    ]) {
      yield;
      shape(props, "cube", 0x86dcdf, x, 0.15, pz, 2.0, 0.035, depth, true);
    }
    yield;
    bridge(props, x, 6.1, 4.6, 0.45);
  }
  yield;
  for (let i = 0; i < 18; i++) {
    yield;
    const a = (i * Math.PI) / 9,
      r = 14.1 + Math.sin(i * 2.3) * 0.25;
    yield;
    const color = new THREE.Color(style.ground)
      .lerp(new THREE.Color(0xa9a3ba), 0.6)
      .getHex();
    yield;
    shape(
      props,
      "stone",
      color,
      Math.sin(a) * r,
      -1.5 - (i % 3) * 0.45,
      Math.cos(a) * r,
      1.3,
      2.1 + (i % 3) * 0.4,
      1.15,
    );
    yield;
    if (i % 2 === 0)
      shape(
        props,
        "crystal",
        0x8ccfe6,
        Math.sin(a) * 11.8,
        -4.0 - (i % 3) * 0.3,
        Math.cos(a) * 11.8,
        0.34,
        1.3,
        0.34,
        true,
      );
  }
  yield;
  for (let i = 0; i < 62; i++) {
    yield;
    const a = i * 2.399,
      r = 2.5 + (i % 8) * 1.2,
      x = Math.sin(a) * r,
      z = Math.cos(a) * r;
    yield;
    if (
      ((x + 4) / 5.6) ** 2 + ((z + 3) / 4.1) ** 2 < 1 ||
      (Math.abs(x + 3.5) < 1.6 && z > 0) ||
      Math.hypot(x + 4, z + 8) < 4
    )
      continue;
    yield;
    flowerCluster(
      props,
      x,
      z,
      [style.flower, 0xffe395, 0xb2dfe9][i % 3],
      0.82 + (i % 3) * 0.14,
      islandHeight(biome.id, x, z) + 0.12,
    );
    yield;
    if (i % 7 === 0)
      shape(props, "sphere", style.leaf, x, 0.25, z, 0.65, 0.28, 0.6);
  }
  yield;
  bridge(props, -4, -2.4, 10, 0.5);
  yield;
  bridge(props, 1.5, -7.4, 3.5, 2.45);
  yield;
  teaPavilion(props, -7.5, 2.4, -9.3, style.roof, 0.62);
  yield;
  for (let i = 0; i < 19; i++) {
    yield;
    const a = i * 2.399,
      r = 9.5 + (i % 3) * 0.4,
      x = Math.sin(a) * r,
      z = Math.cos(a) * r;
    yield;
    if (Math.hypot(x + 4, z + 8) < 4.3) continue;
    yield;
    const flower = flowerCluster(
      props,
      x,
      z,
      [style.flower, 0xf7dc8a, 0xb8dbd8][i % 3],
      1.25,
      0.08,
    );
    yield;
    flowers.push({ x, z });
    yield;
    if (i % 3 === 0) lantern(props, x, 0.2, z, 0.45);
  }
  yield;
  for (let i = 0; i < 11; i++) {
    yield;
    const x = -7.7 + i * 0.67,
      z = -10.6 + Math.sin(i * 1.5) * 0.35;
    yield;
    flowerCluster(
      props,
      x,
      z,
      style.flower,
      0.8,
      islandHeight(biome.id, x, z) + 0.06,
    );
  }
  yield;
  if (style.hero === "bloom") {
    yield;
    lotus(props, -4, 2.48, -10.3, 2.8, 0xf4a8d8);
    yield;
    for (const [x, z, size] of [
      [-9, 1, 1.75],
      [5, 6, 1.9],
      [5, -5, 1.45],
      [0, 4, 1.1],
    ]) {
      yield;
      lotus(props, x, 0.12, z, size, x < 0 ? 0x94d8ec : 0xaaa9ed);
    }
    yield;
    for (let i = 0; i < 15; i++) {
      yield;
      const a = i * 2.4,
        x = Math.sin(a) * 12.2,
        z = Math.cos(a) * 12.2;
      yield;
      const crystal = shape(
        props,
        "crystal",
        [0xb0eaf3, 0xd8b2ef, 0xf2bedb][i % 3],
        x,
        1.1,
        z,
        0.45,
        1.7 + (i % 3) * 0.35,
        0.45,
        true,
      );
      yield;
      crystal.rotation.z = Math.sin(i) * 0.13;
      yield;
      flowerCluster(props, x, z, style.flower, 0.9);
    }
    yield;
    for (let i = 0; i < 8; i++) {
      yield;
      lotus(
        props,
        -4 + Math.sin(i * 2.4) * 3.4,
        0.19,
        -3 + Math.cos(i * 2.4) * 2.3,
        0.28,
      );
    }
  }
  yield;
  if (style.hero === "butterfly") {
    yield;
    for (const [x, z] of [
      [7, 7],
      [6, -4],
      [-9, 4],
    ]) {
      yield;
      for (let i = 0; i < 9; i++) {
        yield;
        const a = i * 2.4;
        yield;
        shape(
          props,
          "sphere",
          0xffd685,
          x + Math.sin(a) * 1.2,
          1.8 + (i % 3) * 0.7,
          z + Math.cos(a) * 1.2,
          0.17,
          0.22,
          0.17,
          true,
        );
      }
    }
  }
  yield;
  if (style.hero === "jelly") {
    yield;
    crescentGate(props, 6, 0.12, 6, 0xffdf8e, 1.55);
    yield;
    for (let i = 0; i < 8; i++) {
      yield;
      lotus(
        props,
        -4 + Math.sin(i * 2.4) * 3.5,
        0.2,
        -3 + Math.cos(i * 2.4) * 2.4,
        0.38,
      );
    }
    yield;
    for (let i = 0; i < 15; i++) {
      yield;
      const a = i * 2.4;
      yield;
      shape(
        props,
        "cone",
        i % 2 ? 0xb99ae5 : 0x80bfe0,
        Math.sin(a) * 11,
        0.52,
        Math.cos(a) * 11,
        0.17,
        0.78,
        0.17,
        true,
      );
    }
  }
  yield;
  if (style.hero === "dinosaur") {
    yield;
    for (let i = 0; i < 16; i++) {
      yield;
      const a = i * 2.4,
        x = Math.sin(a) * 11.2,
        z = Math.cos(a) * 11.2;
      yield;
      for (let leaf = 0; leaf < 5; leaf++) {
        yield;
        const angle = (leaf * Math.PI * 2) / 5,
          petal = shape(
            props,
            "petal",
            i % 2 ? 0x83b965 : 0xb4d688,
            x + Math.sin(angle) * 0.38,
            0.35,
            z + Math.cos(angle) * 0.38,
            0.2,
            0.9,
            0.04,
          );
        yield;
        petal.rotation.z = Math.sin(angle) * 0.8;
        yield;
        petal.rotation.x = Math.cos(angle) * 0.8;
      }
    }
    yield;
    for (const [x, z] of [
      [-10, 5],
      [6, 5],
    ]) {
      yield;
      shape(props, "stone", 0xe6d2a8, x, 1.3, z, 1.1, 1.3, 0.8);
      yield;
      for (let ring = 0; ring < 3; ring++) {
        yield;
        const circle = new THREE.Mesh(
          new THREE.TorusGeometry(0.22 + ring * 0.14, 0.018, 4, 20),
          new THREE.MeshBasicMaterial({ color: 0xc6ad7b }),
        );
        yield;
        circle.position.set(x, 1.5, z + 0.8);
        yield;
        props.add(circle);
      }
    }
  }
  yield;
  const flyers = [];
  yield;
  const kind =
    style.hero === "jelly"
      ? "ride-jellyfish"
      : style.hero === "dinosaur"
        ? "ride-dinosaur"
        : style.hero === "bloom"
          ? "ride-dragonfly"
          : "ride-butterfly";
  yield;
  for (
    let i = 0;
    i < (style.hero === "jelly" ? 5 : style.hero === "dinosaur" ? 3 : 4);
    i++
  ) {
    yield;
    const creature = creatureRide(kind, { ambient: true, variant: i });
    yield;
    creature.scale.setScalar(kind === "ride-dinosaur" ? 0.78 : 0.38 + i * 0.07);
    yield;
    creature.position.set(
      Math.sin(i * 2.4) * 7.5,
      kind === "ride-dinosaur" ? 0.15 : 3 + i * 0.6,
      Math.cos(i * 2.4) * 7.5,
    );
    yield;
    detail.add(creature);
    yield;
    flyers.push(creature);
  }
  yield;
  detail.add(yield* batchScenerySteps(props));
  yield;
  const before = root.userData.update;
  yield;
  root.userData.update = (time, reduced = false) => {
    before?.(time, reduced);
    if (!detail.visible) return;
    for (const object of animated) object.userData.update(time, reduced);
    flyers.forEach((creature, i) => {
      creature.userData.update(time + i * 2, reduced);
      if (kind !== "ride-dinosaur" && !reduced)
        creature.position.y = 3 + i * 0.6 + Math.sin(time * 0.5 + i) * 0.35;
    });
  };
  yield;
  root.userData.renewal = {
    hero: style.hero,
    flyers,
    upper,
    waterfalls: animated.filter((o) => o.name === "Waterfall"),
    flowers: flowers.length,
  };
  yield;
  return root;
}

export function decorateRenewedBiome(...args) {
  return runSceneSteps(renewedBiomeSteps(...args));
}
