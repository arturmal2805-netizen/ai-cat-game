import * as THREE from "three";
import { catAppearance, CAT_BUILDS } from "./cat-breeds.js";
import {
  sculptedCoat,
  taperedLeg,
  paintCoat,
  velvetCoat,
} from "./cat-sculpt.js";
import {
  mergeGeometries,
  mergeVertices,
} from "three/addons/utils/BufferGeometryUtils.js";
export const moodNames = ["sleep", "crazy hungry", "happy"];
export const CHICHI_FUR = 0x747c84;
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
function batchRigParts(parent, animated = new Set()) {
  parent.updateMatrixWorld(true);
  const buckets = new Map();
  for (const part of parent.children)
    if (
      part.isMesh &&
      part.visible &&
      !animated.has(part) &&
      !part.name.startsWith("ClosedEye")
    ) {
      const list = buckets.get(part.material) || [];
      list.push(part);
      buckets.set(part.material, list);
    }
  for (const parts of buckets.values()) {
    if (parts.length < 2) continue;
    const geometries = parts.map((part) => {
      part.updateMatrix();
      const g = part.geometry.index
        ? part.geometry.toNonIndexed()
        : part.geometry.clone();
      g.applyMatrix4(part.matrix);
      g.deleteAttribute("uv");
      if (parts[0].material.vertexColors && !g.attributes.color)
        g.setAttribute(
          "color",
          new THREE.Float32BufferAttribute(
            new Float32Array(g.attributes.position.count * 3).fill(1),
            3,
          ),
        );
      if (!parts[0].material.vertexColors) g.deleteAttribute("color");
      return g;
    });
    const combined = mergeGeometries(geometries);
    geometries.forEach((g) => g.dispose());
    if (!combined) continue;
    const main = parts[0];
    main.geometry = combined;
    main.position.set(0, 0, 0);
    main.rotation.set(0, 0, 0);
    main.scale.setScalar(1);
    for (const other of parts.slice(1)) other.visible = false;
  }
}
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
function irisGeometry(detail, eyeColor = 0xaacb75) {
  const g = new THREE.CircleGeometry(1, detail ? 64 : 20),
    p = g.attributes.position,
    colours = [],
    c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getX(i), p.getY(i)),
      a = Math.atan2(p.getY(i), p.getX(i));
    c.setHex(eyeColor)
      .lerp(
        new THREE.Color(r < 0.2 ? 0xddc071 : 0x52633c),
        r < 0.2 ? 0.2 : 0.12,
      )
      .multiplyScalar(0.92 + Math.sin(a * 37) * 0.11);
    colours.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colours, 3));
  return g;
}
export function createCat(mood = "happy", options = {}) {
  if (!moodNames.includes(mood)) throw new RangeError("Unknown Chichi mood");
  const detailed = options?.detail !== "npc",
    cat = new THREE.Group();
  const appearance = catAppearance({
      breed: options.breed || (options.color == null ? "blue" : "tabby"),
      ...options,
    }),
    build = {
      ...(CAT_BUILDS[appearance.build] || CAT_BUILDS.balanced),
      ...(options.color == null
        ? { width: 0.99, length: 1.12, face: 0.97 }
        : {}),
    };
  cat.name = options.name || "Chichi";
  const furColour = options?.color ?? CHICHI_FUR;
  const materials = {
    fur: velvetCoat(
      new THREE.MeshPhysicalMaterial({
        color: furColour,
        roughness:
          appearance.fur === "bare"
            ? 0.72
            : appearance.fur === "sleek"
              ? 0.65
              : 0.94,
        vertexColors: true,
        sheen: appearance.fur === "bare" ? 0 : 0.9,
        sheenColor: new THREE.Color(furColour).lerp(
          new THREE.Color(0xe7eced),
          0.3,
        ),
        sheenRoughness: 0.72,
      }),
      appearance.fur === "bare",
    ),
    muzzle: new THREE.MeshStandardMaterial({
      color: new THREE.Color(furColour).lerp(
        new THREE.Color(options?.color == null ? 0xb8bec4 : 0xb7ada1),
        0.38,
      ),
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
    white: new THREE.MeshStandardMaterial({ color: 0xf2ede2, roughness: 0.95 }),
    tongue: new THREE.MeshStandardMaterial({
      color: 0xd8a4a6,
      roughness: 0.85,
    }),
  };
  // Shared within one cat only: disposing portraits cannot invalidate the hero.
  const sphere = paintCoat(coatGeometry(detailed), appearance),
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
  const body = new THREE.Mesh(
    sculptedCoat("body", detailed, appearance),
    materials.fur,
  );
  body.name = "Body";
  body.position.set(0, 0.83, -0.06);
  body.scale.set(0.47 * build.width, 0.51, 0.72 * build.length);
  body.castShadow = true;
  cat.add(body);
  const chest = ball(
    cat,
    "Chest",
    "fur",
    [0, 0.94, 0.43],
    [0.3 * build.width, 0.4, 0.24],
  );
  chest.visible = appearance.pattern === "tuxedo";
  if (chest.visible) {
    chest.material = materials.white;
    chest.scale.set(0.22, 0.28, 0.1);
  }
  const head = new THREE.Group();
  if (appearance.neckRuff)
    ball(
      cat,
      "NeckRuff",
      "fur",
      [0, 1.02, 0.33],
      [0.32 * appearance.neckRuff, 0.3, 0.28],
    );
  head.name = "Head";
  head.position.set(0, 1.32, 0.53);
  cat.add(head);
  const face = new THREE.Mesh(
    sculptedCoat("face", detailed, appearance),
    materials.fur,
  );
  face.name = "Face";
  face.scale.set(0.41, 0.35, 0.38);
  face.castShadow = true;
  head.add(face);
  head.scale.set(
    build.face * (appearance.faceWidth || 1),
    build.face,
    build.face,
  );
  // Cheeks are part of Face. The short paired whisker pads keep a feline muzzle.
  for (const side of [-1, 1]) {
  }
  const ears = [],
    eyes = [],
    pupils = [],
    closedEyes = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Group();
    ear.name = side < 0 ? "LeftEar" : "RightEar";
    ear.position.set(side * 0.27, 0.24, -0.06);
    head.add(ear);
    ears.push(ear);
    ear.scale.set(appearance.ears, appearance.ears, 1);
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
    if (appearance.fur === "long") {
      stroke(
        ear,
        "EarTuft" + side,
        [
          [0, 0.45, 0.025],
          [side * 0.016, 0.61, 0.02],
          [side * 0.035, 0.7, -0.025],
        ],
        "fur",
        0.018,
      );
    }
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
    eye.position.set(side * 0.175, 0.027, 0.29);
    eye.rotation.y = side * 0.16;
    head.add(eye);
    eyes.push(eye);
    ball(eye, `EyeRim${side}`, "nose", [0, 0, 0.055], [0.103, 0.121, 0.018]);
    const iris = new THREE.Mesh(
      irisGeometry(
        detailed,
        side > 0
          ? appearance.otherEye || appearance.eyeColor
          : appearance.eyeColor,
      ),
      materials.iris,
    );
    iris.name = `Iris${side}`;
    iris.position.z = 0.074;
    iris.scale.set(0.096, 0.112, 1);
    eye.add(iris);
    if (detailed) {
      const fibres = [];
      for (let ray = 0; ray < 48; ray++) {
        const a = (ray * Math.PI * 2) / 48,
          g = new THREE.CylinderGeometry(0.0012, 0.0008, 0.045, 3);
        g.rotateZ(-a);
        g.scale(0.87, 1, 1);
        g.translate(Math.sin(a) * 0.068, Math.cos(a) * 0.079, 0.0755);
        fibres.push(g);
      }
      const fibresMesh = new THREE.Mesh(
        mergeGeometries(fibres),
        new THREE.MeshStandardMaterial({
          color: appearance.eyeColor,
          roughness: 0.38,
        }),
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
      [0.04, 0.078, 0.019],
    );
    pupils.push(pupil);
    ball(
      eye,
      `EyeShine${side}`,
      "shine",
      [-0.025, 0.044, 0.103],
      [0.017, 0.023, 0.007],
    );
    ball(
      eye,
      `EyeShineSmall${side}`,
      "shine",
      [0.024, -0.038, 0.099],
      [0.007, 0.009, 0.004],
    );
    closedEyes.push(
      stroke(
        head,
        `ClosedEye${side}`,
        [
          [side * 0.175 - 0.095, 0.019, 0.371],
          [side * 0.175, -0.01, 0.389],
          [side * 0.175 + 0.095, 0.019, 0.371],
        ],
        "nose",
        0.009,
      ),
    );
    {
      for (let line = 0; line < (detailed ? 4 : 2); line++) {
        const y = -0.2 + line * 0.035;
        stroke(
          head,
          `Whisker${side}_${line}`,
          [
            [side * 0.17, y, 0.43],
            [side * 0.43, y + (line - 1.5) * 0.036, 0.45],
            [side * (0.76 + line * 0.018), y + (line - 1.5) * 0.083, 0.405],
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
  nose.position.set(0, -0.106, 0.405);
  nose.scale.setScalar(0.78);
  head.add(nose);
  stroke(
    head,
    "Philtrum",
    [
      [0, -0.15, 0.416],
      [0, -0.19, 0.407],
      [0, -0.2, 0.4],
    ],
    "nose",
    0.005,
  );
  for (const side of [-1, 1])
    stroke(
      head,
      `Smile${side}`,
      [
        [0, -0.2, 0.4],
        [side * 0.043, -0.22, 0.397],
        [side * 0.09, -0.2, 0.391],
      ],
      "nose",
      0.006,
    );
  const jaw = new THREE.Group();
  jaw.name = "Jaw";
  jaw.position.set(0, -0.215, 0.31);
  head.add(jaw);
  ball(jaw, "Chin", "muzzle", [0, -0.038, 0.01], [0.17, 0.075, 0.113]);
  const mouth = ball(
    head,
    "Mouth",
    "dark",
    [0, -0.218, 0.385],
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
      leg.position.x *= build.width;
      leg.scale.y = build.height;
      const shin = new THREE.Mesh(
        taperedLeg(detailed, appearance),
        materials.fur,
      );
      shin.name = "Shin";
      shin.castShadow = true;
      leg.add(shin);
      ball(
        leg,
        "Paw",
        appearance.whitePaws || ["tuxedo", "ragdoll"].includes(appearance.breed)
          ? "white"
          : "fur",
        [0, -0.396, 0.075],
        [0.147, 0.095, 0.178],
      );
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
  if (appearance.fur === "long")
    tailMesh.scale.set(1.3 * (appearance.tailPlume || 1), 1.12, 1.12);
  tailTip.add(tailMesh);
  if (appearance.tailLength) tail.scale.setScalar(appearance.tailLength);
  if (appearance.fur !== "bare")
    for (const [parent, name, radii, amount] of [
      [
        head,
        detailed ? "CheekFluff" : "CheekFibres",
        [0.42, 0.34, 0.38],
        detailed ? 1200 : 160,
      ],
      [
        body,
        detailed ? "CoatFluff" : "CoatFibres",
        [1, 1, 1],
        detailed ? 1400 : 220,
      ],
    ]) {
      const tufts = [];
      for (let i = 0; i < amount; i++) {
        const y = 1 - (2 * (i + 0.5)) / amount,
          a = i * 2.399963,
          r = Math.sqrt(1 - y * y),
          direction = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
        if (parent === head && direction.z > 0.35) continue;
        const length =
            (0.026 + (Math.sin(i * 71) + 1) * 0.009) *
            (appearance.fur === "long"
              ? 2.8
              : appearance.fur === "plush"
                ? 1.3
                : 1),
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
    appearance,
    build,
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
  // Keep all rig nodes and every vertex. Only their static draw calls merge;
  // eyes, jaw, head, ears and each leg remain independently animated.
  batchRigParts(head, new Set([mouth, ...closedEyes]));
  for (const eye of eyes) batchRigParts(eye, new Set(pupils));
  for (const ear of ears) batchRigParts(ear);
  for (const leg of legs) batchRigParts(leg);
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
    speed = d.mood === "crazy hungry" ? 4.8 : 1.8;
  cat.scale.y = cat.scale.x * p.height;
  cat.position.y =
    moving && walking ? Math.sin(gaitTime * 10) * shape.bounce : 0;
  const rest = clamp((1 - p.height) / 0.3, 0, 1) * (walking ? 0.15 : 1);
  const breath = moving ? Math.sin(time * (d.mood === "sleep" ? 1.5 : 2.1)) : 0;
  d.body.position.y = 0.83 - rest * 0.17;
  d.chest.position.y = 0.94 - rest * 0.22;
  d.head.position.y = 1.32 + (shape.height - 1) * 0.22 - rest * 0.34;
  d.body.scale.set(
    0.47 * shape.width + breath * 0.006,
    0.51 - rest * 0.08 + breath * 0.008,
    0.72 * shape.length,
  );
  d.chest.scale.y = 0.45 + breath * 0.006;
  d.head.rotation.set(
    p.headX + (moving ? Math.sin(time * 1.1) * 0.014 : 0),
    moving ? Math.sin(time * 0.67) * 0.045 : 0,
    p.headZ + (moving ? Math.sin(time * speed * 0.6) * 0.024 : 0),
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
    d.pupils[i].scale.x = 0.04 + clamp((p.eyes - 1) / 0.12, 0, 1) * 0.018;
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
  d.jaw.position.y = -0.215 - p.jaw * 0.35;
  d.mouth.scale.y = 0.001 + p.jaw * 0.29;
  d.tongue.visible = p.jaw > 0.05;
  for (const leg of d.legs) {
    const phase = leg.position.x * leg.position.z > 0 ? Math.PI : 0;
    leg.rotation.x =
      moving && walking
        ? Math.sin(gaitTime * 10 + phase) * shape.stride
        : rest * (leg.position.z > 0 ? -0.95 : 1);
    leg.position.y =
      0.51 -
      rest * 0.24 +
      (moving && walking
        ? Math.max(0, Math.sin(gaitTime * 10 + phase)) * shape.bounce
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
  d.ears[0].rotation.x -= paw * 0.08;
  d.ears[1].rotation.x -= paw * 0.08;
  d.tail.rotation.z += paw * 0.13;
}
