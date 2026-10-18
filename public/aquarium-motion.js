import * as THREE from "three";
import { aquariumFishFrame } from "./aquarium-data.js";

// One small pose palette per tank, shared by all five fish batches. Geometry,
// instance matrices and colours stay on the GPU for the life of the tank.
// Picking/cameras use the exact same displayed pose, including when frozen.
export function createFishPalette(tank) {
  const poses = Array.from({ length: tank.fish }, () => ({})),
    place = { value: new Float32Array(tank.fish * 4) },
    heading = { value: new Float32Array(tank.fish * 4) },
    limbs = { value: new Float32Array(tank.fish * 4) },
    visibleIds = { value: Int32Array.from({ length: tank.fish }, (_, i) => i) },
    fish = new THREE.Object3D(),
    local = new THREE.Object3D();
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
    }
  }
  function matrixAt(i, part, matrix) {
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
  update(0, true);
  return { tank, place, heading, limbs, visibleIds, poses, update, matrixAt };
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
      attribute vec2 aFishSurface;
      varying vec2 vFishSurface;
      uniform vec4 uFishPlace[${count}];
      uniform vec4 uFishHeading[${count}];
      uniform vec4 uFishLimbs[${count}];
      uniform int uFishIds[${count}];
      vec3 aquariumPose(vec3 p,bool positionPart){
        int i=uFishIds[gl_InstanceID];
        vec4 h=uFishHeading[i],l=uFishLimbs[i];
        if(aFishPart>.5 && aFishPart<1.5){
          p=vec3(l.x*p.x+l.y*p.z,p.y,-l.y*p.x+l.x*p.z);
          if(positionPart)p+=vec3(0.,0.,-1.3);
        }else if(aFishPart>1.5){
          float signFin=aFishPart<2.5 ? -1. : 1.;
          p=vec3(l.z*p.x-signFin*l.w*p.y,signFin*l.w*p.x+l.z*p.y,p.z);
          p=vec3(.877582562*p.x+signFin*.479425539*p.z,p.y,-signFin*.479425539*p.x+.877582562*p.z);
          p=vec3(p.x,.995004165*p.y-.099833417*p.z,.099833417*p.y+.995004165*p.z);
          if(positionPart)p+=vec3(signFin*.8,-.03,-.25);
        }
        p=vec3(h.z*p.x-h.w*p.y,h.w*p.x+h.z*p.y,p.z);
        p=vec3(h.x*p.x+h.y*p.z,p.y,-h.y*p.x+h.x*p.z);
        return positionPart ? p*uFishPlace[i].w+uFishPlace[i].xyz : p;
      }
    ` +
      shader.vertexShader
        .replace(
          "#include <beginnormal_vertex>",
          "#include <beginnormal_vertex>\nobjectNormal=aquariumPose(objectNormal,false);",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\ntransformed=aquariumPose(transformed,true);vFishSurface=aFishSurface;",
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
  material.customProgramCacheKey = () => key + "-fish-palette-v3-" + count;
  return material;
}
