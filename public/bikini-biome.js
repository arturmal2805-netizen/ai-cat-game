import * as THREE from "three";
import {
  BIKINI_RADIUS,
  BIKINI_HOUSES,
  BIKINI_POOLS,
  bikiniReservations,
} from "./bikini-data.js";
import {
  pineappleHouseSteps,
  moaiHouse,
  rockHouse,
  tubeHouse,
  seaGarden,
  part,
} from "./bikini-scenery.js";
import { line, lantern, surfaceTexture } from "./fantasy-scenery.js";
import { lagoonSteps, waterfallSteps } from "./lagoon.js";
import { batchModelSteps } from "./model-batching.js";
import { createBikiniCharacter } from "./bikini-characters.js";
import { BIKINI_RESTAURANT, BIKINI_FRIENDS } from "./bikini-data.js";
import { courtVenue, courtLabel } from "./foodcourt-assets.js";
import { runSceneSteps } from "./scene-tasks.js";
import {
  sceneryModelSteps,
  positionScenery,
  disposeScenery,
} from "./scenery-models.js";
import { byScenery } from "./scenery-data.js";
const basalt = new THREE.CylinderGeometry(1, 0.38, 1, 5, 1);
basalt.userData.sharedScenery = true;
function* bake(parent, source) {
  const g = yield* batchModelSteps(source, { combineColors: true });
  parent.add(g);
  source.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  return g;
}
export function* bikiniBiomeSteps(
  biome,
  { lowOnly = false, placements = [], scenery = [], preview = false } = {},
) {
  const root = new THREE.Group(),
    base = new THREE.Group(),
    detail = new THREE.Group(),
    low = new THREE.Group(),
    props = new THREE.Group(),
    animations = [],
    lagoons = new Map(),
    sceneryObjects = new Map();
  root.name = "Bikini Bottom · sky city";
  root.add(base, detail, low);
  root.userData = {
    biomeId: "bikini",
    navigationSurface: base,
    detail,
    lowDetail: low,
    lowOnly,
    sceneryObjects,
    lagoons,
    bikini: { areaMultiplier: 7, houses: BIKINI_HOUSES.length },
    stats: { fishCount: lowOnly ? 0 : 20 },
  };
  const outline = new THREE.Shape();
  outline.absarc(0, 0, BIKINI_RADIUS, 0, Math.PI * 2, false);
  for (const p of BIKINI_POOLS) {
    const hole = new THREE.Path();
    hole.absellipse(p.x, -p.z, p.rx, p.rz, 0, Math.PI * 2, true);
    outline.holes.push(hole);
  }
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
      color: 0xe9d5a3,
      roughness: 0.88,
      map: surfaceTexture("ground"),
    }),
  );
  top.receiveShadow = true;
  base.add(top);
  const cliffGeo = new THREE.ExtrudeGeometry(outline, {
    depth: 8,
    bevelEnabled: false,
    curveSegments: 64,
  });
  cliffGeo.rotateX(-Math.PI / 2);
  cliffGeo.translate(0, -8.15, 0);
  base.add(
    new THREE.Mesh(
      cliffGeo,
      new THREE.MeshStandardMaterial({
        color: 0x959aa5,
        roughness: 0.9,
        map: surfaceTexture("stone"),
      }),
    ),
  );
  const bottom = part(
    base,
    "cone",
    0x9296a6,
    0,
    -11,
    0,
    BIKINI_RADIUS - 1,
    10,
    BIKINI_RADIUS - 1,
  );
  bottom.rotation.z = Math.PI;
  yield;
  for (const h of BIKINI_HOUSES) {
    if (lowOnly) {
      part(
        low,
        "sphere",
        h.kind === "pineapple" ? 0xf2b34f : 0xa9a1c6,
        h.x,
        2.6,
        h.z,
        h.w / 2,
        3,
        h.d / 2,
      );
      yield;
      continue;
    }
    const g = new THREE.Group();
    g.name = "Bikini house · " + h.kind;
    if (h.kind === "pineapple") yield* pineappleHouseSteps(g);
    else
      (h.kind === "moai"
        ? moaiHouse
        : h.kind === "rock"
          ? rockHouse
          : (g) => tubeHouse(g, h.kind === "lighthouse"))(g);
    g.position.set(h.x, 0.16, h.z);
    props.add(g);
    yield;
  }
  for (let i = 0; i < 22; i++) {
    const a = i * 2.399,
      r = 10 + (i % 4) * 5;
    part(
      props,
      "sphere",
      0xeeeaf0,
      Math.sin(a) * r,
      -18 - (i % 3),
      Math.cos(a) * r,
      5.5,
      1.7,
      4,
    );
    yield;
  }
  if (!lowOnly) {
    for (const p of BIKINI_POOLS) {
      const lagoon = yield* lagoonSteps({
        ...p,
        color: 0x42cfdf,
        fishCount: 10,
      });
      detail.add(lagoon);
      lagoons.set(p.id, lagoon);
      animations.push(lagoon);
    }
    for (let i = 0; i < 52; i++) {
      const a = (i / 52) * Math.PI * 2,
        r = BIKINI_RADIUS - 0.4,
        x = Math.sin(a) * r,
        z = Math.cos(a) * r;
      const rock = part(
        props,
        "stone",
        [0xa49ba6, 0xa69d91, 0x939aa6][i % 3],
        x,
        -4.5 - (i % 3) * 0.6,
        z,
        1.8,
        9 + (i % 3),
        1.8,
      );
      rock.geometry = basalt;
      rock.rotation.y = a * 1.7;
      for (let j = 0; j < 3; j++)
        part(
          props,
          "sphere",
          0x8eae75,
          x,
          -j * 0.9 - 0.15,
          z,
          1 - j * 0.2,
          0.5,
          0.7,
        );
      if (i % 3 === 0) seaGarden(props, x * 0.96, z * 0.96, i);
      yield;
    }
    for (const a of [-2.4, -1.3, -0.25, 0.65, 1.7]) {
      const x = Math.sin(a) * (BIKINI_RADIUS - 0.4),
        z = Math.cos(a) * (BIKINI_RADIUS - 0.4);
      const fall = yield* waterfallSteps(x, z, 3.2, 16, { color: 0xb2ebf3 });
      fall.rotation.y = a;
      detail.add(fall);
      animations.push(fall);
    }
    for (let i = 0; i < 18; i++) {
      const a = i * 2.399,
        r = BIKINI_RADIUS - 3,
        patch = new THREE.Group();
      for (let j = 0; j < 5; j++) {
        const b = (j * Math.PI * 2) / 5;
        const petal = part(
          patch,
          "petal",
          [0xe9a9c8, 0xf0ca79, 0xbbaddb][i % 3],
          Math.sin(b) * 0.4,
          Math.cos(b) * 0.4,
          0,
          0.17,
          0.48,
          0.08,
        );
        petal.rotation.z = -b;
      }
      part(patch, "sphere", 0xf7e9c3, 0, 0, 0.05, 0.18, 0.18, 0.06);
      patch.position.set(Math.sin(a) * r, -1.7, Math.cos(a) * r);
      patch.rotation.y = a;
      props.add(patch);
      yield;
    }
    const roads = [
      [
        [0, 27],
        [-7, 13],
      ],
      [
        [-7, 13],
        [-17, -6],
      ],
      [
        [-7, 13],
        [7, 8],
      ],
      [
        [7, 8],
        [13, 1],
      ],
      [
        [-17, -6],
        [-5, -16],
      ],
      [
        [-7, 13],
        [-20, 13],
      ],
      [
        [7, 8],
        [8, 22],
      ],
    ];
    for (const [a, b] of roads) {
      const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.2);
      for (let i = 0; i <= n; i++) {
        const t = i / n,
          x = a[0] + (b[0] - a[0]) * t,
          z = a[1] + (b[1] - a[1]) * t;
        part(props, "stone", 0xf4e4be, x, 0.16, z, 0.9, 0.04, 0.65);
        yield;
      }
    }
    const reserved = bikiniReservations();
    for (let i = 0; i < 170; i++) {
      const a = i * 2.399,
        r = Math.sqrt((i + 0.5) / 170) * (BIKINI_RADIUS - 2),
        x = Math.sin(a) * r,
        z = Math.cos(a) * r;
      if (
        reserved.some(
          (o) =>
            Math.abs(x - o.x) < o.w / 2 + 0.8 &&
            Math.abs(z - o.z) < o.d / 2 + 0.8,
        )
      )
        continue;
      const patch = new THREE.Group();
      seaGarden(patch, 0, 0, i);
      patch.position.set(x, 0, z);
      if (
        [
          [-17, -5],
          [-12, 16],
          [5, 12],
          [13, 2],
          [-7, 7],
          [8, 17],
          [-19, 13],
        ].some(([a, b]) => Math.hypot(x - a, z - b) < 6.5)
      )
        patch.scale.y = 0.22;
      props.add(patch);
      yield;
    }
    for (const [x, z] of [
      [-14, -5],
      [-11, 16],
      [4, 24],
      [7, 5],
      [21, 1],
      [-24, 14],
    ])
      lantern(props, x, 0.16, z, 0.7);
    for (const x of [-3.5, 3.5])
      line(props, [x, 0.16, 27], [x, 3.9, 27], 0xaf906b, 0.16);
    part(props, "cube", 0xb4c9c8, 0, 3.7, 27, 7.6, 0.9, 0.3);
    const label = courtLabel("BIKINI BOTTOM", 6.9, 0.7);
    label.position.set(0, 3.7, 27.2);
    detail.add(label);
  }
  if (preview && !lowOnly) {
    const venue = courtVenue(BIKINI_RESTAURANT, { staff: false });
    venue.position.set(BIKINI_RESTAURANT.x, 0.16, BIKINI_RESTAURANT.z);
    detail.add(venue);
    for (const f of BIKINI_FRIENDS) {
      const model = createBikiniCharacter(f.kind);
      model.position.set(f.x, 0.16, f.z);
      detail.add(model);
    }
  }
  const baked = yield* bake(detail, props);
  root.userData.stats.staticMeshes = baked.children.length;
  root.userData.stats.sourceMeshes = baked.userData.sourceMeshes;
  root.userData.scenerySteps = function* (records = []) {
    const visible = records.filter((r) => !r.stored && r.biome === "bikini");
    for (const [id, g] of sceneryObjects)
      if (!visible.some((r) => r.id === id)) {
        g.removeFromParent();
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
  root.userData.placementSteps = function* (_items, records = []) {
    yield* root.userData.scenerySteps(records);
  };
  root.userData.updatePlacements = (...args) =>
    runSceneSteps(root.userData.placementSteps(...args));
  yield* root.userData.scenerySteps(scenery);
  root.userData.update = (time, reduced = false) => {
    if (!detail.visible) return;
    for (const g of animations) g.userData.update?.(time, reduced);
  };
  detail.visible = !lowOnly;
  low.visible = lowOnly;
  root.userData.dispose = () => disposeScenery(root);
  return root;
}
