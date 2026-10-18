import * as THREE from "three";
import { createReferenceChichi } from "./chichi-model.js";
import { CHICHI_COAT } from "./chichi-sculpt.js";
import {
  CAT_EXPRESSIONS,
  EXPRESSION_DURATION,
  expressionFrame,
} from "./cat-emotions.js";
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
  const changed = cat.userData.mood !== mood;
  cat.userData.mood = mood;
  if (changed && !immediate)
    emoteCat(
      cat,
      mood === "happy" ? "delighted" : mood === "sleep" ? "drowsy" : "curious",
    );
  if (immediate) {
    cat.userData.expression = null;
    if (cat.userData.expressionFrame)
      expressionFrame(null, 0, cat.userData.expressionFrame);
    Object.assign(cat.userData.pose, poses[mood]);
    applyPose(cat, 0, false, true);
  }
}
export function emoteCat(cat, name, { crowd = false } = {}) {
  if (!CAT_EXPRESSIONS.includes(name))
    throw new RangeError("Unknown cat expression");
  const d = cat.userData;
  if (!d.referenceFamily || (!d.reference && !crowd)) return;
  // Start at the next animated frame. A slow first load or returning from a
  // background tab must not consume the reaction before the player can see it.
  d.expression = { name, start: null };
  d.expressionIdleStart = d.lastTime;
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
    anatomy = d.anatomy,
    emotion = d.expressionFrame;
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
  d.body.rotation.x = 0;
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
      openness = p.eyes * blink * (emotion?.eyes ?? 1);
    if (d.eyes[i].userData.rideEyeZ !== undefined)
      d.eyes[i].position.z = d.eyes[i].userData.rideEyeZ;
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
  const jawOpen = Math.max(p.jaw, moving ? (emotion?.blep || 0) * 0.075 : 0);
  d.jaw.rotation.x =
    jawOpen + (moving ? Math.sin(time * 3.1) * jawOpen * 0.15 : 0);
  d.jaw.position.y = (anatomy?.jawY ?? -0.215) - jawOpen * 0.35;
  d.mouth.scale.y = 0.001 + jawOpen * 0.29;
  d.tongue.visible = jawOpen > 0.05;
  // The tongue stays inside the mouth opening, rather than travelling down
  // with the chin. Invert the jaw's local X rotation without matrix updates.
  const tongueY = d.mouth.position.y - 0.006 - d.jaw.position.y,
    tongueZ = d.mouth.position.z + 0.032 - d.jaw.position.z,
    cos = Math.cos(d.jaw.rotation.x),
    sin = Math.sin(d.jaw.rotation.x);
  d.tongue.position.set(
    0,
    tongueY * cos + tongueZ * sin,
    -tongueY * sin + tongueZ * cos,
  );
  for (const [i, leg] of d.legs.entries()) {
    leg.rotation.z = 0;
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
  if (moving && emotion) {
    d.head.rotation.x += emotion.pitch;
    d.head.rotation.y += emotion.turn;
    d.head.rotation.z += emotion.tilt;
    d.tail.rotation.z += emotion.tail;
    for (const ear of d.ears) ear.rotation.x += emotion.ears;
    if (!walking && d.mood !== "sleep") {
      d.legs[1].rotation.x -= emotion.paw;
      d.legJoints[1].knee.rotation.x += emotion.paw * 0.4;
    }
  }
}
export function animateCat(cat, time, walking = false, reduced = false) {
  const d = cat.userData;
  d.magic?.update(time, reduced);
  if (reduced) {
    const wasAnimated = d.lastTime !== null;
    if (d.expressionFrame) expressionFrame(null, 0, d.expressionFrame);
    d.expression = null;
    d.lastTime = null;
    if (
      wasAnimated ||
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
  // Crowd rigs use the same approved face joints. Animate a requested reaction
  // without enabling the hero's continual idle-expression schedule for every NPC.
  if (d.reference || d.expression) {
    d.expressionFrame ||= {};
    d.expressionIdleStart ??= time;
    if (d.expression) {
      d.expression.start ??= time;
      if (time - d.expression.start >= EXPRESSION_DURATION) d.expression = null;
    }
    const idleAge = time - d.expressionIdleStart,
      idleCycle = Math.floor(idleAge / 14),
      idlePhase = idleAge % 14;
    if (
      d.reference &&
      !d.expression &&
      !walking &&
      d.mood === "happy" &&
      idlePhase >= 9 &&
      idlePhase < 9 + EXPRESSION_DURATION &&
      d.expressionIdleCycle !== idleCycle
    ) {
      d.expression = {
        name: ["curious", "affectionate", "delighted"][idleCycle % 3],
        start: time,
      };
      d.expressionIdleCycle = idleCycle;
    }
    expressionFrame(
      d.expression?.name,
      d.expression ? time - d.expression.start : 0,
      d.expressionFrame,
    );
  }
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
  const surprise = Math.max(0, Math.min(1, reaction.surprise || 0));
  if (surprise)
    for (const eye of d.eyes) {
      eye.userData.rideEyeZ ??= eye.position.z;
      eye.position.z = eye.userData.rideEyeZ + surprise * 0.035;
      eye.scale.set(
        1 + surprise * 0.1,
        1 + surprise * 0.17,
        1 + surprise * 0.12,
      );
    }
  const crouch = reaction.crouch || 0,
    paw = reaction.paw || 0;
  d.body.scale.y *= 1 - crouch;
  d.head.position.y -= crouch * 0.5;
  d.head.rotation.x += (reaction.headPitch || 0) - paw * 0.13;
  d.head.rotation.z += reaction.headRoll || 0;
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
  d.ears[0].rotation.x += (reaction.earRelax || 0) - paw * 0.08;
  d.ears[1].rotation.x += (reaction.earRelax || 0) - paw * 0.08;
  d.tail.rotation.z += paw * 0.13 + (reaction.tailSway || 0);
  if (reaction.ride) {
    // Animate the approved rig, leaving its carrier exactly on the real seat.
    d.head.rotation.y += reaction.headYaw || 0;
    d.body.rotation.z += reaction.bodyLean || 0;
    d.body.rotation.x += reaction.bodyPitch || 0;
    d.tail.rotation.x += reaction.tailTrail || 0;
    const grip = reaction.grip || 0;
    for (const [i, leg] of d.legs.entries()) {
      if (leg.position.z > 0) {
        leg.rotation.x -= grip * 0.24 + (reaction.frontLift || 0);
        leg.rotation.z += Math.sign(leg.position.x) * (reaction.pawSpread || 0);
        const joint = d.legJoints?.[i];
        if (joint) {
          joint.knee.rotation.x += grip * 0.24;
          joint.ankle.rotation.x -= grip * 0.22;
        }
      } else {
        leg.rotation.x += grip * 0.1 + (reaction.hindTuck || 0);
      }
    }
    const close = clamp(reaction.eyeClose || 0, 0, 0.98);
    for (let i = 0; i < d.eyes.length; i++) {
      const eye = d.eyes[i];
      eye.scale.y = Math.max(0.025, eye.scale.y * (1 - close));
      if (eye.scale.y <= 0.075) {
        eye.scale.x = 0.001;
        d.closedEyes[i].scale.setScalar(1);
      }
    }
  }
}
