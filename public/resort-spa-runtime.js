import {resortZone,resortSpaSeat} from './resort-spa-data.js';
import {createResortSpaBooking} from './resort-spa-booking.js';
import {stepResortPool,cancelResortPool} from './resort-spa-pool-procedure.js';
import {resortPoolPerformance} from './resort-spa-pool-performance.js';
import {resortDryPerformance} from './resort-spa-dry-performance.js';
const copy=p=>({x:p.x,y:p.y,z:p.z}),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),smooth=t=>t*t*(3-2*t);
// Uses the caller's existing route planner, durable purchase/use callbacks and
// actual actor roster. It neither creates an AI nor mutates a wallet or save.
export function createResortSpaRuntime({route,segmentClear,onPurchase,onUse,onComplete=()=>{},reserveStaff=()=>null,releaseStaff=()=>{},getPaidTicket=()=>null,poolNavigation=null}={}){
 if(typeof route!=='function'||typeof segmentClear!=='function')throw Error('SPA needs physical routes and full-body clearance');
 const booking=createResortSpaBooking(),visits=new Map();let clock=0,serial=0;
 function release(v,completed=false){booking.release(v.catId,clock);if(v.staff)releaseStaff(v.staff.id,v.catId);visits.delete(v.catId);onComplete(v.catId,{completed,receipt:v.receipt,zoneId:v.zone.id,position:copy(v.position)});}
 function walk(v,goal,next){const path=route(copy(v.position),copy(goal),v.radius);if(!Array.isArray(path)||!path.length)return false;let prior=v.position;for(const p of path){if(![p.x,p.y,p.z].every(Number.isFinite)||!segmentClear(prior,p,v.radius))return false;prior=p;}if(dist(prior,goal)>.05)return false;v.path=path.map(copy);v.pathIndex=0;v.next=next;v.phase='walk';v.elapsed=0;return true;}
 function arrive(v){v.phase=v.next;v.elapsed=0;v.walking=false;}
 function move(v,dt){let left=dt*3.6;v.walking=false;while(left>1e-8&&v.pathIndex<v.path.length){const target=v.path[v.pathIndex],length=dist(v.position,target);if(length<1e-7){v.pathIndex++;continue;}const step=Math.min(left,length,.12),u=step/length,p={x:v.position.x+(target.x-v.position.x)*u,y:v.position.y+(target.y-v.position.y)*u,z:v.position.z+(target.z-v.position.z)*u};
  if(!segmentClear(v.position,p,v.radius)||[...visits.values()].some(o=>o!==v&&Math.abs(o.position.y-p.y)<2&&Math.hypot(o.position.x-p.x,o.position.z-p.z)<o.radius+v.radius+.1))return;
  v.yaw=Math.atan2(target.x-v.position.x,target.z-v.position.z);v.position=p;v.walking=true;left-=step;if(length<=step+1e-7)v.pathIndex++;
 }if(v.pathIndex===v.path.length)arrive(v);}
 function assign(v){const station=booking.reserve(v.catId,v.zone.id,clock);if(!station)return false;v.slot=station.slot;v.contact=resortSpaSeat(v.zone,v.slot);const goal=v.contact.approach;if(v.contact.pool&&!poolNavigation||!walk(v,goal,'inspect')){booking.release(v.catId,clock);return false;}return true;}
 const free=(v,p)=>![...visits.values()].some(o=>o!==v&&Math.abs(o.position.y-p.y)<2&&Math.hypot(o.position.x-p.x,o.position.z-p.z)<o.radius+v.radius+.1);
 return{visits,booking,get:id=>visits.get(id),has:id=>visits.has(id),
  start({catId,zoneId,position,radius=.571,returnTo=position}){const zone=resortZone(zoneId);if(!zone||visits.has(catId)||visits.size>=12||!position||![position.x,position.y,position.z,radius].every(Number.isFinite)||radius<=0)return false;
   const v={catId,zone,position:copy(position),returnTo:copy(returnTo),radius,phase:'waiting',elapsed:0,yaw:0,walking:false,receipt:null,used:false,staff:null,request:'resort-'+catId+'-'+(++serial)};visits.set(catId,v);assign(v);return true;},
  cancel(id){const v=visits.get(id);if(!v)return false;if(v.contact?.pool&&(v.phase.startsWith('wet-')||v.phase==='procedure'))cancelResortPool(v);else release(v);return true;},
  step(dt,{allow=true,blocked=()=>false}={}){if(!allow)return;const h=Math.min(.1,Math.max(0,dt));clock+=h;booking.step(clock);
   for(const v of [...visits.values()]){
    if(blocked(v.catId)){if(v.contact?.pool&&(v.phase.startsWith('wet-')||v.phase==='procedure'))cancelResortPool(v);else{release(v);continue;}}
    v.elapsed+=h;
    if(v.phase==='walk'){move(v,h);continue;}
    if(v.phase==='waiting'){if(v.elapsed>=1){v.elapsed=0;assign(v);}continue;}
    if(v.contact?.pool&&(v.phase.startsWith('wet-')||v.phase==='procedure'&&v.elapsed<24)){if(stepResortPool(v,h,poolNavigation,p=>free(v,p))){booking.release(v.catId,clock);v.phase='return-pending';}continue;}
    if(v.phase==='inspect'&&v.elapsed>=1.2){
     if(v.zone.procedure==='massage'&&!v.staff){v.staff=reserveStaff(v.catId,v.zone.id,v.contact.staff);if(!v.staff)continue;}
     // Check/charge through the existing durable receipt ledger once. A paid
     // but interrupted ticket remains available for a later session/reload.
     try{v.receipt=getPaidTicket(v.catId,v.zone.id)||onPurchase?.(v.catId,v.zone.id,v.request);}catch{v.receipt=null;}
     if(!v.receipt){release(v);continue;}if(!booking.occupy(v.catId,clock)){release(v);continue;}
     v.phase=v.contact.pool?'wet-enter':'mount';v.elapsed=0;v.mountFrom=copy(v.position);v.mountYaw=v.yaw;
    }else if(v.phase==='mount'){
     const u=Math.min(1,v.elapsed/1.6),t=smooth(u),a=v.mountFrom,b=v.contact.seat||v.contact;
     const height=v.contact.seat?0:v.zone.procedure==='massage'?1.02:['lounge','sleep','cabana','groom'].includes(v.zone.procedure)?.92:v.zone.procedure==='sauna'?.8:['aroma','meditate','garden'].includes(v.zone.procedure)?.08:0;
     const target={x:b.x,y:b.y+height,z:b.z};v.position={x:a.x+(target.x-a.x)*t,y:a.y+(target.y-a.y)*t+Math.sin(Math.PI*u)*.8,z:a.z+(target.z-a.z)*t};
     v.yaw=v.mountYaw+Math.atan2(Math.sin(v.contact.yaw-v.mountYaw),Math.cos(v.contact.yaw-v.mountYaw))*t;
     if(u===1){v.phase='procedure';v.elapsed=0;}
    }else if(v.phase==='procedure'&&v.elapsed>=24){
     // Success is durable before returning; callback failure keeps ownership
     // and retries this same receipt, never buys a replacement ticket.
     if(!v.used){try{v.used=!!onUse?.(v.catId,v.zone.id,v.receipt);}catch{v.used=false;}}if(!v.used)continue;v.phase=v.contact.pool?'wet-return':'dismount';v.elapsed=0;v.mountFrom=copy(v.position);
    }else if(v.phase==='dismount'){
     const u=Math.min(1,v.elapsed/1.6),t=smooth(u),a=v.mountFrom,b=v.contact.approach;v.position={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t+Math.sin(Math.PI*u)*.8,z:a.z+(b.z-a.z)*t};
     if(u===1){booking.release(v.catId,clock);if(v.staff){releaseStaff(v.staff.id,v.catId);v.staff=null;}v.phase='return-pending';}
    }else if(v.phase==='return-pending'){walk(v,v.returnTo,'done');}
    else if(v.phase==='done'){release(v,!v.cancelled);}
   }
  },
  frame(id){const v=visits.get(id);if(!v)return null;const e=v.elapsed;
   if(v.contact?.pool){const pose=resortPoolPerformance(v.phase,e,v.zone.procedure);return{position:copy(v.position),yaw:v.yaw,walking:v.walking,phase:v.phase,zoneId:v.zone.id,receipt:v.receipt,...pose};}
   return{position:copy(v.position),yaw:v.yaw,walking:v.walking,phase:v.phase,zoneId:v.zone.id,staff:v.staff,receipt:v.receipt,
    ...resortDryPerformance(v.zone.key,v.phase,e),
   };
  },clear(){for(const v of [...visits.values()])release(v);booking.clear();},
 };
}
