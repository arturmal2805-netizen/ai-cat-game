import * as THREE from 'three';
export const WATER_SLIDE_SPEED=1.33;
const fastPhases=new Set(['ride','slide','vortex','drain','underwater','lift']);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const orientation=f=>f.quaternion?new THREE.Quaternion(...f.quaternion):new THREE.Quaternion().setFromEuler(new THREE.Euler(f.pitch||0,f.yaw||0,f.roll||0));
function orientationBlend(fn,anchor,width,duration,end){
 const q=new THREE.Quaternion(),forward=new THREE.Vector3();
 return u=>{const f=fn(u),weight=end?ease((u*duration-duration+width)/width):1-ease(u*duration/width);if(weight<=0)return f;
  q.copy(orientation(f)).slerp(anchor,weight);f.quaternion=q.toArray();forward.set(0,0,1).applyQuaternion(q);f.yaw=Math.atan2(forward.x,forward.z);return f;
 };
}
function smoothBoundaries(legs){
 for(let i=1;i<legs.length;i++){
  const a=legs[i-1],b=legs[i],qa=orientation(a.fn(1)),qb=orientation(b.fn(0));if(qa.angleTo(qb)<1e-5)continue;
  // Keep articulated cats aligned with the real flume. Turn while boarding or
  // airborne, or settle after the outlet; never flatten an inverted water loop.
  if((!fastPhases.has(a.phase)&&fastPhases.has(b.phase))||(a.phase==='flight'&&fastPhases.has(b.phase)))
   a.fn=orientationBlend(a.fn,qb,Math.min(.32,a.duration*.25),a.duration,true);
  else if(!fastPhases.has(b.phase)||b.phase==='drain')
   b.fn=orientationBlend(b.fn,qa,Math.min(.45,b.duration*.8),b.duration,false);
 }
}
function paceLane(base,speed){
 let clock=0;
 const lookup=new Map(),legs=base.legs.map(old=>{const duration=old.duration/(fastPhases.has(old.phase)?speed:1),leg={...old,start:clock,duration,authoredStart:old.start,authoredDuration:old.duration};lookup.set(old,leg);clock+=duration;return leg;});
 smoothBoundaries(legs);
 const last=legs.at(-1),done=orientation(base.frame(base.duration));
 if(!fastPhases.has(last.phase)&&orientation(last.fn(1)).angleTo(done)>1e-5)last.fn=orientationBlend(last.fn,done,Math.min(.32,last.duration*.25),last.duration,true);
 const toPlay=t=>{if(t>=base.duration)return clock;const l=legs.find(l=>t<=l.authoredStart+l.authoredDuration+1e-8)||legs.at(-1);return l.start+clamp((t-l.authoredStart)/l.authoredDuration,0,1)*l.duration;};
 const toAuthored=t=>{if(t>=clock)return base.duration;const l=legs.find(l=>t<=l.start+l.duration+1e-8)||legs.at(-1);return l.authoredStart+clamp((t-l.start)/l.duration,0,1)*l.authoredDuration;};
 const frame=(elapsed,reduced=false)=>{if(reduced)return base.frame(0,true);if(elapsed>=clock)return base.frame(base.duration);const t=clamp(Number.isFinite(elapsed)?elapsed:0,0,clock),l=legs.find(l=>t<=l.start+l.duration+1e-8)||legs.at(-1);return {phase:l.phase,paw:.35,surprise:0,...l.fn(clamp((t-l.start)/l.duration,0,1))};};
 return {...base,legs,duration:clock,frame,waterRideSpeed:speed,authoredDuration:base.duration,toAuthoredTime:toAuthored,toPlayTime:toPlay,
  geometry:base.geometry.map(g=>({...g,...(lookup.has(g.stage)?{stage:lookup.get(g.stage)}:{})})),
  impacts:base.impacts.map(e=>({...e,time:toPlay(e.time)})),
  // Real flight gravity/trajectory stays intact; only its preceding water run
  // accelerates. Scenic launch rings therefore remain on the exact trajectory.
  ...(base.flights?{flights:base.flights.map(f=>({...f,start:toPlay(f.start)}))}:{}),
 };
}
export function paceWaterRoute(base,speed=WATER_SLIDE_SPEED){
 if(base.coaster||base.waterRideSpeed)return base;
 if(!base.lanes)return paceLane(base,speed);
 const lanes=base.lanes.map(l=>paceLane(l,speed)),first=lanes[0];
 return {...base,...first,lanes,geometry:lanes.flatMap(l=>l.geometry),duration:Math.max(...lanes.map(l=>l.duration)),frame:(t,reduced=false,lane=0)=>lanes[lane%lanes.length].frame(t,reduced)};
}
// The eight earlier slides expose a single legacy frame rather than leg data.
// Keep their visible raft updater in the authored clock, synchronously, while
// every caller and water event uses the same accelerated public ride clock.
export function paceLegacyWaterRide(root,events){
 const d=root.userData;if(d.route?.waterRideSpeed){d.waterRideSpeed=d.route.waterRideSpeed;return events;}
 if(d.waterRideSpeed||!d.rideFrame||!d.duration)return events;
 const originalFrame=d.rideFrame,originalDuration=d.duration,previous=d.update;
 d.waterRideSpeed=WATER_SLIDE_SPEED;d.authoredRideDuration=originalDuration;d.duration=originalDuration/WATER_SLIDE_SPEED;
 d.rideFrame=(t,reduced=false,lane=0)=>originalFrame(t*WATER_SLIDE_SPEED,reduced,lane);
 if(previous)d.update=(time,reduced=false)=>{const elapsed=d.rideElapsed,frame=d.rideFrame,duration=d.duration;
  if(Number.isFinite(elapsed))d.rideElapsed=elapsed*WATER_SLIDE_SPEED;d.rideFrame=originalFrame;d.duration=originalDuration;
  try{previous(time,reduced);}finally{d.rideFrame=frame;d.duration=duration;if(elapsed===undefined)delete d.rideElapsed;else d.rideElapsed=elapsed;}
 };
 return events.map(e=>({...e,time:e.time/WATER_SLIDE_SPEED}));
}
