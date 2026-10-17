import * as THREE from "three";
import {
  shape,
  line,
  torus,
  flowerCluster,
  lantern,
  surfaceTexture,
} from "./fantasy-scenery.js";
import { runSceneSteps } from "./scene-tasks.js";
import { batchModelSteps, batchModelGeometry } from "./model-batching.js";
import { createCat, animateCat, reactCat, disposeCat } from "./cat-model.js";
import { catAppearance } from "./cat-breeds.js";
import { courtSeats } from "./foodcourt-data.js";
const wood = 0xa8784f,
  cream = 0xffe8c5;
function bake(g) {
  const b = batchModelGeometry(g, { combineColors: true });
  g.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  return b;
}
export function courtLabel(text, width = 5, height = 0.8) {
  if (typeof document === "undefined") return new THREE.Group();
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 160;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff3d8";
  ctx.fillRect(0, 0, 1024, 160);
  ctx.fillStyle = "#654735";
  ctx.font = "bold 72px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 512, 84, 970);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: t }),
  );
  m.name = text;
  return m;
}
const foodTemplates = new Map();
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0xf0dfc7,
  roughness: 0.83,
});
floorMaterial.userData.sharedScenery = true;
export function courtFood(kind = "burger") {
  if (foodTemplates.has(kind)) return foodTemplates.get(kind).clone(true);
  const g = new THREE.Group();
  g.name = `Cat food · ${kind}`;
  if (kind === "burger") {
    shape(g, "pole", 0xe9b568, 0, 0.08, 0, 0.36, 0.13, 0.34);
    shape(g, "pole", 0x6d3c2a, 0, 0.19, 0, 0.35, 0.1, 0.33);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4;
      shape(
        g,
        "petal",
        0x7fa450,
        Math.sin(a) * 0.28,
        0.26,
        Math.cos(a) * 0.28,
        0.16,
        0.05,
        0.14,
      );
    }
    shape(g, "cube", 0xffd265, 0, 0.29, 0, 0.56, 0.045, 0.53);
    shape(g, "dome", 0xe4a65a, 0, 0.34, 0, 0.37, 0.27, 0.35);
    for (let i = 0; i < 12; i++) {
      const a = i * 2.4;
      shape(
        g,
        "petal",
        0xffe4a2,
        Math.sin(a) * 0.25,
        0.49 + (i % 3) * 0.02,
        Math.cos(a) * 0.23,
        0.032,
        0.015,
        0.018,
      );
    }
    shape(g, "cube", 0xd65f53, 0.64, 0.2, 0, 0.37, 0.38, 0.27);
    for (let i = 0; i < 8; i++)
      shape(
        g,
        "cube",
        0xffd778,
        0.51 + (i % 3) * 0.09,
        0.46 + (i % 2) * 0.08,
        -0.06 + Math.floor(i / 3) * 0.06,
        0.065,
        0.32,
        0.055,
      );
  } else if (kind === "cookie") {
    shape(g, "pole", 0xd5a56d, 0, 0.12, 0, 0.36, 0.16, 0.3);
    for (const s of [-1, 1]) {
      const e = shape(
        g,
        "cone",
        0xd5a56d,
        s * 0.24,
        0.14,
        -0.23,
        0.19,
        0.27,
        0.19,
      );
      e.rotation.x = -Math.PI / 2;
      shape(g, "sphere", 0x684637, s * 0.13, 0.215, -0.05, 0.035, 0.012, 0.035);
    }
    shape(g, "petal", 0xb96d61, 0, 0.215, 0.03, 0.04, 0.016, 0.03);
    for (let i = 0; i < 6; i++)
      shape(
        g,
        "petal",
        0x895239,
        Math.sin(i * 2.4) * 0.22,
        0.21,
        Math.cos(i * 2.4) * 0.18,
        0.025,
        0.014,
        0.025,
      );
  } else {
    const col = kind === "boba" ? 0xe8b4dc : 0xefcfab;
    shape(g, "pole", 0xffeed8, 0, 0.06, 0, 0.3, 0.06, 0.3);
    shape(g, "pole", col, 0, 0.3, 0, 0.23, 0.47, 0.23);
    shape(
      g,
      "pole",
      kind === "boba" ? 0xe6b2db : 0x9f6849,
      0,
      0.54,
      0,
      0.21,
      0.025,
      0.21,
    );
    if (kind === "boba") {
      for (let i = 0; i < 15; i++) {
        const a = i * 2.4;
        shape(
          g,
          "sphere",
          0x503a39,
          Math.sin(a) * 0.18,
          0.14 + (i % 3) * 0.085,
          Math.cos(a) * 0.18,
          0.04,
          0.04,
          0.04,
        );
      }
      line(g, [0.07, 0.46, 0], [0.16, 1, 0], 0xffe7b6, 0.025);
      const glass = new THREE.Mesh(
        new THREE.CylinderGeometry(0.245, 0.22, 0.49, 24, 1, true),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.15,
          depthWrite: false,
          roughness: 0.2,
        }),
      );
      glass.position.y = 0.3;
      g.add(glass);
    } else {
      const h = torus(g, 0xffe6c0, 0.13, 0.038, 0.27, 0.31, 0);
      h.rotation.y = Math.PI / 2;
    }
  }
  const b = bake(g);
  b.name = g.name;
  b.traverse((o) => {
    if (o.isMesh) {
      o.geometry.userData.sharedScenery = true;
      o.material.userData.sharedScenery = true;
    }
  });
  foodTemplates.set(kind, b);
  return b.clone(true);
}
function catLogo(g, x, y, z, col) {
  shape(g, "sphere", col, x, y, z, 0.65, 0.52, 0.07);
  for (const s of [-1, 1]) {
    const e = shape(
      g,
      "cone",
      col,
      x + s * 0.47,
      y + 0.43,
      z,
      0.25,
      0.55,
      0.12,
    );
    e.rotation.z = -s * 0.25;
    shape(
      g,
      "sphere",
      0x4d5c50,
      x + s * 0.2,
      y + 0.02,
      z + 0.08,
      0.055,
      0.065,
      0.025,
    );
  }
  shape(g, "petal", 0x4d5c50, x, y - 0.12, z + 0.09, 0.07, 0.05, 0.03);
}
function table(g, x, z, color) {
  shape(g, "pole", wood, x, 0.65, z, 0.13, 1, 0.13);
  shape(g, "pole", 0xf0cf9e, x, 1.16, z, 0.85, 0.16, 0.85);
  // The reserved cat seat is in front of the table; the legs never occupy it.
  shape(g, "sphere", color, x, 0.31, z + 2.25, 1, 0.2, 0.87);
}
export function courtVenue(o, options) {
  return runSceneSteps(courtVenueSteps(o, options));
}
export function* courtVenueSteps(o, { staff = true } = {}) {
  yield;
  const g = new THREE.Group(),
    staticPart = new THREE.Group(),
    roofPart = new THREE.Group();
  g.name = `Food court · ${o.name}`;
  g.userData = { id: o.type, foodcourt: true, handpainted: true, duration: 40 };
  const [hw, hd] = [o.w / 2, o.d / 2];
  let videoSurface = null;
  if (o.kind === "cinema") {
    shape(staticPart, "cube", 0xb79778, 0, 0.13, 0, o.w, 0.22, o.d);
    shape(staticPart, "cube", 0x7b668c, 0, 4.5, -6.5, 14, 8.3, 0.4);
    for (const s of [-1, 1]) {
      const ear = shape(
        staticPart,
        "cone",
        0x7b668c,
        s * 5.7,
        8.8,
        -6.5,
        1.4,
        2,
        1,
      );
      ear.rotation.z = -s * 0.2;
      const inner = shape(
        staticPart,
        "cone",
        0xe3acc3,
        s * 5.7,
        8.85,
        -5.96,
        0.78,
        1.15,
        0.12,
      );
      inner.rotation.z = -s * 0.2;
    }
    shape(staticPart, "cube", 0xc0a77f, 0, 4.5, -6.22, 13.1, 7.6, 0.08);
    videoSurface = new THREE.Mesh(
      new THREE.PlaneGeometry(12.5, (12.5 * 9) / 16),
      new THREE.MeshBasicMaterial({ color: 0x172739, toneMapped: false }),
    );
    videoSurface.position.set(0, 4.5, -6.15);
    videoSurface.name = "Cinema video surface";
    g.add(videoSurface);
    for (const s of courtSeats(o)) {
      const x = s.x - o.x,
        z = s.z - o.z;
      shape(
        staticPart,
        "sphere",
        s.index % 2 ? 0xafa2c7 : 0xe6bac9,
        x,
        0.43,
        z,
        1.8,
        0.46,
        1.65,
      );
      shape(staticPart, "sphere", 0xf1dfd5, x, 0.75, z - 0.85, 1.35, 0.37, 0.6);
      // Tufted back pillow and tiny paw embroidery sit behind the reserved seat.
      for (const dx of [-0.62, 0, 0.62])
        shape(
          staticPart,
          "sphere",
          0xe1b7c9,
          x + dx,
          0.97,
          z - 0.87,
          0.065,
          0.025,
          0.065,
        );
      shape(
        staticPart,
        "sphere",
        0xdfb7c8,
        x + 1.21,
        0.7,
        z - 0.92,
        0.17,
        0.035,
        0.14,
      );
      for (const dx of [-0.16, 0, 0.16])
        shape(
          staticPart,
          "sphere",
          0xdfb7c8,
          x + 1.21 + dx,
          0.73,
          z - 1.15,
          0.065,
          0.03,
          0.08,
        );
    }
    for (const x of [-8.4, 8.4]) {
      shape(staticPart, "cube", 0x534e69, x, 1.4, -5, 1.1, 2.5, 1);
      for (const y of [0.8, 1.9])
        shape(staticPart, "sphere", 0x252e3c, x, y, -4.47, 0.35, 0.35, 0.03);
    }
    for (const x of [-8.2, 8.2])
      for (const z of [-6, 2, 8]) lantern(staticPart, x, 0.15, z, 0.6);
    for (let j = 0; j < 25; j++) {
      const x = -7.5 + j * 0.625,
        y = 9.25 - Math.sin((j / 24) * Math.PI) * 0.44;
      shape(staticPart, "sphere", 0xffd789, x, y, -5.9, 0.09, 0.12, 0.09, true);
      if (j)
        line(
          staticPart,
          [x - 0.625, 9.25 - Math.sin(((j - 1) / 24) * Math.PI) * 0.44, -5.9],
          [x, y, -5.9],
          wood,
          0.025,
        );
    }
    for (const side of [-1, 1]) {
      shape(staticPart, "cube", wood, side * 8.3, 0.35, 5, 0.8, 0.5, 3.2);
      for (let j = 0; j < 4; j++)
        flowerCluster(
          staticPart,
          side * 8.3,
          3.8 + j * 0.8,
          [0xf3b0cc, 0xf6d495][j % 2],
          0.7,
        );
    }
  } else {
    const floor = shape(
      staticPart,
      "cube",
      0xd7bc95,
      0,
      0.06,
      0,
      o.w,
      0.13,
      o.d,
    );
    floor.material = floorMaterial;
    // Fine tile joints replace the stretched wood grain on large floor slabs.
    for (let x = -hw + 1; x < hw; x += 1.4)
      line(
        staticPart,
        [x, 0.131, -hd + 0.12],
        [x, 0.131, hd - 0.12],
        0xe2ceb0,
        0.012,
      );
    for (let z = -hd + 1; z < hd; z += 1.4)
      line(
        staticPart,
        [-hw + 0.12, 0.131, z],
        [hw - 0.12, 0.131, z],
        0xe2ceb0,
        0.012,
      );
    shape(staticPart, "cube", o.color, 0, 2.6, -hd, o.w, 5, 0.22);
    for (const s of [-1, 1]) {
      shape(staticPart, "cube", o.color, s * hw, 0.5, 0, 0.25, 0.8, o.d);
      for (const z of [-hd, 0, hd])
        shape(staticPart, "cube", wood, s * hw, 2.6, z, 0.25, 5, 0.2);
      shape(staticPart, "cube", wood, s * hw, 2.6, hd, 0.25, 5, 0.25);
      shape(
        staticPart,
        "cube",
        wood,
        (s * (hw + 1.5)) / 2,
        2.6,
        hd,
        hw - 1.5,
        0.12,
        0.2,
      );
    }
    // The front is a true glass storefront with a 3.4-unit open central doorway.
    const glass = new THREE.MeshStandardMaterial({
      color: 0xc2edf0,
      transparent: true,
      opacity: 0.12,
      roughness: 0.16,
      metalness: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    for (const side of [-1, 1]) {
      const pane = new THREE.Mesh(
        new THREE.PlaneGeometry(o.d - 0.35, 4.1),
        glass,
      );
      pane.rotation.y = Math.PI / 2;
      pane.position.set(side * hw, 2.8, 0);
      g.add(pane);
    }
    for (const s of [-1, 1]) {
      const pane = new THREE.Mesh(
        new THREE.PlaneGeometry(hw - 1.7, 4.5),
        glass,
      );
      pane.position.set((s * (hw + 1.7)) / 2, 2.6, hd + 0.01);
      g.add(pane);
    }
    shape(staticPart, "cube", cream, 0, 5.05, hd, o.w + 0.3, 0.65, 0.3);
    // Warm pendants and wall niches, batched with the interior: no point lights.
    for (const x of [-3.3, 0, 3.3]) {
      line(roofPart, [x, 5.15, -0.2], [x, 4.15, -0.2], wood, 0.035);
      shape(roofPart, "dome", 0xf3c982, x, 4.03, -0.2, 0.36, 0.32, 0.36);
      shape(
        roofPart,
        "sphere",
        0xffe3a5,
        x,
        3.98,
        -0.2,
        0.19,
        0.09,
        0.19,
        true,
      );
    }
    for (const side of [-1, 1]) {
      shape(
        staticPart,
        "cube",
        wood,
        side * (hw - 1.35),
        3.7,
        -hd + 0.15,
        1.5,
        1.5,
        0.15,
      );
      shape(
        staticPart,
        "cube",
        0xffdba0,
        side * (hw - 1.35),
        3.7,
        -hd + 0.24,
        1.25,
        1.23,
        0.03,
        true,
      );
      catLogo(staticPart, side * (hw - 1.35), 3.7, -hd + 0.29, 0xfff0d3);
    }
    shape(staticPart, "cube", wood, 0, 0.75, -1.5, o.w - 1.6, 1.45, 1.1);
    shape(staticPart, "cube", cream, 0, 1.52, -1.5, o.w - 1.3, 0.16, 1.35);
    for (let i = 0; i < 5; i++)
      shape(
        staticPart,
        "cube",
        o.color,
        -hw + 1.3 + (i * (o.w - 2.6)) / 4,
        0.8,
        -0.92,
        0.12,
        1.13,
        0.04,
      );
    for (const z of [-4.4, -3.3]) {
      shape(staticPart, "cube", wood, 0, 2.4, z, o.w - 2, 0.12, 0.6);
      for (let i = 0; i < 8; i++) {
        const f = courtFood(o.kind);
        f.scale.setScalar(0.58);
        f.position.set(-hw + 1.2 + (i * (o.w - 2.4)) / 7, 2.5, z);
        staticPart.add(f);
      }
    }
    shape(
      staticPart,
      "cube",
      o.kind === "coffee" ? 0x72958e : 0xa69388,
      hw - 1.7,
      1.1,
      -3.6,
      1.9,
      1.8,
      1.4,
    );
    shape(staticPart, "cube", 0x3e4a4c, hw - 1.7, 1.4, -2.87, 1.25, 0.8, 0.06);
    for (const x of [-0.45, 0.45])
      shape(
        staticPart,
        "sphere",
        0xe3ba75,
        hw - 1.7 + x,
        1.02,
        -2.82,
        0.1,
        0.1,
        0.03,
      );
    if (o.kind === "burger") {
      shape(staticPart, "cube", 0x50575c, -2, 1.68, -1.7, 2.3, 0.14, 0.85);
      for (let j = 0; j < 5; j++)
        line(
          staticPart,
          [-2.9 + j * 0.42, 1.77, -2.05],
          [-2.9 + j * 0.42, 1.77, -1.35],
          0x8a9293,
          0.035,
        );
    }
    if (o.kind === "boba")
      for (let j = 0; j < 4; j++) {
        shape(
          staticPart,
          "pole",
          [0xe6aacc, 0xa8cddf, 0xb0cea6, 0xe9c091][j],
          -3 + j * 0.65,
          1.91,
          -1.7,
          0.24,
          0.65,
          0.24,
        );
        shape(
          staticPart,
          "pole",
          cream,
          -3 + j * 0.65,
          2.26,
          -1.7,
          0.26,
          0.06,
          0.26,
        );
      }
    for (const s of courtSeats(o))
      table(staticPart, s.x - o.x, s.z - o.z - 2.25, o.color);
    for (const s of [-1, 1]) {
      lantern(staticPart, s * (hw - 0.5), 0.16, hd + 0.8, 0.65);
      flowerCluster(staticPart, s * (hw + 0.4), hd + 0.7, 0xedbcd5, 1.4);
    }
    const profile = new THREE.Shape();
    for (let i = 0; i <= 32; i++) {
      const x = -hw - 0.4 + (i * (o.w + 0.8)) / 32,
        y = 5.5 + Math.cos(((x / (hw + 0.4)) * Math.PI) / 2) * 0.8;
      i ? profile.lineTo(x, y) : profile.moveTo(x, y);
    }
    for (let i = 32; i >= 0; i--) {
      const x = -hw - 0.4 + (i * (o.w + 0.8)) / 32;
      profile.lineTo(x, 5.3 + Math.cos(((x / (hw + 0.4)) * Math.PI) / 2) * 0.8);
    }
    const roofMesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(profile, {
        depth: o.d + 0.8,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.1,
        bevelThickness: 0.08,
      }),
      new THREE.MeshStandardMaterial({
        color: o.roof,
        roughness: 0.7,
        map: surfaceTexture("roof"),
      }),
    );
    roofMesh.position.z = -hd - 0.4;
    roofMesh.castShadow = true;
    roofPart.add(roofMesh);
    // Trailing flowers frame the corners, leaving doors, windows and roofs clear.
    for (const side of [-1, 1]) {
      for (let j = 0; j < 12; j++) {
        const x = side * (hw - 0.35) + Math.sin(j * 2.4) * 0.34,
          y = 5.5 - j * 0.21,
          z = hd + 0.32;
        shape(
          roofPart,
          "petal",
          j % 2 ? 0x78a36c : 0x94b278,
          x,
          y,
          z,
          0.23,
          0.14,
          0.14,
        );
        if (j % 3 === 0) {
          for (let k = 0; k < 5; k++) {
            const a = (k / 5) * Math.PI * 2;
            shape(
              roofPart,
              "petal",
              o.kind === "boba" ? 0xf2b7d9 : 0xf5d1a1,
              x + Math.cos(a) * 0.12,
              y + Math.sin(a) * 0.12,
              z + 0.12,
              0.12,
              0.1,
              0.04,
            );
          }
          shape(
            roofPart,
            "sphere",
            0xffe5a5,
            x,
            y,
            z + 0.17,
            0.065,
            0.065,
            0.03,
          );
        }
      }
    }
    for (let i = 0; i < 20; i++) {
      const x = -hw + 0.2 + (i * (o.w - 0.4)) / 19,
        y = 4.65 - Math.sin((i / 19) * Math.PI) * 0.27;
      shape(
        staticPart,
        "sphere",
        0xffd27c,
        x,
        y,
        hd + 0.28,
        0.07,
        0.085,
        0.07,
        true,
      );
      if (i)
        line(
          staticPart,
          [
            x - (o.w - 0.4) / 19,
            4.65 - Math.sin(((i - 1) / 19) * Math.PI) * 0.27,
            hd + 0.28,
          ],
          [x, y, hd + 0.28],
          wood,
          0.018,
        );
    }
    // Flower boxes sit outside the walls; the broad central doorway stays free.
    for (const side of [-1, 1])
      for (let j = 0; j < 4; j++) {
        const z = -3.8 + j * 2.5;
        shape(
          staticPart,
          "cube",
          wood,
          side * (hw + 0.3),
          0.32,
          z,
          0.55,
          0.45,
          1.7,
        );
        flowerCluster(staticPart, side * (hw + 0.3), z, 0xedb5cf, 0.8);
      }
    for (const seat of courtSeats(o)) {
      const x = seat.x - o.x,
        z = seat.z - o.z - 2.25,
        f = courtFood(o.kind);
      f.scale.setScalar(0.55);
      f.position.set(x, 1.25, z);
      staticPart.add(f);
    }
    yield;
    for (let i = 0; i < 9; i++)
      shape(
        roofPart,
        "cube",
        i % 2 ? o.color : cream,
        -hw + (i * o.w) / 8,
        5.15,
        hd + 0.6,
        o.w / 9,
        0.36,
        1.1,
      );
    for (const s of [-1, 1]) {
      const ear = shape(
        roofPart,
        "cone",
        o.roof,
        s * (hw - 1),
        6.7,
        -1,
        0.95,
        2.1,
        0.65,
      );
      ear.rotation.z = -s * 0.23;
    }
    if (o.kind === "burger") {
      const food = courtFood("burger");
      food.scale.setScalar(4);
      food.position.set(-2, 6.25, -0.8);
      roofPart.add(food);
      const arches = new THREE.CatmullRomCurve3(
        [
          [0.25, 6.2],
          [0.4, 8.1],
          [1, 8.9],
          [1.6, 8.1],
          [1.75, 6.2],
          [1.9, 8.1],
          [2.5, 8.9],
          [3.1, 8.1],
          [3.25, 6.2],
        ].map(([x, y]) => new THREE.Vector3(x, y, hd + 0.35)),
      );
      const arch = new THREE.Mesh(
        new THREE.TubeGeometry(arches, 96, 0.17, 8, false),
        new THREE.MeshStandardMaterial({
          color: 0xffd260,
          emissive: 0xf5be5b,
          emissiveIntensity: 0.22,
          roughness: 0.5,
        }),
      );
      arch.castShadow = true;
      roofPart.add(arch);
    } else if (o.kind === "boba") {
      const f = courtFood("boba");
      f.scale.setScalar(4.5);
      f.position.set(0, 6.1, 0);
      roofPart.add(f);
      catLogo(roofPart, 0, 7.5, 1.05, 0xffecd8);
    } else if (o.kind === "coffee") {
      shape(roofPart, "sphere", o.roof, 0, 6.6, 0, 3.2, 1.6, 3);
      const sign = shape(
        roofPart,
        "pole",
        cream,
        0,
        7.1,
        hd + 0.39,
        1.32,
        0.17,
        1.32,
      );
      sign.rotation.x = Math.PI / 2;
      const inset = shape(
        roofPart,
        "pole",
        0x497b68,
        0,
        7.1,
        hd + 0.5,
        1.15,
        0.08,
        1.15,
      );
      inset.rotation.x = Math.PI / 2;
      catLogo(roofPart, 0, 7.1, hd + 0.6, 0xffe8c5);
    } else {
      const f = courtFood("cookie");
      f.scale.setScalar(5);
      f.rotation.x = Math.PI / 2;
      f.position.set(0, 7.4, hd + 0.2);
      roofPart.add(f);
    }
  }
  const base = yield* batchModelSteps(staticPart, { combineColors: true });
  base.name = "Batched interior and furniture";
  g.add(base);
  const roof = yield* batchModelSteps(roofPart, { combineColors: true });
  roof.name = "Hideable food-court roof";
  g.add(roof);
  g.userData.roof = roof;
  g.userData.videoSurface = videoSurface;
  for (const source of [staticPart, roofPart])
    source.traverse((o) => {
      if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
    });
  yield;
  const name = courtLabel(
    o.kind === "burger"
      ? "McDonald’s · cats"
      : o.kind === "coffee"
        ? "MURRBUCKS"
        : o.kind === "cookie"
          ? "КОТО-ПЕЧЕНЬКА"
          : o.kind === "boba"
            ? "BOBA CLOUD"
            : "КОТОКИНО",
    o.kind === "cinema" ? 8 : o.w - 1,
    0.7,
  );
  name.position.set(
    0,
    o.kind === "cinema" ? 8.9 : 5.02,
    o.kind === "cinema" ? -6.1 : hd + 0.22,
  );
  g.add(name);
  if (staff && o.kind !== "cinema") {
    const cat = createCat("happy", {
      detail: "npc",
      ...catAppearance({
        breed: o.kind === "cookie" ? "calico" : "ragdoll",
        color: o.kind === "cookie" ? 0xd2aa82 : 0xe5dccb,
        eyeColor: 0x95c2af,
      }),
    });
    cat.name = `${o.kind} cat chef`;
    cat.scale.multiplyScalar(0.9);
    // animateCat owns the rig's local bob. Keep its working height in a
    // separate carrier, just like the approved SPA barista.
    const chefCarrier = new THREE.Group();
    chefCarrier.name = "Chef working platform";
    chefCarrier.position.set(0, 1.25, -2.6);
    chefCarrier.add(cat);
    g.add(chefCarrier);
    const cap = shape(
      cat.userData.head,
      "sphere",
      0xfff1df,
      0,
      0.5,
      -0.04,
      0.32,
      0.13,
      0.25,
    );
    const apron = shape(
      cat,
      "sphere",
      o.color,
      0,
      0.76,
      0.45,
      0.3,
      0.36,
      0.055,
    );
    const serving = courtFood(o.kind);
    g.add(serving);
    serving.visible = false;
    const pearls = new THREE.Group();
    for (let i = 0; i < 9; i++)
      shape(
        pearls,
        "sphere",
        0x55403f,
        Math.sin(i * 2.4) * 0.12,
        i * 0.075,
        Math.cos(i * 2.4) * 0.12,
        0.038,
        0.038,
        0.038,
      );
    pearls.position.set(0.7, 1.85, -1.5);
    g.add(pearls);
    pearls.visible = false;
    shape(g, "cube", wood, 0, 0.7, -2.6, 1.8, 1.1, 1.3);
    g.userData.staff = cat;
    g.userData.update = (time, reduced = false) => {
      animateCat(cat, time, false, reduced);
      const v = g.userData.servingVisit,
        preparing = v?.phase === "prepare",
        handoff = v?.phase === "serve",
        active = preparing || handoff;
      g.userData.servicePhase = handoff
        ? "handover"
        : preparing
          ? "prepare"
          : "idle";
      serving.visible = active;
      pearls.visible = o.kind === "boba" && preparing;
      if (active) {
        const f = handoff ? Math.min(1, v.elapsed / 1.8) : 0;
        serving.position.set(0.55 * (1 - f), 1.65 - f * 0.14, -1.45 + f * 1.25);
        serving.rotation.z =
          preparing && !reduced ? Math.sin(time * 5) * 0.04 : 0;
        pearls.position.y = 2.3 - ((time * 0.55) % 0.85);
        reactCat(
          cat,
          {
            paw: 0.35 + (reduced ? 0 : Math.sin(time * 6) * 0.18),
            headPitch: 0.13,
            earRelax: -0.025,
          },
          reduced,
        );
      }
    };
    g.userData.disposeStaff = () => disposeCat(cat);
  }
  return g;
}
export function courtBlueprint(o, project) {
  const g = new THREE.Group();
  g.name = `Construction · ${o.name}`;
  shape(g, "cube", 0xc9b08a, 0, 0.05, 0, o.w, 0.12, o.d);
  for (const s of [-1, 1])
    for (const t of [-1, 1]) {
      line(
        g,
        [(s * o.w) / 2, 0.1, (t * o.d) / 2],
        [(s * o.w) / 2, 3.5, (t * o.d) / 2],
        wood,
        0.1,
      );
    }
  for (const s of [-1, 1]) {
    line(
      g,
      [-o.w / 2, 2, (s * o.d) / 2],
      [o.w / 2, 2, (s * o.d) / 2],
      wood,
      0.09,
    );
    for (let i = 0; i < 10; i++)
      shape(
        g,
        "cube",
        i % 2 ? 0xf4cd76 : 0xd79766,
        -o.w / 2 + ((i + 0.5) * o.w) / 10,
        1.1,
        (s * o.d) / 2,
        o.w / 10,
        0.35,
        0.12,
      );
  }
  const label = courtLabel(
    project.unstarted ? `${o.icon} ПОСТРОИТЬ` : `СТРОИТСЯ · ${o.name}`,
    o.w - 1,
    1,
  );
  label.position.set(0, 2.3, o.d / 2 + 0.15);
  const b = bake(g);
  b.name = g.name;
  b.add(label);
  b.userData = { id: o.type, handpainted: true, foodcourt: true };
  return b;
}
