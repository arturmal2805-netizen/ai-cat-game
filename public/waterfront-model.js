import * as T from "three";
import {
  WATERFRONT as W,
  promenadeFront,
  promenadeBack,
  bridgePoint,
} from "./waterfront-data.js";
import {
  waterfrontMaterials,
  parts,
  slab,
  flowers,
} from "./waterfront-primitives.js";
import {
  restaurantSteps,
  floorHoles,
  table,
  sofa,
  lantern,
  planter,
} from "./waterfront-restaurant.js";
import { trampolineSteps } from "./waterfront-trampoline.js";
import { waterMaterial, advanceWater } from "./water-shading.js";
import { createMosaFish } from "./mosasaur-fish.js";
import { mosaCoralSteps } from "./mosasaur-corals.js";
function pierShape() {
  const s = new T.Shape();
  s.moveTo(-325, -promenadeFront(-325));
  for (let x = -325; x <= 325; x += 5) s.lineTo(x, -promenadeFront(x));
  for (let x = 325; x >= -325; x -= 5) s.lineTo(x, -promenadeBack(x));
  s.closePath();
  return floorHoles(s, -8);
}
export function* waterfrontModelSteps(root = new T.Group()) {
  root.name = "Laguna waterfront V14";
  const materials = waterfrontMaterials(),
    b = parts(root, materials),
    y = W.y;
  b.put(slab(pierShape(), 2.5), "ivory", 0, y - 2.5, 0);
  const garden = [];
  for (let x = -318; x <= 318; x += 18) {
    yield;
    const z = promenadeFront(x);
    if (Math.abs(x) > 11) {
      b.cylinder("gold", x, y + 1.8, z, 0.12, 3.6);
      b.box("glass", x + 8, y + 1.7, z - 1, 15, 2.8, 0.08);
    }
    if (Math.abs(x) > 24 && Math.abs(x) < 310 && Math.round(x) % 36 === 0)
      lantern(b, x, z - 5, y, 5);
  }
  for (const side of [-1, 1]) {
    const line = [];
    for (let i = 0; i <= 64; i++) {
      const x = -320 + i * 10;
      line.push([
        x,
        y + 0.08,
        side < 0 ? promenadeBack(x) + 3 : promenadeFront(x) - 2,
      ]);
    }
    b.tube("gold", line, 0.28);
    b.tube(
      "light",
      line.map((p) => [p[0], p[1] - 0.25, p[2]]),
      0.12,
    );
  }
  for (let i = 0; i < 24; i++) {
    yield;
    const x = -304 + i * 26.4,
      z = i % 2 ? promenadeBack(x) + 9 : promenadeFront(x) - 14;
    if ((Math.abs(x) < 151 && z < 49) || Math.abs(x) < 24) continue;
    planter(b, x, z, y, 5);
    garden.push({ x, y: y + 1.7, z, palm: i % 3 === 0 });
  }
  for (const side of [-1, 1])
    for (let i = 0; i < 6; i++) {
      yield;
      const x = side * (170 + (i % 3) * 48),
        z = -22 + Math.floor(i / 3) * 52;
      table(b, x, z, y, { terrace: true });
      if (i % 2 === 0) {
        planter(b, x + 18, z, y, 3.3);
        garden.push({ x: x + 18, y: y + 1.7, z, palm: false });
      }
    }
  for (const side of [-1, 1]) {
    sofa(b, side * 275, 36, y, side * 0.4);
    sofa(b, side * 235, -45, y);
    const canopy = [];
    for (let i = 0; i <= 32; i++) {
      const a = (i * Math.PI) / 32;
      canopy.push([side * 275 + Math.cos(a) * 15, y + 9 + Math.sin(a) * 5, 34]);
    }
    b.tube("gold", canopy, 0.25);
    b.box("rose", side * 275, y + 13, 34, 25, 0.18, 14);
  }
  // Circular paw plaza is marble inlay, with an unobstructed bridge approach.
  b.cylinder("rose", 0, y + 0.04, 65, 12, 0.06);
  b.sphere("gold", 0, y + 0.1, 65, 3.3, 0.04, 2.8);
  for (let j = 0; j < 4; j++)
    b.sphere(
      "gold",
      (j - 1.5) * 2.2,
      y + 0.1,
      61 - Math.sin((j * Math.PI) / 3),
      0.9,
      0.04,
      1.2,
    );
  // Real structural piles reach the existing bed. None fills the glass-floor apertures.
  for (const x of [-305, -220, -145, 145, 220, 305])
    for (const z of [-35, 42]) {
      b.cylinder("pile", x, -99, z, 1.7, 200, 2.4);
      b.cylinder("gold", x, -2, z, 1.9, 1);
    }
  yield* b.finish();
  yield* flowers(root, materials, garden);
  const restaurant = new T.Group();
  root.add(restaurant);
  yield* restaurantSteps(restaurant, materials);
  const bridge = new T.Group();
  bridge.name = "Walkable curved guarded bridge";
  root.add(bridge);
  const bb = parts(bridge, materials),
    verts = [],
    uv = [];
  const rails = [[], []];
  for (let i = 0; i <= 96; i++) {
    yield;
    const t = i / 96,
      p = bridgePoint(t),
      p0 = bridgePoint(Math.max(0, t - 0.001)),
      p1 = bridgePoint(Math.min(1, t + 0.001)),
      dx = p1.x - p0.x,
      dz = p1.z - p0.z,
      d = Math.hypot(dx, dz),
      nx = dz / d,
      nz = -dx / d;
    for (let s = 0; s < 2; s++)
      rails[s].push([
        p.x + ((s ? 1 : -1) * nx * W.bridge.width) / 2,
        p.y + 2.5,
        p.z + ((s ? 1 : -1) * nz * W.bridge.width) / 2,
      ]);
    if (i % 8 === 0) {
      for (const s of [-1, 1]) {
        bb.cylinder(
          "gold",
          p.x + s * nx * 5.7,
          p.y + 1.25,
          p.z + s * nz * 5.7,
          0.13,
          2.5,
        );
        bb.sphere(
          "light",
          p.x + s * nx * 5.7,
          p.y + 2.6,
          p.z + s * nz * 5.7,
          0.35,
          0.45,
          0.35,
        );
      }
    }
    if (i < 96) {
      const n = bridgePoint((i + 1) / 96);
      for (const [a, s] of [
        [p, -1],
        [n, -1],
        [p, 1],
        [n, -1],
        [n, 1],
        [p, 1],
      ]) {
        verts.push(a.x + s * nx * 6, a.y, a.z + s * nz * 6);
        uv.push(s > 0 ? 1 : 0, (a === p ? i : i + 1) / 4);
      }
    }
  }
  const deck = new T.BufferGeometry();
  deck.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
  deck.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  deck.computeVertexNormals();
  bb.put(deck, "ivory");
  for (const r of rails) {
    bb.tube("gold", r, 0.22);
    bb.tube(
      "light",
      r.map((p) => [p[0], p[1] - 2.35, p[2]]),
      0.08,
    );
    bb.tube(
      "gold",
      r.map((p) => [p[0], p[1] - 1.15, p[2]]),
      0.1,
    );
  }
  yield* bb.finish();
  const trampoline = new T.Group();
  trampoline.position.set(W.trampoline.x, 0, W.trampoline.z);
  root.add(trampoline);
  yield* trampolineSteps(trampoline, materials);
  // A separate shallow reef beneath the real glazing, over the unmodified deep bed.
  const habitat = new T.Group();
  habitat.name = "Actual underfloor marine habitat";
  root.add(habitat);
  const hb = parts(habitat, materials);
  hb.sphere("sand", 0, -15, 5, 62, 2.1, 33);
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4,
      r = 15 + (i % 4) * 10;
    hb.sphere(
      "rock",
      Math.cos(a) * r,
      -13 + Math.sin(i) * 0.5,
      5 + Math.sin(a) * r * 0.4,
      3 + (i % 4),
      1.8 + (i % 3),
      3 + (i % 3),
    );
  }
  yield* hb.finish();
  const sites = Array.from({ length: 24 }, (_, i) => ({
    id: "waterfront-reef-" + i,
    x: Math.cos(i * 2.399) * ((i % 5) * 8 + 8),
    y: -12,
    z: 5 + Math.sin(i * 2.399) * (8 + (i % 4) * 4),
    form: i % 11,
    scale: 1.4 + (i % 4) * 0.45,
    yaw: i,
    nx: 0,
    ny: 1,
    nz: 0,
  }));
  const corals = yield* mosaCoralSteps({
    sitesOverride: sites,
    lodDistances: [0, 15, 90],
    seabedFar: true,
  });
  habitat.add(corals);
  const school = Array.from({ length: 24 }, (_, i) => ({
    cx: 0,
    cz: 5,
    phase: i * 2.4,
    radius: 15 + (i % 5) * 5,
    rx: 1,
    rz: 0.5,
    speed: 0.08 + (i % 3) * 0.015,
    depth: -4 - (i % 5),
    scale: 1.8 + (i % 3) * 0.5,
  }));
  const fish = createMosaFish({ deep: true, school });
  habitat.add(fish);
  // Small fountains share the game's exact water field and clock.
  const water = waterMaterial(0x21c9cc, 0.55, { width: 8, height: 8 }),
    fountains = new T.Group();
  root.add(fountains);
  const fb = parts(fountains, { ...materials, water });
  for (const x of [-185, 185]) {
    fb.cylinder("ivory", x, y + 0.4, 50, 7, 0.8);
    fb.cylinder("gold", x, y + 0.9, 50, 6.9, 0.2);
    fb.put(new T.CircleGeometry(6.4, 48), "water", x, y + 1.03, 50, 1, 1, 1, [
      -Math.PI / 2,
      0,
      0,
    ]);
    fb.cylinder("gold", x, y + 1.8, 50, 0.25, 2);
    fb.sphere("water", x, y + 3.4, 50, 0.8, 1.6, 0.8);
  }
  yield* fb.finish();
  root.userData = {
    ...root.userData,
    materials,
    restaurant,
    bridge,
    trampoline,
    habitat,
    glassPanels: restaurant.userData.glassPanels,
    tableCount: 28,
    update(time, reduced = false) {
      corals.userData.update?.(time, reduced);
      fish.userData.update?.(time, reduced);
      advanceWater(water, time, reduced);
      trampoline.userData.update?.(time);
    },
  };
  return root;
}
