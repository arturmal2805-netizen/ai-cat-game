import { HOMESTEAD_EXPANSION } from "./homestead-expansion.js";
import * as THREE from "three";
import { surfaceTexture, shape } from "./fantasy-scenery.js";
import { groundCoverSteps, placementClearance } from "./landscape-detail.js";
import { BIOME_STYLES } from "./biome-styles.js";
import { batchModelSteps } from "./model-batching.js";
import { runSceneSteps } from "./scene-tasks.js";
import {
  sceneryModelSteps,
  positionScenery,
  disposeScenery,
} from "./scenery-models.js";

// Everything above the grass is cosmetic ground cover: no lake, landmark,
// trees, automatic buildings, reserved yard or resident is seeded here.
export function* homesteadBiomeSteps(
  biome,
  { lowOnly = false, preview = false, placements = [], scenery = [] } = {},
) {
  const root = new THREE.Group(),
    base = new THREE.Group(),
    detail = new THREE.Group(),
    low = new THREE.Group(),
    sceneryObjects = new Map();
  root.name = "Наш остров · свободная земля";
  root.add(base, detail, low);
  root.userData = {
    biomeId: biome.id,
    navigationSurface: base,
    detail,
    lowDetail: low,
    lowOnly,
    sceneryObjects,
    trees: [],
    stats: { fishCount: 0 },
    emptyPlot: true,
    areaMultiplier: 128,
  };
  const outline = new THREE.Shape();
  outline.absarc(0, 0, biome.radius, 0, Math.PI * 2, false);
  const surface = new THREE.ExtrudeGeometry(outline, {
    depth: 0.28,
    bevelEnabled: false,
    curveSegments: 64,
  });
  surface.rotateX(-Math.PI / 2);
  surface.translate(0, -0.15, 0);
  const lawn = new THREE.Mesh(
    surface,
    new THREE.MeshStandardMaterial({
      color: biome.ground,
      map: surfaceTexture("lawn"),
      roughness: 0.94,
    }),
  );
  lawn.receiveShadow = true;
  base.add(lawn);
  yield;
  const rock = new THREE.Mesh(
    new THREE.CylinderGeometry(biome.radius, biome.radius * 0.85, 8, 64),
    new THREE.MeshStandardMaterial({ color: biome.edge, roughness: 0.94 }),
  );
  rock.position.y = -4.16;
  base.add(rock);
  const underside = new THREE.Mesh(
    new THREE.ConeGeometry(biome.radius * 0.87, 17, 48),
    new THREE.MeshStandardMaterial({ color: 0x7f8589, roughness: 0.95 }),
  );
  underside.rotation.z = Math.PI;
  underside.position.y = -16.6;
  base.add(underside);
  yield;
  const props = new THREE.Group();
  for (let i = 0; i < (lowOnly ? 20 : 48); i++) {
    const a = i * 2.399963,
      radius = biome.radius - 0.9;
    shape(
      props,
      "stone",
      [0xa0a298, 0x99958c, 0x858f92][i % 3],
      Math.cos(a) * radius,
      -7.2 - (i % 4) * 0.25,
      Math.sin(a) * radius,
      2.1 + (i % 3),
      3.3 + (i % 4),
      2.2,
    ).rotation.y = a;
    yield;
  }
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4,
      r = biome.radius * (0.73 + (i % 3) * 0.11);
    shape(
      props,
      "sphere",
      0xf0edf5,
      Math.cos(a) * r,
      -13 - (i % 4),
      Math.sin(a) * r,
      5.5,
      1.1,
      2.8,
    );
    yield;
  }
  const baked = yield* batchModelSteps(props, { combineColors: true });
  base.add(baked);
  props.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  root.userData.stats.staticMeshes = baked.children.length + 3;
  root.userData.stats.sourceMeshes = baked.userData.sourceMeshes;
  let cover;
  root.userData.scenerySteps = function* (records = []) {
    const visible = records.filter((r) => !r.stored && r.biome === biome.id);
    for (const [id, model] of sceneryObjects) {
      if (!visible.some((r) => r.id === id)) {
        model.removeFromParent();
        disposeScenery(model);
        sceneryObjects.delete(id);
      }
      yield;
    }
    if (!lowOnly)
      for (const record of visible) {
        let model = sceneryObjects.get(record.id);
        if (!model) {
          model = yield* sceneryModelSteps(record);
          sceneryObjects.set(record.id, model);
          detail.add(model);
        }
        positionScenery(model, record);
        yield;
      }
    root.userData.trees = visible.filter((r) =>
      r.type.startsWith("scenery-tree-"),
    );
  };
  root.userData.placementSteps = function* (items = [], records = []) {
    yield* root.userData.scenerySteps(records);
    if (cover) {
      cover.removeFromParent();
      disposeScenery(cover);
    }
    if (!lowOnly) {
      cover = new THREE.Group();
      const itemsToAvoid = [...items,...records.filter(r=>!r.stored && r.biome===biome.id)],
        clear = placementClearance(itemsToAvoid), originalRadius=HOMESTEAD_EXPANSION.originalRadius-.7;
      // Exact original meadow, plus new grass of the same density outside it.
      cover.add(yield* groundCoverSteps(BIOME_STYLES.homestead, biome.id, {
        preview, radius:originalRadius, density:1.6, placements:itemsToAvoid,
      }));
      cover.add(yield* groundCoverSteps(BIOME_STYLES.homestead, biome.id, {
        preview, seed:20261021, radius:biome.radius-.7, density:1.6*3,
        spatialCell:32,
        clearance:(x,z,w)=>Math.hypot(x,z)>originalRadius && clear(x,z,w),
      }));
      cover.userData.update=(time,reduced)=>{
        for(const part of cover.children) part.userData.update?.(time,reduced);
      };
      detail.add(cover);
    }
    yield;
  };
  root.userData.updateScenery = (...args) =>
    runSceneSteps(root.userData.scenerySteps(...args));
  root.userData.updatePlacements = (...args) =>
    runSceneSteps(root.userData.placementSteps(...args));
  yield* root.userData.placementSteps(placements, scenery);
  root.userData.update = (time, reduced = false) => {
    if (detail.visible) cover?.userData.update?.(time, reduced);
  };
  detail.visible = !lowOnly;
  low.visible = lowOnly;
  root.userData.dispose = () => disposeScenery(root);
  return root;
}
