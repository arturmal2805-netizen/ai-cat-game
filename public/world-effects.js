import * as THREE from "three";
import { material } from "./world-assets.js";

// The same 55 spheres, colours, illumination and paths, in three fixed batches.
// Moving the camera changes one group transform; animation changes one clock.
export function createWorldMotes() {
  const root = new THREE.Group(),
    clock = { value: 0 },
    motion = { value: 1 },
    dummy = new THREE.Object3D(),
    geometry = new THREE.SphereGeometry(0.025, 10, 6);
  root.name = "World fireflies · shared GPU animation";
  for (const [first, color] of [0xebcda1, 0xc8b5ed, 0x99d6c4].entries()) {
    const paint = material(color, 0.9).clone(),
      count = Math.ceil((55 - first) / 3),
      mesh = new THREE.InstancedMesh(geometry, paint, count);
    paint.userData.sharedScenery = false;
    paint.onBeforeCompile = (shader) => {
      shader.uniforms.uMoteTime = clock;
      shader.uniforms.uMoteMotion = motion;
      shader.vertexShader =
        "uniform float uMoteTime; uniform float uMoteMotion;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
         float i=float(gl_InstanceID)*3.+${first.toFixed(1)};
         transformed+=uMoteMotion*vec3(
           (sin(i*2.4+uMoteTime*.03)-sin(i*2.4))*10.,
           .3-mod(i,6.)*.01+sin(uMoteTime*.6+i)*.25,
           (cos(i*2.4+uMoteTime*.03)-cos(i*2.4))*10.);`,
        );
    };
    paint.customProgramCacheKey = () => "world-fireflies-v1-" + first;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    for (let j = 0; j < count; j++) {
      const i = first + j * 3;
      dummy.position.set(
        Math.sin(i * 2.4) * 10,
        0.5 + (i % 6) * 0.25,
        Math.cos(i * 2.4) * 10,
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(j, dummy.matrix);
    }
    root.add(mesh);
  }
  root.userData.update = (time, look, reduced = false) => {
    clock.value = reduced ? 0 : time;
    motion.value = reduced ? 0 : 1;
    root.position.set(reduced ? 0 : look.x, 0, reduced ? 0 : look.z);
  };
  root.userData.dispose = () => {
    geometry.dispose();
    for (const m of root.children) m.material.dispose();
  };
  return root;
}
