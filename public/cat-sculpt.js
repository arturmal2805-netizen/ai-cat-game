import * as THREE from "three";
import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
const sculptCache = new Map();
export function velvetCoat(material, bare = false) {
  if (bare) return material;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader =
      "varying vec3 coatPoint;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ncoatPoint=position;",
      );
    shader.fragmentShader =
      "varying vec3 coatPoint;\n" +
      shader.fragmentShader
        .replace(
          "#include <color_fragment>",
          "#include <color_fragment>\nfloat fibre=fract(sin(dot(coatPoint*240.0,vec3(12.9898,78.233,39.425)))*43758.5453);float strand=sin(coatPoint.y*620.0+sin(coatPoint.x*140.0)*3.0+coatPoint.z*85.0);diffuseColor.rgb*=.96+fibre*.055+strand*.018;",
        )
        .replace(
          "#include <normal_fragment_begin>",
          "#include <normal_fragment_begin>\nnormal=normalize(normal+vec3((fibre-.5)*.035,strand*.025,0.0));",
        );
  };
  material.customProgramCacheKey = () => "living-velvet-fibres-v1";
  return material;
}

// A continuous sculpted surface: brow, eye sockets, whisker pads and tapered
// shoulders are vertices of one mesh rather than a pile of visible spheres.
export function sculptedCoat(kind, detailed, appearance) {
  const key = kind + ":" + detailed;
  if (!sculptCache.has(key)) {
    const size = detailed ? 44 : 28,
      domain = 1.38;
    const clay = new MarchingCubes(
      size,
      new THREE.MeshBasicMaterial(),
      false,
      false,
      20000,
    );
    clay.isolation = 0;
    const volumes =
      kind === "face"
        ? [
            [0, 0.04, -0.07, 0.94, 0.9, 0.87],
            [-0.54, -0.3, 0.06, 0.43, 0.4, 0.65],
            [0.54, -0.3, 0.06, 0.43, 0.4, 0.65],
            [-0.23, -0.43, 0.78, 0.31, 0.23, 0.26],
            [0.23, -0.43, 0.78, 0.31, 0.23, 0.26],
            [0, -0.57, 0.62, 0.4, 0.2, 0.3],
          ]
        : [
            [0, 0, -0.07, 0.88, 0.92, 0.94],
            [0, 0.26, 0.48, 0.75, 0.88, 0.6],
            [-0.47, -0.24, -0.48, 0.46, 0.63, 0.51],
            [0.47, -0.24, -0.48, 0.46, 0.63, 0.51],
          ];
    const soft = 0.14;
    for (let z = 0; z < size; z++)
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const px = ((x / size) * 2 - 1) * domain,
            py = ((y / size) * 2 - 1) * domain,
            pz = ((z / size) * 2 - 1) * domain;
          let distance = 10;
          for (const [cx, cy, cz, rx, ry, rz] of volumes) {
            const dx = (px - cx) / rx,
              dy = (py - cy) / ry,
              dz = (pz - cz) / rz;
            const d = (Math.hypot(dx, dy, dz) - 1) * Math.min(rx, ry, rz);
            const h = Math.max(soft - Math.abs(distance - d), 0) / soft;
            distance = Math.min(distance, d) - h * h * soft * 0.25;
          }
          clay.field[x + y * size + z * size * size] = -distance;
        }
    clay.update();
    const surface = new THREE.BufferGeometry();
    surface.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        clay.geometry.attributes.position.array.slice(0, clay.count * 3),
        3,
      ),
    );
    surface.scale(domain, domain, domain);
    const smooth = mergeVertices(surface, 0.0001);
    surface.dispose();
    clay.geometry.dispose();
    clay.material.dispose();
    smooth.computeVertexNormals();
    sculptCache.set(key, smooth);
  }
  const geometry = sculptCache.get(key).clone();
  return paintCoat(geometry, appearance, kind);
}
export function paintCoat(geometry, appearance, region = "body") {
  const p = geometry.attributes.position,
    colors = [];
  const base = new THREE.Color(0xffffff),
    patch = new THREE.Color(0xd28b4e),
    light = new THREE.Color(0xf6eddd);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const color = base.clone();
    let shade = 0.96 + y * 0.035;
    if (appearance.fur !== "bare")
      shade +=
        Math.sin(x * 181 + y * 139 + z * 153) *
        Math.sin(z * 137 - y * 171) *
        0.018;
    if (["tabby", "cheshire"].includes(appearance.pattern)) {
      const stripe = Math.sin(z * 16 + y * 4 + Math.abs(x) * 6);
      if (stripe > 0.72 && (region !== "face" || y > 0.23))
        shade *= appearance.pattern === "cheshire" ? 0.68 : 0.78;
    }
    if (appearance.pattern === "rosettes") {
      const spot = Math.sin(z * 13 + y * 2) * Math.sin(y * 11 + x * 5);
      if (region !== "face" || y > 0.2) {
        if (spot > 0.52 && spot < 0.88) shade *= 0.5;
        else if (spot >= 0.88) shade *= 0.82;
      }
    }
    if (appearance.pattern === "ticked")
      shade *= 0.86 + Math.sin(y * 44 + z * 38 + x * 29) * 0.08;
    if (appearance.fur === "curly")
      shade *=
        0.92 + Math.sin(x * 30 + Math.sin(y * 23)) * Math.cos(z * 26) * 0.07;
    if (appearance.pattern === "point") {
      if (region === "ear" || region === "paw" || region === "tail")
        shade *= 0.45;
      if (region === "face" && y < 0.25 && z > 0.45)
        shade *= 0.55 + Math.abs(x) * 0.1;
    }
    if (appearance.pattern === "tuxedo" && (y < -0.25 || region === "paw"))
      color.copy(light);
    if (appearance.whitePaws && region === "paw" && y < -0.24)
      color.copy(light);
    if (appearance.pattern === "calico") {
      const patchField = Math.sin(x * 4 + z * 2.5) + Math.sin(y * 5 - z * 3);
      if (patchField > 0.85) color.copy(patch);
      else if (patchField < -1.05) shade *= 0.3;
    }
    color.multiplyScalar(shade);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}
export function taperedLeg(detailed, appearance) {
  const curve = new THREE.SplineCurve([
    new THREE.Vector2(0, -0.405),
    new THREE.Vector2(0.1, -0.37),
    new THREE.Vector2(0.105, -0.24),
    new THREE.Vector2(0.14, -0.09),
    new THREE.Vector2(0.155, 0.08),
    new THREE.Vector2(0.1, 0.16),
    new THREE.Vector2(0, 0.18),
  ]);
  return paintCoat(
    new THREE.LatheGeometry(
      curve.getPoints(detailed ? 24 : 12),
      detailed ? 24 : 12,
    ),
    appearance,
    "paw",
  );
}
