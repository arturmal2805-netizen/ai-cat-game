import { byItem } from "./game-data.js";
import * as THREE from "three";
import { runSceneSteps } from "./scene-tasks.js";
import { shape, line, lantern, surfaceTexture } from "./fantasy-scenery.js";
import { batchModelSteps } from "./model-batching.js";
import { lagoonSteps, waterfallSteps, waterMaterial } from "./lagoon.js";
import {
  sceneryModelSteps,
  positionScenery,
  disposeScenery,
} from "./scenery-models.js";
import { byScenery, sceneryFootprint } from "./scenery-data.js";
import { createGroundCover, placementClearance } from "./landscape-detail.js";
import { BIOME_STYLES } from "./biome-styles.js";
import {
  CAPYBARA_RADIUS,
  CAPYBARA_POOLS,
  CAPYBARA_OBJECTS,
  capybaraHeight,
  capybaraReservations,
} from "./capybara-data.js";
import { createCapybara } from "./capybara-model.js";
import { capybaraRide } from "./capybara-rides.js";
import {
  junglePlant,
  jungleFlowers,
  jungleBridge,
  junglePalmSteps,
} from "./jungle-props.js";
const TAU = Math.PI * 2;
function disk(radius, cuts = []) {
  let pts = Array.from({ length: 96 }, (_, i) => [
    Math.cos((i * TAU) / 96) * radius,
    Math.sin((i * TAU) / 96) * radius,
  ]);
  for (const [axis, limit, sign] of cuts) {
    const next = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i],
        b = pts[(i + 1) % pts.length],
        inside = sign * (a[axis] - limit) >= 0,
        other = sign * (b[axis] - limit) >= 0;
      if (inside) next.push(a);
      if (inside !== other) {
        const t = (limit - a[axis]) / (b[axis] - a[axis]);
        next.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    pts = next;
  }
  return pts;
}
function terrace(parent, radius, height, y, color, cuts = [], pools = []) {
  const s = new THREE.Shape();
  disk(radius, cuts).forEach(([x, z], i) =>
    i ? s.lineTo(x, -z) : s.moveTo(x, -z),
  );
  s.closePath();
  for (const p of pools) {
    const hole = new THREE.Path();
    hole.absellipse(p.x, -p.z, p.rx, p.rz, 0, TAU, true);
    s.holes.push(hole);
  }
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: height,
    bevelEnabled: true,
    bevelSize: 0.065,
    bevelThickness: 0.045,
    bevelSegments: 2,
    curveSegments: 40,
  });
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, [
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.79,
      map: surfaceTexture("ground"),
    }),
    new THREE.MeshStandardMaterial({
      color: 0x899880,
      roughness: 0.87,
      map: surfaceTexture("stone"),
    }),
  ]);
  mesh.position.y = y;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function* bake(parent, source) {
  const g = yield* batchModelSteps(source, { combineColors: true });
  parent.add(g);
  source.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  return g;
}
function release(root) {
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
export function* capybaraBiomeSteps(
  biome,
  { preview = false, lowOnly = false, placements = [], scenery = [] } = {},
) {
  const root = new THREE.Group(),
    base = new THREE.Group(),
    detail = new THREE.Group(),
    low = new THREE.Group(),
    props = new THREE.Group(),
    lagoons = new Map(),
    sceneryObjects = new Map(),
    animations = [],
    falls = [],
    crowd = [];
  root.name = "Biome-summer-capybara-lagoon";
  root.add(base, detail, low);
  root.userData = {
    navigationSurface: base,
    detail,
    lowDetail: low,
    lowOnly,
    biomeId: "summer",
    style: BIOME_STYLES.summer,
    lagoons,
    sceneryObjects,
    stats: { fishCount: 0 },
    capybara: {
      pools: CAPYBARA_POOLS,
      rides: CAPYBARA_OBJECTS,
      waterfalls: falls,
      crowd,
    },
  };
  yield;
  terrace(
    base,
    CAPYBARA_RADIUS,
    0.28,
    -0.14,
    0x6e9f4d,
    [],
    [CAPYBARA_POOLS[0]],
  );
  yield;
  const cliff = new THREE.Mesh(
    new THREE.CylinderGeometry(
      CAPYBARA_RADIUS - 0.1,
      CAPYBARA_RADIUS - 3.8,
      5.6,
      72,
      4,
      true,
    ),
    new THREE.MeshStandardMaterial({
      color: 0x858d70,
      roughness: 0.86,
      map: surfaceTexture("stone"),
    }),
  );
  cliff.position.y = -2.65;
  cliff.castShadow = true;
  base.add(cliff);
  const underside = new THREE.Mesh(
    new THREE.CylinderGeometry(CAPYBARA_RADIUS - 3.8, 1.5, 6.4, 64, 3),
    new THREE.MeshStandardMaterial({
      color: 0x6e8063,
      roughness: 0.88,
      map: surfaceTexture("stone"),
    }),
  );
  underside.position.y = -8.55;
  base.add(underside);
  yield;
  terrace(
    base,
    CAPYBARA_RADIUS - 0.12,
    4.2,
    0.14,
    0x7db84d,
    [[1, -11.3, -1]],
    [CAPYBARA_POOLS[1]],
  );
  yield;
  terrace(
    base,
    CAPYBARA_RADIUS - 0.12,
    1.8,
    0.14,
    0x8abd58,
    [
      [0, -11.3, -1],
      [1, -11.3, 1],
      [1, 3, -1],
    ],
    [CAPYBARA_POOLS[2]],
  );
  yield;
  terrace(
    base,
    CAPYBARA_RADIUS - 0.12,
    1.2,
    0.14,
    0x8abd58,
    [
      [0, 11.3, 1],
      [1, -11.3, 1],
      [1, -0.2, -1],
    ],
    [CAPYBARA_POOLS[3]],
  );
  yield;
  const distant = new THREE.Group();
  for (const p of CAPYBARA_POOLS)
    shape(
      distant,
      "sphere",
      0x33cde5,
      p.x,
      p.y + 0.16,
      p.z,
      p.rx,
      0.025,
      p.rz,
      true,
    );
  const palm = yield* junglePalmSteps(distant, true);
  palm.position.set(-8, 4.2, -15);
  palm.scale.setScalar(1.15);
  yield* bake(low, distant);
  if (!lowOnly) {
    for (const [i, p] of CAPYBARA_POOLS.entries()) {
      yield;
      const count = preview ? 12 : i === 0 ? 30 : 18,
        lake = yield* lagoonSteps({
          ...p,
          fishCount: count,
          color: 0x06bde6,
          bedColor: 0x49c8da,
          wallColor: 0x99c0a9,
          shoreColor: 0x8cf2da,
          seed: 918 + i * 17,
        });
      lake.position.y = p.y;
      detail.add(lake);
      lagoons.set(p.id, lake);
      lake.traverse((o) => {
        if (o.material?.isShaderMaterial) o.material.forceSinglePass = true;
      });
      animations.push(lake);
      root.userData.stats.fishCount += count;
      for (let j = 0; j < 40; j++) {
        yield;
        const a = (j * TAU) / 40,
          x = p.x + Math.sin(a) * (p.rx + 0.1),
          z = p.z + Math.cos(a) * (p.rz + 0.1);
        shape(
          props,
          "stone",
          j % 3 ? 0xc0b990 : 0x96b877,
          x,
          p.y + 0.17,
          z,
          0.27 + (j % 3) * 0.11,
          0.22,
          0.28,
        );
        if (j % 4 === 0)
          jungleFlowers(
            props,
            x,
            p.y + 0.22,
            z,
            0.8,
            [0xff9d80, 0xffefc9, 0xffc45a][j % 3],
          );
        if (j % 7 === 0)
          junglePlant(props, x, p.y + 0.15, z, 0.65 + (j % 3) * 0.14, j);
      }
    }
    // Cascades have a real flowing crest, falling sheets, drifting spray and
    // foam. They share the existing water shader; no reflection render target.
    const cascades = [
      [-5.8, -11.17, 2.6, 4.2, 4.2, 0],
      [4.3, -11.17, 2.4, 4.2, 4.2, 0],
      [-14.5, 3.15, 3.1, 1.8, 1.8, 0],
      [14.4, -0.04, 2.7, 1.2, 1.2, 0],
      [0, 20.24, 5.2, 8.6, 0, 0],
      [-12.9, 15.6, 3, 7.8, 0, -0.68],
      [13.4, 15.16, 3.5, 8.3, 0, 0.72],
      [-19.7, -3.6, 2.5, 8.6, 1.8, -Math.PI / 2],
      [19.7, -3.6, 2.2, 8, 1.2, Math.PI / 2],
      [-1, -20.24, 2.8, 11.2, 4.2, Math.PI],
    ];
    for (const [i, [x, z, w, h, y, rot]] of cascades.entries()) {
      yield;
      const f = yield* waterfallSteps(x, z, w, h, {
        color: 0x5ed8fa,
        foam: 0xecfcff,
      });
      f.position.y += y;
      const sheet = f.children.find((o) => o.material?.uniforms?.uFall);
      sheet.material.uniforms.uColor.value.multiplyScalar(1.8);
      sheet.material.uniforms.uOpacity.value = 0.95;
      sheet.material.forceSinglePass = true;
      f.rotation.y = rot;
      detail.add(f);
      animations.push(f);
      falls.push(f);
      {
        const p =
            i < 2 || i === 9
              ? CAPYBARA_POOLS[1]
              : i === 2 || i === 7
                ? CAPYBARA_POOLS[2]
                : i === 3 || i === 8
                  ? CAPYBARA_POOLS[3]
                  : CAPYBARA_POOLS[0],
          dx = x - p.x,
          dz = z - p.z,
          len = Math.hypot(dx, dz),
          edge = 1 / Math.hypot(dx / p.rx, dz / p.rz),
          start = new THREE.Vector3(
            p.x + dx * edge,
            y + 0.155,
            p.z + dz * edge,
          ),
          end = new THREE.Vector3(x, y + 0.155, z),
          length = start.distanceTo(end) + 0.18,
          mat = waterMaterial(0x08c7e9, 0.85),
          stream = new THREE.Mesh(
            new THREE.PlaneGeometry(w, length, 6, 14),
            mat,
          );
        stream.rotation.set(-Math.PI / 2, 0, -Math.atan2(dx, dz));
        stream.position.copy(start.add(end).multiplyScalar(0.5));
        detail.add(stream);
        animations.push({
          userData: {
            update: (t, r) => (mat.uniforms.uTime.value = r ? 0 : t),
          },
        });
      }
    }
    jungleBridge(props, -6, 0.35, 8.6, 17.8, Math.PI / 2);
    jungleBridge(props, -1, 4.45, -14.2, 13.5);
    jungleBridge(props, -14.5, 2.06, -4.8, 6.2);
    for (let i = 0; i < 25; i++) {
      yield;
      const x = -15.5 + i * 1.3,
        z = -11.22;
      if (Math.hypot(x, z) > CAPYBARA_RADIUS - 1) continue;
      if (Math.abs(x + 5.8) < 1.8 || Math.abs(x - 4.3) < 1.7) continue;
      shape(
        props,
        "stone",
        [0x9a9a7e, 0x89977e, 0xabb18b][i % 3],
        x,
        1.95,
        z,
        0.85,
        2.1,
        0.58,
      );
      shape(props, "sphere", 0x639e43, x, 4.32, z - 0.3, 0.8, 0.18, 0.6);
      junglePlant(props, x, 4.34, z - 0.45, 0.75 + (i % 3) * 0.15, i);
      jungleFlowers(
        props,
        x,
        4.35,
        z - 0.15,
        0.85,
        i % 2 ? 0xffa87a : 0xffe8b6,
      );
      for (let j = 0; j < 6; j++)
        shape(
          props,
          "petal",
          j % 2 ? 0x7db745 : 0x4b9146,
          x + (j % 2 ? 0.18 : -0.18),
          3.9 - j * 0.38,
          z + 0.12,
          0.19,
          0.28,
          0.075,
        );
    }
    for (const side of [-1, 1])
      for (let i = 0; i < 11; i++) {
        yield;
        const z = -10.2 + i * 1.1,
          x = side * 11.18,
          h = side < 0 ? 1.8 : 1.2;
        if (side > 0 && z > -0.3) continue;
        shape(
          props,
          "stone",
          i % 2 ? 0xa8ae8c : 0x85977a,
          x,
          h * 0.48,
          z,
          0.55,
          h * 0.58,
          0.72,
        );
        shape(
          props,
          "sphere",
          0x699f41,
          x + side * 0.2,
          h + 0.22,
          z,
          0.55,
          0.15,
          0.65,
        );
        if (i % 2 === 0) {
          junglePlant(props, x + side * 0.45, h + 0.15, z, 0.8, i);
          jungleFlowers(props, x, h + 0.25, z, 0.7, 0xffb971);
        }
      }
    for (const x of [-5.8, 4.3]) {
      const pool = CAPYBARA_POOLS[0],
        end = pool.z - pool.rz * Math.sqrt(1 - (x / pool.rx) ** 2),
        start = -11.12,
        material = waterMaterial(0x32cce7, 0.85),
        ribbon = new THREE.Mesh(
          new THREE.PlaneGeometry(1.15, end - start, 4, 20),
          material,
        );
      material.forceSinglePass = true;
      ribbon.rotation.x = -Math.PI / 2;
      ribbon.position.set(x, 0.168, (start + end) / 2);
      detail.add(ribbon);
      animations.push({
        userData: {
          update: (t, r) => (material.uniforms.uTime.value = r ? 0 : t),
        },
      });
      for (let i = 0; i < 15; i++)
        for (const side of [-1, 1])
          shape(
            props,
            "stone",
            0x94a483,
            x + side * 0.68,
            0.14,
            start + ((end - start) * i) / 14,
            0.18,
            0.14,
            0.25,
          );
    }
    // Timber stairways and vines give the terraces readable edges.
    for (const [x, z, h] of [
      [-9.6, -10, 4.2],
      [-10.8, 1, 1.8],
      [10.8, -1.6, 1.2],
    ]) {
      for (let i = 0; i < 14; i++) {
        yield;
        shape(
          props,
          "cube",
          i % 2 ? 0xcfaa70 : 0xb68b59,
          x,
          (i * h) / 14,
          z - i * 0.15,
          1.7,
          0.13,
          0.22,
        );
      }
      lantern(props, x - 0.95, h, z - 2.1, 0.52);
      lantern(props, x + 0.95, h, z - 2.1, 0.52);
    }
    for (let i = 0; i < 52; i++) {
      yield;
      const a = (i * TAU) / 52,
        r = CAPYBARA_RADIUS - 0.5,
        x = Math.sin(a) * r,
        z = Math.cos(a) * r,
        y = capybaraHeight(x, z);
      shape(
        props,
        "stone",
        [0x85927b, 0xa1a17d, 0x6f826a][i % 3],
        x,
        -1.6 + y,
        z,
        0.82,
        1.9 + (i % 3) * 0.35,
        0.85,
      );
      if (i % 3 === 0) {
        const p = [];
        for (let j = 0; j < 9; j++)
          p.push(
            new THREE.Vector3(
              x * (1 + j * 0.002),
              y - j * 0.56,
              z * (1 + j * 0.002),
            ),
          );
        props.add(
          new THREE.Mesh(
            new THREE.TubeGeometry(
              new THREE.CatmullRomCurve3(p),
              16,
              0.04,
              4,
              false,
            ),
            new THREE.MeshStandardMaterial({ color: 0x4b9a51, roughness: 0.9 }),
          ),
        );
        for (let j = 0; j < 6; j++)
          shape(
            props,
            "petal",
            j % 2 ? 0x80bd43 : 0x4f9b46,
            x + (j % 2 ? 0.15 : -0.15),
            y - j * 0.7,
            z,
            0.2,
            0.16,
            0.08,
          );
      }
      if (i % 7 === 0) lantern(props, x * 0.96, y + 0.05, z * 0.96, 0.55);
    }
    for (let i = 0; i < 17; i++) {
      yield;
      const a = i * 2.399,
        r = CAPYBARA_RADIUS + 0.5;
      shape(
        props,
        "stone",
        0x8e9a7d,
        Math.sin(a) * r,
        -6.1 - (i % 3) * 0.65,
        Math.cos(a) * r,
        0.6,
        0.75,
        0.57,
      );
      junglePlant(
        props,
        Math.sin(a) * r,
        -5.5 - (i % 3) * 0.65,
        Math.cos(a) * r,
        0.35,
        i,
      );
    }
    if (preview)
      for (const o of CAPYBARA_OBJECTS) {
        yield;
        const ride = capybaraRide(o.type);
        ride.position.set(o.x, 0.16 + capybaraHeight(o.x, o.z), o.z);
        detail.add(ride);
        animations.push(ride);
      }
  }
  const decor = yield* bake(detail, props);
  root.userData.stats.staticMeshes = decor.children.length;
  root.userData.stats.sourceMeshes = decor.userData.sourceMeshes;
  let garden = null,
    cover = null,
    key = "",
    crowdMeshes = [],
    crowdRoot;
  root.userData.scenerySteps = function* (records = []) {
    const visible = records.filter((r) => !r.stored && r.biome === "summer");
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
        g.position.y += capybaraHeight(r.x, r.z);
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
    if (lowOnly || next === key) return;
    key = next;
    for (const old of [garden, cover, crowdRoot])
      if (old) {
        detail.remove(old);
        release(old);
      }
    const bounds = [
        ...items,
        ...records
          .filter((r) => !r.stored)
          .map((r) => ({ ...r, footprint: sceneryFootprint(r) })),
        ...capybaraReservations()
          .filter((r) => !r.rx)
          .map((r) => ({ ...r, footprint: [r.w, r.d] })),
      ],
      rectClear = placementClearance(bounds),
      clear = (x, z, w = 0, d = w) =>
        rectClear(x, z, w, d) &&
        !CAPYBARA_POOLS.some(
          (p) =>
            (Math.max(0, Math.abs(x - p.x) - w / 2) / (p.rx + 0.18)) ** 2 +
              (Math.max(0, Math.abs(z - p.z) - d / 2) / (p.rz + 0.18)) ** 2 <
            1,
        ),
      flowers = new THREE.Group();
    root.userData.legacyPlatforms = [];
    for (const p of [
      ...items,
      ...records
        .filter((r) => !r.stored)
        .map((r) => ({ ...r, footprint: sceneryFootprint(r) })),
    ]) {
      const lake = CAPYBARA_POOLS[0],
        rawSize = p.footprint || byItem(p.item)?.footprint || [3, 3],
        size =
          !p.footprint && p.rotation % 2 ? [rawSize[1], rawSize[0]] : rawSize;
      if (
        ((p.x - lake.x) / lake.rx) ** 2 + ((p.z - lake.z) / lake.rz) ** 2 >=
        1
      )
        continue;
      root.userData.legacyPlatforms.push(p.id);
      const deck = shape(
        flowers,
        "cube",
        0xc9aa73,
        p.x,
        0.09,
        p.z,
        size[0] + 0.14,
        0.2,
        size[1] + 0.14,
      );
      deck.name = "Saved meadow object's timber islet";
      for (const side of [-1, 1])
        shape(
          flowers,
          "pole",
          0x9b7d52,
          p.x + side * (size[0] / 2 + 0.2),
          -0.22,
          p.z,
          0.09,
          0.6,
          0.09,
        );
    }
    for (let i = 0; i < 105; i++) {
      yield;
      const a = i * 2.399,
        r = 3 + (i % 9) * 1.85,
        x = Math.sin(a) * r,
        z = Math.cos(a) * r;
      if (Math.hypot(x, z) > CAPYBARA_RADIUS - 1 || !clear(x, z, 1.1)) continue;
      const y = capybaraHeight(x, z) + 0.12;
      junglePlant(flowers, x, y, z, 0.75 + (i % 4) * 0.2, i);
      jungleFlowers(
        flowers,
        x + 0.6,
        y,
        z,
        0.9,
        [0xff8f7a, 0xffe9bc, 0xffbc50][i % 3],
      );
      if (i % 4 === 0)
        shape(
          flowers,
          "stone",
          0xc5c098,
          x - 0.5,
          y + 0.12,
          z,
          0.4,
          0.18,
          0.35,
        );
    }
    for (let route = 0; route < 3; route++)
      for (let i = 0; i < 55; i++) {
        yield;
        const a = (i / 54) * Math.PI * 1.6 + route * 1.4,
          r = 4 + route * 3.2,
          x = Math.sin(a) * r,
          z = Math.cos(a) * r;
        if (!clear(x, z, 0.75)) continue;
        const stone = shape(
          flowers,
          "stone",
          i % 3 ? 0xddc99a : 0xc0c997,
          x,
          capybaraHeight(x, z) + 0.13,
          z,
          0.45,
          0.045,
          0.36,
        );
        stone.rotation.y = a;
      }
    garden = yield* bake(detail, flowers);
    yield;
    cover = createGroundCover(BIOME_STYLES.summer, "summer", {
      placements: bounds,
      preview,
      seed: 918,
      radius: CAPYBARA_RADIUS - 1,
      density: 3,
      heightAt: capybaraHeight,
      clearance: clear,
    });
    detail.add(cover);
    root.userData.groundCover = cover;
    // One shared set of instanced meshes for the whole family. No per-animal
    // materials, textures or shadow render targets are allocated every frame.
    crowd.length = 0;
    for (const [i, p] of CAPYBARA_POOLS.entries())
      for (let j = 0; j < (i === 0 ? 6 : 3); j++) {
        const a = j * 2.399 + i * 0.7;
        crowd.push({
          pool: p,
          phase: a,
          x: p.x + Math.sin(a) * p.rx * 0.58,
          z: p.z + Math.cos(a) * p.rz * 0.4,
          scale: j === 0 ? 0.68 : 0.37 + (j % 3) * 0.12,
        });
      }
    for (const [i, [x, z]] of [
      [-5, 3],
      [-7, -4],
      [-1, 7],
      [3, -5],
      [-9, 8],
      [11, 8],
    ].entries())
      if (clear(x, z, 1.9))
        crowd.push({
          x,
          z,
          scale: i === 0 ? 0.95 : 0.55 + (i % 3) * 0.1,
          phase: i * 0.8,
        });
    yield;
    const animal = createCapybara({ color: 0xc59359, detail: "crowd" }),
      template = yield* batchModelSteps(animal, { combineColors: true });
    crowdRoot = new THREE.Group();
    crowdRoot.name = "Instanced capybara family";
    detail.add(crowdRoot);
    crowdMeshes = template.children.map((m) => {
      const inst = new THREE.InstancedMesh(
        m.geometry,
        m.material,
        crowd.length,
      );
      inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      inst.frustumCulled = false;
      inst.castShadow = true;
      crowdRoot.add(inst);
      return inst;
    });
    animal.traverse((o) => {
      if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
    });
    const dummy = new THREE.Object3D(),
      wakeTimes = new Map();
    crowdRoot.userData.update = (time, reduced = false) => {
      crowd.forEach((c, i) => {
        const t = reduced ? c.phase : time * 0.19 + c.phase,
          x = c.pool
            ? c.pool.x + Math.sin(t) * c.pool.rx * 0.57
            : c.x + Math.sin(t) * 0.38,
          z = c.pool
            ? c.pool.z + Math.cos(t) * c.pool.rz * 0.4
            : c.z + Math.cos(t) * 0.34;
        dummy.position.set(
          x,
          c.pool
            ? c.pool.y +
                0.155 -
                c.scale * 0.9 +
                (reduced ? 0 : Math.sin(time * 1.8 + c.phase) * 0.025)
            : capybaraHeight(x, z) +
                (reduced ? 0 : Math.abs(Math.sin(time * 4 + c.phase)) * 0.035),
          z,
        );
        dummy.rotation.set(
          0,
          t + Math.PI / 2,
          reduced ? 0 : Math.sin(time * (c.pool ? 1.4 : 4) + c.phase) * 0.025,
        );
        dummy.scale.setScalar(c.scale);
        dummy.updateMatrix();
        for (const inst of crowdMeshes) inst.setMatrixAt(i, dummy.matrix);
        if (
          !reduced &&
          c.pool &&
          time - (wakeTimes.get(c.pool.id) ?? -2) > 0.8
        ) {
          lagoons
            .get(c.pool.id)
            ?.userData.disturb(x - c.pool.x, z - c.pool.z, time, 0.18);
          wakeTimes.set(c.pool.id, time);
        }
      });
      crowdMeshes.forEach((m) => (m.instanceMatrix.needsUpdate = true));
    };
    crowdRoot.userData.update(0, true);
  };
  root.userData.updatePlacements = (...args) =>
    runSceneSteps(root.userData.placementSteps(...args));
  yield* root.userData.placementSteps(placements, scenery);
  root.userData.update = (time, reduced = false) => {
    if (!detail.visible) return;
    animations.forEach((g) => g.userData.update?.(time, reduced));
    cover?.userData.update(time, reduced);
    crowdRoot?.userData.update(time, reduced);
    for (const g of sceneryObjects.values()) g.userData.update?.(time, reduced);
  };
  detail.visible = !lowOnly;
  low.visible = lowOnly;
  root.userData.dispose = () => release(root);
  return root;
}
