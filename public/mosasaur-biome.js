import { deepOceanSteps } from "./mosasaur-ocean.js";
import { createGroundCover, placementClearance } from "./landscape-detail.js";
import { mosasaurRideSteps } from "./mosasaur-assets.js";
import * as THREE from "three";
import {
  MOSA_RADIUS,
  MOSA_SEA,
  MOSA_DEPTH,
  mosaReservations,
} from "./mosasaur-data.js";
import { lagoonSteps, waterfallSteps } from "./lagoon.js";
import {
  shape,
  flowerCluster,
  lantern,
  surfaceTexture,
} from "./fantasy-scenery.js";
import { batchModelSteps } from "./model-batching.js";
import { runSceneSteps } from "./scene-tasks.js";
import {
  sceneryModelSteps,
  positionScenery,
  disposeScenery,
} from "./scenery-models.js";
import { BIOME_STYLES } from "./biome-styles.js";
import { junglePalmSteps, jungleFlowers } from "./jungle-props.js";
function shoreGeometry() {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, MOSA_RADIUS, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absellipse(0, 0, MOSA_SEA.rx, MOSA_SEA.rz, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.3,
    bevelEnabled: false,
    curveSegments: 64,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -0.16, 0);
  return geo;
}
function* bake(source, parent) {
  const result = yield* batchModelSteps(source, { combineColors: true });
  parent.add(result);
  source.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  return result;
}
export function* mosasaurBiomeSteps(
  biome,
  { preview = false, lowOnly = false, placements = [], scenery = [] } = {},
) {
  const root = new THREE.Group(),
    base = new THREE.Group(),
    detail = new THREE.Group(),
    low = new THREE.Group(),
    lagoons = new Map(),
    sceneryObjects = new Map(),
    animations = [],
    props = new THREE.Group();
  root.name = "Biome-autumn-Sky-Mosasaur-Sea";
  root.add(base, detail, low);
  root.userData = {
    biomeId: "autumn",
    navigationSurface: base,
    detail,
    lowDetail: low,
    lowOnly,
    lagoons,
    sceneryObjects,
    style: BIOME_STYLES.autumn,
    stats: { fishCount: lowOnly ? 0 : 48, staticMeshes: 0, sourceMeshes: 0 },
    ocean: { depth: MOSA_DEPTH, areaMultiplier: 6 },
  };
  const shore = new THREE.Mesh(
    shoreGeometry(),
    new THREE.MeshStandardMaterial({
      color: 0xa4bf80,
      roughness: 0.92,
      map: surfaceTexture("ground"),
    }),
  );
  root.userData.navigationSurface = shore;
  shore.name = "Wide dry beaches and walkable island ring";
  shore.receiveShadow = true;
  base.add(shore);
  const beachOutline = new THREE.Shape();
  beachOutline.absellipse(0, 0, 23, 22, 0, Math.PI * 2, false);
  const beachHole = new THREE.Path();
  beachHole.absellipse(0, 0, 21, 20, 0, Math.PI * 2, true);
  beachOutline.holes.push(beachHole);
  const sandGeometry = new THREE.ShapeGeometry(beachOutline, 64);
  sandGeometry.rotateX(-Math.PI / 2);
  const sand = new THREE.Mesh(
    sandGeometry,
    new THREE.MeshStandardMaterial({
      color: 0xe9dcbb,
      roughness: 0.93,
      map: surfaceTexture("ground"),
    }),
  );
  sand.position.y = 0.15;
  sand.receiveShadow = true;
  base.add(sand);

  const cliff = new THREE.Mesh(
    new THREE.CylinderGeometry(
      MOSA_RADIUS - 0.1,
      MOSA_RADIUS - 3,
      34,
      48,
      6,
      true,
    ),
    new THREE.MeshStandardMaterial({
      color: 0x8d9996,
      roughness: 0.9,
      map: surfaceTexture("stone"),
      side: THREE.DoubleSide,
    }),
  );
  const cliffPositions = cliff.geometry.attributes.position,
    cliffColors = [];
  for (let i = 0; i < cliffPositions.count; i++) {
    const x = cliffPositions.getX(i),
      y = cliffPositions.getY(i),
      z = cliffPositions.getZ(i),
      a = Math.atan2(x, z),
      t = (17 - y) / 34;
    const noise =
      (Math.sin(a * 7 + t * 3) + Math.cos(a * 11 - t * 5)) *
      0.055 *
      (0.25 + t * 0.75);
    cliffPositions.setX(i, x * (1 + noise));
    cliffPositions.setZ(i, z * (1 + noise));
    const c = new THREE.Color(
      [0xb1b0a0, 0x8d9c99, 0xa6a999][Math.floor((a + Math.PI) * 9) % 3],
    );
    c.multiplyScalar(0.82 + Math.sin(a * 13 + t * 8) * 0.08 + t * 0.12);
    cliffColors.push(c.r, c.g, c.b);
  }
  cliff.geometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(cliffColors, 3),
  );
  cliff.geometry.computeVertexNormals();
  cliff.material.color.set(0xffffff);
  cliff.material.vertexColors = true;
  cliff.material.flatShading = true;
  cliff.position.y = -17.15;
  base.add(cliff);
  const bottom = shape(
    base,
    "cone",
    0x828c99,
    0,
    -43.5,
    0,
    MOSA_RADIUS - 3,
    20,
    MOSA_RADIUS - 3,
  );
  bottom.rotation.z = Math.PI;
  yield;
  // The same water/fish engine, with a physically much deeper basin. Nothing
  // changes for the pre-existing lagoon material or basin defaults.
  const sea = yield* lagoonSteps({
    rx: MOSA_SEA.rx,
    rz: MOSA_SEA.rz,
    depth: MOSA_DEPTH,
    fishCount: lowOnly ? 0 : 48,
    color: 0x12bed8,
    bedColor: 0x235f8a,
    wallColor: 0x3d8299,
    shoreColor: 0xa7edda,
  });
  sea.name = "Deep ocean · 40 times the previous sea depth";
  sea.userData.water.uniforms.uOpacity.value = 0.46;
  root.userData.ocean.sea = sea;
  lagoons.set("lake-autumn", sea);
  base.add(sea);
  animations.push(sea);
  if (!lowOnly) {
    const depths = yield* deepOceanSteps();
    detail.add(depths);
    animations.push(depths);
    root.userData.ocean.extraDrawCalls = depths.userData.drawCalls;
  }
  yield;
  // Visible rock ribs run all the way down to the basin, not a shallow decal.
  for (let i = 0; i < 56; i++) {
    yield;
    const a = (i / 56) * Math.PI * 2,
      x = Math.sin(a),
      z = Math.cos(a),
      r = MOSA_RADIUS - 0.65;
    shape(
      props,
      "stone",
      [0x9faaa0, 0xb6b6a2, 0x7d8f96][i % 3],
      x * r,
      -4.7 - (i % 4) * 1.2,
      z * r,
      1.45,
      1.7 + (i % 5) * 0.35,
      1.7,
    );
    if (i % 3 === 0)
      shape(
        props,
        "stone",
        0x6f8190,
        x * (r - 1),
        -21 - (i % 4),
        z * (r - 1),
        1.5,
        4.3,
        1.7,
      );
    if (!lowOnly && i % 2 === 0)
      for (let j = 0; j < 4; j++)
        shape(
          props,
          "petal",
          [0x6c9e64, 0x86ad79][j % 2],
          x * (MOSA_RADIUS - 0.1 - j * 0.04),
          -0.35 - j * 0.73,
          z * (MOSA_RADIUS - 0.1 - j * 0.04),
          0.35,
          0.54,
          0.38,
        );
    // Soft vegetation is concentrated on outer shores, leaving the sea open.
    if (!lowOnly && i % 3 === 0) {
      const px = x * 25,
        pz = z * 25;
      jungleFlowers(
        props,
        px,
        0.15,
        pz,
        1.05,
        [0xffd0b2, 0xf4b4cd, 0xe8e1b0][i % 3],
      );
      if (i % 6 === 0) lantern(props, px - 0.8, 0.15, pz, 0.65);
    }
  }
  const cliffs = yield* bake(props, base);
  root.userData.stats.staticMeshes = cliffs.children.length;
  root.userData.stats.sourceMeshes = cliffs.userData.sourceMeshes;
  if (!lowOnly) {
    const gardens = new THREE.Group();
    for (const a of [0.8, 2.8, 4.6]) {
      const patch = shape(
        gardens,
        "sphere",
        0x8eb47a,
        Math.sin(a) * 25.1,
        0.12,
        Math.cos(a) * 25.1,
        3.5,
        0.055,
        2.1,
      );
      patch.rotation.y = a;
    }
    for (let i = 0; i < 6; i++) {
      const a = 0.6 + i * 1.05,
        g = new THREE.Group();
      g.position.set(Math.sin(a) * 26, 0, Math.cos(a) * 26);
      g.rotation.y = a;
      yield* junglePalmSteps(gardens, false, i % 3);
      const palm = gardens.children.at(-1);
      palm.position.copy(g.position);
      palm.rotation.y = a;
      yield;
    }
    for (let i = 0; i < 100; i++) {
      yield;
      const a = i * 2.399,
        r = 23.2 + (i % 7) * 0.55,
        x = Math.sin(a) * r,
        z = Math.cos(a) * r;
      if (Math.abs(x) < 2 && z > 19) continue;
      flowerCluster(gardens, x, z, [0xffcdd6, 0xffe4ac, 0xd3edc0][i % 3], 0.65);
      // A gently curving walking route circles the shore.
      if (i % 2 === 0)
        shape(
          gardens,
          "stone",
          0xf3e8ce,
          Math.sin(a) * 23.2,
          0.16,
          Math.cos(a) * 23.2,
          0.52,
          0.04,
          0.42,
        );
    }
    const flowers = yield* bake(gardens, detail);
    root.userData.stats.staticMeshes += flowers.children.length;
    root.userData.stats.sourceMeshes += flowers.userData.sourceMeshes;
  }
  for (const [a, width, height] of [
    [0.4, 3.1, 32],
    [1.8, 2.5, 30],
    [3.3, 3.7, 35],
    [4.8, 2.8, 31],
    [5.7, 2, 28],
  ]) {
    yield;
    const fall = yield* waterfallSteps(
      Math.sin(a) * (MOSA_RADIUS - 0.2),
      Math.cos(a) * (MOSA_RADIUS - 0.2),
      width,
      height + 18,
      { color: 0x83dced },
    );
    fall.rotation.y = a;
    detail.add(fall);
    animations.push(fall);
  }
  // Below-island clouds make the large floating foundation legible at a glance.
  const clouds = new THREE.Group();
  clouds.name = "Cloud bank far beneath the floating ocean";
  for (let i = 0; i < 15; i++) {
    yield;
    const a = i * 2.4;
    shape(
      clouds,
      "sphere",
      0xe1e7f6,
      Math.sin(a) * 24,
      -49 - (i % 4) * 1.4,
      Math.cos(a) * 24,
      7 + (i % 3),
      1.4,
      4.8,
    );
  }
  yield* bake(clouds, base);
  root.userData.scenerySteps = function* (records = []) {
    const visible = records.filter((r) => !r.stored && r.biome === "autumn");
    for (const [id, g] of sceneryObjects)
      if (!visible.some((r) => r.id === id)) {
        detail.remove(g);
        disposeScenery(g);
        sceneryObjects.delete(id);
        yield;
      }
    if (!lowOnly)
      for (const r of visible) {
        yield;
        let g = sceneryObjects.get(r.id);
        if (!g) {
          g = yield* sceneryModelSteps(r);
          detail.add(g);
          sceneryObjects.set(r.id, g);
        }
        positionScenery(g, r);
      }
    root.userData.trees = visible.filter((r) =>
      r.type.startsWith("scenery-tree-"),
    );
  };
  root.userData.updateScenery = (...args) =>
    runSceneSteps(root.userData.scenerySteps(...args));
  let cover = null,
    coverKey = "";
  root.userData.placementSteps = function* (items = [], records = []) {
    yield* root.userData.scenerySteps(records);
    const key = JSON.stringify([items, records]);
    if (lowOnly || key === coverKey) return;
    coverKey = key;
    yield;
    if (cover) {
      detail.remove(cover);
      disposeScenery(cover);
    }
    const clear = placementClearance([
      ...items,
      ...records
        .filter((r) => !r.stored)
        .map((r) => ({ ...r, footprint: [2.4, 2.4] })),
    ]);
    cover = createGroundCover(BIOME_STYLES.autumn, "mosasaur-shore", {
      radius: MOSA_RADIUS - 1,
      density: 0.8,
      clearance: (x, z, w, d) =>
        clear(x, z, w, d) &&
        Math.hypot(x / 23.3, z / 22.3) > 1 &&
        !(Math.abs(x) < 2 && z > 18),
    });
    detail.add(cover);
  };
  root.userData.updatePlacements = (...args) =>
    runSceneSteps(root.userData.placementSteps(...args));
  yield* root.userData.placementSteps(placements, scenery);
  if (preview && !lowOnly) {
    const ride = yield* mosasaurRideSteps("ride-mosasaur");
    ride.userData.rideElapsed = 32;
    ride.userData.update(0, true);
    detail.add(ride);
    animations.push(ride);
  }
  root.userData.update = (time, reduced = false) => {
    for (const g of animations) g.userData.update?.(time, reduced);
    cover?.userData.update?.(time, reduced);
  };
  detail.visible = !lowOnly;
  low.visible = lowOnly;
  root.userData.dispose = () => disposeScenery(root);
  return root;
}
