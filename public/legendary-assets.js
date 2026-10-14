import * as THREE from "three";
import {
  shape,
  line,
  torus,
  flowerCluster,
  lantern,
  batchScenery,
} from "./fantasy-scenery.js";
import { createLagoon, waterMaterial } from "./lagoon.js";
import { createCat, animateCat, reactCat } from "./cat-model.js";
export const LEGENDARY_RIDES = [
  "coaster-rainbow-launch",
  "slide-royal-cascade",
  "slide-vortex-bowl",
  "coaster-comet-flight",
  "ride-jellyfish",
  "ride-dragon-cloud",
];
export const RAINBOW = [
  0xff667d, 0xffad4a, 0xffdc65, 0x69d9a2, 0x43bfe6, 0x6c85f0, 0xc17ef0,
];
const V = (p) => new THREE.Vector3(...p),
  clamp = (t) => Math.max(0, Math.min(1, t));
function track(parent, curve, radius = 0.16) {
  for (let i = 0; i < 7; i++) {
    const points = Array.from({ length: 13 }, (_, j) =>
      curve.getPoint((i + j / 12) / 7),
    );
    const segment = new THREE.CatmullRomCurve3(points);
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(segment, 24, radius, 8, false),
      new THREE.MeshStandardMaterial({
        color: RAINBOW[i],
        metalness: 0.12,
        roughness: 0.24,
      }),
    );
    parent.add(mesh);
  }
}
function tower(parent, x, z, h, color = 0xffd57b) {
  shape(parent, "pole", color, x, h / 2, z, 0.7, h, 0.7);
  shape(parent, "cone", 0xf276a3, x, h + 0.6, z, 1.05, 1.5, 1.05);
  for (let i = 0; i < 5; i++)
    shape(
      parent,
      "cube",
      0x8ce8e5,
      x - 0.05,
      h * 0.2 + i * h * 0.15,
      z + 0.36,
      0.3,
      0.28,
      0.05,
      true,
    );
  lantern(parent, x + 0.5, 0.5, z + 0.5, 0.55);
  for (let i = 0; i < 4; i++) {
    const ring = torus(
      parent,
      i % 2 ? 0xffe48d : 0x86cfe0,
      0.73,
      0.04,
      x,
      ((i + 1) * h) / 5,
      z,
    );
    ring.rotation.x = Math.PI / 2;
  }
  for (let i = 0; i < 22; i++) {
    const a = i * 0.48;
    shape(
      parent,
      "cube",
      0xffe4a4,
      x + Math.sin(a) * 0.89,
      0.12 + (i * h) / 25,
      z + Math.cos(a) * 0.89,
      0.34,
      0.12,
      0.5,
    ).rotation.y = a;
  }
  line(parent, [x, h + 0.8, z], [x, h + 2, z], 0xffdc79, 0.025);
  const flag = new THREE.Mesh(
    new THREE.BufferGeometry().setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [0, 0, 0, 0.6, -0.16, 0, 0, -0.35, 0],
        3,
      ),
    ),
    new THREE.MeshStandardMaterial({
      color: RAINBOW[Math.abs(Math.round(x + z)) % 7],
      side: THREE.DoubleSide,
    }),
  );
  flag.position.set(x, h + 1.8, z);
  parent.add(flag);
}
export function royalCastle(parent, x = 0, z = 0, scale = 1) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.scale.setScalar(scale);
  parent.add(root);
  shape(root, "cube", 0xffd795, 0, 2, 0, 4, 4, 3);
  shape(root, "cone", 0xf2ad5d, 0, 5.5, 0, 3.3, 2.1, 2.5);
  for (const dx of [-2.3, 2.3])
    for (const dz of [-1.6, 1.6]) tower(root, dx, dz, 5 + (dz < 0 ? 1.2 : 0));
  for (let i = 0; i < 5; i++)
    shape(root, "cube", 0xffefb6, -1.6 + i * 0.8, 4.2, 1.6, 0.45, 0.55, 0.4);
  torus(root, 0xbffff0, 1, 0.08, 0, 2.1, 1.56);
  shape(root, "cube", 0x71c4c4, 0, 1.3, 1.53, 1.2, 2.2, 0.15);
  for (const dx of [-1.4, 1.4]) lantern(root, dx, 1, 1.9, 0.7);
  return root;
}
function cart(parent, color = 0xffd56b) {
  shape(parent, "cube", color, 0, 0.13, 0, 0.85, 0.3, 1.1);
  shape(parent, "cube", 0xfff5d8, 0, 0.36, 0.05, 0.72, 0.1, 0.65);
  for (const x of [-0.42, 0.42])
    for (const z of [-0.35, 0.35])
      shape(parent, "sphere", 0x555d8b, x, -0.05, z, 0.14, 0.14, 0.14);
  shape(parent, "sphere", 0xff8dbe, 0, 0.28, 0.52, 0.2, 0.15, 0.05);
}
export function legendaryAttraction(id) {
  if (
    !LEGENDARY_RIDES.includes(id) &&
    ![
      "toy-bubble-garden",
      "toy-magic-fish",
      "cat-barista",
      "swim-lagoon",
    ].includes(id)
  )
    return null;
  const g = new THREE.Group(),
    staticPart = new THREE.Group(),
    moving = new THREE.Group();
  g.add(staticPart, moving);
  let curve = null,
    lagoon = null,
    barista = null,
    channelWater = null,
    duration = 12,
    flight = false,
    frame;
  if (
    [
      "coaster-rainbow-launch",
      "coaster-comet-flight",
      "slide-royal-cascade",
      "slide-vortex-bowl",
    ].includes(id)
  ) {
    if (id === "coaster-rainbow-launch") {
      curve = new THREE.CatmullRomCurve3(
        [
          [-3, 0.7, 2],
          [-4, 2, -1],
          [-2, 4, -3],
          [2, 3, -2],
          [3, 1.3, 1],
          [0, 2, 2],
          [-2, 5, -1],
        ].map(V),
      );
      flight = true;
      tower(staticPart, -2, -1, 4);
      duration = 13;
    }
    if (id === "coaster-comet-flight") {
      curve = new THREE.CatmullRomCurve3(
        [
          [-4, 0.7, 3],
          [-5, 2, -2],
          [0, 7, -3],
          [4, 4, -1],
          [2, 2, 2],
          [-1, 3, 1],
          [0, 7, 0],
        ].map(V),
      );
      flight = true;
      duration = 16;
      for (let i = 0; i < 3; i++)
        torus(staticPart, RAINBOW[i + 3], 1.1, 0.08, -4 + i * 4, 3 + i, 0);
    }
    if (id === "slide-royal-cascade") {
      curve = new THREE.CatmullRomCurve3(
        [
          [-3, 7, -3],
          [-1, 6, -3],
          [3, 4, -1],
          [2, 2, 2],
          [-1, 0.7, 2],
          [1, 0.4, 3],
        ].map(V),
      );
      tower(staticPart, -3, -3, 6.8);
      duration = 11;
    }
    if (id === "slide-vortex-bowl") {
      const pts = [];
      for (let i = 0; i <= 70; i++) {
        const a = (i / 70) * Math.PI * 5,
          r = 3 * (1 - i / 70) + 0.25;
        pts.push(
          new THREE.Vector3(
            Math.sin(a) * r,
            5 * (1 - i / 70) + 0.5,
            Math.cos(a) * r,
          ),
        );
      }
      curve = new THREE.CatmullRomCurve3(pts);
      duration = 12;
      for (let i = 0; i < 4; i++) {
        const ring = torus(
          staticPart,
          RAINBOW[i + 1],
          0.7 + i * 0.62,
          0.11,
          0,
          2 + i * 0.85,
          0,
        );
        ring.rotation.x = Math.PI / 2;
      }
    }
    track(staticPart, curve, id.startsWith("slide") ? 0.48 : 0.13);
    if (id.startsWith("slide")) {
      channelWater = waterMaterial(0x4ae0ed, 0.8);
      const waterCurve = new THREE.CatmullRomCurve3(
        Array.from({ length: 61 }, (_, i) => {
          const p = curve.getPoint(i / 60);
          p.y += 0.32;
          return p;
        }),
      );
      g.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(waterCurve, 90, 0.23, 8, false),
          channelWater,
        ),
      );
    }
    if (id.startsWith("slide")) {
      lagoon = createLagoon({ x: 1, z: 2.8, rx: 2.1, rz: 1.5, fishCount: 12 });
      g.add(lagoon);
    }
    for (let i = 0; i < 9; i++) {
      const p = curve.getPoint(i / 9);
      line(staticPart, [p.x, 0, p.z], [p.x, p.y - 0.2, p.z], 0xffd584, 0.07);
      if (i % 3 === 0) lantern(staticPart, p.x, p.y + 0.25, p.z, 0.35);
    }
    cart(moving, RAINBOW[LEGENDARY_RIDES.indexOf(id) % 7]);
    frame = (elapsed, reduced = false) => {
      const t = clamp(elapsed / duration);
      let p,
        phase = "ride",
        yaw = 0;
      if (flight && t > 0.65 && t < 0.94 && !reduced) {
        const u = (t - 0.65) / 0.29,
          start = curve.getPoint(1),
          end = new THREE.Vector3(
            id === "coaster-comet-flight" ? 8 : 4,
            0.65,
            3,
          );
        p = start.clone().lerp(end, u);
        p.y += Math.sin(u * Math.PI) * (id === "coaster-comet-flight" ? 12 : 8);
        p.x += Math.sin(u * Math.PI) * (id === "coaster-comet-flight" ? 9 : 5);
        phase = "flight";
        yaw = u * Math.PI * 2;
      } else if (flight && t >= 0.94) {
        const end = new THREE.Vector3(
          id === "coaster-comet-flight" ? 8 : 4,
          0.65,
          3,
        );
        p = end.lerp(curve.getPoint(0), clamp((t - 0.94) / 0.06));
        phase = "landing";
      } else {
        const u = flight ? Math.min(1, t / 0.65) : t;
        p = curve.getPoint(u);
        const tangent = curve.getTangent(u);
        yaw = Math.atan2(tangent.x, tangent.z);
      }
      return {
        position: [p.x, p.y + 0.4, p.z],
        yaw,
        phase,
        roll: phase === "flight" ? Math.sin(elapsed * 5) * 0.22 : 0,
        paw: phase === "flight" ? 0.95 : 0.12,
        headPitch: phase === "flight" ? -0.15 : 0,
      };
    };
  } else if (id === "ride-jellyfish") {
    shape(staticPart, "dome", 0x9edfff, 0, 4, 0, 3, 1.6, 3);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      line(
        staticPart,
        [Math.sin(a) * 2.4, 4, Math.cos(a) * 2.4],
        [Math.sin(a) * 2.2, 1, Math.cos(a) * 2.2],
        RAINBOW[i % 7],
        0.065,
      );
      shape(
        moving,
        "sphere",
        RAINBOW[i % 7],
        Math.sin(a) * 2,
        0,
        Math.cos(a) * 2,
        0.38,
        0.2,
        0.4,
      );
    }
    cart(moving, 0x92d7eb);
    duration = 14;
    frame = (t, reduced) => ({
      position: [
        Math.sin(reduced ? 0 : t * 0.65) * 2,
        1.4 + (reduced ? 0 : Math.sin(t * 1.4) * 0.35),
        Math.cos(reduced ? 0 : t * 0.65) * 2,
      ],
      yaw: t * 0.65,
      phase: "float",
    });
  } else if (id === "ride-dragon-cloud") {
    shape(moving, "sphere", 0x69dbc5, 0, 0, 0, 0.55, 0.4, 1.6);
    shape(moving, "sphere", 0x91e4bd, 0, 0.2, 1.3, 0.6, 0.52, 0.65);
    for (const x of [-0.22, 0.22]) {
      shape(moving, "sphere", 0xfff6d9, x, 0.4, 1.83, 0.13, 0.16, 0.07);
      shape(moving, "sphere", 0x394e73, x, 0.42, 1.89, 0.06, 0.09, 0.03);
      shape(moving, "cone", 0xffdc6c, x, 0.8, 1.2, 0.12, 0.4, 0.12);
    }
    for (const x of [-1, 1])
      shape(moving, "sphere", 0xf4a7d4, x * 0.7, 0.1, -0.3, 1.1, 0.08, 0.75);
    for (let i = 0; i < 6; i++)
      shape(
        moving,
        "cone",
        RAINBOW[i],
        0,
        0.45,
        -1.3 + i * 0.35,
        0.16,
        0.38,
        0.16,
      );
    duration = 15;
    frame = (t, reduced) => ({
      position: [
        Math.sin(reduced ? 0 : t * 0.55) * 2.8,
        3.3 + (reduced ? 0 : Math.sin(t * 1.2) * 1.3),
        Math.cos(reduced ? 0 : t * 0.55) * 2.5,
      ],
      yaw: t * 0.55,
      phase: "float",
    });
  } else if (id === "toy-bubble-garden") {
    for (let i = 0; i < 9; i++) {
      const m = shape(
        moving,
        "sphere",
        RAINBOW[i % 7],
        Math.sin(i * 2.4) * 0.9,
        0.4 + i * 0.12,
        Math.cos(i * 2.4) * 0.9,
        0.14 + (i % 3) * 0.05,
        0.14 + (i % 3) * 0.05,
        0.14 + (i % 3) * 0.05,
      );
      m.material = m.material.clone();
      m.material.transparent = true;
      m.material.opacity = 0.48;
      m.material.metalness = 0.4;
    }
    flowerCluster(staticPart, 0, 0, 0xf098cf, 0.8);
  } else if (id === "toy-magic-fish") {
    shape(moving, "sphere", 0xffa957, 0, 0.85, 0, 0.3, 0.22, 0.55);
    shape(moving, "cone", 0xf19bd6, 0, 0.8, -0.65, 0.3, 0.15, 0.28).rotation.x =
      Math.PI / 2;
    for (const x of [-0.24, 0.24])
      shape(moving, "sphere", 0x263d60, x, 0.93, 0.25, 0.04, 0.05, 0.04);
    torus(staticPart, 0x80d4ce, 1.05, 0.055, 0, 0.09, 0).rotation.x =
      Math.PI / 2;
  } else if (id === "swim-lagoon") {
    lagoon = createLagoon({ rx: 1.7, rz: 1.7, fishCount: 18 });
    g.add(lagoon);
    for (let i = 0; i < 15; i++) {
      const a = (i * 2 * Math.PI) / 15;
      shape(
        staticPart,
        "stone",
        i % 2 ? 0xf5dca0 : 0x92d4ba,
        Math.sin(a) * 1.8,
        0,
        Math.cos(a) * 1.8,
        0.25,
        0.17,
        0.2,
      );
    }
  } else if (id === "cat-barista") {
    shape(staticPart, "cube", 0xffd49d, 0, 1.3, -0.65, 3.7, 2.6, 1.8);
    shape(staticPart, "cone", 0xf085ab, 0, 3.05, -0.65, 2.3, 1.15, 1.5);
    shape(staticPart, "cube", 0x6bbeb3, 0, 0.85, 0.8, 3.6, 1.25, 0.65);
    for (let i = 0; i < 5; i++) {
      shape(
        staticPart,
        "cube",
        i % 2 ? 0xfff1cd : 0xe581ad,
        -1.6 + i * 0.8,
        2.4,
        0.3,
        0.8,
        0.12,
        1.1,
      );
      shape(
        staticPart,
        "sphere",
        i % 2 ? 0xfff1cd : 0xe581ad,
        -1.6 + i * 0.8,
        2.35,
        0.87,
        0.38,
        0.12,
        0.1,
      );
    }
    barista = createCat("happy", { detail: "npc", color: 0x8e929f });
    barista.scale.setScalar(0.63);
    barista.position.set(0, 0.9, -0.2);
    barista.userData.preservePalette = true;
    g.add(barista);
    shape(staticPart, "dome", 0xfff3db, 0, 2.1, -0.1, 0.32, 0.28, 0.32);
    shape(staticPart, "cube", 0xffdf77, 0, 1.45, 0.36, 0.5, 0.5, 0.1);
    for (const x of [-1.2, 1.2]) {
      lantern(staticPart, x, 1.7, 0.3, 0.48);
      shape(staticPart, "pole", 0xfff2d0, x, 1.55, 0.85, 0.12, 0.17, 0.12);
      torus(staticPart, 0xffd67a, 0.08, 0.02, x + 0.15, 1.58, 0.85);
    }
    for (const x of [-1.2, 1.2]) {
      shape(staticPart, "pole", 0xffd584, x, 0.35, 1.45, 0.07, 0.7, 0.07);
      shape(staticPart, "pole", 0xffedc8, x, 0.73, 1.45, 0.43, 0.08, 0.43);
      shape(staticPart, "sphere", 0xf3a7c8, x, 0.78, 1.45, 0.29, 0.025, 0.28);
      shape(staticPart, "pole", 0xfff5db, x, 0.9, 1.45, 0.12, 0.19, 0.12);
      torus(staticPart, 0xffc675, 0.065, 0.016, x + 0.13, 0.91, 1.45);
      shape(staticPart, "pole", 0x875449, x, 1.001, 1.45, 0.1, 0.012, 0.1);
    }
    for (let i = 0; i < 7; i++)
      shape(
        moving,
        "sphere",
        0xf4ecff,
        (i % 2 ? 1 : -1) * 1.2,
        1.75 + i * 0.09,
        0.85,
        0.035,
        0.05,
        0.035,
      );
    g.userData.duration = 8;
  }
  const batch = batchScenery(staticPart);
  g.remove(staticPart);
  g.add(batch);
  g.userData = {
    ...g.userData,
    id,
    moving,
    curve,
    seatHeight: 0.55,
    duration: g.userData.duration || duration,
    rideFrame: frame,
    flight,
    lagoon,
    barista,
    handpainted: true,
  };
  if (id === "toy-magic-fish" || id === "toy-bubble-garden")
    g.userData.playFrame = (t, reduced) => ({
      position: reduced
        ? [0, 0, 0.65]
        : [
            Math.sin(t * 1.1 - 0.5) * 0.8,
            Math.max(0, Math.sin(t * 2.2)) * 0.16,
            Math.cos(t * 1.1 - 0.5) * 0.7,
          ],
      yaw: t * 1.1,
      paw: reduced ? 0 : Math.max(0, Math.sin(t * 2.2)) * 0.65,
    });
  g.userData.update = (time, reduced = false) => {
    lagoon?.userData.update(time, reduced);
    if (channelWater) channelWater.uniforms.uTime.value = reduced ? 0 : time;
    if (barista) {
      animateCat(barista, time, false, reduced);
      reactCat(
        barista,
        {
          paw: reduced
            ? 0
            : (time - (g.userData.lastServiceTime || -100) < 2 ? 0.65 : 0.2) +
              Math.sin(time * 1.4) * 0.12,
          headPitch: 0.06,
        },
        reduced,
      );
    }
    if (frame) {
      const f = frame(g.userData.rideElapsed ?? time % duration, reduced);
      if (f.phase === "flight" && curve)
        moving.position.copy(curve.getPoint(1));
      else {
        moving.position.set(...f.position);
        moving.position.y -= 0.4;
      }
      moving.rotation.y = f.yaw || 0;
    } else if (!reduced && id === "toy-magic-fish") {
      moving.position.x = Math.sin(time * 1.1) * 0.7;
      moving.position.y = Math.sin(time * 2) * 0.22;
      moving.rotation.y = time * 0.6;
    } else if (!reduced && id === "toy-bubble-garden") {
      moving.rotation.y = time * 0.15;
      moving.position.y = Math.sin(time) * 0.2;
      for (const [i, b] of moving.children.entries()) {
        if (
          g.userData.playing &&
          g.userData.heroPlayPos &&
          Math.hypot(
            b.position.x - g.userData.heroPlayPos.x,
            b.position.z - g.userData.heroPlayPos.z,
          ) < 0.3 &&
          time - (b.userData.poppedAt || -100) > 2
        )
          b.userData.poppedAt = time;
        b.visible =
          !g.userData.playing || time - (b.userData.poppedAt || -100) > 1.1;
      }
    } else if (!reduced && barista) moving.position.y = Math.sin(time) * 0.035;
  };
  g.userData.update(0, true);
  return g;
}
