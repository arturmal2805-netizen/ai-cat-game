import * as THREE from "three";
import { createReferenceChichi } from "./chichi-model.js";
import { CHICHI_COAT } from "./chichi-sculpt.js";
export const moodNames = ["sleep", "crazy hungry", "happy"];
export const CHICHI_FUR = CHICHI_COAT;
const poses = {
  sleep: {
    height: 0.7,
    headX: 0.22,
    headZ: 0.08,
    eyes: 0.025,
    jaw: 0,
    ears: -0.19,
    tail: 0.62,
  },
  "crazy hungry": {
    height: 1,
    headX: -0.06,
    headZ: -0.12,
    eyes: 1.12,
    jaw: 0.12,
    ears: 0.13,
    tail: -0.2,
  },
  happy: {
    height: 1,
    headX: -0.025,
    headZ: 0.02,
    eyes: 1,
    jaw: 0,
    ears: 0,
    tail: 0.08,
  },
};
const clamp = THREE.MathUtils.clamp;
export function createCat(mood = "happy", options = {}) {
  if (!moodNames.includes(mood)) throw new RangeError("Unknown Chichi mood");
  const cat = createReferenceChichi(mood, options);
  cat.userData.pose = { ...poses[mood] };
  applyPose(cat, 0, false, true);
  return cat;
}
export function setCatMood(cat, mood, { immediate = false } = {}) {
  if (!moodNames.includes(mood)) throw new RangeError("Unknown Chichi mood");
  cat.userData.mood = mood;
  if (immediate) {
    Object.assign(cat.userData.pose, poses[mood]);
    applyPose(cat, 0, false, true);
  }
}
// 180 ms blinks, 4.8 seconds apart. Sleeping eyes remain gently closed.
export function blinkOpenness(time) {
  const phase = ((time % 4.8) + 4.8) % 4.8,
    distance = Math.abs(phase - 3.6);
  return distance >= 0.09 ? 1 : clamp(distance / 0.09, 0.025, 1);
}
function applyPose(cat, time, walking, reduced) {
  const d = cat.userData,
    p = d.pose,
    moving = !reduced,
    shape = d.build,
    gaitTime = time * shape.gait,
    speed = d.mood === "crazy hungry" ? 4.8 : 1.8,
    anatomy = d.anatomy;
  cat.scale.y = cat.scale.x * p.height;
  cat.position.y =
    moving && walking ? Math.sin(gaitTime * 10) * shape.bounce : 0;
  const rest = clamp((1 - p.height) / 0.3, 0, 1) * (walking ? 0.15 : 1);
  const breath = moving ? Math.sin(time * (d.mood === "sleep" ? 1.5 : 2.1)) : 0;
  d.body.position.y = (anatomy?.bodyY ?? 0.83) - rest * 0.17;
  d.chest.position.y = 0.94 - rest * 0.22;
  d.head.position.y =
    (anatomy?.headY ?? 1.32) + (shape.height - 1) * 0.22 - rest * 0.34;
  d.body.scale.set(
    (anatomy?.bodyX ?? 0.47) * shape.width + breath * 0.006,
    (anatomy?.bodyHeight ?? 0.51) - rest * 0.08 + breath * 0.008,
    (anatomy?.bodyLength ?? 0.72) * shape.length,
  );
  d.chest.scale.y = 0.45 + breath * 0.006;
  d.head.rotation.set(
    p.headX +
      (anatomy ? anatomy.headPitch + 0.025 : 0) +
      (moving ? Math.sin(time * 1.1) * 0.014 : 0),
    moving ? Math.sin(time * 0.67) * 0.045 : 0,
    p.headZ +
      (anatomy?.headRoll ?? 0) +
      (moving ? Math.sin(time * speed * 0.6) * 0.024 : 0),
  );
  if (walking && moving && shape.width > 1.3) {
    d.body.rotation.z = Math.sin(gaitTime * 10) * 0.035;
    d.head.rotation.z += Math.sin(gaitTime * 10 + 0.5) * 0.025;
  } else d.body.rotation.z = 0;
  d.tail.rotation.set(
    -rest * 0.9,
    moving ? Math.sin(time * speed * 0.55) * 0.15 : 0,
    p.tail + (moving ? Math.sin(time * speed) * 0.13 : 0),
  );
  d.tailTip.rotation.x = moving ? Math.sin(time * speed - 0.5) * 0.055 : 0;
  const blink = moving ? blinkOpenness(time) : 1;
  for (let i = 0; i < 2; i++) {
    const side = i === 0 ? -1 : 1,
      openness = p.eyes * blink;
    d.eyes[i].scale.set(
      openness > 0.075 ? 1 : 0.001,
      Math.max(0.025, openness),
      1,
    );
    d.closedEyes[i].scale.setScalar(openness <= 0.075 ? 1 : 0.001);
    d.pupils[i].position.x = moving ? Math.sin(time * 0.67) * 0.009 : 0;
    d.pupils[i].scale.x =
      (anatomy?.pupilX ?? 0.04) +
      clamp((p.eyes - 1) / 0.12, 0, 1) * (anatomy ? 0.006 : 0.018);
    const twitch = moving
      ? Math.pow(Math.max(0, Math.sin(time * 0.8 + i * 1.7)), 18) * 0.055
      : 0;
    d.ears[i].rotation.set(
      -0.045 + p.ears + twitch + (d.appearance.earFold || 0),
      side * 0.06,
      side * -0.26 + side * p.ears * 0.35,
    );
  }
  d.jaw.rotation.x = p.jaw + (moving ? Math.sin(time * 3.1) * p.jaw * 0.15 : 0);
  d.jaw.position.y = (anatomy?.jawY ?? -0.215) - p.jaw * 0.35;
  d.mouth.scale.y = 0.001 + p.jaw * 0.29;
  d.tongue.visible = p.jaw > 0.05;
  for (const [i, leg] of d.legs.entries()) {
    const phase = leg.position.x * leg.position.z > 0 ? Math.PI : 0;
    leg.rotation.x =
      moving && walking
        ? Math.sin(gaitTime * 10 + phase) * shape.stride
        : rest * (leg.position.z > 0 ? -0.95 : 1);
    leg.position.y =
      (anatomy?.legY ?? 0.51) -
      rest * 0.24 +
      (moving && walking
        ? Math.max(0, Math.sin(gaitTime * 10 + phase)) * shape.bounce
        : 0);
    const joints = d.legJoints?.[i];
    if (joints) {
      const lift =
          moving && walking ? Math.max(0, Math.sin(gaitTime * 10 + phase)) : 0,
        bend = lift * (leg.position.z > 0 ? 0.66 : -0.54);
      joints.knee.rotation.x = bend + rest * 0.2;
      joints.ankle.rotation.x = -bend * 0.55 - rest * 0.14;
    }
  }
}
export function animateCat(cat, time, walking = false, reduced = false) {
  const d = cat.userData;
  if (reduced) {
    if (
      Object.keys(poses[d.mood]).some(
        (k) => Math.abs(d.pose[k] - poses[d.mood][k]) > 0.0001,
      )
    ) {
      Object.assign(d.pose, poses[d.mood]);
      applyPose(cat, 0, false, true);
    }
    return;
  }
  const dt = d.lastTime === null ? 1 / 60 : clamp(time - d.lastTime, 0, 0.1);
  d.lastTime = time;
  const blend = 1 - Math.exp(-dt * 7);
  for (const k of Object.keys(d.pose))
    d.pose[k] += (poses[d.mood][k] - d.pose[k]) * blend;
  applyPose(cat, time, walking, false);
}
export function disposeCat(cat) {
  const geometries = new Set(),
    materials = new Set(),
    skeletons = new Set();
  cat.traverse((node) => {
    if (!node.isMesh) return;
    geometries.add(node.geometry);
    if (node.isSkinnedMesh) skeletons.add(node.skeleton);
    for (const m of Array.isArray(node.material)
      ? node.material
      : [node.material])
      materials.add(m);
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  skeletons.forEach((s) => s.dispose());
}

// Activity reactions layer over the AI mood, never replacing it.
export function reactCat(cat, reaction, reduced = false) {
  const d = cat.userData;
  if (reduced) return;
  const crouch = reaction.crouch || 0,
    paw = reaction.paw || 0;
  d.body.scale.y *= 1 - crouch;
  d.head.position.y -= crouch * 0.5;
  d.head.rotation.x += (reaction.headPitch || 0) - paw * 0.13;
  for (const leg of d.legs)
    if (leg.position.z > 0) {
      leg.rotation.x -= paw * (leg.position.x < 0 ? 1.1 : 0.65);
      leg.position.y -= crouch * 0.3;
    }
  for (const [i, joints] of (d.legJoints || []).entries()) {
    if (d.legs[i].position.z <= 0) continue;
    joints.knee.rotation.x += crouch * 0.85 + paw * 0.28;
    joints.ankle.rotation.x -= crouch * 0.35 + paw * 0.12;
  }
  d.ears[0].rotation.x -= paw * 0.08;
  d.ears[1].rotation.x -= paw * 0.08;
  d.tail.rotation.z += paw * 0.13;
}
