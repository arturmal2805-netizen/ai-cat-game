import { bikiniFriend } from "./bikini-data.js";
import { createBikiniCharacter } from "./bikini-characters.js";
import { courtType } from "./foodcourt-data.js";
import { courtVenue } from "./foodcourt-assets.js";
import { mosasaurRide } from "./mosasaur-assets.js";
import { capybaraRide } from "./capybara-rides.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { legendaryAttraction } from "./legendary-assets.js";
import { catVenue } from "./cat-venues.js";
import { creatureRide } from "./creature-rides.js";
import { whaleRide } from "./whale-assets.js";
import { cottonRide } from "./cotton-rides.js";
import { cityRide } from "./city-rides.js";
import { advancedAttraction, animateAdvanced } from "./advanced-assets.js";
import { dressAttraction } from "./fantasy-scenery.js";
import { byItem } from "./game-data.js";
import { waterMaterial, advanceWater } from "./water-shading.js";
import * as THREE from "three";
const cache = new Map();
export function material(color, glow = 0) {
  const key = color + ":" + glow;
  if (!cache.has(key))
    cache.set(
      key,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.75,
        metalness: glow ? 0.12 : 0,
        emissive: glow ? color : 0,
        emissiveIntensity: glow,
      }),
    );
  cache.get(key).userData.sharedScenery = true;
  return cache.get(key);
}
export function primitive(parent, geo, color, x = 0, y = 0, z = 0, glow = 0) {
  const mesh = new THREE.Mesh(geo, material(color, glow));
  mesh.position.set(x, y, z);
  mesh.castShadow = !glow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
export const ball = (p, c, x, y, z, r = 0.2) =>
  primitive(p, new THREE.SphereGeometry(r, 12, 8), c, x, y, z);
export const box = (p, c, x, y, z, w, h, d) =>
  primitive(
    p,
    new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.1),
    c,
    x,
    y,
    z,
  );
export const rod = (p, c, x, y, z, r, h) =>
  primitive(p, new THREE.CylinderGeometry(r, r, h, 8), c, x, y, z);
function arch(parent, color, radius, y, z = 0) {
  const arc = primitive(
    parent,
    new THREE.TorusGeometry(radius, 0.09, 8, 32, Math.PI),
    color,
    0,
    y,
    z,
  );
  arc.rotation.z = 0;
  return arc;
}
export function glowOrb(parent, color, x, y, z, r = 0.13) {
  return primitive(
    parent,
    new THREE.SphereGeometry(r, 10, 6),
    color,
    x,
    y,
    z,
    0.9,
  );
}
function ribbon(parent, points, color, radius = 0.035) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
  );
  primitive(parent, new THREE.TubeGeometry(curve, 45, radius, 6, false), color);
  return curve;
}
export function tree(parent, x, z, palette, variant = "normal", scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  parent.add(group);
  rod(group, 0x71646b, 0, 0.9, 0, 0.12, 1.8);
  if (variant === "palm") {
    for (let i = 0; i < 6; i++) {
      const leaf = primitive(
        group,
        new THREE.SphereGeometry(1, 10, 6),
        palette,
        0,
        2.2,
        0,
      );
      leaf.scale.set(0.2, 0.13, 1.35);
      leaf.position.x = Math.sin((i * Math.PI) / 3) * 0.6;
      leaf.position.z = Math.cos((i * Math.PI) / 3) * 0.6;
      leaf.rotation.y = (i * Math.PI) / 3;
      leaf.rotation.x = 0.2;
    }
  } else if (variant === "pine") {
    for (let i = 0; i < 3; i++)
      primitive(
        group,
        new THREE.ConeGeometry(0.8 - i * 0.15, 1.3, 7),
        palette,
        0,
        1.3 + i * 0.5,
        0,
      );
  } else {
    for (const [dx, dy, dz, r] of [
      [0, 2.15, 0, 0.86],
      [-0.45, 1.9, 0.1, 0.7],
      [0.45, 2, -0.2, 0.7],
    ])
      ball(group, palette, dx, dy, dz, r);
  }
  return group;
}
export function mushroom(parent, x, z, color, scale = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  parent.add(g);
  rod(g, 0xe6d4bd, 0, 0.3, 0, 0.13, 0.6);
  const cap = ball(g, color, 0, 0.63, 0, 0.46);
  cap.scale.y = 0.48;
  for (let i = 0; i < 4; i++)
    ball(
      g,
      0xf5e6d4,
      Math.cos(i * 1.6) * 0.24,
      0.78,
      Math.sin(i * 1.6) * 0.24,
      0.055,
    );
  return g;
}
function support(parent, x, z, height) {
  rod(parent, 0x88749e, x, height / 2, z, 0.07, height);
}
function vehicle(parent, kind, color = 0xc9a3cf) {
  const g = new THREE.Group();
  parent.add(g);
  if (kind === "broom") {
    rod(g, 0xb58c62, 0, 0, 0, 0.07, 1.5).rotation.z = Math.PI / 2;
    primitive(
      g,
      new THREE.ConeGeometry(0.25, 0.65, 7),
      0xbba278,
      -0.85,
      0,
      0,
    ).rotation.z = Math.PI / 2;
  } else if (kind === "boat") {
    const boat = ball(g, 0x91bbaa, 0, 0, 0, 0.75);
    boat.scale.set(0.7, 0.3, 1.25);
    box(g, 0xcdd9b0, 0, 0.11, 0, 0.7, 0.1, 0.7);
  } else if (kind === "scooter") {
    box(g, 0xe0b1b9, 0, 0, 0, 0.5, 0.13, 1);
    rod(g, 0xf0dbce, 0, 0.5, 0.4, 0.04, 1);
    rod(g, 0xf0dbce, 0, 1, 0.4, 0.04, 0.7).rotation.z = Math.PI / 2;
    for (const z of [-0.4, 0.4])
      primitive(
        g,
        new THREE.TorusGeometry(0.14, 0.055, 6, 12),
        0x626276,
        0,
        -0.12,
        z,
      ).rotation.y = Math.PI / 2;
  } else {
    box(g, color, 0, 0, 0, 0.85, 0.35, 1.2);
    box(g, 0xe9d5ac, 0, 0.23, 0.15, 0.72, 0.12, 0.62);
    for (const x of [-0.48, 0.48])
      for (const z of [-0.35, 0.35])
        primitive(
          g,
          new THREE.CylinderGeometry(0.16, 0.16, 0.08, 10),
          0x605c72,
          x,
          -0.15,
          z,
        ).rotation.z = Math.PI / 2;
  }
  return g;
}
export function makeAttraction(id, fields = [], now = Date.now()) {
  if (bikiniFriend(id)) return createBikiniCharacter(bikiniFriend(id).kind);
  if (courtType(id)) return courtVenue(courtType(id));

  const mosa = mosasaurRide(id);
  if (mosa) return mosa;
  const capybara = capybaraRide(id);
  if (capybara) return capybara;
  const cotton = cottonRide(id);
  if (cotton) return cotton;
  const city = cityRide(id);
  if (city) return city;
  const whale = whaleRide(id);
  if (whale) return whale;
  const creature = creatureRide(id);
  if (creature) return creature;
  const venue = catVenue(id);
  if (venue) return venue;
  const legend = legendaryAttraction(id);
  if (legend) return dressAttraction(legend, byItem(id));
  const advanced = advancedAttraction(id, fields, now);
  if (advanced) return dressAttraction(advanced, byItem(id));
  const group = new THREE.Group();
  const moving = new THREE.Group();
  group.add(moving);
  let curve = null,
    seatHeight = 0.55,
    ridePosition = null;
  const waterSurfaces = [];
  const water = (geometry, color, x = 0, y = 0, z = 0) => {
    const material = waterMaterial(color, 0.74),
      mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    waterSurfaces.push(material);
    return mesh;
  };
  const purple = 0xa991c1,
    pink = 0xd6a2b3,
    gold = 0xe4c99c,
    teal = 0x82b3b0;
  if (id === "yarn") {
    moving.position.y = 0.4;
    const yarn = ball(moving, pink, 0, 0, 0, 0.4);
    const yarnString = new THREE.Group();
    group.add(yarnString);
    group.userData.yarnString = yarnString;
    for (let i = 0; i < 6; i++) {
      const ring = primitive(
        yarn,
        new THREE.TorusGeometry(0.401, 0.014, 5, 32),
        0xf0c9d7,
      );
      ring.rotation.x = i * 0.5;
      ring.rotation.y = i * 0.6;
    }
    ribbon(
      yarnString,
      [
        [-0.1, 0.04, 0.1],
        [0.5, 0.04, 0.5],
        [0.7, 0.04, -0.5],
        [1, 0.04, 0],
      ],
      0xe2b8cb,
      0.025,
    );
  } else if (id === "mouse") {
    const b = ball(moving, 0xb7b1c1, 0, 0.22, 0, 0.22);
    b.scale.z = 1.5;
    for (const x of [-0.15, 0.15]) ball(moving, pink, x, 0.41, 0.12, 0.1);
    ball(moving, 0xffd3db, 0, 0.23, 0.31, 0.055);
    ribbon(
      moving,
      [
        [0, 0.2, -0.3],
        [0.3, 0.12, -0.55],
        [0.45, 0.15, -0.75],
      ],
      purple,
      0.02,
    );
  } else if (id === "feather") {
    rod(group, gold, 0, 0.8, 0, 0.045, 1.6);
    ribbon(
      group,
      [
        [0, 1.6, 0],
        [0.35, 1.7, 0.1],
        [0.8, 1.2, 0],
      ],
      purple,
      0.025,
    );
    const feather = ball(moving, 0xd5b5e8, 0.8, 0.9, 0, 0.25);
    feather.scale.set(0.4, 1.6, 0.4);
  } else if (id === "tunnel") {
    const tunnel = primitive(
      group,
      new THREE.CylinderGeometry(0.65, 0.65, 2.4, 18, 1, true),
      teal,
      0,
      0.7,
      0,
    );
    tunnel.rotation.z = Math.PI / 2;
    for (const x of [-1.25, 1.25])
      primitive(
        group,
        new THREE.TorusGeometry(0.65, 0.065, 8, 24),
        gold,
        x,
        0.7,
        0,
      ).rotation.y = Math.PI / 2;
  } else if (id === "scratch") {
    rod(group, gold, 0, 0.85, 0, 0.23, 1.7);
    box(group, purple, 0, 1.7, 0, 1.2, 0.18, 1.2);
    ball(group, pink, 0.4, 1.15, 0.25, 0.17);
    seatHeight = 1.85;
  } else if (id === "trampoline") {
    primitive(
      group,
      new THREE.CylinderGeometry(1.05, 1.05, 0.16, 24),
      0x9db6c9,
      0,
      0.45,
      0,
    );
    primitive(
      group,
      new THREE.TorusGeometry(1.05, 0.09, 8, 32),
      gold,
      0,
      0.54,
      0,
    ).rotation.x = Math.PI / 2;
    for (const a of [0, 1.6, 3.2, 4.8])
      rod(group, purple, Math.cos(a) * 0.8, 0.2, Math.sin(a) * 0.8, 0.065, 0.4);
    seatHeight = 0.6;
  } else if (id === "swing") {
    for (const x of [-1.1, 1.1]) rod(group, purple, x, 1.25, 0, 0.09, 2.5);
    arch(group, gold, 1.1, 2.5);
    for (const x of [-0.42, 0.42]) rod(moving, gold, x, 1.5, 0, 0.025, 1.7);
    box(moving, teal, 0, 0.64, 0, 1.05, 0.16, 0.6);
    seatHeight = 0.78;
  } else if (id === "carousel") {
    primitive(
      group,
      new THREE.CylinderGeometry(1.6, 1.6, 0.16, 32),
      purple,
      0,
      0.18,
      0,
    );
    rod(group, gold, 0, 1.5, 0, 0.1, 3);
    primitive(group, new THREE.ConeGeometry(1.7, 0.85, 12), pink, 0, 3, 0);
    glowOrb(group, 0xf7e6ba, 0, 3.7, 0, 0.15);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      rod(moving, gold, Math.cos(a) * 1.05, 1.5, Math.sin(a) * 1.05, 0.03, 2.4);
      box(
        moving,
        teal,
        Math.cos(a) * 1.05,
        0.7,
        Math.sin(a) * 1.05,
        0.55,
        0.35,
        0.7,
      );
    }
    ridePosition = (t) => [Math.cos(t) * 1.05, 0.95, Math.sin(t) * 1.05];
  } else if (id === "coaster" || id === "train") {
    const points = [];
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      points.push([
        Math.cos(a) * 2.3,
        id === "coaster" ? 0.8 + Math.sin(a * 2) * 0.55 : 0.22,
        Math.sin(a) * 1.7,
      ]);
    }
    curve = ribbon(group, points, gold, 0.055);
    for (let i = 0; i < 10; i++) {
      const p = curve.getPoint(i / 10);
      support(group, p.x, p.z, p.y);
    }
    if (id === "train") {
      const engine = vehicle(moving, "train", teal);
      box(engine, teal, 0, 0.5, -0.3, 0.8, 0.75, 0.55);
      rod(engine, gold, 0, 0.48, 0.33, 0.13, 0.5);
      glowOrb(engine, 0xffe1a0, 0, 0.15, 0.65, 0.08);
    } else vehicle(moving, "cart", pink);
    ridePosition = (t) => {
      const p = curve.getPoint((t / (Math.PI * 2)) % 1);
      return [p.x, p.y + 0.4, p.z];
    };
  } else if (id === "waterslide") {
    const points = [
      [-1.8, 2.8, -1.5],
      [-0.7, 2.5, -1.5],
      [1.4, 1.9, -0.8],
      [1.8, 1.3, 0.5],
      [0.6, 0.7, 1.5],
      [-0.8, 0.28, 1.5],
    ];
    curve = ribbon(group, points, teal, 0.27);
    for (const p of points.slice(0, 4)) support(group, p[0], p[2], p[1]);
    for (let i = 0; i < 7; i++)
      box(
        group,
        purple,
        -1.85,
        0.25 + i * 0.4,
        -1.6 + i * 0.05,
        0.8,
        0.08,
        0.3,
      );
    const pool = water(
      new THREE.CylinderGeometry(1, 1, 0.08, 24),
      0x08b5d0,
      -0.8,
      0.09,
      1.3,
    );
    pool.scale.z = 0.75;
    ridePosition = (t) => {
      const p = curve.getPoint((t / 5) % 1);
      return [p.x, p.y + 0.3, p.z];
    };
  } else if (id === "ferris") {
    for (const x of [-0.8, 0.8]) {
      const leg = rod(group, purple, x, 1, 0, 0.09, 2.3);
      leg.rotation.z = x > 0 ? 0.3 : -0.3;
    }
    const wheel = primitive(
      moving,
      new THREE.TorusGeometry(1.5, 0.07, 8, 36),
      gold,
      0,
      2,
      0,
    );
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const spoke = rod(
        wheel,
        gold,
        Math.cos(a) * 0.73,
        Math.sin(a) * 0.73,
        0,
        0.025,
        1.5,
      );
      spoke.rotation.z = a - Math.PI / 2;
      box(
        wheel,
        pink,
        Math.cos(a) * 1.5,
        Math.sin(a) * 1.5,
        0.12,
        0.5,
        0.35,
        0.45,
      );
    }
    ridePosition = (t) => [Math.sin(t) * 1.5, 2 + Math.cos(t) * 1.5, 0.18];
  } else if (id === "teacup") {
    primitive(
      group,
      new THREE.CylinderGeometry(1.2, 1.2, 0.12, 24),
      gold,
      0,
      0.12,
      0,
    );
    primitive(
      moving,
      new THREE.CylinderGeometry(0.7, 0.55, 0.7, 24, 1, true),
      pink,
      0,
      0.55,
      0,
    );
    primitive(
      moving,
      new THREE.TorusGeometry(0.33, 0.075, 6, 20),
      gold,
      0.72,
      0.65,
      0,
    );
    seatHeight = 0.58;
  } else if (id === "boat") {
    const basin = water(
      new THREE.CylinderGeometry(1.6, 1.6, 0.06, 32),
      0x08b5d0,
      0,
      0.05,
      0,
    );
    basin.scale.z = 0.75;
    vehicle(moving, "boat");
    seatHeight = 0.25;
    ridePosition = (t) => [Math.sin(t) * 0.8, 0.3, Math.cos(t) * 0.5];
  } else if (id === "balloon") {
    const balloon = ball(moving, pink, 0, 3.4, 0, 0.95);
    balloon.scale.y = 1.3;
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      rod(
        moving,
        gold,
        Math.cos(a) * 0.35,
        1.8,
        Math.sin(a) * 0.35,
        0.015,
        1.6,
      );
    }
    box(moving, 0xb59a76, 0, 0.85, 0, 0.8, 0.55, 0.8);
    seatHeight = 1.16;
  } else if (id === "broom" || id === "scooter") {
    primitive(
      group,
      new THREE.TorusGeometry(id === "broom" ? 1.6 : 1, 0.025, 6, 32),
      gold,
      0,
      0.04,
      0,
    ).rotation.x = Math.PI / 2;
    vehicle(moving, id);
    ridePosition = (t) => [
      Math.cos(t) * (id === "broom" ? 1.55 : 1),
      id === "broom" ? 1.3 + Math.sin(t) * 0.25 : 0.35,
      Math.sin(t) * (id === "broom" ? 1.55 : 1),
    ];
  } else if (id === "party" || id === "stage") {
    box(group, purple, 0, 0.12, 0, 3.5, 0.24, 2.5);
    for (const x of [-1.6, 1.6]) rod(group, gold, x, 1.6, -1, 0.055, 3.2);
    ribbon(
      group,
      [
        [-1.6, 3, -1],
        [0, 2.5, -1],
        [1.6, 3, -1],
      ],
      gold,
      0.025,
    );
    for (let i = 0; i < 7; i++)
      glowOrb(
        group,
        [0xe5b2de, 0xb4e6dc, 0xffdfa5][i % 3],
        -1.5 + i * 0.5,
        2.5 + Math.abs(i - 3) * 0.12,
        -1,
        0.1,
      );
    if (id === "party") glowOrb(moving, 0xe2c8f4, 0, 2.5, 0, 0.34);
    else
      for (const x of [-1.25, 1.25])
        box(group, 0x55546e, x, 0.7, -0.9, 0.55, 0.8, 0.4);
    seatHeight = 0.25;
  } else if (id === "cafe") {
    box(group, 0xb28d79, 0, 0.55, 0, 2.6, 0.9, 1.7);
    primitive(
      group,
      new THREE.ConeGeometry(2, 1, 4),
      pink,
      0,
      1.55,
      0,
    ).rotation.y = Math.PI / 4;
    for (const x of [-0.7, 0.7]) glowOrb(group, 0xffe1a5, x, 0.8, 0.89, 0.18);
    box(group, gold, 0, 0.5, 1.2, 1.6, 0.13, 0.5);
  } else if (id === "picnic") {
    box(group, pink, 0, 0.03, 0, 2.5, 0.06, 2);
    box(group, gold, 0.45, 0.3, 0, 0.7, 0.45, 0.55);
    for (const x of [-0.5, 0]) ball(group, 0xeac8a2, x, 0.14, 0.35, 0.17);
  } else if (id === "fountain") {
    for (let i = 0; i < 3; i++)
      primitive(
        group,
        new THREE.CylinderGeometry(1 - i * 0.3, 1 - i * 0.3, 0.15, 24),
        i % 2 ? teal : purple,
        0,
        0.2 + i * 0.45,
        0,
      );
    glowOrb(moving, 0xb5e8e4, 0, 1.5, 0, 0.16);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      ribbon(
        group,
        [
          [0, 1.5, 0],
          [Math.cos(a) * 0.7, 1.6, Math.sin(a) * 0.7],
          [Math.cos(a) * 0.9, 0.35, Math.sin(a) * 0.9],
        ],
        0x9cd7d2,
        0.025,
      );
      const jet = group.children.at(-1);
      jet.material = waterMaterial(0x50d1df, 0.82);
      jet.castShadow = false;
      waterSurfaces.push(jet.material);
    }
  } else if (id === "mushroom") {
    rod(group, 0xc9bfa8, 0, 0.7, 0, 0.65, 1.4);
    const cap = ball(group, pink, 0, 1.65, 0, 1.25);
    cap.scale.y = 0.5;
    glowOrb(group, 0xffd9a4, 0, 0.8, 0.65, 0.19);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      ball(group, 0xf7e4c2, Math.cos(a) * 0.7, 1.95, Math.sin(a) * 0.7, 0.12);
    }
  } else if (id === "crystal") {
    for (let i = 0; i < 5; i++) {
      const crystal = primitive(
        moving,
        new THREE.OctahedronGeometry(0.4 + (i % 2) * 0.2, 0),
        [0xbcace6, 0x8fd0ce, 0xe5b1d2][i % 3],
        Math.cos(i * 1.25) * 0.55,
        0.6 + (i % 2) * 0.2,
        Math.sin(i * 1.25) * 0.55,
        0.45,
      );
      crystal.scale.y = 1.8;
    }
  } else if (id === "lantern") {
    for (const x of [-0.5, 0.5]) {
      rod(group, purple, x, 1, 0, 0.045, 2);
      glowOrb(moving, 0xffdca5, x, 2.1, 0, 0.25);
    }
  } else if (id === "flowers") {
    for (let i = 0; i < 9; i++) {
      const x = ((i % 3) - 1) * 0.45,
        z = (Math.floor(i / 3) - 1) * 0.45;
      rod(group, 0x88a38c, x, 0.22, z, 0.02, 0.44);
      const flower = ball(moving, [pink, gold, purple][i % 3], x, 0.5, z, 0.14);
      flower.scale.y = 0.6;
    }
  } else if (id === "bed") {
    const bed = ball(group, purple, 0, 0.18, 0, 0.8);
    bed.scale.y = 0.25;
    ball(group, pink, 0, 0.27, 0, 0.5).scale.y = 0.18;
  } else if (id === "pond") {
    const pond = water(
      new THREE.CylinderGeometry(1.2, 1.2, 0.06, 32),
      0x08b5d0,
      0,
      0.04,
      0,
    );
    pond.scale.z = 0.8;
    for (let i = 0; i < 3; i++) {
      const lily = primitive(
        group,
        new THREE.CylinderGeometry(0.2, 0.2, 0.02, 12),
        0x8eaa81,
        Math.cos(i * 2) * 0.7,
        0.08,
        Math.sin(i * 2) * 0.5,
      );
      ball(group, pink, lily.position.x, 0.14, lily.position.z, 0.1);
    }
  }
  group.userData = {
    ...group.userData,
    id,
    moving,
    curve,
    seatHeight,
    ridePosition,
    waterSurfaces,
    ...(id === "yarn" ? { duration: 10.8 } : {}),
  };
  return dressAttraction(group, byItem(id));
}
export function animateAttraction(group, time) {
  if (group.userData.handpainted) {
    group.userData.update?.(time);
    return;
  }
  animateAdvanced(group, time);
  for (const water of group.userData.waterSurfaces || [])
    advanceWater(water, time);
  const { id, moving, curve } = group.userData;
  if (!moving) return;
  if (id === "carousel") moving.rotation.y = time * 0.65;
  else if (id === "ferris") {
    const wheel = moving.children[0];
    if (wheel) wheel.rotation.z = time * 0.4;
  } else if (id === "coaster" || id === "train") {
    const t = (time * 0.1) % 1,
      p = curve.getPoint(t),
      ahead = curve.getPoint((t + 0.005) % 1);
    moving.position.copy(p);
    moving.rotation.y = Math.atan2(ahead.x - p.x, ahead.z - p.z);
  } else if (["boat", "broom", "scooter"].includes(id)) {
    const p = group.userData.ridePosition(time * 0.7);
    moving.position.set(...p);
    moving.rotation.y = -time * 0.7;
  } else if (id === "swing") moving.rotation.x = Math.sin(time) * 0.35;
  else if (id === "balloon")
    moving.position.y = 0.25 + Math.sin(time * 0.7) * 0.3;
  else if (id === "mouse") {
    moving.rotation.y = time * 0.8;
    moving.position.x = Math.sin(time * 0.7) * 0.2;
  } else if (id === "crystal") moving.rotation.y = time * 0.12;
  else if (id === "party") moving.rotation.y = time;
  else if (id === "feather") moving.rotation.z = Math.sin(time * 2) * 0.1;
}
