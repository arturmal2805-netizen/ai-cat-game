import { giantCatGeometry, giantRestHeight } from "./squish-giant.js";
import { FoamImprints } from "./squish-foam.js";
import { bindGpuCage } from "./squish-gpu-cage.js";
import { createSquishPhysicsLOD } from "./squish-physics-lod.js";
import { createCrunchyFiller } from "./squish-crunchy.js";
import { createButterShell } from "./squish-butter.js";
import { createSlimeFilaments } from "./squish-slime.js";
import { createSlimeCoalescence } from "./squish-slime-merge.js";
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
  giant: 0xfff2ec,
};
export function squishSurfaceMaterial(type) {
  const matte = ["cloud", "foam", "giant"].includes(type),
    m = new T.MeshPhysicalMaterial({
      color: colours[type] || colours.jelly,
      roughness: matte
        ? 0.86
        : type === "butter"
          ? 0.33
          : type === "jelly"
            ? 0.085
            : 0.15,
      metalness: 0,
      clearcoat: matte ? 0 : 1,
      clearcoatRoughness: type === "jelly" ? 0.055 : 0.14,
      ior: type === "jelly" ? 1.38 : 1.5,
      sheen: matte ? 0.8 : 0,
      sheenColor: new T.Color(0xffe0ee),
      emissive: colours[type] || colours.jelly,
      emissiveIntensity: matte ? 0.1 : type === "jelly" ? 0.065 : 0.18,
      transparent: ["jelly", "slime", "crunchy"].includes(type),
      opacity:
        type === "jelly"
          ? 0.88
          : ["slime", "crunchy"].includes(type)
            ? 0.68
            : 1,
      depthWrite: true,
    });
  m.onBeforeCompile = (s) => {
    if (type === "cloud" || type === "foam") {
      s.vertexShader =
        "varying vec2 vSquishWoolUV;\n" +
        s.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvSquishWoolUV=uv;",
        );
      s.fragmentShader = "varying vec2 vSquishWoolUV;\n" + s.fragmentShader;
      s.fragmentShader = s.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
      float woolThread=vSquishWoolUV.x*1250.+sin(vSquishWoolUV.y*240.)*2.;float woolFade=1.-smoothstep(1.,5.,fwidth(woolThread));float woolNap=sin(woolThread)*woolFade;float woolUnder=sin(vSquishWoolUV.y*650.)*sin(vSquishWoolUV.x*420.);diffuseColor.rgb*=.98+woolNap*.035+woolUnder*.012;`,
      );
      s.fragmentShader = s.fragmentShader.replace(
        "#include <normal_fragment_begin>",
        "#include <normal_fragment_begin>\nnormal=normalize(normal+vec3(woolNap*.025,woolUnder*.012,0.));",
      );
    }
    if (type === "jelly") {
      // Convex-thickness absorption approximation uses the existing PBR probe.
      // No screen transmission/refraction target, global lighting or renderer
      // setting changes. Bubbles are actual volume-bound internal geometry.
      s.fragmentShader = s.fragmentShader.replace(
        "#include <normal_fragment_begin>",
        `#include <normal_fragment_begin>
        float jellyView=clamp(abs(dot(normal,normalize(vViewPosition))),0.,1.);
        float jellyThickness=4.2*jellyView;
        diffuseColor.rgb*=exp(-vec3(.015,.08,.035)*jellyThickness);
        diffuseColor.a=mix(.58,.94,1.-exp(-jellyThickness*.65));`,
      );
    }
    s.fragmentShader = s.fragmentShader.replace(
      "#include <fog_fragment>",
      T.ShaderChunk.fog_fragment.replace(
        "fogFactor );",
        "min(fogFactor,0.08) );",
      ),
    );
  };
  m.customProgramCacheKey = () => "warehouse-local-squish-pbr-v3-" + type;
  return m;
}
// A new toy prop, never a replacement for an approved live cat mesh.
export function createSquishToy({
  material = "jelly",
  size = null,
  resolution = null,
  shape = null,
} = {}) {
  const pad = material === "foam" && shape !== "cat";
  size ||= pad
    ? [5, 1.4, 4.5]
    : material === "giant"
      ? [14, 9, 14]
      : [5, 4.4, 4.5];
  const giant = material === "giant";
  resolution ||= giant ? [11, 9, 11] : [7, 7, 7];
  const root = new T.Group();
  root.name = "SquishPhysics · " + material;
  root.userData.squishPhysics = true;
  const solver = new SquishSoftBody({ material, size, resolution }),
    meshes = [],
    sources = [],
    effects = [],
    ownedEffectMaterials = [];
  const physicsLOD = createSquishPhysicsLOD(solver);
  const gpuBindings = [];
  let physicsView = {};
  const attach = (geometry, mat, name) => {
    const mesh = new T.Mesh(geometry, mat);
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
    meshes.push(mesh);
    sources.push(geometry.attributes.position.array.slice());
    return mesh;
  };
  const body = giant
    ? giantCatGeometry(size)
    : pad
      ? new T.BoxGeometry(size[0], size[1], size[2], 64, 10, 64)
      : new T.SphereGeometry(
          1,
          ["jelly", "slime"].includes(material) ? 96 : 48,
          ["jelly", "slime"].includes(material) ? 64 : 32,
        );
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
  } else if (!giant) {
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
      g.translate(
        side * size[0] * (giant ? 0.2 : 0.29),
        size[1] * 0.65,
        giant ? size[2] * 0.15 : -0.17,
      );
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
      const front = giant
        ? size[2] * 0.15 +
          size[2] *
            0.24 *
            Math.sqrt(
              Math.max(
                0.01,
                1 -
                  (x / (size[0] * 0.33)) ** 2 -
                  ((y - size[1] * 0.43) / (size[1] * 0.29)) ** 2,
              ),
            )
        : surface;
      fp.setZ(i, front + 0.025 + (fp.getZ(i) - z) * 0.65);
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
    if (giant) {
      const a = cg.attributes.position;
      for (let i = 0; i < a.count; i++)
        a.setZ(
          i,
          size[2] * 0.15 +
            size[2] *
              0.24 *
              Math.sqrt(
                Math.max(
                  0.01,
                  1 -
                    (a.getX(i) / (size[0] * 0.33)) ** 2 -
                    ((a.getY(i) - size[1] * 0.43) / (size[1] * 0.29)) ** 2,
                ),
              ) +
            0.04,
        );
      cg.computeVertexNormals();
    }
    attach(cg, pink, "Pastel cheek marks · surface bound");
  }
  if (material === "cloud") {
    const fleece = squishSurfaceMaterial(material);
    fleece.vertexColors = true;
    const hair = attach(
      cloudFleeceGeometry(size),
      fleece,
      "Dense groomed cloud fleece · same contact cage",
    );
    hair.castShadow = false;
    gpuBindings.push(bindGpuCage(hair, solver));
  }
  if (["jelly", "slime"].includes(material)) {
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
  let butter = null,
    filaments = null,
    coalescence = null;
  if (material === "butter") {
    butter = createButterShell({ root, solver, body: meshes[0], attach });
    effects.push(butter);
  }
  if (material === "slime") {
    const mat = squishSurfaceMaterial("slime");
    ownedEffectMaterials.push(mat);
    const threadMat = mat.clone();
    threadMat.opacity = 0.9;
    threadMat.emissiveIntensity = 0.3;
    threadMat.onBeforeCompile = mat.onBeforeCompile;
    threadMat.customProgramCacheKey = mat.customProgramCacheKey;
    ownedEffectMaterials.push(threadMat);
    filaments = createSlimeFilaments({ root, solver, material: threadMat });
    coalescence = createSlimeCoalescence({ root, material: mat });
    const bowl = new T.Group();
    bowl.name = "Slime merge · supported shallow glass dish";
    bowl.position.set(-3.7, 0.28, 2.9);
    const baseMat = new T.MeshPhysicalMaterial({
        color: 0xffdfef,
        metalness: 0.15,
        roughness: 0.2,
        clearcoat: 1,
      }),
      rimMat = new T.MeshStandardMaterial({
        color: 0xf4cc7d,
        metalness: 0.7,
        roughness: 0.2,
      });
    ownedEffectMaterials.push(baseMat, rimMat);
    const base = new T.Mesh(
        new T.CylinderGeometry(1.65, 1.55, 0.12, 64),
        baseMat,
      ),
      rim = new T.Mesh(new T.TorusGeometry(1.62, 0.065, 8, 64), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.1;
    bowl.add(base, rim);
    root.add(bowl);
    effects.push(filaments, coalescence, {
      update() {},
      reset() {},
      dispose() {
        base.geometry.dispose();
        rim.geometry.dispose();
        root.remove(bowl);
      },
    });
  }
  const foam = pad ? new FoamImprints(size) : null,
    crunchy =
      material === "crunchy" ? createCrunchyFiller({ root, solver }) : null;
  if (crunchy) effects.push(crunchy);
  let lastFoam = -1;
  let lastTime = solver.time;
  let lastStep = -1;
  const scratch = new Float64Array(3);
  const update = (dt) => {
    dt = Number.isFinite(dt) ? dt : Math.max(0, solver.time - lastTime);
    lastTime = solver.time;
    foam?.step(dt, solver.contacts);
    if (lastStep !== solver.revision || (foam && lastFoam !== foam.revision)) {
      lastFoam = foam?.revision ?? -1;
      lastStep = solver.revision;
      for (let n = 0; n < meshes.length; n++) {
        if (meshes[n].userData.squishGpuCage) continue;
        const g = meshes[n].geometry,
          a = g.attributes.position,
          base = sources[n];
        for (let j = 0; j < base.length; j += 3) {
          solver.sample(base[j], base[j + 1], base[j + 2], scratch);
          a.array[j] = scratch[0];
          const topBlend = pad
            ? T.MathUtils.smoothstep(base[j + 1], size[1] * 0.45, size[1] * 0.9)
            : 0;
          // Fine foam relief resolves the remaining contact compression, never
          // adds the same pressure a second time on top of the volume cage.
          const fineDepth = foam
            ? foam.sample(base[j], base[j + 2]) * topBlend
            : 0;
          const coarseDepth = Math.max(0, base[j + 1] - scratch[1]);
          a.array[j + 1] = scratch[1] - Math.max(0, fineDepth - coarseDepth);
          a.array[j + 2] = scratch[2];
        }
        a.needsUpdate = true;
        g.computeVertexNormals();
        g.computeBoundingSphere();
        g.computeBoundingBox();
      }
    }
    for (const binding of gpuBindings) binding.update();
    for (const e of effects) e.update(dt);
  };
  const ray = new T.Raycaster(),
    down = new T.Vector3(0, -1, 0);
  const surfaceInfo = (worldX, worldZ) => {
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
    const hit = hits[0];
    if (!hit) return null;
    return {
      y: hit.point.y,
      point: hit.point,
      normal: hit.face.normal
        .clone()
        .applyMatrix3(new T.Matrix3().getNormalMatrix(hit.object.matrixWorld))
        .normalize(),
      collider: hit.object.uuid,
    };
  };
  const surface = (worldX, worldZ) => surfaceInfo(worldX, worldZ)?.y ?? null;
  root.userData = {
    ...root.userData,
    solver,
    meshes,
    sources,
    update,
    get meshRevision() {
      return lastStep;
    },
    surface,
    surfaceInfo,
    restPoint(hit) {
      const n = meshes.indexOf(hit.object),
        face = hit.face;
      if (n < 0 || !face) return root.worldToLocal(hit.point.clone());
      const geometry = meshes[n].geometry,
        position = geometry.attributes.position;
      const local = hit.object.worldToLocal(hit.point.clone());
      const weights = T.Triangle.getBarycoord(
        local,
        new T.Vector3().fromBufferAttribute(position, face.a),
        new T.Vector3().fromBufferAttribute(position, face.b),
        new T.Vector3().fromBufferAttribute(position, face.c),
        new T.Vector3(),
      );
      if (!weights) return root.worldToLocal(hit.point.clone());
      const base = sources[n],
        point = new T.Vector3();
      for (const [i, w] of [
        [face.a, weights.x],
        [face.b, weights.y],
        [face.c, weights.z],
      ])
        point.addScaledVector(
          new T.Vector3(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]),
          w,
        );
      return point;
    },
    material,
    physicsLOD,
    gpuBindings,
    pickMeshes: meshes.slice(0, pad ? 1 : 2),
    preparePhysics(options) {
      if (options) physicsView = options;
      physicsLOD.prepare(physicsView);
    },
    butter,
    filaments,
    coalescence,
    foam,
    crunchy,
    reset() {
      solver.reset();
      foam?.reset();
      for (const e of effects) e.reset?.();
      update(0);
    },
    restSurfaceHeight(x, z) {
      return giant
        ? giantRestHeight(size, x, z)
        : pad
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
      for (const binding of gpuBindings) binding.dispose();
      for (const e of effects) e.dispose();
      for (const m of ownedEffectMaterials) m.dispose();
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
