import * as THREE from "three";
import {
  shape,
  line,
  torus,
  flowerCluster,
  lantern,
  surfaceTexture,
} from "./fantasy-scenery.js";
import { CHILL_FLOOR, CHILL_BED_Y, CHILL_WATER_Y } from "./chill-data.js";
const wall = 0xf0dfba,
  timber = 0xa77b4e,
  ivory = 0xfff0d5;
const paints = new Map();
const plaster = new THREE.MeshStandardMaterial({
  color: wall,
  roughness: 0.94,
  map: surfaceTexture("ground"),
  emissive: 0xffc477,
  emissiveIntensity: 0.07,
});
plaster.userData.sharedScenery = true;
function roofPaint(color) {
  if (!paints.has(color)) {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.78,
      map: surfaceTexture("roof"),
    });
    m.userData.sharedScenery = true;
    paints.set(color, m);
  }
  return paints.get(color);
}
function roofCurve(h, x) {
  const t = x / 5.7;
  return (
    3.75 +
    Math.cos((t * Math.PI) / 2) * (h.form === "chalet" ? 2.9 : 2.2) +
    (h.form === "asymmetric"
      ? t * 0.65
      : h.form === "bow"
        ? Math.sin(t * 5) * 0.28
        : 0)
  );
}
function roofStrip(parent, h, z, depth, color) {
  const s = new THREE.Shape();
  for (let i = 0; i <= 32; i++) {
    const x = -5.7 + (i / 32) * 11.4,
      y = roofCurve(h, x);
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  for (let i = 32; i >= 0; i--) {
    const x = -5.7 + (i / 32) * 11.4;
    s.lineTo(x, roofCurve(h, x) - 0.24);
  }
  const geo = new THREE.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.07,
      bevelThickness: 0.06,
      steps: 1,
    }),
    m = new THREE.Mesh(geo, roofPaint(color));
  m.position.z = z;
  m.castShadow = m.receiveShadow = true;
  m.name = "Chill cutaway roof";
  if (z > 0) m.position.y = 0.55;
  parent.add(m);
}
function pot(g, x, y, z, color = 0x73935f, size = 1) {
  shape(
    g,
    "pole",
    0xc19569,
    x,
    y + 0.22 * size,
    z,
    0.22 * size,
    0.43 * size,
    0.22 * size,
  );
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4;
    const leaf = shape(
      g,
      "sphere",
      color,
      x + Math.sin(a) * 0.18 * size,
      y + (0.55 + (i % 2) * 0.1) * size,
      z + Math.cos(a) * 0.18 * size,
      0.13 * size,
      0.34 * size,
      0.13 * size,
    );
    leaf.rotation.z = Math.sin(a) * 0.5;
  }
}
function window(g, x, y, z, radius = 0.54) {
  shape(g, "sphere", 0xffbf65, x, y, z, radius, radius, 0.055, true);
  torus(g, timber, radius, 0.06, x, y, z + 0.06);
  line(g, [x - radius, y, z + 0.08], [x + radius, y, z + 0.08], timber, 0.035);
  line(g, [x, y - radius, z + 0.08], [x, y + radius, z + 0.08], timber, 0.035);
}
export function chillHouseModel(h) {
  const g = new THREE.Group();
  g.name = `Chill mansion ${h.id}`;
  g.userData = {
    houseId: h.id,
    openFront: true,
    bedCapacity: 2,
    bathCapacity: 1,
  };
  // The open front is physical empty space: no glass, invisible wall or sprite.
  shape(g, "cube", 0xc8af87, 0, 0.26, 0, 11, 0.48, 7.4);
  for (let i = 0; i < 14; i++)
    shape(
      g,
      "cube",
      i % 2 ? 0xddc49a : 0xe5cfaa,
      -5.05 + i * 0.78,
      CHILL_FLOOR - 0.035,
      0,
      0.75,
      0.08,
      7.1,
    );
  // A broad continuous porch and two shallow steps work with every cat size.
  shape(g, "cube", 0xd4bc92, 0, 0.18, 4.42, 10.7, 0.18, 1.15);
  shape(g, "cube", 0xe2cda8, 0, 0.35, 3.72, 10.7, 0.18, 0.65);
  shape(g, "cube", wall, 0, 2.05, -3.4, 10.8, 3.1, 0.22).material = plaster;
  for (const x of [-5.3, 5.3]) {
    shape(g, "cube", wall, x, 1.65, -0.3, 0.2, 2.3, 6.25).material = plaster;
    shape(g, "pole", timber, x, 2.25, 3.15, 0.13, 3.5, 0.13);
    lantern(g, x, 2.55, 3.4, 0.55);
    pot(g, x - Math.sign(x) * 0.35, CHILL_FLOOR, 2.8, 0x6f965e, 1.25);
  }
  for (let i = 0; i < 12; i++) {
    const x = -5.05 + i * 0.92;
    shape(
      g,
      "cube",
      i % 2 ? 0xf3e3c4 : 0xebd5ac,
      x,
      2.08,
      -3.23,
      0.025,
      2.95,
      0.015,
    );
  }
  shape(g, "cube", timber, 0, 3.55, -3.23, 10.5, 0.14, 0.12);
  // Keep the roof on the rear strip and slim front fascia, exposing the rooms
  // from the actual elevated game camera, not only from a staged front view.
  roofStrip(g, h, -3.65, 1.8, h.roof);
  roofStrip(g, h, 3.1, 0.24, h.roof);
  roofStrip(g, h, 3.36, 0.09, 0xd8bd89);
  for (const x of [-5.55, 5.55])
    line(g, [x, 3.8, -3.6], [x, 3.8, 3.3], h.roof, 0.16);
  // Rear gable with a round dormer. It cannot obscure a resting cat.
  const gable = new THREE.Shape();
  gable.moveTo(-5.1, 3.5);
  for (let i = 0; i <= 24; i++) {
    const x = -5.1 + (i / 24) * 10.2;
    gable.lineTo(x, roofCurve(h, x) - 0.28);
  }
  gable.lineTo(5.1, 3.5);
  gable.closePath();
  const gm = new THREE.Mesh(
    new THREE.ShapeGeometry(gable),
    new THREE.MeshStandardMaterial({
      color: wall,
      side: THREE.DoubleSide,
      roughness: 0.9,
    }),
  );
  gm.position.z = -3.3;
  g.add(gm);
  window(g, h.form === "asymmetric" ? 1.1 : 0, 4.45, -3.2, 0.49);
  for (const x of [-3.8, 3.8]) window(g, x, 2.65, -3.22, 0.48);
  // Small real flowers and trailing leaves soften the cutaway front arch.
  for (let i = 0; i < 7; i++) {
    const x = -4.8 + i * 1.6,
      y = roofCurve(h, x) + 0.67,
      z = 3.45;
    shape(g, "sphere", 0x7e9a5e, x, y, z, 0.34, 0.15, 0.22);
    flowerCluster(g, x, z, i % 2 ? 0xf4c1d0 : 0xffe4a1, 0.7, y + 0.04);
  }
  // Chimney, collar and individual terracotta caps.
  const cx = h.form === "turret" ? -3.6 : 3.6;
  shape(g, "cube", 0xc3ab8f, cx, 5.2, -2.6, 0.74, 2.2, 0.74);
  shape(g, "cube", 0xb09576, cx, 6.32, -2.6, 0.96, 0.18, 0.96);
  for (let i = 0; i < 5; i++)
    shape(g, "cube", 0xae947b, cx, 4.4 + i * 0.34, -2.21, 0.73, 0.018, 0.015);
  if (["turret", "dome"].includes(h.form)) {
    shape(g, "pole", wall, 4.35, 4.2, -2.4, 1.05, 2.4, 1.05);
    shape(g, "dome", h.roof, 4.35, 5.35, -2.4, 1.3, 1.45, 1.3);
    shape(g, "sphere", 0xd8b569, 4.35, 6.85, -2.4, 0.16, 0.22, 0.16);
    window(g, 4.35, 4.65, -1.36, 0.38);
  }
  // One full-width mattress, two separate sleeping spaces, no divider.
  const bed = new THREE.Group();
  bed.name = `Chill shared bed ${h.id}`;
  g.add(bed);
  shape(bed, "sphere", 0xc5a07d, -2.55, 0.67, 0.65, 3.25, 0.22, 1.7);
  shape(
    bed,
    "sphere",
    h.cushion,
    -2.55,
    0.9,
    0.65,
    3.18,
    CHILL_BED_Y - 0.9,
    1.58,
  );
  shape(bed, "cube", h.cushion, -2.55, 1.25, -0.8, 5.8, 0.8, 0.45);
  for (const x of [-4.95, -0.2])
    shape(bed, "sphere", h.cushion, x, 1.15, 0.5, 0.42, 0.4, 1.28);
  for (const x of [-4.05, -1.05]) {
    const p = shape(bed, "sphere", ivory, x, 1.22, -0.43, 0.7, 0.16, 0.35);
    p.rotation.z = x < -3 ? 0.12 : -0.12;
  }
  // Folded blanket hangs only over the foot of the mattress, clear of faces.
  shape(bed, "cube", 0xc0b0d3, -2.55, 1.04, 1.68, 2.6, 0.13, 0.65);
  // Hollow porcelain bathtub: underside, skirt and rolled elliptical rim.
  const tub = new THREE.Group();
  tub.name = `Chill bath ${h.id}`;
  tub.position.set(3.05, 0, 0.65);
  g.add(tub);
  const geo = new THREE.CylinderGeometry(1, 0.88, 0.82, 48, 1, true),
    porcelain = new THREE.MeshStandardMaterial({
      color: 0xfff4df,
      roughness: 0.27,
      side: THREE.DoubleSide,
    });
  const skirt = new THREE.Mesh(geo, porcelain);
  skirt.scale.set(1.65, 1, 1.58);
  skirt.position.y = 1.05;
  tub.add(skirt);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.1, 8, 48), porcelain);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1.63, 1.56, 1);
  rim.position.y = 1.46;
  tub.add(rim);
  shape(tub, "sphere", 0xd6e8db, 0, 0.69, 0, 1.45, 0.055, 1.37);
  for (const x of [-1.12, 1.12])
    for (const z of [-0.9, 0.9])
      shape(tub, "sphere", 0xc6a164, x, 0.59, z, 0.18, 0.2, 0.15);
  for (let i = 0; i < 3; i++)
    shape(
      tub,
      "cube",
      0xccad7d,
      0,
      0.58 + i * 0.23,
      2.65 - i * 0.36,
      2.75,
      0.2,
      0.5,
    );
  line(tub, [1.25, 0.6, -1.2], [1.25, 1.92, -1.2], 0xc5a36a, 0.065);
  line(tub, [1.25, 1.92, -1.2], [0.75, 1.92, -1.2], 0xc5a36a, 0.065);
  shape(tub, "sphere", 0xead49d, 1.25, 1.5, -1.15, 0.14, 0.08, 0.14);
  // Warm lamps and shelves, towels, tea table and little personal decorations.
  for (const x of [-1.8, 1.8]) {
    line(g, [x, 4.7, -2.3], [x, 3.5, -2.3], timber, 0.025);
    shape(g, "dome", 0xffbe65, x, 3.32, -2.3, 0.3, 0.3, 0.3, true);
  }
  shape(g, "cube", 0xc7a272, 0.15, 1.02, -2.5, 2.6, 0.15, 0.8);
  for (let i = 0; i < 4; i++) {
    const x = -0.9 + i * 0.7;
    if (i % 2) pot(g, x, 1.1, -2.5, 0x81a76d, 0.8);
    else
      shape(
        g,
        "pole",
        [0xf0bfc2, 0xd9c7ae][i % 2],
        x,
        1.32,
        -2.5,
        0.17,
        0.45,
        0.17,
      );
  }
  shape(g, "cube", timber, 4.55, 0.85, -2, 1.15, 0.12, 1.2);
  for (let i = 0; i < 3; i++)
    shape(
      g,
      "pole",
      [0xb6d3d1, 0xf0c2cd, ivory][i],
      4.55,
      1 + i * 0.18,
      -2,
      0.13,
      0.85,
      0.13,
    ).rotation.z = Math.PI / 2;
  // Climbing vines follow the outside columns, never the walkable front lanes.
  for (const side of [-1, 1])
    for (let i = 0; i < 6; i++) {
      const x = side * (5.55 + Math.sin(i) * 0.15),
        z = 2.8 - i * 0.75;
      shape(g, "sphere", 0x7c9b5d, x, 0.9 + i * 0.45, z, 0.35, 0.22, 0.34);
      flowerCluster(g, x, z, i % 2 ? 0xf6c3d0 : 0xffe6a7, 0.6, 1.05 + i * 0.45);
    }
  return g;
}
export function chillSign(parent, title = "Chill Land") {
  const g = new THREE.Group();
  g.name = "Chill Land entrance";
  parent.add(g);
  for (const x of [-3.4, 3.4]) {
    shape(g, "pole", 0xae8156, x, 2, 0, 0.24, 4, 0.24);
    shape(g, "sphere", 0xe0bd81, x, 4, 0, 0.29, 0.18, 0.29);
    lantern(g, x, 2.4, 0.35, 0.75);
  }
  shape(g, "cube", 0xab7b4f, 0, 3.7, 0, 7, 1.2, 0.24);
  shape(g, "cube", 0xf0d8a8, 0, 3.72, 0.16, 6.55, 0.9, 0.08);
  if (typeof document !== "undefined") {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 192;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#775135";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 112px Georgia";
    ctx.fillText(title, 512, 96, 960);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 1.05),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    label.position.set(0, 3.73, 0.22);
    g.add(label);
  }
  return g;
}
