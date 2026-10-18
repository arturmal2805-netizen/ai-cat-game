// Appended destination; established IDs, centres and saved plots stay put.
export const AQUARIUM_RADIUS = 38.5;
export const AQUARIUM_GATE = { x: 0, z: 33 };
export const AQUARIUM_BUILDING = { w: 64, d: 54, r: 12, wall: 8.8, dome: 11.4 };
export const AQUARIUM_TANKS = [
  {
    id: "aquarium-aurora",
    name: "Сердце океанариума · Аврора",
    x: 0,
    z: -5,
    w: 13,
    d: 13,
    h: 13,
    r: 6.5,
    circular: true,
    color: 0x69d9ef,
    fish: 10,
    hero: 2.65,
  },
  {
    id: "aquarium-pearl",
    name: "Жемчужный зал",
    x: -20,
    z: 10,
    w: 21,
    d: 20,
    h: 9.3,
    r: 1.6,
    color: 0x61d8ee,
    fish: 11,
    hero: 3.0,
  },
  {
    id: "aquarium-coral",
    name: "Коралловый зал",
    x: 20,
    z: 10,
    w: 21,
    d: 20,
    h: 9.3,
    r: 1.6,
    color: 0x78dfec,
    fish: 11,
    hero: 3.0,
  },
  {
    id: "aquarium-lilac",
    name: "Лавандовая глубина",
    x: -20,
    z: -13,
    w: 21,
    d: 18,
    h: 10.6,
    r: 1.6,
    color: 0x8acbf0,
    fish: 9,
    hero: 3.0,
  },
  {
    id: "aquarium-sunrise",
    name: "Солнечная лагуна",
    x: 20,
    z: -13,
    w: 21,
    d: 18,
    h: 10.6,
    r: 1.6,
    color: 0x78dce5,
    fish: 9,
    hero: 3.0,
  },
].map((o, i) => ({
  ...o,
  type: o.id,
  biome: "aquarium",
  kind: "aquarium",
  index: i,
  icon: "🐠",
  price: 0,
  buildMinutes: 0,
  rate: 0,
  description:
    "Большие ласковые рыбки-котики, прозрачное стекло и свободные места для любопытных пушистых посетителей.",
}));
export const aquariumTank = (id) => AQUARIUM_TANKS.find((o) => o.id === id);
export function aquariumSeats(o) {
  if (o.circular)
    return Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2;
      return {
        x: o.x + Math.sin(a) * 8.8,
        z: o.z + Math.cos(a) * 8.8,
        y: 0.2,
        index: i,
      };
    });
  return [-5.6, -1.8, 1.8, 5.6].map((dx, i) => ({
    x: o.x + dx,
    z: o.z + o.d / 2 + 2,
    y: 0.2,
    index: i,
  }));
}
export function aquariumExit(o, index) {
  return {
    x: (o.x < 0 ? -1 : o.x > 0 ? 1 : (index % 2) * 2 - 1) * (3 + index * 2.3),
    z: 24 + (index % 2) * 1.1,
    y: 0.2,
  };
}
export function aquariumOutline(w, d, r, segments = 8) {
  const points = [];
  for (const [cx, cz, start] of [
    [w / 2 - r, d / 2 - r, 0],
    [-w / 2 + r, d / 2 - r, Math.PI / 2],
    [-w / 2 + r, -d / 2 + r, Math.PI],
    [w / 2 - r, -d / 2 + r, Math.PI * 1.5],
  ])
    for (let j = 0; j <= segments; j++) {
      const a = start + ((j / segments) * Math.PI) / 2;
      points.push({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r });
    }
  return points;
}
export function aquariumWalls() {
  const b = AQUARIUM_BUILDING,
    p = aquariumOutline(b.w, b.d, b.r, 12),
    walls = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i],
      q = p[(i + 1) % p.length];
    if (Math.abs(a.z - b.d / 2) < 0.01 && Math.abs(q.z - b.d / 2) < 0.01) {
      for (const s of [-1, 1])
        walls.push({
          x: (s * (b.w / 2 - b.r + 5.2)) / 2,
          z: b.d / 2,
          w: b.w / 2 - b.r - 5.2,
          d: 0.28,
        });
      continue;
    }
    walls.push({
      x: (a.x + q.x) / 2,
      z: (a.z + q.z) / 2,
      w: Math.abs(q.x - a.x) + 0.28,
      d: Math.abs(q.z - a.z) + 0.28,
    });
  }
  return walls;
}
export function aquariumObstacles(extra = []) {
  return [
    ...aquariumWalls(),
    ...AQUARIUM_TANKS.map((o) =>
      o.circular
        ? { x: o.x, z: o.z, radius: o.r + 0.12 }
        : { x: o.x, z: o.z, w: o.w + 0.24, d: o.d + 0.24 },
    ),
    ...extra,
  ];
}
export const AQUARIUM_LOCALS = [
  {
    id: "aquarium-pearl-cat",
    name: "Перлинка",
    breed: "ragdoll",
    color: 0xe8e0d8,
    eyes: 0x85bbda,
    personality: "Любується найбільшими рибками й тихенько торкається скла",
  },
  {
    id: "aquarium-plush-cat",
    name: "Пломбірчик",
    breed: "british",
    build: "plush",
    color: 0xa7a9b7,
    eyes: 0xb5d57e,
    personality: "Милий пухкенький відвідувач океанаріуму",
  },
  {
    id: "aquarium-ginger-cat",
    name: "Коралик",
    breed: "calico",
    color: 0xd6b08a,
    eyes: 0x96cbb3,
    personality: "Радісно махає лапкою кораловим рибкам",
  },
  {
    id: "aquarium-moon-cat",
    name: "Пухирчик",
    breed: "persian",
    build: "plush",
    color: 0xd4c5dc,
    eyes: 0x91cee0,
    personality: "Сідає біля скла й стежить за плавниками",
  },
].map((o) => ({ ...o, biome: "aquarium" }));
const palette = [0xf3b15a, 0xb097eb, 0xf49ac4, 0x72c4ed, 0x76cbb4, 0xf6ce6b];
export function aquariumFishFrame(tank, i, time, out = {}) {
  const large = i === 0,
    scale = large ? tank.hero : 0.32 + (i % 4) * 0.13;
  const extent = scale * 2.05;
  const rx = Math.max(0.2, tank.w / 2 - extent - 0.7),
    rz = Math.max(0.2, tank.d / 2 - extent - 0.7);
  const a =
    time * (large ? 0.16 : 0.22 + (i % 3) * 0.035) +
    i * 2.399 +
    tank.index * 0.8;
  const x = Math.sin(a) * rx,
    z = Math.cos(a) * rz;
  const near = Math.max(0, (Math.cos(a) - 0.65) / 0.35);
  let yaw = Math.atan2(Math.cos(a) * rx, -Math.sin(a) * rz);
  yaw += Math.atan2(Math.sin(-yaw), Math.cos(-yaw)) * near * 0.7;
  const y = large
    ? tank.h * 0.44 + Math.sin(a * 1.35) * 0.25
    : 1.6 + ((i % 4) * (tank.h - 3.1)) / 4 + Math.sin(a * 1.4 + i) * 0.35;
  out.x = x;
  out.y = y;
  out.z = z;
  out.yaw = yaw;
  out.scale = scale;
  out.tail = Math.sin(time * (large ? 2.7 : 4.2) + i) * 0.34;
  out.fin = Math.sin(time * 3.3 + i) * 0.3;
  out.color = palette[(i + tank.index) % palette.length];
  out.near = near;
  return out;
}
