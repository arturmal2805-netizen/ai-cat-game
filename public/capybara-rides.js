import * as THREE from "three";
import { CAPYBARA_RIDES } from "./capybara-data.js";
import { capybaraPose, createCapybara } from "./capybara-model.js";
import { flowerCluster, lantern, shape } from "./fantasy-scenery.js";
import { waterMaterial } from "./lagoon.js";
import { batchModelGeometry } from "./model-batching.js";
export function capybaraRide(id) {
  const spec = CAPYBARA_RIDES.find((s) => s.id === id);
  if (!spec) return null;
  const root = new THREE.Group(),
    moving = new THREE.Group(),
    props = new THREE.Group(),
    animal = createCapybara({
      color: spec.color,
      saddle: true,
      swimming: !!spec.swimming,
      flower: id.endsWith("coconut"),
    }),
    duration = spec.swimming ? 22 : 18,
    scale = spec.scale,
    rx = spec.swimming ? 2.4 : 1.4,
    rz = spec.swimming ? 0.92 : 1.12;
  animal.scale.setScalar(scale);
  moving.add(animal);
  root.add(moving);
  let water;
  if (spec.swimming) {
    water = waterMaterial(0x11bde1, 0.65);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 64), water);
    pool.rotation.x = -Math.PI / 2;
    pool.scale.set(3.1, 1.8, 1);
    pool.position.y = 0.024;
    root.add(pool);
  } else {
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      shape(
        props,
        "stone",
        i % 2 ? 0xe1d1a3 : 0xb5c592,
        Math.sin(a) * 2.6,
        0.04,
        Math.cos(a) * 2.5,
        0.2,
        0.06,
        0.18,
      );
    }
    flowerCluster(props, -2.1, 1.8, 0xffa276, 0.55);
    lantern(props, 2.2, 0, 1.7, 0.43);
  }
  root.add(batchModelGeometry(props, { combineColors: true }));
  props.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
  });
  const frame = (time, reduced = false) => {
    const t = reduced ? 0 : Math.min(duration, Math.max(0, time)),
      a = (t / duration) * Math.PI * 2,
      yaw = Math.atan2(rx * Math.cos(a), -rz * Math.sin(a)),
      p = capybaraPose(t, reduced, !!spec.swimming, duration),
      sx = -1.83 * p.breath * Math.sin(p.roll),
      sy = 1.83 * p.breath * Math.cos(p.roll) + p.bob,
      sz = -0.22;
    return {
      position: [
        Math.sin(a) * rx + scale * (sx * Math.cos(yaw) + sz * Math.sin(yaw)),
        (spec.swimming ? -0.76 : 0.015) + scale * sy,
        Math.cos(a) * rz + scale * (-sx * Math.sin(yaw) + sz * Math.cos(yaw)),
      ],
      yaw,
      phase: "ride",
      paw: 0.12,
      headPitch: spec.swimming ? -0.03 : 0.025,
    };
  };
  root.name = spec.name;
  root.userData = {
    id,
    moving,
    animal,
    duration,
    rideFrame: frame,
    seatHeight: 1.83 * scale,
    dismount: spec.swimming ? [0, 0, -4.3] : [0, 0, 2.8],
  };
  root.userData.update = (time, reduced = false) => {
    const elapsed = root.userData.rideElapsed ?? time % duration,
      t = reduced ? 0 : Math.min(duration, Math.max(0, elapsed)),
      a = (t / duration) * Math.PI * 2;
    animal.userData.update(t, reduced, duration);
    moving.position.set(
      Math.sin(a) * rx,
      spec.swimming ? -0.76 : 0.015,
      Math.cos(a) * rz,
    );
    moving.rotation.y = Math.atan2(rx * Math.cos(a), -rz * Math.sin(a));
    if (water) water.uniforms.uTime.value = reduced ? 0 : time;
  };
  root.userData.update(0, true);
  return root;
}
