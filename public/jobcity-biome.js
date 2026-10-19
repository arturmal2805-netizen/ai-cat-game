import * as T from "three";
import {
  JOB_CITY_RADIUS,
  JOB_BUSINESSES,
  jobReservations,
} from "./jobcity-data.js";
import { CITY_ROADS } from "./jobcity-navigation.js";
import { jobBuildingSteps } from "./jobcity-assets.js";
import {
  shape as sceneryShape,
  line,
  flowerCluster,
  lantern,
  surfaceTexture,
} from "./fantasy-scenery.js";
import { lagoonSteps, waterfallSteps } from "./lagoon.js";
import { batchModelSteps } from "./model-batching.js";
import { createCat, disposeCat } from "./cat-model.js";
import { enableCatRenderBatch } from "./cat-render-batch.js";
import { disposeScenery } from "./scenery-models.js";
const pavingMaterials = new Map();
function shape(parent, kind, color, ...args) {
  const mesh = sceneryShape(parent, kind, color, ...args);
  if (kind === "cube") {
    if (!pavingMaterials.has(color)) {
      const m = mesh.material.clone();
      m.map = null;
      m.bumpMap = null;
      m.userData.sharedScenery = true;
      pavingMaterials.set(color, m);
    }
    mesh.material = pavingMaterials.get(color);
  }
  return mesh;
}
export function* jobCityBiomeSteps(
  biome,
  { lowOnly = false, preview = false } = {},
) {
  const root = new T.Group(),
    base = new T.Group(),
    detail = new T.Group(),
    low = new T.Group(),
    props = new T.Group(),
    animations = [];
  let statue = null;
  low.visible = lowOnly;
  detail.visible = !lowOnly;
  root.name = "Cat Job City · шість професій";
  root.add(base, detail, low);
  root.userData = {
    biomeId: "jobcity",
    navigationSurface: base,
    detail,
    lowDetail: low,
    lowOnly,
    sceneryObjects: new Map(),
    lagoons: new Map(),
    trees: [],
    stats: { fishCount: 0 },
    jobCity: { businesses: 6, buildingScale: 5 },
  };
  const outline = new T.Shape();
  outline.absarc(0, 0, JOB_CITY_RADIUS, 0, Math.PI * 2, false);
  const hole = new T.Path();
  hole.absarc(0, 0, 3, 0, Math.PI * 2, true);
  outline.holes.push(hole);
  const geo = new T.ExtrudeGeometry(outline, {
    depth: 0.28,
    bevelEnabled: false,
    curveSegments: 64,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -0.15, 0);
  const lawn = new T.Mesh(
    geo,
    new T.MeshStandardMaterial({
      color: biome.ground,
      roughness: 0.92,
      map: surfaceTexture("lawn"),
    }),
  );
  lawn.receiveShadow = true;
  base.add(lawn);
  shape(
    base,
    "pole",
    biome.edge,
    0,
    -4.8,
    0,
    JOB_CITY_RADIUS - 1,
    9,
    JOB_CITY_RADIUS - 1,
  );
  const bottom = shape(
    base,
    "cone",
    0x8a8b91,
    0,
    -15,
    0,
    JOB_CITY_RADIUS - 4,
    15,
    JOB_CITY_RADIUS - 4,
  );
  bottom.rotation.z = Math.PI;
  for (const b of JOB_BUSINESSES) {
    shape(low, "cube", 0xe4d2b0, b.x, 6, b.z, b.w, 12, b.d);
    shape(low, "cube", b.color, b.x, 13, b.z, b.w + 1, 2, b.d + 1);
    yield;
    if (preview && !lowOnly) {
      const model = yield* jobBuildingSteps(b.id);
      model.position.set(b.x, 0.16, b.z);
      detail.add(model);
    }
  }
  for (let i = 0; i < 18; i++) {
    const a = i * 2.399,
      r = 50 + (i % 3) * 4;
    shape(
      props,
      "sphere",
      0xefebf4,
      Math.cos(a) * r,
      -20 - (i % 3),
      Math.sin(a) * r,
      7,
      1.7,
      4,
    );
    yield;
  }
  if (!lowOnly) {
    for (const { a, b } of CITY_ROADS) {
      const length = Math.hypot(b.x - a.x, b.z - a.z),
        p = shape(
          props,
          "cube",
          0xb4b7aa,
          (a.x + b.x) / 2,
          0.18,
          (a.z + b.z) / 2,
          4.2,
          0.13,
          length + 0.15,
        );
      p.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      for (let k = 1; k < length / 3; k++) {
        const t = (k * 3) / length;
        const stripe = shape(
          props,
          "cube",
          0xf5e4b9,
          a.x + (b.x - a.x) * t,
          0.26,
          a.z + (b.z - a.z) * t,
          0.12,
          0.025,
          1.2,
        );
        stripe.rotation.y = p.rotation.y;
      }
      yield;
    }
    // Central pedestrian plaza is separate from vehicle lanes.
    for (const x of [-11, 11])
      shape(props, "cube", 0xe7d1aa, x, 0.16, 4, 3, 0.12, 27);
    for (const z of [-10, 11, 56])
      shape(props, "cube", 0xe7d1aa, 0, 0.16, z, z === 56 ? 75 : 25, 0.12, 3);
    for (const b of JOB_BUSINESSES) {
      shape(props, "cube", 0xe6d4ad, b.x, 0.2, b.z + 11, 25, 0.12, 2.2);
      for (const dx of [-11, 11])
        for (const dz of [-8, 8]) {
          const x = b.x + dx,
            z = b.z + dz;
          shape(props, "pole", 0xd9be99, x, 0.5, z, 0.75, 0.65, 0.75);
          shape(props, "sphere", 0x80a86d, x, 1.5, z, 0.8, 1.1, 0.8);
          flowerCluster(props, x, z, 0xf1b5c8, 0.8, 0.9);
        }
      for (const dx of [-12, 12])
        lantern(props, b.x + dx, 0.24, b.z + 12, 0.75);
      yield;
    }
    for (let i = 0; i < 64; i++) {
      const a = (i * Math.PI * 2) / 64,
        x = Math.sin(a) * (JOB_CITY_RADIUS - 1),
        z = Math.cos(a) * (JOB_CITY_RADIUS - 1);
      shape(
        props,
        "stone",
        [0x8c9493, 0xa7a093, 0x98959a][i % 3],
        x,
        -4 - (i % 4),
        z,
        2,
        3.8,
        2,
      );
      if (i % 2 === 0) {
        line(props, [x, 0.2, z], [x, 3.2, z], 0xa28563, 0.2);
        shape(props, "sphere", 0x83ae67, x, 3.6, z, 1.7, 1.7, 1.5);
        for (const dx of [-0.9, 0.9])
          shape(
            props,
            "sphere",
            i % 4 ? 0x91b974 : 0x7aa365,
            x + dx,
            3.1,
            z + 0.4,
            1.25,
            1.4,
            1.3,
          );
        flowerCluster(props, x, z, 0xf5c7d8, 1.1, 0.2);
        root.userData.trees.push({ x, z });
      }
      if (i % 4 === 0) lantern(props, x * 0.97, 0.2, z * 0.97, 0.75);
      yield;
    }
    const pool = yield* lagoonSteps({
      x: 0,
      z: 0,
      rx: 3,
      rz: 3,
      depth: 0.6,
      fishCount: 0,
      color: 0x4fc7dd,
    });
    detail.add(pool);
    root.userData.lagoons.set("jobcity-fountain", pool);
    animations.push(pool);
    shape(props, "pole", 0xded2b1, 0, 0.6, 0, 1.5, 1.25, 1.5);
    statue = createCat("happy", { detail: "npc", color: 0xffedcf });
    statue.scale.setScalar(1.5);
    statue.position.set(0, 1.24, 0);
    enableCatRenderBatch(statue);
    detail.add(statue);
    for (const [x, z] of [
      [-58, -27],
      [59, 20],
      [-46, 47],
      [23, 61],
    ]) {
      const fall = yield* waterfallSteps(x, z, 3, 17, { color: 0x8ce0ed });
      fall.rotation.y = Math.atan2(x, z);
      detail.add(fall);
      animations.push(fall);
      yield;
    }
  }
  const baked = yield* batchModelSteps(props, { combineColors: true });
  (lowOnly ? base : detail).add(baked);
  props.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  root.userData.stats.staticMeshes = baked.children.length + 3;
  root.userData.stats.sourceMeshes = baked.userData.sourceMeshes;
  root.userData.placementSteps = function* () {
    yield;
  };
  root.userData.scenerySteps = function* () {
    yield;
  };
  root.userData.update = (time, reduced) => {
    for (const a of animations) a.userData.update?.(time, reduced);
  };
  root.userData.dispose = () => {
    if (statue) disposeCat(statue);
    disposeScenery(root);
  };
  return root;
}
