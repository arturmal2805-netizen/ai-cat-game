// Free invitations own only travel/arrival. No purchase, procedure or AI call.
// The roster queue is finite; at most four guests enter the physical lift and
// at most one new path is planned per update interval.
export function createSpaInvitations({actors,free,recall,ride,transit,navigation,origin,contract,onPark=()=>{},onRelease=()=>{},onReserve=()=>true,onHold=()=>{},allow=()=>true}){
 const guests=new Map();let clock=0,nextPlan=0;
 const local=p=>({x:p.x-origin.x,y:p.y-origin.y,z:p.z-origin.z});
 const world=p=>({x:p.x+origin.x,y:p.y+origin.y,z:p.z+origin.z});
 const places=[];for(const z of contract.zones)for(let i=0;i<z.seats;i++){const c=contract.seat(z,i);if(!c.pool)places.push({...c.approach,y:c.approach.y-origin.y});}
 places.sort((a,b)=>a.y-b.y);
 const actualClear=(p,r,id)=>actors().every(a=>a.id===id||Math.abs(local(a.position).y-p.y)>2||Math.hypot(local(a.position).x-p.x,local(a.position).z-p.z)>a.radius+r+.15);
 const clear=(p,r,id)=>actualClear(p,r,id)&&[...guests.values()].every(g=>g.id===id||!g.place||Math.abs(g.place.y-p.y)>2||Math.hypot(g.place.x-p.x,g.place.z-p.z)>g.radius+r+.15);
 const drop=id=>{if(!guests.has(id))return false;guests.delete(id);onRelease(id);return true;};
 function reserve(g){for(const p of places){if(!navigation.support(p,g.radius)||!clear(p,g.radius,g.id))continue;g.place={...p};return true;}return false;}
 return{
  get size(){return guests.size;},get active(){return[...guests.values()].filter(g=>g.phase!=='queued'&&g.phase!=='parked').length;},
  has:id=>guests.has(id),cancel:drop,
  invite(ids){let count=0;for(const id of new Set(ids)){if(guests.has(id)||!free(id))continue;const a=actors().find(a=>a.id===id);if(!a)continue;const p=local(a.position);if(p.y<80&&navigation.support(p,a.radius))continue;if(!onReserve(id))continue;guests.set(id,{id,radius:a.radius,phase:'queued'});count++;}return count;},
  ready(id){const g=guests.get(id);if(g?.phase==='recall')g.phase='ready';},
  arrived(id){const g=guests.get(id);if(g)g.phase='plan';},
  frame(id){const g=guests.get(id);return g?.position?{position:world(g.position),yaw:g.yaw||0,walking:g.phase==='walk',phase:'spa-invitation-'+g.phase,reaction:null}:null;},
  update(dt){if(!allow())return;const h=Math.min(.1,Math.max(0,dt));clock+=h;
   for(const g of [...guests.values()]){
    if(!free(g.id,true)){transit.cancel(g.id);drop(g.id);continue;}
    if(g.phase==='parked')continue;onHold(g.id);
    if(g.phase!=='walk')continue;let left=h*3.6;
    while(left>1e-7&&g.index<g.path.length){const p=g.path[g.index],a=g.position,d=Math.hypot(p.x-a.x,p.y-a.y,p.z-a.z);if(d<1e-7){g.index++;continue;}const step=Math.min(left,d,.12),u=step/d,b={x:a.x+(p.x-a.x)*u,y:a.y+(p.y-a.y)*u,z:a.z+(p.z-a.z)*u};if(!navigation.segmentClear(a,b,g.radius)||!actualClear(b,g.radius,g.id))break;g.yaw=Math.atan2(p.x-a.x,p.z-a.z);g.position=b;left-=step;if(d<=step+1e-7)g.index++;}
    if(g.index===g.path.length){g.phase='parked';onPark(g.id,world(g.position));}
   }
   if(clock<nextPlan)return;nextPlan=clock+.75;
   const plan=[...guests.values()].find(g=>g.phase==='plan');
   if(plan){const actor=actors().find(a=>a.id===plan.id);if(!actor){drop(plan.id);return;}const p=local(actor.position),path=(navigation.path||navigation.floorPath)(p,plan.place,plan.radius);if(!path?.length){drop(plan.id);return;}plan.position=p;plan.path=path;plan.index=0;plan.phase='walk';return;}
   const ready=[...guests.values()].find(g=>g.phase==='ready');if(ready){if(ride(ready.id,1,'group-invitation'))ready.phase='transit';return;}
   if([...guests.values()].filter(g=>!['queued','parked'].includes(g.phase)).length>=4||[...guests.values()].some(g=>g.phase==='recall'))return;
   const g=[...guests.values()].find(g=>g.phase==='queued');if(!g||!reserve(g))return;if(recall(g.id)){g.phase='recall';}else g.place=null;
  },clear(){for(const id of [...guests.keys()])drop(id);},
 };
}
