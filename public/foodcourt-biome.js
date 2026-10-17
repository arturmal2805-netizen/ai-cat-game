import * as THREE from "three";
import {
  COURT_RADIUS,
  COURT_VENUES,
  COURT_FOUNTAIN,
  courtReservations,
} from "./foodcourt-data.js";
import { courtVenue, courtLabel } from "./foodcourt-assets.js";
import {
  shape,
  line,
  flowerCluster,
  lantern,
  surfaceTexture,
} from "./fantasy-scenery.js";
import { lagoonSteps, waterfallSteps } from "./lagoon.js";
import { batchModelSteps } from "./model-batching.js";
import { runSceneSteps } from "./scene-tasks.js";
import { createGroundCover, placementClearance } from "./landscape-detail.js";
import { BIOME_STYLES } from "./biome-styles.js";
import {
  sceneryModelSteps,
  positionScenery,
  disposeScenery,
} from "./scenery-models.js";
import { sceneryFootprint, byScenery } from "./scenery-data.js";
import { jungleFlowers } from "./jungle-props.js";
function* bake(parent, source) {
  const b = yield* batchModelSteps(source, { combineColors: true });
  parent.add(b);
  source.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  return b;
}
export function* foodcourtBiomeSteps(
  biome,
  { lowOnly = false, placements = [], scenery = [], preview = false } = {},
) {
  const root = new THREE.Group(),
    base = new THREE.Group(),
    detail = new THREE.Group(),
    low = new THREE.Group(),
    sceneryObjects = new Map(),
    lagoons = new Map(),
    animations = [];
  root.name = "Biome-foodcourt-living-restaurants";
  root.add(base, detail, low);
  root.userData = {
    biomeId: "foodcourt",
    navigationSurface: base,
    detail,
    lowDetail: low,
    lowOnly,
    sceneryObjects,
    lagoons,
    style: BIOME_STYLES.foodcourt,
    stats: { fishCount: lowOnly ? 0 : 12 },
    foodcourt: { areaMultiplier: 8, venues: 5 },
  };
  const outline = new THREE.Shape();
  outline.absarc(0, 0, COURT_RADIUS, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absellipse(0, -3, 3, 2.6, 0, Math.PI * 2, true);
  outline.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(outline, {
    depth: 0.3,
    bevelEnabled: false,
    curveSegments: 64,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -0.15, 0);
  const top = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: 0xa9c48b,
      roughness: 0.9,
      map: surfaceTexture("ground"),
    }),
  );
  top.receiveShadow = true;
  base.add(top);
  yield;
  const props = new THREE.Group();
  const cliff = shape(
    base,
    "pole",
    0x8d9598,
    0,
    -4.1,
    0,
    COURT_RADIUS - 0.1,
    8,
    COURT_RADIUS - 0.1,
  );
  cliff.material = cliff.material.clone();
  cliff.material.map = surfaceTexture("stone");
  const bottom = shape(
    base,
    "cone",
    0x7a8392,
    0,
    -10,
    0,
    COURT_RADIUS - 2,
    7,
    COURT_RADIUS - 2,
  );
  bottom.rotation.z = Math.PI;
  yield;
  for (const o of COURT_VENUES) {
    shape(low, "cube", o.color, o.x, 2, o.z, o.w, 4, o.d);
    shape(low, "sphere", o.roof, o.x, 4, o.z, o.w / 2, 0.9, o.d / 2);
    yield;
    if (preview) {
      const v = courtVenue(o, { staff: false });
      v.position.set(o.x, 0.16, o.z);
      detail.add(v);
      yield;
    }
  }
  for (let i = 0; i < 18; i++) {
    const a = i * 2.399,
      r = 12 + (i % 4) * 4;
    shape(
      props,
      "sphere",
      0xeee9f3,
      Math.sin(a) * r,
      -15 - (i % 3),
      Math.cos(a) * r,
      4.7,
      1.6,
      3.4,
    );
    yield;
  }
  if (!lowOnly) {
    const pool = yield* lagoonSteps({
      x: 0,
      z: 3,
      rx: 3,
      rz: 2.6,
      fishCount: 12,
      color: 0x39c9de,
    });
    detail.add(pool);
    animations.push(pool);
    lagoons.set(COURT_FOUNTAIN.id, pool);
    // A low sculptural fountain leaves the surrounding water usable for swimming.
    shape(props, "pole", 0xd5c7b0, 0, 0.45, 3, 0.65, 0.7, 0.65);
    shape(props, "sphere", 0xe5d5b2, 0, 1.25, 3, 0.78, 0.65, 0.7);
    for (const s of [-1, 1])
      shape(props, "cone", 0xe5d5b2, s * 0.46, 1.94, 3, 0.23, 0.6, 0.2);
    for (const o of COURT_VENUES) {
      const z = o.kind === "cinema" ? o.z + 8.8 : o.z + 6;
      // Broad walking promenades are empty above their shallow paving.
      const a = new THREE.Vector2(0, z),
        b = new THREE.Vector2(o.x, z),
        n = Math.ceil(a.distanceTo(b) / 1.3);
      for (let i = 0; i <= n; i++) {
        const p = a.clone().lerp(b, i / Math.max(1, n));
        shape(props, "stone", 0xe8d2b0, p.x, 0.17, p.y, 0.85, 0.055, 1.2);
        yield;
      }
    }
    for (let z = -25; z < 30; z += 1.15) {
      if (Math.abs(z - 3) < 4) continue;
      for (const x of [-0.7, 0.7])
        shape(props, "stone", 0xe2cbaa, x, 0.17, z, 0.8, 0.06, 0.66);
      yield;
    }
    for (const x of [-3.2, 3.2]) {
      line(props, [x, 0.15, 29], [x, 4.4, 29], 0xae8254, 0.2);
      lantern(props, x, 2.1, 29, 0.75);
    }
    shape(props, "cube", 0xc69c6c, 0, 4.25, 29, 7.6, 1.1, 0.4);
    const label = courtLabel("CAT FOOD COURT", 6.8, 0.85);
    label.position.set(0, 4.25, 29.25);
    detail.add(label);
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2,
        r = COURT_RADIUS - 0.6,
        x = Math.sin(a) * r,
        z = Math.cos(a) * r;
      shape(
        props,
        "stone",
        [0xa9a6a0, 0x929497, 0xb7b09b][i % 3],
        x,
        -2 - (i % 3) * 0.5,
        z,
        1.4,
        2.6,
        1.4,
      );
      if (i % 2 === 0)
        for (let j = 0; j < 3; j++)
          shape(
            props,
            "sphere",
            0x749e70,
            x,
            -0.5 - j * 0.8,
            z,
            0.6 - j * 0.1,
            0.6,
            0.5,
          );
      yield;
    }
    for (const [x, z, a] of [
      [-23, -21, -2.2],
      [-28, 13, -1.1],
      [9, 30, 0.3],
      [27, 18, 1],
    ]) {
      const fall = yield* waterfallSteps(x, z, 2.7, 12, { color: 0xb6e9f4 });
      fall.rotation.y = a;
      detail.add(fall);
      animations.push(fall);
      yield;
    }
    for (const x of [-5, 5])
      for (const z of [-5, 9, 22]) lantern(props, x, 0.15, z, 0.65);
    const baked = yield* bake(detail, props);
    root.userData.stats.staticMeshes = baked.children.length;
    root.userData.stats.sourceMeshes = baked.userData.sourceMeshes;
  }
  let key = "",
    garden = null,
    cover = null;
  root.userData.scenerySteps = function* (records = []) {
    const visible = records.filter((r) => !r.stored && r.biome === "foodcourt");
    for (const [id, g] of sceneryObjects)
      if (!visible.some((r) => r.id === id)) {
        detail.remove(g);
        disposeScenery(g);
        sceneryObjects.delete(id);
        yield;
      }
    if (!lowOnly)
      for (const r of visible) {
        let g = sceneryObjects.get(r.id);
        if (!g) {
          g = yield* sceneryModelSteps(r);
          sceneryObjects.set(r.id, g);
          detail.add(g);
        }
        positionScenery(g, r);
        yield;
      }
    root.userData.trees = visible.filter(
      (r) => byScenery(r.type)?.category === "tree",
    );
  };
  root.userData.updateScenery = (...args) =>
    runSceneSteps(root.userData.scenerySteps(...args));
  root.userData.placementSteps = function* (items = [], records = []) {
    yield* root.userData.scenerySteps(records);
    const next = JSON.stringify([items, records]);
    if (lowOnly || key === next) return;
    key = next;
    for (const g of [garden, cover])
      if (g) {
        detail.remove(g);
        disposeScenery(g);
      }
    const clear = placementClearance([
        ...items,
        ...records
          .filter((r) => !r.stored)
          .map((r) => ({ ...r, footprint: sceneryFootprint(r) })),
        ...courtReservations().map((r) => ({
          ...r,
          footprint: [r.w, r.d + 5],
        })),
      ]),
      allowed = (x, z, w = 0, d = w) =>
        Math.hypot(x, z) < COURT_RADIUS - 1.5 &&
        Math.abs(x) > 3.7 &&
        clear(x, z, w, d) &&
        !COURT_VENUES.some(
          (o) =>
            Math.abs(z - (o.z + 6)) < 2.6 && Math.abs(x) < Math.abs(o.x) + 1,
        );
    const flowers = new THREE.Group();
    for (let i = 0; i < 340; i++) {
      yield;
      const a = i * 2.399,
        r = Math.sqrt((i + 0.5) / 340) * (COURT_RADIUS - 1.8),
        x = Math.sin(a) * r,
        z = Math.cos(a) * r;
      if (!allowed(x, z, 1.2)) continue;
      jungleFlowers(
        flowers,
        x,
        0.16,
        z,
        0.8 + (i % 3) * 0.12,
        [0xf3b9d3, 0xffdfa2, 0xcabce6][i % 3],
      );
      if (i % 4 === 0)
        shape(flowers, "sphere", 0x78a46e, x + 0.5, 0.35, z, 0.75, 0.35, 0.65);
    }
    garden = yield* bake(detail, flowers);
    cover = createGroundCover(BIOME_STYLES.foodcourt, "foodcourt", {
      placements: items,
      radius: COURT_RADIUS - 1,
      density: 2.2,
      clearance: allowed,
    });
    detail.add(cover);
  };
  root.userData.updatePlacements = (...args) =>
    runSceneSteps(root.userData.placementSteps(...args));
  yield* root.userData.placementSteps(placements, scenery);
  root.userData.update = (time, reduced = false) => {
    if (!detail.visible) return;
    for (const g of animations) g.userData.update?.(time, reduced);
    cover?.userData.update?.(time, reduced);
    for (const g of sceneryObjects.values()) g.userData.update?.(time, reduced);
  };
  detail.visible = !lowOnly;
  low.visible = lowOnly;
  root.userData.dispose = () => disposeScenery(root);
  return root;
}
