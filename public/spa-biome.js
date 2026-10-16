import * as THREE from "three";
import {
  SPA_RADIUS,
  SPA_POOL,
  SPA_JACUZZI,
  spaReservations,
} from "./spa-data.js";
import { BIOME_STYLES } from "./biome-styles.js";
import { shape, line, lantern, surfaceTexture } from "./fantasy-scenery.js";
import { lagoonSteps, waterfallSteps } from "./lagoon.js";
import { batchModelSteps } from "./model-batching.js";
import { runSceneSteps } from "./scene-tasks.js";
import { createGroundCover, placementClearance } from "./landscape-detail.js";
import {
  sceneryModelSteps,
  positionScenery,
  disposeScenery,
} from "./scenery-models.js";
import { byScenery, sceneryFootprint } from "./scenery-data.js";
import { byItem } from "./game-data.js";
import { junglePlant, jungleFlowers } from "./jungle-props.js";
import { spaLounge, spaBar, spaSign, umbrella } from "./spa-assets.js";
function release(root) {
  if (!root) return;
  disposeScenery(root);
}
function* bake(parent, source) {
  const g = yield* batchModelSteps(source, { combineColors: true });
  parent.add(g);
  source.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  return g;
}
function terrain() {
  const s = new THREE.Shape();
  s.absarc(0, 0, SPA_RADIUS, 0, Math.PI * 2, false);
  for (const p of [SPA_POOL, SPA_JACUZZI]) {
    const h = new THREE.Path();
    h.absellipse(p.x, -p.z, p.rx, p.rz, 0, Math.PI * 2, true);
    s.holes.push(h);
  }
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.3,
    bevelEnabled: true,
    bevelSize: 0.07,
    bevelThickness: 0.05,
    bevelSegments: 2,
    curveSegments: 64,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -0.15, 0);
  return geo;
}
function steamAndBubbles(parent) {
  const geo = new THREE.SphereGeometry(1, 8, 6),
    bubbleMat = new THREE.MeshStandardMaterial({
      color: 0xedffef,
      transparent: true,
      opacity: 0.48,
      roughness: 0.25,
      depthWrite: false,
    });
  const steamOpacity = new THREE.InstancedBufferAttribute(
      new Float32Array(8),
      1,
    ),
    steamGeo = new THREE.PlaneGeometry(1, 1);
  steamGeo.setAttribute("steamOpacity", steamOpacity);
  const bubbles = new THREE.InstancedMesh(geo, bubbleMat, 24),
    steam = new THREE.InstancedMesh(
      steamGeo,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { time: { value: 0 } },
        vertexShader: `
          attribute float steamOpacity;
          varying vec2 steamUv;
          varying float fade;
          void main() {
            steamUv=uv; fade=steamOpacity;
            vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
            center.xy+=position.xy*vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));
            gl_Position=projectionMatrix*center;
          }`,
        fragmentShader: `
          uniform float time;
          varying vec2 steamUv;
          varying float fade;
          void main() {
            vec2 p=steamUv-.5;
            p.x+=sin(p.y*8.+time*.6)*.045;
            float soft=1.-smoothstep(.08,.5,length(p));
            gl_FragColor=vec4(1.,.97,.91,soft*fade*.42);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
      8,
    ),
    dummy = new THREE.Object3D();
  bubbles.frustumCulled = steam.frustumCulled = false;
  bubbles.name = "SPA jacuzzi bubbles";
  steam.name = "SPA warm rising steam";
  bubbles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  steam.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  steamOpacity.setUsage(THREE.DynamicDrawUsage);
  parent.add(bubbles, steam);
  const animation = {
    userData: {
      update(time, reduced = false) {
        const t = reduced ? 0 : time;
        steam.material.uniforms.time.value = t;
        for (let i = 0; i < 24; i++) {
          const a = i * 2.399,
            r = 0.4 + (i % 5) * 0.43,
            h = (t * 0.23 + i * 0.14) % 1;
          dummy.position.set(
            14.1 + Math.sin(a) * r,
            0.4 + h * 0.2,
            4.5 + Math.cos(a) * r,
          );
          dummy.scale.setScalar(0.03 + Math.sin(h * Math.PI) * 0.06);
          dummy.updateMatrix();
          bubbles.setMatrixAt(i, dummy.matrix);
        }
        for (let i = 0; i < 8; i++) {
          const a = i * 2.399,
            h = (t * 0.15 + i / 8) % 1;
          dummy.position.set(
            SPA_JACUZZI.x +
              Math.sin(a) * 1.4 +
              Math.sin(t * 0.3 + i) * h * 0.35,
            0.75 + h * 2.5,
            SPA_JACUZZI.z + Math.cos(a) * 1.4,
          );
          dummy.scale.set(0.95 + h * 1.1, 1.1 + h * 2, 1);
          dummy.updateMatrix();
          steam.setMatrixAt(i, dummy.matrix);
          steamOpacity.setX(i, Math.sin(Math.PI * h) ** 0.7);
        }
        steamOpacity.needsUpdate = true;
        bubbles.instanceMatrix.needsUpdate =
          steam.instanceMatrix.needsUpdate = true;
      },
    },
  };
  animation.userData.update(0);
  return animation;
}
export function* spaBiomeSteps(
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
    animations = [];
  root.name = "Biome-water-Cat-SPA";
  root.add(base, detail, low);
  root.userData = {
    biomeId: "water",
    style: BIOME_STYLES.water,
    navigationSurface: base,
    detail,
    lowDetail: low,
    lowOnly,
    lagoons,
    sceneryObjects,
    stats: { fishCount: 0 },
    spa: { areaMultiplier: 3, pool: SPA_POOL, jacuzzi: SPA_JACUZZI },
  };
  const top = new THREE.Mesh(
    terrain(),
    new THREE.MeshStandardMaterial({
      color: 0xa5c58d,
      roughness: 0.86,
      map: surfaceTexture("ground"),
    }),
  );
  top.receiveShadow = true;
  base.add(top);
  yield;
  const cliff = new THREE.Mesh(
    new THREE.CylinderGeometry(
      SPA_RADIUS - 0.05,
      SPA_RADIUS - 2.2,
      4.6,
      72,
      3,
      true,
    ),
    new THREE.MeshStandardMaterial({
      color: 0x9b9f88,
      roughness: 0.9,
      map: surfaceTexture("stone"),
    }),
  );
  cliff.position.y = -2.4;
  base.add(cliff);
  const bottom = shape(
    base,
    "cone",
    0x8b8d80,
    0,
    -6.4,
    0,
    SPA_RADIUS - 2.3,
    4.2,
    SPA_RADIUS - 2.3,
  );
  bottom.rotation.z = Math.PI;
  yield;
  for (const p of [SPA_POOL, SPA_JACUZZI])
    shape(
      low,
      "sphere",
      p === SPA_POOL ? 0x35cce0 : 0x9bd3b4,
      p.x,
      p.y + 0.15,
      p.z,
      p.rx,
      0.035,
      p.rz,
    );
  if (!lowOnly) {
    for (const p of [SPA_POOL, SPA_JACUZZI]) {
      const warm = p.id === "spa-jacuzzi",
        lake = yield* lagoonSteps({
          ...p,
          fishCount: 0,
          color: warm ? 0x64c5b0 : 0x0dbfd9,
          bedColor: warm ? 0xdbd9aa : 0xb6ded6,
          wallColor: 0xd7cbb5,
          shoreColor: 0xc9efdd,
          seed: warm ? 32 : 31,
        });
      lake.position.y = p.y;
      detail.add(lake);
      lagoons.set(p.id, lake);
      animations.push(lake);
      for (let i = 0; i < (warm ? 38 : 62); i++) {
        yield;
        const a = (i / (warm ? 38 : 62)) * Math.PI * 2;
        if (!warm && Math.abs(a - Math.PI / 2) < 0.27) continue;
        if (warm && Math.abs(a - Math.PI / 2) < 0.35) continue;
        const stone = shape(
          props,
          "stone",
          i % 3 ? 0xe1d0b3 : 0xc9c8af,
          p.x + Math.cos(a) * (p.rx + 0.13),
          p.y + 0.18,
          p.z + Math.sin(a) * (p.rz + 0.13),
          warm ? 0.49 : 0.42,
          warm ? 0.3 : 0.18,
          warm ? 0.4 : 0.34,
        );
        stone.rotation.y = -a;
      }
    }
    // Broad real steps descend into the water; handrails leave the lane clear.
    for (let i = 0; i < 7; i++)
      shape(
        props,
        "cube",
        i % 2 ? 0xd3bd99 : 0xe8d6b8,
        0,
        0.1 - i * 0.105,
        8.7 - i * 0.48,
        3.1,
        0.18,
        0.52,
      );
    for (const x of [-1.7, 1.7]) {
      line(props, [x, 0.18, 9.3], [x, 1.1, 9.3], 0xb29560, 0.045);
      line(props, [x, 1.1, 9.3], [x, 0.45, 6.2], 0xb29560, 0.045);
      line(props, [x, -0.45, 6.2], [x, 0.45, 6.2], 0xb29560, 0.045);
    }
    for (let i = 0; i < 4; i++)
      shape(
        props,
        "cube",
        0xd5c4a8,
        14.1,
        0.15 + i * 0.06,
        8.75 - i * 0.45,
        2.2,
        0.15,
        0.5,
      );
    for (let i = 0; i < 6; i++) {
      shape(
        props,
        "stone",
        i % 2 ? 0xa4aa92 : 0xbec2a6,
        14.1 + Math.sin(i * 2.4) * 1.3,
        0.6 + (i % 3) * 0.26,
        1.15 + Math.cos(i * 2.4) * 0.4,
        0.8,
        0.6,
        0.7,
      );
    }
    const fall = yield* waterfallSteps(14.1, 1.8, 0.95, 1.3, {
      color: 0x8fd6c2,
    });
    fall.position.y += 1.7;
    detail.add(fall);
    animations.push(fall, steamAndBubbles(detail));
    spaSign(props);
    // A generous path leads through the gate; the planted beds stay beside it.
    for (let i = 0; i < 6; i++) {
      const z = 10.6 + i * 0.95;
      shape(
        props,
        "stone",
        i % 2 ? 0xe4d2b4 : 0xd4c5a4,
        Math.sin(i * 0.8) * 0.22,
        0.18,
        z,
        1.13,
        0.08,
        0.48,
      );
    }
    for (const [x, z] of [
      [-3.4, 12],
      [3.4, 12],
      [-8.2, 8.2],
      [-8.2, -7.8],
      [8.2, -6],
      [12, 10.5],
      [-12, -5.4],
      [-17.8, 3.8],
      [17.5, 0],
    ])
      lantern(props, x, 0.15, z, 0.65);
    // The changing pavilion is a normal movable scenery record, not a second
    // fixed copy over it. Its real footprint participates in navigation.
    const rack = new THREE.Group();
    rack.position.set(9, 0.15, 12.4);
    props.add(rack);
    for (const x of [-1.2, 1.2])
      line(rack, [x, 0, 0], [x, 1.5, 0], 0xb18b5c, 0.06);
    for (const y of [0.12, 0.9])
      shape(rack, "cube", 0xd1aa77, 0, y, 0, 2.7, 0.11, 1.2);
    for (let i = 0; i < 5; i++) {
      const t = shape(
        rack,
        "pole",
        [0xe8d7b8, 0xafcfdf, 0xe2b9d1][i % 3],
        -0.9 + (i % 3) * 0.9,
        0.35 + Math.floor(i / 3) * 0.85,
        0,
        0.22,
        0.7,
        0.22,
      );
      t.rotation.z = Math.PI / 2;
    }
    umbrella(props, -7.5, 12.4, 0xf5c7d4);
    yield;
    if (preview) {
      const lounge = spaLounge();
      lounge.position.set(-14.2, 0.16, 0);
      detail.add(lounge);
      const bar = spaBar({ preview: true });
      bar.position.set(9.2, 0.16, -13);
      detail.add(bar);
    }
  }
  const decor = yield* bake(detail, props);
  root.userData.stats.staticMeshes = decor.children.length;
  root.userData.stats.sourceMeshes = decor.userData.sourceMeshes;
  let garden = null,
    cover = null,
    contentKey = "";
  root.userData.scenerySteps = function* (records = []) {
    const visible = records.filter((r) => !r.stored && r.biome === "water");
    for (const [id, g] of sceneryObjects)
      if (!visible.some((r) => r.id === id)) {
        detail.remove(g);
        release(g);
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
    if (lowOnly || next === contentKey) return;
    contentKey = next;
    for (const g of [garden, cover])
      if (g) {
        detail.remove(g);
        release(g);
      }
    const legacy = [
        ...items,
        ...records
          .filter((r) => !r.stored)
          .map((r) => ({ ...r, footprint: sceneryFootprint(r) })),
      ],
      bounds = [
        ...legacy,
        ...spaReservations().map((r) => ({ ...r, footprint: [r.w, r.d] })),
      ],
      rect = placementClearance(bounds),
      plants = new THREE.Group();
    const clear = (x, z, w = 0, d = w) =>
      rect(x, z, w, d) &&
      !(Math.abs(x) < 2.4 && z > 7.7) &&
      Math.hypot(x, z) < SPA_RADIUS - 0.7;
    root.userData.legacyPlatforms = [];
    for (const p of legacy)
      if (
        Math.hypot(
          (p.x - SPA_POOL.x) / SPA_POOL.rx,
          (p.z - SPA_POOL.z) / SPA_POOL.rz,
        ) < 1
      ) {
        const size = p.footprint || byItem(p.item)?.footprint || [3, 3];
        shape(
          plants,
          "cube",
          0xd3b584,
          p.x,
          0.06,
          p.z,
          size[0] + 0.18,
          0.18,
          size[1] + 0.18,
        );
        root.userData.legacyPlatforms.push(p.id);
      }
    for (let i = 0; i < 130; i++) {
      yield;
      const a = i * 2.399,
        r = 4 + (i % 12) * 1.27,
        x = Math.sin(a) * r,
        z = Math.cos(a) * r;
      if (!clear(x, z, 1.2)) continue;
      junglePlant(plants, x, 0.12, z, 0.65 + (i % 3) * 0.17, i);
      jungleFlowers(
        plants,
        x + 0.4,
        0.15,
        z + 0.3,
        0.8,
        [0xffd6df, 0xffebbb, 0xf4b8d1][i % 3],
      );
      if (i % 7 === 0)
        shape(plants, "stone", 0xc4bda0, x, 0.3, z, 0.45, 0.28, 0.37);
    }
    garden = yield* bake(detail, plants);
    cover = createGroundCover(BIOME_STYLES.water, "water", {
      placements: items,
      radius: SPA_RADIUS - 1,
      clearance: clear,
    });
    detail.add(cover);
  };
  root.userData.updatePlacements = (...args) =>
    runSceneSteps(root.userData.placementSteps(...args));
  yield* root.userData.placementSteps(placements, scenery);
  root.userData.update = (time, reduced = false) => {
    if (!detail.visible) return;
    animations.forEach((g) => g.userData.update?.(time, reduced));
    cover?.userData.update?.(time, reduced);
    for (const g of sceneryObjects.values()) g.userData.update?.(time, reduced);
  };
  detail.visible = !lowOnly;
  low.visible = lowOnly;
  root.userData.dispose = () => release(root);
  return root;
}
