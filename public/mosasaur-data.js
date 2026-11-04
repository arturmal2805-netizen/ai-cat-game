import { LEGACY_SEA_DEPTH, LAGOON_SURFACE_Y } from "./water-depths.js";
export const MOSA_OLD_RADIUS = 11.65 * Math.sqrt(6);
// Four times the water area, with the native animal/ride kept at its real scale.
export const MOSA_RADIUS = MOSA_OLD_RADIUS + 21;
export const MOSA_SHORE_GATE = { x: 0, z: 43 };
export const MOSA_DEPTH = LEGACY_SEA_DEPTH * 40;
export const MOSA_SEA = {
  id: "lake-autumn",
  x: 0,
  z: 0,
  rx: 42,
  rz: 40,
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
    { x: 0, z: 0, rx: 42.5, rz: 40.5, w: 85, d: 81 },
    { x: 0, z: 27, w: 3.4, d: 38 },
  ];
}
export function mosaBedY(x,z) {
  const r=Math.min(1,Math.hypot(x/MOSA_SEA.rx,z/MOSA_SEA.rz));
  const t=Math.max(0,(r-.28)/.72),s=t*t*(3-2*t);
  return MOSA_SEA.surfaceY-(.65+(MOSA_DEPTH-.65)*(1-s));
}
export function mosaZoneContains(x,z,p){const dx=x-p.x,dz=z-p.z,c=Math.cos(p.yaw||0),s=Math.sin(p.yaw||0);return Math.abs(dx*c-dz*s)<=p.w/2 && Math.abs(dx*s+dz*c)<=p.d/2;}
export function mosaDryPoint(x, z, margin = 1.3, zones=[]) {
  // The established pickup pier stays dry and keeps its saved local address.
  if(Math.abs(x)<=1.1 && z>=9.8 && z<=MOSA_SHORE_GATE.z+1)return {x,z};
  if(zones.some(p=>mosaZoneContains(x,z,p)))return {x,z};
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
