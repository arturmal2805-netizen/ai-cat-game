import { runSceneSteps } from "./scene-tasks.js";
import * as THREE from "three";
import {
  shape,
  line,
  flowerCluster,
  batchScenery,
  batchScenerySteps,
  lantern,
  surfaceTexture,
} from "./fantasy-scenery.js";
import {
  createLagoon,
  lagoonSteps,
  createWaterfall,
  waterfallSteps,
} from "./lagoon.js";
import { coralCluster } from "./reef.js";
import { whaleRide, whaleRideSteps } from "./whale-assets.js";
import { RENEWED_ISLANDS } from "./renewal-data.js";

export function shellHouse(parent, color = 0xb59adf, scale = 1) {
  const h = new THREE.Group();
  parent.add(h);
  h.scale.setScalar(scale);
  shape(h, "sphere", 0xf1e1d8, 0, 1, 0, 1.18, 1.08, 0.84);
  const fan = new THREE.Shape();
  fan.moveTo(0, 0);
  for (let i = 0; i <= 64; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 64,
      r = 1.85 + 0.11 * Math.cos(a * 12);
    fan.lineTo(Math.sin(a) * r, Math.cos(a) * r);
  }
  fan.closePath();
  const roof = new THREE.Mesh(
    new THREE.ExtrudeGeometry(fan, {
      depth: 0.3,
      bevelEnabled: true,
      bevelSize: 0.08,
      bevelThickness: 0.07,
      bevelSegments: 3,
      curveSegments: 32,
    }),
    new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.42,
      metalness: 0.06,
      clearcoat: 0.55,
      iridescence: 0.35,
      side: THREE.DoubleSide,
    }),
  );
  roof.position.set(0, 1.2, -0.4);
  h.add(roof);
  for (let i = 0; i < 9; i++) {
    const a = -1.25 + i * 0.3125;
    line(
      h,
      [0, 1.2, -0.03],
      [Math.sin(a) * 1.78, 1.2 + Math.cos(a) * 1.78, -0.03],
      i % 2 ? 0xe9dcff : 0xbddff5,
      0.025,
    );
  }
  shape(h, "cube", 0xb88967, 0, 0.88, 0.84, 0.6, 1.22, 0.12);
  shape(h, "sphere", 0xffcc78, 0, 1.54, 0.9, 0.4, 0.34, 0.08, true);
  shape(h, "sphere", 0xffe5a3, 0.18, 0.86, 0.92, 0.035, 0.035, 0.035, true);
  for (const x of [-0.76, 0.76]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.04, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0xf5d29a, roughness: 0.4 }),
    );
    ring.position.set(x, 1.12, 0.76);
    h.add(ring);
    shape(h, "sphere", 0xffd58d, x, 1.12, 0.75, 0.22, 0.22, 0.05, true);
  }
  for (let i = 0; i < 3; i++)
    shape(
      h,
      "cube",
      0xe4c7b3,
      0,
      0.06 + i * 0.07,
      1.5 - i * 0.23,
      1.1,
      0.12,
      0.28,
    );
  lantern(h, -1.17, 0.15, 1.1, 0.5);
  lantern(h, 1.17, 0.15, 1.1, 0.5);
  for (const side of [-1, 1]) {
    flowerCluster(h, side * 1.3, 0.15, 0xf2b6d8, 0.8);
    coralCluster(h, side * 1.05, -0.6, 0.55, side + 2, 0.05);
  }
  h.name = "Pearl shell house";
  return h;
}
function bridge(parent, x, z, length, rotation = 0, y = 0.45) {
  const h = new THREE.Group();
  h.position.set(x, y, z);
  h.rotation.y = rotation;
  parent.add(h);
  for (let i = 0; i < 24; i++) {
    const px = -length / 2 + (i * length) / 23,
      py = Math.sin((i * Math.PI) / 23) * 0.32;
    shape(
      h,
      "cube",
      i % 2 ? 0xd7b286 : 0xefcba0,
      px,
      py,
      0,
      length / 22,
      0.1,
      1.5,
    );
    if (i % 4 === 0)
      for (const side of [-1, 1]) {
        line(
          h,
          [px, py, side * 0.7],
          [px, py + 0.65, side * 0.7],
          0xbb946f,
          0.05,
        );
        lantern(h, px, py + 0.65, side * 0.7, 0.23);
      }
  }
}
function bloomingLotus(parent, x, y, z, color, size = 1) {
  const h = new THREE.Group();
  h.position.set(x, y, z);
  h.scale.setScalar(size);
  parent.add(h);
  shape(h, "sphere", 0x8bbabb, 0, 0, 0, 0.92, 0.035, 0.92);
  for (let layer = 0; layer < 2; layer++)
    for (let i = 0; i < 9; i++) {
      const a = (i * Math.PI * 2) / 9 + layer * 0.3,
        r = 0.4 - layer * 0.14,
        p = shape(
          h,
          "petal",
          layer ? 0xf2d4f5 : color,
          Math.sin(a) * r,
          0.24 + layer * 0.1,
          Math.cos(a) * r,
          0.22,
          0.58 - layer * 0.08,
          0.13,
          true,
        );
      p.rotation.y = a;
      p.rotation.z = Math.sin(a) * 0.35;
    }
  shape(h, "sphere", 0xffe29a, 0, 0.35, 0, 0.22, 0.12, 0.22, true);
}
export function* whaleBiomeSteps(
  root,
  biome,
  { preview = false, lowOnly = false } = {},
) {
  yield;
  const style = RENEWED_ISLANDS[biome.id],
    detail = root.userData.detail,
    props = new THREE.Group(),
    animated = [],
    flyers = [];
  yield;
  if (lowOnly) {
    yield;
    shape(
      root.userData.lowDetail,
      "dome",
      0xb397dd,
      -5,
      1.5,
      -10,
      1.4,
      1.3,
      1.4,
    );
    yield;
    const whale = yield* whaleRideSteps("ride-whale", { ambient: true });
    yield;
    whale.scale.setScalar(0.8);
    yield;
    whale.position.set(0, 2, 0);
    yield;
    root.userData.lowDetail.add(whale);
    yield;
    return root;
  }
  yield;
  const [ux, uz, rx, rz] = style.upper,
    outline = new THREE.Shape(),
    hole = new THREE.Path();
  yield;
  outline.absellipse(ux, -uz, rx + 1.8, rz + 1.5, 0, Math.PI * 2, false);
  yield;
  hole.absellipse(ux, -uz, rx, rz, 0, Math.PI * 2, true);
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
      color: 0xb7bfdb,
      roughness: 0.8,
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
    x: ux,
    z: uz,
    rx,
    rz,
    fishCount: preview ? 10 : 22,
    color: 0x47c7e3,
    seed: 73,
  });
  yield;
  upper.position.y = 2.4;
  yield;
  detail.add(upper);
  yield;
  animated.push(upper);
  yield;
  root.userData.lagoons.set("lake-winter-upper", upper);
  yield;
  const cascades = [
    [ux, uz + rz + 0.12, 2.7, 2.4, 0, 2.4],
    [-3, 14.7, 2.5, 6, 0, 0],
    [3, 14.7, 2, 6.2, 0, 0],
    [14.7, 0, 2, 5.8, -Math.PI / 2, 0],
    [-14.7, -2, 2.4, 6.5, Math.PI / 2, 0],
  ];
  yield;
  for (const [x, z, w, h, rot, lift] of cascades) {
    yield;
    const f = yield* waterfallSteps(x, z, w, h);
    yield;
    f.rotation.y = rot;
    yield;
    f.position.y += lift;
    yield;
    detail.add(f);
    yield;
    animated.push(f);
  }
  // Stream channels connect the lagoon to the cascading island rim.
  yield;
  for (const [x, z, sx, sz] of [
    [-3, 10.4, 2.3, 8],
    [3, 10.4, 1.8, 8],
    [11.5, 0, 7, 1.9],
    [-11.5, -2, 7, 2.1],
  ]) {
    yield;
    shape(props, "cube", 0x81d9e9, x, 0.08, z, sx, 0.035, sz, true);
  }
  yield;
  bridge(props, 0, 7.5, 12.2);
  yield;
  bridge(props, 8.8, -4.5, 6.5, Math.PI / 2);
  yield;
  bridge(props, -9.5, 1.5, 5.3, Math.PI / 2);
  yield;
  bridge(props, -1, -10, 4.7, 0, 2.45);
  yield;
  for (let i = 0; i < 48; i++) {
    yield;
    const a = i * 2.399,
      r = 10.1 + (i % 5) * 0.86,
      x = Math.sin(a) * r,
      z = Math.cos(a) * r;
    yield;
    if (Math.hypot(x - ux, z - uz) < 4.3) continue;
    yield;
    flowerCluster(
      props,
      x,
      z,
      [0xf1b1d6, 0xaedfec, 0xe3bdff, 0xffe4ab][i % 4],
      1.0 + (i % 3) * 0.15,
      0.06,
    );
    yield;
    if (i % 3 === 0)
      coralCluster(props, x + 0.25, z, 0.6 + (i % 4) * 0.13, i, 0.04);
    yield;
    if (i % 5 === 0)
      bloomingLotus(props, x, 0.07, z, i % 2 ? 0x9fdcf2 : 0xefbce6, 1.15);
  }
  yield;
  for (let i = 0; i < 9; i++) {
    yield;
    const a = i * 2.399;
    yield;
    bloomingLotus(
      props,
      Math.sin(a) * 6.3,
      0.21,
      Math.cos(a) * 5.3 - 0.5,
      i % 2 ? 0xb1e6fc : 0xefc3f3,
      0.45 + (i % 3) * 0.14,
    );
  }
  yield;
  for (let i = 0; i < 22; i++) {
    yield;
    const a = (i * Math.PI) / 11;
    yield;
    shape(
      props,
      "stone",
      0x9da8cb,
      Math.sin(a) * 15.1,
      -1.9 - (i % 3) * 0.45,
      Math.cos(a) * 15.1,
      1.1,
      2.4,
      1.1,
    );
    yield;
    shape(
      props,
      "crystal",
      i % 2 ? 0xa6dbfb : 0xd2b6ee,
      Math.sin(a) * 12.5,
      -4.6 - (i % 3) * 0.2,
      Math.cos(a) * 12.5,
      0.22,
      1.2,
      0.22,
      true,
    );
  }
  yield;
  const whales = [
    { id: "ride-whale", x: 0, y: 1.8, z: -1, scale: 1.05 },
    { id: "ride-whale-aurora", x: -5, y: 6.3, z: -5, scale: 0.73 },
    { id: "ride-whale", x: -10, y: 0.1, z: 8, scale: 0.44 },
    { id: "ride-whale-aurora", x: 8, y: 2.7, z: 8, scale: 0.4 },
  ];
  yield;
  for (const [i, p] of whales.entries()) {
    const whale = yield* whaleRideSteps(p.id, { ambient: true, variant: i });
    whale.position.set(p.x, p.y, p.z);
    whale.scale.setScalar(p.scale);
    detail.add(whale);
    flyers.push(whale);
    yield;
  }
  yield;
  const bubbleGeo = new THREE.SphereGeometry(1, 16, 10),
    bubbleMat = new THREE.MeshPhysicalMaterial({
      color: 0xdce8ff,
      transparent: true,
      opacity: 0.32,
      roughness: 0.05,
      metalness: 0.02,
      clearcoat: 1,
      iridescence: 1,
      depthWrite: false,
    }),
    bubbles = [];
  yield;
  for (let i = 0; i < 22; i++) {
    yield;
    const bubble = new THREE.Mesh(bubbleGeo, bubbleMat),
      a = i * 2.399;
    yield;
    bubble.scale.setScalar(0.1 + (i % 5) * 0.05);
    yield;
    bubble.position.set(Math.sin(a) * 9, 1.6 + (i % 6) * 0.75, Math.cos(a) * 8);
    yield;
    detail.add(bubble);
    yield;
    bubbles.push(bubble);
  }
  yield;
  detail.add(yield* batchScenerySteps(props));
  yield;
  const before = root.userData.update;
  yield;
  let lastSplash = -100;
  yield;
  root.userData.update = (time, reduced = false) => {
    before?.(time, reduced);
    animated.forEach((o) => o.userData.update(time, reduced));
    flyers.forEach((o, i) => {
      o.userData.update(time + i * 2, reduced);
      if (i === 0)
        o.userData.moving.rotation.x = reduced
          ? -0.3
          : -0.3 + Math.sin(time * 0.7) * 0.06;
    });
    bubbles.forEach((b, i) => {
      if (!reduced)
        b.position.y = 1.6 + (i % 6) * 0.75 + Math.sin(time * 0.65 + i) * 0.5;
    });
    if (!reduced && time - lastSplash > 3) {
      const p = flyers[0].userData.moving.position;
      root.userData.lagoons
        .get("lake-winter")
        ?.userData.disturb(p.x, p.z + 0.5, time, 0.95);
      lastSplash = time;
    }
  };
  yield;
  root.userData.renewal = {
    hero: "whale",
    flyers,
    upper,
    waterfalls: animated.filter((o) => o.name === "Waterfall"),
    flowers: 48,
  };
  yield;
  return root;
}

export function decorateWhaleBiome(...args) {
  return runSceneSteps(whaleBiomeSteps(...args));
}
