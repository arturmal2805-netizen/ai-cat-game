import * as T from "three";
import { WAREHOUSE as W } from "./mosasaur-expansion-data.js";
import { WAREHOUSE_ACCESS as A } from "./warehouse-access-data.js";
import { createSquishToy } from "./squish-model.js";
export const SQUISH_PROTOTYPE_ANCHOR = Object.freeze({
  x: W.x - 10,
  y: A.foot + 0.36,
  z: W.z + W.depth / 2 - 70,
});
export const SQUISH_DEMONSTRATORS = Object.freeze(
  [
    { id: "jelly", name: "Jelly Squish", x: 0, z: 0 },
    { id: "butter", name: "Butter Kingdom", x: -12, z: -4 },
    { id: "slime", name: "Slime Lab", x: 12, z: -4 },
    { id: "cloud", name: "Cloud Paradise", x: 0, z: -14 },
    { id: "foam", name: "Memory Foam", x: -12, z: -18 },
    { id: "crunchy", name: "Crunchy Squish", x: 12, z: -18 },
    { id: "mochi", name: "Mochi Stretch", x: 0, z: -28 },
  ].map(Object.freeze),
);
// Material demonstrators precede the full ten-sector interior. They use the
// existing floor/shell and a shared static podium palette, not new buildings.
export function* warehouseSquishSteps(origin) {
  const root = new T.Group();
  root.name = "Squish Warehouse · interior";
  const p = SQUISH_PROTOTYPE_ANCHOR;
  root.position.set(origin.x + p.x, p.y, origin.z + p.z);
  const gold = new T.MeshStandardMaterial({
      color: 0xeec278,
      metalness: 0.65,
      roughness: 0.23,
      emissive: 0xc98a39,
      emissiveIntensity: 0.2,
    }),
    pink = new T.MeshStandardMaterial({
      color: 0xffc9e8,
      roughness: 0.3,
      emissive: 0xff9dd0,
      emissiveIntensity: 0.18,
    }),
    toys = [];
  const podium = new T.CylinderGeometry(4, 4, 0.28, 64),
    top = new T.CylinderGeometry(3.8, 3.8, 0.1, 64);
  for (const d of SQUISH_DEMONSTRATORS) {
    yield;
    for (const [geometry, y, m] of [
      [podium, -0.2, gold],
      [top, -0.01, pink],
    ]) {
      const mesh = new T.Mesh(geometry, m);
      mesh.position.set(d.x, y, d.z);
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
    }
    const toy = createSquishToy({ material: d.id });
    toy.position.set(d.x, 0, d.z);
    root.add(toy);
    toys.push(toy);
  }
  root.userData = {
    toys,
    scratch: new T.Vector3(),
    update(dt) {
      for (const t of toys) {
        t.userData.solver.step(dt);
        t.userData.update();
      }
    },
    dispose() {
      for (const t of toys) t.userData.dispose();
      podium.dispose();
      top.dispose();
      gold.dispose();
      pink.dispose();
      root.removeFromParent();
    },
  };
  return root;
}
