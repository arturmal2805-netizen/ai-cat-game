import * as T from "three";
import { SQUISH_SECTORS } from "./squish-interior-layout.js";
import { squishInteriorArtSteps } from "./squish-interior-art.js";
import { WAREHOUSE as W } from "./mosasaur-expansion-data.js";
import { WAREHOUSE_ACCESS as A } from "./warehouse-access-data.js";
import { createSquishToy } from "./squish-model.js";
export const SQUISH_PROTOTYPE_ANCHOR = Object.freeze({
  x: W.x - 10,
  y: A.foot + 0.36,
  z: W.z + W.depth / 2 - 70,
});
export const SQUISH_DEMONSTRATORS = Object.freeze(
  [...SQUISH_SECTORS]
    .sort((a, b) => Number(b.id === "jelly") - Number(a.id === "jelly"))
    .map((d) =>
      Object.freeze({
        ...d,
        material:
          d.id === "collection" ? "mochi" : d.id === "sensory" ? "foam" : d.id,
      }),
    ),
);
// Ten logical sectors share the existing shell, entry and safe floor.
export function* warehouseSquishSteps(origin) {
  const root = new T.Group();
  root.name = "Squish Warehouse · interior";
  const art = yield* squishInteriorArtSteps();
  root.add(art);
  const p = SQUISH_PROTOTYPE_ANCHOR;
  root.position.set(origin.x + p.x, p.y, origin.z + p.z);
  const gold = new T.MeshStandardMaterial({
      color: 0xeec278,
      envMap: art.userData.environment,
      envMapIntensity:1.5,
      metalness: 0.82,
      roughness: 0.23,
      emissive: 0xc98a39,
      emissiveIntensity: 0.2,
    }),
    pink = new T.MeshStandardMaterial({
      color: 0xffc9e8,
      envMap: art.userData.environment,
      envMapIntensity:1.2,
      roughness: 0.24,
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
      if (d.id === "giant") mesh.scale.set(2.1, 1, 2.1);
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
    }
    const toy = createSquishToy({ material: d.material });
    toy.userData.sectorId = d.id;
    toy.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        if (m.isMeshStandardMaterial) {
          m.envMap = art.userData.environment;
          m.envMapIntensity = d.material === "jelly" ? 1.5 : 1.05;
          m.needsUpdate = true;
        }
    });
    toy.position.set(d.x, 0, d.z);
    root.add(toy);
    toys.push(toy);
  }
  root.userData = {
    toys,
    art,
    sectors: SQUISH_SECTORS,
    scratch: new T.Vector3(),
    update(dt) {
      for (const t of toys) {
        t.userData.preparePhysics();
        t.userData.solver.step(dt);
        t.userData.update(dt);
      }
    },
    dispose() {
      for (const t of toys) t.userData.dispose();
      art.userData.dispose();
      podium.dispose();
      top.dispose();
      gold.dispose();
      pink.dispose();
      root.removeFromParent();
    },
  };
  return root;
}
