import * as THREE from "three";
import {
  AQUARIUM_RADIUS as R,
  AQUARIUM_BUILDING as B,
  AQUARIUM_TANKS,
  AQUARIUM_LOCALS,
  aquariumOutline,
  aquariumSeats,
} from "./aquarium-data.js";
import { aquariumPrism, aquariumTankSteps } from "./aquarium-assets.js";
import { part } from "./bikini-scenery.js";
import { line, flowerCluster, lantern } from "./fantasy-scenery.js";
import { waterfallSteps } from "./lagoon.js";
import { batchModelSteps } from "./model-batching.js";
import { courtLabel } from "./foodcourt-assets.js";
import { createCat, animateCat, reactCat, disposeCat } from "./cat-model.js";
import { catAppearance } from "./cat-breeds.js";
import {
  sceneryModelSteps,
  positionScenery,
  disposeScenery,
} from "./scenery-models.js";
import { runSceneSteps } from "./scene-tasks.js";
function roofGeometry(outline) {
  const vertices = [0, B.wall + B.dome, 0],
    indices = [],
    rings = 12,
    n = outline.length;
  for (let j = 1; j <= rings; j++) {
    const a = ((j / rings) * Math.PI) / 2,
      r = Math.sin(a),
      y = B.wall + B.dome * Math.cos(a);
    for (const p of outline) vertices.push(p.x * r, y, p.z * r);
  }
  for (let i = 0; i < n; i++) indices.push(0, 1 + ((i + 1) % n), 1 + i);
  for (let j = 0; j < rings - 1; j++)
    for (let i = 0; i < n; i++) {
      const a = 1 + j * n + i,
        b = 1 + j * n + ((i + 1) % n),
        c = a + n,
        d = b + n;
      indices.push(a, b, c, b, d, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
function paw(g, x, y, z, s = 1) {
  part(g, "sphere", 0xfff2ca, x, y, z, 0.43 * s, 0.32 * s, 0.08 * s);
  for (const [dx, dy] of [
    [-0.44, 0.43],
    [-0.16, 0.67],
    [0.16, 0.67],
    [0.44, 0.43],
  ])
    part(
      g,
      "sphere",
      0xffe6a1,
      x + dx * s,
      y + dy * s,
      z,
      0.16 * s,
      0.2 * s,
      0.07 * s,
    );
}
function* bake(g, props) {
  const baked = yield* batchModelSteps(props, { combineColors: true });
  g.add(baked);
  props.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  return baked;
}
export function* aquariumBiomeSteps(
  biome,
  { lowOnly = false, preview = false, scenery = [] } = {},
) {
  const root = new THREE.Group(),
    base = new THREE.Group(),
    detail = new THREE.Group(),
    low = new THREE.Group(),
    props = new THREE.Group(),
    roofRibs = new THREE.Group(),
    animations = [],
    previewCats = [],
    sceneryObjects = new Map();
  root.name = "Котячий океанариум · стеклянный дворец";
  root.add(base, detail, low);
  root.userData = {
    biomeId: "aquarium",
    navigationSurface: base,
    detail,
    lowDetail: low,
    lowOnly,
    sceneryObjects,
    lagoons: new Map(),
    trees: [],
    stats: {
      fishCount: lowOnly ? 0 : 50,
      buildingArea: B.w * B.d - (4 - Math.PI) * B.r ** 2,
      islandArea: Math.PI * R * R,
    },
    aquarium: true,
  };
  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, 0.3, 96),
    new THREE.MeshStandardMaterial({ color: 0xcbdca6, roughness: 0.91 }),
  );
  ground.position.y = 0;
  ground.receiveShadow = true;
  base.add(ground);
  yield;
  const rock = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R * 0.82, 8, 64),
    new THREE.MeshStandardMaterial({ color: 0xaaa1b5, roughness: 0.92 }),
  );
  rock.position.y = -4.15;
  base.add(rock);
  const point = new THREE.Mesh(
    new THREE.ConeGeometry(R * 0.84, 19, 48),
    new THREE.MeshStandardMaterial({ color: 0x9293a8, roughness: 0.9 }),
  );
  point.rotation.z = Math.PI;
  point.position.y = -16.7;
  base.add(point);
  yield;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const p = part(
      props,
      "stone",
      [0xb9aabb, 0xa7a3bc, 0xc2adba][i % 3],
      Math.sin(a) * (R - 1),
      -6.25 - (i % 5),
      Math.cos(a) * (R - 1),
      1.6,
      6 + (i % 5),
      1.7,
    );
    p.rotation.y = a;
    yield;
  }
  for (let i = 0; i < 18; i++) {
    const a = i * 2.399,
      r = R * (0.6 + (i % 3) * 0.11);
    part(
      props,
      "sphere",
      0xf4eef7,
      Math.sin(a) * r,
      -16 - (i % 4),
      Math.cos(a) * r,
      5.5,
      1.4,
      3.7,
    );
    yield;
  }
  // The large single floor covers over 70% of the island; the five tanks fill
  // more than half of the building, with broad central and cross aisles.
  const floor = new THREE.Mesh(
    aquariumPrism(B.w, B.d, B.r, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xf8e6d2, roughness: 0.82 }),
  );
  floor.position.y = 0.15;
  floor.name = "Aquarium continuous walkable floor";
  floor.userData.aquariumBuilding = true;
  floor.receiveShadow = true;
  base.add(floor);
  yield;
  const outline = aquariumOutline(B.w, B.d, B.r, 12),
    roofGlass = new THREE.Mesh(
      roofGeometry(outline),
      new THREE.MeshBasicMaterial({
        color: 0xd9f2ff,
        transparent: true,
        opacity: 0.075,
        depthWrite: false,
        side: THREE.DoubleSide,
        forceSinglePass: true,
      }),
    );
  roofGlass.name = "Fully transparent glass dome";
  roofGlass.renderOrder = 11;
  detail.add(roofGlass);
  const sideVertices = [],
    sideIndices = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i],
      b = outline[(i + 1) % outline.length];
    const front =
      Math.abs(a.z - B.d / 2) < 0.01 && Math.abs(b.z - B.d / 2) < 0.01;
    const segments = front
      ? [
          [a, { x: 5.2, z: B.d / 2 }],
          [{ x: -5.2, z: B.d / 2 }, b],
        ]
      : [[a, b]];
    for (const [s, t] of segments) {
      const k = sideVertices.length / 3;
      sideVertices.push(
        s.x,
        0.2,
        s.z,
        t.x,
        0.2,
        t.z,
        t.x,
        B.wall,
        t.z,
        s.x,
        B.wall,
        s.z,
      );
      sideIndices.push(k, k + 1, k + 2, k, k + 2, k + 3);
      line(props, [s.x, 0.25, s.z], [t.x, 0.25, t.z], 0xd9ba99, 0.1);
      line(props, [s.x, B.wall, s.z], [t.x, B.wall, t.z], 0xe8c89b, 0.11);
    }
    if (i % 4 === 0) {
      line(props, [a.x, 0.2, a.z], [a.x, B.wall, a.z], 0xe6c394, 0.11);
      paw(props, a.x * 0.995, 7.65, a.z * 1.004, 0.55);
    }
    yield;
  }
  const sideGeo = new THREE.BufferGeometry();
  sideGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(sideVertices, 3),
  );
  sideGeo.setIndex(sideIndices);
  sideGeo.computeVertexNormals();
  const walls = new THREE.Mesh(
    sideGeo,
    new THREE.MeshBasicMaterial({
      color: 0xc9f1ff,
      transparent: true,
      opacity: 0.045,
      depthWrite: false,
      side: THREE.DoubleSide,
      forceSinglePass: true,
    }),
  );
  walls.name = "Transparent perimeter walls with open front entrance";
  walls.renderOrder = 9;
  detail.add(walls);
  yield;
  for (let i = 0; i < outline.length; i += 3) {
    const p = outline[i],
      curve = [];
    for (let j = 0; j <= 16; j++) {
      const a = ((j / 16) * Math.PI) / 2;
      curve.push(
        new THREE.Vector3(
          p.x * Math.cos(a),
          B.wall + B.dome * Math.sin(a),
          p.z * Math.cos(a),
        ),
      );
    }
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(curve),
        24,
        0.075,
        6,
        false,
      ),
      new THREE.MeshStandardMaterial({ color: 0xe9c69c, roughness: 0.55 }),
    );
    roofRibs.add(tube);
    yield;
  }
  for (const r of [0.38, 0.72])
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i],
        b = outline[(i + 1) % outline.length],
        y = B.wall + B.dome * Math.sqrt(1 - r * r);
      line(
        roofRibs,
        [a.x * r, y, a.z * r],
        [b.x * r, y, b.z * r],
        0xf0d1a5,
        0.065,
      );
      yield;
    }
  const ribs = yield* bake(detail, roofRibs);
  ribs.name = "Light golden dome ribs";
  // Welcoming cat-ear entrance and warm paw medallion.
  for (const sign of [-1, 1]) {
    part(props, "pole", 0xd6b08f, sign * 5.2, 2.8, 27.1, 0.22, 5.6, 0.22);
    const ear = part(
      props,
      "cone",
      0xf0ccae,
      sign * 3.8,
      6.4,
      27.1,
      1.1,
      2.2,
      0.26,
    );
    ear.rotation.z = sign * -0.2;
    const inner = part(
      props,
      "cone",
      0xf4c9d3,
      sign * 3.8,
      6.4,
      27.4,
      0.65,
      1.4,
      0.08,
    );
    inner.rotation.z = sign * -0.2;
    lantern(props, sign * 5.8, 0.2, 28.2, 0.9);
  }
  part(props, "cube", 0xedcfac, 0, 5.25, 27.1, 10.7, 1.6, 0.42);
  paw(props, 0, 6.8, 27.4, 1.25);
  const label = courtLabel("CAT AQUARIUM", 9.5, 1.15);
  label.position.set(0, 5.25, 27.35);
  detail.add(label);
  yield;
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2,
      r = R - 1.7,
      x = Math.sin(a) * r,
      z = Math.cos(a) * r;
    for (let j = 0; j < 6; j++) {
      const angle = j * 2.399;
      part(
        props,
        "sphere",
        [0x78ad80, 0x92bf87, 0xa8cc91][j % 3],
        x + Math.sin(angle) * 1.15,
        0.4 + (j % 2) * 0.18,
        z + Math.cos(angle) * 1.15,
        0.9,
        0.55,
        0.8,
      );
    }
    flowerCluster(
      props,
      x,
      z,
      [0xf29dca, 0xae9be2, 0xffcb76][i % 3],
      2.15,
      0.16,
    );
    if (i % 3 === 0) lantern(props, x, 0.16, z, 0.65);
    yield;
  }
  for (const [x, z] of [
    [-29, 17],
    [29, 17],
    [-27, -20],
    [27, -20],
    [-9, 31],
    [9, 31],
  ]) {
    part(props, "pole", 0xbaa085, x, 1.5, z, 0.2, 2.9, 0.2);
    for (let j = 0; j < 4; j++)
      part(
        props,
        "sphere",
        [0xa8c986, 0x94ba86, 0xbad899][j % 3],
        x + Math.sin(j * 2.4) * 0.6,
        2.7 + j * 0.35,
        z + Math.cos(j * 2.4) * 0.6,
        1.1,
        1.2,
        0.9,
      );
    flowerCluster(props, x, z, 0xefb9d0, 1.1, 0.16);
    yield;
  }
  for (const sign of [-1, 1])
    for (let i = 0; i < 7; i++) {
      const x = sign * (9 + i * 2.75),
        z = 29.2 - i * 0.36;
      part(props, "cube", 0xebc5ae, x, 0.38, z, 2.8, 0.65, 1.5);
      for (let j = 0; j < 3; j++)
        flowerCluster(
          props,
          x + (j - 1) * 0.6,
          z,
          [0xf2a3c8, 0xdfb0ec, 0xffd28e][(i + j) % 3],
          1.2,
          0.68,
        );
      yield;
    }
  for (let i = 0; i < 19; i++) {
    const z = 28.5 - i * 1.4;
    part(
      props,
      "stone",
      i % 2 ? 0xf2d2be : 0xf9e8cd,
      0,
      0.215,
      z,
      1.5,
      0.025,
      0.5,
    );
    yield;
  }
  if (!lowOnly) {
    for (const a of [-2.2, -1.1, 0.08, 0.9, 2.1]) {
      const fall = yield* waterfallSteps(
        Math.sin(a) * (R - 0.4),
        Math.cos(a) * (R - 0.4),
        3.6,
        22,
        { color: 0xc5edf9 },
      );
      fall.rotation.y = a;
      detail.add(fall);
      animations.push(fall);
      yield;
    }
  }
  // A small far-view silhouette is replaced by the real scene, never overlaid.
  for (const o of AQUARIUM_TANKS) {
    const proxy = new THREE.Mesh(
      aquariumPrism(o.w, o.d, o.r, o.h, o.circular),
      new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.38 }),
    );
    proxy.position.set(o.x, 0.2, o.z);
    low.add(proxy);
    yield;
  }
  const lowRoof = roofGlass.clone();
  lowRoof.material = roofGlass.material.clone();
  lowRoof.material.opacity = 0.06;
  low.add(lowRoof);
  const baked = yield* bake(base, props);
  root.userData.stats.staticDraws = baked.children.length;
  root.userData.stats.staticMeshes =
    baked.children.length + ribs.children.length + 4;
  root.userData.stats.sourceMeshes =
    baked.userData.sourceMeshes + ribs.userData.sourceMeshes;
  if (preview && !lowOnly) {
    for (const o of AQUARIUM_TANKS) {
      const tank = yield* aquariumTankSteps(o);
      tank.position.set(o.x, 0.2, o.z);
      tank.userData.update(4, true);
      detail.add(tank);
      animations.push(tank);
      yield;
    }
    for (let i = 0; i < AQUARIUM_LOCALS.length; i++) {
      const cat = createCat("happy", {
        detail: "npc",
        ...catAppearance(AQUARIUM_LOCALS[i]),
      });
      cat.scale.setScalar(0.63);
      const s = aquariumSeats(AQUARIUM_TANKS[1 + (i % 2)])[i];
      cat.position.set(s.x, 0.2, s.z);
      cat.rotation.y = Math.PI;
      animateCat(cat, i);
      reactCat(cat, { paw: 0.3, headPitch: -0.2 });
      detail.add(cat);
      previewCats.push(cat);
      yield;
    }
  }
  root.userData.roof = roofGlass;
  root.userData.roofRibs = ribs;
  root.userData.walls = walls;
  root.userData.setInteriorView = (active) => {
    roofGlass.material.opacity = active ? 0.018 : 0.075;
    ribs.visible = !active;
  };
  root.userData.scenerySteps = function* (records = []) {
    const visible = records.filter((r) => r.biome === "aquarium" && !r.stored);
    for (const [id, m] of sceneryObjects)
      if (!visible.some((r) => r.id === id)) {
        m.removeFromParent();
        disposeScenery(m);
        sceneryObjects.delete(id);
        yield;
      }
    if (!lowOnly)
      for (const r of visible) {
        let m = sceneryObjects.get(r.id);
        if (!m) {
          m = yield* sceneryModelSteps(r);
          sceneryObjects.set(r.id, m);
          detail.add(m);
        }
        positionScenery(m, r);
        yield;
      }
  };
  root.userData.placementSteps = function* (_items = [], records = []) {
    yield* root.userData.scenerySteps(records);
  };
  root.userData.updatePlacements = (...a) =>
    runSceneSteps(root.userData.placementSteps(...a));
  yield* root.userData.scenerySteps(scenery);
  root.userData.update = (time, reduced = false) => {
    if (detail.visible)
      for (const a of animations) a.userData.update?.(time, reduced);
  };
  root.userData.dispose = () => {
    for (const c of previewCats) {
      disposeCat(c);
      c.removeFromParent();
    }
    disposeScenery(root);
  };
  detail.visible = !lowOnly;
  low.visible = lowOnly;
  return root;
}
