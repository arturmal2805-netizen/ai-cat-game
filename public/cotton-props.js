import * as THREE from "three";
import {
  shape,
  line,
  torus,
  flowerCluster,
  lantern,
} from "./fantasy-scenery.js";
import { batchModelGeometry } from "./model-batching.js";
const candyMaterials = new Map();
function candyPaint(color) {
  if (!candyMaterials.has(color)) {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.33,
      metalness: 0.08,
    });
    m.userData.sharedScenery = true;
    candyMaterials.set(color, m);
  }
  return candyMaterials.get(color);
}
export const SWEETS = [0xff9bc5, 0xb9aff1, 0x99dce7, 0xffda91, 0xf5b8df];
export function candyTube(parent, points, color, radius = 0.06) {
  const curve =
    typeof points.getPoint === "function"
      ? points
      : new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 64, radius, 8, false),
    candyPaint(color),
  );
  parent.add(mesh);
  return mesh;
}
export function heart(parent, x, y, z, color = 0xff91b5, size = 0.3) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(-0.6, 0.5, -1, 1.15, -0.5, 1.35);
  s.bezierCurveTo(-0.2, 1.55, 0, 1.2, 0, 1.06);
  s.bezierCurveTo(0, 1.2, 0.2, 1.55, 0.5, 1.35);
  s.bezierCurveTo(1, 1.15, 0.6, 0.5, 0, 0);
  const mesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(s, {
      depth: 0.13,
      bevelEnabled: true,
      bevelSize: 0.09,
      bevelThickness: 0.06,
      bevelSegments: 2,
      curveSegments: 8,
    }),
    candyPaint(color),
  );
  mesh.position.set(x, y, z);
  mesh.scale.setScalar(size);
  parent.add(mesh);
  return mesh;
}
export function cupcake(
  parent,
  color = SWEETS[0],
  size = 1,
  house = false,
  open = false,
) {
  const g = new THREE.Group();
  g.scale.setScalar(size);
  parent.add(g);
  shape(g, "pole", 0xe4a969, 0, 0.5, 0, 0.86, 1, 0.86);
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    line(
      g,
      [Math.sin(a) * 0.8, 0.08, Math.cos(a) * 0.8],
      [Math.sin(a) * 0.98, 0.94, Math.cos(a) * 0.98],
      i % 2 ? 0xffd399 : 0xd89270,
      0.055,
    );
  }
  if (open) {
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      shape(
        g,
        "sphere",
        color,
        Math.sin(a) * 0.88,
        1.02,
        Math.cos(a) * 0.88,
        0.28,
        0.2,
        0.28,
      );
    }
    heart(g, 0, 0.4, 0.88, 0xffd38f, 0.23);
    return g;
  }
  shape(g, "sphere", color, 0, 1.04, 0, 1.14, 0.42, 1.14);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.399;
    shape(
      g,
      "sphere",
      0xffe4ec,
      Math.sin(a) * 0.72,
      1.27 + i * 0.045,
      Math.cos(a) * 0.72,
      0.35,
      0.24,
      0.35,
    );
  }
  shape(g, "sphere", 0xe95b83, 0, 1.84, 0, 0.27, 0.27, 0.27);
  candyTube(
    g,
    [
      [0, 2, 0],
      [0.08, 2.3, 0],
      [0.3, 2.4, 0],
    ],
    0x7b9f66,
    0.045,
  );
  for (let i = 0; i < 20; i++) {
    const a = i * 2.399,
      r = 0.28 + (i % 4) * 0.18;
    const sprinkle = shape(
      g,
      "cube",
      SWEETS[i % 5],
      Math.sin(a) * r,
      1.37 + (1 - r) * 0.25,
      Math.cos(a) * r,
      0.13,
      0.04,
      0.055,
    );
    sprinkle.rotation.y = a;
  }
  if (house) {
    shape(g, "cube", 0xa96f74, 0, 0.52, 0.85, 0.56, 0.93, 0.13);
    shape(g, "dome", 0xffd59a, 0, 1, 0.92, 0.32, 0.3, 0.06, true);
    for (const x of [-0.64, 0.64]) {
      shape(g, "sphere", 0xffd989, x, 0.62, 0.73, 0.22, 0.26, 0.08, true);
      torus(g, 0xf8e1b7, 0.24, 0.04, x, 0.62, 0.79);
    }
    lantern(g, -1.1, 0, 0.8, 0.45);
    flowerCluster(g, 0.9, 0.8, 0xffb2d1, 0.7);
  }
  return g;
}
export function cottonTree(parent, color = SWEETS[0], size = 1) {
  const g = new THREE.Group();
  g.scale.setScalar(size);
  parent.add(g);
  candyTube(
    g,
    [
      [0, 0, 0],
      [-0.18, 1, 0],
      [0.12, 2.1, 0],
      [0, 3, 0],
    ],
    0xa36d79,
    0.22,
  );
  for (let j = 0; j < 5; j++) {
    const a = j * 2.4;
    candyTube(
      g,
      [
        [0, 1.3, 0],
        [Math.sin(a) * 0.6, 2.1, Math.cos(a) * 0.6],
        [Math.sin(a) * 1.2, 2.75, Math.cos(a) * 1.2],
      ],
      0xb17d87,
      0.09,
    );
  }
  for (let i = 0; i < 38; i++) {
    const a = i * 2.399,
      r = 0.4 + (i % 5) * 0.23,
      c = new THREE.Color(color)
        .lerp(new THREE.Color(0xffe9f6), (i % 4) * 0.12)
        .getHex();
    shape(
      g,
      "sphere",
      c,
      Math.sin(a) * r,
      2.7 + Math.cos(i * 1.8) * 0.5,
      Math.cos(a) * r,
      0.45 + (i % 3) * 0.1,
      0.48,
      0.46,
    );
  }
  for (const x of [-0.85, 0.85]) {
    heart(g, x, 1.4, 0.35, 0xffd6a0, 0.23);
    lantern(g, x, 1.25, 0.35, 0.3);
  }
  flowerCluster(g, -0.65, 0.3, 0xffc2dc, 0.6);
  flowerCluster(g, 0.6, -0.2, 0xffe2a9, 0.6);
  return g;
}
export function lollipop(parent, x, y, z, color, size = 1) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(size);
  parent.add(g);
  line(g, [0, 0, 0], [0, 2.6, 0], 0xffe6ca, 0.07);
  shape(g, "sphere", color, 0, 2.7, 0, 0.8, 0.8, 0.17);
  const pts = [];
  for (let i = 0; i <= 90; i++) {
    const a = i * 0.2,
      r = 0.035 + i * 0.0074;
    pts.push([Math.sin(a) * r, 2.7 + Math.cos(a) * r, 0.19]);
  }
  candyTube(g, pts, 0xffeee7, 0.07);
  heart(g, 0.65, 1.6, 0.1, 0xffb0d2, 0.18);
  return g;
}
export function candyBridge(parent, x, y, z, length = 5, rotation = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotation;
  parent.add(g);
  for (let i = 0; i < 20; i++) {
    const px = -length / 2 + (i * length) / 19,
      py = Math.sin((i * Math.PI) / 19) * 0.48;
    shape(
      g,
      "cube",
      i % 2 ? 0xffbed7 : 0xffe0b4,
      px,
      py,
      0,
      length / 18,
      0.13,
      1.5,
    );
    if (i % 4 === 0)
      for (const sign of [-1, 1]) {
        line(
          g,
          [px, py, sign * 0.75],
          [px, py + 0.75, sign * 0.75],
          0xf5c08c,
          0.065,
        );
        heart(g, px, py + 0.73, sign * 0.75, 0xff8cb7, 0.14);
      }
  }
  for (const sign of [-1, 1])
    candyTube(
      g,
      [
        [-length / 2, 0.55, sign * 0.75],
        [0, 1.1, sign * 0.75],
        [length / 2, 0.55, sign * 0.75],
      ],
      0xff8fb4,
      0.1,
    );
  return g;
}
// Smooth sculpted pig, with independently animated ears, eyelids and trot legs.
export function createPig({
  color = 0xffb5cd,
  spotted = false,
  saddle = false,
} = {}) {
  const root = new THREE.Group(),
    body = new THREE.Group(),
    statics = new THREE.Group(),
    legs = [],
    ears = [],
    eyes = [];
  root.add(body);
  body.add(statics);
  const skin = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.55,
    clearcoat: 0.15,
  });
  function smooth(parent, x, y, z, sx, sy, sz, material = skin) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), material);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  smooth(statics, 0, 0.85, 0, 0.68, 0.67, 0.96);
  smooth(statics, 0, 1.15, 0.74, 0.6, 0.56, 0.55);
  smooth(
    statics,
    0,
    1.01,
    1.19,
    0.38,
    0.25,
    0.14,
    new THREE.MeshStandardMaterial({ color: 0xf589b0, roughness: 0.5 }),
  );
  for (const side of [-1, 1]) {
    shape(
      statics,
      "sphere",
      0x9e557d,
      side * 0.13,
      1.04,
      1.32,
      0.065,
      0.083,
      0.035,
    );
    shape(
      statics,
      "sphere",
      0xf88fba,
      side * 0.43,
      1.03,
      1.1,
      0.13,
      0.065,
      0.035,
    );
    const eye = new THREE.Group();
    eye.position.set(side * 0.32, 1.35, 1.16);
    body.add(eye);
    smooth(
      eye,
      0,
      0,
      0,
      0.105,
      0.135,
      0.065,
      new THREE.MeshStandardMaterial({ color: 0x3b2947, roughness: 0.18 }),
    );
    shape(
      eye,
      "sphere",
      0xffffff,
      -0.025,
      0.045,
      0.057,
      0.035,
      0.035,
      0.018,
      true,
    );
    eyes.push(eye);
    const ear = new THREE.Group();
    ear.position.set(side * 0.43, 1.56, 0.66);
    ear.rotation.z = -side * 0.3;
    body.add(ear);
    const outline = new THREE.Shape();
    outline.moveTo(-0.16, 0);
    outline.quadraticCurveTo(-0.32, 0.35, -0.16, 0.65);
    outline.quadraticCurveTo(0.12, 0.5, 0.2, 0.09);
    outline.closePath();
    const mesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(outline, {
        depth: 0.095,
        bevelEnabled: true,
        bevelSize: 0.055,
        bevelThickness: 0.04,
        bevelSegments: 2,
        curveSegments: 10,
      }),
      skin,
    );
    ear.add(mesh);
    shape(ear, "petal", 0xf98cb5, -0.03, 0.28, 0.12, 0.1, 0.23, 0.035);
    ears.push(ear);
    for (const z of [-0.5, 0.5]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.43, 0.47, z);
      root.add(leg);
      smooth(leg, 0, -0.16, 0, 0.18, 0.34, 0.19);
      shape(leg, "sphere", 0xb36b8b, 0, -0.39, 0.04, 0.19, 0.13, 0.22);
      legs.push(leg);
    }
  }
  const tail = [];
  for (let i = 0; i <= 32; i++) {
    const a = i * 0.35;
    tail.push([Math.sin(a) * 0.1, 0.96 + Math.cos(a) * 0.1, -0.86 - i * 0.01]);
  }
  candyTube(statics, tail, 0xee92b9, 0.047);
  candyTube(
    statics,
    [
      [-0.14, 0.87, 1.19],
      [0, 0.82, 1.24],
      [0.14, 0.87, 1.19],
    ],
    0xa8577e,
    0.023,
  );
  if (spotted)
    for (const [x, z] of [
      [-0.52, -0.4],
      [0.55, 0.05],
    ])
      smooth(
        statics,
        x,
        1.12,
        z,
        0.15,
        0.28,
        0.32,
        new THREE.MeshStandardMaterial({ color: 0xef86af, roughness: 0.6 }),
      );
  if (saddle) {
    shape(statics, "sphere", 0xc591d8, 0, 1.45, -0.13, 0.48, 0.07, 0.51);
    torus(statics, 0xffd58e, 0.2, 0.04, 0, 1.49, 0.22).rotation.x =
      -Math.PI / 2;
  }
  // Bake only the stationary skin pieces; pivots remain independent.
  const baked = batchModelGeometry(statics);
  body.remove(statics);
  body.add(baked);
  statics.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  root.name = "Living cotton pig";
  root.userData = { body, legs, ears, eyes, seatHeight: 1.54 };
  root.userData.update = (time, reduced = false) => {
    const t = reduced ? 0 : time;
    body.position.y = reduced ? 0 : Math.sin(t * 6) * 0.025;
    ears.forEach((e, i) => (e.rotation.x = Math.sin(t * 2 + i) * 0.12));
    legs.forEach(
      (l, i) =>
        (l.rotation.x = reduced
          ? 0
          : Math.sin(t * 6 + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.32),
    );
    const blink = reduced ? 1 : t % 4.7 < 0.14 ? 0.13 : 1;
    eyes.forEach((e) => (e.scale.y = blink));
  };
  return root;
}
