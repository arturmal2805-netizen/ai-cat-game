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
    { x: 0, z: 0, rx: 111.5, rz: 106.5, w: 223, d: 213 },
    { x: 0, z: 57, w: 3.4, d: 98 },
    ...MOSA_HEADLANDS.map(p=>({x:p.x,z:p.z,rx:p.radius+2,rz:p.radius+2,w:(p.radius+2)*2,d:(p.radius+2)*2})),
  ];
}
export const mosaCoastFactor=a=>1+.035*Math.sin(a*3+.5)+.018*Math.cos(a*7);
export function mosaWaterRadius(x,z){const a=Math.atan2(z/MOSA_SEA.rz,x/MOSA_SEA.rx);return Math.hypot(x/MOSA_SEA.rx,z/MOSA_SEA.rz)/mosaCoastFactor(a);}
export const MOSA_HEADLANDS=[.08,.45,.86,1.95,2.4,2.85,3.35,3.9,4.45,4.95,5.55,6.0].map((angle,i)=>({angle,x:Math.cos(angle)*MOSA_SEA.rx*mosaCoastFactor(angle)*1.04,z:Math.sin(angle)*MOSA_SEA.rz*mosaCoastFactor(angle)*1.04,radius:i%3?11+i%3*2:17,height:i%3?10+i%4*3:24+i%2*4}));
export const MOSA_CAVE_LAYOUT=[{id:"violet-grotto",x:-25,z:-18,radius:8,depth:20,color:0x9774dc},{id:"amber-cavern",x:20,z:15,radius:7,depth:17,color:0xeab66c}];
export const MOSA_REEF_TERRACES=Array.from({length:12},(_,i)=>{const angle=.24+i*Math.PI/6,q=i%2?.82:.67,f=mosaCoastFactor(angle);return {id:'reef-terrace-'+i,x:Math.cos(angle)*MOSA_SEA.rx*f*q,z:Math.sin(angle)*MOSA_SEA.rz*f*q,radius:i%2?14:11.5,depth:7+i%4*4,angle};});
export function mosaTerraceRadius(c,angle){return c.radius*(1+.12*Math.sin(angle*3+c.angle)+.065*Math.cos(angle*7-c.angle));}
const TERRACE_LEVELS=[[1.06,0,.25],[1.48,13,.22],[1.89,37,.21],[2.22,65,.28]];
export function mosaTerraceY(c,x,z,natural=mosaNaturalBedY(x,z)){
 const dx=x-c.x,dz=z-c.z;if(dx*dx+dz*dz>(c.radius*2.632)**2)return -Infinity;
 const a=Math.atan2(dz,dx),r=Math.hypot(dx,dz)/mosaTerraceRadius(c,a);
 if(r>=2.22)return -Infinity;
 const top=MOSA_SEA.surfaceY-c.depth+.65*Math.sin(x*.31)*Math.cos(z*.26);
 let y=natural;
 for(const [edge,drop,width]of TERRACE_LEVELS){
   const t=Math.min(1,Math.max(0,(edge-r)/width)),blend=t*t*(3-2*t);y=Math.max(y,natural+(Math.max(top-drop,natural)-natural)*blend);
 }
 return y;
}
export function mosaNaturalBedY(x,z) {
  const r=Math.min(1,mosaWaterRadius(x,z));
  const shore=Math.min(1,(1-r)/.06),shelf=shore*shore*(3-2*shore),depth=.65+(MOSA_DEPTH-.65)*Math.pow(1-r,.88)*shelf;
  const ridge=(Math.sin(x*.075+Math.sin(z*.045)*1.5)*Math.cos(z*.053)+Math.sin((x+z)*.09)*.3)*Math.min(12,depth*.15)*(1-r);
  return MOSA_SEA.surfaceY-Math.min(MOSA_DEPTH,Math.max(.65,depth-ridge));
}
export function mosaBedY(x,z){
 const natural=mosaNaturalBedY(x,z);let y=natural;
 for(const c of MOSA_CAVE_LAYOUT){const edge=Math.min(c.radius+.8-Math.abs(x-c.x),z-(c.z-c.depth),c.z+2-z);if(edge<=0)continue;const floor=mosaNaturalBedY(c.x,c.z)+.4,fade=Math.min(1,edge/1.2);y=Math.min(y,y+(floor-y)*fade);}
 return y;
}
export function mosaZoneContains(x,z,p){const dx=x-p.x,dz=z-p.z,c=Math.cos(p.yaw||0),s=Math.sin(p.yaw||0);return Math.abs(dx*c-dz*s)<=p.w/2 && Math.abs(dx*s+dz*c)<=p.d/2;}
export function mosaDryPoint(x, z, margin = 1.3, zones=[]) {
  // The established pickup pier stays dry and keeps its saved local address.
  if(Math.abs(x)<=1.1 && z>=9.8 && z<=MOSA_SHORE_GATE.z+1)return {x,z};
  if(zones.some(p=>mosaZoneContains(x,z,p)))return {x,z};
  const factor=mosaCoastFactor(Math.atan2(z/MOSA_SEA.rz,x/MOSA_SEA.rx));
  const q = Math.hypot(x / (MOSA_SEA.rx*factor + margin), z / (MOSA_SEA.rz*factor + margin));
  if (q < 1) {
    if (q < 0.001) return { x: 0, z: MOSA_DOCK.z };
    x /= q;
    z /= q;
  }
  for(const p of MOSA_HEADLANDS)if(Math.hypot(x-p.x,z-p.z)<p.radius+margin+1){const len=Math.hypot(x,z)||1,r=Math.hypot(p.x,p.z)+p.radius+margin+1;x=x/len*r;z=z/len*r;}
  const r = Math.hypot(x, z),
    limit = MOSA_RADIUS - 1.5;
  if (r > limit) {
    x *= limit / r;
    z *= limit / r;
  }
  return { x, z };
}
