import {
  LAGOON_BED_Y,
  LAGOON_SURFACE_Y,
  LEGACY_SEA_DEPTH,
} from "./water-depths.js";
import { runSceneSteps } from "./scene-tasks.js";
import * as THREE from "three";
import { reefSteps } from "./reef.js";

import {
  waterMaterial,
  applyUnderwaterLighting,
  advanceWater,
} from "./water-shading.js";
export { waterMaterial } from "./water-shading.js";

export function* lagoonSteps({
  x = 0,
  z = 0,
  rx = 3,
  rz = 2,
  fishCount = 24,
  color = 0x08b5d0,
  seed = 1,
  bedColor = 0x83ccc1,
  wallColor = 0xadc8b5,
  shoreColor = 0x73e4c5,
  depth = LEGACY_SEA_DEPTH,
} = {}) {
  yield;
  const group = new THREE.Group();
  yield;
  group.position.set(x, 0, z);
  yield;
  group.name = "Lagoon";
  yield;
  const waterClock = { value: 0 },
    waterLevel = { value: LAGOON_SURFACE_Y };
  const bedMaterial = applyUnderwaterLighting(
    new THREE.MeshStandardMaterial({ color: bedColor, roughness: 0.82 }),
    waterClock,
    color,
    { level: waterLevel, refract: false },
  );
  yield;
  // A colored basin gives the clear water depth without a depth texture or
  // another render pass. Keep the authored sand/pink palette at the shore.
  const bedGeometry = new THREE.CircleGeometry(1, 64),
    bedPositions = bedGeometry.getAttribute("position"),
    bedColors = new Float32Array(bedPositions.count * 3),
    sand = new THREE.Color(bedColor),
    depthColor = new THREE.Color(color).lerp(sand, 0.24);
  for (let i = 0; i < bedPositions.count; i++) {
    const radius = Math.hypot(bedPositions.getX(i), bedPositions.getY(i));
    const shade = depthColor.clone().lerp(sand, radius * radius);
    shade.toArray(bedColors, i * 3);
  }
  bedGeometry.setAttribute("color", new THREE.BufferAttribute(bedColors, 3));
  bedMaterial.color.set(0xffffff);
  bedMaterial.vertexColors = true;
  const bed = new THREE.Mesh(bedGeometry, bedMaterial);
  yield;
  bed.rotation.x = -Math.PI / 2;
  yield;
  bed.scale.set(rx, rz, 1);
  yield;
  bed.position.y = LAGOON_SURFACE_Y - depth;
  bed.name = "Lagoon physical seabed";
  group.userData.depth = depth;
  group.userData.bed = bed;
  yield;
  group.add(bed);
  yield;
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, depth - 0.025, 64, 1, true),
    new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.95,
      side: THREE.DoubleSide,
    }),
  );
  yield;
  wall.scale.set(rx, 1, rz);
  yield;
  wall.position.y = LAGOON_SURFACE_Y - depth / 2 - 0.0125;
  yield;
  group.add(wall);
  yield;
  const material = waterMaterial(color),
    surface = new THREE.Mesh(new THREE.CircleGeometry(1, 64), material);
  yield;
  surface.rotation.x = -Math.PI / 2;
  yield;
  surface.scale.set(rx, rz, 1);
  yield;
  surface.position.y = 0.155;
  yield;
  surface.renderOrder = 3;
  yield;
  material.uniforms.uLake.value = 1;
  material.uniforms.uScale.value.set(rx * 2, rz * 2);
  yield;
  material.uniforms.uShoreColor.value.set(shoreColor);
  yield;
  group.add(surface);
  yield;
  const reef = yield* reefSteps({
    rx,
    rz,
    seed,
    count: Math.min(18, Math.max(8, Math.round(rx * rz))),
    waterLevel,
  });
  yield;
  group.add(reef);
  yield;
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.025, 6, 64),
    new THREE.MeshBasicMaterial({
      color: 0xc0f0e4,
      transparent: true,
      opacity: 0.18,
    }),
  );
  yield;
  rim.rotation.x = Math.PI / 2;
  yield;
  rim.scale.set(rx, rz, 1);
  yield;
  rim.position.y = 0.17;
  yield;
  group.add(rim);
  yield;
  const colors = [0xff9454, 0xffd75f, 0xf3a2c5, 0x6dbfff, 0x72d6b4, 0xf3d1ff];
  yield;
  const bodyGeo = new THREE.SphereGeometry(1, 12, 8),
    tailGeo = new THREE.ConeGeometry(1, 1, 3);
  yield;
  const body = new THREE.InstancedMesh(
    bodyGeo,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
    fishCount,
  );
  yield;
  const tail = new THREE.InstancedMesh(
    tailGeo,
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      side: THREE.DoubleSide,
    }),
    fishCount,
  );
  yield;
  const eyes = new THREE.InstancedMesh(
    bodyGeo,
    new THREE.MeshBasicMaterial({ color: 0x253850 }),
    fishCount * 2,
  );
  yield;
  const fins = new THREE.InstancedMesh(
    bodyGeo,
    new THREE.MeshStandardMaterial({ color: 0xfff0cc, roughness: 0.6 }),
    fishCount * 2,
  );
  yield;
  for (const mesh of [body, tail, eyes, fins]) {
    yield;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    yield;
    mesh.frustumCulled = false;
    yield;
    group.add(mesh);
  }
  yield;
  for (let i = 0; i < fishCount; i++) {
    yield;
    body.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    yield;
    tail.setColorAt(i, new THREE.Color(colors[i % colors.length]));
  }
  yield;
  for (const mesh of [body, tail, fins])
    applyUnderwaterLighting(mesh.material, waterClock, color, {
      level: waterLevel,
    });
  applyUnderwaterLighting(eyes.material, waterClock, color, {
    level: waterLevel,
    light: false,
  });
  const impacts = [],
    origin = new THREE.Vector3();
  yield;
  let impactIndex = 0;
  yield;
  const splash = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.035, 5, 4),
    new THREE.MeshBasicMaterial({
      color: 0xc9ffff,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    }),
    30,
  );
  yield;
  splash.frustumCulled = false;
  yield;
  group.add(splash);
  yield;
  group.userData.disturb = (x, z, time, force = 0.6) => {
    if (!Number.isFinite(x + z + time + force)) return;
    if (impacts.length && time - impacts.at(-1).time < 0.11) return;
    group.updateWorldMatrix(true, false);
    origin.set(x, 0.155, z).applyMatrix4(group.matrixWorld);
    force = THREE.MathUtils.clamp(force, 0, 1.8);
    material.uniforms.uRipples.value[impactIndex % 6].set(
      origin.x,
      origin.z,
      time,
      force,
    );
    material.uniforms.uRippleCount.value = Math.min(6, impactIndex + 1);
    impactIndex++;
    impacts.push({ x, z, time, force });
    if (impacts.length > 6) impacts.shift();
  };
  yield;
  const dummy = new THREE.Object3D(),
    local = new THREE.Matrix4(),
    fishTransform = new THREE.Matrix4();
  yield;
  const states = Array.from({ length: fishCount }, (_, i) => ({
    phase: i * 2.399 + seed,
    radius: 0.25 + (i % 6) * 0.11,
    speed: 0.16 + (i % 5) * 0.025,
    depth: -0.19 - (i % 4) * 0.075,
    scale: 0.8 + (i % 3) * 0.12,
  }));
  function part(mesh, index, x, y, z, sx, sy, sz, ax = 0, ay = 0, az = 0) {
    dummy.position.set(x, y, z);
    dummy.rotation.set(ax, ay, az);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    local.multiplyMatrices(fishTransform, dummy.matrix);
    mesh.setMatrixAt(index, local);
  }
  function update(time, reduced = false) {
    const t = reduced ? 0 : time;
    advanceWater(material, t, reduced);
    waterClock.value = t;
    group.updateWorldMatrix(true, false);
    waterLevel.value =
      group.matrixWorld.elements[13] + 0.155 * group.matrixWorld.elements[5];
    reef.userData.update(t, reduced);
    while (impacts.length && (t - impacts[0].time > 3.5 || reduced))
      impacts.shift();
    const spraying =
      !reduced &&
      impacts.some((hit) => t - hit.time >= 0 && t - hit.time < 0.9);
    splash.visible = spraying;
    if (spraying)
      for (let i = 0; i < 30; i++) {
        const impact = impacts[Math.floor(i / 5) % Math.max(1, impacts.length)],
          age = impact ? t - impact.time : 10;
        const active = !reduced && age >= 0 && age < 0.9;
        const a = i * 2.399;
        dummy.position.set(
          active ? impact.x + Math.sin(a) * age * 0.5 : 0,
          active
            ? 0.2 + Math.sin((age / 0.9) * Math.PI) * 0.28 * impact.force
            : -2,
          active ? impact.z + Math.cos(a) * age * 0.5 : 0,
        );
        dummy.scale.setScalar(active ? 1 : 0);
        dummy.updateMatrix();
        splash.setMatrixAt(i, dummy.matrix);
      }
    if (spraying) splash.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < states.length; i++) {
      const f = states[i],
        a = f.phase + t * f.speed;
      dummy.position.set(
        Math.cos(a) * rx * f.radius,
        f.depth + Math.sin(a * 2) * 0.025,
        Math.sin(a) * rz * f.radius,
      );
      for (const hit of impacts) {
        const age = t - hit.time,
          dx = dummy.position.x - hit.x,
          dz = dummy.position.z - hit.z,
          d = Math.hypot(dx, dz);
        if (age >= 0 && age < 2 && d < 1.1) {
          const push = (1.1 - d) * 0.22 * (1 - age / 2);
          dummy.position.x += (dx / (d || 1)) * push;
          dummy.position.z += (dz / (d || 1)) * push;
        }
      }
      dummy.rotation.set(0, Math.atan2(-Math.sin(a) * rx, Math.cos(a) * rz), 0);
      dummy.scale.setScalar(f.scale);
      dummy.updateMatrix();
      fishTransform.copy(dummy.matrix);
      part(body, i, 0, 0, 0, 0.11, 0.075, 0.26);
      part(
        tail,
        i,
        Math.sin(t * 5 + i) * 0.035,
        0,
        -0.29,
        0.14,
        0.16,
        0.035,
        Math.PI / 2,
        0,
        Math.sin(t * 5 + i) * 0.2,
      );
      for (let s = 0; s < 2; s++) {
        const sign = s ? 1 : -1;
        part(eyes, i * 2 + s, sign * 0.093, 0.025, 0.14, 0.018, 0.022, 0.019);
        part(
          fins,
          i * 2 + s,
          sign * 0.1,
          -0.025,
          0,
          0.09,
          0.025,
          0.065,
          0,
          sign * 0.45,
          Math.sin(t * 4 + i) * 0.15,
        );
      }
    }
    for (const mesh of [body, tail, eyes, fins])
      mesh.instanceMatrix.needsUpdate = true;
  }
  yield;
  update(0);
  yield;
  group.userData.update = update;
  yield;
  group.userData.fishCount = fishCount;
  yield;
  group.userData.water = material;
  yield;
  group.userData.rx = rx;
  yield;
  group.userData.rz = rz;
  yield;
  return group;
}
export function* waterfallSteps(
  x,
  z,
  width = 0.8,
  height = 4,
  { color = 0x7edced, foam = 0xe7ffff } = {},
) {
  yield;
  const group = new THREE.Group();
  yield;
  group.position.set(x, -height / 2 + 0.12, z);
  yield;
  group.name = "Waterfall";
  yield;
  const mat = waterMaterial(color, 0.67, { waterfall: true, width, height });
  yield;
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height, 6, 18),
    mat,
  );
  yield;
  group.add(sheet);
  yield;
  const lines = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.015, 0.025, 0.4, 4),
    new THREE.MeshBasicMaterial({
      color: foam,
      transparent: true,
      opacity: 0.43,
    }),
    18,
  );
  yield;
  lines.frustumCulled = false;
  yield;
  group.add(lines);
  yield;
  const dummy = new THREE.Object3D();
  yield;
  const mist = new THREE.Mesh(
    new THREE.SphereGeometry(1, 12, 8),
    new THREE.MeshBasicMaterial({
      color: foam,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  yield;
  mist.scale.set(width * 1.4, 0.2, 0.45);
  yield;
  mist.position.y = -height / 2;
  yield;
  group.add(mist);
  yield;
  group.userData.update = (time, reduced = false) => {
    const t = reduced ? 0 : time;
    advanceWater(mat, t, reduced);
    for (let i = 0; i < 18; i++) {
      dummy.position.set(
        Math.sin(i * 2.4) * width * 0.4,
        height / 2 - ((t * 2.1 + i * 0.24) % height),
        0.025,
      );
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      lines.setMatrixAt(i, dummy.matrix);
    }
    lines.instanceMatrix.needsUpdate = true;
  };
  yield;
  group.userData.update(0);
  yield;
  return group;
}

export function createLagoon(...args) {
  return runSceneSteps(lagoonSteps(...args));
}

export function createWaterfall(...args) {
  return runSceneSteps(waterfallSteps(...args));
}
