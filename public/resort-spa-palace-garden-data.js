import {SPA_V7_ZONES,spaV7Seat,spaV7Pools} from './resort-spa-services-v7.js';
import {SPA_PALACE as P,spaPalaceContains} from './resort-spa-layout-v7.js';
export const SPA_PALACE_CASCADES=Object.freeze([
 ...[-1,1].map(side=>({id:'aroma-palace-cascade-'+side,x:87+side*11,z:245,level:1})),
 ...[-1,1].map(side=>({id:'waterfall-palace-cascade-'+side,x:94+side*14,z:205,level:0})),
].map(f=>Object.freeze({...f,tiers:Object.freeze([{y:f.level*P.rise+.85,z:.6,rx:3.2,rz:2.4,depth:.35},{y:f.level*P.rise+1.95,z:-.3,rx:2.35,rz:1.55,depth:.3},{y:f.level*P.rise+3.15,z:-1,rx:1.45,rz:1,depth:.25}].map(Object.freeze))})));
export function spaPalaceGardenSites(){
 const sites=[];
 for(const z of SPA_V7_ZONES){let n=0;for(let i=0;i<48&&n<6;i++){
  const a=(i+.5)*Math.PI/24,x=z.x+Math.cos(a)*(z.rx-3.2),d=z.z+Math.sin(a)*(z.rz-3.2);
  if(!spaPalaceContains(x,d,3)||sites.some(s=>s.level===z.level&&Math.hypot(s.x-x,s.z-d)<5.4))continue;
  if([25,-25].some(s=>Math.abs(x-s)<6&&d>180&&d<240)||z.key==='cafe'&&Math.hypot(x,d-203)<14)continue;
  if(SPA_PALACE_CASCADES.some(f=>f.level===z.level&&Math.hypot(f.x-x,f.z-d)<6))continue;
  let clear=true;for(const other of SPA_V7_ZONES.filter(o=>o.level===z.level)){
   if(spaV7Pools(other).some(p=>Math.hypot((x-p.x)/(p.rx+3),(d-p.z)/(p.rz+3))<1))clear=false;
   for(let slot=0;slot<other.seats;slot++){const c=spaV7Seat(other,slot);if([c,c.seat,c.staff,c.approach,c.exit].filter(Boolean).some(q=>Math.hypot(q.x-x,q.z-d)<4))clear=false;}
  }
  if(!clear)continue;sites.push({id:z.id+'-palace-garden-'+n++,room:z.id,level:z.level,x,z:d,yaw:-a-Math.PI/2,rx:1.65,rz:.7});
 }}return sites;
}
