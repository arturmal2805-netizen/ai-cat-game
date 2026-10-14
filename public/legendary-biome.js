import * as THREE from "three";
import { BIOME_STYLES } from "./biome-styles.js";
import {
  shape,
  line,
  flowerCluster,
  lantern,
  batchScenery,
  surfaceTexture,
  teaPavilion,
} from "./fantasy-scenery.js";
import { royalCastle, legendaryAttraction } from "./legendary-assets.js";
import { PARK_RIDES } from "./world-objects.js";
import { createLagoon, createWaterfall } from "./lagoon.js";
import {
  createSceneryModel,
  positionScenery,
  disposeScenery,
} from "./scenery-models.js";
import { sceneryFootprint, byScenery } from "./scenery-data.js";
import { createGroundCover } from "./landscape-detail.js";
export function createLegendaryBiome(
  biome,
  { preview = false, lowOnly = false, placements = [], scenery = [] } = {},
) {
  const root = new THREE.Group(),
    base = new THREE.Group(),
    detail = new THREE.Group(),
    low = new THREE.Group(),
    props = new THREE.Group(),
    style = BIOME_STYLES.aquapark,
    animations = [],
    sceneryObjects = new Map();
  root.add(base, detail, low);
  root.userData.navigationSurface = base;
  root.name = "Biome-aquapark";
  const outline = new THREE.Shape();
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2,
      r = 19 + Math.sin(a * 5) * 0.36;
    i
      ? outline.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      : outline.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const hole = new THREE.Path();
  hole.absellipse(-6, -5, 8, 5, 0, Math.PI * 2, true);
  outline.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(outline, {
    depth: 0.3,
    bevelEnabled: true,
    bevelSize: 0.12,
    bevelThickness: 0.08,
    bevelSegments: 2,
    curveSegments: 36,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -0.16, 0);
  const ground = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: 0xa7c987,
      roughness: 0.85,
      map: surfaceTexture("ground"),
    }),
  );
  ground.receiveShadow = true;
  base.add(ground);
  const cliff = new THREE.Mesh(
    new THREE.CylinderGeometry(18.8, 14, 4.8, 48, 3, true),
    new THREE.MeshStandardMaterial({
      color: 0x807b9d,
      map: surfaceTexture("stone"),
      roughness: 0.88,
    }),
  );
  cliff.position.y = -2.4;
  base.add(cliff);
  for (let i = 0; i < 32; i++) {
    const a = i * 2.4,
      r = 16 + (i % 4) * 0.8;
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
  for (let i = 0; i < 3; i++)
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
  const castle = royalCastle(props, -3, -8, 0.88);
  castle.position.y = 2.8;
  if (!lowOnly) {
    const lagoon = createLagoon({
      x: -6,
      z: 5,
      rx: 8,
      rz: 5,
      fishCount: preview ? 24 : 52,
      color: 0x08bad9,
      seed: 915,
    });
    detail.add(lagoon);
    animations.push(lagoon);
    const upper = createLagoon({
      x: -3,
      z: -4.4,
      rx: 3.7,
      rz: 1.25,
      fishCount: 12,
      color: 0x40c5d8,
      seed: 916,
    });
    upper.position.y = 3.3;
    detail.add(upper);
    animations.push(upper);
    root.userData.lagoons = new Map([
      ["lake-aquapark", lagoon],
      ["lake-aquapark-upper", upper],
    ]);
    for (let i = 0; i < 7; i++) {
      const fall = createWaterfall(-6 + i * 0.9, -3.65, 0.7, 3);
      fall.position.y += 3.1;
      detail.add(fall);
      animations.push(fall);
    }
    for (let i = 0; i < 6; i++) {
      const a = i * 0.65 + 0.45,
        fall = createWaterfall(
          Math.sin(a) * 18.4,
          Math.cos(a) * 18.4,
          1.1 + i * 0.12,
          5.3 + (i % 3),
        );
      fall.rotation.y = a;
      detail.add(fall);
      animations.push(fall);
    }
    const bridge = new THREE.Group();
    for (let i = 0; i < 18; i++)
      shape(bridge, "cube", 0xe9c795, -13 + i * 0.87, 0.36, 5, 0.8, 0.14, 1.1);
    for (const z of [4.4, 5.6])
      line(bridge, [-13, 0.9, z], [1.8, 0.9, z], 0xbb986b, 0.06);
    props.add(bridge);
    for (let i = 0; i < 34; i++) {
      const a = i * 2.4,
        r = 5 + (i % 9);
      let x = Math.sin(a) * r,
        z = Math.cos(a) * r;
      if (((x + 6) / 9) ** 2 + ((z - 5) / 6) ** 2 < 1) continue;
      flowerCluster(
        props,
        x,
        z,
        [0xffb0d0, 0xffda7b, 0xa2dcee][i % 3],
        0.5 + (i % 3) * 0.12,
      );
      if (i % 4 === 0) lantern(props, x, 0, z, 0.5);
    }
    for (const [x, z] of [
      [-14, 10],
      [-4, 14],
      [13, -3],
    ])
      teaPavilion(props, x, 0, z, 0x76cdbb, 0.8);
    for (let i = 0; i < 30; i++) {
      const a = i * 0.209,
        x = -6 + Math.sin(a) * 8.3,
        z = 5 + Math.cos(a) * 5.3;
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
    if (preview)
      for (const r of PARK_RIDES) {
        const m = legendaryAttraction(r.type);
        m.position.set(r.x, 0.16, r.z);
        detail.add(m);
        animations.push(m);
      }
  }
  const batch = batchScenery(props);
  detail.add(batch);
  const silhouette = new THREE.Group();
  shape(silhouette, "cone", 0xffd17c, -3, 4, -8, 5, 7, 4);
  shape(silhouette, "sphere", 0x39cadd, -6, 0.14, 5, 8, 0.035, 5);
  low.add(batchScenery(silhouette));
  root.userData.updateScenery = (records = []) => {
    for (const [id, g] of sceneryObjects)
      if (
        !records.some((r) => r.id === id && !r.stored && r.biome === "aquapark")
      ) {
        detail.remove(g);
        disposeScenery(g);
        sceneryObjects.delete(id);
      }
    if (!lowOnly)
      for (const r of records.filter(
        (r) => !r.stored && r.biome === "aquapark",
      )) {
        let g = sceneryObjects.get(r.id);
        if (!g) {
          g = createSceneryModel(r);
          detail.add(g);
          sceneryObjects.set(r.id, g);
        }
        positionScenery(g, r);
      }
    root.userData.trees = records.filter(
      (r) => !r.stored && byScenery(r.type).category === "tree",
    );
  };
  let cover = null,
    key = "";
  root.userData.updatePlacements = (items = [], records = []) => {
    root.userData.updateScenery(records);
    const nextKey = JSON.stringify([items, records]);
    if (nextKey === key || lowOnly) return;
    key = nextKey;
    if (cover) {
      detail.remove(cover);
      cover.traverse((o) => {
        if (o.isMesh && !o.geometry.userData.sharedScenery)
          o.geometry.dispose();
      });
    }
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
    detail.add(cover);
    root.userData.groundCover = cover;
  };
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
  root.userData.updatePlacements(placements, scenery);
  root.userData.update = (time, reduced) => {
    if (detail.visible) {
      for (const a of animations) a.userData.update?.(time, reduced);
      cover?.userData.update?.(time, reduced);
    }
  };
  detail.visible = !lowOnly;
  low.visible = lowOnly;
  root.userData.dispose = () => {
    root.traverse((o) => {
      if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
    });
  };
  return root;
}
