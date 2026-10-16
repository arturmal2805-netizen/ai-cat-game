import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { applyUnderwaterLighting } from "./water-shading.js";
import { shape } from "./fantasy-scenery.js";
import { batchModelSteps } from "./model-batching.js";
import { MOSA_SEA } from "./mosasaur-data.js";
// Everything is procedural and shared: three fish schools, one ray mesh and
// two batched seabed material families. No extra textures or scene render pass.
export function* deepOceanSteps() {
  const root = new THREE.Group(),
    clock = { value: 0 },
    schools = [],
    props = new THREE.Group();
  root.name = "Deep blue grotto, fish schools and sun shafts";
  const body = new THREE.SphereGeometry(0.17, 10, 6).scale(0.55, 0.48, 1.5),
    tail = new THREE.ConeGeometry(0.1, 0.19, 4)
      .rotateX(Math.PI / 2)
      .translate(0, 0, -0.3),
    fishGeometry = mergeGeometries([body, tail]);
  body.dispose();
  tail.dispose();
  const fishMaterial = applyUnderwaterLighting(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      emissive: 0x172b35,
      emissiveIntensity: 0.18,
    }),
    clock,
    0x71e6ed,
  );
  const dummy = new THREE.Object3D();
  for (const [level, sign] of [
    [-6, 1],
    [-16, -1],
    [-25, 1],
  ]) {
    const school = new THREE.InstancedMesh(fishGeometry, fishMaterial, 18);
    school.name = "Animated fish school at depth " + level;
    school.position.y = level;
    for (let i = 0; i < 18; i++) {
      const a = i * 2.399,
        r = 7 + (i % 6) * 1.4;
      dummy.position.set(Math.sin(a) * r, (i % 5) * 0.35, Math.cos(a) * r);
      dummy.rotation.set(0, a + Math.PI / 2, 0);
      dummy.scale.setScalar(0.65 + (i % 4) * 0.22);
      dummy.updateMatrix();
      school.setMatrixAt(i, dummy.matrix);
      school.setColorAt(
        i,
        new THREE.Color([0xffc66f, 0x73deec, 0xe9a8d4, 0x94dbb0][i % 4]),
      );
    }
    school.instanceMatrix.needsUpdate = true;
    school.userData.sign = sign;
    root.add(school);
    schools.push(school);
    yield;
  }
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
      MOSA_SEA.bedY + 0.6,
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
        MOSA_SEA.bedY + 1.1,
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
  root.userData.drawCalls = 3 + baked.children.length + 1;
  root.userData.update = (time, reduced = false) => {
    clock.value = reduced ? 0 : time;
    for (const g of schools)
      g.rotation.y = reduced ? 0 : time * 0.055 * g.userData.sign;
  };
  return root;
}
