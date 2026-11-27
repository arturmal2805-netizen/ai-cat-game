import { cloudFleeceGeometry } from "./squish-cloud-geometry.js";
import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { SquishSoftBody } from "./squish-soft-body.js";
const colours = {
  jelly: 0xff75c9,
  butter: 0xffd479,
  slime: 0x9d7aff,
  cloud: 0xffd5ee,
  foam: 0xda8bbf,
  crunchy: 0xff94d5,
  mochi: 0xffcfdf,
  giant: 0xffdccd,
};
export function squishSurfaceMaterial(type) {
  const matte = ["cloud", "foam", "giant"].includes(type),
    m = new T.MeshPhysicalMaterial({
      color: colours[type] || colours.jelly,
      roughness: matte ? 0.86 : type === "butter" ? 0.33 : 0.15,
      metalness: 0,
      clearcoat: matte ? 0 : 1,
      clearcoatRoughness: 0.14,
      sheen: matte ? 0.8 : 0,
      sheenColor: new T.Color(0xffe0ee),
      emissive: colours[type] || colours.jelly,
      emissiveIntensity: matte ? 0.1 : 0.18,
      transparent: ["jelly", "slime", "crunchy"].includes(type),
      opacity: ["jelly", "slime", "crunchy"].includes(type) ? 0.68 : 1,
      depthWrite: true,
    });
  m.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace(
      "#include <fog_fragment>",
      T.ShaderChunk.fog_fragment.replace(
        "fogFactor );",
        "min(fogFactor,0.08) );",
      ),
    );
  };
  m.customProgramCacheKey = () => "warehouse-local-squish-pbr-v1";
  return m;
}
// A new toy prop, never a replacement for an approved live cat mesh.
export function createSquishToy({
  material = "jelly",
  size = null,
  resolution = [7, 7, 7],
} = {}) {
  size ||= material === "foam" ? [5, 1.4, 4.5] : [5, 4.4, 4.5];
  const pad = material === "foam";
  const root = new T.Group();
  root.name = "SquishPhysics · " + material;
  root.userData.squishPhysics = true;
  const solver = new SquishSoftBody({ material, size, resolution }),
    meshes = [],
    sources = [];
  const attach = (geometry, mat, name) => {
    const mesh = new T.Mesh(geometry, mat);
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
    meshes.push(mesh);
    sources.push(geometry.attributes.position.array.slice());
    return mesh;
  };
  const body = pad
    ? new T.BoxGeometry(size[0], size[1], size[2], 24, 10, 24)
    : new T.SphereGeometry(1, 48, 32);
  if (pad) {
    const a = body.attributes.position,
      r = 0.27;
    for (let i = 0; i < a.count; i++) {
      const x = a.getX(i),
        y = a.getY(i),
        z = a.getZ(i),
        cx = T.MathUtils.clamp(x, -size[0] / 2 + r, size[0] / 2 - r),
        cy = T.MathUtils.clamp(y, -size[1] / 2 + r, size[1] / 2 - r),
        cz = T.MathUtils.clamp(z, -size[2] / 2 + r, size[2] / 2 - r),
        v = new T.Vector3(x - cx, y - cy, z - cz).normalize().multiplyScalar(r);
      a.setXYZ(i, cx + v.x, cy + v.y + size[1] / 2, cz + v.z);
    }
    body.computeVertexNormals();
  } else {
    body.scale(size[0] * 0.49, size[1] * 0.37, size[2] * 0.49);
    body.translate(0, size[1] * 0.38, 0);
  }
  attach(
    body,
    squishSurfaceMaterial(material),
    "Soft cat body · volumetric cage skin",
  );
  if (!pad) {
    const earGeos = [];
    for (const side of [-1, 1]) {
      const shape = new T.Shape();
      shape.moveTo(-0.58, 0);
      shape.quadraticCurveTo(-0.62, 0.12, -0.42, 0.42);
      shape.lineTo(-0.08, 1.02);
      shape.quadraticCurveTo(0, 1.16, 0.12, 1.03);
      shape.lineTo(0.59, 0.12);
      shape.quadraticCurveTo(0.66, -0.02, 0.46, -0.05);
      shape.closePath();
      const g = new T.ExtrudeGeometry(shape, {
        depth: 0.42,
        bevelEnabled: true,
        bevelThickness: 0.11,
        bevelSize: 0.11,
        bevelSegments: 4,
        curveSegments: 16,
      });
      g.scale(size[0] / 5, size[1] / 4.4, size[2] / 4.5);
      g.translate(side * size[0] * 0.29, size[1] * 0.65, -0.17);
      earGeos.push(g);
    }
    const ear = mergeGeometries(earGeos);
    earGeos.forEach((g) => g.dispose());
    attach(
      ear,
      squishSurfaceMaterial(material),
      "Independent rounded triangular cat ears",
    );
    const dark = new T.MeshStandardMaterial({
        color: 0x542c51,
        roughness: 0.4,
        emissive: 0x542c51,
        emissiveIntensity: 0.2,
      }),
      pink = new T.MeshStandardMaterial({
        color: 0xf067b8,
        roughness: 0.5,
        emissive: 0x8d275e,
        emissiveIntensity: 0.15,
      });
    const face = [];
    const curve = (points, r = 0.025) => {
      const c = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)));
      face.push(new T.TubeGeometry(c, 16, r, 6, false));
    };
    const y = size[1] * 0.47,
      z = size[2] * 0.463;
    for (const side of [-1, 1]) {
      const x = side * size[0] * 0.19;
      curve(
        [
          [x - 0.22, y - 0.01, z],
          [x - 0.13, y + 0.1, z + 0.025],
          [x, y + 0.15, z + 0.04],
          [x + 0.13, y + 0.1, z + 0.025],
          [x + 0.22, y - 0.01, z],
        ],
        0.045,
      );
    }
    const nose = new T.SphereGeometry(0.09, 12, 8);
    nose.scale(1, 0.65, 0.5);
    nose.translate(0, y - 0.15, z + 0.08);
    face.push(nose);
    for (const side of [-1, 1])
      curve(
        [
          [0, y - 0.18, z + 0.08],
          [side * 0.14, y - 0.32, z + 0.09],
          [side * 0.28, y - 0.25, z + 0.05],
        ],
        0.033,
      );
    const f = mergeGeometries(face);
    face.forEach((g) => g.dispose());
    const fp = f.attributes.position;
    for (let i = 0; i < fp.count; i++) {
      const x = fp.getX(i),
        y = fp.getY(i),
        surface =
          size[2] *
          0.49 *
          Math.sqrt(
            Math.max(
              0.01,
              1 -
                (x / (size[0] * 0.49)) ** 2 -
                ((y - size[1] * 0.38) / (size[1] * 0.37)) ** 2,
            ),
          );
      fp.setZ(i, surface + 0.025 + (fp.getZ(i) - z) * 0.65);
    }
    f.computeVertexNormals();
    attach(f, dark, "Smile eyes and nose · surface bound");
    const cheeks = [];
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const g = new T.SphereGeometry(1, 8, 6);
        g.scale(0.14, 0.018, 0.015);
        g.rotateZ(side * 0.2);
        g.translate(
          side * (size[0] * 0.28),
          y - 0.25 - i * 0.09,
          size[2] * 0.407,
        );
        cheeks.push(g);
      }
    const cg = mergeGeometries(cheeks);
    cheeks.forEach((g) => g.dispose());
    attach(cg, pink, "Pastel cheek marks · surface bound");
  }
  if (material === "cloud") {
    attach(
      cloudFleeceGeometry(size),
      squishSurfaceMaterial(material),
      "Soft opaque cloud fleece · same contact cage",
    );
  }
  if (["jelly", "slime", "crunchy"].includes(material)) {
    const inclusions = [];
    for (let i = 0; i < 32; i++) {
      const angle = i * 2.399963,
        r = 0.15 + Math.sqrt((i % 11) / 11) * size[0] * 0.25,
        y = 0.3 + ((i % 7) / 7) * size[1] * 0.55,
        g = new T.SphereGeometry(0.035 + (i % 3) * 0.025, 8, 6);
      g.translate(Math.cos(angle) * r, y, Math.sin(angle) * r * 0.7);
      inclusions.push(g);
    }
    const g = mergeGeometries(inclusions);
    inclusions.forEach((g) => g.dispose());
    attach(
      g,
      new T.MeshStandardMaterial({
        color: 0xffe3f7,
        roughness: 0.16,
        metalness: 0.3,
        emissive: 0xe4a2ff,
        emissiveIntensity: 0.4,
      }),
      "Floating jelly inclusions · same deformation",
    );
  }
  let lastStep = -1;
  const scratch = new Float64Array(3);
  const update = () => {
    if (lastStep === solver.steps) return;
    lastStep = solver.steps;
    for (let n = 0; n < meshes.length; n++) {
      const g = meshes[n].geometry,
        a = g.attributes.position,
        base = sources[n];
      for (let j = 0; j < base.length; j += 3) {
        solver.sample(base[j], base[j + 1], base[j + 2], scratch);
        a.array[j] = scratch[0];
        a.array[j + 1] = scratch[1];
        a.array[j + 2] = scratch[2];
      }
      a.needsUpdate = true;
      g.computeVertexNormals();
      g.computeBoundingSphere();
      g.computeBoundingBox();
    }
  };
  const ray = new T.Raycaster(),
    down = new T.Vector3(0, -1, 0);
  const surface = (worldX, worldZ) => {
    root.updateWorldMatrix(true, true);
    ray.set(
      new T.Vector3(
        worldX,
        root.getWorldPosition(new T.Vector3()).y + size[1] + 2,
        worldZ,
      ),
      down,
    );
    const hits = ray.intersectObjects(meshes.slice(0, pad ? 1 : 2), false);
    return hits[0]?.point.y ?? null;
  };
  root.userData = {
    ...root.userData,
    solver,
    meshes,
    sources,
    update,
    surface,
    material,
    restSurfaceHeight(x, z) {
      return pad
        ? size[1]
        : size[1] * 0.38 +
            size[1] *
              0.37 *
              Math.sqrt(
                Math.max(
                  0,
                  1 - (x / (size[0] * 0.49)) ** 2 - (z / (size[2] * 0.49)) ** 2,
                ),
              );
    },
    dispose() {
      const materials = new Set();
      for (const m of meshes) {
        m.geometry.dispose();
        materials.add(m.material);
      }
      materials.forEach((m) => m.dispose());
      root.removeFromParent();
    },
  };
  return root;
}
