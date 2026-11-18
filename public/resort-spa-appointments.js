import {createResortSpaRuntime} from './resort-spa-runtime.js';
import {RESORT_SPA as L,resortZone} from './resort-spa-data.js';
import {resortPaidTicket} from './resort-spa-economy.js';
// Adapter between native world actors and the existing app's durable ledger.
// Y is absolute game height in runtime/save data, root-local only in geometry.
export function createResortAppointments({getGame,getActors,getNavigation,centre,canSimulate=()=>true,blocked=()=>false,onPurchase,onUse,onGoal=()=>{},onComplete=()=>{},getStaff=()=>[]}={}){
 const localY=p=>({...p,y:p.y-L.y}),absoluteY=p=>({...p,y:p.y+L.y}),staffOwners=new Map();
 const runtime=createResortSpaRuntime({
  route:(a,b,r)=>getNavigation()?.floorPath(localY(a),localY(b),r)?.map(absoluteY)||null,
  segmentClear:(a,b,r)=>!!getNavigation()?.segmentClear(localY(a),localY(b),r),
  getPaidTicket:(id,zone)=>resortPaidTicket(getGame(),id,zone),
  onPurchase:(id,zone)=>{const p=getGame().jobCity?.profiles[id];if(!p||!canSimulate())return null;const receipt='resort-'+id+'-'+(p.purchaseCount+1);return onPurchase?.(id,zone+'-session',receipt)?receipt:null;},
  onUse:(id,zone,receipt)=>canSimulate()&&!!onUse?.(id,zone,receipt),
  reserveStaff:(id,zone,target)=>{const staff=getStaff().find(s=>!staffOwners.has(s.id)&&Math.hypot(s.position.x-target.x,s.position.y-target.y,s.position.z-target.z)<.1);if(!staff)return null;staffOwners.set(staff.id,id);return{id:staff.id};},
  releaseStaff:(staff,id)=>{if(staffOwners.get(staff)===id)staffOwners.delete(staff);},
  onComplete:(id,result)=>{onGoal(id,null);onComplete(id,result);},
 });
 return{runtime,has:id=>runtime.has(id),
  start(id,zoneId){const a=getActors().find(a=>a.id===id),zone=resortZone(zoneId);if(!a||!zone||!canSimulate()||blocked(id)||runtime.has(id))return false;const p={x:a.position.x-centre[0],y:a.position.y,z:a.position.z-centre[1]};if(!getNavigation()?.support(localY(p),a.radius))return false;
   // A same-floor visit can begin now. Cross-level entry waits for the real
   // stairs route instead of moving the actor through empty water.
   if(Math.abs(p.y-zone.y-.18)>.65)return false;
   const started=runtime.start({catId:id,zoneId,position:p,radius:a.radius,returnTo:p});if(started)onGoal(id,{layoutVersion:2,storeId:zoneId,at:Date.now(),productId:null,receipt:null,purchased:false,used:false});return started;
  },
  cancel:id=>runtime.cancel(id),update(dt){runtime.step(dt,{allow:canSimulate(),blocked});},
  frame(id){const f=runtime.frame(id);return f?{...f,position:{x:f.position.x+centre[0],y:f.position.y,z:f.position.z+centre[1]}}:null;},
  staffOwner:id=>staffOwners.get(id)||null,clear:()=>runtime.clear(),
 };
}
