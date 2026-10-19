import * as T from "three";
import {
  HOUSING_ID,
  HOUSING_RADIUS,
  HOUSING_SECTION_PITCH,
  housingSectionCount,
  housingPlot,
  houseType,
} from "./housing-data.js";
import { chillHouseModel, chillSign } from "./chill-assets.js";
import { bathWater } from "./chill-biome.js";
import {
  shape,
  line,
  lantern,
  flowerCluster,
  surfaceTexture,
} from "./fantasy-scenery.js";
import { batchModelSteps } from "./model-batching.js";
import { yieldSceneTask, prepareSceneSteps } from "./scene-tasks.js";
import { waterfallSteps } from "./lagoon.js";
import { disposeScenery } from "./scenery-models.js";

export function* housingTerrainSteps() {
  const g = new T.Group(),
    props = new T.Group();
  g.name = "Котячі оселі · житлова секція";
  const ground = new T.Mesh(
    new T.CylinderGeometry(HOUSING_RADIUS, HOUSING_RADIUS - 0.3, 0.3, 96),
    new T.MeshStandardMaterial({
      color: 0xa7bd8a,
      roughness: 0.9,
      map: surfaceTexture("ground"),
    }),
  );
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  g.add(ground);
  shape(
    props,
    "pole",
    0x9e9b92,
    0,
    -3.3,
    0,
    HOUSING_RADIUS - 0.4,
    6.5,
    HOUSING_RADIUS - 0.4,
  );
  const bottom = shape(
    props,
    "cone",
    0x85838b,
    0,
    -12,
    0,
    HOUSING_RADIUS - 3,
    11,
    HOUSING_RADIUS - 3,
  );
  bottom.rotation.z = Math.PI;
  // Broad central promenade and individual front paths leave every model at
  // its original Chill Land scale. The section is repeated, never scaled up.
  shape(props, "cube", 0xdac5a2, 0, 0.17, 0, HOUSING_RADIUS * 2, 0.12, 3);
  shape(props, "cube", 0xe4d1ad, 0, 0.17, 16, 3.4, 0.12, 43);
  for (let i = 0; i < 12; i++) {
    const p = housingPlot(i);
    shape(props, "cube", 0xe4d1ad, p.x, 0.17, p.z + 5.7, 14.3, 0.12, 1.8);
    for (const dx of [-6.2, 6.2]) {
      lantern(props, p.x + dx, 0.15, p.z + 4.8, 0.6);
      flowerCluster(
        props,
        p.x + dx,
        p.z + 3.5,
        i % 2 ? 0xf3c4d3 : 0xe3c4ea,
        0.9,
      );
    }
    yield;
  }
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2,
      x = Math.cos(a) * 41,
      z = Math.sin(a) * 41;
    if (Math.abs(z) < 3) continue;
    shape(props, "stone", 0xb4ae9e, x, -0.9, z, 1.1, 1.9, 1);
    shape(props, "sphere", 0x83a56e, x, 0.3, z, 1, 0.6, 0.8);
    flowerCluster(props, x, z, i % 2 ? 0xf4ccdc : 0xffe3ad, 0.9, 0.45);
    if (i % 4 === 0) shape(props, "sphere", 0xf1e8f2, x, -17, z, 7, 2, 4);
    yield;
  }
  const entrance = chillSign(props, "Котячі оселі");
  entrance.position.set(0, 0.15, 35);
  const baked = yield* batchModelSteps(props, { combineColors: true });
  g.add(baked);
  props.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  g.userData.stats = {
    staticMeshes: baked.children.length + 1,
    sourceMeshes: baked.userData.sourceMeshes,
  };
  return g;
}

export function* housingBiomeSteps(biome, { lowOnly = false } = {}) {
  const root = new T.Group(),
    base = new T.Group(),
    detail = new T.Group(),
    low = new T.Group();
  root.name = "Котячі оселі · постійний житловий острів";
  root.add(base, detail, low);
  const terrain = yield* housingTerrainSteps();
  base.add(terrain);
  low.visible = lowOnly;
  detail.visible = !lowOnly;
  const templates = new Map(),
    preparing = new Map(),
    houses = new Map(),
    sections = new Map([[0, terrain]]),
    labels = new Map(),
    animated = new Set(),
    frustum = new T.Frustum(),
    projection = new T.Matrix4(),
    sphere = new T.Sphere();
  let snapshot = null,
    stopped = false,
    revision = 0,
    viewSection = 0;
  const labelGeometry = new T.PlaneGeometry(4.5, 0.76);
  function labelMaterial(owner, name) {
    const old = labels.get(owner);
    if (old?.name === name) return old.material;
    const canvas =
      typeof document !== "undefined" ? document.createElement("canvas") : null;
    let texture = null;
    if (canvas) {
      canvas.width = 768;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#f5dfb7";
      ctx.fillRect(0, 0, 768, 128);
      ctx.fillStyle = "#775135";
      ctx.font = "bold 72px Georgia";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(name, 384, 66, 720);
      texture = new T.CanvasTexture(canvas);
      texture.colorSpace = T.SRGBColorSpace;
    }
    const material = new T.MeshBasicMaterial({
      map: texture,
      color: texture ? 0xffffff : 0xf5dfb7,
      side: T.DoubleSide,
    });
    labels.set(owner, { name, material, texture });
    // Replace every old reference before releasing a renamed owner's texture.
    for (const h of houses.values())
      if (h.userData.owner === owner) h.userData.ownerSign.material = material;
    old?.material.dispose();
    old?.texture?.dispose();
    return material;
  }
  async function template(type) {
    if (templates.has(type)) return templates.get(type);
    if (!preparing.has(type))
      preparing.set(
        type,
        prepareSceneSteps(
          (function* () {
            yield;
            const spec = houseType(type),
              source = chillHouseModel({ ...spec, id: spec.modelId });
            yield;
            const result = yield* batchModelSteps(source, {
              combineColors: true,
            });
            result.userData = {
              ...result.userData,
              ...source.userData,
              housingTemplate: type,
            };
            source.traverse((o) => {
              if (o.isMesh && !o.geometry.userData.sharedScenery)
                o.geometry.dispose();
            });
            templates.set(type, result);
            return result;
          })(),
          { budget: 3 },
        ),
      );
    return preparing.get(type);
  }
  async function prepareHouse(id) {
    const home = snapshot?.housing?.homes[id];
    if (!home || houses.has(id)) return;
    const savedRevision = revision,
      t = await template(home.type);
    await yieldSceneTask();
    if (
      stopped ||
      savedRevision !== revision ||
      !snapshot?.housing?.homes[id] ||
      houses.has(id)
    )
      return;
    const g = new T.Group(),
      p = housingPlot(home.plot),
      model = t.clone(true);
    g.name = "Оселя · " + id;
    g.position.set(p.x, 0, p.z);
    g.add(model);
    const board = new T.Group();
    shape(board, "pole", 0xa77b4e, 0, 1.5, 5, 0.11, 2.7, 0.11);
    shape(board, "cube", 0xa77b4e, 0, 2.45, 5, 4.9, 0.94, 0.16);
    const ownerName =
      snapshot.jobCity?.profiles[home.owner]?.name || home.owner;
    const sign = new T.Mesh(
      labelGeometry,
      labelMaterial(home.owner, ownerName),
    );
    sign.position.set(0, 2.45, 5.1);
    board.add(sign);
    g.add(board);
    const water = bathWater({ houseId: id, x: 3.05, z: 0.65 });
    g.add(water);
    g.userData = {
      houseId: id,
      owner: home.owner,
      ownerSign: sign,
      ownerName,
      plot: home.plot,
      originalModel: home.type,
      water,
    };
    g.traverse((o) => {
      o.userData.housingHouseId = id;
    });
    detail.add(g);
    houses.set(id, g);
    animated.add(water);
    root.updateMatrixWorld(true);
  }
  function syncHousing(game) {
    snapshot = game;
    revision++;
    const count = housingSectionCount(game.housing);
    for (let i = sections.size; i < count; i++) {
      const g = terrain.clone(true);
      g.position.x = -i * HOUSING_SECTION_PITCH;
      base.add(g);
      sections.set(i, g);
      const bridge = new T.Group();
      const length = HOUSING_SECTION_PITCH - HOUSING_RADIUS * 2 + 1;
      shape(
        bridge,
        "cube",
        0xc49c70,
        -(i - 0.5) * HOUSING_SECTION_PITCH,
        0.16,
        0,
        length,
        0.2,
        3,
      );
      for (const z of [-1.65, 1.65])
        line(
          bridge,
          [-(i - 1) * HOUSING_SECTION_PITCH - HOUSING_RADIUS + 0.5, 1, z],
          [-i * HOUSING_SECTION_PITCH + HOUSING_RADIUS - 0.5, 1, z],
          0xa98462,
          0.055,
        );
      base.add(bridge);
    }
    for (const [id, g] of houses) {
      const home = game.housing?.homes[id];
      if (!home) continue; // Purchases are permanent; cached saves never delete them.
      const p = housingPlot(home.plot);
      g.position.set(p.x, 0, p.z);
      const name = game.jobCity?.profiles[home.owner]?.name || home.owner;
      g.userData.ownerSign.material = labelMaterial(home.owner, name);
      g.userData.ownerName = name;
    }
  }
  let nextPreparation = 0;
  function viewHousing(look, distance, camera, time = 0) {
    viewSection = Math.max(
      0,
      Math.min(
        sections.size - 1,
        Math.round(-(look.x - biome.center[0]) / HOUSING_SECTION_PITCH),
      ),
    );
    projection.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    frustum.setFromProjectionMatrix(projection);
    for (const [id, g] of houses) {
      sphere.center.set(
        biome.center[0] + g.position.x,
        3,
        biome.center[1] + g.position.z,
      );
      sphere.radius = 10;
      g.visible = frustum.intersectsSphere(sphere);
      if (g.visible) {
        g.userData.lastSeen = time;
        g.userData.water.userData.update(time, root.userData.reduced);
      } else if (
        time - (g.userData.lastSeen || 0) > 8 &&
        Math.abs(g.position.x - (look.x - biome.center[0])) >
          HOUSING_SECTION_PITCH * 3
      ) {
        // Evict only offscreen GPU objects, never the permanent home ledger.
        const water = g.userData.water;
        for (const mesh of water.children)
          if (mesh.isMesh) {
            mesh.geometry.dispose();
            mesh.material.dispose();
          }
        detail.remove(g);
        houses.delete(id);
        animated.delete(water);
      }
    }
    if (time < nextPreparation || !snapshot || stopped) return;
    nextPreparation = time + 0.2;
    for (const h of Object.values(snapshot.housing?.homes || {})) {
      if (houses.has(h.id)) continue;
      const p = housingPlot(h.plot);
      sphere.center.set(biome.center[0] + p.x, 3, biome.center[1] + p.z);
      sphere.radius = 12;
      if (frustum.intersectsSphere(sphere)) void prepareHouse(h.id);
    }
  }
  root.userData = {
    biomeId: HOUSING_ID,
    navigationSurface: base,
    detail,
    lowDetail: low,
    lowOnly,
    sceneryObjects: new Map(),
    lagoons: new Map(),
    trees: [],
    stats: { fishCount: 0, ...terrain.userData.stats },
    houses,
    sections,
    templates,
    syncHousing,
    viewHousing,
    currentSection: () => viewSection,
    near: (look) =>
      Math.abs(look.z - biome.center[1]) < HOUSING_RADIUS + 35 &&
      look.x < biome.center[0] + HOUSING_RADIUS + 35 &&
      look.x >
        biome.center[0] -
          (sections.size - 1) * HOUSING_SECTION_PITCH -
          HOUSING_RADIUS -
          35,
    update: (_time, reduced) => {
      root.userData.reduced = reduced;
    },
    placementSteps: function* () {},
    scenerySteps: function* () {},
    dispose: () => {
      stopped = true;
      const geometries = new Set(),
        materials = new Set();
      for (const g of [root, ...templates.values()])
        g.traverse((o) => {
          if (o.isMesh) {
            geometries.add(o.geometry);
            for (const m of Array.isArray(o.material)
              ? o.material
              : [o.material])
              materials.add(m);
          }
        });
      for (const geometry of geometries)
        if (!geometry.userData.sharedScenery) geometry.dispose();
      for (const material of materials)
        if (!material.userData.sharedScenery) material.dispose();
      for (const label of labels.values()) label.texture?.dispose();
    },
  };
  const fall = yield* waterfallSteps(10, 38.2, 12, 3, { color: 0xb3e2f4 });
  base.add(fall);
  const oldUpdate = root.userData.update;
  root.userData.update = (time, reduced) => {
    oldUpdate(time, reduced);
    if (root.userData.near({ x: biome.center[0], z: biome.center[1] }))
      fall.userData.update?.(time, reduced);
  };
  return root;
}
