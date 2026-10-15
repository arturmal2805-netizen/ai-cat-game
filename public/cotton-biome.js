import * as THREE from "three";
import {
  shape,
  line,
  flowerCluster,
  lantern,
  surfaceTexture,
} from "./fantasy-scenery.js";
import { batchModelGeometry } from "./model-batching.js";
import { createLagoon, createWaterfall, waterMaterial } from "./lagoon.js";
import {
  createSceneryModel,
  positionScenery,
  disposeScenery,
} from "./scenery-models.js";
import { byScenery, sceneryFootprint } from "./scenery-data.js";
import { placementClearance } from "./landscape-detail.js";
import { BIOME_STYLES } from "./biome-styles.js";
import {
  COTTON_OBJECTS,
  COTTON_POOLS,
  cottonHeight,
  cottonReservations,
} from "./cotton-data.js";
import { cottonRide } from "./cotton-rides.js";
import {
  SWEETS,
  createPig,
  cupcake,
  cottonTree,
  lollipop,
  candyBridge,
  heart,
} from "./cotton-props.js";
const TAU = Math.PI * 2;
// Clip the terrace edges to the island circle; the old central building yard
// remains flat, clear and large enough for every previously valid purchase.
function diskPolygon(radius, cuts = []) {
  let pts = Array.from({ length: 96 }, (_, i) => {
    const a = (i * TAU) / 96;
    return [Math.cos(a) * radius, Math.sin(a) * radius];
  });
  for (const [axis, limit, sign] of cuts) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i],
        b = pts[(i + 1) % pts.length],
        ina = sign * (a[axis] - limit) >= 0,
        inb = sign * (b[axis] - limit) >= 0;
      if (ina) out.push(a);
      if (ina !== inb) {
        const t = (limit - a[axis]) / (b[axis] - a[axis]);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    pts = out;
  }
  return pts;
}
function slab(parent, radius, height, y, color, cuts = [], pools = []) {
  const pts = diskPolygon(radius, cuts),
    s = new THREE.Shape();
  pts.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
  s.closePath();
  for (const p of pools) {
    const hole = new THREE.Path();
    hole.absellipse(p.x, -p.z, p.rx, p.rz, 0, TAU, true);
    s.holes.push(hole);
  }
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.08,
    bevelSegments: 2,
    curveSegments: 36,
  });
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.68,
      map: surfaceTexture("ground"),
    }),
  );
  m.position.y = y;
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function addBaked(parent, source) {
  const b = batchModelGeometry(source, { combineColors: true });
  parent.add(b);
  source.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  return b;
}
function decorationsClear(items, records) {
  return placementClearance([
    ...items,
    ...records
      .filter((r) => !r.stored)
      .map((r) => ({ ...r, footprint: sceneryFootprint(r) })),
    ...cottonReservations().map((r) => ({ ...r, footprint: [r.w, r.d] })),
  ]);
}
export function createCottonBiome(
  biome,
  { preview = false, lowOnly = false, placements = [], scenery = [] } = {},
) {
  const root = new THREE.Group(),
    base = new THREE.Group(),
    detail = new THREE.Group(),
    low = new THREE.Group(),
    props = new THREE.Group(),
    animations = [],
    sceneryObjects = new Map(),
    lagoons = new Map();
  root.name = "Biome-clockwork-cotton";
  root.add(base, detail, low);
  slab(
    base,
    23,
    0.28,
    -0.14,
    0xffdfce,
    [],
    COTTON_POOLS.filter((p) => p.y === 0),
  );
  const cliff = new THREE.Mesh(
    new THREE.CylinderGeometry(22.9, 17, 5.5, 64, 4, true),
    new THREE.MeshStandardMaterial({
      color: 0xce8a93,
      roughness: 0.8,
      map: surfaceTexture("stone"),
    }),
  );
  cliff.position.y = -2.65;
  base.add(cliff);
  const underside = new THREE.Mesh(
    new THREE.CylinderGeometry(17, 2.5, 6, 48, 3),
    new THREE.MeshStandardMaterial({
      color: 0xc27b99,
      roughness: 0.83,
      map: surfaceTexture("stone"),
    }),
  );
  underside.position.y = -7.8;
  base.add(underside);
  for (let i = 0; i < 48; i++) {
    const a = (i * TAU) / 48;
    shape(
      props,
      "stone",
      i % 2 ? 0xd898aa : 0xe2acaa,
      Math.sin(a) * 20,
      -2.65,
      Math.cos(a) * 20,
      1.5,
      2.8 + (i % 3) * 0.3,
      1.35,
    );
  }
  // Piped icing and warm railings on the visible terrace faces.
  for (let i = 0; i < 46; i++) {
    const x = -19.7 + i * 0.85;
    shape(
      props,
      "sphere",
      i % 3 ? 0xffb6d7 : 0xffd2e8,
      x,
      2.5,
      -11,
      0.57,
      0.23,
      0.45,
    );
    if (i % 3 === 0) {
      shape(props, "sphere", 0xffb2d1, x, 2, -10.96, 0.15, 0.55, 0.16);
      lantern(props, x, 2.5, -11.35, 0.42);
    }
  }

  for (let level = 0; level < 3; level++) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(
        22.7 - level * 0.8,
        22.6 - level * 0.8,
        0.18,
        64,
        1,
        true,
      ),
      new THREE.MeshStandardMaterial({
        color: level % 2 ? 0xffc1d7 : 0xe5b389,
        roughness: 0.7,
      }),
    );
    m.position.y = -0.5 - level * 1.15;
    base.add(m);
  }
  slab(base, 22.9, 2.4, 0.14, 0xf6c4c6, [[1, -11, -1]], [COTTON_POOLS[1]]);
  slab(
    base,
    22.9,
    1.2,
    0.14,
    0xffcfcd,
    [
      [0, -11, -1],
      [1, 3, -1],
      [1, -11, 1],
    ],
    [COTTON_POOLS[2]],
  );
  // An icing skirt, glossy drips and floating sugar crystals, all volumetric.
  for (let i = 0; i < 96; i++) {
    const a = (i * TAU) / 96,
      r = 22.7,
      y = cottonHeight(Math.sin(a) * r, Math.cos(a) * r);
    shape(
      props,
      "sphere",
      i % 3 ? 0xffa8cf : 0xffc3e0,
      Math.sin(a) * r,
      y - 0.15,
      Math.cos(a) * r,
      0.9,
      0.35,
      0.9,
    );
    if (i % 2 === 0)
      shape(
        props,
        "sphere",
        SWEETS[i % 5],
        Math.sin(a) * (r + 0.1),
        y - 0.7 - (i % 3) * 0.3,
        Math.cos(a) * (r + 0.1),
        0.26,
        0.8 + (i % 4) * 0.15,
        0.28,
      );
    if (i % 4 === 0) {
      const c = shape(
        props,
        "crystal",
        SWEETS[i % 5],
        Math.sin(a) * (r + 1),
        -3.7 - (i % 3) * 0.45,
        Math.cos(a) * (r + 1),
        0.42,
        1.1,
        0.42,
        true,
      );
      c.rotation.z = Math.sin(a) * 0.25;
    }
  }
  const lowProps = new THREE.Group();
  const tree = cottonTree(lowProps, 0xffa6d1, 1.4);
  tree.position.set(-6, 0, -3);
  const house = cupcake(lowProps, 0xff9eca, 1.6, true);
  house.position.set(-9, 0, 7);
  shape(lowProps, "sphere", 0xf6a3ce, -0.5, 0.16, 15, 4.8, 0.03, 2.8);
  addBaked(low, lowProps);
  root.userData = {
    navigationSurface: base,
    detail,
    lowDetail: low,
    lowOnly,
    biomeId: "clockwork",
    style: BIOME_STYLES.clockwork,
    sceneryObjects,
    lagoons,
    stats: { fishCount: 0 },
    cotton: {
      legendary: true,
      rides: COTTON_OBJECTS,
      pools: COTTON_POOLS,
      waterfalls: [],
      piglets: [],
    },
  };
  if (!lowOnly) {
    for (const [i, p] of COTTON_POOLS.entries()) {
      const lagoon = createLagoon({
        ...p,
        fishCount: preview ? 12 : 22,
        color: 0xed83ba,
        bedColor: 0xe9a0c0,
        wallColor: 0xf5bad3,
        shoreColor: 0xffd2e9,
        seed: 771 + i,
      });
      lagoon.position.y = p.y;
      detail.add(lagoon);
      lagoons.set(p.id, lagoon);
      animations.push(lagoon);
      root.userData.stats.fishCount += preview ? 12 : 22;
      for (let j = 0; j < 24; j++) {
        const a = (j * TAU) / 24;
        shape(
          props,
          "stone",
          SWEETS[j % 5],
          p.x + Math.sin(a) * (p.rx + 0.18),
          p.y + 0.18,
          p.z + Math.cos(a) * (p.rz + 0.18),
          0.23,
          0.17,
          0.23,
        );
      }
    }
    const falls = [
      [-5, -11.8, 2.2, 2.5, 2.4, 0],
      [-11.1, -1, 1.7, 1.3, 1.2, -Math.PI / 2],
      [-16, 2.1, 2, 1.3, 1.2, 0],
      [-1, 20, 3.6, 6.1, 0, 0],
      [13, 18.1, 1.9, 6.3, 0, 0.65],
      [-19, 12.3, 1.6, 6.1, 0, -0.9],
      [-21, -7, 1.6, 7.6, 1.2, -1.8],
      [8, -21.3, 1.9, 8, 2.4, 3],
    ];
    for (const [index, [x, z, w, h, y, rot]] of falls.entries()) {
      const scale = index >= 3 ? 23.18 / Math.hypot(x, z) : 1,
        fx = x * scale,
        fz = z * scale;
      if (index >= 3) {
        const length = Math.hypot(fx - x, fz - z) + 0.3,
          material = waterMaterial(0xf49cc8, 0.78),
          stream = new THREE.Mesh(
            new THREE.PlaneGeometry(w, length, 8, 16),
            material,
          );
        stream.rotation.set(-Math.PI / 2, 0, -Math.atan2(fx - x, fz - z));
        stream.position.set((x + fx) / 2, y + 0.16, (z + fz) / 2);
        detail.add(stream);
        animations.push({
          userData: {
            update: (t, reduced) =>
              (material.uniforms.uTime.value = reduced ? 0 : t),
          },
        });
      }
      const f = createWaterfall(fx, fz, w, h, {
        color: 0xf69bc7,
        foam: 0xffedf7,
      });
      f.position.y += y;
      f.rotation.y = rot;
      detail.add(f);
      animations.push(f);
      root.userData.cotton.waterfalls.push(f);
    }
    candyBridge(props, -0.5, 0.24, 16, 17);
    candyBridge(props, -5, 2.62, -14, 8.8);
    candyBridge(props, -16, 1.4, 0, 6.6, Math.PI / 2);
    // Tiered paths and fences, with warm lamps rather than a bare flat disc.
    for (let i = 0; i < 17; i++)
      shape(
        props,
        "cube",
        i % 2 ? 0xffdfb2 : 0xffc1d5,
        -10.3,
        i * 0.15,
        -8.5 - i * 0.2,
        1.8,
        0.17,
        0.27,
      );
    for (const side of [-1, 1])
      line(
        props,
        [-10.3 + side * 0.85, 0.65, -8.5],
        [-10.3 + side * 0.85, 3.05, -11.7],
        0xe5b482,
        0.07,
      );
    for (let i = 0; i < 9; i++)
      shape(
        props,
        "cube",
        i % 2 ? 0xffdfb2 : 0xffc1d5,
        -9.6 - i * 0.23,
        i * 0.15,
        2.4,
        0.28,
        0.17,
        1.7,
      );
    for (let i = 0; i < 68; i++) {
      const a = (i * TAU) / 68,
        x = Math.sin(a) * 20.8,
        z = Math.cos(a) * 20.8,
        y = cottonHeight(x, z);
      if (i % 5 === 0) lantern(props, x, y, z, 0.66);
      else {
        line(props, [x, y + 0.15, z], [x, y + 0.78, z], 0xd39b83, 0.065);
        heart(props, x, y + 0.76, z, 0xffa2c4, 0.15);
      }
      const b = a + TAU / 68,
        x2 = Math.sin(b) * 20.8,
        z2 = Math.cos(b) * 20.8;
      if (Math.abs(cottonHeight(x2, z2) - y) < 0.1)
        line(props, [x, y + 0.55, z], [x2, y + 0.55, z2], 0xe8bba0, 0.045);
    }
    for (const [x, z, c] of [
      [-10, 2, 0xf7aacd],
      [9, -8, 0xa7cce9],
      [-11, -12, 0xffcc96],
      [13, 5, 0xffb1d6],
      [4, 11, 0xc7b6eb],
    ])
      lollipop(props, x, cottonHeight(x, z), z, c, 0.9);
    const mother = createPig({ color: 0xffb7d0 });
    mother.scale.setScalar(1.4);
    mother.position.set(0, 0, -5);
    detail.add(mother);
    animations.push(mother);
    root.userData.cotton.mother = mother;
    heart(props, 0, 3.3, -5, 0xffa2c9, 0.4);
    // Piglets are instanced by material: the crowd needs a handful of draws,
    // while each piglet still has an independent looping walk and bounce.
    const baby = createPig(),
      template = batchModelGeometry(baby),
      dummy = new THREE.Object3D(),
      piglets = [];
    for (let i = 0; i < 24; i++) {
      const a = i * 2.399,
        r = 4 + (i % 5) * 2.9,
        x = Math.sin(a) * r,
        z = Math.cos(a) * r;
      if (
        COTTON_POOLS.some(
          (p) =>
            ((x - p.x) / (p.rx + 1)) ** 2 + ((z - p.z) / (p.rz + 1)) ** 2 < 1,
        )
      )
        continue;
      if (COTTON_OBJECTS.some((o) => Math.hypot(x - o.x, z - o.z) < 3.5))
        continue;
      piglets.push({ x, z, phase: i, scale: 0.3 + (i % 3) * 0.06 });
    }
    const instances = template.children.map((m) => {
      const inst = new THREE.InstancedMesh(
        m.geometry,
        m.material,
        piglets.length,
      );
      inst.castShadow = true;
      inst.frustumCulled = false;
      detail.add(inst);
      return inst;
    });
    const crowd = new THREE.Group();
    crowd.userData.update = (time, reduced) => {
      piglets.forEach((p, i) => {
        const t = reduced ? 0 : time * 0.3 + p.phase,
          x = p.x + Math.sin(t) * 0.55,
          z = p.z + Math.cos(t) * 0.5;
        dummy.position.set(
          x,
          cottonHeight(x, z) +
            (reduced ? 0 : Math.abs(Math.sin(time * 4 + p.phase)) * 0.07),
          z,
        );
        dummy.rotation.set(
          0,
          t + Math.PI / 2,
          reduced ? 0 : Math.sin(time * 4 + p.phase) * 0.035,
        );
        dummy.scale.setScalar(p.scale);
        dummy.updateMatrix();
        instances.forEach((m) => m.setMatrixAt(i, dummy.matrix));
      });
      instances.forEach((m) => (m.instanceMatrix.needsUpdate = true));
    };
    crowd.userData.update(0, true);
    animations.push(crowd);
    root.userData.cotton.piglets = piglets;
    baby.traverse((o) => {
      if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
    });
    if (preview)
      for (const o of COTTON_OBJECTS) {
        const ride = cottonRide(o.type);
        ride.position.set(o.x, 0.16 + cottonHeight(o.x, o.z), o.z);
        detail.add(ride);
        animations.push(ride);
      }
  }
  const decoration = addBaked(detail, props);
  root.userData.stats.staticMeshes = decoration.children.length;
  root.userData.stats.sourceMeshes = decoration.userData.sourceMeshes;
  let gardens = null,
    gardenKey = "";
  root.userData.updateScenery = (records = []) => {
    const visible = records.filter((r) => !r.stored && r.biome === "clockwork");
    for (const [id, g] of sceneryObjects)
      if (!visible.some((r) => r.id === id)) {
        detail.remove(g);
        disposeScenery(g);
        sceneryObjects.delete(id);
      }
    if (!lowOnly)
      for (const r of visible) {
        let g = sceneryObjects.get(r.id);
        if (!g) {
          g = createSceneryModel(r);
          detail.add(g);
          sceneryObjects.set(r.id, g);
        }
        positionScenery(g, r);
        g.position.y += cottonHeight(r.x, r.z);
      }
    root.userData.trees = visible.filter(
      (r) => byScenery(r.type)?.category === "tree",
    );
  };
  root.userData.updatePlacements = (items = [], records = []) => {
    root.userData.updateScenery(records);
    const key = JSON.stringify([items, records]);
    if (lowOnly || key === gardenKey) return;
    gardenKey = key;
    if (gardens) {
      detail.remove(gardens);
      gardens.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          if (!o.material.userData.sharedScenery) o.material.dispose();
        }
      });
    }
    const flowers = new THREE.Group(),
      clear = decorationsClear(items, records);
    const mother = root.userData.cotton.mother;
    if (mother) {
      const spare = [
        [0, -5],
        [-2, -8],
        [7, -5],
        [-3, 3],
        [9, 5],
        [0, 0],
        [1, 4],
        [-3, -2],
        [4, 4],
        ...Array.from({ length: 81 }, (_, i) => [
          (i % 9) * 2 - 8,
          Math.floor(i / 9) * 2 - 8,
        ]).filter(([x, z]) => Math.hypot(x, z) < 9),
      ].find(([x, z]) => clear(x, z, 2.4));
      if (spare) {
        mother.visible = true;
        mother.position.set(spare[0], cottonHeight(...spare), spare[1]);
      } else mother.visible = false;
    }
    // Paths and little gardens fill spare ground; clearing a building yard
    // removes only these decorative plants, never the saved building.
    for (let route = 0; route < 5; route++)
      for (let i = 0; i < 70; i++) {
        const a = (i / 69) * Math.PI * 1.8 + route * 0.71,
          r = 3.5 + route * 3.6 + Math.sin(a * 3) * 0.6,
          x = Math.sin(a) * r,
          z = Math.cos(a) * r;
        if (Math.hypot(x, z) > 21 || !clear(x, z, 0.8)) continue;
        const tile = shape(
          flowers,
          "stone",
          i % 3 ? 0xf8c9b2 : 0xffe6b5,
          x,
          cottonHeight(x, z) + 0.12,
          z,
          0.6,
          0.06,
          0.44,
        );
        tile.rotation.y = -a;
      }
    for (let i = 0; i < 75; i++) {
      const a = i * 2.399,
        r = 3 + (i % 8) * 2.3,
        x = Math.sin(a) * r,
        z = Math.cos(a) * r;
      if (!clear(x, z, 1.1)) continue;
      const patch = new THREE.Group();
      patch.position.set(x, cottonHeight(x, z), z);
      for (let j = 0; j < 8; j++) {
        const b = j * 2.399;
        flowerCluster(
          patch,
          Math.sin(b) * 0.7,
          Math.cos(b) * 0.7,
          SWEETS[(i + j) % 5],
          0.65,
        );
      }
      shape(
        patch,
        "sphere",
        i % 2 ? 0xe9b1cf : 0xc9b5e4,
        0,
        0.22,
        0,
        0.45,
        0.23,
        0.4,
      );
      flowers.add(patch);
    }

    for (let i = 0; i < 340; i++) {
      const a = i * 2.399,
        r = Math.sqrt((i + 0.5) / 340) * 21.4,
        x = Math.sin(a) * r,
        z = Math.cos(a) * r;
      if (!clear(x, z, 0.4)) continue;
      const bed = new THREE.Group();
      bed.position.set(x, cottonHeight(x, z) + 0.13, z);
      flowerCluster(bed, 0, 0, SWEETS[i % 5], 0.38 + (i % 3) * 0.12);
      if (i % 5 === 0)
        shape(bed, "sphere", 0xffe9d4, 0.3, 0.05, 0.2, 0.13, 0.08, 0.15);
      flowers.add(bed);
    }
    gardens = addBaked(detail, flowers);
    gardens.name = "Candy flower gardens";
  };
  root.userData.updatePlacements(placements, scenery);
  root.userData.update = (time, reduced = false) => {
    if (!detail.visible) return;
    animations.forEach((g) => g.userData.update?.(time, reduced));
    for (const g of sceneryObjects.values()) g.userData.update?.(time, reduced);
  };
  detail.visible = !lowOnly;
  low.visible = lowOnly;
  root.userData.dispose = () => {
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
  };
  return root;
}
