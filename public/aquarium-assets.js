import * as THREE from "three";
import { aquariumOutline, aquariumFishFrame } from "./aquarium-data.js";
import { part } from "./bikini-scenery.js";
import { line } from "./fantasy-scenery.js";
import { batchModelSteps } from "./model-batching.js";
import { aquariumShoalSteps } from "./aquarium-fish.js";
import {
  waterMaterial,
  advanceWater,
  applyUnderwaterLighting,
} from "./water-shading.js";
export function aquariumShape(w, d, r, circular = false) {
  const s = new THREE.Shape();
  if (circular) s.absarc(0, 0, w / 2, 0, Math.PI * 2, false);
  else {
    const pts = aquariumOutline(w, d, r);
    pts.forEach((p, i) => (i ? s.lineTo(p.x, -p.z) : s.moveTo(p.x, -p.z)));
    s.closePath();
  }
  return s;
}
export function aquariumPrism(w, d, r, h, circular = false) {
  const geo = new THREE.ExtrudeGeometry(aquariumShape(w, d, r, circular), {
    depth: h,
    bevelEnabled: false,
    curveSegments: 48,
  });
  geo.rotateX(-Math.PI / 2);
  return geo;
}
function rim(g, o, y, color, thickness = 0.1) {
  const p = o.circular
    ? Array.from({ length: 65 }, (_, i) => ({
        x: (Math.sin((i / 64) * Math.PI * 2) * o.w) / 2,
        z: (Math.cos((i / 64) * Math.PI * 2) * o.d) / 2,
      }))
    : aquariumOutline(o.w, o.d, o.r, 10);
  for (let i = 0; i < p.length; i++) {
    const a = p[i],
      b = p[(i + 1) % p.length];
    line(g, [a.x, y, a.z], [b.x, y, b.z], color, thickness);
  }
}
export function* aquariumTankSteps(o) {
  const root = new THREE.Group(),
    props = new THREE.Group(),
    clock = { value: 0 };
  root.name = o.name;
  root.userData = {
    id: o.type,
    foodcourt: true,
    aquarium: true,
    handpainted: true,
    duration: 34,
  };
  const geo = aquariumPrism(o.w, o.d, o.r, o.h, o.circular);
  const depthGeometry = geo.clone(),
    depthColors = [];
  const lowColor = new THREE.Color(0x168cc1),
    topColor = new THREE.Color(0x64daed),
    c = new THREE.Color();
  for (let i = 0; i < depthGeometry.attributes.position.count; i++) {
    const t = Math.max(
      0,
      Math.min(1, depthGeometry.attributes.position.getY(i) / o.h),
    );
    c.copy(lowColor).lerp(topColor, t);
    depthColors.push(c.r, c.g, c.b);
  }
  depthGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(depthColors, 3),
  );
  const volume = new THREE.Mesh(
    depthGeometry,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.37,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  volume.name = "Clear deep aquarium water";
  volume.renderOrder = 1;
  root.add(volume);
  const glass = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      color: 0xc8efff,
      transparent: true,
      opacity: 0.055,
      depthWrite: false,
      side: THREE.FrontSide,
    }),
  );
  glass.name = "Transparent aquarium glass";
  glass.renderOrder = 8;
  root.add(glass);
  yield;
  const bed = new THREE.Mesh(
    aquariumPrism(o.w - 0.12, o.d - 0.12, o.r, 0.16, o.circular),
    applyUnderwaterLighting(
      new THREE.MeshStandardMaterial({ color: 0x6fcad5, roughness: 0.8 }),
      clock,
      o.color,
      { refract: false },
    ),
  );
  bed.name = "Physical aquarium bed";
  root.add(bed);
  rim(props, o, 0.15, 0xedce9f, 0.14);
  rim(props, o, o.h, 0xf4d6a8, 0.12);
  rim(props, o, 0.52, 0xffe2bc, 0.045);
  const water = waterMaterial(0x40bce0, 0.18),
    surface = new THREE.Mesh(
      new THREE.ShapeGeometry(
        aquariumShape(o.w - 0.16, o.d - 0.16, o.r, o.circular),
        48,
      ),
      water,
    );
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = o.h - 0.13;
  surface.renderOrder = 6;
  water.uniforms.uScale.value.set(o.w, o.d);
  water.uniforms.uLake.value = 1;
  root.add(surface);
  yield;
  for (let i = 0; i < 24; i++) {
    const angle = i * 2.399,
      r = 0.68 + (i % 3) * 0.09;
    let x = Math.sin(angle) * o.w * 0.42 * r,
      z = Math.cos(angle) * o.d * 0.42 * r;
    if (i < 8) {
      x = (i % 2 ? 1 : -1) * (o.w / 2 - 1);
      z = -o.d * 0.25 + (i % 4) * o.d * 0.17;
    }
    if (o.circular) {
      const r = Math.hypot(x, z),
        limit = o.r - 0.85;
      if (r > limit) {
        x *= limit / r;
        z *= limit / r;
      }
    }
    part(
      props,
      "stone",
      [0xc8cad7, 0xe3c1d4, 0xb2d7c6][i % 3],
      x,
      0.2,
      z,
      0.35 + (i % 3) * 0.13,
      0.22,
      0.3,
    );
    if (i % 2 === 0) {
      for (let j = 0; j < 4; j++) {
        const a = j * 1.5 + i;
        line(
          props,
          [x, 0.2, z],
          [x + Math.sin(a) * 0.32, 0.9 + (j % 3) * 0.35, z + Math.cos(a) * 0.2],
          [0xe8a5ca, 0xbcabe5, 0xf2ca9e][i % 3],
          0.075,
        );
        part(
          props,
          "sphere",
          0xf5c5dc,
          x + Math.sin(a) * 0.32,
          0.9 + (j % 3) * 0.35,
          z + Math.cos(a) * 0.2,
          0.1,
          0.12,
          0.1,
        );
      }
    } else
      for (let j = 0; j < 3; j++) {
        const p = part(
          props,
          "petal",
          [0x83c9b0, 0x9cd9c5, 0x9fcee0][j],
          x + j * 0.12,
          0.65 + j * 0.16,
          z,
          0.15,
          0.64 + j * 0.14,
          0.06,
        );
        p.rotation.z = Math.sin(i + j) * 0.25;
      }
    yield;
  }
  // Larger sea-fan gardens are kept against the back glass; the front remains
  // open so the giant kittens, small companions and visitor reactions stay clear.
  for (let i = 0; i < 6; i++) {
    const x = (i / 5 - 0.5) * (o.w - (o.circular ? 5.5 : 3.5)),
      z = o.circular ? -Math.sqrt((o.r - 1.8) ** 2 - x * x) : -o.d / 2 + 1.5;
    const fan = new THREE.Group();
    fan.position.set(x, 0.2, z);
    props.add(fan);
    for (let j = 0; j < 7; j++) {
      const a = (j - 3) * 0.23,
        h = 1.7 + (i % 3) * 0.55;
      line(
        fan,
        [0, 0, 0],
        [Math.sin(a) * h, Math.cos(a) * h, 0],
        [0xf1a0cb, 0xa896e6, 0x75d7bb][i % 3],
        0.06,
      );
      for (let k = 1; k <= 3; k++) {
        const f = k / 3;
        line(
          fan,
          [Math.sin(a) * h * f, Math.cos(a) * h * f, 0],
          [Math.sin(a) * h * f + 0.22, Math.cos(a) * h * f + 0.16, 0.04],
          0xf8c1dc,
          0.035,
        );
      }
    }
    yield;
  }
  const baked = yield* batchModelSteps(props, { combineColors: true });
  root.add(baked);
  props.traverse((p) => {
    if (p.isMesh && !p.geometry.userData.sharedScenery) p.geometry.dispose();
  });
  const shoal = yield* aquariumShoalSteps(o, clock);
  root.add(shoal);
  yield;
  const bubbles = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.065, 8, 6),
      new THREE.MeshBasicMaterial({
        color: 0xeaffff,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
      24,
    ),
    dummy = new THREE.Object3D();
  bubbles.frustumCulled = false;
  bubbles.renderOrder = 5;
  root.add(bubbles);
  root.userData.shoal = shoal;
  root.userData.tank = o;
  root.userData.glass = glass;
  root.userData.surface = surface;
  root.userData.fishPoint = (i, time) => {
    const f = aquariumFishFrame(o, Math.max(0, Math.min(o.fish - 1, i)), time);
    return new THREE.Vector3(
      f.x + Math.sin(f.yaw) * f.scale * 0.7,
      f.y + f.scale * 0.22,
      f.z + Math.cos(f.yaw) * f.scale * 0.7,
    );
  };
  root.userData.update = (time, reduced = false) => {
    clock.value = reduced ? 0 : time;
    advanceWater(water, time, reduced);
    shoal.userData.update(time, reduced);
    for (let i = 0; i < 24; i++) {
      dummy.position.set(
        Math.sin(i * 2.4) * (o.w / 2 - 1),
        0.3 + (((reduced ? 0 : time * 0.55) + i * 0.73) % (o.h - 0.7)),
        Math.cos(i * 2.4) * (o.d / 2 - 1),
      );
      dummy.scale.setScalar(0.7 + (i % 3) * 0.22);
      dummy.updateMatrix();
      bubbles.setMatrixAt(i, dummy.matrix);
    }
    bubbles.instanceMatrix.needsUpdate = true;
  };
  root.userData.update((Math.PI * 2 - o.index * 0.8) / 0.16, false);
  root.userData.stats = {
    fish: o.fish,
    instancedFishDraws: shoal.userData.stats.draws,
  };
  return root;
}
