import * as THREE from "three";
import { part } from "./bikini-scenery.js";
import { line } from "./fantasy-scenery.js";
import { batchModelGeometry } from "./model-batching.js";
export const FRIEND_DURATIONS = {
  greet: 10,
  five: 12,
  hug: 14,
  pet: 17,
  play: 30,
  dance: 18,
  photo: 13,
  sit: 22,
};
const smooth = (u) => {
  u = THREE.MathUtils.clamp(u, 0, 1);
  return u * u * (3 - 2 * u);
};
export function bikiniFriendFrame(
  t,
  intent = "play",
  kind = "sponge",
  reduced = false,
) {
  const duration = FRIEND_DURATIONS[intent] || 30,
    exit = smooth((duration - t) / 2.5),
    weight = smooth((t - 2.4) / 2) * exit;
  let phase = "greet",
    x = 0.5,
    z = 2.65,
    jump = 0,
    paw = 0.15 * weight,
    walking = false,
    wave = Math.sin(t * 6) * 0.4 * (1 - smooth((t - 2) / 2)),
    lean = 0.16 * weight,
    arm = 0.25 * weight,
    crouch = 0,
    pet = 0;
  if (t > 2.4) {
    phase = intent;
    if (intent === "five") {
      paw = 0.68 * weight;
      arm = 0.95 * weight;
      lean = 0.2 * weight;
      z -= 0.3 * weight;
    } else if (intent === "hug") {
      x = 0.5 - 0.1 * weight;
      z -= 0.88 * weight;
      arm = 1.2 * weight;
      lean = 0.3 * weight;
      paw = 0.23 * weight;
    } else if (intent === "pet" || intent === "sit" || intent === "photo") {
      x = 0.5 + 0.9 * weight;
      z = 2.65 - 1.8 * weight;
      crouch = 0.28 * weight;
      pet = intent === "pet" ? (0.25 + Math.sin(t * 2.6) * 0.12) * weight : 0;
      arm = intent === "photo" ? 0.75 * weight : 0.2 * weight;
      lean = 0.1 * weight;
    } else if (intent === "play") {
      const u = Math.max(0, t - 4),
        a = u * 0.83,
        chase = smooth(u / 2) * exit;
      x = 0.5 + Math.sin(a) * 3.4 * chase;
      z = 2.65 + (1 - Math.cos(a)) * 1.3 * chase;
      jump = Math.max(0, Math.sin(u * 2.3)) ** 4 * 0.8 * chase;
      paw = 0.22 + jump * 0.55;
      walking = jump < 0.15 && chase > 0.1;
      wave = Math.sin(t * 2.3) * 0.25 * weight;
      arm = 0.48 * weight;
    } else if (intent === "dance") {
      x += Math.sin(t * 2.4) * 0.65 * weight;
      jump = Math.abs(Math.sin(t * 3.2)) * 0.18 * weight;
      paw = 0.38 * weight;
      arm = 0.7 * weight;
      wave = Math.sin(t * 3) * 0.35 * weight;
    }
  }
  if (t > duration - 2.5) {
    phase = "goodbye";
    wave = Math.sin(t * 5) * 0.3 * exit;
  }
  if (reduced) {
    jump = 0;
    wave = 0;
    walking = false;
  }
  return {
    phase,
    duration,
    position: [x, jump, z],
    yaw:
      intent === "play"
        ? Math.PI +
          Math.atan2(
            Math.sin(
              Math.atan2(
                Math.cos((t - 4) * 0.83) * 3.4,
                Math.sin((t - 4) * 0.83) * 1.3,
              ) - Math.PI,
            ),
            Math.cos(
              Math.atan2(
                Math.cos((t - 4) * 0.83) * 3.4,
                Math.sin((t - 4) * 0.83) * 1.3,
              ) - Math.PI,
            ),
          ) *
            smooth((t - 4) / 2) *
            exit
        : intent === "photo"
          ? Math.PI * (1 - weight)
          : Math.PI,
    walking,
    paw,
    reaction: {
      paw,
      headPitch: phase === "play" ? -0.15 - jump * 0.12 : -0.15,
      headRoll: Math.sin(t * 1.5) * 0.04 * weight,
      crouch,
    },
    character: {
      stepForward: 0.35 * smooth(t / 2) * exit,
      walking: t < 2 && !reduced,
      wave,
      lean,
      arm,
      crouch: intent === "pet" || intent === "sit" ? 0.5 * weight : 0,
      pet,
      bounce:
        intent === "dance" && !reduced
          ? Math.abs(Math.sin(t * 3.2)) * 0.15 * weight
          : 0,
    },
    bubbles: intent === "play" && t > 3 && t < duration - 2,
    photo: intent === "photo" && t > 4 && t < 10,
  };
}
function bake(g) {
  const out = batchModelGeometry(g, { combineColors: true });
  g.traverse((o) => {
    if (o.isMesh && !o.geometry.userData.sharedScenery) o.geometry.dispose();
    if (o.isMesh && !o.material.userData.sharedScenery) o.material.dispose();
  });
  return out;
}
export function createBikiniCharacter(kind = "sponge") {
  const root = new THREE.Group(),
    rig = new THREE.Group(),
    body = new THREE.Group(),
    arms = [],
    legs = [];
  root.name =
    kind === "sponge"
      ? "Губка Боб · один живой персонаж"
      : "Патрик · морской друг";
  root.add(rig);
  const sponge = kind === "sponge",
    yellow = 0xf5d84a,
    pink = 0xf0a6a0;
  if (sponge) {
    part(body, "cube", yellow, 0, 2.7, 0, 2.55, 2.8, 1.03);
    for (let i = 0; i < 29; i++) {
      const x = Math.sin(i * 2.399) * 1.08,
        y = 1.7 + ((i * 0.371) % 2.25);
      if (Math.abs(x) < 0.85 && y > 2.6 && y < 3.65) continue;
      part(
        body,
        "sphere",
        i % 2 ? 0xe0bd36 : 0xe9c443,
        x,
        y,
        0.527,
        0.08 + (i % 3) * 0.025,
        0.11,
        0.018,
      );
    }
    part(body, "cube", 0xf7efe0, 0, 1.55, 0, 2.55, 0.39, 1.05);
    part(body, "cube", 0x986b43, 0, 1.12, 0, 2.57, 0.59, 1.06);
    for (const s of [-1, 1]) {
      const collar = part(
        body,
        "cube",
        0xfff7e7,
        s * 0.31,
        1.65,
        0.58,
        0.42,
        0.22,
        0.07,
      );
      collar.rotation.z = s * 0.24;
      part(body, "cube", 0x4f3e32, s * 0.72, 1.32, 0.55, 0.51, 0.07, 0.035);
    }
    const tie = part(body, "petal", 0xd95a4f, 0, 1.32, 0.6, 0.16, 0.38, 0.06);
  } else {
    const points = [
      new THREE.Vector2(0.42, 0.6),
      new THREE.Vector2(1.35, 1.1),
      new THREE.Vector2(1.5, 1.8),
      new THREE.Vector2(1.18, 2.45),
      new THREE.Vector2(0.77, 3.2),
      new THREE.Vector2(0.35, 3.9),
      new THREE.Vector2(0.03, 4.25),
    ];
    const mesh = new THREE.Mesh(
      new THREE.LatheGeometry(points, 40),
      new THREE.MeshStandardMaterial({ color: pink, roughness: 0.62 }),
    );
    body.add(mesh);
    const shorts = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.85, 0.62),
          new THREE.Vector2(1.3, 0.85),
          new THREE.Vector2(1.48, 1.2),
          new THREE.Vector2(1.51, 1.52),
        ],
        40,
      ),
      new THREE.MeshStandardMaterial({ color: 0x98c66d, roughness: 0.76 }),
    );
    body.add(shorts);
    for (const [x, y, z] of [
      [-0.7, 1.05, 1.25],
      [0.55, 1.05, 1.34],
      [0.9, 1.3, 1.23],
    ]) {
      for (let j = 0; j < 5; j++)
        part(
          body,
          "petal",
          0xb797c6,
          x + Math.sin(j * 1.257) * 0.18,
          y + Math.cos(j * 1.257) * 0.18,
          z,
          0.13,
          0.13,
          0.025,
        );
    }
    part(body, "sphere", 0xd78c88, 0, 1.65, 1.13, 0.07, 0.045, 0.025);
  }
  const eyesY = sponge ? 3.25 : 3.2,
    eyeX = sponge ? 0.5 : 0.28,
    faceZ = sponge ? 0.57 : 0.68;
  for (const s of [-1, 1]) {
    part(
      body,
      "sphere",
      0xfffaf1,
      s * eyeX,
      eyesY,
      faceZ,
      sponge ? 0.49 : 0.27,
      sponge ? 0.56 : 0.49,
      0.23,
    );
    part(
      body,
      "sphere",
      sponge ? 0x58a9d5 : 0x272e3b,
      s * eyeX,
      eyesY,
      faceZ + 0.22,
      sponge ? 0.24 : 0.105,
      sponge ? 0.29 : 0.15,
      0.075,
    );
    if (sponge)
      part(
        body,
        "sphere",
        0x273340,
        s * eyeX,
        eyesY,
        faceZ + 0.29,
        0.115,
        0.16,
        0.038,
      );
    part(
      body,
      "sphere",
      0xffffff,
      s * eyeX - 0.04,
      eyesY + 0.1,
      faceZ + 0.33,
      0.052,
      0.065,
      0.02,
    );
    if (sponge)
      for (let j = 0; j < 3; j++)
        line(
          body,
          [s * eyeX + (j - 1) * 0.24, 3.69, faceZ],
          [s * eyeX + (j - 1) * 0.32, 3.98, faceZ],
          0x473f39,
          0.035,
        );
    else
      line(
        body,
        [s * 0.1, 3.77, faceZ],
        [s * 0.43, 3.82, faceZ],
        0x5a4243,
        0.04,
      );
    part(
      body,
      "sphere",
      0xed9b79,
      s * (sponge ? 0.99 : 0.7),
      2.68,
      sponge ? 0.55 : 0.89,
      0.24,
      0.14,
      0.04,
    );
  }
  if (sponge) part(body, "sphere", yellow, 0, 2.96, 0.84, 0.16, 0.2, 0.42);
  const mouthY = sponge ? 2.35 : 2.55,
    mouthZ = sponge ? 0.56 : 0.98;
  const smile = [];
  for (let i = 0; i <= 20; i++) {
    const x = -0.7 + i * 0.07;
    const y = mouthY + 0.2 * (x / 0.7) ** 2;
    const radius = 1.18 - (y - 2.45) * (0.41 / 0.75);
    smile.push(
      new THREE.Vector3(
        x,
        y,
        sponge
          ? mouthZ
          : Math.sqrt(Math.max(0.05, radius * radius - x * x)) + 0.035,
      ),
    );
  }
  body.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(smile),
        24,
        0.035,
        6,
        false,
      ),
      new THREE.MeshStandardMaterial({ color: 0x6d3b35 }),
    ),
  );
  if (sponge)
    for (const s of [-1, 1])
      part(body, "cube", 0xfffaf0, s * 0.14, 2.26, 0.64, 0.24, 0.27, 0.09);
  rig.add(bake(body));
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(),
      p = new THREE.Group();
    arm.position.set(s * (sponge ? 1.28 : 1.12), sponge ? 2.1 : 2.2, 0);
    rig.add(arm);
    part(
      p,
      "sphere",
      sponge ? yellow : pink,
      s * 0.32,
      -0.45,
      0,
      sponge ? 0.12 : 0.3,
      0.65,
      sponge ? 0.12 : 0.32,
    );
    part(
      p,
      "sphere",
      sponge ? yellow : pink,
      s * 0.4,
      -1.02,
      0.03,
      0.22,
      0.23,
      0.15,
    );
    if (sponge)
      for (let j = 0; j < 3; j++)
        part(
          p,
          "sphere",
          yellow,
          s * (0.28 + j * 0.13),
          -1.2,
          0.08,
          0.06,
          0.17,
          0.065,
        );
    arm.add(bake(p));
    arms.push(arm);
    const leg = new THREE.Group(),
      p2 = new THREE.Group();
    leg.position.set(s * (sponge ? 0.66 : 0.67), sponge ? 0.83 : 0.62, 0);
    rig.add(leg);
    part(
      p2,
      "pole",
      sponge ? yellow : pink,
      0,
      -0.25,
      0,
      sponge ? 0.09 : 0.3,
      0.55,
      sponge ? 0.09 : 0.3,
    );
    if (sponge) {
      part(p2, "pole", 0xfff8eb, 0, -0.47, 0, 0.12, 0.36, 0.12);
      part(p2, "pole", 0x5c8cba, 0, -0.4, 0, 0.125, 0.035, 0.125);
      part(p2, "sphere", 0x39383c, s * 0.08, -0.66, 0.13, 0.36, 0.17, 0.3);
    } else part(p2, "sphere", pink, 0, -0.42, 0.16, 0.34, 0.2, 0.38);
    leg.add(bake(p2));
    legs.push(leg);
  }
  const bubbles = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.23, 14, 10),
    new THREE.MeshPhysicalMaterial({
      color: 0xbce8f5,
      transparent: true,
      opacity: 0.27,
      roughness: 0.12,
      metalness: 0.15,
      clearcoat: 1,
      depthWrite: false,
    }),
    12,
  );
  bubbles.frustumCulled = false;
  bubbles.visible = false;
  root.add(bubbles);
  const cap = new THREE.Group();
  if (sponge) {
    part(cap, "sphere", 0xfff8e8, 0, 4.17, 0, 0.7, 0.25, 0.53);
    part(cap, "cube", 0x7698ba, 0, 4.12, 0.35, 0.8, 0.1, 0.22);
  }
  cap.visible = false;
  rig.add(cap);
  const spatula = new THREE.Group();
  if (sponge) {
    part(spatula, "pole", 0x777e86, 0, -1.18, 0.3, 0.035, 0.65, 0.035);
    part(spatula, "cube", 0xc1c7c8, 0, -1.48, 0.3, 0.32, 0.05, 0.4);
    arms[1].add(spatula);
  }
  spatula.visible = false;
  const particle = new THREE.Object3D(),
    contact = new THREE.Vector3(),
    direction = new THREE.Vector3(),
    handBase = new THREE.Vector3(0.4, -1.02, 0.03),
    handDirection = handBase.clone().normalize(),
    handOriginal = new THREE.Quaternion(),
    handTarget = new THREE.Quaternion();
  const d = (root.userData = {
    id: "bikini-" + kind,
    bikiniFriend: kind,
    handpainted: true,
    duration: 30,
    rig,
    arms,
    legs,
    bubbles,
    intent: "play",
    pose: null,
    setIntent(intent) {
      d.intent = FRIEND_DURATIONS[intent] ? intent : "play";
      d.duration = FRIEND_DURATIONS[d.intent];
    },
    applyPose(
      time,
      {
        walking = false,
        wave = 0,
        lean = 0,
        arm = 0,
        crouch = 0,
        pet = 0,
        bounce = 0,
        chef = false,
        stepForward = 0,
      } = {},
      reduced = false,
    ) {
      cap.visible = spatula.visible = chef;
      rig.position.y =
        -crouch + bounce + (reduced ? 0 : Math.sin(time * 2) * 0.025);
      rig.position.z = stepForward;
      rig.rotation.x = lean;
      rig.rotation.z = 0;
      for (let i = 0; i < 2; i++) {
        const s = i ? 1 : -1;
        legs[i].position.y = (sponge ? 0.83 : 0.62) + crouch;
        legs[i].rotation.x =
          walking && !reduced ? Math.sin(time * 7 + i * Math.PI) * 0.4 : 0;
        arms[i].scale.setScalar(1);
        arms[i].rotation.z = -s * arm + (i === 1 ? wave : 0);
        arms[i].position.z = arm * 0.35;
        arms[i].rotation.x =
          (walking && !reduced ? Math.sin(time * 7 + i * Math.PI) * 0.3 : 0) -
          (arm * 0.7 +
            pet +
            (chef ? 0.65 + (reduced ? 0 : Math.sin(time * 6) * 0.18) : 0));
      }
    },
    touchCat(model) {
      const phase = d.intent;
      if (
        !sponge ||
        !d.pose ||
        d.pose.phase === "greet" ||
        !["five", "pet"].includes(phase)
      )
        return;
      const joints = model.userData.legJoints,
        legs = model.userData.legs;
      const ankle = joints.find(
        (_, i) => legs[i].position.z > 0 && legs[i].position.x < 0,
      )?.ankle;
      const target = phase === "pet" ? model.userData.head : ankle;
      if (!target) return;
      target.updateWorldMatrix(true, false);
      contact.set(
        0,
        phase === "pet" ? 0.4 : -0.1,
        phase === "pet" ? 0.03 : 0.1,
      );
      target.localToWorld(contact);
      rig.updateWorldMatrix(true, false);
      rig.worldToLocal(contact);
      const arm = arms[1];
      direction.copy(contact).sub(arm.position);
      const length = direction.length(),
        weight = Math.min(
          1,
          d.pose.character.arm / (phase === "five" ? 0.95 : 0.2),
        );
      handOriginal.copy(arm.quaternion);
      handTarget.setFromUnitVectors(handDirection, direction.normalize());
      arm.quaternion.slerpQuaternions(handOriginal, handTarget, weight);
      arm.scale.setScalar(
        1 + (Math.min(2.6, length / handBase.length()) - 1) * weight,
      );
      arm.updateWorldMatrix(false, true);
    },
    playFrame(t, reduced = false) {
      const f = bikiniFriendFrame(t, d.intent, kind, reduced);
      d.pose = f;
      d.applyPose(t, f.character, reduced);
      bubbles.visible = f.bubbles && !reduced;
      if (bubbles.visible) {
        for (let i = 0; i < 12; i++) {
          const u = (t * 0.3 + i * 0.16) % 1;
          particle.position.set(
            Math.sin(i * 2.399 + t * 0.3) * 3.4,
            0.8 + u * 3.1,
            2.6 + Math.cos(i * 2.399 + t * 0.3) * 1.5,
          );
          if (i === 0)
            particle.position.set(
              f.position[0] + Math.sin(f.yaw) * 0.8,
              1.45 + f.position[1] * 0.8,
              f.position[2] + Math.cos(f.yaw) * 0.8,
            );
          particle.scale.setScalar(0.55 + (i % 4) * 0.25);
          particle.updateMatrix();
          bubbles.setMatrixAt(i, particle.matrix);
        }
        bubbles.instanceMatrix.needsUpdate = true;
      }
      return f;
    },
    update(time, reduced = false) {
      if (!d.playing) {
        bubbles.visible = false;
        d.applyPose(time, d.idlePose || {}, reduced);
      }
    },
  });
  return root;
}
