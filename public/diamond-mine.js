import * as THREE from "three";
import { shape, line } from "./fantasy-scenery.js";
import { batchModelGeometry } from "./model-batching.js";
import { createCat, animateCat, reactCat, disposeCat } from "./cat-model.js";
const jewelGeometry = new THREE.OctahedronGeometry(0.36, 0),
  jewelPaint = new THREE.MeshPhysicalMaterial({
    color: 0xc29aff,
    emissive: 0x624192,
    emissiveIntensity: 0.22,
    transparent: true,
    opacity: 0.65,
    roughness: 0.16,
    metalness: 0.08,
    depthWrite: false,
  });
jewelGeometry.userData.sharedScenery = true;
jewelPaint.userData.sharedScenery = true;
export function diamondMine() {
  const root = new THREE.Group(),
    staticParts = new THREE.Group();
  root.name = "Алмазная шахта · котик-майнер";
  for (let i = 0; i < 9; i++) {
    const a = (i / 8) * Math.PI;
    shape(
      staticParts,
      "stone",
      [0x807e9e, 0x9690b0, 0xaba0bf][i % 3],
      Math.cos(a) * 1.22,
      0.15 + Math.sin(a) * 1.45,
      -0.65,
      0.48,
      0.6,
      0.65,
    ).rotation.z = a - 0.5;
  }
  shape(staticParts, "cube", 0x3d3556, 0, 0.9, -0.9, 1.6, 1.65, 0.15);
  for (const x of [-0.92, 0.92]) {
    shape(staticParts, "pole", 0xb68b68, x, 0.82, -0.3, 0.12, 1.65, 0.12);
    shape(staticParts, "cube", 0xe4b974, x, 0.34, -0.25, 0.2, 0.12, 0.3);
  }
  shape(staticParts, "cube", 0xc49e77, 0, 1.64, -0.3, 2.12, 0.22, 0.25);
  for (const x of [-0.35, 0.35])
    line(staticParts, [x, 0.08, -1.2], [x, 0.08, 1.6], 0x7c7d91, 0.035);
  for (let i = 0; i < 6; i++)
    shape(
      staticParts,
      "cube",
      0xb1967e,
      0,
      0.075,
      -1 + i * 0.47,
      0.95,
      0.06,
      0.13,
    );
  // Cart, lanterns and a tidy mineral display leave the worker visible.
  shape(staticParts, "cube", 0xbda4ce, 1.16, 0.5, 0.95, 0.72, 0.45, 0.72);
  for (const x of [0.85, 1.47])
    for (const z of [0.73, 1.17])
      shape(staticParts, "sphere", 0x666278, x, 0.22, z, 0.13, 0.13, 0.1);
  for (const x of [-1.05, 1.05]) {
    shape(
      staticParts,
      "cube",
      0xf5d8a6,
      x,
      1.15,
      -0.02,
      0.22,
      0.32,
      0.22,
      true,
    );
    shape(staticParts, "cone", 0xa88c71, x, 1.37, -0.02, 0.2, 0.16, 0.2);
  }
  const baked = batchModelGeometry(staticParts, { combineColors: true });
  root.add(baked);
  // Crystal shells share a small material; no transmission/reflection render pass.
  const crystals = new THREE.InstancedMesh(jewelGeometry, jewelPaint, 13),
    crystal = new THREE.Object3D();
  for (let i = 0; i < 13; i++) {
    const c = crystal,
      side = i < 5 ? -1 : 1;
    c.position.set(
      i < 5 ? -1.2 - (i % 2) * 0.22 : 1.18 + (i % 3) * 0.18,
      0.4 + (i % 4) * 0.21,
      i < 5 ? 0.2 + (i % 2) * 0.35 : -0.4 + (i % 5) * 0.3,
    );
    c.scale.set(0.45 + (i % 3) * 0.15, 1 + (i % 4) * 0.35, 0.5);
    c.rotation.set(0.1 * (i % 2), i * 0.8, side * 0.22);
    c.updateMatrix();
    crystals.setMatrixAt(i, c.matrix);
  }
  crystals.computeBoundingSphere();
  root.add(crystals);
  const miner = createCat("happy", {
    detail: "npc",
    color: 0xa5a6b1,
    eyeColor: 0xa2d67f,
  });
  miner.name = "Мур-коп · постоянный майнер";
  miner.scale.setScalar(0.43);
  miner.position.set(-0.24, 0.12, 0.9);
  miner.rotation.y = Math.PI * 0.85;
  root.add(miner);
  const helmet = new THREE.Group();
  shape(helmet, "dome", 0xefc16c, 0, 0.46, 0, 0.48, 0.2, 0.42);
  shape(helmet, "sphere", 0xffefb4, 0, 0.54, 0.39, 0.1, 0.1, 0.05, true);
  miner.userData.head.add(helmet);
  const index = miner.userData.legs.findIndex(
      (l) => l.position.z > 0 && l.position.x < 0,
    ),
    pick = new THREE.Group();
  shape(pick, "pole", 0xbc9470, 0, 0.25, 0, 0.035, 0.55, 0.035);
  line(pick, [-0.23, 0.53, 0], [0.23, 0.53, 0], 0xc5c9e0, 0.045);
  const tip = shape(pick, "cone", 0xe1d6f4, 0.27, 0.5, 0, 0.045, 0.23, 0.045);
  tip.rotation.z = -1.05;
  pick.position.set(0, 0.02, 0.2);
  miner.userData.legJoints[index].ankle.add(pick);
  root.userData = {
    id: "diamond-mine",
    handpainted: true,
    miner,
    update(time, reduced = false) {
      animateCat(miner, time, false, reduced);
      const tap = reduced ? 0.5 : Math.max(0, Math.sin(time * 3.8));
      reactCat(
        miner,
        { paw: 0.25 + tap * 0.5, headPitch: 0.08 + tap * 0.06 },
        reduced,
      );
      pick.rotation.x = -0.3 + tap * 0.8;
    },
    disposeStaff: () => {
      disposeCat(miner);
      miner.removeFromParent();
    },
  };
  return root;
}
