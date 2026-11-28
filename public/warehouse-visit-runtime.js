import * as T from 'three';
import {WAREHOUSE as W} from './mosasaur-expansion-data.js';
import {WAREHOUSE_ACCESS as A,warehouseActivity} from './warehouse-access-data.js';
import {createWarehouseShuttleRoute} from './warehouse-shuttle-route.js';
import {createWarehouseAirlock} from './warehouse-airlock.js';
import {gatherTrip,gatherFrame} from './gather-system.js';
const unsafe=new Set(['shore-trip','boarding','outbound','leaving-boat','airlock-in','airlock-out','return-boarding','inbound','disembark']);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function createWarehouseVisits({origin,getActors,canSimulate=()=>true,onBoatPose=()=>{},onDoorPose=()=>{},onPark=()=>{},onComplete=()=>{},onManualReady=()=>false,getSeat=null,onVisitStep=()=>false,onVisitUnsafe=()=>false}){
 const visits=new Map(),routes=Array.from({length:A.capacity},(_,i)=>createWarehouseShuttleRoute(1024,i)),scratch={};
 const boats=routes.map((r,slot)=>({slot,id:null,...r.sample(0),speed:0,open:0}));let clock=0,shoreOwner=null,entryOwner=null,manual=null;
 const world=p=>new T.Vector3(p.x+origin.x,p.y,p.z+origin.z),local=p=>({x:p.x-origin.x,y:p.y,z:p.z-origin.z});
 const visitPoint=v=>({x:W.x+(v.boat-1)*30,y:A.foot,z:A.lobby.z-40});
 function phase(v,name){v.phase=name;v.age=0;}
 function pose(v){const f=v.frame;f.position.set(v.local.x+origin.x,v.local.y,v.local.z+origin.z);f.yaw=v.yaw;f.phase=v.phase;return f;}
 function seat(v){const b=boats[v.boat];onBoatPose(b,clock);return getSeat?getSeat(b):{x:b.x+Math.sin(b.yaw)*.25,y:b.y-.55,z:b.z+Math.cos(b.yaw)*.25};}
 function walk(v,to,dt,speed=3.6){if(v.express)speed*=4;const d=distance(v.local,to),step=Math.min(d,dt*speed);if(d>.00001){v.yaw=Math.atan2(to.x-v.local.x,to.z-v.local.z);for(const k of ['x','y','z'])v.local[k]+=(to[k]-v.local[k])*step/d;v.frame.walking=true;v.frame.locomotion={mode:'walk',speed,phase:(v.walkPhase+=step*2.2)};}return d<=step+.001;}
 function finish(v){if(shoreOwner===v.id)shoreOwner=null;if(entryOwner===v.id)entryOwner=null;if(manual===v.id)manual=null;const b=boats[v.boat];if(b){b.id=null;b.speed=0;b.open=0;}onPark(v.id,world(v.local));visits.delete(v.id);onComplete(v.id,{completed:!v.cancelled,action:v.activity.action,activityId:v.activity.id,ticket:v.ticket});if(v.manualWanted&&!v.cancelled)onManualReady(v.id);}
 function ride(v,reverse,dt){const r=routes[v.boat],b=boats[v.boat],left=r.length-v.progress,owner=reverse?shoreOwner:entryOwner;
  if(left<105&&!owner){if(reverse)shoreOwner=v.id;else entryOwner=v.id;}
  const owns=(reverse?shoreOwner:entryOwner)===v.id,remaining=Math.max(0,left-(owns?0:100)),limit=Math.min(A.cruiseSpeed,Math.sqrt(8*remaining));b.speed=Math.min(limit,b.speed+4*dt);v.progress=Math.min(r.length,v.progress+b.speed*dt*(v.express?45:1));
  if(v.skipOutbound&&!reverse){v.progress=r.length;b.speed=0;v.skipOutbound=false;}Object.assign(b,r.sample(v.progress,reverse,scratch,reverse?-12:12));b.open=0;v.local={...seat(v)};v.yaw=b.yaw;v.frame.reaction={ride:true,rideSit:true,crouch:.28,headPitch:-.03};
  if(v.progress>100){if(reverse&&entryOwner===v.id)entryOwner=null;if(!reverse&&shoreOwner===v.id)shoreOwner=null;}
  return v.progress>=r.length-.01;
 }
 function start(id,activityId='warehouse-explore',{ticket=null,express=false}={}){const a=warehouseActivity(activityId),actor=getActors().find(a=>a.id===id);if(!a||!actor||visits.has(id)||visits.size>=Math.min(384,getActors().length)||!canSimulate())return false;
  const p=local(actor.position),v={id,activity:a,ticket,express,boat:null,phase:'pending',age:0,local:p,yaw:actor.yaw||0,walkPhase:0,cancelled:false,manualWanted:false,frame:{position:actor.position.clone?.()||new T.Vector3(actor.position.x,actor.position.y,actor.position.z),yaw:actor.yaw||0,walking:false,reaction:{},locomotion:null}};visits.set(id,v);return true;
 }
 function update(dt,time){if(!canSimulate())return;dt=T.MathUtils.clamp(dt,0,.1);clock+=dt;
  for(const v of [...visits.values()]){v.age+=dt;v.frame.walking=false;v.frame.reaction={};v.frame.locomotion=null;v.frame.squish=null;
   if(v.phase==='pending'){if(v.cancelled){finish(v);continue;}const b=boats.find(b=>!b.id);if(b){b.id=v.id;v.boat=b.slot;const to=world(A.shore);if(v.express||v.frame.position.distanceTo(to)<.05){if(!v.express)v.local={...A.shore};phase(v,'await-board');}else{v.trip=gatherTrip(v.frame.position,to,clock*1000);phase(v,'shore-trip');}}}
   else if(v.phase==='shore-trip'){const p=gatherFrame(v.trip,clock*1000);v.local=local(p.position);v.yaw=p.yaw;v.frame.reaction=p.reaction;if(p.done)phase(v,'await-board');}
   else if(v.phase==='await-board'){if(v.cancelled){finish(v);continue;}if(!shoreOwner){shoreOwner=v.id;boats[v.boat].open=1;phase(v,'boarding');}}
   else if(v.phase==='boarding'){const b=boats[v.boat];b.open=1;if(walk(v,seat(v),dt)){if(v.cancelled)phase(v,'disembark');else{v.progress=0;phase(v,'outbound');}}}
   else if(v.phase==='outbound'){if(ride(v,false,dt)){boats[v.boat].open=1;if(v.cancelled){v.progress=0;phase(v,'inbound');}else phase(v,'leaving-boat');}}
   else if(v.phase==='leaving-boat'){boats[v.boat].open=1;if(walk(v,A.outside,dt)){v.airlock=createWarehouseAirlock(true);phase(v,'airlock-in');}}
   else if(v.phase==='airlock-in'||v.phase==='airlock-out'){const f=v.airlock.step(dt*(v.express?2.5:1));v.local={...f.position};v.frame.walking=true;v.frame.locomotion={mode:'walk',speed:2.5,phase:(v.walkPhase+=dt*5)};onDoorPose(f.outer,f.inner,f.water,time);if(f.done){if(v.phase==='airlock-in')phase(v,'lobby-walk');else phase(v,'return-boarding');}}
   else if(v.phase==='lobby-walk'){if(walk(v,visitPoint(v),dt)){if(entryOwner===v.id)entryOwner=null;phase(v,'visit');}}
   else if(v.phase==='visit'){let venueStep=false;
    if(v.manualWanted&&manual!==v.id&&!onVisitUnsafe(v)){manual=v.id;if(!onManualReady(v.id)){manual=null;v.age=0;}}
    if(manual===v.id){const actor=getActors().find(a=>a.id===v.id);if(actor)v.local=local(actor.position);v.age=0;}
    else if((venueStep=onVisitStep(v,dt,time))){}
    else if(!v.cancelled&&v.activity.action==='explore'){const base=visitPoint(v),a=v.age*.15,p={x:base.x+Math.sin(a)*6,y:A.foot,z:base.z+Math.cos(a)*8};walk(v,p,dt,2);v.frame.reaction.headYaw=Math.sin(v.age*.4)*.12;}
    else{v.frame.reaction={ride:true,crouch:.5,eyeClose:.35,earRelax:-.06};}
    if((v.cancelled||v.age>v.activity.duration)&&manual!==v.id&&!venueStep&&!entryOwner){entryOwner=v.id;phase(v,'lobby-return');}
   }
   else if(v.phase==='lobby-return'){if(walk(v,A.inside,dt)){v.airlock=createWarehouseAirlock(false);phase(v,'airlock-out');}}
   else if(v.phase==='return-boarding'){boats[v.boat].open=1;if(walk(v,seat(v),dt)){v.progress=0;phase(v,'inbound');}}
   else if(v.phase==='inbound'){if(ride(v,true,dt)){boats[v.boat].open=1;phase(v,'disembark');}}
   else if(v.phase==='disembark'){if(walk(v,A.shore,dt)){finish(v);continue;}}
   pose(v);
  }
  for(const b of boats)onBoatPose(b,time);
 }
 return{start,update,visits,boats,skipJourney(id='chichi'){const v=visits.get(id);if(v?.phase!=='outbound')return false;v.skipOutbound=true;return true;},has:id=>visits.has(id),get:id=>visits.get(id),frame:id=>visits.get(id)?.frame||null,unsafe:id=>unsafe.has(visits.get(id)?.phase)||!!(visits.get(id)&&onVisitUnsafe(visits.get(id))),get manual(){return manual;},requestManual(id='chichi'){const v=visits.get(id);if(!v)return false;v.manualWanted=true;v.cancelled=false;return true;},releaseManual(id=manual||'chichi'){const v=visits.get(id);if(v){const a=getActors().find(a=>a.id===id);if(a)v.local=local(a.position);v.manualWanted=false;v.age=0;}manual=null;},cancel(id){const v=visits.get(id);if(!v)return true;v.cancelled=true;v.manualWanted=false;if(manual===id)manual=null;if(v.phase==='pending'||v.phase==='await-board'){finish(v);return true;}return false;},safePosition(id){const v=visits.get(id);if(!v)return null;return v.phase==='pending'?v.frame.position.clone():world(A.shore);},dispose(){for(const v of [...visits.values()]){v.cancelled=true;onPark(v.id,this.safePosition(v.id));}visits.clear();for(const b of boats)b.id=null;manual=shoreOwner=entryOwner=null;}};
}
