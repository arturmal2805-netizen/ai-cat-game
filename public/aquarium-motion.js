import * as THREE from "three";
import { aquariumFishFrame } from "./aquarium-data.js";
const PARTS = ["body", "tail", "leftFin", "rightFin"];

// One small pose palette per tank, shared by all five fish batches. Geometry,
// instance matrices and colours stay on the GPU for the life of the tank.
// Picking/cameras use the exact same displayed pose, including when frozen.
export function createFishPalette(tank) {
  const poses = Array.from({ length: tank.fish }, () => ({})),
    place = { value: new Float32Array(tank.fish * 4) },
    heading = { value: new Float32Array(tank.fish * 4) },
    limbs = { value: new Float32Array(tank.fish * 4) },
    rows = { value: new Float32Array(tank.fish * 4 * 12) },
    visibleIds = { value: Int32Array.from({ length: tank.fish }, (_, i) => i) },
    fish = new THREE.Object3D(),
    local = new THREE.Object3D(),
    matrices = Array.from({ length: tank.fish * 4 }, () => new THREE.Matrix4());
  let shownTime = NaN,
    shownReduced;
  function update(time, reduced = false) {
    const t = reduced ? 0 : time;
    if (t === shownTime && reduced === shownReduced) return;
    shownTime = t;
    shownReduced = reduced;
    for (let i = 0; i < tank.fish; i++) {
      const f = aquariumFishFrame(tank, i, t, poses[i]),
        k = i * 4,
        roll = Math.sin(t * 0.7 + i) * 0.025;
      f.roll = reduced ? 0 : roll;
      if (reduced) f.tail = f.fin = 0;
      const p = place.value,
        h = heading.value,
        l = limbs.value;
      p[k] = f.x;
      p[k + 1] = f.y;
      p[k + 2] = f.z;
      p[k + 3] = f.scale;
      h[k] = Math.cos(f.yaw);
      h[k + 1] = Math.sin(f.yaw);
      h[k + 2] = Math.cos(f.roll);
      h[k + 3] = Math.sin(f.roll);
      l[k] = Math.cos(f.tail);
      l[k + 1] = Math.sin(f.tail);
      l[k + 2] = Math.cos(0.4 + f.fin);
      l[k + 3] = Math.sin(0.4 + f.fin);
      for (let part = 0; part < PARTS.length; part++) {
        const matrix = matrices[i * 4 + part];
        poseMatrix(i, PARTS[part], matrix);
        const e = matrix.elements,
          offset = (i * 4 + part) * 12;
        for (let row = 0; row < 3; row++) {
          rows.value[offset + row * 4] = e[row] / f.scale;
          rows.value[offset + row * 4 + 1] = e[4 + row] / f.scale;
          rows.value[offset + row * 4 + 2] = e[8 + row] / f.scale;
          rows.value[offset + row * 4 + 3] = e[12 + row];
        }
      }
    }
  }
  function poseMatrix(i, part, matrix) {
    const f = poses[i];
    fish.position.set(f.x, f.y, f.z);
    fish.rotation.set(0, f.yaw, f.roll);
    fish.scale.setScalar(f.scale);
    fish.updateMatrix();
    if (part === "body") return matrix.copy(fish.matrix);
    if (part === "tail") {
      local.position.set(0, 0, -1.3);
      local.rotation.set(0, f.tail, 0);
    } else {
      const sign = part === "leftFin" ? -1 : 1;
      local.position.set(sign * 0.8, -0.03, -0.25);
      local.rotation.set(0.1, sign * 0.5, sign * (0.4 + f.fin));
    }
    local.updateMatrix();
    return matrix.multiplyMatrices(fish.matrix, local.matrix);
  }
  function matrixAt(i, part, matrix) {
    return matrix.copy(matrices[i * 4 + PARTS.indexOf(part)]);
  }
  update(0, true);
  return {
    tank,
    place,
    heading,
    limbs,
    rows,
    visibleIds,
    poses,
    update,
    matrixAt,
  };
}

export function applyFishMotion(material, palette) {
  const previous = material.onBeforeCompile,
    key = material.customProgramCacheKey(),
    count = palette.tank.fish;
  material.onBeforeCompile = function (shader, ...args) {
    previous.call(this, shader, ...args);
    Object.assign(shader.uniforms, {
      uFishPlace: palette.place,
      uFishHeading: palette.heading,
      uFishLimbs: palette.limbs,
      uFishRows: palette.rows,
      uFishIds: palette.visibleIds,
    });
    shader.vertexShader =
      `
      // The pose palette already places each complete fish. Native instance
      // matrices are all identity; applying their position/normal transforms
      // again needlessly fetches 16 attributes and repeats work per vertex.
      #undef USE_INSTANCING
      #undef USE_INSTANCING_COLOR
      attribute float aFishPart;
      attribute float aFishSurface;
      varying vec2 vFishSurface;
      uniform vec4 uFishPlace[${count}];
      uniform vec4 uFishHeading[${count}];
      uniform vec4 uFishLimbs[${count}];
      uniform vec4 uFishRows[${count * 4 * 3}];
      uniform int uFishIds[${count}];
      vec3 aquariumPose(vec3 p,bool positionPart){
        int i=uFishIds[gl_InstanceID];
        int joint=(i*4+int(aFishPart+.5))*3;
        vec4 a=uFishRows[joint],b=uFishRows[joint+1],c=uFishRows[joint+2];
        vec3 rotated=vec3(dot(a.xyz,p),dot(b.xyz,p),dot(c.xyz,p));
        return positionPart ? rotated*uFishPlace[i].w+vec3(a.w,b.w,c.w) : rotated;
      }
    ` +
      shader.vertexShader
        .replace(
          "#include <beginnormal_vertex>",
          "#include <beginnormal_vertex>\nobjectNormal=aquariumPose(objectNormal,false);",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\ntransformed=aquariumPose(transformed,true);vFishSurface=aFishSurface>.5?vec2(.16,.025):vec2(.68,0.);",
        );
    shader.fragmentShader =
      "varying vec2 vFishSurface;\n" +
      shader.fragmentShader
        .replace(
          "#include <roughnessmap_fragment>",
          "#include <roughnessmap_fragment>\nroughnessFactor=vFishSurface.x;",
        )
        .replace(
          "#include <metalnessmap_fragment>",
          "#include <metalnessmap_fragment>\nmetalnessFactor=vFishSurface.y;",
        );
  };
  material.customProgramCacheKey = () => key + "-fish-palette-v4-" + count;
  return material;
}
