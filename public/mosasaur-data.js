import { LEGACY_SEA_DEPTH, LAGOON_SURFACE_Y } from "./water-depths.js";
export const MOSA_RADIUS = 11.65 * Math.sqrt(6);
export const MOSA_DEPTH = LEGACY_SEA_DEPTH * 40;
export const MOSA_SEA = {
  id: "lake-autumn",
  x: 0,
  z: 0,
  rx: 21,
  rz: 20,
  surfaceY: LAGOON_SURFACE_Y,
  bedY: LAGOON_SURFACE_Y - MOSA_DEPTH,
};
export const MOSA_DOCK = { x: 0, z: 23 };
export const MOSA_OBJECTS = [
  {
    id: "island-mosasaur",
    type: "ride-mosasaur",
    biome: "autumn",
    x: 0,
    z: 0,
    name: "Марин · морской великан",
    dismount: [0, 0, 23],
  },
  {
    ...MOSA_SEA,
    type: "swim-lagoon",
    biome: "autumn",
    shoreY: 0.16,
    name: "Глубокое небесное море",
  },
];
export function mosaReservations() {
  return [
    { x: 0, z: 0, rx: 21.5, rz: 20.5, w: 43, d: 41 },
    { x: 0, z: 22, w: 3.4, d: 8 },
  ];
}
export function mosaDryPoint(x, z, margin = 1.3) {
  const q = Math.hypot(x / (MOSA_SEA.rx + margin), z / (MOSA_SEA.rz + margin));
  if (q < 1) {
    if (q < 0.001) return { x: 0, z: MOSA_DOCK.z };
    x /= q;
    z /= q;
  }
  const r = Math.hypot(x, z),
    limit = MOSA_RADIUS - 1.5;
  if (r > limit) {
    x *= limit / r;
    z *= limit / r;
  }
  return { x, z };
}
