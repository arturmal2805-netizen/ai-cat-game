import { runSceneSteps } from "./scene-tasks.js";
import * as THREE from "three";
import { BIOME_STYLES } from "./biome-styles.js";
import {
  shape,
  line,
  flowerCluster,
  lantern,
  batchScenery,
  batchScenerySteps,
  surfaceTexture,
  teaPavilion,
} from "./fantasy-scenery.js";
import { royalCastle, legendaryAttraction } from "./legendary-assets.js";
import { PARK_RIDES } from "./world-objects.js";
import {
  createLagoon,
  lagoonSteps,
  createWaterfall,
  waterfallSteps,
} from "./lagoon.js";
import {
  createSceneryModel,
  sceneryModelSteps,
  positionScenery,
  disposeScenery,
} from "./scenery-models.js";
import { sceneryFootprint, byScenery } from "./scenery-data.js";
import { createGroundCover } from "./landscape-detail.js";
export function* legendaryBiomeSteps(
  biome,
  { preview = false, lowOnly = false, placements = [], scenery = [] } = {},
) {
  yield;
  const root = new THREE.Group(),
    base = new THREE.Group(),
    detail = new THREE.Group(),
    low = new THREE.Group(),
    props = new THREE.Group(),
    style = BIOME_STYLES.aquapark,
    animations = [],
    sceneryObjects = new Map();
  yield;
  root.add(base, detail, low);
  yield;
  root.userData.navigationSurface = base;
  yield;
  root.name = "Biome-aquapark";
  yield;
  const outline = new THREE.Shape();
  yield;
  for (let i = 0; i <= 96; i++) {
    yield;
    const a = (i / 96) * Math.PI * 2,
      r = 19 + Math.sin(a * 5) * 0.36;
    yield;
    i
      ? outline.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      : outline.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  yield;
  const hole = new THREE.Path();
  yield;
  hole.absellipse(-6, -5, 8, 5, 0, Math.PI * 2, true);
  yield;
  outline.holes.push(hole);
  yield;
  const geo = new THREE.ExtrudeGeometry(outline, {
    depth: 0.3,
    bevelEnabled: true,
    bevelSize: 0.12,
    bevelThickness: 0.08,
    bevelSegments: 2,
    curveSegments: 36,
  });
  yield;
  geo.rotateX(-Math.PI / 2);
  yield;
  geo.translate(0, -0.16, 0);
  yield;
  const ground = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: 0xa7c987,
      roughness: 0.85,
      map: surfaceTexture("ground"),
    }),
  );
  yield;
  ground.receiveShadow = true;
  yield;
  base.add(ground);
  yield;
  const cliff = new THREE.Mesh(
    new THREE.CylinderGeometry(18.8, 14, 4.8, 48, 3, true),
    new THREE.MeshStandardMaterial({
      color: 0x807b9d,
      map: surfaceTexture("stone"),
      roughness: 0.88,
    }),
  );
  yield;
  cliff.position.y = -2.4;
  yield;
  base.add(cliff);
  yield;
  for (let i = 0; i < 32; i++) {
    yield;
    const a = i * 2.4,
      r = 16 + (i % 4) * 0.8;
    yield;
    shape(
      props,
      "stone",
      [0x8b9cb3, 0xaba0b7, 0xb7aba1][i % 3],
      Math.sin(a) * r,
      -2 - (i % 3) * 0.7,
      Math.cos(a) * r,
      1 + (i % 4) * 0.24,
      2 + (i % 3) * 0.6,
      1.1,
    );
  }
  // Three stepped cliffs, a warm castle and channels spilling into the lagoon.
  yield;
  for (let i = 0; i < 3; i++) {
    yield;
    shape(
      props,
      "stone",
      [0x8da597, 0xb8bc96, 0xc6c29a][i],
      -3,
      -0.15 + i * 0.85,
      -8,
      6 - i * 0.75,
      1.35,
      5.2 - i * 0.5,
    );
  }
  yield;
  const castle = royalCastle(props, -3, -8, 0.88);
  yield;
  castle.position.y = 2.8;
  yield;
  if (!lowOnly) {
    yield;
    const lagoon = yield* lagoonSteps({
      x: -6,
      z: 5,
      rx: 8,
      rz: 5,
      fishCount: preview ? 24 : 52,
      color: 0x08bad9,
      seed: 915,
    });
    yield;
    detail.add(lagoon);
    yield;
    animations.push(lagoon);
    yield;
    const upper = yield* lagoonSteps({
      x: -3,
      z: -4.4,
      rx: 3.7,
      rz: 1.25,
      fishCount: 12,
      color: 0x40c5d8,
      seed: 916,
    });
    yield;
    upper.position.y = 3.3;
    yield;
    detail.add(upper);
    yield;
    animations.push(upper);
    yield;
    root.userData.lagoons = new Map([
      ["lake-aquapark", lagoon],
      ["lake-aquapark-upper", upper],
    ]);
    yield;
    for (let i = 0; i < 7; i++) {
      yield;
      const fall = yield* waterfallSteps(-6 + i * 0.9, -3.65, 0.7, 3);
      yield;
      fall.position.y += 3.1;
      yield;
      detail.add(fall);
      yield;
      animations.push(fall);
    }
    yield;
    for (let i = 0; i < 6; i++) {
      yield;
      const a = i * 0.65 + 0.45,
        fall = yield* waterfallSteps(
          Math.sin(a) * 18.4,
          Math.cos(a) * 18.4,
          1.1 + i * 0.12,
          5.3 + (i % 3),
        );
      yield;
      fall.rotation.y = a;
      yield;
      detail.add(fall);
      yield;
      animations.push(fall);
    }
    yield;
    const bridge = new THREE.Group();
    yield;
    for (let i = 0; i < 18; i++) {
      yield;
      shape(bridge, "cube", 0xe9c795, -13 + i * 0.87, 0.36, 5, 0.8, 0.14, 1.1);
    }
    yield;
    for (const z of [4.4, 5.6]) {
      yield;
      line(bridge, [-13, 0.9, z], [1.8, 0.9, z], 0xbb986b, 0.06);
    }
    yield;
    props.add(bridge);
    yield;
    for (let i = 0; i < 34; i++) {
      yield;
      const a = i * 2.4,
        r = 5 + (i % 9);
      yield;
      let x = Math.sin(a) * r,
        z = Math.cos(a) * r;
      yield;
      if (((x + 6) / 9) ** 2 + ((z - 5) / 6) ** 2 < 1) continue;
      yield;
      flowerCluster(
        props,
        x,
        z,
        [0xffb0d0, 0xffda7b, 0xa2dcee][i % 3],
        0.5 + (i % 3) * 0.12,
      );
      yield;
      if (i % 4 === 0) lantern(props, x, 0, z, 0.5);
    }
    yield;
    for (const [x, z] of [
      [-14, 10],
      [-4, 14],
      [13, -3],
    ]) {
      yield;
      teaPavilion(props, x, 0, z, 0x76cdbb, 0.8);
    }
    yield;
    for (let i = 0; i < 30; i++) {
      yield;
      const a = i * 0.209,
        x = -6 + Math.sin(a) * 8.3,
        z = 5 + Math.cos(a) * 5.3;
      yield;
      shape(
        props,
        "stone",
        [0xffd6a3, 0xffbdcf, 0xafdccc][i % 3],
        x,
        0,
        z,
        0.4,
        0.23,
        0.33,
      );
    }
    yield;
    if (preview)
      for (const r of PARK_RIDES) {
        yield;
        const m = legendaryAttraction(r.type);
        yield;
        m.position.set(r.x, 0.16, r.z);
        yield;
        detail.add(m);
        yield;
        animations.push(m);
      }
  }
  yield;
  const batch = yield* batchScenerySteps(props);
  yield;
  detail.add(batch);
  yield;
  const silhouette = new THREE.Group();
  yield;
  shape(silhouette, "cone", 0xffd17c, -3, 4, -8, 5, 7, 4);
  yield;
  shape(silhouette, "sphere", 0x39cadd, -6, 0.14, 5, 8, 0.035, 5);
  yield;
  low.add(yield* batchScenerySteps(silhouette));
  yield;
  root.userData.scenerySteps = function* (records = []) {
    yield;
    for (const [id, g] of sceneryObjects) {
      yield;
      if (
        !records.some((r) => r.id === id && !r.stored && r.biome === "aquapark")
      ) {
        yield;
        detail.remove(g);
        yield;
        disposeScenery(g);
        yield;
        sceneryObjects.delete(id);
      }
    }
    yield;
    if (!lowOnly)
      for (const r of records.filter(
        (r) => !r.stored && r.biome === "aquapark",
      )) {
        yield;
        let g = sceneryObjects.get(r.id);
        yield;
        if (!g) {
          yield;
          g = yield* sceneryModelSteps(r);
          yield;
          detail.add(g);
          yield;
          sceneryObjects.set(r.id, g);
        }
        yield;
        positionScenery(g, r);
      }
    yield;
    root.userData.trees = records.filter(
      (r) => !r.stored && byScenery(r.type).category === "tree",
    );
  };
  root.userData.updateScenery = (...args) =>
    runSceneSteps(root.userData.scenerySteps(...args));
  yield;
  let cover = null,
    key = "";
  yield;
  root.userData.placementSteps = function* (items = [], records = []) {
    yield;
    yield* root.userData.scenerySteps(records);
    yield;
    const nextKey = JSON.stringify([items, records]);
    yield;
    if (nextKey === key || lowOnly) return;
    yield;
    key = nextKey;
    yield;
    if (cover) {
      yield;
      detail.remove(cover);
      yield;
      cover.traverse((o) => {
        if (o.isMesh && !o.geometry.userData.sharedScenery)
          o.geometry.dispose();
      });
    }
    yield;
    cover = createGroundCover(style, "aquapark", {
      placements: [
        ...items,
        ...PARK_RIDES.map((r) => ({ ...r, item: r.type })),
        ...records
          .filter((r) => !r.stored)
          .map((r) => ({ ...r, footprint: sceneryFootprint(r) })),
      ],
      preview,
      seed: 915,
    });
    yield;
    detail.add(cover);
    yield;
    root.userData.groundCover = cover;
  };
  root.userData.updatePlacements = (...args) =>
    runSceneSteps(root.userData.placementSteps(...args));
  yield;
  root.userData = {
    ...root.userData,
    detail,
    lowDetail: low,
    lowOnly,
    style,
    biomeId: "aquapark",
    sceneryObjects,
    stats: {
      staticMeshes: batch.children.length,
      sourceMeshes: batch.userData.sourceMeshes,
      fishCount: lowOnly ? 0 : preview ? 24 : 52,
    },
  };
  yield;
  yield* root.userData.placementSteps(placements, scenery);
  yield;
  root.userData.update = (time, reduced) => {
    if (detail.visible) {
      for (const a of animations) a.userData.update?.(time, reduced);
      cover?.userData.update?.(time, reduced);
    }
  };
  yield;
  detail.visible = !lowOnly;
  yield;
  low.visible = lowOnly;
  yield;
  root.userData.dispose = () => {
    root.traverse((o) => {
      if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
    });
  };
  yield;
  return root;
}

export function createLegendaryBiome(...args) {
  return runSceneSteps(legendaryBiomeSteps(...args));
}
