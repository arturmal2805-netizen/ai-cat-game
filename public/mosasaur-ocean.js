import {createMosaFish} from './mosasaur-fish.js';
import {mosaCoralSteps} from './mosasaur-corals.js';
import {mosaMarineLifeSteps} from './mosasaur-marine-life.js';
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { applyUnderwaterLighting } from "./water-shading.js";
import { shape } from "./fantasy-scenery.js";
import { batchModelSteps } from "./model-batching.js";
import { MOSA_SEA, mosaBedY } from "./mosasaur-data.js";
// Everything is procedural and shared: three fish schools, one ray mesh and
// two batched seabed material families. No extra textures or scene render pass.
export function* deepOceanSteps() {
  const root = new THREE.Group(),
    clock = { value: 0 },
    schools = [],
    props = new THREE.Group();
  root.name = "Deep blue grotto, fish schools and sun shafts";
  const fish=createMosaFish({deep:true});root.add(fish);root.userData.tropicalFish=fish;
  for (let i = 0; i < 36; i++) {
    yield;
    const a = i * 2.399,
      r = 8 + (i % 7) * 1.2,
      x = Math.sin(a) * r,
      z = Math.cos(a) * r;
    shape(
      props,
      "stone",
      [0x3f7991, 0x578a98, 0x547689][i % 3],
      x,
      mosaBedY(x,z) + 0.6,
      z,
      0.7 + (i % 3) * 0.3,
      0.7,
      0.7,
    );
    for (let j = 0; j < 3; j++) {
      const coral = shape(
        props,
        "petal",
        [0x76c2bd, 0xa98cc4, 0x6cabc2][i % 3],
        x + (j - 1) * 0.2,
        mosaBedY(x,z) + 1.1,
        z,
        0.13,
        0.6 + j * 0.08,
        0.15,
      );
      coral.rotation.z = (j - 1) * 0.35;
    }
  }
  const baked = yield* batchModelSteps(props, { combineColors: true });
  root.add(baked);
  props.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  yield;
  const coralGardens=yield* mosaCoralSteps();root.add(coralGardens);
  const marineLife=yield* mosaMarineLifeSteps();root.add(marineLife);
  const positions = [],
    uv = [],
    indices = [];
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4,
      r = 11,
      x = Math.sin(a) * r,
      z = Math.cos(a) * r,
      n = positions.length / 3;
    positions.push(
      x - 0.2,
      0,
      z,
      x + 0.2,
      0,
      z,
      x + 3,
      MOSA_SEA.bedY + 1,
      z - 2,
      x - 3,
      MOSA_SEA.bedY + 1,
      z - 2,
    );
    uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(n, n + 1, n + 2, n, n + 2, n + 3);
  }
  const raysGeometry = new THREE.BufferGeometry();
  raysGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  raysGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  raysGeometry.setIndex(indices);
  const rays = new THREE.Mesh(
    raysGeometry,
    new THREE.ShaderMaterial({
      uniforms: { uTime: clock },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader:
        "varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "varying vec2 vUv;uniform float uTime;void main(){float edge=pow(sin(vUv.x*3.14159),2.);float a=edge*(1.-vUv.y)*(.027+.008*sin(uTime*.5+vUv.y*9.));gl_FragColor=vec4(.2,.65,.85,a);}",
    }),
  );
  rays.name = "Soft underwater sunlight without a render target";
  rays.renderOrder = 1;
  root.add(rays);
  root.userData.drawCalls = 1 + baked.children.length + 1 + coralGardens.children.length;
  root.userData.coralGardens=coralGardens;
  root.userData.update = (time, reduced = false) => {
    clock.value = reduced ? 0 : time;
    coralGardens.userData.update(time,reduced);
    marineLife.userData.update(time,reduced);
    fish.userData.update(time,reduced);
  };
  return root;
}
