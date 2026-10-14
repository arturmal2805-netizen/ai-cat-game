import * as THREE from "three";
import { shape, line, batchScenery, lantern } from "./fantasy-scenery.js";

const whaleTypes = ["ride-whale", "ride-whale-aurora"];
function skinGeometry(violet) {
  const profile = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.8, 0.03, 0.03),
      new THREE.Vector3(-2.8, 0.25, 0.22),
      new THREE.Vector3(-1.7, 0.76, 0.57),
      new THREE.Vector3(-0.4, 1.1, 0.86),
      new THREE.Vector3(0.8, 1.17, 1.0),
      new THREE.Vector3(1.8, 0.94, 0.81),
      new THREE.Vector3(2.5, 0.57, 0.52),
      new THREE.Vector3(2.85, 0.03, 0.03),
    ]),
    positions = [],
    colors = [],
    indices = [],
    rings = 56,
    sides = 40;
  for (let i = 0; i <= rings; i++) {
    const p = profile.getPoint(i / rings);
    for (let j = 0; j <= sides; j++) {
      const a = (j * Math.PI * 2) / sides,
        belly = Math.sin(a) < -0.26;
      positions.push(
        Math.cos(a) * Math.max(0.02, p.y),
        Math.sin(a) * Math.max(0.02, p.z),
        p.x,
      );
      const c = new THREE.Color(
        belly ? 0xe1f2fc : violet ? 0x8d76e6 : 0x388ecb,
      );
      c.multiplyScalar(0.96 + Math.cos(a) * 0.04);
      colors.push(c.r, c.g, c.b);
      if (i < rings && j < sides) {
        const n = i * (sides + 1) + j;
        indices.push(
          n,
          n + 1,
          n + sides + 1,
          n + 1,
          n + sides + 2,
          n + sides + 1,
        );
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
function fin(parent, color, length, width) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(length * 0.3, -width, length * 0.85, -width, length, 0.08);
  s.bezierCurveTo(
    length * 0.75,
    width * 0.45,
    length * 0.3,
    width * 0.55,
    0,
    0,
  );
  const mesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(s, {
      depth: 0.065,
      bevelEnabled: true,
      bevelSize: 0.05,
      bevelThickness: 0.045,
      bevelSegments: 3,
      curveSegments: 20,
    }),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      emissive: color,
      emissiveIntensity: 0.1,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  parent.add(mesh);
  return mesh;
}
function arc(parent, points, color, width = 0.025) {
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
      40,
      width,
      6,
      false,
    ),
    new THREE.MeshBasicMaterial({ color }),
  );
  parent.add(mesh);
  return mesh;
}
export function whaleRide(id, { ambient = false, variant = 0 } = {}) {
  if (!whaleTypes.includes(id)) return null;
  const violet = id === "ride-whale-aurora",
    root = new THREE.Group(),
    moving = new THREE.Group(),
    props = new THREE.Group(),
    fins = [];
  root.add(moving);
  const body = new THREE.Mesh(
    skinGeometry(violet),
    new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      color: 0xffffff,
      roughness: 0.36,
      metalness: 0.04,
      clearcoat: 0.55,
      clearcoatRoughness: 0.25,
      emissive: violet ? 0x423162 : 0x183957,
      emissiveIntensity: 0.22,
    }),
  );
  body.name = "Sculpted whale body";
  body.castShadow = true;
  body.receiveShadow = true;
  moving.add(body);
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.96, -0.25, 0.7);
    moving.add(pivot);
    const flipper = fin(pivot, violet ? 0xc1a1ef : 0x75c8ec, 2.05, 0.48);
    flipper.scale.x = side;
    fins.push(pivot);
    shape(moving, "sphere", 0xf0f6fb, side * 0.93, 0.3, 1.7, 0.16, 0.18, 0.13);
    shape(
      moving,
      "sphere",
      0x233551,
      side * 1.01,
      0.31,
      1.75,
      0.095,
      0.11,
      0.1,
    );
    shape(
      moving,
      "sphere",
      0xffffff,
      side * 1.06,
      0.365,
      1.79,
      0.033,
      0.035,
      0.028,
      true,
    );
    shape(
      moving,
      "sphere",
      0xffd79d,
      side * 1.01,
      0.13,
      1.91,
      0.11,
      0.075,
      0.04,
      true,
    );
  }
  const tail = new THREE.Group();
  tail.position.set(0, -0.04, -3.4);
  moving.add(tail);
  for (const side of [-1, 1]) {
    const blade = fin(tail, violet ? 0xccaaef : 0x8bdaf0, 1.8, 0.7);
    blade.scale.x = side;
    blade.rotation.y = side * 0.25;
  }
  const dorsal = fin(moving, violet ? 0xac93e8 : 0x68b6df, 1.1, 0.35);
  dorsal.rotation.x = 0;
  dorsal.rotation.y = Math.PI / 2;
  dorsal.position.set(0, 0.75, -1.2);
  for (let i = 0; i < 7; i++)
    arc(
      moving,
      [
        [-0.24 + i * 0.08, -0.89, 0.1],
        [-0.26 + i * 0.085, -0.86, 1.0],
        [-0.19 + i * 0.065, -0.54, 2.18],
      ],
      0xbadbe9,
      0.012,
    );
  arc(
    moving,
    [
      [-0.62, -0.3, 2.24],
      [0, -0.36, 2.75],
      [0.62, -0.3, 2.24],
    ],
    0x46678b,
    0.025,
  );
  const constellation = [
    [-0.63, 0.8, -1.2],
    [-0.7, 0.94, -0.45],
    [-0.4, 1.04, 0.35],
    [-0.72, 0.79, 1.05],
    [0.2, 0.96, 0.05],
    [0.52, 0.79, -0.7],
  ];
  constellation.forEach((p, i) => {
    shape(moving, "sphere", 0xd9f7ff, ...p, 0.055, 0.055, 0.055, true);
    if (i) arc(moving, [constellation[i - 1], p], 0xa2dbf6, 0.014);
  });
  const spout = new THREE.Group();
  spout.position.set(0, 0.91, 1.1);
  moving.add(spout);
  for (const side of [-1, 1])
    arc(
      spout,
      [
        [0, 0, 0],
        [side * 0.1, 0.85, 0],
        [side * 0.55, 1.4, 0.05],
        [side * 0.94, 1.05, 0.15],
      ],
      0xb9edff,
      0.045,
    );
  const bubbles = [];
  for (let i = 0; i < 12; i++) {
    const b = shape(
      spout,
      "sphere",
      i % 2 ? 0xe7c7ff : 0xc0f3fb,
      Math.sin(i * 2.4) * 0.8,
      0.4 + (i % 4) * 0.33,
      Math.cos(i * 2.4) * 0.35,
      0.055 + (i % 3) * 0.025,
      0.08,
      0.055,
      true,
    );
    b.userData.restScale = b.scale.clone();
    bubbles.push(b);
  }
  const trail = new THREE.Group();
  moving.add(trail);
  arc(
    trail,
    [
      [0, 0, -3.6],
      [0.8, 0.1, -4.4],
      [1.4, 0.3, -5.2],
      [0.2, 0.65, -6.1],
      [-1, 0.9, -6.5],
    ],
    violet ? 0xe5caff : 0x9fddff,
    0.023,
  );
  for (let i = 0; i < 12; i++)
    shape(
      trail,
      "sphere",
      i % 2 ? 0xffe3ae : 0xd4efff,
      Math.sin(i * 1.4) * 0.6,
      0.1 + (i % 3) * 0.2,
      -3.8 - i * 0.22,
      0.045,
      0.045,
      0.045,
      true,
    );
  const seat = 1.18,
    duration = 20,
    direction = violet ? -1 : 1;
  if (!ambient) {
    shape(moving, "sphere", 0xe2c190, 0, seat - 0.04, 0, 0.5, 0.09, 0.62);
    for (const side of [-1, 1])
      line(
        moving,
        [side * 0.5, seat, 0],
        [side * 0.5, seat + 0.25, 0.4],
        0xf5dea7,
        0.035,
      );
    for (let i = 0; i < 7; i++)
      shape(
        props,
        "cube",
        i % 2 ? 0xcaa77e : 0xe0c29e,
        0,
        0.06,
        0.9 + i * 0.25,
        2.2,
        0.1,
        0.27,
      );
    lantern(props, -1.1, 0.25, 2, 0.6);
    lantern(props, 1.1, 0.25, 2, 0.6);
    root.add(batchScenery(props));
  }
  const frame = (elapsed, reduced = false) => {
    const t = Math.max(0, Math.min(1, elapsed / duration)),
      angle = t * Math.PI * 2,
      rise = Math.sin(t * Math.PI),
      wide = ambient ? 3.4 : 14;
    return {
      position: [
        reduced ? 0 : -direction * wide * rise * rise,
        seat + 0.65 + (reduced ? 0 : rise * 5.2),
        reduced ? 0 : Math.sin(angle) * (ambient ? 2.5 : 5),
      ],
      yaw: reduced
        ? 0
        : Math.atan2(
            -direction * wide * Math.PI * Math.sin(angle),
            (ambient ? 2.5 : 5) * Math.PI * 2 * Math.cos(angle),
          ),
      phase: "float",
      paw: 0.24,
      headPitch: -0.06,
    };
  };
  root.userData = {
    id,
    handpainted: true,
    moving,
    rideFrame: frame,
    duration,
    seatHeight: seat,
    fins,
    tail,
    spout,
  };
  root.userData.update = (time, reduced = false) => {
    const elapsed =
        root.userData.rideElapsed ?? (time + variant * 3) % duration,
      f = frame(elapsed, reduced);
    moving.position.set(f.position[0], f.position[1] - seat, f.position[2]);
    moving.rotation.y = f.yaw;
    moving.rotation.x = reduced ? 0 : Math.sin(time * 1.3 + variant) * 0.045;
    fins.forEach(
      (part, i) =>
        (part.rotation.z = reduced
          ? 0
          : Math.sin(time * 1.65 + i * Math.PI) * 0.18),
    );
    tail.rotation.x = reduced ? 0 : Math.sin(time * 1.65 - 0.8) * 0.22;
    spout.visible = reduced || Math.sin(time * 0.55 + variant) > 0.2;
    bubbles.forEach((b, i) =>
      b.scale
        .copy(b.userData.restScale)
        .multiplyScalar(reduced ? 1 : 0.8 + Math.sin(time * 2 + i) * 0.18),
    );
    trail.visible = !reduced;
    body.scale.y = 1 + (reduced ? 0 : Math.sin(time * 1.2) * 0.012);
  };
  root.userData.update(0, true);
  return root;
}
