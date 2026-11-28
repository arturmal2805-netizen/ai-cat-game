import * as T from "three";
import { bindSquishVisualLOD } from "./squish-visual-lod.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { SQUISH_SECTORS } from "./squish-interior-layout.js";
// All resources belong to this venue. No scene.environment/light/renderer edits.
export function* squishInteriorArtSteps() {
  const root = new T.Group();
  root.name = "Squish Warehouse · ten-sector architecture";
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set(),
    batches = new Map();
  const envData = new Float32Array(128 * 64 * 4);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 128; x++) {
      const u = x / 128,
        v = y / 64,
        strip =
          Math.pow(Math.max(0, Math.cos(u * Math.PI * 16)), 44) *
          Math.exp(-(((v - 0.35) / 0.16) ** 2)),
        dome = Math.max(0, Math.sin(v * Math.PI)),
        i = (y * 128 + x) * 4;
      envData[i] = 0.22 + dome * 0.8 + strip * 5;
      envData[i + 1] = 0.12 + dome * 0.55 + strip * 3.7;
      envData[i + 2] = 0.3 + dome * 0.7 + strip * 2.5;
      envData[i + 3] = 1;
    }
  const env = new T.DataTexture(envData, 128, 64, T.RGBAFormat, T.FloatType);
  env.mapping = T.EquirectangularReflectionMapping;
  env.needsUpdate = true;
  textures.add(env);
  const mat = (options) => {
    const m = new T.MeshPhysicalMaterial({
      envMap: env,
      envMapIntensity: 1.8,
      ...options,
    });
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <fog_fragment>",
        T.ShaderChunk.fog_fragment.replace(
          "fogFactor );",
          "min(fogFactor,0.08) );",
        ),
      );
    };
    m.customProgramCacheKey = () => "warehouse-owned-architecture-pbr-v2";
    materials.add(m);
    return m;
  };
  const gold = mat({
      color: 0xf5ce81,
      metalness: 0.62,
      roughness: 0.2,
      emissive: 0x8c5c25,
      emissiveIntensity: 0.22,
    }),
    cream = mat({ color: 0xffe4dc, roughness: 0.28, clearcoat: 1 }),
    pink = mat({ color: 0xf7b4d7, roughness: 0.3, clearcoat: 1 }),
    glass = mat({
      color: 0xb2f4ff,
      roughness: 0.1,
      metalness: 0.08,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    }),
    violet = mat({ color: 0xa36fc1, roughness: 0.26, metalness: 0.18 }),
    white = mat({ color: 0xffe9ef, roughness: 0.28, clearcoat: 1 }),
    warm = mat({
      color: 0xffd3a0,
      emissive: 0xffbc70,
      emissiveIntensity: 2.3,
      roughness: 0.2,
    }),
    neon = mat({
      color: 0xff9cdb,
      emissive: 0xff63ca,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });
  const g = (geometry) => {
    geometries.add(geometry);
    return geometry;
  };
  const box = g(new T.BoxGeometry(1, 1, 1)),
    sphere = g(new T.SphereGeometry(1, 20, 14)),
    cylinder = g(new T.CylinderGeometry(1, 1, 1, 40));
  const batch = (
    geometry,
    material,
    position,
    scale = [1, 1, 1],
    rotation = [0, 0, 0],
  ) => {
    const key = geometry.uuid + material.uuid;
    let b = batches.get(key);
    if (!b) batches.set(key, (b = { geometry, material, matrices: [] }));
    const d = new T.Object3D();
    d.position.set(...position);
    d.scale.set(...scale);
    d.rotation.set(...rotation);
    d.updateMatrix();
    b.matrices.push(d.matrix.clone());
  };
  const tube = (points, r, material, segments = 48) => {
    const geom = g(
      new T.TubeGeometry(
        new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
        segments,
        r,
        8,
        false,
      ),
    );
    batch(geom, material, [0, 0, 0]);
  };
  const ring = (x, y, z, r, material, thickness = 0.08) =>
    batch(
      g(new T.TorusGeometry(r, thickness, 8, 64)),
      material,
      [x, y, z],
      [1, 1, 1],
      [Math.PI / 2, 0, 0],
    );
  function sign(text, x, y, z, width = 13, height = 2.6) {
    if (typeof document === "undefined") return;
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, "#7b488b");
    gradient.addColorStop(1, "#311b50");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(6, 6, 1012, 244, 85);
    ctx.fill();
    ctx.lineWidth = 9;
    ctx.strokeStyle = "#ffd990";
    ctx.stroke();
    ctx.shadowColor = "#ff6ad2";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#fff3df";
    ctx.font = "bold 70px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 512, 130, 940);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    textures.add(tex);
    const m = new T.MeshBasicMaterial({
      map: tex,
      transparent: true,
      fog: false,
    });
    materials.add(m);
    batch(g(new T.PlaneGeometry(width, height)), m, [x, y, z]);
  }
  // The polished overlay stays 5mm below the existing safe foot plane.
  const floor = mat({
    color: 0xffded9,
    metalness: 0.13,
    roughness: 0.24,
    clearcoat: 1,
  });
  const floorFog = floor.onBeforeCompile;
  floor.onBeforeCompile = (s) => {
    floorFog(s);
    s.vertexShader =
      "varying vec2 marbleUV;\n" +
      s.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nmarbleUV=uv;",
      );
    s.fragmentShader =
      "varying vec2 marbleUV;\n" +
      s.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
 vec2 p=marbleUV*vec2(22.,18.);float bend=sin(p.y*.7+sin(p.x*.45)*1.6);float vein=pow(1.-abs(sin(p.x*.9+bend*1.8)),18.);diffuseColor.rgb*=1.-vein*.13;`,
      );
  };
  floor.customProgramCacheKey = () => "squish-owned-marble-v1";
  batch(
    g(new T.PlaneGeometry(164, 155)),
    floor,
    [0, -0.365, -56],
    [1, 1, 1],
    [-Math.PI / 2, 0, 0],
  );
  yield;
  // Open, lofty gold/glass barrel vault. Its near end does not obstruct entry.
  for (let z = 8; z >= -130; z -= 14) {
    const points = [];
    for (let k = 0; k <= 32; k++) {
      const a = (k / 32) * Math.PI;
      points.push([Math.cos(a) * 77, 8 + Math.sin(a) * 43, z]);
    }
    tube(points, 0.18, gold, 64);
    tube(
      points.map(([x, y, z]) => [x, y - 0.3, z]),
      0.055,
      warm,
      64,
    );
    for (const side of [-1, 1])
      batch(cylinder, gold, [side * 77, 4, z], [0.2, 8, 0.2]);
    yield;
  }
  for (const angle of [
    0.28,
    0.6,
    0.95,
    Math.PI / 2,
    Math.PI - 0.95,
    Math.PI - 0.6,
    Math.PI - 0.28,
  ]) {
    const x = Math.cos(angle) * 77,
      y = 8 + Math.sin(angle) * 43;
    tube(
      [
        [x, y, 8],
        [x, y, -130],
      ],
      0.11,
      gold,
      4,
    );
  }
  // Curved sector counters and small furniture form clear public aisles.
  const blockers = [];
  for (const sector of SQUISH_SECTORS) {
    const { x, z, colour } = sector,
      colourMat = mat({ color: colour, roughness: 0.23, clearcoat: 1 });
    batch(cylinder, gold, [x, -0.14, z], [9, 0.34, 9]);
    batch(cylinder, colourMat, [x, 0.06, z], [8.8, 0.08, 8.8]);
    ring(x, 0.14, z, 8.7, warm, 0.05);
    // Three shelves behind the local interaction, never across its front approach.
    for (let tier = 0; tier < 3; tier++) {
      batch(box, cream, [x, 2 + tier * 2.4, z - 7.8], [15, 0.23, 2.4]);
      batch(box, gold, [x, 1.8 + tier * 2.4, z - 6.58], [15, 0.12, 0.09]);
      batch(box, neon, [x, 1.68 + tier * 2.4, z - 6.55], [14.7, 0.045, 0.035]);
    }
    for (const side of [-1, 1])
      batch(box, gold, [x + side * 7.4, 3.8, z - 8], [0.16, 7.6, 2.4]);
    // Curved overhead portal and luminous sector identity.
    const pts = [];
    for (let k = 0; k <= 20; k++) {
      const a = (k / 20) * Math.PI;
      pts.push([x + Math.cos(a) * 9.6, 6 + Math.sin(a) * 5, z - 9.3]);
    }
    tube(pts, 0.14, gold);
    tube(
      pts.map(([x, y, z]) => [x, y + 0.2, z]),
      0.05,
      neon,
    );
    sign(sector.icon, x, 11.8, z - 9.1, 16, 3.1);
    blockers.push({ x, z: z - 7.8, w: 15, d: 2.6, h: 7.6 });
    // Side pedestal bowls, towels and tactile beads have the same authored palette.
    for (const side of [-1, 1]) {
      batch(cylinder, gold, [x + side * 6, 1, z + 2], [1.5, 2, 1.5]);
      batch(cylinder, white, [x + side * 6, 2.06, z + 2], [1.6, 0.15, 1.6]);
      ring(x + side * 6, 2.18, z + 2, 1.5, warm, 0.045);
      for (let i = 0; i < 4; i++)
        batch(
          sphere,
          colourMat,
          [
            x + side * 6 + ((i % 2) - 0.5) * 0.75,
            2.45,
            z + 2 + (Math.floor(i / 2) - 0.5) * 0.7,
          ],
          [0.36, 0.3, 0.34],
        );
    }
    yield;
  }
  // Central paw-shaped glass counter is a collection display, never a live cat.
  for (const [x, z, r] of [
    [0, -28, 4.6],
    [-5, -23, 1.9],
    [-1.8, -21, 2],
    [1.8, -21, 2],
    [5, -23, 1.9],
  ]) {
    batch(cylinder, gold, [x, 1, z], [r, 2, r]);
    batch(cylinder, glass, [x, 2.6, z], [r, 0.95, r]);
    ring(x, 3.08, z, r, warm, 0.07);
  }
  sign("CHICHI SQUISH WAREHOUSE", 0, 23, -118, 62, 7);
  sign("MEGA SQUISH COLLECTION", 0, 17, -118, 37, 4.4);
  // Multi-storey curved collection walls extend into the unchanged giant shell.
  for (const side of [-1, 1])
    for (let section = 0; section < 5; section++) {
      const x = side * (90 + section * 28),
        z = -65;
      for (let tier = 0; tier < 5; tier++) {
        batch(box, cream, [x, 4 + tier * 5, z], [25, 0.35, 4.5]);
        batch(box, gold, [x, 3.6 + tier * 5, z + 2.3], [25, 0.18, 0.13]);
        batch(box, neon, [x, 3.35 + tier * 5, z + 2.38], [24.8, 0.08, 0.06]);
      }
      for (const dx of [-12, 12])
        batch(box, gold, [x + dx, 12, z], [0.24, 24, 4.6]);
      yield;
    }
  // One shared low-poly shelf toy template; foreground interactives retain their
  // full physical skin. These are collectible props, never approved cat actors.
  const body = new T.SphereGeometry(1, 18, 12);
  body.scale(0.65, 0.5, 0.48);
  body.translate(0, 0.52, 0);
  const parts = [body];
  for (const side of [-1, 1]) {
    const e = new T.ConeGeometry(0.19, 0.46, 3, 1);
    e.rotateY(Math.PI / 6);
    e.scale(1, 1, 0.65);
    e.translate(side * 0.4, 1.0, 0);
    parts.push(e);
  }
  const toyGeo = g(mergeGeometries(parts));
  parts.forEach((g) => g.dispose());
  const eyes = [];
  for (const side of [-1, 1]) {
    const curve = new T.CatmullRomCurve3([
      new T.Vector3(side * 0.22 - 0.08, 0.58, 0.455),
      new T.Vector3(side * 0.22, 0.63, 0.47),
      new T.Vector3(side * 0.22 + 0.08, 0.58, 0.455),
    ]);
    eyes.push(new T.TubeGeometry(curve, 6, 0.018, 4, false));
  }
  const mouth = new T.SphereGeometry(0.035, 8, 6);
  mouth.scale(1, 0.65, 0.5);
  mouth.translate(0, 0.48, 0.49);
  eyes.push(mouth);
  const faceGeo = g(mergeGeometries(eyes));
  eyes.forEach((g) => g.dispose());
  const toyMat = mat({ color: 0xffffff, roughness: 0.29, clearcoat: 1 }),
    faceMat = mat({ color: 0x572743, roughness: 0.4 });
  const placements = [];
  for (const s of SQUISH_SECTORS)
    for (let tier = 0; tier < 3; tier++)
      for (let row = 0; row < 2; row++)
        for (let j = 0; j < 17; j++)
          placements.push([
            s.x + (j - 8) * 0.83,
            2.13 + tier * 2.4,
            s.z - 7.25 - row * 1.08,
            0.58 + (j % 3) * 0.06,
          ]);
  for (const side of [-1, 1])
    for (let section = 0; section < 5; section++)
      for (let tier = 0; tier < 5; tier++)
        for (let j = 0; j < 24; j++)
          placements.push([
            side * (90 + section * 28) + (j - 11.5),
            4.2 + tier * 5,
            -62.9,
            0.85,
          ]);
  const toys = new T.InstancedMesh(toyGeo, toyMat, placements.length),
    faces = new T.InstancedMesh(faceGeo, faceMat, placements.length),
    dummy = new T.Object3D(),
    col = new T.Color();
  toys.name = "Static collectables · shared immutable body instances";
  faces.name = "Static collectables · smile instances";
  const visualLOD = bindSquishVisualLOD([toys, faces]);
  const palette = [0xffccdf, 0xffde9b, 0xb7b5ff, 0xabe8e3, 0xffa9d8, 0xffe3d1];
  for (let i = 0; i < placements.length; i++) {
    const [x, y, z, s] = placements[i];
    dummy.position.set(x, y, z);
    dummy.scale.setScalar(s);
    dummy.rotation.y = Math.sin(i * 3.7) * 0.16;
    dummy.updateMatrix();
    toys.setMatrixAt(i, dummy.matrix);
    faces.setMatrixAt(i, dummy.matrix);
    toys.setColorAt(i, col.setHex(palette[i % palette.length]));
    if (i % 160 === 0) yield;
  }
  toys.castShadow = true;
  toys.receiveShadow = true;
  faces.castShadow = true;
  root.add(toys, faces);
  // Hanging jewel/jelly lanterns and cat-shaped plush balloons.
  for (let i = 0; i < 18; i++) {
    const x = ((i % 6) - 2.5) * 23,
      z = -15 - Math.floor(i / 6) * 38,
      y = 26 + (i % 3) * 4;
    batch(sphere, i % 2 ? pink : violet, [x, y, z], [1.8, 1.3, 1.65]);
    for (const side of [-1, 1])
      batch(
        g(new T.ConeGeometry(0.5, 1.2, 3)),
        pink,
        [x + side * 0.95, y + 1.2, z],
        [1, 1, 0.7],
      );
    tube(
      [
        [x, y + 1.3, z],
        [x, 50, z],
      ],
      0.025,
      gold,
      2,
    );
    ring(x, y - 1, z, 1.8, neon, 0.06);
    for (let j = 0; j < 5; j++)
      tube(
        [
          [x + (j - 2) * 0.55, y - 0.8, z],
          [x + (j - 2) * 0.65 + 0.25, y - 3, z + 0.2],
          [x + (j - 2) * 0.5, y - 4, z],
        ],
        0.035,
        warm,
        16,
      );
  }
  yield;
  // Finish fixed static draws by material. Tubes do not each cost a draw.
  const mergedByMaterial = new Map();
  for (const b of batches.values()) {
    let group = mergedByMaterial.get(b.material);
    if (!group) mergedByMaterial.set(b.material, (group = []));
    for (const matrix of b.matrices) {
      const copy = b.geometry.clone();
      copy.applyMatrix4(matrix);
      group.push(copy);
    }
    yield;
  }
  for (const [material, parts] of mergedByMaterial) {
    const geometry = g(mergeGeometries(parts));
    parts.forEach((p) => p.dispose());
    const m = new T.Mesh(geometry, material);
    m.name = "Warehouse static architectural material batch";
    m.castShadow = m.receiveShadow = !material.transparent;
    root.add(m);
    yield;
  }
  root.userData = {
    blockers,
    sectors: SQUISH_SECTORS,
    collectables: placements.length,
    environment: env,
    update(dt) {
      visualLOD.update(dt);
    },
    dispose() {
      visualLOD.dispose();
      root.removeFromParent();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
  return root;
}
