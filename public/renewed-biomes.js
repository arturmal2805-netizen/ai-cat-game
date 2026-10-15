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
  fluffyTree,
  surfaceTexture,
} from "./fantasy-scenery.js";
import { createLagoon, createWaterfall } from "./lagoon.js";
import { creatureRide } from "./creature-rides.js";
import { decorateWhaleBiome } from "./whale-diorama.js";
export function islandHeight(biome, x, z) {
  if (biome === "clockwork") return cottonHeight(x, z);
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
export function decorateRenewedBiome(
  root,
  biome,
  { preview = false, lowOnly = false } = {},
) {
  const style = RENEWED_ISLANDS[biome.id];
  if (!style) return root;
  if (style.hero === "whale")
    return decorateWhaleBiome(root, biome, { preview, lowOnly });
  const detail = root.userData.detail,
    props = new THREE.Group(),
    animated = [],
    flowers = [];
  const low = root.userData.lowDetail;
  if (lowOnly) {
    shape(low, "stone", style.ground, -4, 1.2, -8, 4.4, 1.2, 3.1);
    shape(low, "dome", style.roof, 5, 2, 4, 1.6, 1.8, 1.6);
    return root;
  }
  const outline = new THREE.Shape();
  outline.absellipse(-4, 8, 4.5, 3, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absellipse(-4, 8, 2.7, 1.5, 0, Math.PI * 2, true);
  outline.holes.push(hole);
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
  terrace.geometry.rotateX(-Math.PI / 2);
  terrace.position.y = 0.1;
  props.add(terrace);
  const upper = createLagoon({
    x: -4,
    z: -8,
    rx: 2.7,
    rz: 1.5,
    fishCount: preview ? 8 : 18,
    seed: 19,
  });
  upper.position.y = 2.4;
  detail.add(upper);
  animated.push(upper);
  root.userData.lagoons ||= new Map();
  root.userData.lagoons.set("lake-" + biome.id + "-upper", upper);
  for (const [x, z, width, height, rotation, lift] of [
    [-4, -6.35, 2.1, 2.4, 0, 2.4],
    [-4, 11.6, 2.2, 6, 0, 0],
    [9.2, 4, 1.3, 5, -Math.PI / 2, 0],
  ]) {
    const fall = createWaterfall(x, z, width, height);
    fall.position.y += lift;
    fall.rotation.y = rotation;
    detail.add(fall);
    animated.push(fall);
  }
  if (style.river) {
    const [x, z, rx, rz, count] = style.river,
      river = createLagoon({
        x,
        z,
        rx,
        rz,
        fishCount: preview ? 8 : count,
        seed: 47,
      });
    detail.add(river);
    animated.push(river);
    root.userData.lagoons.set("lake-" + biome.id + "-river", river);
    const outfall = createWaterfall(x, 14.2, 2.3, 6.2);
    detail.add(outfall);
    animated.push(outfall);
    for (const [pz, depth] of [
      [0.45, 0.6],
      [13.9, 0.7],
    ])
      shape(props, "cube", 0x86dcdf, x, 0.15, pz, 2.0, 0.035, depth, true);
    bridge(props, x, 6.1, 4.6, 0.45);
  }
  for (let i = 0; i < 18; i++) {
    const a = (i * Math.PI) / 9,
      r = 14.1 + Math.sin(i * 2.3) * 0.25;
    const color = new THREE.Color(style.ground)
      .lerp(new THREE.Color(0xa9a3ba), 0.6)
      .getHex();
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
  for (let i = 0; i < 62; i++) {
    const a = i * 2.399,
      r = 2.5 + (i % 8) * 1.2,
      x = Math.sin(a) * r,
      z = Math.cos(a) * r;
    if (
      ((x + 4) / 5.6) ** 2 + ((z + 3) / 4.1) ** 2 < 1 ||
      (Math.abs(x + 3.5) < 1.6 && z > 0) ||
      Math.hypot(x + 4, z + 8) < 4
    )
      continue;
    flowerCluster(
      props,
      x,
      z,
      [style.flower, 0xffe395, 0xb2dfe9][i % 3],
      0.82 + (i % 3) * 0.14,
      islandHeight(biome.id, x, z) + 0.12,
    );
    if (i % 7 === 0)
      shape(props, "sphere", style.leaf, x, 0.25, z, 0.65, 0.28, 0.6);
  }
  bridge(props, -4, -2.4, 10, 0.5);
  bridge(props, 1.5, -7.4, 3.5, 2.45);
  teaPavilion(props, -7.5, 2.4, -9.3, style.roof, 0.62);
  for (let i = 0; i < 19; i++) {
    const a = i * 2.399,
      r = 9.5 + (i % 3) * 0.4,
      x = Math.sin(a) * r,
      z = Math.cos(a) * r;
    if (Math.hypot(x + 4, z + 8) < 4.3) continue;
    const flower = flowerCluster(
      props,
      x,
      z,
      [style.flower, 0xf7dc8a, 0xb8dbd8][i % 3],
      1.25,
      0.08,
    );
    flowers.push({ x, z });
    if (i % 3 === 0) lantern(props, x, 0.2, z, 0.45);
  }
  for (let i = 0; i < 11; i++) {
    const x = -7.7 + i * 0.67,
      z = -10.6 + Math.sin(i * 1.5) * 0.35;
    flowerCluster(
      props,
      x,
      z,
      style.flower,
      0.8,
      islandHeight(biome.id, x, z) + 0.06,
    );
  }
  if (style.hero === "bloom") {
    lotus(props, -4, 2.48, -10.3, 2.8, 0xf4a8d8);
    for (const [x, z, size] of [
      [-9, 1, 1.75],
      [5, 6, 1.9],
      [5, -5, 1.45],
      [0, 4, 1.1],
    ])
      lotus(props, x, 0.12, z, size, x < 0 ? 0x94d8ec : 0xaaa9ed);
    for (let i = 0; i < 15; i++) {
      const a = i * 2.4,
        x = Math.sin(a) * 12.2,
        z = Math.cos(a) * 12.2;
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
      crystal.rotation.z = Math.sin(i) * 0.13;
      flowerCluster(props, x, z, style.flower, 0.9);
    }
    for (let i = 0; i < 8; i++)
      lotus(
        props,
        -4 + Math.sin(i * 2.4) * 3.4,
        0.19,
        -3 + Math.cos(i * 2.4) * 2.3,
        0.28,
      );
  }
  if (style.hero === "butterfly") {
    for (const [x, z] of [
      [7, 7],
      [6, -4],
      [-9, 4],
    ]) {
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4;
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
  if (style.hero === "jelly") {
    crescentGate(props, 6, 0.12, 6, 0xffdf8e, 1.55);
    for (let i = 0; i < 8; i++)
      lotus(
        props,
        -4 + Math.sin(i * 2.4) * 3.5,
        0.2,
        -3 + Math.cos(i * 2.4) * 2.4,
        0.38,
      );
    for (let i = 0; i < 15; i++) {
      const a = i * 2.4;
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
  if (style.hero === "dinosaur") {
    for (let i = 0; i < 16; i++) {
      const a = i * 2.4,
        x = Math.sin(a) * 11.2,
        z = Math.cos(a) * 11.2;
      for (let leaf = 0; leaf < 5; leaf++) {
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
        petal.rotation.z = Math.sin(angle) * 0.8;
        petal.rotation.x = Math.cos(angle) * 0.8;
      }
    }
    for (const [x, z] of [
      [-10, 5],
      [6, 5],
    ]) {
      shape(props, "stone", 0xe6d2a8, x, 1.3, z, 1.1, 1.3, 0.8);
      for (let ring = 0; ring < 3; ring++) {
        const circle = new THREE.Mesh(
          new THREE.TorusGeometry(0.22 + ring * 0.14, 0.018, 4, 20),
          new THREE.MeshBasicMaterial({ color: 0xc6ad7b }),
        );
        circle.position.set(x, 1.5, z + 0.8);
        props.add(circle);
      }
    }
  }
  const flyers = [];
  const kind =
    style.hero === "jelly"
      ? "ride-jellyfish"
      : style.hero === "dinosaur"
        ? "ride-dinosaur"
        : style.hero === "bloom"
          ? "ride-dragonfly"
          : "ride-butterfly";
  for (
    let i = 0;
    i < (style.hero === "jelly" ? 5 : style.hero === "dinosaur" ? 3 : 4);
    i++
  ) {
    const creature = creatureRide(kind, { ambient: true, variant: i });
    creature.scale.setScalar(kind === "ride-dinosaur" ? 0.78 : 0.38 + i * 0.07);
    creature.position.set(
      Math.sin(i * 2.4) * 7.5,
      kind === "ride-dinosaur" ? 0.15 : 3 + i * 0.6,
      Math.cos(i * 2.4) * 7.5,
    );
    detail.add(creature);
    flyers.push(creature);
  }
  detail.add(batchScenery(props));
  const before = root.userData.update;
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
  root.userData.renewal = {
    hero: style.hero,
    flyers,
    upper,
    waterfalls: animated.filter((o) => o.name === "Waterfall"),
    flowers: flowers.length,
  };
  return root;
}
