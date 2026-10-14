import * as THREE from "three";
import {
  shape,
  line,
  torus,
  flowerCluster,
  lantern,
  mushroomHouse,
  batchScenery,
  surfaceTexture,
} from "./fantasy-scenery.js";
import { initialScenery, byScenery, sceneryFootprint } from "./scenery-data.js";
import {
  createSceneryModel,
  positionScenery,
  disposeScenery,
} from "./scenery-models.js";
const defaultScenery = initialScenery();
import { createGroundCover } from "./landscape-detail.js";
import { byItem } from "./game-data.js";
import { coralCluster } from "./reef.js";
import { createLagoon, createWaterfall } from "./lagoon.js";

import { BIOME_STYLES } from "./biome-styles.js";
export { BIOME_STYLES } from "./biome-styles.js";
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
  { preview = false, placements = [], scenery = null, lowOnly = false } = {},
) {
  const style = BIOME_STYLES[biome.id],
    seed = seedOf(biome.id),
    root = new THREE.Group();
  root.name = "Biome-" + biome.id;

  const base = new THREE.Group(),
    props = new THREE.Group(),
    detail = new THREE.Group(),
    low = new THREE.Group(),
    animations = [];
  root.add(base, detail, low);
  detail.add(props);
  const sceneryLayer = new THREE.Group(),
    sceneryObjects = new Map();
  sceneryLayer.name = "Movable 3D scenery";
  detail.add(sceneryLayer);
  let sceneryKey = "",
    sceneryLow = null;
  const records = scenery ?? defaultScenery.filter((r) => r.biome === biome.id);
  root.userData.sceneryObjects = sceneryObjects;
  root.userData.updateScenery = (next = records) => {
    const visible = next.filter((r) => !r.stored && r.biome === biome.id);
    const key = JSON.stringify(visible);
    if (key === sceneryKey) return;
    sceneryKey = key;
    for (const [id, model] of sceneryObjects)
      if (!visible.some((r) => r.id === id)) {
        sceneryLayer.remove(model);
        disposeScenery(model);
        sceneryObjects.delete(id);
      }
    if (!lowOnly)
      for (const record of visible) {
        let model = sceneryObjects.get(record.id);
        if (!model) {
          model = createSceneryModel(record);
          sceneryLayer.add(model);
          sceneryObjects.set(record.id, model);
        }
        positionScenery(model, record);
      }
    if (sceneryLow) {
      low.remove(sceneryLow);
      disposeBiome(sceneryLow);
    }
    const source = new THREE.Group();
    for (const record of visible)
      source.add(createSceneryModel(record, { low: true }));
    sceneryLow = batchScenery(source);
    for (const model of source.children) disposeScenery(model);
    sceneryLow.name = "Distant movable scenery";
    low.add(sceneryLow);
    root.userData.trees = visible.filter(
      (r) => byScenery(r.type).category === "tree",
    );
  };
  root.userData.updateScenery(records);
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
    root.userData.updatePlacements = (_items, next) =>
      root.userData.updateScenery(next);
    root.userData.update = () => {};
    root.userData.dispose = () => disposeBiome(root);
    return root;
  }
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6 + seed * 0.03,
      x = Math.cos(a) * 10.8,
      z = Math.sin(a) * 10.8;
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
  if (biome.id === "moon")
    for (let i = 0; i < 5; i++)
      mushroomHouse(props, -8.4 + i * 0.42, 0.02, 6.4, style.roof, 0.2, false);
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
  low.add(createLowScenery(style, biome.id));
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
  root.userData.updatePlacements = (items = [], nextScenery = records) => {
    root.userData.updateScenery(nextScenery);
    const terrainItems = [
      ...items,
      ...nextScenery
        .filter((r) => !r.stored && r.biome === biome.id)
        .map((r) => ({ ...r, footprint: sceneryFootprint(r, 0) })),
    ];
    const key = JSON.stringify(
      terrainItems.map((p) => [p.item || p.type, p.x, p.z, p.rotation]),
    );
    if (key === gardenKey) return;
    gardenKey = key;
    const occupied = (x, z, w, d) =>
      terrainItems.some((p) => {
        const size = p.footprint || byItem(p.item)?.footprint || [2, 2],
          [pw, pd] = p.rotation % 2 ? [size[1], size[0]] : size;
        return (
          Math.abs(x - p.x) < (w + pw) / 2 + 0.12 &&
          Math.abs(z - p.z) < (d + pd) / 2 + 0.12
        );
      });
    if (gardenRoot) {
      detail.remove(gardenRoot);
      disposeBiome(gardenRoot);
    }
    const gardens = new THREE.Group();
    if (coverRoot) {
      detail.remove(coverRoot);
      disposeBiome(coverRoot);
    }
    coverRoot = createGroundCover(style, biome.id, {
      placements: terrainItems,
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
    gardenRoot = batchScenery(gardens);
    gardenRoot.name = "Adaptive gardens";
    detail.add(gardenRoot);
  };
  root.userData.updatePlacements(placements, records);
  root.userData.update = (time, reduced = false) => {
    if (detail.visible) {
      for (const object of animations) object.userData.update(time, reduced);
      coverRoot?.userData.update(time, reduced);
      for (const object of sceneryObjects.values())
        object.userData.update(time, reduced);
    }
  };
  root.userData.dispose = () => disposeBiome(root);
  return root;
}

function createLowScenery(style) {
  const root = new THREE.Group();
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
