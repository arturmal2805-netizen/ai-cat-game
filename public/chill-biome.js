import * as THREE from "three";
import {
  CHILL_RADIUS,
  CHILL_HOUSES,
  CHILL_GATE,
  CHILL_OBJECTS,
  CHILL_WATER_Y,
  chillReservations,
} from "./chill-data.js";
import { chillHouseModelSteps, chillSign } from "./chill-assets.js";
import {
  shape,
  line,
  flowerCluster,
  lantern,
  surfaceTexture,
} from "./fantasy-scenery.js";
import { waterMaterial, advanceWater } from "./water-shading.js";
import { waterfallSteps } from "./lagoon.js";
import { createJacuzziEffects } from "./spa-effects.js";
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
  const baked = yield* batchModelSteps(source, { combineColors: true });
  baked.name = source.name;
  baked.userData = { ...baked.userData, ...source.userData };
  parent.add(baked);
  source.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  return baked;
}
export function bathWater(o) {
  const g = new THREE.Group(),
    material = waterMaterial(0x59cfdb),
    surface = new THREE.Mesh(new THREE.CircleGeometry(1, 48), material);
  g.name = `Chill warm water ${o.houseId}`;
  g.position.set(o.x, CHILL_WATER_Y, o.z);
  surface.rotation.x = -Math.PI / 2;
  surface.scale.set(1.49, 1.42, 1);
  surface.renderOrder = 3;
  material.uniforms.uLake.value = 1;
  material.uniforms.uScale.value.set(2.98, 2.84);
  material.uniforms.uShoreColor.value.set(0xc6eadb);
  g.add(surface);
  let lastRipple = -10;
  g.userData.disturb = (time) => {
    if (time - lastRipple < 0.8) return;
    lastRipple = time;
    g.updateWorldMatrix(true, false);
    const p = new THREE.Vector3(0, 0, 0).applyMatrix4(g.matrixWorld);
    material.uniforms.uRipples.value[0].set(p.x, p.z, time, 0.22);
    material.uniforms.uRippleCount.value = 1;
  };
  g.userData.update = (time, reduced) => advanceWater(material, time, reduced);
  return g;
}
export function* chillBiomeSteps(
  biome,
  { lowOnly = false, placements = [], scenery = [] } = {},
) {
  const root = new THREE.Group(),
    base = new THREE.Group(),
    detail = new THREE.Group(),
    low = new THREE.Group(),
    sceneryObjects = new Map(),
    animations = [],
    lagoons = new Map(),
    houseSources = new THREE.Group();
  root.name = "Biome-sakura-Chill-Land";
  root.add(base, detail, low);
  root.userData = {
    biomeId: "sakura",
    navigationSurface: base,
    detail,
    lowDetail: low,
    lowOnly,
    sceneryObjects,
    lagoons,
    style: BIOME_STYLES.sakura,
    stats: { fishCount: 0 },
    chill: {
      areaMultiplier: 5,
      houses: CHILL_HOUSES.length,
      bedPlaces: 14,
      baths: 7,
    },
  };
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(CHILL_RADIUS, CHILL_RADIUS - 0.25, 0.32, 96),
    new THREE.MeshStandardMaterial({
      color: 0xa7bd8a,
      roughness: 0.9,
      map: surfaceTexture("ground"),
    }),
  );
  top.position.y = -0.02;
  top.receiveShadow = true;
  base.add(top);
  yield;
  const cliff = new THREE.Mesh(
    new THREE.CylinderGeometry(
      CHILL_RADIUS - 0.2,
      CHILL_RADIUS - 2.1,
      5.1,
      64,
      3,
      true,
    ),
    new THREE.MeshStandardMaterial({
      color: 0x9e9b92,
      roughness: 0.88,
      map: surfaceTexture("stone"),
    }),
  );
  cliff.position.y = -2.7;
  base.add(cliff);
  const bottom = shape(
    base,
    "cone",
    0x85838b,
    0,
    -7,
    0,
    CHILL_RADIUS - 2,
    4.5,
    CHILL_RADIUS - 2,
  );
  bottom.rotation.z = Math.PI;
  yield;
  for (const h of CHILL_HOUSES) {
    // The distant silhouette is used only outside detailed viewing distance.
    shape(low, "cube", 0xe6d6b8, h.x, 1.7, h.z, 10.8, 3.1, 7);
    shape(low, "sphere", h.roof, h.x, 3.9, h.z - 0.6, 5.7, 1.8, 3.5);
    yield;
    if (lowOnly) continue;
    const source = yield* chillHouseModelSteps(h);
    source.position.set(h.x, 0, h.z);
    houseSources.add(source);
    const bath = CHILL_OBJECTS.find(
        (o) => o.houseId === h.id && o.kind === "bath",
      ),
      water = bathWater(bath);
    detail.add(water);
    lagoons.set(bath.id, water);
    animations.push(water);
    // Reuse the existing light GPU-only steam/bubbles without a render target.
    const warm = new THREE.Group();
    warm.name = `Chill bath steam ${h.id}`;
    warm.scale.setScalar(0.4);
    warm.position.set(
      bath.x - 14.1 * 0.4,
      CHILL_WATER_Y - 0.16,
      bath.z - 4.5 * 0.4,
    );
    detail.add(warm);
    animations.push(createJacuzziEffects(warm));
    yield;
  }
  if (!lowOnly) {
    const props = new THREE.Group();
    props.name = "Chill paths, bridges and gardens";
    props.add(houseSources);
    const sign = chillSign(props);
    sign.position.set(CHILL_GATE.x, 0.15, CHILL_GATE.z);
    // An open central promenade branches to each broad front porch.
    for (const h of CHILL_HOUSES) {
      const start = new THREE.Vector2(0, h.z + 5.7),
        end = new THREE.Vector2(h.x, h.z + 5.7),
        length = start.distanceTo(end),
        count = Math.ceil(length / 1.1);
      for (let i = 0; i <= count; i++) {
        yield;
        const p = start.clone().lerp(end, i / Math.max(1, count));
        shape(
          props,
          "stone",
          i % 3 ? 0xdfcfb0 : 0xcbbb9e,
          p.x,
          0.17,
          p.y,
          0.65,
          0.075,
          0.72,
        );
      }
      for (const side of [-1, 1])
        lantern(props, h.x + side * 5.65, 0.15, h.z + 4.55, 0.7);
    }
    for (let z = -14; z < 24; z += 1.1) {
      yield;
      for (const x of [-0.65, 0.65])
        shape(
          props,
          "stone",
          0xe2d1b4,
          x + Math.sin(z * 0.2) * 0.16,
          0.17,
          z,
          0.66,
          0.07,
          0.5,
        );
      if (Math.round(z * 10) % 33 === 0)
        for (const x of [-2.4, 2.4]) lantern(props, x, 0.15, z, 0.55);
    }
    for (let i = 0; i < 48; i++) {
      yield;
      const a = (i / 48) * Math.PI * 2,
        r = CHILL_RADIUS - 0.75,
        x = Math.sin(a) * r,
        z = Math.cos(a) * r;
      // Cliff boulders and hanging greenery stay below the generous walkable rim.
      shape(
        props,
        "stone",
        [0x9f9b91, 0xb9afa0, 0x8e8e87][i % 3],
        x,
        -1.1 - (i % 3) * 0.32,
        z,
        1.2,
        1.6,
        1.25,
      );
      if (i % 2 === 0)
        for (let j = 0; j < 3; j++)
          shape(
            props,
            "sphere",
            0x77985f,
            x,
            -0.1 - j * 0.8,
            z,
            0.55 - j * 0.09,
            0.6,
            0.42,
          );
    }
    for (const [x, z, angle, width] of [
      [-8, 24.6, -0.32, 2.7],
      [9.5, 24.1, 0.36, 3],
      [-25, -5, -1.77, 2.5],
    ]) {
      yield;
      const fall = yield* waterfallSteps(x, z, 7, width, { color: 0xb3e2f4 });
      fall.rotation.y = angle;
      detail.add(fall);
      animations.push(fall);
      for (let i = 0; i < 5; i++)
        shape(
          props,
          "stone",
          0xcbc4ac,
          x + (i - 2) * 0.65,
          0.2,
          z - 0.5,
          0.36,
          0.3,
          0.32,
        );
    }
    // A few quiet benches leave broad passages through the shared central garden.
    for (const x of [-6.5, 6.5])
      for (const z of [-6, 3]) {
        shape(props, "cube", 0xd6b78b, x, 0.65, z, 2.7, 0.17, 0.8);
        shape(props, "cube", 0xc39d6f, x, 1.05, z - 0.35, 2.7, 0.65, 0.13);
        for (const dx of [-1, 1])
          line(props, [x + dx, 0.15, z], [x + dx, 0.6, z], 0xa68b64, 0.1);
        flowerCluster(props, x + 1.8, z, 0xe5b6d3, 1.3);
      }
    const baked = yield* bake(detail, props);
    root.userData.stats.staticMeshes = baked.children.length;
    root.userData.stats.sourceMeshes = baked.userData.sourceMeshes;
  }
  let contentKey = "",
    garden = null,
    cover = null;
  root.userData.scenerySteps = function* (records = []) {
    const visible = records.filter((r) => !r.stored && r.biome === "sakura");
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
          sceneryObjects.set(r.id, g);
          detail.add(g);
        }
        positionScenery(g, r);
      }
    root.userData.trees = visible.filter(
      (r) => byScenery(r.type)?.category === "tree",
    );
  };
  root.userData.updateScenery = (...args) =>
    runSceneSteps(root.userData.scenerySteps(...args));
  root.userData.placementSteps = function* (items = [], records = []) {
    yield* root.userData.scenerySteps(records);
    const key = JSON.stringify([items, records]);
    if (lowOnly || key === contentKey) return;
    contentKey = key;
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
        ...chillReservations().map((r) => ({ ...r, footprint: [r.w, r.d] })),
        ...[-6.5, 6.5].flatMap((x) =>
          [-6, 3].map((z) => ({ x, z, footprint: [4.3, 2.3] })),
        ),
      ]),
      allowed = (x, z, w = 0, d = w) =>
        clear(x, z, w, d) &&
        Math.abs(x) > 2.1 &&
        !CHILL_HOUSES.some(
          (h) =>
            Math.abs(z - (h.z + 5.7)) < 1.4 && Math.abs(x) < Math.abs(h.x) + 1,
        ) &&
        Math.hypot(x, z) < CHILL_RADIUS - 1.6,
      plants = new THREE.Group();
    plants.name = "Chill flowering gardens";
    for (let i = 0; i < 230; i++) {
      yield;
      const a = i * 2.399,
        r = Math.sqrt((i + 0.5) / 230) * (CHILL_RADIUS - 1.8),
        x = Math.sin(a) * r,
        z = Math.cos(a) * r;
      if (!allowed(x, z, 1.25)) continue;
      jungleFlowers(
        plants,
        x,
        0.15,
        z,
        0.8 + (i % 3) * 0.17,
        [0xf5d3dc, 0xffe6a9, 0xdbbae5][i % 3],
      );
      if (i % 3 === 0)
        shape(
          plants,
          "sphere",
          0x7c9f69,
          x + 0.5,
          0.3,
          z + 0.3,
          0.7,
          0.32,
          0.6,
        );
    }
    garden = yield* bake(detail, plants);
    cover = createGroundCover(BIOME_STYLES.sakura, "chill-land", {
      placements: items,
      radius: CHILL_RADIUS - 1,
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
