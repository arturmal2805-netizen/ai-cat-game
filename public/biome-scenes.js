import * as THREE from "three";
import {
  shape,
  line,
  torus,
  flowerCluster,
  fluffyTree,
  lantern,
  wizardCottage,
  mushroomHouse,
  teaPavilion,
  crescentGate,
  batchScenery,
  surfaceTexture,
} from "./fantasy-scenery.js";
import {
  fantasyArtVersion,
  illustratedScenery,
  hasFantasyArt,
} from "./fantasy-art.js";
import {
  createGroundCover,
  landscapedTrees,
  placementClearance,
} from "./landscape-detail.js";
import { byItem } from "./game-data.js";
import { coralCluster } from "./reef.js";
import { createLagoon, createWaterfall } from "./lagoon.js";

export const BIOME_STYLES = {
  moon: {
    ground: 0x7c9b77,
    leaf: 0x8776b5,
    flower: 0xd5b1ed,
    roof: 0x9871bb,
    kind: "oak",
    hero: "moon",
    water: [5, 4, 1.7, 1.25, 10],
  },
  autumn: {
    ground: 0xc3a16c,
    leaf: 0xdf964e,
    flower: 0xffd48e,
    roof: 0xb8814e,
    kind: "maple",
    hero: "pumpkin",
  },
  winter: {
    ground: 0xe7edf2,
    leaf: 0x75a6b5,
    flower: 0xb8e9f2,
    roof: 0x789fb5,
    kind: "snow",
    hero: "snow",
  },
  beach: {
    ground: 0xf0d9a2,
    leaf: 0x7db45f,
    flower: 0xf8c09c,
    roof: 0x57b5bf,
    kind: "palm",
    hero: "beach",
    water: [-3.8, -3, 5, 3.4, 36],
  },
  water: {
    ground: 0x9bc9b3,
    leaf: 0x70bca4,
    flower: 0xf5bfd9,
    roof: 0x749eb1,
    kind: "palm",
    hero: "lotus",
    water: [-4.5, -4, 4.2, 2.8, 28],
  },
  wizard: {
    ground: 0x877c9e,
    leaf: 0x786da9,
    flower: 0xbb95dd,
    roof: 0x8261b0,
    kind: "pine",
    hero: "wizard",
  },
  summer: {
    ground: 0xb1bb76,
    leaf: 0x9fba68,
    flower: 0xffd171,
    roof: 0xba9270,
    kind: "fruit",
    hero: "sunflower",
  },
  nature: {
    ground: 0x6f9973,
    leaf: 0x628b5f,
    flower: 0xd7ddb0,
    roof: 0x768c70,
    kind: "oak",
    hero: "treehouse",
  },
  sakura: {
    ground: 0xb8b797,
    leaf: 0xf2b0cb,
    flower: 0xffdbe8,
    roof: 0x9c789c,
    kind: "sakura",
    hero: "tea",
    water: [-4.8, -4, 3.5, 2.4, 18],
  },
  clouds: {
    ground: 0xe0dce9,
    leaf: 0xc0b0d8,
    flower: 0xffdfba,
    roof: 0xb5a0d0,
    kind: "oak",
    hero: "cloudcastle",
  },
  desert: {
    ground: 0xe3bf88,
    leaf: 0x99b481,
    flower: 0xf5d09e,
    roof: 0xba8968,
    kind: "palm",
    hero: "oasis",
    water: [-6, -5, 2.2, 1.35, 12],
  },
  stars: {
    ground: 0x8f88b0,
    leaf: 0xa597c9,
    flower: 0xf4d8a0,
    roof: 0x8c77b2,
    kind: "oak",
    hero: "observatory",
  },
  volcano: {
    ground: 0x947777,
    leaf: 0xa57482,
    flower: 0xffbd7e,
    roof: 0x9a657c,
    kind: "maple",
    hero: "volcano",
  },
  crystal: {
    ground: 0xa9c6cb,
    leaf: 0x9dc3d0,
    flower: 0xe0cbf6,
    roof: 0x9ab4d4,
    kind: "pine",
    hero: "crystal",
  },
  candy: {
    ground: 0xe2b8cd,
    leaf: 0xe8a8cc,
    flower: 0xffe3aa,
    roof: 0xe192bb,
    kind: "fruit",
    hero: "candy",
  },
  rainbow: {
    ground: 0xb8d4bc,
    leaf: 0xb0c1d1,
    flower: 0xffbfd5,
    roof: 0xc3acd7,
    kind: "oak",
    hero: "rainbow",
  },
  bamboo: {
    ground: 0x9bb28b,
    leaf: 0x8dac68,
    flower: 0xf0dfb6,
    roof: 0x84a290,
    kind: "bamboo",
    hero: "bamboo",
  },
  mushrooms: {
    ground: 0xa192ab,
    leaf: 0xbd98c1,
    flower: 0xf4c1dc,
    roof: 0xb681b5,
    kind: "oak",
    hero: "mushrooms",
  },
  galaxy: {
    ground: 0x9990bc,
    leaf: 0xada0d7,
    flower: 0xe7c3f4,
    roof: 0x8c79b9,
    kind: "oak",
    hero: "planet",
  },
  coral: {
    ground: 0xc8ce95,
    leaf: 0xabbcc3,
    flower: 0xf5aebd,
    roof: 0xca9ab7,
    kind: "palm",
    hero: "coral",
    water: [-5, -4, 3.8, 2.6, 30],
  },
  lotus: {
    ground: 0xa8cab1,
    leaf: 0x88b8a0,
    flower: 0xfbd2e3,
    roof: 0x9d8eaf,
    kind: "bamboo",
    hero: "tea",
    water: [-5, -4, 3.4, 2.3, 20],
  },
  ice: {
    ground: 0xdeedf2,
    leaf: 0xb1d3df,
    flower: 0xb9f0eb,
    roof: 0x97bdd1,
    kind: "snow",
    hero: "ice",
  },
  clockwork: {
    ground: 0xcbbd93,
    leaf: 0xb9a289,
    flower: 0xfbd996,
    roof: 0xb69474,
    kind: "maple",
    hero: "clock",
  },
  dusk: {
    ground: 0x9e91aa,
    leaf: 0xaa94b7,
    flower: 0xe4c7e2,
    roof: 0x8d709d,
    kind: "oak",
    hero: "library",
  },
};
function seedOf(id) {
  return [...id].reduce((s, c) => s + c.charCodeAt(0), 0);
}
function terrainGeometry(style, seed) {
  const outline = new THREE.Shape();
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2,
      r =
        11.65 +
        Math.sin(a * 3 + seed) * 0.32 +
        Math.cos(a * 5 + seed * 0.2) * 0.2;
    const x = Math.cos(a) * r,
      y = Math.sin(a) * r;
    i ? outline.lineTo(x, y) : outline.moveTo(x, y);
  }
  if (style.water) {
    const [x, z, rx, rz] = style.water,
      hole = new THREE.Path();
    hole.absellipse(x, -z, rx, rz, 0, Math.PI * 2, true);
    outline.holes.push(hole);
  }
  const geo = new THREE.ExtrudeGeometry(outline, {
    depth: 0.24,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.08,
    bevelThickness: 0.05,
    curveSegments: 32,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -0.15, 0);
  const position = geo.getAttribute("position"),
    colors = [];
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i),
      z = position.getZ(i),
      shade = 0.93 + Math.sin(x * 0.42 + seed) * Math.cos(z * 0.55) * 0.055;
    const c = new THREE.Color(style.ground).multiplyScalar(shade);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geo;
}
function landmark(parent, style, id, art = []) {
  const h = new THREE.Group();
  h.position.set(-7.8, 1.02, -7.8);
  parent.add(h);
  h.name = "Landmark-" + id;
  // Rear ledges give height without changing the playable ground plane.
  for (let i = 0; i < 3; i++)
    shape(
      h,
      "stone",
      i === 2 ? style.ground : 0xb0a293,
      0.1,
      -0.65 - i * 0.5,
      0,
      2.2 + i * 0.4,
      0.7,
      1.8 + i * 0.35,
    );
  const hero = style.hero;
  if (hero === "moon" || hero === "wizard") {
    crescentGate(h, 0, 0, 0, 0xffdc90, 0.88);
    mushroomHouse(h, 2.2, 0, -0.5, style.roof, 0.65);
  } else if (["tea", "bamboo"].includes(hero)) {
    teaPavilion(h, 0, 0, 0, style.roof, 1.15);
    fluffyTree(h, -2, 0, style.leaf, style.kind, 0.85);
  } else if (
    ["pumpkin", "mushrooms", "snow", "oasis", "beach", "library"].includes(hero)
  ) {
    if (hasFantasyArt()) {
      art.push({
        cell: hero === "mushrooms" ? 4 : 5,
        x: -7.8,
        z: -7.8,
        y: 1.02,
        height: 4.5,
        width: 4.5,
      });
    } else if (hero === "mushrooms")
      mushroomHouse(h, 0, 0, 0, style.roof, 1.25);
    else wizardCottage(h, 0, 0, 0, style.roof, 1.25);
    if (hero === "pumpkin")
      for (let i = 0; i < 6; i++)
        shape(
          h,
          "sphere",
          0xe9a55e,
          -1.8 + i * 0.55,
          0.23,
          1.6,
          0.28,
          0.23,
          0.26,
        );
    if (hero === "snow") {
      for (let i = 0; i < 3; i++)
        shape(
          h,
          "sphere",
          0xf6fbf9,
          2,
          0.25 + i * 0.38,
          1,
          0.45 - i * 0.1,
          0.35 - i * 0.08,
          0.45 - i * 0.1,
        );
    }
    if (hero === "beach") {
      for (let i = 0; i < 6; i++)
        shape(
          h,
          "sphere",
          0xf8e6c5,
          2 + Math.cos(i) * 0.15,
          0.3,
          Math.sin(i) * 0.15,
          0.11,
          0.3,
          0.06,
        );
    }
    if (hero === "library")
      for (let i = 0; i < 5; i++) {
        const book = shape(
          h,
          "cube",
          [0xc4a3d4, 0xb1cba6, 0xddbd88][i % 3],
          1.8,
          0.2 + i * 0.12,
          0.6,
          0.8,
          0.11,
          0.6,
        );
        book.rotation.y = i * 0.18;
      }
  } else if (hero === "treehouse") {
    fluffyTree(h, 0, 0, style.leaf, "oak", 1.6);
    shape(h, "cube", 0xc5a171, 0, 1.8, 1, 1.9, 0.18, 1.4);
    mushroomHouse(h, 0, 1.9, 0.8, style.roof, 0.65);
    line(h, [0.7, 0, 1.7], [0.7, 2.1, 1.7], 0xa28263, 0.05);
    for (let i = 0; i < 7; i++)
      line(h, [0.55, i * 0.3, 1.7], [0.95, i * 0.3, 1.7], 0xa28263, 0.045);
  } else if (["cloudcastle", "ice", "crystal"].includes(hero)) {
    for (const [x, z, s] of [
      [0, 0, 1],
      [-1.5, -0.4, 0.75],
      [1.5, -0.3, 0.75],
    ]) {
      shape(
        h,
        "pole",
        hero === "ice" ? 0xbadfee : 0xe6d7e6,
        x,
        1.5 * s,
        z,
        0.55 * s,
        3 * s,
        0.55 * s,
      );
      shape(
        h,
        "cone",
        style.roof,
        x,
        3.45 * s,
        z,
        0.85 * s,
        1.25 * s,
        0.85 * s,
      );
      shape(
        h,
        "sphere",
        0xffe2a4,
        x,
        1.8 * s,
        z + 0.53 * s,
        0.18 * s,
        0.3 * s,
        0.025,
        true,
      );
    }
    if (hero === "crystal")
      for (let i = 0; i < 5; i++) {
        const crystal = shape(
          h,
          "stone",
          [0xa8dcf2, 0xddb8f1, 0xaee8de][i % 3],
          Math.sin(i) * 2,
          1,
          Math.cos(i) * 1.7,
          0.35,
          1.2,
          0.35,
        );
        crystal.rotation.z = Math.sin(i) * 0.3;
      }
  } else if (["planet", "observatory"].includes(hero)) {
    const globe = shape(h, "sphere", 0xb6a2dc, 0, 2.35, 0, 1.5, 1.5, 1.5);
    torus(h, 0xf5d5a4, 2.05, 0.075, 0, 2.35, 0).rotation.x = 1.05;
    for (const dx of [-1.8, 1.8])
      line(h, [dx, 0, 0], [0, 2.35, 0], 0xab8b6b, 0.065);
    if (hero === "observatory") {
      shape(h, "pole", 0xe3d0b7, 0, 0.7, 0, 1.55, 1.4, 1.55);
      shape(h, "dome", style.roof, 0, 1.4, 0, 1.6, 1.1, 1.6);
      line(h, [1, 1.5, 0.2], [2, 2.1, 0.8], 0xe2bb7a, 0.2);
    }
  } else if (hero === "rainbow") {
    for (let i = 0; i < 6; i++)
      torus(
        h,
        [0xeb9cac, 0xf1c184, 0xe8dfa0, 0xa6cbab, 0xa5cbdc, 0xc3a6de][i],
        2.55 - i * 0.17,
        0.09,
        0,
        1,
        0,
        false,
        Math.PI,
      );
    for (const x of [-2.5, 2.5])
      for (let i = 0; i < 3; i++)
        shape(
          h,
          "sphere",
          0xf4edfa,
          x + (i - 1) * 0.3,
          0.75,
          0,
          0.55,
          0.4,
          0.4,
        );
  } else if (hero === "candy") {
    wizardCottage(h, 0, 0, 0, style.roof, 1.05);
    for (const x of [-1.8, 1.8]) {
      line(h, [x, 0, 0.8], [x, 2.2, 0.8], 0xf5d7c4, 0.09);
      shape(
        h,
        "sphere",
        x < 0 ? 0xffb7d5 : 0xc6d7ed,
        x,
        2.3,
        0.8,
        0.65,
        0.65,
        0.15,
      );
      torus(h, 0xfff0dd, 0.45, 0.055, x, 2.3, 1);
    }
  } else if (hero === "volcano") {
    shape(h, "cone", 0x8c7279, 0, 1.5, 0, 2.0, 3.6, 2);
    torus(h, 0xffbb80, 0.55, 0.13, 0, 3.12, 0, true).rotation.x = Math.PI / 2;
    for (let i = 0; i < 7; i++)
      shape(
        h,
        "stone",
        0xffc88a,
        Math.sin(i) * 0.4,
        3.3 + (i % 3) * 0.35,
        Math.cos(i) * 0.4,
        0.08,
        0.15,
        0.08,
        true,
      );
  } else if (hero === "clock") {
    shape(h, "cube", 0xdbbe92, 0, 1.9, 0, 1.7, 3.8, 1.5);
    shape(h, "cone", style.roof, 0, 4.15, 0, 1.4, 1.3, 1.4).rotation.y =
      Math.PI / 4;
    shape(h, "sphere", 0xffe9b3, 0, 2.65, 0.77, 0.57, 0.57, 0.04, true);
    torus(h, 0xa78858, 0.6, 0.065, 0, 2.65, 0.82);
    line(h, [0, 2.65, 0.9], [0, 3.04, 0.9], 0x7c6354, 0.035);
    line(h, [0, 2.65, 0.9], [0.3, 2.5, 0.9], 0x7c6354, 0.035);
    for (const x of [-1.5, 1.5]) {
      const gear = torus(h, 0xd0ab74, 0.68, 0.09, x, 1.1, 0.4);
      for (let i = 0; i < 8; i++)
        shape(
          h,
          "cube",
          0xd0ab74,
          x + Math.cos(i * 0.785) * 0.7,
          1.1 + Math.sin(i * 0.785) * 0.7,
          0.4,
          0.18,
          0.18,
          0.12,
        );
    }
  } else if (hero === "coral") {
    for (let i = 0; i < 7; i++)
      coralCluster(
        h,
        Math.sin(i * 2.4) * 1.4,
        Math.cos(i * 2.4) * 1.1,
        1.6 + (i % 3) * 0.25,
        i,
      );
    shape(h, "sphere", 0xf9e8c7, 0, 0.5, 0, 0.9, 0.75, 0.2);
  } else if (hero === "sunflower") {
    teaPavilion(h, 0, 0, 0, style.roof, 1.05);
    for (let i = 0; i < 5; i++) {
      const x = -2 + i;
      line(h, [x, 0, 1.5], [x, 1.6, 1.5], 0x91a261, 0.055);
      for (let j = 0; j < 8; j++)
        shape(
          h,
          "sphere",
          0xffdb6f,
          x + Math.cos(j * 0.785) * 0.28,
          1.6 + Math.sin(j * 0.785) * 0.28,
          1.5,
          0.14,
          0.14,
          0.04,
        );
      shape(h, "sphere", 0xa68354, x, 1.6, 1.55, 0.2, 0.2, 0.04);
    }
  } else if (hero === "lotus") {
    for (let i = 0; i < 8; i++) {
      const a = i * 0.785,
        p = shape(
          h,
          "sphere",
          0xf9cbdf,
          Math.cos(a) * 0.6,
          0.5,
          Math.sin(a) * 0.6,
          0.4,
          0.5,
          0.19,
        );
      p.rotation.set(0.3, a, 0);
    }
    shape(h, "sphere", 0xffe1a2, 0, 0.5, 0, 0.35, 0.35, 0.35, true);
  }
  flowerCluster(h, -1.8, 1.5, style.flower, 0.8);
  lantern(h, 1.9, 0, 1.3, 0.7);
  return h;
}
function lakeShore(parent, pond, style, id) {
  const [x, z, rx, rz] = pond;
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2,
      px = x + Math.cos(a) * (rx + 0.15),
      pz = z + Math.sin(a) * (rz + 0.14);
    const stone = shape(
      parent,
      "stone",
      i % 3 ? 0xd9ccb1 : 0xb3c3a1,
      px,
      0.15,
      pz,
      0.24 + (i % 3) * 0.1,
      0.18,
      0.22,
    );
    stone.rotation.y = a;
    if (["coral", "beach", "water"].includes(id) && i % 4 === 0)
      coralCluster(
        parent,
        px + Math.cos(a) * 0.42,
        pz + Math.sin(a) * 0.42,
        0.85 + (i % 3) * 0.15,
        i,
        0.12,
      );
    if (i % 3 === 0)
      flowerCluster(
        parent,
        px + Math.cos(a) * 0.3,
        pz + Math.sin(a) * 0.3,
        style.flower,
        0.75,
      );
  }
  // A rounded timber jetty with railings and shell lanterns.
  const px = x + rx * 0.65,
    pz = z + rz * 0.82;
  for (let i = 0; i < 6; i++)
    shape(
      parent,
      "cube",
      i % 2 ? 0xc59d6d : 0xd6b484,
      px,
      0.19,
      pz + (i - 2.5) * 0.22,
      1.25,
      0.1,
      0.19,
    );
  for (const sign of [-1, 1]) {
    line(
      parent,
      [px + sign * 0.58, 0.18, pz - 0.55],
      [px + sign * 0.58, 0.9, pz - 0.55],
      0xad8159,
      0.06,
    );
    line(
      parent,
      [px + sign * 0.58, 0.18, pz + 0.55],
      [px + sign * 0.58, 0.9, pz + 0.55],
      0xad8159,
      0.06,
    );
    line(
      parent,
      [px + sign * 0.58, 0.72, pz - 0.55],
      [px + sign * 0.58, 0.72, pz + 0.55],
      0xd1ad79,
      0.04,
    );
    lantern(parent, px + sign * 0.58, 0.9, pz + 0.55, 0.35);
  }
}
export function createBiomeScene(
  biome,
  { preview = false, placements = [], lowOnly = false } = {},
) {
  const style = BIOME_STYLES[biome.id],
    seed = seedOf(biome.id),
    root = new THREE.Group(),
    art = [];
  root.name = "Biome-" + biome.id;
  root.userData.artVersion = fantasyArtVersion();
  const base = new THREE.Group(),
    props = new THREE.Group(),
    detail = new THREE.Group(),
    low = new THREE.Group(),
    animations = [];
  root.add(base, detail, low);
  detail.add(props);
  const ground = new THREE.Mesh(
    terrainGeometry(style, seed),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.95,
      map: surfaceTexture("ground"),
      bumpMap: surfaceTexture("ground"),
      bumpScale: 0.012,
    }),
  );
  ground.receiveShadow = true;
  base.add(ground);
  const cliffGeo = new THREE.CylinderGeometry(11.5, 9.1, 2.5, 40, 3, true),
    pos = cliffGeo.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const a = Math.atan2(pos.getZ(i), pos.getX(i)),
      r = 1 + Math.sin(a * 3 + seed) * 0.025 + Math.cos(a * 5) * 0.018;
    pos.setX(i, pos.getX(i) * r);
    pos.setZ(i, pos.getZ(i) * r);
  }
  cliffGeo.computeVertexNormals();
  const cliff = new THREE.Mesh(
    cliffGeo,
    new THREE.MeshStandardMaterial({
      color: 0xb4a3a5,
      roughness: 0.94,
      map: surfaceTexture("stone"),
      bumpMap: surfaceTexture("stone"),
      bumpScale: 0.05,
    }),
  );
  cliff.position.y = -1.18;
  base.add(cliff);
  const lower = shape(base, "stone", 0x998d9b, 0, -3.9, 0, 10.6, 3.4, 10.6);
  lower.rotation.y = seed * 0.1;
  if (lowOnly) {
    const cheap = createLowScenery(style, biome.id);
    low.add(cheap);
    detail.visible = false;
    root.userData.detail = detail;
    root.userData.lowDetail = low;
    root.userData.style = style;
    root.userData.biomeId = biome.id;
    root.userData.lowOnly = true;
    root.userData.stats = {
      staticMeshes: cheap.children.length,
      sourceMeshes: 0,
      fishCount: 0,
    };
    root.userData.update = () => {};
    root.userData.dispose = () => disposeBiome(root);
    return root;
  }
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6 + seed * 0.03,
      x = Math.cos(a) * 10.8,
      z = Math.sin(a) * 10.8;
    shape(
      props,
      "stone",
      i % 2 ? 0xa79d99 : 0xc4b6a7,
      x,
      -0.8,
      z,
      1.0,
      1.4,
      1.05,
    );
    if (i % 2 === 0) {
      const vine = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, 0.05, z),
        new THREE.Vector3(x * 1.025, -1.5, z * 1.025),
        new THREE.Vector3(x * 0.97, -3.4, z * 0.97),
      ]);
      props.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(vine, 12, 0.045, 4, false),
          new THREE.MeshStandardMaterial({ color: 0x718660, roughness: 1 }),
        ),
      );
      for (let l = 0; l < 5; l++) {
        const p = vine.getPoint(l / 5),
          leaf = shape(
            props,
            "sphere",
            style.leaf,
            p.x + (l % 2 ? 0.12 : -0.12),
            p.y,
            p.z,
            0.22,
            0.08,
            0.1,
          );
        leaf.rotation.z = (l % 2 ? 1 : -1) * 0.5;
      }
    }
  }
  const heroSource = new THREE.Group(),
    heroArt = [];
  landmark(heroSource, style, biome.id, heroArt);
  const heroBatch = batchScenery(heroSource);
  const paintedHero = illustratedScenery(heroArt);
  if (paintedHero) heroBatch.add(paintedHero);
  detail.add(heroBatch);
  // Tall trees are added by the adaptive landscape, never as a ring.
  for (let i = 0; i < 26; i++) {
    const a = i * 2.399 + seed * 0.01,
      r = 8.7 + (i % 3) * 0.45,
      x = Math.sin(a) * r,
      z = Math.cos(a) * r;
    if (style.water) {
      const [px, pz, rx, rz] = style.water;
      if (((x - px) / (rx + 0.7)) ** 2 + ((z - pz) / (rz + 0.7)) ** 2 < 1)
        continue;
    }
    flowerCluster(
      props,
      x,
      z,
      i % 4 ? style.flower : 0xffedc0,
      1.0 + (i % 3) * 0.16,
    );
    if (i % 4 === 0)
      shape(props, "sphere", style.leaf, x, 0.18, z, 0.55, 0.3, 0.5);
  }
  for (const a of [0.35, 1.7, 3.0, 5.2])
    lantern(props, Math.cos(a) * 9.0, 0, Math.sin(a) * 9.0, 0.68);
  if (biome.id === "moon") {
    if (hasFantasyArt()) {
      art.push({ cell: 5, x: -6, z: -5, height: 4.2, width: 4.2 });
    } else {
      wizardCottage(props, -6, 0, -5, style.roof, 1.15);
    }
    for (let i = 0; i < 5; i++)
      mushroomHouse(props, -8.4 + i * 0.42, 0.02, 6.4, style.roof, 0.2, false);
  }
  if (biome.id === "wizard" || biome.id === "mushrooms")
    for (let i = 0; i < 4; i++)
      mushroomHouse(
        props,
        Math.sin(i * 1.7) * 8.7,
        0,
        Math.cos(i * 1.7) * 8.7,
        style.roof,
        0.5 + i * 0.1,
        false,
      );
  if (biome.id === "candy")
    for (let i = 0; i < 5; i++) {
      const x = Math.sin(i * 2.4) * 9,
        z = Math.cos(i * 2.4) * 9;
      line(props, [x, 0, z], [x, 1.1, z], 0xfff0cc, 0.04);
      shape(
        props,
        "sphere",
        [0xffb8d3, 0xb8dfe1, 0xf5d38b][i % 3],
        x,
        1.35,
        z,
        0.35,
        0.35,
        0.08,
      );
    }
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5;
    shape(
      props,
      "stone",
      i % 2 ? 0xd6c2a4 : 0xe4d0b2,
      Math.cos(a) * 0.95,
      0.145,
      Math.sin(a) * 0.95,
      0.28,
      0.035,
      0.23,
    ).rotation.y = a;
  }
  for (const [x, z, r] of [
    [0, 0.05, 0.25],
    [-0.33, -0.26, 0.11],
    [-0.1, -0.38, 0.12],
    [0.15, -0.38, 0.12],
    [0.36, -0.24, 0.11],
  ])
    shape(props, "sphere", 0xf2d8aa, x, 0.152, z, r, 0.008, r);
  // Winding stepping-stone routes replace the identical cross drawn on each island.
  for (let route = 0; route < 3; route++)
    for (let i = 1; i < 13; i++) {
      const a = route * 2.094 + seed * 0.01,
        r = i * 0.65,
        x = Math.cos(a) * r + Math.sin(i * 0.4) * 0.28,
        z = Math.sin(a) * r;
      if (style.water) {
        const [px, pz, rx, rz] = style.water;
        if (((x - px) / rx) ** 2 + ((z - pz) / rz) ** 2 < 1.05) continue;
      }
      if (
        placements.some(
          (p) => Math.abs(p.x - x) < 1.5 && Math.abs(p.z - z) < 1.5,
        )
      )
        continue;
      shape(
        props,
        "stone",
        i % 3 ? 0xe1ceaf : 0xcdbc9d,
        x,
        0.155,
        z,
        0.23,
        0.025,
        0.18,
      ).rotation.y = i * 0.7;
    }
  if (style.water) {
    const [x, z, rx, rz, count] = style.water,
      lagoon = createLagoon({
        x,
        z,
        rx,
        rz,
        fishCount: preview ? Math.min(count, 12) : count,
        seed,
      });
    detail.add(lagoon);
    animations.push(lagoon);
    lakeShore(props, style.water, style, biome.id);
    const lowWater = new THREE.Mesh(
      new THREE.CircleGeometry(1, 32),
      new THREE.MeshBasicMaterial({ color: 0x63cadb }),
    );
    lowWater.rotation.x = -Math.PI / 2;
    lowWater.scale.set(rx, rz, 1);
    lowWater.position.set(x, 0.15, z);
    low.add(lowWater);
    if (["sakura", "lotus", "water"].includes(biome.id))
      for (let i = 0; i < 4; i++) {
        const px = x + Math.sin(i * 2.4) * rx * 0.58,
          pz = z + Math.cos(i * 2.4) * rz * 0.5;
        shape(props, "sphere", 0x92b682, px, 0.18, pz, 0.25, 0.025, 0.25);
        for (let p = 0; p < 6; p++) {
          const a = (p * Math.PI) / 3;
          shape(
            props,
            "sphere",
            style.flower,
            px + Math.cos(a) * 0.1,
            0.27,
            pz + Math.sin(a) * 0.1,
            0.1,
            0.15,
            0.045,
          ).rotation.y = a;
        }
      }
  }
  for (let i = 0; i < 2; i++) {
    const x = -2.3 + i * 1.3,
      z = 11.1,
      fall = createWaterfall(x, z, 0.7 + i * 0.15, 4.2 + i * 0.5);
    detail.add(fall);
    animations.push(fall);
  }
  const batched = batchScenery(props);
  detail.remove(props);
  detail.add(batched);
  const illustrations = illustratedScenery(art);
  if (illustrations) detail.add(illustrations);
  // Small, distinct silhouettes remain visible when viewing the whole archipelago.
  const cheap = new THREE.Group();
  for (const tree of landscapedTrees(biome.id))
    fluffyTree(
      cheap,
      tree.x,
      tree.z,
      style.leaf,
      tree.fallback,
      0.65 * tree.scale,
    );
  const cheapHero = new THREE.Group();
  shape(cheapHero, "stone", style.ground, -7.8, 0.2, -7.8, 2.5, 0.5, 2.1);
  if (["planet", "observatory", "rainbow", "moon"].includes(style.hero))
    torus(cheapHero, 0xffdc99, 1.2, 0.1, -7.8, 2.3, -7.8, true).rotation.x =
      style.hero === "planet" ? 1.1 : 0;
  else if (
    ["ice", "crystal", "cloudcastle", "clock", "volcano"].includes(style.hero)
  )
    shape(cheapHero, "cone", style.roof, -7.8, 2, -7.8, 1.1, 3, 1.1);
  else shape(cheapHero, "dome", style.roof, -7.8, 1.5, -7.8, 1.45, 0.8, 1.2);
  cheap.add(cheapHero);
  low.add(batchScenery(cheap));
  low.visible = false;
  root.userData.detail = detail;
  root.userData.lowDetail = low;
  root.userData.style = style;
  root.userData.biomeId = biome.id;
  root.userData.lowOnly = false;
  root.userData.stats = {
    staticMeshes: batched.children.length,
    sourceMeshes: batched.userData.sourceMeshes,
    fishCount: style.water?.[4] || 0,
  };
  let coverRoot = null,
    gardenRoot = null,
    gardenKey = "";
  root.userData.updatePlacements = (items = []) => {
    const key = JSON.stringify(
      items.map((p) => [p.item, p.x, p.z, p.rotation]),
    );
    if (key === gardenKey) return;
    gardenKey = key;
    const occupied = (x, z, w, d) =>
      items.some((p) => {
        const size = byItem(p.item)?.footprint || [2, 2],
          [pw, pd] = p.rotation % 2 ? [size[1], size[0]] : size;
        return (
          Math.abs(x - p.x) < (w + pw) / 2 + 0.12 &&
          Math.abs(z - p.z) < (d + pd) / 2 + 0.12
        );
      });
    heroBatch.visible = !occupied(-7.8, -7.8, 4.6, 4.2);
    if (gardenRoot) {
      detail.remove(gardenRoot);
      disposeBiome(gardenRoot);
    }
    const gardens = new THREE.Group(),
      gardenArt = [],
      treeArt = [],
      originalTreeArt = [];
    const clear = placementClearance(items);
    root.userData.trees = landscapedTrees(biome.id).filter((tree) => {
      if (!clear(tree.x, tree.z, 2.5 * tree.scale)) return false;
      if (style.water) {
        const [x, z, rx, rz] = style.water;
        if (
          ((tree.x - x) / (rx + 0.8)) ** 2 + ((tree.z - z) / (rz + 0.8)) ** 2 <
          1
        )
          return false;
      }
      return true;
    });
    for (const tree of root.userData.trees) {
      shape(
        gardens,
        "sphere",
        new THREE.Color(style.ground).multiplyScalar(0.8).getHex(),
        tree.x,
        0.144,
        tree.z,
        1.0 * tree.scale,
        0.014,
        0.85 * tree.scale,
      );
      if (hasFantasyArt(tree.trees))
        (tree.trees ? treeArt : originalTreeArt).push({
          ...tree,
          tint: style.leaf,
        });
      else
        fluffyTree(
          gardens,
          tree.x,
          tree.z,
          style.leaf,
          tree.fallback,
          tree.scale,
        );
      for (let i = 0; i < 4; i++)
        flowerCluster(
          gardens,
          tree.x + Math.sin(i * 2.4) * 1.05 * tree.scale,
          tree.z + Math.cos(i * 2.4) * 0.85 * tree.scale,
          style.flower,
          0.65,
        );
    }
    if (coverRoot) {
      detail.remove(coverRoot);
      disposeBiome(coverRoot);
    }
    coverRoot = createGroundCover(style, biome.id, {
      placements: items,
      preview,
      seed,
    });
    detail.add(coverRoot);
    root.userData.groundCover = coverRoot;

    for (const [x, z] of [
      [-3, -3],
      [3, 1],
      [3, -4],
      [-3, 3],
      [0, 4],
      [0, -6],
    ]) {
      if (occupied(x, z, 2.7, 2.7)) continue;
      if (style.water) {
        const [px, pz, rx, rz] = style.water;
        if (((x - px) / (rx + 1.4)) ** 2 + ((z - pz) / (rz + 1.4)) ** 2 < 1)
          continue;
      }
      shape(
        gardens,
        "sphere",
        new THREE.Color(style.ground).multiplyScalar(0.83).getHex(),
        x,
        0.143,
        z,
        1.25,
        0.014,
        1.0,
      );
      for (let i = 0; i < 3; i++)
        flowerCluster(
          gardens,
          x + Math.sin(i * 2.4) * 0.6,
          z + Math.cos(i * 2.4) * 0.5,
          i % 2 ? style.flower : 0xffe0a2,
          1.1,
        );
      shape(
        gardens,
        "sphere",
        style.leaf,
        x + 0.65,
        0.28,
        z - 0.5,
        0.45,
        0.3,
        0.35,
      );
      lantern(gardens, x - 0.8, 0, z - 0.8, 0.42);
    }
    for (const [x, z] of [
      [7, -6.7],
      [-7, 6.8],
    ]) {
      if (occupied(x, z, 3.2, 3.2)) continue;
      if (style.water) {
        const [px, pz, rx, rz] = style.water;
        if (((x - px) / (rx + 1.5)) ** 2 + ((z - pz) / (rz + 1.5)) ** 2 < 1)
          continue;
      }
      if (["sakura", "bamboo", "lotus"].includes(biome.id))
        teaPavilion(gardens, x, 0, z, style.roof, 0.65);
      else if (hasFantasyArt())
        gardenArt.push({
          cell: biome.id === "wizard" ? 5 : 4,
          x,
          z,
          height: 3.1,
          width: 3.1,
        });
      else mushroomHouse(gardens, x, 0, z, style.roof, 0.72, true);
    }
    gardenRoot = batchScenery(gardens);
    const painted = illustratedScenery(gardenArt);
    if (painted) gardenRoot.add(painted);
    const treeImages = illustratedScenery(treeArt, { trees: true }),
      originalTrees = illustratedScenery(originalTreeArt);
    if (treeImages) gardenRoot.add(treeImages);
    if (originalTrees) gardenRoot.add(originalTrees);
    gardenRoot.name = "Adaptive gardens";
    detail.add(gardenRoot);
  };
  root.userData.updatePlacements(placements);
  root.userData.update = (time, reduced = false) => {
    if (detail.visible) {
      for (const object of animations) object.userData.update(time, reduced);
      coverRoot?.userData.update(time, reduced);
    }
  };
  root.userData.dispose = () => disposeBiome(root);
  return root;
}

function createLowScenery(style, id) {
  const root = new THREE.Group(),
    cheap = new THREE.Group();
  for (const tree of landscapedTrees(id))
    fluffyTree(
      cheap,
      tree.x,
      tree.z,
      style.leaf,
      tree.fallback,
      0.65 * tree.scale,
    );
  shape(cheap, "stone", style.ground, -7.8, 0.2, -7.8, 2.5, 0.5, 2.1);
  if (["planet", "observatory", "rainbow", "moon"].includes(style.hero))
    torus(cheap, 0xffdc99, 1.2, 0.1, -7.8, 2.3, -7.8, true).rotation.x =
      style.hero === "planet" ? 1.1 : 0;
  else if (
    ["ice", "crystal", "cloudcastle", "clock", "volcano"].includes(style.hero)
  )
    shape(cheap, "cone", style.roof, -7.8, 2, -7.8, 1.1, 3, 1.1);
  else shape(cheap, "dome", style.roof, -7.8, 1.5, -7.8, 1.45, 0.8, 1.2);
  root.add(batchScenery(cheap));
  if (style.water) {
    const [x, z, rx, rz] = style.water,
      water = new THREE.Mesh(
        new THREE.CircleGeometry(1, 32),
        new THREE.MeshBasicMaterial({ color: 0x63cadb }),
      );
    water.rotation.x = -Math.PI / 2;
    water.scale.set(rx, rz, 1);
    water.position.set(x, 0.155, z);
    root.add(water);
  }
  return root;
}
export function disposeBiome(root) {
  const geometries = new Set(),
    materials = new Set();
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.isInstancedMesh) o.dispose();
    if (!o.geometry.userData.sharedScenery) geometries.add(o.geometry);
    for (const m of Array.isArray(o.material) ? o.material : [o.material])
      if (!m.userData.sharedScenery) materials.add(m);
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}
