import * as THREE from "three";
import { shape, line, batchScenery } from "./fantasy-scenery.js";
import { batchModelSteps } from "./model-batching.js";
import { mosasaurGeometry, mosasaurScales } from "./mosasaur-sculpt.js";
import { MOSA_SEA } from "./mosasaur-data.js";
import {
  mosasaurFrame,
  mosasaurApproach,
  MOSA_DURATION,
  MOSA_SEAT,
  MOSA_SCALE,
  MOSA_TIMES,
} from "./mosasaur-motion.js";
import { runSceneSteps } from "./scene-tasks.js";
const paint = new Map();
const stitchGeometry = new THREE.BoxGeometry(1, 1, 1);
stitchGeometry.userData.sharedScenery = true;

function* bake(parent, source) {
  const baked = yield* batchModelSteps(source, { combineColors: true });
  parent.add(baked);
  source.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
    if (o.isMesh && !o.material.userData.sharedScenery) o.material.dispose();
  });
  return baked;
}
function crownGeometry() {
  const p = [],
    indices = [],
    sides = 48;
  for (let j = 0; j <= sides; j++) {
    const a = (j / sides) * Math.PI * 2,
      h = 0.55 + 0.45 * Math.sin(j * 2.399) ** 2;
    p.push(
      Math.cos(a),
      0,
      Math.sin(a),
      Math.cos(a) * 1.2,
      h,
      Math.sin(a) * 1.2,
    );
    if (j < sides) {
      const n = j * 2;
      indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
export function* mosasaurRideSteps(id) {
  if (id !== "ride-mosasaur") return null;
  const root = new THREE.Group(),
    moving = new THREE.Group(),
    props = new THREE.Group(),
    jawProps = new THREE.Group(),
    fins = [];
  root.name = "Marin · powerful blue mosasaur";
  root.add(moving);
  moving.scale.setScalar(MOSA_SCALE);
  const clock = { value: 0 },
    drive = { value: 1 };
  function mat(color, glow = false) {
    const key = color + ":" + glow;
    if (!paint.has(key)) {
      const m = glow
        ? new THREE.MeshBasicMaterial({ color })
        : new THREE.MeshStandardMaterial({
            color,
            roughness: 0.44,
            metalness: 0.025,
          });
      m.userData.sharedScenery = true;
      paint.set(key, m);
    }
    return paint.get(key);
  }
  function soft(parent, color, x, y, z, sx, sy, sz, glow = false) {
    const mesh = shape(parent, "sphere", color, x, y, z, sx, sy, sz, glow);
    mesh.material = mat(color, glow);
    return mesh;
  }
  function detail(parent, kind, color, ...v) {
    const mesh = shape(parent, kind, color, ...v);
    mesh.material = mat(color);
    return mesh;
  }
  const skin = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.4,
    metalness: 0.025,
    clearcoat: 0.48,
    clearcoatRoughness: 0.3,
    bumpMap: mosasaurScales(),
    bumpScale: 0.035,
  });
  const bodyMat = skin.clone();
  bodyMat.onBeforeCompile = (shader) => {
    shader.uniforms.uMosaClock = clock;
    shader.uniforms.uMosaDrive = drive;
    shader.vertexShader =
      "uniform float uMosaClock;uniform float uMosaDrive;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      float w=pow(clamp((-position.z-2.0)/8.5,0.0,1.0),1.7);
      transformed.x+=w*sin(uMosaClock+position.z*.65)*uMosaDrive;`,
      );
  };
  bodyMat.customProgramCacheKey = () => "mosa-muscular-tail-v2";
  const body = new THREE.Mesh(mosasaurGeometry("body"), bodyMat);
  body.name = "Continuous muscular trunk and powerful tapered tail";
  body.castShadow = body.receiveShadow = true;
  moving.add(body);
  const skull = new THREE.Mesh(mosasaurGeometry("skull"), skin);
  skull.name = "Broad reptile skull and long rounded snout";
  skull.castShadow = skull.receiveShadow = true;
  moving.add(skull);
  yield;
  // Palate, gums, nostrils, cheeks and inset amber eyes form one static head batch.
  soft(props, 0x955b69, 0, -0.07, 6.45, 1, 0.09, 2.55);
  soft(props, 0xc0818c, 0, -0.095, 7.35, 0.72, 0.04, 1.35);
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(side * 1.38, 0.77, 4.2);
    eye.rotation.y = side * 0.98;
    props.add(eye);
    soft(eye, 0x326b87, 0, 0, -0.03, 0.35, 0.36, 0.22);
    soft(eye, 0xe1c780, 0, 0.015, 0.17, 0.27, 0.28, 0.085);
    soft(eye, 0x142d3a, 0, 0.02, 0.246, 0.15, 0.19, 0.045);
    soft(eye, 0xffffff, -0.065, 0.1, 0.286, 0.055, 0.055, 0.018, true);
    soft(eye, 0xc6f0ee, 0.065, -0.06, 0.283, 0.024, 0.025, 0.012, true);
    const brow = new THREE.CatmullRomCurve3(
      [
        [side * 0.85, 1.1, 3.93],
        [side * 1.16, 1.03, 4.15],
        [side * 1.4, 0.94, 4.43],
      ].map((p) => new THREE.Vector3(...p)),
    );
    props.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(brow, 18, 0.1, 8, false),
        mat(0x28658b),
      ),
    );
    const nostril = soft(
      props,
      0x174760,
      side * 0.4,
      0.64,
      8.35,
      0.14,
      0.035,
      0.19,
    );
    nostril.rotation.y = side * 0.18;
    soft(props, 0x4784a0, side * 0.38, 0.67, 8.23, 0.17, 0.035, 0.12);
    // A restrained cheek fold accentuates the jaw joint, without eye stalks.
    const fold = new THREE.CatmullRomCurve3(
      [
        [side * 1.18, 0.7, 3.45],
        [side * 1.36, 0.44, 3.9],
        [side * 1.3, 0.08, 4.35],
      ].map((p) => new THREE.Vector3(...p)),
    );
    props.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(fold, 18, 0.035, 5, false),
        mat(0x205b7a),
      ),
    );
    for (let j = 0; j < 17; j++) {
      const z = 4.45 + j * 0.267,
        w = 1.25 - (z - 4.45) * 0.145,
        length = 0.23 + Math.sin((j / 16) * Math.PI) * 0.17,
        tooth = detail(
          props,
          "cone",
          0xfff4d7,
          side * w,
          -0.13 + (z - 4.45) * 0.07 - length / 2,
          z,
          0.065,
          length,
          0.065,
        );
      tooth.rotation.z = Math.PI + side * 0.13;
      tooth.rotation.x = 0.15;
    }
    const front = new THREE.Group(),
      rear = new THREE.Group();
    front.position.set(side * 1.42, -0.45, 1.75);
    rear.position.set(side * 0.92, -0.48, -4.1);
    for (const [pivot, size] of [
      [front, 1],
      [rear, 0.68],
    ]) {
      const mesh = new THREE.Mesh(mosasaurGeometry("paddle"), skin);
      mesh.scale.set(side * size, size, size);
      mesh.castShadow = true;
      pivot.add(mesh);
      moving.add(pivot);
      fins.push(pivot);
    }
    yield;
  }
  const jaw = new THREE.Group();
  jaw.name = "Articulated lower jaw";
  jaw.position.set(0, -0.32, 3.35);
  moving.add(jaw);
  const jawSkin = new THREE.Mesh(mosasaurGeometry("jaw"), skin);
  jawSkin.castShadow = true;
  jaw.add(jawSkin);
  soft(jawProps, 0xb87a86, 0, 0.23, 3, 1, 0.07, 2.5);
  soft(jawProps, 0xd99b9e, 0, 0.32, 3.8, 0.55, 0.09, 1.3);
  for (const side of [-1, 1])
    for (let j = 0; j < 16; j++) {
      const z = 1.05 + j * 0.295,
        w = 1.17 - Math.max(0, z - 1) * 0.143,
        height = 0.18 + Math.sin((j / 15) * Math.PI) * 0.15,
        tooth = detail(
          jawProps,
          "cone",
          0xfff4d7,
          side * w,
          0.18 + z * 0.04 + height / 2,
          z,
          0.055,
          height,
          0.055,
        );
      tooth.rotation.z = -side * 0.1;
      tooth.rotation.x = -0.12;
    }
  yield* bake(jaw, jawProps);
  // A deep crescent tail stands vertically, with a larger upper lobe.
  const tail = new THREE.Group();
  tail.name = "Strong vertical tail fluke";
  tail.position.set(0, -0.1, -10.2);
  const outline = new THREE.Shape();
  outline.moveTo(0.22, -0.18);
  outline.bezierCurveTo(-0.4, 0.7, -0.4, 2.35, -2.1, 3);
  outline.bezierCurveTo(-1.75, 1.5, -1.6, 0.65, -1.25, 0.1);
  outline.bezierCurveTo(-1.8, -0.45, -1.95, -1.2, -2.4, -1.9);
  outline.bezierCurveTo(-0.8, -1.5, -0.4, -0.7, 0.22, -0.18);
  outline.closePath();
  const flukeGeo = new THREE.ExtrudeGeometry(outline, {
    depth: 0.15,
    bevelEnabled: true,
    bevelSize: 0.16,
    bevelThickness: 0.1,
    bevelSegments: 3,
    curveSegments: 24,
  });
  flukeGeo.scale(0.85, 1, 1);
  flukeGeo.rotateY(-Math.PI / 2);
  const fluke = new THREE.Mesh(flukeGeo, mat(0x357b9d));
  fluke.castShadow = true;
  tail.add(fluke);
  moving.add(tail);
  yield;
  // Leather girth, navy saddlecloth, stitched gold edging and a low handrail.
  const strapPoints = [];
  for (let j = 0; j <= 48; j++) {
    const a = (j / 48) * Math.PI * 2;
    strapPoints.push(
      new THREE.Vector3(Math.cos(a) * 1.82, Math.sin(a) * 1.33, 0.6),
    );
  }
  props.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(strapPoints),
        64,
        0.075,
        8,
        false,
      ),
      mat(0x8d5b37),
    ),
  );
  const pad = detail(props, "sphere", 0x93643d, 0, 1.22, 0.6, 0.81, 0.2, 1.1);
  pad.name = "Soft leather saddle";
  detail(props, "cube", 0x254d87, 0, 1.38, 0.6, 1.45, 0.12, 1.64);
  for (const side of [-1, 1]) {
    line(
      props,
      [side * 0.64, 1.455, -0.12],
      [side * 0.64, 1.455, 1.32],
      0xe8bd72,
      0.025,
    );
    for (let j = 0; j < 10; j++) {
      const stitch = detail(
        props,
        "cube",
        0xf2d48a,
        side * 0.66,
        1.459,
        -0.03 + j * 0.135,
        0.04,
        0.014,
        0.05,
      );
      stitch.geometry = stitchGeometry;
    }
  }
  for (const z of [-0.12, 1.32])
    line(props, [-0.64, 1.455, z], [0.64, 1.455, z], 0xe8bd72, 0.025);
  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(0.4, 0.045, 8, 28, Math.PI),
    mat(0xe3bd79),
  );
  rail.position.set(0, 1.6, 1.22);
  props.add(rail);
  yield* bake(moving, props);
  const dock = new THREE.Group();
  dock.name = "Boarding jetty and dry shore return";
  for (let z = 9.8; z < 24; z += 0.37) {
    shape(dock, "cube", 0xc99b61, 0, 0.19, z, 2.2, 0.17, 0.34);
    yield;
  }
  for (const x of [-1.1, 1.1])
    for (const z of [11, 14, 17, 20, 23]) {
      line(dock, [x, -1, z], [x, 1, z], 0x9e754d, 0.09);
      if (z > 11) line(dock, [x, 0.85, z - 2.5], [x, 0.85, z], 0xdfcaa0, 0.038);
    }
  root.add(batchScenery(dock));
  const bubbles = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.09, 8, 6),
    new THREE.MeshBasicMaterial({
      color: 0xb7f5ff,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    }),
    28,
  );
  bubbles.name = "Underwater bubble trail";
  bubbles.frustumCulled = false;
  root.add(bubbles);
  const spray = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.14, 8, 6),
    new THREE.MeshBasicMaterial({
      color: 0xe0fbff,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),
    96,
  );
  spray.name = "Powerful breach and re-entry droplets";
  spray.frustumCulled = false;
  root.add(spray);
  const foam = new THREE.InstancedMesh(
    new THREE.TorusGeometry(1, 0.025, 5, 64),
    new THREE.MeshBasicMaterial({
      color: 0xf1fcff,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    }),
    3,
  );
  foam.name = "Expanding impact foam rings";
  foam.frustumCulled = false;
  root.add(foam);
  const crown = new THREE.Mesh(
    crownGeometry(),
    new THREE.MeshBasicMaterial({
      color: 0xa5eaf5,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  crown.name = "Jagged water impact crown";
  root.add(crown);
  const particle = new THREE.Object3D(),
    q = new THREE.Quaternion(),
    point = new THREE.Vector3();
  const bursts = [
    { at: MOSA_TIMES.launch - 0.36, power: 0.72 },
    { at: MOSA_TIMES.land - 0.38, power: 1 },
  ].map((burst) => {
    const f = mosasaurFrame(burst.at);
    const center = new THREE.Vector3(0, 0.1, burst.power === 1 ? 7.7 : 3.5)
      .multiplyScalar(MOSA_SCALE)
      .applyQuaternion(new THREE.Quaternion().fromArray(f.quaternion))
      .add(new THREE.Vector3(...f.bodyPosition));
    return { ...burst, center: center.toArray() };
  });
  let previousElapsed = 0;
  root.userData = {
    id,
    duration: MOSA_DURATION,
    handpainted: true,
    moving,
    jaw,
    fins,
    body,
    skull,
    spray,
    foam,
    crown,
    seatHeight: MOSA_SEAT[1],
    dismount: [0, 0, 23],
    rideFrame: mosasaurFrame,
    approachFrame: mosasaurApproach,
    saddleLocal: new THREE.Vector3(...MOSA_SEAT),
    deepRide: true,
    update(time, reduced = false) {
      const elapsed = root.userData.rideElapsed ?? 0,
        f = mosasaurFrame(elapsed, reduced),
        air = f.phase === "flight";
      if (!reduced)
        for (const burst of bursts)
          if (previousElapsed < burst.at && elapsed >= burst.at)
            root.userData.onWaterImpact?.(
              burst.center[0],
              burst.center[2],
              time,
              burst.power * 1.8,
            );
      previousElapsed = elapsed;
      moving.position.set(...f.bodyPosition);
      q.fromArray(f.quaternion);
      moving.quaternion.copy(q);
      clock.value = reduced ? 0 : time * 5.5;
      drive.value = reduced ? 0 : air ? 0.13 : 1;
      const wave = clock.value - 10.2 * 0.65,
        weight = ((10.2 - 2) / 8.5) ** 1.7;
      tail.position.x = Math.sin(wave) * weight * drive.value;
      tail.rotation.y = reduced ? 0 : Math.cos(wave) * 0.5 * drive.value;
      jaw.rotation.x = reduced
        ? 0.18
        : (air ? 0.46 : f.phase === "ascent" ? 0.36 : 0.17) +
          Math.sin(time * 1.8) * 0.025;
      for (let i = 0; i < fins.length; i++) {
        fins[i].rotation.z = reduced
          ? 0
          : Math.sin(clock.value + i * 0.7) * (air ? 0.025 : 0.105);
        fins[i].rotation.y = reduced
          ? 0
          : Math.sin(clock.value + i * 0.8) * 0.055;
        fins[i].rotation.x = air ? 0.18 : 0;
      }
      bubbles.visible =
        !reduced &&
        ["dive", "deep", "ascent", "splash", "return"].includes(f.phase) &&
        f.bodyPosition[1] < -0.8;
      if (bubbles.visible) {
        for (let i = 0; i < 28; i++) {
          const age = (time * 0.85 + i * 0.137) % 1,
            a = i * 2.399;
          point
            .set(Math.cos(a) * (0.6 + age), -0.1 + age * 2, -3 - age * 4)
            .applyQuaternion(q)
            .add(moving.position);
          particle.position.copy(point);
          particle.rotation.set(0, 0, 0);
          particle.scale.setScalar(0.5 + age * 0.8);
          particle.updateMatrix();
          bubbles.setMatrixAt(i, particle.matrix);
        }
        bubbles.instanceMatrix.needsUpdate = true;
      }
      let burst = null;
      for (const b of bursts)
        if (elapsed >= b.at && elapsed - b.at < 1.65) burst = b;
      spray.visible = foam.visible = crown.visible = !!burst && !reduced;
      if (spray.visible) {
        const age = elapsed - burst.at,
          power = burst.power,
          hit = burst.center;
        for (let i = 0; i < 96; i++) {
          const seed = ((i * 37) % 97) / 97,
            rise = ((i * 53) % 101) / 101,
            delay = ((i * 17) % 89) / 89,
            a = i * 2.399 + (rise - 0.5) * 0.6,
            t = Math.max(0, age - delay * 0.16),
            speed = (3.5 + seed * 6.5) * power,
            v = (7 + rise * 13) * power,
            radius = 0.4 + delay * 1.4 + speed * t,
            y = Math.max(0, v * t - 9 * t * t);
          particle.position.set(
            hit[0] + Math.cos(a) * radius,
            MOSA_SEA.surfaceY + 0.08 + y,
            hit[2] + Math.sin(a) * radius,
          );
          particle.rotation.set(
            Math.sin(a) * (0.4 + rise),
            delay * Math.PI,
            Math.cos(a) * (0.4 + rise),
          );
          particle.scale.set(
            0.7 + seed * 0.7,
            1.6 + seed * 2,
            0.7 + seed * 0.7,
          );
          particle.updateMatrix();
          spray.setMatrixAt(i, particle.matrix);
        }
        spray.material.opacity = Math.max(0, 1 - age / 1.65) * 0.85;
        spray.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < 3; i++) {
          particle.position.set(
            hit[0],
            MOSA_SEA.surfaceY + 0.025 + i * 0.009,
            hit[2],
          );
          particle.rotation.set(-Math.PI / 2, 0, 0);
          particle.scale.setScalar(1.3 + age * (4 + i * 1.1) * power + i * 0.6);
          particle.updateMatrix();
          foam.setMatrixAt(i, particle.matrix);
        }
        foam.material.opacity = Math.max(0, 1 - age / 1.65) * 0.42;
        foam.instanceMatrix.needsUpdate = true;
        crown.position.set(hit[0], MOSA_SEA.surfaceY + 0.04, hit[2]);
        crown.scale.set(
          (1.2 + age * 4) * power,
          Math.sin(Math.min(1, age / 0.8) * Math.PI) * 3.3 * power,
          (1.2 + age * 4) * power,
        );
        crown.material.opacity = Math.max(0, 1 - age / 1.2) * 0.26;
      }
      root.userData.phase = f.phase;
    },
  };
  root.userData.update(0, true);
  return root;
}
export const mosasaurRide = (id) => runSceneSteps(mosasaurRideSteps(id));
