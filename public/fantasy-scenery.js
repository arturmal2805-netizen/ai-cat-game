import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const geometries = {
  sphere: new THREE.SphereGeometry(1, 12, 8),
  petal: new THREE.SphereGeometry(1, 6, 4),
  stone: new THREE.DodecahedronGeometry(1, 1),
  cube: new RoundedBoxGeometry(1, 1, 1, 2, 0.12),
  pole: new THREE.CylinderGeometry(1, 1, 1, 8),
  cone: new THREE.ConeGeometry(1, 1, 16),
  dome: new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
};
for (const geometry of Object.values(geometries))
  geometry.userData.sharedScenery = true;
const textureCache = new Map();
export function surfaceTexture(kind) {
  if (textureCache.has(kind)) return textureCache.get(kind);
  const size = 128,
    data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size,
        v = y / size,
        noise = ((x * 73 + y * 151 + ((x * y) % 113)) % 127) / 127;
      let value = 0.93;
      if (kind === "wood")
        value =
          0.83 + 0.08 * Math.sin(u * 72 + Math.sin(v * 14) * 2) + noise * 0.06;
      else if (kind === "roof") {
        const row = Math.floor(v * 12),
          tile = (u * 10 + row * 0.5) % 1,
          seam = Math.min(tile, 1 - tile);
        value =
          0.82 +
          0.1 * Math.sin(v * 12 * Math.PI) +
          noise * 0.05 -
          (seam < 0.025 ? 0.07 : 0);
      } else if (kind === "leaf")
        value =
          0.85 +
          0.08 * Math.sin(u * 17 + Math.cos(v * 21)) * Math.cos(v * 13) +
          noise * 0.06;
      else if (kind === "ground")
        value = 0.91 + 0.025 * Math.sin(u * 7.3 + v * 11.1) + noise * 0.035;
      else value = 0.86 + 0.055 * Math.sin(u * 24 + v * 17) + noise * 0.06;
      const i = (y * size + x) * 4;
      data[i] =
        data[i + 1] =
        data[i + 2] =
          Math.round(Math.max(0.65, Math.min(1, value)) * 255);
      data[i + 3] = 255;
    }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  texture.userData.sharedScenery = true;
  if (kind === "ground") texture.repeat.set(0.14, 0.14);
  textureCache.set(kind, texture);
  return texture;
}
const materials = new Map();
function paint(color, glow = false, kind = "stone") {
  const key = color + ":" + glow + ":" + kind;
  if (!materials.has(key))
    materials.set(
      key,
      glow
        ? new THREE.MeshBasicMaterial({ color })
        : new THREE.MeshStandardMaterial({
            color,
            roughness: 0.86,
            metalness: 0,
            map: surfaceTexture(kind),
            bumpMap: surfaceTexture(kind),
            bumpScale: 0.025,
          }),
    );
  materials.get(key).userData.sharedScenery = true;
  materials.get(key).userData.surfaceKind = kind;
  return materials.get(key);
}
export function shape(
  parent,
  kind,
  color,
  x,
  y,
  z,
  sx = 1,
  sy = 1,
  sz = 1,
  glow = false,
) {
  const mesh = new THREE.Mesh(
    geometries[kind],
    paint(
      color,
      glow,
      kind === "sphere" || kind === "petal"
        ? "leaf"
        : kind === "cone" || kind === "dome"
          ? "roof"
          : kind === "pole" || kind === "cube"
            ? "wood"
            : "stone",
    ),
  );
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = !glow;
  mesh.receiveShadow = !glow;
  parent.add(mesh);
  return mesh;
}
export function line(parent, a, b, color, r = 0.07) {
  const from = new THREE.Vector3(...a),
    to = new THREE.Vector3(...b),
    d = to.clone().sub(from);
  const mesh = shape(
    parent,
    "pole",
    color,
    ...from.clone().add(to).multiplyScalar(0.5).toArray(),
    r,
    d.length(),
    r,
  );
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return mesh;
}
export function torus(
  parent,
  color,
  r,
  t,
  x,
  y,
  z,
  glow = false,
  arc = Math.PI * 2,
) {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(r, t, 6, 36, arc),
    paint(color, glow),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = !glow;
  parent.add(mesh);
  return mesh;
}
export function flowerCluster(parent, x, z, color, scale = 1, y = 0) {
  for (let f = 0; f < 3; f++) {
    const px = x + Math.sin(f * 2.4) * 0.22 * scale,
      pz = z + Math.cos(f * 2.4) * 0.22 * scale,
      h = (0.28 + f * 0.06) * scale;
    shape(
      parent,
      "pole",
      0x648b58,
      px,
      y + h / 2,
      pz,
      0.025 * scale,
      h,
      0.025 * scale,
    );
    for (let p = 0; p < 5; p++)
      shape(
        parent,
        "petal",
        color,
        px + Math.cos(p * 1.256) * 0.11 * scale,
        y + h,
        pz + Math.sin(p * 1.256) * 0.11 * scale,
        0.095 * scale,
        0.045 * scale,
        0.095 * scale,
      );
    shape(
      parent,
      "petal",
      0xffdf8e,
      px,
      y + h + 0.015,
      pz,
      0.05 * scale,
      0.025 * scale,
      0.05 * scale,
    );
  }
}
export function lantern(parent, x, y, z, scale = 1, color = 0xffdf9f) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  parent.add(g);
  shape(g, "cube", 0xb09270, 0, 0.12, 0, 0.45, 0.22, 0.45);
  shape(g, "pole", 0x876341, 0, 0.62, 0, 0.055, 0.9, 0.055);
  shape(g, "cube", color, 0, 1.18, 0, 0.27, 0.36, 0.27, true);
  for (const dx of [-0.16, 0.16])
    for (const dz of [-0.16, 0.16])
      shape(g, "pole", 0x816047, dx, 1.18, dz, 0.025, 0.43, 0.025);
  shape(g, "cone", 0x967447, 0, 1.46, 0, 0.34, 0.25, 0.34);
  shape(g, "sphere", 0xf0ce80, 0, 1.65, 0, 0.05, 0.08, 0.05, true);
  return g;
}
export function fluffyTree(
  parent,
  x,
  z,
  color,
  kind = "oak",
  scale = 1,
  y = 0,
) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  parent.add(g);
  if (kind === "palm") {
    const trunk = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.15, 1.3, 0),
      new THREE.Vector3(0.65, 3, 0),
    ]);
    g.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(trunk, 10, 0.15, 7, false),
        paint(0xbe9565, false, "wood"),
      ),
    );
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4,
        leaf = shape(
          g,
          "sphere",
          color,
          0.65 + Math.cos(a) * 0.65,
          3.05,
          Math.sin(a) * 0.65,
          0.38,
          0.14,
          1.45,
        );
      leaf.rotation.set(0.2, a + Math.PI / 2, Math.sin(a) * 0.12);
    }
    for (let i = 0; i < 3; i++)
      shape(
        g,
        "sphere",
        0xa27642,
        0.45 + i * 0.2,
        2.75,
        0.12,
        0.17,
        0.21,
        0.17,
      );
  } else if (kind === "bamboo") {
    for (let stalk = 0; stalk < 4; stalk++) {
      const px = Math.sin(stalk * 2.4) * 0.3,
        pz = Math.cos(stalk * 2.4) * 0.3,
        height = 2.8 + stalk * 0.3;
      shape(g, "pole", color, px, height / 2, pz, 0.08, height, 0.08);
      for (let joint = 1; joint < 5; joint++)
        torus(g, 0xc7d99a, 0.084, 0.012, px, joint * 0.55, pz).rotation.x =
          Math.PI / 2;
      for (let j = 0; j < 3; j++) {
        const leaf = shape(
          g,
          "sphere",
          color,
          px + (j - 1) * 0.4,
          height - 0.3 + j * 0.15,
          pz,
          0.5,
          0.07,
          0.15,
        );
        leaf.rotation.z = (j - 1) * 0.4;
      }
    }
  } else if (kind === "pine" || kind === "snow") {
    shape(g, "pole", 0x8c725d, 0, 1.2, 0, 0.16, 2.4, 0.16);
    for (let tier = 0; tier < 4; tier++) {
      const radius = 1.2 - tier * 0.23,
        h = 1.45;
      shape(g, "cone", color, 0, 1.15 + tier * 0.55, 0, radius, h, radius);
      if (kind === "snow")
        shape(
          g,
          "cone",
          0xf0f7f4,
          0,
          1.34 + tier * 0.55,
          0,
          radius * 0.84,
          h * 0.73,
          radius * 0.84,
        );
    }
  } else {
    line(g, [0, 0, 0], [0.12, 2.4, 0], 0x91735c, 0.17);
    for (const side of [-1, 1])
      line(
        g,
        [0.05, 1.1, 0],
        [side * 0.78, 2.25, side * 0.15],
        0x91735c,
        0.105,
      );
    const lobes = [
      [0, 2.9, 0, 1.12],
      [-0.8, 2.4, 0.1, 0.9],
      [0.8, 2.5, -0.1, 0.9],
      [0.1, 2.5, 0.72, 0.85],
      [-0.12, 3.45, 0, 0.73],
    ];
    for (let i = 0; i < lobes.length; i++) {
      const [dx, dy, dz, r] = lobes[i],
        shade = new THREE.Color(color).lerp(
          new THREE.Color(i % 2 ? 0xffffff : 0x486848),
          i % 2 ? 0.12 : 0.09,
        );
      shape(
        g,
        "sphere",
        shade.getHex(),
        dx,
        dy,
        dz,
        r,
        kind === "maple" ? r * 0.64 : r * 0.87,
        r,
      );
    }
    if (kind === "sakura" || kind === "fruit")
      for (let i = 0; i < 7; i++)
        shape(
          g,
          "sphere",
          kind === "fruit" ? 0xffbd76 : 0xffd5e5,
          Math.sin(i * 2.4) * 1.15,
          2.55 + (i % 3) * 0.3,
          Math.cos(i * 2.4) * 0.8,
          0.09,
          0.1,
          0.09,
        );
  }
  return g;
}
export function mushroomHouse(
  parent,
  x,
  y,
  z,
  color = 0x9d72c2,
  scale = 1,
  house = true,
) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  parent.add(g);
  shape(
    g,
    "pole",
    house ? 0xf1dec0 : 0xe8d5ba,
    0,
    0.65,
    0,
    house ? 0.85 : 0.22,
    1.3,
    house ? 0.72 : 0.22,
  );
  shape(g, "dome", color, 0, 1.35, 0, 1.3, 0.75, 1.15);
  torus(g, 0xe8c8db, 1.13, 0.06, 0, 1.35, 0).rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i++) {
    const a = i * 2.4;
    shape(
      g,
      "sphere",
      0xffe9c9,
      Math.cos(a) * 0.8,
      1.82 + (i % 2) * 0.06,
      Math.sin(a) * 0.65,
      0.1,
      0.03,
      0.1,
    );
  }
  if (house) {
    shape(g, "cube", 0x9b7454, 0, 0.4, 0.73, 0.35, 0.7, 0.05);
    for (const dx of [-0.45, 0.45]) {
      shape(g, "sphere", 0xffd282, dx, 0.8, 0.67, 0.15, 0.19, 0.025, true);
      torus(g, 0x9c7249, 0.16, 0.025, dx, 0.8, 0.7);
    }
    shape(g, "cube", 0xcfb38b, 0, 0.08, 1, 0.75, 0.15, 0.35);
    flowerCluster(g, -0.72, 0.75, 0xf5bdd1, 0.7);
  }
  return g;
}
export function wizardCottage(parent, x, y, z, color = 0x9572b7, scale = 1) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  parent.add(g);
  shape(g, "pole", 0xf1dfc5, 0, 1, 0, 1.18, 1.95, 1.05);
  shape(g, "cube", 0xab805c, 0, 0.65, 1.02, 0.61, 1.3, 0.1);
  shape(g, "sphere", 0xd5a472, 0, 1.23, 1.02, 0.305, 0.3, 0.09);
  for (const dx of [-0.65, 0.65]) {
    shape(g, "sphere", 0xffd58d, dx, 1.12, 0.88, 0.23, 0.26, 0.1, true);
    torus(g, 0x9b724d, 0.25, 0.035, dx, 1.12, 0.98);
    line(g, [dx - 0.18, 1.12, 1.02], [dx + 0.18, 1.12, 1.02], 0xb08d57, 0.018);
  }
  const hat = new THREE.ConeGeometry(1.52, 2.2, 24, 6),
    position = hat.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    const q = (position.getY(i) + 1.1) / 2.2;
    position.setX(i, position.getX(i) + q * q * 0.65);
  }
  hat.computeVertexNormals();
  const roof = new THREE.Mesh(hat, paint(color, false, "roof"));
  roof.position.y = 2.75;
  g.add(roof);
  torus(g, color, 1.45, 0.16, 0, 1.8, 0).rotation.x = Math.PI / 2;
  torus(g, 0xe5c27d, 0.82, 0.055, 0.12, 2.6, 0).rotation.x = Math.PI / 2;
  torus(
    g,
    0xffd991,
    0.23,
    0.055,
    0.24,
    2.72,
    0.71,
    true,
    Math.PI * 1.55,
  ).rotation.z = 0.25;
  for (let i = 0; i < 3; i++)
    shape(
      g,
      "cube",
      0xd7bd98,
      0,
      0.22 - i * 0.06,
      1.35 + i * 0.23,
      0.95,
      0.12,
      0.45,
    );
  lantern(g, 1.25, 0, 0.85, 0.65);
  flowerCluster(g, -1.1, 1.05, 0xe9a9c9, 0.85);
  return g;
}
export function teaPavilion(parent, x, y, z, color = 0x9976aa, scale = 1) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  parent.add(g);
  shape(g, "cube", 0xcda878, 0, 0.16, 0, 2.8, 0.3, 2.1);
  for (const dx of [-1.1, 1.1])
    for (const dz of [-0.85, 0.85])
      shape(g, "pole", 0xb48461, dx, 1.15, dz, 0.07, 2, 0.07);
  shape(g, "cone", color, 0, 2.43, 0, 2.2, 1.1, 1.75).rotation.y = Math.PI / 4;
  for (const dx of [-1.5, 1.5])
    shape(g, "sphere", color, dx, 2.17, 0, 0.4, 0.19, 1.23);
  shape(g, "pole", 0x9f7351, 0, 0.65, 0, 0.4, 0.65, 0.4);
  for (const dx of [-0.8, 0.8])
    shape(g, "cube", 0xc19364, dx, 0.45, 0.3, 0.6, 0.25, 0.5);
  lantern(g, -1.1, 0.95, 0.85, 0.36);
  lantern(g, 1.1, 0.95, 0.85, 0.36);
  return g;
}
export function crescentGate(parent, x, y, z, color = 0xffd98d, scale = 1) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  parent.add(g);
  torus(g, color, 1.35, 0.16, 0, 2.1, 0, true, Math.PI * 1.55).rotation.z =
    0.72;
  for (const dx of [-1.3, 1.3]) {
    shape(g, "pole", 0xc9b5a2, dx, 0.95, 0, 0.2, 1.9, 0.2);
    lantern(g, dx, 1.9, 0, 0.45);
  }
  for (let i = 0; i < 4; i++)
    shape(
      g,
      "cube",
      0xc4ae98,
      0,
      0.08 + i * 0.1,
      0.8 - i * 0.25,
      2.9 - i * 0.12,
      0.16,
      0.4,
    );
  return g;
}
// Batch static props by material surface, retaining vertex colors and glow.
export function batchScenery(root) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert(),
    parts = { glow: [] };
  root.traverse((mesh) => {
    if (!mesh.isMesh) return;
    let geometry = mesh.geometry.clone();
    if (!geometry.index)
      geometry.setIndex(
        Array.from(
          { length: geometry.getAttribute("position").count },
          (_, i) => i,
        ),
      );
    geometry.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
    const count = geometry.getAttribute("position").count,
      c = new THREE.Color(mesh.material.color),
      colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    // Uniform attributes make arbitrary spheres, rocks, roofs and tubes mergeable.
    for (const name of Object.keys(geometry.attributes))
      if (!["position", "normal", "color", "uv"].includes(name))
        geometry.deleteAttribute(name);
    if (!geometry.getAttribute("uv"))
      geometry.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2),
      );
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
    const key = mesh.material.isMeshBasicMaterial
      ? "glow"
      : mesh.material.userData.surfaceKind || "stone";
    (parts[key] ||= []).push(geometry);
  });
  const result = new THREE.Group();
  for (const [key, pieces] of Object.entries(parts)) {
    if (!pieces.length) continue;
    const geometry = mergeGeometries(pieces, false);
    pieces.forEach((g) => g.dispose());
    const material =
      key === "glow"
        ? new THREE.MeshBasicMaterial({ vertexColors: true })
        : new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.86,
            map: surfaceTexture(key),
            bumpMap: surfaceTexture(key),
            bumpScale: 0.025,
          });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = key !== "glow";
    mesh.receiveShadow = key !== "glow";
    result.add(mesh);
  }
  result.userData.sourceMeshes = Object.values(parts).reduce(
    (sum, p) => sum + p.length,
    0,
  );
  return result;
}
export function dressAttraction(group, item) {
  if (!item || group.userData.dressed) return group;
  const decor = new THREE.Group(),
    [w, d] = item.footprint;
  const sizable = ["rides", "social", "farm", "transport", "decor"].includes(
    item.category,
  );
  if (sizable) {
    const base = shape(
      decor,
      "cube",
      0xd5be9e,
      0,
      -0.045,
      0,
      w * 0.95,
      0.09,
      d * 0.95,
    );
    for (const sign of [-1, 1]) {
      lantern(
        decor,
        sign * (w / 2 - 0.35),
        0,
        -d / 2 + 0.35,
        0.42,
        item.rarity === "Легендарное" ? 0xe9d0ff : 0xffd59b,
      );
      flowerCluster(
        decor,
        sign * (w / 2 - 0.4),
        d / 2 - 0.4,
        item.category === "farm" ? 0xf2d27f : 0xebb7d5,
        0.58,
      );
    }
    if (item.category === "rides" || item.category === "social") {
      for (const sign of [-1, 1])
        line(
          decor,
          [-w / 2 + 0.15, 0.35, sign * (d / 2 - 0.16)],
          [w / 2 - 0.15, 0.35, sign * (d / 2 - 0.16)],
          0xaf845b,
          0.03,
        );
    }
  }
  group.add(batchScenery(decor));
  group.userData.dressed = true;
  return group;
}
