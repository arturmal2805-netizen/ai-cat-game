import {
  shape,
  line,
  mushroomHouse,
  crescentGate,
  fluffyTree,
  batchScenery,
} from "./fantasy-scenery.js";
import { createLagoon, waterMaterial } from "./lagoon.js";
import * as THREE from "three";
import { installSlideWater } from "./slide-water.js";
import { batchModelGeometry } from "./model-batching.js";
import {
  primitive,
  ball,
  box,
  rod,
  glowOrb,
  material,
} from "./world-assets.js";
import { byItem, byBiome, CROPS } from "./game-data.js";
export function advancedAttraction(id, fields = [], now = Date.now()) {
  const item = byItem(id);
  if (!item) return null;
  const g = new THREE.Group(),
    moving = new THREE.Group();
  g.add(moving);
  let curve = null,
    seatHeight = 0.5,
    aquarium = null,
    waterSurface = null,
    slide = null;
  const themeColors = {
    "coaster-lagoon": 0x72c1ce,
    "coaster-sakura": 0xe9b1cc,
    "coaster-moon": 0xb4a0d9,
    "coaster-mushroom": 0xc995bb,
    "coaster-cloud": 0xe1d7ee,
    "coaster-clockwork": 0xd9b782,
  };
  const color =
      themeColors[id] ||
      (item.rarity === "Легендарное"
        ? 0xb5a2e8
        : item.rarity === "Эпическое"
          ? 0xd6a0c6
          : 0x91bcbc),
    gold = 0xf0d19f;
  const path = (points, wet = false) => {
    curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    if (!wet) {
      primitive(g, new THREE.TubeGeometry(curve, 100, 0.075, 6, false), gold);
      const ties = new THREE.Group();
      for (let i = 0; i < 38; i++) {
        const p = curve.getPoint(i / 38),
          t = curve.getTangent(i / 38),
          beam = shape(
            ties,
            "cube",
            0xb99268,
            p.x,
            p.y - 0.025,
            p.z,
            0.62,
            0.065,
            0.14,
          );
        beam.rotation.y = Math.atan2(t.x, t.z);
      }
      g.add(batchScenery(ties));
      for (const sign of [-1, 1]) {
        const points = [];
        for (let i = 0; i <= 90; i++) {
          const p = curve.getPoint(i / 90),
            t = curve.getTangent(i / 90),
            side = new THREE.Vector3(t.z, 0, -t.x).normalize();
          points.push(p.addScaledVector(side, sign * 0.22));
        }
        primitive(
          g,
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(points),
            90,
            0.04,
            5,
            false,
          ),
          gold,
        );
      }
    }
    const supports = wet ? new THREE.Group() : g;
    for (let i = 0; i < 14; i++) {
      const p = curve.getPoint(i / 14);
      rod(supports, 0x8c809f, p.x, p.y / 2, p.z, 0.06, Math.max(0.1, p.y));
    }
    if (wet) {
      g.add(batchModelGeometry(supports));
      supports.traverse((m) => {
        if (m.isMesh && !m.geometry.userData.sharedScenery)
          m.geometry.dispose();
      });
    }
    return curve;
  };
  if (id.startsWith("coaster-")) {
    const [w, d] = item.footprint;
    const height =
      id === "coaster-legendary" || id === "coaster-cloud"
        ? 7
        : id === "coaster-mystic"
          ? 6
          : 4;
    const points = [];
    for (let i = 0; i <= 60; i++) {
      const t = (i / 60) * Math.PI * 2;
      if (id === "coaster-mystic" || id === "coaster-sakura")
        points.push([
          Math.sin(t) * (w / 2 - 0.5),
          0.8 + ((Math.cos(t * 2) + 1) * height) / 2,
          Math.sin(t * 2) * (d / 2 - 0.5),
        ]);
      else if (id === "coaster-legendary")
        points.push([
          Math.cos(t) * (w / 2 - 0.5),
          0.8 + ((Math.sin(t * 3) + 1) * height) / 2,
          Math.sin(t) * (d / 2 - 0.5),
        ]);
      else
        points.push([
          Math.cos(t) * (w / 2 - 0.5),
          0.8 +
            ((Math.sin(t * (id === "coaster-dragon" ? 3 : 2)) + 1) * height) /
              2,
          Math.sin(t) * (d / 2 - 0.5),
        ]);
    }
    path(points);
    box(moving, color, 0, 0.15, 0, 1, 0.55, 1.35);
    box(moving, gold, 0, 0.5, 0.1, 0.8, 0.12, 0.7);
    for (let i = 0; i < 3; i++) {
      const portal = primitive(
        g,
        new THREE.TorusGeometry(0.85, 0.07, 8, 28),
        color,
        (Math.cos(i * 2) * w) / 3,
        2.3,
        (Math.sin(i * 2) * d) / 3,
        0.6,
      );
      portal.rotation.y = i;
    }
    if (id === "coaster-mystic") {
      glowOrb(g, 0xc5b0fa, 0, 1.4, 0, 0.65);
      for (let i = 0; i < 8; i++)
        primitive(
          g,
          new THREE.OctahedronGeometry(0.18, 0),
          0xe8c9ff,
          Math.cos(i) * 2.5,
          3 + Math.sin(i) * 1.3,
          Math.sin(i) * 2.5,
          0.7,
        );
    }
    if (id === "coaster-dragon" || id === "coaster-legendary") {
      rod(g, 0x8c749c, 0, 1.6, 0, 0.65, 3.2);
      primitive(g, new THREE.ConeGeometry(1.15, 1.5, 6), color, 0, 3.5, 0);
      glowOrb(
        g,
        id === "coaster-dragon" ? 0xffb980 : 0xc7b7ef,
        0,
        4.5,
        0,
        0.45,
      );
    }
    const station = new THREE.Group();
    mushroomHouse(station, -w / 2 + 1.25, 0, -d / 2 + 1.25, color, 0.55);
    if (id.includes("moon") || id.includes("mystic"))
      crescentGate(station, w / 2 - 1.2, 0, -d / 2 + 1.1, gold, 0.43);
    if (id === "coaster-sakura")
      for (const sign of [-1, 1])
        fluffyTree(
          station,
          sign * (w / 2 - 1),
          -d / 2 + 1,
          0xf1b5d0,
          "sakura",
          0.5,
        );
    if (id === "coaster-lagoon") {
      aquarium = createLagoon({
        rx: w * 0.19,
        rz: d * 0.18,
        fishCount: 12,
        color: 0x43c8dd,
      });
      aquarium.position.y = 1;
      g.add(aquarium);
      fluffyTree(station, w / 2 - 1, -d / 2 + 1, 0x8fbf70, "palm", 0.6);
    }
    if (id === "coaster-cloud")
      for (let i = 0; i < 5; i++)
        shape(
          station,
          "sphere",
          0xf2eaf6,
          Math.sin(i) * w * 0.35,
          2 + Math.cos(i),
          Math.cos(i) * d * 0.35,
          0.9,
          0.35,
          0.6,
        );
    g.add(batchScenery(station));
    g.userData.duration = 12;
  } else if (["water-river", "water-whirlpool", "water-extreme"].includes(id)) {
    const [w, d] = item.footprint;
    const points = [];
    for (let i = 0; i <= 50; i++) {
      const t = (i / 50) * Math.PI * 2,
        r =
          id === "water-whirlpool"
            ? Math.max(0.6, (w / 2 - 0.5) * (1 - i / 60))
            : w / 2 - 0.6;
      points.push([
        Math.cos(t) * r,
        id === "water-extreme" ? 6 * (1 - i / 50) + 0.2 : 0.35,
        Math.sin(t) * (id === "water-whirlpool" ? r : d / 2 - 0.6),
      ]);
    }
    path(points, true);
    const end = curve.getPoint(1),
      whirl = id === "water-whirlpool";
    slide = {
      channels: [
        { curve, width: 0.29, offset: 0.09, shell: { color, depth: 0.34 } },
      ],
      pool: {
        x: whirl ? 0 : end.x - 0.12,
        z: whirl ? 0 : end.z,
        rx: whirl ? 1.3 : 0.48,
        rz: whirl ? 1.1 : 0.46,
        surfaceY: 0.155,
      },
      simpleRide: true,
      speed: id === "water-river" ? 1.1 : 4.4,
    };
    box(moving, color, 0, 0, 0, 0.75, 0.25, 1.1);
    g.userData.duration = 10;
  } else if (item.category === "farm") {
    box(
      g,
      0xab866d,
      0,
      0.06,
      0,
      item.footprint[0] - 0.2,
      0.12,
      item.footprint[1] - 0.2,
    );
    for (let plot = 0; plot < 3; plot++) {
      const x = (plot - 1) * 1.05;
      box(g, 0x775f56, x, 0.15, 0, 0.9, 0.12, 2.3);
      const cell = fields[plot],
        crop = CROPS.find((c) => c.id === cell?.crop);
      if (crop) {
        const ready = now >= cell.readyAt;
        for (let j = 0; j < 5; j++) {
          const z = -0.8 + j * 0.4;
          rod(g, 0x9aba7b, x, 0.3, z, 0.025, ready ? 0.45 : 0.15);
          ball(
            g,
            ready ? byBiome(crop.biome).accent : 0xb1c691,
            x,
            ready ? 0.6 : 0.3,
            z,
            ready ? 0.1 : 0.06,
          );
        }
      }
    }
    if (id === "greenhouse") {
      for (const x of [-2, 2]) rod(g, gold, x, 1.3, 0, 0.045, 2.6);
      const roof = primitive(
        g,
        new THREE.ConeGeometry(3, 1.3, 4),
        0xc1dbda,
        0,
        2.75,
        0,
      );
      roof.rotation.y = Math.PI / 4;
      roof.material = roof.material.clone();
      roof.material.transparent = true;
      roof.material.opacity = 0.22;
    }
    if (id === "barn") {
      box(g, 0xc39fa7, 1.1, 0.6, -0.75, 1.4, 1.1, 1);
      primitive(
        g,
        new THREE.ConeGeometry(1.3, 0.7, 4),
        color,
        1.1,
        1.5,
        -0.75,
      ).rotation.y = Math.PI / 4;
    }
    if (id === "orchard") {
      for (const x of [-1.6, 1.6]) {
        rod(g, 0xa18476, x, 0.6, -1.4, 0.09, 1.2);
        ball(g, 0xa1b492, x, 1.45, -1.4, 0.65);
        glowOrb(g, 0xe8b3be, x + 0.25, 1.35, -1.1, 0.13);
      }
    }
  } else if (id === "zipline") {
    for (const x of [-2.8, 2.8]) rod(g, color, x, 2, 0, 0.15, 4);
    path([
      [-2.8, 3.7, 0],
      [0, 2.7, 0],
      [2.8, 3.7, 0],
    ]);
    box(moving, gold, 0, 0, 0, 0.8, 0.15, 0.55);
  } else if (id === "drop-tower") {
    rod(g, color, 0, 3.2, 0, 0.22, 6.4);
    for (let i = 0; i < 4; i++) glowOrb(g, gold, 0, 1.5 + i * 1.4, 0.3, 0.1);
    box(moving, gold, 0, 0.5, 0, 1.4, 0.25, 1.2);
  } else if (id === "bumpercars" || id === "catbus") {
    primitive(
      g,
      new THREE.CylinderGeometry(
        item.footprint[0] / 2 - 0.3,
        item.footprint[0] / 2 - 0.3,
        0.13,
        32,
      ),
      color,
      0,
      0.07,
      0,
    );
    box(
      moving,
      id === "catbus" ? 0xd8b88e : 0xbb9acb,
      0,
      0.4,
      0,
      id === "catbus" ? 1.2 : 0.8,
      id === "catbus" ? 0.8 : 0.4,
      id === "catbus" ? 2 : 1.1,
    );
    if (id === "catbus")
      for (const x of [-0.65, 0.65])
        for (const z of [-0.65, 0.65]) ball(moving, 0x6c6b7f, x, 0.15, z, 0.16);
  } else if (["rocket", "ufo", "airship", "skate"].includes(id)) {
    if (id === "rocket") {
      rod(moving, color, 0, 0.5, 0, 0.3, 1.7).rotation.x = Math.PI / 2;
      primitive(
        moving,
        new THREE.ConeGeometry(0.3, 0.6, 12),
        gold,
        0,
        0.5,
        0.95,
      ).rotation.x = Math.PI / 2;
      glowOrb(moving, 0xffc6a1, 0, 0.5, -1, 0.2);
    }
    if (id === "ufo") {
      const disk = ball(moving, color, 0, 0.2, 0, 1);
      disk.scale.y = 0.25;
      const dome = ball(moving, 0xbcd4e6, 0, 0.6, 0, 0.5);
      dome.scale.y = 0.65;
      for (let i = 0; i < 8; i++)
        glowOrb(
          moving,
          gold,
          Math.cos((i * Math.PI) / 4) * 0.8,
          0.15,
          Math.sin((i * Math.PI) / 4) * 0.8,
          0.06,
        );
    }
    if (id === "airship") {
      const body = ball(moving, color, 0, 1.8, 0, 1.3);
      body.scale.set(0.8, 0.7, 1.6);
      box(moving, gold, 0, 0.3, 0, 0.9, 0.4, 1);
      for (const x of [-0.45, 0.45]) rod(moving, gold, x, 1, 0, 0.015, 1.3);
    }
    if (id === "skate") {
      box(moving, color, 0, 0.15, 0, 0.65, 0.1, 1.3);
      for (const x of [-0.35, 0.35])
        for (const z of [-0.45, 0.45]) ball(moving, gold, x, 0.05, z, 0.1);
    }
  } else if (id === "maze") {
    for (let i = 0; i < 6; i++) {
      box(
        g,
        0x8fa895,
        ((i % 3) - 1) * 1.6,
        0.45,
        (Math.floor(i / 3) - 0.5) * 2,
        1.3,
        0.9,
        0.45,
      );
    }
    glowOrb(g, gold, 0, 1.2, 0, 0.13);
  } else if (id === "laser" || id === "fireflies") {
    if (id === "fireflies") {
      const jar = primitive(
        g,
        new THREE.CylinderGeometry(0.45, 0.45, 0.9, 16, 1, true),
        0xb8d2d2,
        0,
        0.5,
        0,
      );
      jar.material = jar.material.clone();
      jar.material.transparent = true;
      jar.material.opacity = 0.25;
    }
    for (let i = 0; i < 5; i++)
      glowOrb(
        moving,
        gold,
        Math.sin(i) * 0.4,
        0.5 + (i % 3) * 0.2,
        Math.cos(i) * 0.4,
        0.06,
      );
  } else if (id === "toy-fish") {
    const fish = ball(moving, color, 0, 0.3, 0, 0.35);
    fish.scale.set(0.65, 0.7, 1.35);
    primitive(
      moving,
      new THREE.ConeGeometry(0.2, 0.3, 3),
      gold,
      0,
      0.3,
      -0.5,
    ).rotation.x = Math.PI / 2;
  } else if (["library", "observatory"].includes(id)) {
    box(g, 0xb6a3bd, 0, 0.7, 0, 2.5, 1.4, 2);
    if (id === "observatory") {
      primitive(
        g,
        new THREE.SphereGeometry(1.6, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        color,
        0,
        1.4,
        0,
      );
      const telescope = rod(g, gold, 0.5, 2.4, 0, 0.14, 1.4);
      telescope.rotation.z = -0.5;
    } else {
      primitive(
        g,
        new THREE.ConeGeometry(2.1, 1.2, 4),
        color,
        0,
        2,
        0,
      ).rotation.y = Math.PI / 4;
      for (let i = 0; i < 5; i++)
        box(
          g,
          [0xb48cb7, 0xa5c3b5, gold][i % 3],
          -0.8 + i * 0.4,
          0.7,
          1.03,
          0.25,
          0.6,
          0.1,
        );
    }
    glowOrb(g, gold, 0, 1, 1.05, 0.2);
  } else if (id === "spa") {
    primitive(
      g,
      new THREE.CylinderGeometry(1.5, 1.5, 0.2, 30),
      color,
      0,
      0.12,
      0,
    );
    primitive(
      g,
      new THREE.CylinderGeometry(1.3, 1.3, 0.03, 30),
      0xa4d7d2,
      0,
      0.24,
      0,
    );
    for (let i = 0; i < 8; i++)
      ball(moving, 0xd8eeee, Math.sin(i) * 0.9, 0.35, Math.cos(i) * 0.9, 0.1);
  } else if (id === "festival") {
    box(g, color, 0, 0.2, 0, 5, 0.4, 3.5);
    for (const x of [-2, 2]) rod(g, gold, x, 2, 0, 0.07, 4);
    for (let i = 0; i < 9; i++)
      glowOrb(
        moving,
        [0xddb0dd, 0xb4e6d4, gold][i % 3],
        -2 + i * 0.5,
        3.6 - Math.sin((i / 8) * Math.PI) * 0.7,
        -1,
        0.13,
      );
    primitive(g, new THREE.ConeGeometry(2.8, 1.5, 12), color, 0, 4.2, 0);
  } else if (id === "portal") {
    primitive(
      moving,
      new THREE.TorusGeometry(1.1, 0.12, 10, 40),
      color,
      0,
      1.35,
      0,
      0.7,
    );
    for (const x of [-1.15, 1.15]) rod(g, gold, x, 0.65, 0, 0.1, 1.3);
  } else return null;
  g.userData = {
    id,
    moving,
    curve,
    seatHeight,
    duration: g.userData.duration,
    aquarium,
    waterMaterial: waterSurface,
  };
  if (slide) installSlideWater(g, slide);
  return g;
}
export function constructionModel(itemId) {
  const item = byItem(itemId),
    g = new THREE.Group(),
    moving = new THREE.Group();
  g.add(moving);
  const [w, d] = item.footprint;
  box(g, 0xa6a0b8, 0, 0.04, 0, w, 0.08, d);
  for (const x of [-w / 2, w / 2])
    for (const z of [-d / 2, d / 2]) rod(g, 0xc7ab84, x, 0.7, z, 0.055, 1.4);
  for (const z of [-d / 2, d / 2]) box(g, 0xd4bba0, 0, 0.75, z, w, 0.1, 0.07);
  const blueprint = box(g, 0xa1bcca, 0, 0.16, 0, w * 0.85, 0.2, d * 0.85);
  blueprint.material = blueprint.material.clone();
  blueprint.material.transparent = true;
  blueprint.material.opacity = 0.35;
  primitive(
    moving,
    new THREE.TorusGeometry(0.38, 0.045, 8, 24),
    0xf4d89d,
    0,
    1.1,
    0,
    0.4,
  );
  rod(moving, 0xf4d89d, 0, 1.15, 0, 0.025, 0.35).rotation.z = 0.6;
  g.userData = { id: "construction", moving, itemId };
  return g;
}
export function animateAdvanced(g, time) {
  const { id, moving, curve } = g.userData;
  if (!moving) return;
  g.userData.aquarium?.userData.update(time);
  if (g.userData.waterMaterial)
    g.userData.waterMaterial.uniforms.uTime.value = time;
  if (curve) {
    const progress = (time * 0.1) % 1,
      p = curve.getPoint(progress),
      next = curve.getPoint((progress + 0.003) % 1);
    moving.position.copy(p);
    moving.rotation.y = Math.atan2(next.x - p.x, next.z - p.z);
  } else if (
    ["rocket", "ufo", "airship", "skate", "bumpercars", "catbus"].includes(id)
  ) {
    const radius = id === "airship" ? 1.8 : id === "catbus" ? 1.7 : 1.2;
    moving.position.set(
      Math.sin(time * 0.6) * radius,
      ["rocket", "ufo", "airship"].includes(id)
        ? 1.4 + Math.sin(time) * 0.3
        : 0.2,
      Math.cos(time * 0.6) * radius,
    );
    moving.rotation.y = time * 0.6 + Math.PI / 2;
  } else if (id === "drop-tower")
    moving.position.y = 1.5 + (Math.sin(time * 0.8) + 1) * 2;
  else if (["portal", "construction"].includes(id))
    moving.rotation.y = time * 0.5;
  else if (id === "toy-fish")
    moving.position.y = Math.abs(Math.sin(time * 2)) * 0.5;
  else if (["fireflies", "laser", "spa", "festival"].includes(id))
    moving.rotation.y = time * 0.3;
}
