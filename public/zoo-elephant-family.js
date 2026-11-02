import * as T from 'three';
import {ELEPHANT_TRUNK_POINTS,ELEPHANT_TRUNK_TIP,ELEPHANT_TRUNK_ROLES,ELEPHANT_FAMILY_FIRST,ELEPHANT_FAMILY_FRAMES} from './zoo-elephant-data.js';
import {ZOO_ANIMALS} from './zoo-data.js';
import {zooLegPose} from './zoo-anatomy-motion.js';

export const ELEPHANT_FAMILY_SECONDS=20,ELEPHANT_FAMILY_PERIOD=64,ELEPHANT_FAMILY_DELAY=6;
export const ELEPHANT_FAMILY_REACH=3.024,ELEPHANT_FAMILY_HEIGHT=2.15,ELEPHANT_FAMILY_GAP=.035;
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const curve=new T.CatmullRomCurve3(ELEPHANT_TRUNK_POINTS.map(p=>new T.Vector3(...p)));
const rest=Array.from({length:ELEPHANT_TRUNK_ROLES.length},(_,i)=>curve.getPointAt(i/(ELEPHANT_TRUNK_ROLES.length-1)));rest.push(new T.Vector3(...ELEPHANT_TRUNK_TIP));
const lengths=rest.slice(1).map((p,i)=>p.distanceTo(rest[i])),memo=new Map();
const totalLength=lengths.reduce((a,b)=>a+b,0),last=rest.length-1;
const neutral=()=>({x:0,y:0,z:0,rx:0,ry:0,rz:0,sx:1,sy:1,sz:1});

// Offline, length-preserving trunk IK. The game samples the finished pose
// texture; no iterative solver, new mesh or instance upload runs in a frame.
function trunkAngles(participant,u){
 const key=participant+':'+u;if(memo.has(key))return memo.get(key);
 const w=smooth((u-.16)/.19)*smooth((.88-u)/.17),target=rest.at(-1).clone().lerp(new T.Vector3(0,ELEPHANT_FAMILY_HEIGHT/ZOO_ANIMALS.elephant.scale[participant],ELEPHANT_FAMILY_REACH),w),p=rest.map(v=>v.clone());
 if(w>0){
  const control=rest[0].clone().add(target).multiplyScalar(.5),sample=t=>rest[0].clone().multiplyScalar((1-t)**2).addScaledVector(control,2*t*(1-t)).addScaledVector(target,t*t),table=[];
  let low=0,high=4;
  for(let iteration=0;iteration<24;iteration++){
   const amplitude=(low+high)*.5;control.y=(rest[0].y+target.y)*.5-amplitude;let length=0,previous=sample(0);table.length=0;table.push({p:previous,length:0});
   for(let i=1;i<=96;i++){const next=sample(i/96);length+=next.distanceTo(previous);table.push({p:next,length});previous=next;}
   if(length<totalLength)low=amplitude;else high=amplitude;
  }
  let length=0;
  for(let i=1;i<last;i++){
   length+=lengths[i-1];const at=table.findIndex(v=>v.length>=length),a=table[Math.max(0,at-1)],b=table[at];
   p[i].lerp(a.p.clone().lerp(b.p,(length-a.length)/(b.length-a.length)),w);
  }
  p[last].copy(target);
 }
 if(w>0)for(let iteration=0;iteration<64;iteration++){
  p[last].copy(target);
  for(let i=last-1;i>=0;i--)p[i].sub(p[i+1]).normalize().multiplyScalar(lengths[i]).add(p[i+1]);
  p[0].copy(rest[0]);
  for(let i=1;i<=last;i++)p[i].sub(p[i-1]).normalize().multiplyScalar(lengths[i-1]).add(p[i-1]);
  if(p[last].distanceToSquared(target)<1e-14)break;
 }
 const angles=[];let previous=0;
 for(let i=0;i<last;i++){
  const a=rest[i+1].clone().sub(rest[i]),b=p[i+1].clone().sub(p[i]);
  const total=Math.atan2(a.y*b.z-a.z*b.y,a.y*b.y+a.z*b.z);
  angles.push(Math.atan2(Math.sin(total-previous),Math.cos(total-previous)));previous=total;
 }
 // Only the 192 authoring rows are retained, never an unbounded runtime cache.
 if(memo.size<2*ELEPHANT_FAMILY_FRAMES)memo.set(key,angles);
 return angles;
}

export function elephantFamilyPose(participant,u,role){
 const p=neutral(),lift=smooth((u-.16)/.19)*smooth((.88-u)/.17);
 if(role.startsWith('trunk'))p.rx=trunkAngles(participant,u)[ELEPHANT_TRUNK_ROLES.indexOf(role)];
 else if(role.startsWith('spray'))p.sx=p.sy=p.sz=.001;
 else if(role.startsWith('ear'))p.ry=(role.endsWith('-1')?-1:1)*Math.sin(u*Math.PI*6)*.13*Math.sin(u*Math.PI)**2;
 else if(role==='tail')p.ry=Math.sin(u*Math.PI*5)*.10*Math.sin(u*Math.PI)**2;
 else if(/^(Leg|Knee|Foot)/.test(role)){
  const step=zooLegPose('elephant',u*12.8,role,{y:0},{y:0});
  p.rx=(step?.rx||0)*(1-lift);
 }else if(role.startsWith('eye'))p.sy=1-.88*Math.exp(-(((u-.46)/.018)**2));
 else if(role.startsWith('lid'))p.sx=p.sy=p.sz=Math.max(.001,.88*Math.exp(-(((u-.46)/.018)**2)));
 return p;
}

// Two adults share a scheduled affectionate greeting; the calf keeps its own
// ambient actions. Visitor water play has priority, including cancellation.
export function updateElephantFamily(mesh,time,reduced=false,greet=0){
 const d=mesh.userData,actors=d.actors,cycleIndex=Math.floor(Math.max(0,time)/ELEPHANT_FAMILY_PERIOD),cycle=Math.max(0,time)%ELEPHANT_FAMILY_PERIOD,
  elapsed=cycle-ELEPHANT_FAMILY_DELAY;
 if(greet>0||reduced)d.elephantFamilySkippedCycle=cycleIndex;
 if(greet>0&&!reduced&&d.elephantFamilyActive){
  d.elephantFamilyCancelAt??=time;
  const fade=1-smooth((time-d.elephantFamilyCancelAt)/.6);
  if(fade>0){for(let i=0;i<2;i++){const play=actors[i].play;d.setActorPlay(i,{...play,mix:Math.min(play.mix,fade)});}return;}
 }
 if(reduced||greet>0||d.elephantFamilySkippedCycle===cycleIndex||mesh.count<2||elapsed<0||elapsed>ELEPHANT_FAMILY_SECONDS){
  if(d.elephantFamilyActive){for(let i=0;i<2;i++)d.setActorPlay(i,null);d.elephantFamilyActive=false;}
  d.elephantFamilyCancelAt=null;
  return;
 }
 const u=elapsed/ELEPHANT_FAMILY_SECONDS,turn=smooth(u/.22)*smooth((1-u)/.22),mix=smooth(u/.065)*smooth((1-u)/.065),
  a=actors[0].anchor,b=actors[1].anchor,dx=b[0]-a[0],dz=b[2]-a[2],distance=Math.hypot(dx,dz),
  closure=(distance-(actors[0].scale+actors[1].scale)*ELEPHANT_FAMILY_REACH-ELEPHANT_FAMILY_GAP)*.5*turn;
 d.elephantFamilyActive=true;
 d.elephantFamilyCancelAt=null;
 for(let i=0;i<2;i++){
  const actor=actors[i],sign=i?-1:1,m=actor.matrix.elements,base=Math.atan2(m[8],m[10]),face=Math.atan2(dx*sign,dz*sign),
   yaw=Math.atan2(Math.sin(face-base),Math.cos(face-base))*turn;
  d.setActorPlay(i,{frame:ELEPHANT_FAMILY_FIRST+i*ELEPHANT_FAMILY_FRAMES+u*(ELEPHANT_FAMILY_FRAMES-1),mix,yaw,x:dx/distance*closure*sign,z:dz/distance*closure*sign});
 }
}
