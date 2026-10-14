import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
export const moodNames = ["sleep", "crazy hungry", "happy"];
export const CHICHI_FUR = 0x71655f;
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
// Vertex-coloured velvet exports to GLB and needs no fur shaders or downloads.
function coatGeometry(detail) {
  const g = new THREE.SphereGeometry(1, detail ? 40 : 16, detail ? 28 : 12);
  if (!detail) return g;
  const p = g.attributes.position,
    colours = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const grain =
      Math.sin(x * 183 + y * 91 + z * 147) * Math.sin(z * 127 - y * 157);
    const v = 0.93 + grain * 0.045 + y * 0.045;
    colours.push(v, v, v);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colours, 3));
  return g;
}
function earShape(inner = false) {
  const s = new THREE.Shape(),
    w = inner ? 0.125 : 0.19,
    h = inner ? 0.36 : 0.51;
  s.moveTo(-w, 0);
  s.bezierCurveTo(-w * 1.1, h * 0.33, -0.04, h * 0.94, 0, h);
  s.bezierCurveTo(0.045, h * 1.04, w * 0.95, h * 0.34, w, 0.025);
  s.quadraticCurveTo(0, -0.075, -w, 0);
  return s;
}
function irisGeometry(detail) {
  const g = new THREE.CircleGeometry(1, detail ? 64 : 20),
    p = g.attributes.position,
    colours = [],
    c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getX(i), p.getY(i)),
      a = Math.atan2(p.getY(i), p.getX(i));
    c.setHex(r < 0.2 ? 0xd8ad4e : 0x899347).multiplyScalar(
      0.92 + Math.sin(a * 37) * 0.11,
    );
    colours.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colours, 3));
  return g;
}
export function createCat(mood = "happy", options = {}) {
  if (!moodNames.includes(mood)) throw new RangeError("Unknown Chichi mood");
  const detailed = options?.detail !== "npc",
    cat = new THREE.Group();
  cat.name = "Chichi";
  const furColour = options?.color ?? CHICHI_FUR;
  const materials = {
    fur: new THREE.MeshStandardMaterial({
      color: furColour,
      roughness: 0.94,
      vertexColors: detailed,
    }),
    muzzle: new THREE.MeshStandardMaterial({
      color: new THREE.Color(furColour).lerp(new THREE.Color(0xb7ada1), 0.38),
      roughness: 0.97,
      vertexColors: detailed,
    }),
    pink: new THREE.MeshStandardMaterial({ color: 0x967575, roughness: 0.95 }),
    nose: new THREE.MeshStandardMaterial({ color: 0x48382f, roughness: 0.7 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x211d1b, roughness: 0.6 }),
    whisker: new THREE.MeshStandardMaterial({
      color: 0xd7cec2,
      roughness: 0.8,
    }),
    iris: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.28,
      metalness: 0.08,
    }),
    pupil: new THREE.MeshStandardMaterial({ color: 0x111916, roughness: 0.18 }),
    shine: new THREE.MeshBasicMaterial({ color: 0xfffaf1, toneMapped: false }),
    tongue: new THREE.MeshStandardMaterial({
      color: 0xd8a4a6,
      roughness: 0.85,
    }),
  };
  // Shared within one cat only: disposing portraits cannot invalidate the hero.
  const sphere = coatGeometry(detailed),
    smooth = new THREE.SphereGeometry(1, detailed ? 28 : 12, detailed ? 18 : 8);
  function ball(parent, name, material, pos, scale) {
    const mesh = new THREE.Mesh(
      ["fur", "muzzle"].includes(material) ? sphere : smooth,
      materials[material],
    );
    mesh.name = name;
    mesh.position.set(...pos);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function stroke(parent, name, points, material, radius = 0.006) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    const geometry = new THREE.TubeGeometry(
      curve,
      detailed ? 12 : 5,
      radius,
      5,
      false,
    );
    if (materials[material].vertexColors)
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(
          new Float32Array(geometry.attributes.position.count * 3).fill(1),
          3,
        ),
      );
    const mesh = new THREE.Mesh(geometry, materials[material]);
    mesh.name = name;
    parent.add(mesh);
    return mesh;
  }
  const body = ball(cat, "Body", "fur", [0, 0.83, -0.06], [0.47, 0.51, 0.72]);
  const chest = ball(cat, "Chest", "fur", [0, 0.94, 0.43], [0.4, 0.45, 0.37]);
  for (const side of [-1, 1])
    ball(
      cat,
      `Haunch${side}`,
      "fur",
      [side * 0.3, 0.58, -0.48],
      [0.28, 0.36, 0.34],
    );
  const head = new THREE.Group();
  head.name = "Head";
  head.position.set(0, 1.43, 0.49);
  cat.add(head);
  ball(head, "Face", "fur", [0, 0, 0], [0.55, 0.46, 0.47]);
  for (const side of [-1, 1]) {
    ball(
      head,
      `SoftCheek${side}`,
      "fur",
      [side * 0.32, -0.18, 0.1],
      [0.25, 0.25, 0.33],
    );
    ball(
      head,
      `Muzzle${side}`,
      "muzzle",
      [side * 0.135, -0.205, 0.42],
      [0.2, 0.125, 0.16],
    );
  }
  const ears = [],
    eyes = [],
    pupils = [],
    closedEyes = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Group();
    ear.name = side < 0 ? "LeftEar" : "RightEar";
    ear.position.set(side * 0.36, 0.32, -0.06);
    head.add(ear);
    ears.push(ear);
    const outer = new THREE.Mesh(
      new THREE.ExtrudeGeometry(earShape(), {
        depth: 0.09,
        bevelEnabled: true,
        bevelSegments: detailed ? 3 : 1,
        steps: 1,
        bevelSize: 0.036,
        bevelThickness: 0.034,
        curveSegments: detailed ? 12 : 5,
      }),
      materials.fur,
    );
    outer.geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(
        new Float32Array(outer.geometry.attributes.position.count * 3).fill(1),
        3,
      ),
    );
    outer.geometry.deleteAttribute("normal");
    outer.geometry.deleteAttribute("uv");
    const smoothEar = mergeVertices(outer.geometry);
    outer.geometry.dispose();
    outer.geometry = smoothEar;
    outer.geometry.computeVertexNormals();
    outer.castShadow = true;
    ear.add(outer);
    const inner = new THREE.Mesh(
      new THREE.ShapeGeometry(earShape(true), detailed ? 16 : 6),
      materials.pink,
    );
    inner.position.set(0, 0.065, 0.128);
    ear.add(inner);
    if (detailed)
      for (let strand = 0; strand < 3; strand++) {
        const x = (strand - 1) * 0.043;
        stroke(
          ear,
          `EarWisp${side}_${strand}`,
          [
            [x, 0.08, 0.139],
            [x * 0.7, 0.17, 0.148],
            [x * 0.3, 0.25, 0.133],
          ],
          "muzzle",
          0.0028,
        );
      }
    const eye = new THREE.Group();
    eye.name = `Eye${side}`;
    eye.position.set(side * 0.248, 0.025, 0.413);
    eye.rotation.y = side * 0.16;
    head.add(eye);
    eyes.push(eye);
    ball(eye, `EyeRim${side}`, "nose", [0, 0, 0.055], [0.153, 0.18, 0.021]);
    const iris = new THREE.Mesh(irisGeometry(detailed), materials.iris);
    iris.name = `Iris${side}`;
    iris.position.z = 0.074;
    iris.scale.set(0.143, 0.165, 1);
    eye.add(iris);
    if (detailed) {
      const fibres = [];
      for (let ray = 0; ray < 48; ray++) {
        const a = (ray * Math.PI * 2) / 48,
          g = new THREE.CylinderGeometry(0.0017, 0.001, 0.065, 3);
        g.rotateZ(-a);
        g.scale(0.87, 1, 1);
        g.translate(Math.sin(a) * 0.101, Math.cos(a) * 0.116, 0.0755);
        fibres.push(g);
      }
      const fibresMesh = new THREE.Mesh(
        mergeGeometries(fibres),
        new THREE.MeshStandardMaterial({ color: 0xbfa457, roughness: 0.38 }),
      );
      fibresMesh.name = `IrisFibres${side}`;
      eye.add(fibresMesh);
      fibres.forEach((g) => g.dispose());
    }
    const pupil = ball(
      eye,
      `Pupil${side}`,
      "pupil",
      [0, 0, 0.081],
      [0.061, 0.115, 0.019],
    );
    pupils.push(pupil);
    ball(
      eye,
      `EyeShine${side}`,
      "shine",
      [-0.035, 0.065, 0.103],
      [0.028, 0.035, 0.007],
    );
    ball(
      eye,
      `EyeShineSmall${side}`,
      "shine",
      [0.039, -0.055, 0.099],
      [0.01, 0.012, 0.004],
    );
    closedEyes.push(
      stroke(
        head,
        `ClosedEye${side}`,
        [
          [side * 0.248 - 0.14, 0.019, 0.489],
          [side * 0.248, -0.017, 0.505],
          [side * 0.248 + 0.14, 0.019, 0.489],
        ],
        "nose",
        0.009,
      ),
    );
    if (detailed) {
      for (let line = 0; line < 4; line++) {
        const y = -0.2 + line * 0.035;
        stroke(
          head,
          `Whisker${side}_${line}`,
          [
            [side * 0.17, y, 0.559],
            [side * 0.43, y + (line - 1.5) * 0.036, 0.595],
            [side * (0.76 + line * 0.018), y + (line - 1.5) * 0.083, 0.51],
          ],
          "whisker",
          0.0032,
        );
      }
      for (let dot = 0; dot < 3; dot++)
        ball(
          head,
          `WhiskerFreckle${side}_${dot}`,
          "nose",
          [
            side * (0.14 + dot * 0.044),
            -0.185 - dot * 0.018,
            0.565 - dot * 0.012,
          ],
          [0.007, 0.007, 0.004],
        );
    }
  }
  const ns = new THREE.Shape();
  ns.moveTo(-0.074, 0.02);
  ns.quadraticCurveTo(0, 0.057, 0.074, 0.02);
  ns.quadraticCurveTo(0.035, -0.065, 0, -0.073);
  ns.quadraticCurveTo(-0.035, -0.065, -0.074, 0.02);
  const nose = new THREE.Mesh(
    new THREE.ExtrudeGeometry(ns, {
      depth: 0.017,
      bevelEnabled: true,
      bevelSize: 0.009,
      bevelThickness: 0.01,
      bevelSegments: 3,
      steps: 1,
    }),
    materials.nose,
  );
  nose.name = "Nose";
  nose.position.set(0, -0.135, 0.564);
  head.add(nose);
  stroke(
    head,
    "Philtrum",
    [
      [0, -0.191, 0.58],
      [0, -0.224, 0.578],
      [0, -0.245, 0.563],
    ],
    "nose",
    0.005,
  );
  for (const side of [-1, 1])
    stroke(
      head,
      `Smile${side}`,
      [
        [0, -0.242, 0.565],
        [side * 0.043, -0.26, 0.556],
        [side * 0.11, -0.248, 0.54],
      ],
      "nose",
      0.006,
    );
  const jaw = new THREE.Group();
  jaw.name = "Jaw";
  jaw.position.set(0, -0.255, 0.425);
  head.add(jaw);
  ball(jaw, "Chin", "muzzle", [0, -0.038, 0.01], [0.17, 0.075, 0.113]);
  const mouth = ball(
    head,
    "Mouth",
    "dark",
    [0, -0.278, 0.53],
    [0.09, 0.001, 0.015],
  );
  const tongue = ball(
    jaw,
    "Tongue",
    "tongue",
    [0, 0.018, 0.112],
    [0.052, 0.016, 0.043],
  );
  const legs = [];
  for (const side of [-1, 1])
    for (const front of [-1, 1]) {
      const leg = new THREE.Group();
      leg.name = `Leg${side}_${front}`;
      leg.position.set(side * 0.295, 0.51, front * 0.455);
      cat.add(leg);
      legs.push(leg);
      ball(leg, "Shin", "fur", [0, -0.12, 0], [0.153, 0.28, 0.165]);
      ball(leg, "Paw", "fur", [0, -0.396, 0.075], [0.186, 0.105, 0.217]);
      if (detailed)
        for (const toe of [-1, 1])
          stroke(
            leg,
            `Toe${toe}`,
            [
              [toe * 0.049, -0.379, 0.27],
              [toe * 0.053, -0.352, 0.247],
              [toe * 0.051, -0.325, 0.203],
            ],
            "muzzle",
            0.004,
          );
    }
  const tail = new THREE.Group();
  tail.name = "Tail";
  tail.position.set(0, 0.71, -0.65);
  cat.add(tail);
  const tailTip = new THREE.Group();
  tailTip.name = "TailTip";
  tail.add(tailTip);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.2, 0.02, -0.3),
    new THREE.Vector3(0.38, 0.3, -0.57),
    new THREE.Vector3(0.32, 0.66, -0.67),
    new THREE.Vector3(0.15, 0.89, -0.55),
  ]);
  const steps = detailed ? 40 : 16,
    radial = detailed ? 14 : 8,
    g = new THREE.TubeGeometry(curve, steps, 0.15, radial, false),
    tp = g.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const t = Math.floor(i / (radial + 1)) / steps,
      c = curve.getPointAt(t),
      taper = t < 0.72 ? 1 : Math.sqrt(Math.max(0.015, (1 - t) / 0.28));
    tp.setXYZ(
      i,
      c.x + (tp.getX(i) - c.x) * taper,
      c.y + (tp.getY(i) - c.y) * taper,
      c.z + (tp.getZ(i) - c.z) * taper,
    );
  }
  g.computeVertexNormals();
  g.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(
      new Float32Array(tp.count * 3).fill(0.96),
      3,
    ),
  );
  const tailMesh = new THREE.Mesh(g, materials.fur);
  tailMesh.castShadow = true;
  tailTip.add(tailMesh);
  if (detailed)
    for (const [parent, name, radii, amount] of [
      [head, "CheekFluff", [0.55, 0.46, 0.47], 1200],
      [body, "CoatFluff", [1, 1, 1], 1400],
    ]) {
      const tufts = [];
      for (let i = 0; i < amount; i++) {
        const y = 1 - (2 * (i + 0.5)) / amount,
          a = i * 2.399963,
          r = Math.sqrt(1 - y * y),
          direction = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
        if (parent === head && direction.z > 0.35) continue;
        const length = 0.026 + (Math.sin(i * 71) + 1) * 0.009,
          t = new THREE.ConeGeometry(0.0022, length, 3);
        const groom = new THREE.Vector3(0, -1, -0.15)
          .addScaledVector(direction, direction.y + direction.z * 0.15)
          .normalize()
          .addScaledVector(direction, 0.24)
          .normalize();
        t.translate(0, length * 0.22, 0);
        t.applyQuaternion(
          new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            groom,
          ),
        );
        t.translate(
          direction.x * radii[0] * 1.006,
          direction.y * radii[1] * 1.006,
          direction.z * radii[2] * 1.006,
        );
        t.setAttribute(
          "color",
          new THREE.Float32BufferAttribute(
            new Float32Array(t.attributes.position.count * 3).fill(0.99),
            3,
          ),
        );
        tufts.push(t);
      }
      const fluff = new THREE.Mesh(mergeGeometries(tufts), materials.fur);
      fluff.name = name;
      parent.add(fluff);
      tufts.forEach((t) => t.dispose());
    }
  cat.userData = {
    mood,
    detailed,
    head,
    tail,
    tailTip,
    body,
    chest,
    ears,
    eyes,
    pupils,
    closedEyes,
    jaw,
    mouth,
    tongue,
    legs,
    pose: { ...poses[mood] },
    lastTime: null,
  };
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
    speed = d.mood === "crazy hungry" ? 4.8 : 1.8;
  cat.scale.y = cat.scale.x * p.height;
  cat.position.y = moving && walking ? Math.sin(time * 10) * 0.027 : 0;
  const rest = clamp((1 - p.height) / 0.3, 0, 1) * (walking ? 0.15 : 1);
  const breath = moving ? Math.sin(time * (d.mood === "sleep" ? 1.5 : 2.1)) : 0;
  d.body.position.y = 0.83 - rest * 0.17;
  d.chest.position.y = 0.94 - rest * 0.22;
  d.head.position.y = 1.43 - rest * 0.34;
  d.body.scale.set(
    0.47 + breath * 0.006,
    0.51 - rest * 0.08 + breath * 0.008,
    0.72,
  );
  d.chest.scale.y = 0.45 + breath * 0.006;
  d.head.rotation.set(
    p.headX + (moving ? Math.sin(time * 1.1) * 0.014 : 0),
    moving ? Math.sin(time * 0.67) * 0.045 : 0,
    p.headZ + (moving ? Math.sin(time * speed * 0.6) * 0.024 : 0),
  );
  d.tail.rotation.set(
    -rest * 0.9,
    moving ? Math.sin(time * speed * 0.55) * 0.15 : 0,
    p.tail + (moving ? Math.sin(time * speed) * 0.13 : 0),
  );
  d.tailTip.rotation.x = moving ? Math.sin(time * speed - 0.5) * 0.055 : 0;
  const blink = moving && d.detailed ? blinkOpenness(time) : 1;
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
    d.pupils[i].scale.x = 0.061 + clamp((p.eyes - 1) / 0.12, 0, 1) * 0.018;
    const twitch = moving
      ? Math.pow(Math.max(0, Math.sin(time * 0.8 + i * 1.7)), 18) * 0.055
      : 0;
    d.ears[i].rotation.set(
      -0.045 + p.ears + twitch,
      side * 0.06,
      side * -0.26 + side * p.ears * 0.35,
    );
  }
  d.jaw.rotation.x = p.jaw + (moving ? Math.sin(time * 3.1) * p.jaw * 0.15 : 0);
  d.jaw.position.y = -0.255 - p.jaw * 0.35;
  d.mouth.scale.y = 0.001 + p.jaw * 0.29;
  d.tongue.visible = p.jaw > 0.05;
  for (const leg of d.legs) {
    const phase = leg.position.x * leg.position.z > 0 ? Math.PI : 0;
    leg.rotation.x =
      moving && walking
        ? Math.sin(time * 10 + phase) * 0.32
        : rest * (leg.position.z > 0 ? -0.95 : 1);
    leg.position.y =
      0.51 -
      rest * 0.24 +
      (moving && walking
        ? Math.max(0, Math.sin(time * 10 + phase)) * 0.026
        : 0);
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
    materials = new Set();
  cat.traverse((node) => {
    if (!node.isMesh) return;
    geometries.add(node.geometry);
    for (const m of Array.isArray(node.material)
      ? node.material
      : [node.material])
      materials.add(m);
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}
