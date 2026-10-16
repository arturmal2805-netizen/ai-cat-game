import * as THREE from "three";
import { shape, line, lantern, surfaceTexture } from "./fantasy-scenery.js";
const paints = new Map(),
  leafGeometries = new Map();
function paint(color) {
  if (!paints.has(color)) {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.67,
      side: THREE.DoubleSide,
      map: surfaceTexture("leaf"),
    });
    m.userData.sharedScenery = true;
    paints.set(color, m);
  }
  return paints.get(color);
}
function leafGeometry(broad) {
  if (leafGeometries.has(broad)) return leafGeometries.get(broad);
  const pos = [],
    uv = [],
    ix = [],
    rows = 8;
  for (let i = 0; i <= rows; i++) {
    const t = i / rows,
      w =
        Math.sin(Math.PI * t) ** 0.72 *
        (broad ? 0.48 : 0.3) *
        (broad ? 0.83 + 0.17 * Math.cos(t * 10 * Math.PI) : 1);
    for (let j = 0; j < 3; j++) {
      const side = j - 1;
      pos.push(
        side * w,
        Math.sin(t * Math.PI) * 0.14 + Math.abs(side) * 0.08 - t * t * 0.24,
        t,
      );
      uv.push(j / 2, t);
      if (i < rows && j < 2) {
        const a = i * 3 + j;
        ix.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(ix);
  g.computeVertexNormals();
  g.userData.sharedScenery = true;
  leafGeometries.set(broad, g);
  return g;
}
function leaf(parent, color, x, y, z, size, angle, tilt = 0, broad = false) {
  const m = new THREE.Mesh(leafGeometry(broad), paint(color));
  m.position.set(x, y, z);
  m.scale.setScalar(size);
  m.rotation.set(tilt, angle, 0);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export function* junglePalmSteps(parent, low = false, variant = 0) {
  const g = new THREE.Group();
  parent.add(g);
  const height = 4.8 + variant * 0.22,
    bend = 0.72;
  for (let i = 0; i < 10; i++) {
    yield;
    const t = i / 10,
      t2 = (i + 1) / 10;
    line(
      g,
      [bend * t * t, height * t, 0],
      [bend * t2 * t2, height * t2, 0],
      i % 2 ? 0xb68a52 : 0x98703f,
      0.23 - t * 0.09,
    );
    if (!low) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.225 - t * 0.087, 0.024, 4, 14),
        paint(0xd1ad6a),
      );
      ring.position.set(bend * t * t, height * t + 0.02, 0);
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
    }
  }
  for (let i = 0; i < (low ? 8 : 12); i++) {
    yield;
    const a = (i * Math.PI * 2) / (low ? 8 : 12) + variant * 0.27,
      len = 2.6 + (i % 3) * 0.25;
    if (low) leaf(g, 0x6eb543, bend, height, 0, len, a, -0.18);
    else {
      for (let j = 0; j < 16; j++) {
        const t = (j + 1) / 17,
          r = t * len,
          y = height + Math.sin(t * Math.PI) * 0.48 - t * t * 1.15;
        for (const side of [-1, 1])
          leaf(
            g,
            [0x75b937, 0x4f9b32, 0xa3cc44][(i + j) % 3],
            bend + Math.sin(a) * r,
            y,
            Math.cos(a) * r,
            (0.38 + 0.65 * Math.sin(Math.PI * t)) * (1 - t * 0.3),
            a + side * (0.85 + 0.22 * t),
            -0.22,
          );
      }
      const points = [];
      for (let j = 0; j <= 12; j++) {
        const t = j / 12;
        points.push(
          new THREE.Vector3(
            bend + Math.sin(a) * t * len,
            height + Math.sin(t * Math.PI) * 0.48 - t * t * 1.15,
            Math.cos(a) * t * len,
          ),
        );
      }
      const stem = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          18,
          0.028,
          4,
          false,
        ),
        paint(0xb4c64d),
      );
      g.add(stem);
    }
  }
  for (let i = 0; i < 4; i++)
    shape(
      g,
      "sphere",
      0xa97b39,
      bend + Math.sin(i * 2.4) * 0.23,
      height - 0.25,
      Math.cos(i * 2.4) * 0.23,
      0.18,
      0.23,
      0.17,
    );
  return g;
}
export function junglePlant(parent, x, y, z, size = 1, variant = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(size);
  parent.add(g);
  for (let i = 0; i < (variant % 2 ? 8 : 6); i++) {
    const a = i * 2.399;
    leaf(
      g,
      [0x4caa48, 0x83c64a, 0xb0d861][i % 3],
      0,
      0.12,
      0,
      1.0 + (i % 3) * 0.24,
      a,
      -0.48 + (i % 3) * 0.12,
      true,
    );
    line(
      g,
      [0, 0, 0],
      [Math.sin(a) * 0.38, 0.48, Math.cos(a) * 0.38],
      0x7eaa39,
      0.018,
    );
  }
  if (variant % 3 === 0)
    for (let i = 0; i < 5; i++) {
      const bract = shape(
        g,
        "petal",
        i % 2 ? 0xffc943 : 0xff655c,
        0.03 + Math.sin(i) * 0.11,
        0.5 + i * 0.13,
        0.03,
        0.15,
        0.1,
        0.1,
      );
      bract.rotation.z = i % 2 ? 0.6 : -0.6;
    }
  return g;
}
export function jungleFlowers(parent, x, y, z, size = 1, color = 0xff9776) {
  for (let i = 0; i < 3; i++) {
    const px = x + Math.sin(i * 2.4) * 0.33 * size,
      pz = z + Math.cos(i * 2.4) * 0.33 * size;
    line(
      parent,
      [px, y, pz],
      [px, y + 0.32 * size, pz],
      0x66a543,
      0.017 * size,
    );
    for (let j = 0; j < 5; j++) {
      const a = (j * Math.PI * 2) / 5,
        p = shape(
          parent,
          "petal",
          color,
          px + Math.sin(a) * 0.13 * size,
          y + 0.32 * size,
          pz + Math.cos(a) * 0.13 * size,
          0.115 * size,
          0.045 * size,
          0.22 * size,
        );
      p.rotation.y = a;
    }
    shape(
      parent,
      "sphere",
      0xffd45d,
      px,
      y + 0.36 * size,
      pz,
      0.065 * size,
      0.035 * size,
      0.065 * size,
      true,
    );
  }
}
export function jungleBridge(parent, x, y, z, length, rotation = 0) {
  const g = new THREE.Group();
  g.name = "Rope bridge over blue lagoon";
  g.position.set(x, y, z);
  g.rotation.y = rotation;
  parent.add(g);
  const count = Math.ceil(length / 0.34);
  for (let i = 0; i <= count; i++) {
    const t = i / count,
      px = (t - 0.5) * length,
      py = Math.sin(t * Math.PI) * 0.28;
    shape(
      g,
      "cube",
      i % 2 ? 0xc28f55 : 0xddac6d,
      px,
      py,
      0,
      (length / count) * 0.94,
      0.13,
      1.8,
    );
    if (i % 5 === 0 || i === count)
      for (const side of [-1, 1]) {
        line(
          g,
          [px, py, side * 0.87],
          [px, py + 0.96, side * 0.87],
          0x8d613a,
          0.06,
        );
        if (i % 10 === 0) lantern(g, px, py + 0.95, side * 0.87, 0.32);
      }
  }
  for (const side of [-1, 1]) {
    const pts = Array.from(
      { length: 25 },
      (_, i) =>
        new THREE.Vector3(
          (i / 24 - 0.5) * length,
          0.72 + Math.sin((i / 24) * Math.PI) * 0.28,
          side * 0.87,
        ),
    );
    g.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(pts),
          48,
          0.035,
          5,
          false,
        ),
        paint(0xe2c78a),
      ),
    );
  }
  return g;
}
export function tropicalHut(parent, low = false) {
  const g = new THREE.Group();
  parent.add(g);
  shape(g, "cube", 0xcba26b, 0, 0.15, 0, 2.8, 0.24, 2.7);
  for (const x of [-1.1, 1.1])
    for (const z of [-1.05, 1.05])
      line(g, [x, 0.2, z], [x, 2.7, z], 0xa87d45, 0.09);
  shape(g, "cone", 0x9cad4c, 0, 3.05, 0, 2.05, 1.7, 2.05);
  if (!low) {
    for (let i = 0; i < 20; i++) {
      const a = (i * Math.PI) / 10;
      line(
        g,
        [Math.sin(a) * 1.95, 2.25, Math.cos(a) * 1.95],
        [0, 3.9, 0],
        0xd4c26d,
        0.035,
      );
    }
    jungleFlowers(g, -1.2, 0.3, 0.9, 0.8, 0xffb399);
    lantern(g, 0, 2.2, 1.1, 0.52);
  }
  return g;
}
