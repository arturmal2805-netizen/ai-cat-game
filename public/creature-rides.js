import * as THREE from "three";
import {
  shape,
  line,
  flowerCluster,
  batchScenery,
  lantern,
} from "./fantasy-scenery.js";
const TYPES = [
  "ride-butterfly",
  "ride-dragonfly",
  "ride-jellyfish",
  "ride-lotus",
  "ride-dinosaur",
];
export function creatureRide(id, { ambient = false, variant = 0 } = {}) {
  if (!TYPES.includes(id)) return null;
  const root = new THREE.Group(),
    moving = new THREE.Group(),
    staticRoot = new THREE.Group(),
    appendages = [];
  root.add(staticRoot, moving);
  let seat = 1.25;
  if (id === "ride-jellyfish") {
    seat = 1.45;
    const bell = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: [0xc7a4fa, 0x86cfe8, 0xeca2d8][variant % 3],
        emissive: 0x9d83d6,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.7,
        roughness: 0.2,
        metalness: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    bell.scale.set(1.25, 0.7, 1.25);
    bell.position.y = 0.3;
    moving.add(bell);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.045, 6, 40),
      new THREE.MeshBasicMaterial({ color: 0xc3dfff }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.3;
    moving.add(ring);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6,
        tube = new THREE.Group();
      tube.position.set(Math.sin(a), 0.28, Math.cos(a));
      moving.add(tube);
      const points = Array.from(
        { length: 9 },
        (_, j) =>
          new THREE.Vector3(
            Math.sin(j * 0.7 + i) * 0.15,
            -j * 0.24,
            Math.cos(j * 0.7 + i) * 0.1,
          ),
      );
      const tentacle = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          18,
          0.019,
          4,
          false,
        ),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0xd5b3ef : 0xb4e6fa }),
      );
      tube.add(tentacle);
      appendages.push(tube);
    }
    for (let i = 0; i < 7; i++)
      shape(
        moving,
        "sphere",
        0xffdbef,
        Math.sin(i * 2.4) * 0.75,
        0.8,
        Math.cos(i * 2.4) * 0.75,
        0.055,
        0.055,
        0.055,
        true,
      );
  } else if (id === "ride-butterfly" || id === "ride-dragonfly") {
    shape(moving, "sphere", 0x8760ac, 0, 0.1, 0, 0.16, 0.2, 0.75);
    for (const side of [-1, 1]) {
      const wing = new THREE.Group();
      moving.add(wing);
      appendages.push(wing);
      for (let [z, length, width, color] of [
        [0.3, 1.45, 0.83, 0xefb582],
        [-0.48, 1.0, 0.74, 0xd29edb],
      ]) {
        if (id === "ride-dragonfly") {
          length *= 1.15;
          width *= 0.34;
          color = z > 0 ? 0x9adfea : 0xafaade;
        }
        const outline = new THREE.Shape();
        outline.moveTo(0, 0);
        outline.bezierCurveTo(
          side * 0.45,
          -width,
          side * length,
          -width,
          side * length * 0.97,
          0.05,
        );
        outline.bezierCurveTo(
          side * length,
          width,
          side * 0.4,
          width * 0.9,
          0,
          0,
        );
        const mesh = new THREE.Mesh(
          new THREE.ExtrudeGeometry(outline, {
            depth: 0.045,
            bevelEnabled: true,
            bevelSize: 0.035,
            bevelThickness: 0.025,
            bevelSegments: 2,
            curveSegments: 14,
          }),
          new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.12,
            roughness: 0.4,
            side: THREE.DoubleSide,
          }),
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.z = z;
        wing.add(mesh);
        for (let i = 1; i < 5; i++)
          line(
            wing,
            [side * 0.1, 0.08, z],
            [(side * length * i) / 5, 0.08, z + Math.sin(i) * width * 0.6],
            0xffefd2,
            0.012,
          );
        for (let i = 0; i < 6; i++)
          shape(
            wing,
            "sphere",
            0xffe9d0,
            side * (0.48 + i * 0.12),
            0.1,
            z + Math.sin(i * 2.4) * 0.35,
            0.06,
            0.025,
            0.075,
          );
      }
    }
    for (const x of [-0.09, 0.09])
      line(moving, [x, 0.17, 0.6], [x * 2, 0.52, 0.98], 0x6d4d8a, 0.018);
    seat = 0.5;
  } else if (id === "ride-lotus") {
    seat = 0.7;
    shape(moving, "sphere", 0x82b5a0, 0, -0.1, 0, 1.5, 0.08, 1.5);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6,
        petal = shape(
          moving,
          "petal",
          i % 2 ? 0xf2b4db : 0xe9c9fa,
          Math.sin(a) * 0.65,
          0.12,
          Math.cos(a) * 0.65,
          0.4,
          0.8,
          0.2,
          true,
        );
      petal.rotation.y = a;
      petal.rotation.z = Math.sin(a) * 0.4;
      appendages.push(petal);
    }
    shape(moving, "sphere", 0xffdd89, 0, 0.25, 0, 0.55, 0.15, 0.55, true);
  } else {
    seat = 0.95;
    shape(
      moving,
      "sphere",
      [0x86c98c, 0xeab179, 0x83c5d4][variant % 3],
      0,
      0.45,
      0,
      0.62,
      0.6,
      1.1,
    );
    shape(moving, "sphere", 0xa5dba2, 0, 0.9, 0.77, 0.26, 0.85, 0.28);
    shape(moving, "sphere", 0xa4d4b4, 0, 1.5, 0.95, 0.43, 0.35, 0.48);
    for (const side of [-1, 1]) {
      shape(
        moving,
        "sphere",
        0xfff3d7,
        side * 0.32,
        1.56,
        1.18,
        0.12,
        0.13,
        0.075,
      );
      shape(
        moving,
        "sphere",
        0x4c566b,
        side * 0.33,
        1.56,
        1.24,
        0.055,
        0.072,
        0.03,
      );
      for (const z of [-0.65, 0.48]) {
        const leg = new THREE.Group();
        leg.position.set(side * 0.38, 0.4, z);
        moving.add(leg);
        shape(leg, "sphere", 0x7dbb87, 0, -0.21, 0, 0.14, 0.23, 0.17);
        appendages.push(leg);
      }
    }
    for (let i = 0; i < 5; i++) {
      const a = i / 5;
      shape(
        moving,
        "sphere",
        0x8ec789,
        0,
        0.42 - a * 0.25,
        -0.8 - a * 0.9,
        0.19 * (1 - a) + 0.03,
        0.2 * (1 - a) + 0.03,
        0.3,
      );
    }
    for (let i = 0; i < 4; i++)
      shape(moving, "cone", 0xf6d985, 0, 0.95, -0.63 + i * 0.35, 0.1, 0.3, 0.1);
  }
  if (!ambient) {
    const saddle = shape(
      moving,
      "sphere",
      0xd2a176,
      0,
      seat - 0.12,
      0,
      0.4,
      0.1,
      0.45,
    );
    saddle.name = "Cat saddle";
    for (const x of [-0.38, 0.38])
      line(
        moving,
        [x, seat - 0.1, 0.25],
        [x, seat + 0.15, 0.25],
        0xe9cb96,
        0.024,
      );
    flowerCluster(staticRoot, -1.3, 1.1, 0xe8bbce, 0.8);
    lantern(staticRoot, 1.4, 0, 1.2, 0.38);
  }
  const duration = 15;
  const frame = (elapsed, reduced = false) => {
    const t = Math.min(1, Math.max(0, elapsed / duration)),
      rise = Math.sin(t * Math.PI),
      angle = t * Math.PI * 2;
    const flying = id !== "ride-dinosaur";
    return {
      position: [
        reduced ? 0 : Math.sin(angle) * (flying ? 3.2 : 1.5),
        seat +
          (flying ? 0.65 : 0) +
          (reduced
            ? 0
            : rise * (flying ? 4.2 : 0) + Math.sin(elapsed * 2) * 0.04),
        reduced ? 0 : (1 - Math.cos(angle)) * (flying ? 1.7 : 0.75),
      ],
      yaw: reduced ? 0 : angle,
      phase: flying ? "float" : "walk",
      paw: flying ? 0.24 : 0.08,
      headPitch: flying ? -0.05 : 0.02,
    };
  };
  root.userData = {
    id,
    handpainted: true,
    moving,
    rideFrame: frame,
    duration,
    seatHeight: seat,
  };
  root.userData.update = (time, reduced = false) => {
    const t = root.userData.rideElapsed ?? time % duration,
      f = frame(t, reduced);
    moving.position.set(f.position[0], f.position[1] - seat, f.position[2]);
    moving.rotation.y = f.yaw;
    appendages.forEach((part, i) => {
      if (id === "ride-jellyfish") {
        part.rotation.z = reduced ? 0 : Math.sin(time * 1.4 + i) * 0.12;
        part.scale.y = 1 + (reduced ? 0 : Math.sin(time * 1.4 + i) * 0.06);
      }
      if (id === "ride-butterfly" || id === "ride-dragonfly")
        part.rotation.z =
          (i ? 1 : -1) * (0.18 + (reduced ? 0 : Math.sin(time * 5) * 0.48));
      if (id === "ride-lotus")
        part.scale.y =
          0.9 + (reduced ? 0 : Math.sin(time * 0.9 + i * 0.3) * 0.12);
      if (id === "ride-dinosaur")
        part.rotation.x = reduced ? 0 : Math.sin(time * 4 + i * Math.PI) * 0.2;
    });
  };
  root.userData.update(0, true);
  const batched = batchScenery(staticRoot);
  root.remove(staticRoot);
  root.add(batched);
  return root;
}
