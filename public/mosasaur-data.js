import { LEGACY_SEA_DEPTH, LAGOON_SURFACE_Y } from "./water-depths.js";
export const MOSA_OLD_RADIUS = 11.65 * Math.sqrt(6);
// Five times the released horizontal dimensions, with the native animal/ride kept at its real scale.
export const MOSA_RADIUS = MOSA_OLD_RADIUS * 5;
export const MOSA_SHORE_GATE = { x: 0, z: 103 };
export const MOSA_DEPTH = 200;
export const MOSA_SEA = {
  id: "lake-autumn",
  x: 0,
  z: 0,
  rx: 105,
  rz: 100,
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
    { x: 0, z: 0, rx: 105.5, rz: 100.5, w: 211, d: 201 },
    { x: 0, z: 57, w: 3.4, d: 98 },
  ];
}
const MOSA_SHELVES=[[0,200],[.28,185],[.45,120],[.60,65],[.72,36],[.83,15],[.94,3],[1,.65]];
export const MOSA_CAVE_LAYOUT=[{id:"violet-grotto",x:-72,z:-14,radius:8,depth:20,color:0x9774dc},{id:"amber-cavern",x:60,z:53,radius:7,depth:17,color:0xeab66c}];
export function mosaNaturalBedY(x,z) {
  const r=Math.min(1,Math.hypot(x/MOSA_SEA.rx,z/MOSA_SEA.rz));
  const shelves=MOSA_SHELVES;
  let depth=.65;
  for(let i=1;i<shelves.length;i++)if(r<=shelves[i][0]){const [a,deep]=shelves[i-1],[b,shallow]=shelves[i],t=(r-a)/(b-a);depth=deep+(shallow-deep)*t*t*(3-2*t);break;}
  const detail=Math.sin(x*.11+Math.sin(z*.07))*Math.cos(z*.09)*Math.min(2,depth*.12)*(1-r);
  return MOSA_SEA.surfaceY-depth+detail;
}
export function mosaBedY(x,z){
 let y=mosaNaturalBedY(x,z);
 for(const c of MOSA_CAVE_LAYOUT){const edge=Math.min(c.radius+.8-Math.abs(x-c.x),z-(c.z-c.depth),c.z+2-z);if(edge<=0)continue;const floor=mosaNaturalBedY(c.x,c.z)+.4,fade=Math.min(1,edge/1.2);y=Math.min(y,y+(floor-y)*fade);}
 return y;
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
