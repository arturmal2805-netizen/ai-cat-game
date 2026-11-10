import * as THREE from "three";
import { MOSA_SEA, MOSA_DOCK, MOSA_SHORE_GATE, mosaCoastFactor, mosaDryPoint } from "./mosasaur-data.js";
export const MOSA_DURATION = 30;
export const MOSA_SCALE = 3.25;
export const MOSA_SEAT = [0, 1.44, 0.6];
export const MOSA_TIMES = Object.freeze({
  board: 2,
  deep: 5.2,
  ascent: 17.6,
  launch: 19,
  land: 21.8,
  plunge: 23.2,
  return: 24.6,
  end: MOSA_DURATION,
});
export const MOSA_GRAVITY = 16;
export const MOSA_LAUNCH_SPEED = 22.4;
const DEPTH = MOSA_LAUNCH_SPEED ** 2 / (2 * MOSA_GRAVITY);
const clamp = THREE.MathUtils.clamp;
const smooth = (t) => t * t * (3 - 2 * t);
// Positions and velocities in metres / seconds. C1 joins avoid sudden changes
// of direction. In the air the horizontal trajectory is exactly a straight line.
const omega = (Math.PI * 2 + 2) / (MOSA_TIMES.ascent - 2 - 0.4);
const route = [
  [
    17.6,
    Math.sin(-2) * 8,
    Math.cos(-2) * 8,
    -Math.cos(-2) * 8 * omega,
    Math.sin(-2) * 8 * omega,
  ],
  [19, -6, -5.5, 4.6, 0],
  [21.8, 6.88, -5.5, 4.6, 0],
  [23.8, 8.5, 3, -1, 4],
  [26, 1, 8, -3, 0],
  [28, -6, 4, -1, -3],
  [30, 0, 8, 0, 0],
];
function horizontal(t) {
  if (t <= 2) return [0, 8, 0, 0];
  if (t < MOSA_TIMES.ascent) {
    const u = t - 2,
      r = Math.min(1, u / 0.8),
      travel = u < 0.8 ? 0.8 * (r ** 3 - 0.5 * r ** 4) : u - 0.4,
      angle = -omega * travel,
      angular = -omega * (u < 0.8 ? smooth(r) : 1);
    return [
      Math.sin(angle) * 8,
      Math.cos(angle) * 8,
      Math.cos(angle) * 8 * angular,
      -Math.sin(angle) * 8 * angular,
    ];
  }
  if (t >= MOSA_TIMES.launch && t <= MOSA_TIMES.land)
    return [-6 + (t - MOSA_TIMES.launch) * 4.6, -5.5, 4.6, 0];
  for (let i = 1; i < route.length; i++) {
    if (t > route[i][0]) continue;
    const a = route[i - 1],
      b = route[i],
      d = b[0] - a[0],
      u = (t - a[0]) / d;
    const h00 = 2 * u ** 3 - 3 * u * u + 1,
      h10 = u ** 3 - 2 * u * u + u,
      h01 = -2 * u ** 3 + 3 * u * u,
      h11 = u ** 3 - u * u;
    const v00 = (6 * u * u - 6 * u) / d,
      v10 = 3 * u * u - 4 * u + 1,
      v01 = (-6 * u * u + 6 * u) / d,
      v11 = 3 * u * u - 2 * u;
    return [
      h00 * a[1] + h10 * d * a[3] + h01 * b[1] + h11 * d * b[3],
      h00 * a[2] + h10 * d * a[4] + h01 * b[2] + h11 * d * b[4],
      v00 * a[1] + v10 * a[3] + v01 * b[1] + v11 * b[3],
      v00 * a[2] + v10 * a[4] + v01 * b[2] + v11 * b[4],
    ];
  }
  return [0, 8, 0, 0];
}
function vertical(t) {
  const water = MOSA_SEA.surfaceY;
  if (t <= 2) return [0.12, 0];
  if (t < MOSA_TIMES.deep) {
    const u = (t - 2) / (MOSA_TIMES.deep - 2),
      height = water - DEPTH - 0.12;
    return [
      0.12 + height * smooth(u),
      (height * 6 * u * (1 - u)) / (MOSA_TIMES.deep - 2),
    ];
  }
  if (t < MOSA_TIMES.ascent) return [water - DEPTH, 0];
  if (t < MOSA_TIMES.launch) {
    const s = t - MOSA_TIMES.ascent;
    return [water - DEPTH + 0.5 * MOSA_GRAVITY * s * s, MOSA_GRAVITY * s];
  }
  if (t <= MOSA_TIMES.land) {
    const s = t - MOSA_TIMES.launch;
    return [
      water + MOSA_LAUNCH_SPEED * s - 0.5 * MOSA_GRAVITY * s * s,
      MOSA_LAUNCH_SPEED - MOSA_GRAVITY * s,
    ];
  }
  if (t < MOSA_TIMES.plunge) {
    const s = t - MOSA_TIMES.land;
    return [
      water - MOSA_LAUNCH_SPEED * s + 0.5 * MOSA_GRAVITY * s * s,
      -MOSA_LAUNCH_SPEED + MOSA_GRAVITY * s,
    ];
  }
  if (t < MOSA_TIMES.return) return [water - DEPTH, 0];
  const d = MOSA_DURATION - MOSA_TIMES.return,
    u = (t - MOSA_TIMES.return) / d,
    height = 0.12 - (water - DEPTH);
  return [water - DEPTH + height * smooth(u), (height * 6 * u * (1 - u)) / d];
}
export function mosasaurFrame(elapsed, reduced = false) {
  const t = clamp(elapsed, 0, MOSA_DURATION),
    [x, z, vx, vz] = horizontal(t),
    [y, vy] = vertical(t),
    speed = Math.hypot(vx, vz),
    undock = smooth(clamp((t - 2) / 0.5, 0, 1)),
    dock = smooth(clamp((t - 29) / 1, 0, 1));
  let yaw = speed > 0.0001 ? Math.atan2(vx, vz) : -Math.PI / 2,
    pitch = clamp(-Math.atan2(vy, speed || 1), -1.4, 1.4) * undock * (1 - dock);
  yaw =
    -Math.PI / 2 +
    Math.atan2(Math.sin(yaw - -Math.PI / 2), Math.cos(yaw - -Math.PI / 2)) *
      undock *
      (1 - dock);
  const phase =
      t < MOSA_TIMES.board
        ? "boarding"
        : t < MOSA_TIMES.deep
          ? "dive"
          : t < MOSA_TIMES.ascent
            ? "deep"
            : t < MOSA_TIMES.launch
              ? "ascent"
              : t < MOSA_TIMES.land
                ? "flight"
                : t < MOSA_TIMES.return
                  ? "splash"
                  : "return",
    roll =
      reduced || phase === "flight"
        ? 0
        : Math.sin(t * 1.1) * 0.055 * undock * (1 - dock),
    q = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(pitch, yaw, roll, "YXZ"),
    ),
    p = new THREE.Vector3(x, y, z-6),
    seat = new THREE.Vector3(...MOSA_SEAT)
      .multiplyScalar(MOSA_SCALE)
      .applyQuaternion(q)
      .add(p),
    air =
      phase === "flight"
        ? (t - MOSA_TIMES.launch) / (MOSA_TIMES.land - MOSA_TIMES.launch)
        : 0;
  return {
    position: seat.toArray(),
    bodyPosition: p.toArray(),
    quaternion: q.toArray(),
    velocity: [vx, vy, vz],
    yaw,
    pitch,
    roll,
    phase,
    surprise: phase === "flight" ? 0.25 + Math.sin(Math.PI * air) * 0.75 : 0,
    headPitch: phase === "deep" ? -0.06 : 0,
    paw: phase === "flight" ? 0.18 + Math.sin(Math.PI * air) * 0.12 : 0,
  };
}
// Follow the dry shore to the jetty; only the final small hop boards the saddle.
// Local coordinates allow the identical path for the hero and every resident.
const approachCache=new Map();
function approachPath(from,to,t){
 const start=new THREE.Vector3(...from),end=new THREE.Vector3(...to),boarding=new THREE.Vector3(0,0,9.8),gate=new THREE.Vector3(0,0,MOSA_SHORE_GATE.z),onPier=Math.abs(start.x)<1.12&&start.z>=9.8&&start.z<=MOSA_SHORE_GATE.z+1;
 if(onPier){if(t<.78)return start.lerp(boarding,smooth(t/.78));return boarding.lerp(end,smooth((t-.78)/.22));}
 if(t<.55){const u=t/.55,a0=Math.atan2(start.x,start.z),da=Math.atan2(Math.sin(-a0),Math.cos(-a0)),a=a0+da*smooth(Math.max(0,(u-.25)/.75));
  const f=mosaCoastFactor(Math.atan2(Math.cos(a)/MOSA_SEA.rz,Math.sin(a)/MOSA_SEA.rx)),r=f/Math.hypot(Math.sin(a)/MOSA_SEA.rx,Math.cos(a)/MOSA_SEA.rz)+8,shore=mosaDryPoint(Math.sin(a)*r,Math.cos(a)*r,3);
  if(u<.25)return start.lerp(new THREE.Vector3(shore.x,0,shore.z),smooth(u/.25));return new THREE.Vector3(shore.x,0,shore.z);
 }
 if(t<.90)return gate.lerp(boarding,smooth((t-.55)/.35));return boarding.lerp(end,smooth((t-.90)/.10));
}
function approachTable(from,to){const key=[...from,...to].map(n=>n.toFixed(4)).join(',');if(approachCache.has(key))return approachCache.get(key);const points=[],distances=[0];for(let i=0;i<=256;i++){points.push(approachPath(from,to,i/256));if(i)distances.push(distances.at(-1)+points[i].distanceTo(points[i-1]));}const result={points,distances,length:distances.at(-1)};if(approachCache.size>=32)approachCache.delete(approachCache.keys().next().value);approachCache.set(key,result);return result;}
export function mosasaurApproachDuration(from,to){return Math.ceil(Math.max(4200,approachTable(from,to).length/2.4*1000));}
export function mosasaurApproach(from,to,t){const table=approachTable(from,to),d=THREE.MathUtils.clamp(t,0,1)*table.length;let lo=0,hi=table.distances.length-1;while(lo+1<hi){const mid=(lo+hi)>>1;if(table.distances[mid]<d)lo=mid;else hi=mid;}return table.points[lo].clone().lerp(table.points[hi],(d-table.distances[lo])/(table.distances[hi]-table.distances[lo]||1)).toArray();}
export function mosasaurAmbientFrame(time,reduced=false){
 if(reduced)return {...mosasaurFrame(0,true),state:'patrol',jaw:.32};
 const cycle=((time%90)+90)%90,a=time*.065,patrol=new THREE.Vector3(Math.cos(a)*18,-3.5-Math.sin(a*.7)**2*3,Math.sin(a)*16-8);
 const envelope=(start,end)=>{const t=(cycle-start)/(end-start);return t<=0||t>=1?0:Math.sin(t*Math.PI)**2;};
 let state='patrol',jaw=.22,pitch=0;
 if(cycle>18&&cycle<31){state='curious';const w=envelope(18,31);patrol.y+=( -1.8-patrol.y)*w;jaw+=w*.38;}
 else if(cycle>=31&&cycle<54){state='deep-dive';const w=envelope(31,54);patrol.y-=w*42;pitch=Math.sin((cycle-31)/23*Math.PI*2)*.18;}
 else if(cycle>=54&&cycle<69){state='surface-inspection';const w=envelope(54,69);patrol.y+=(1-patrol.y)*w;jaw+=w*.20;}
 else if(cycle>=69&&cycle<83){state='fast-swim';jaw+=envelope(69,83)*.09;}
 else if(cycle>=83){state='cinematic-breach';const w=envelope(83,90);patrol.y+=w*10;jaw+=w*.55;pitch=-Math.sin((cycle-83)/7*Math.PI*2)*.24;}
 const yaw=Math.atan2(-Math.sin(a),Math.cos(a)),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));
 return {bodyPosition:patrol.toArray(),quaternion:q.toArray(),position:new THREE.Vector3(...MOSA_SEAT).multiplyScalar(MOSA_SCALE).applyQuaternion(q).add(patrol).toArray(),phase:state==='deep-dive'?'deep':state==='cinematic-breach'?'ascent':'idle',state,jaw};
}
