import {RESORT_ZONES,RESORT_STAIRS,resortSpaSeat} from './resort-spa-data.js';
import {resortPools} from './resort-spa-pool-data.js';
import {RESORT_BRIDGES} from './resort-spa-corridors.js';

// Fixed authored water gardens, behind the actual Aroma stations. Heights are
// root-local; these raised ornamental basins are not new purchasable baths.
export const AROMA_CASCADES=Object.freeze([-1,1].map(side=>Object.freeze({
 id:'aroma-cascade-'+side,x:87+side*11,z:248,level:0,
 tiers:Object.freeze([
  Object.freeze({y:.85,z:.6,rx:3.2,rz:2.4,depth:.35}),
  Object.freeze({y:1.95,z:-.3,rx:2.35,rz:1.55,depth:.3}),
  Object.freeze({y:3.15,z:-1,rx:1.45,rz:1.0,depth:.25})
 ])
})));
const segmentDistance=(p,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);};
const distanceBox=(p,x,z,hx,hz)=>Math.hypot(Math.max(0,Math.abs(p.x-x)-hx),Math.max(0,Math.abs(p.z-z)-hz));
export function resortGardenSites(){
 const sites=[],radius=2.0,margin=radius+.9;
 const angles=[0,Math.PI,Math.PI/2,Math.PI*1.5,...Array.from({length:24},(_,i)=>(i+.5)*Math.PI/12)];
 for(const key of ['aroma','cafe','vip']){
  const zone=RESORT_ZONES.find(z=>z.key===key),rx=key==='cafe'?34:zone.rx,rz=key==='cafe'?34:zone.rz,scale=key==='cafe'?.91:.83,max=key==='vip'?4:6;let count=0;
  for(const angle of angles){
   const p={x:zone.x+Math.cos(angle)*rx*scale,z:zone.z+Math.sin(angle)*rz*scale},yaw=-angle-Math.PI/2;
   if(sites.some(s=>s.level===zone.level&&Math.hypot(s.x-p.x,s.z-p.z)<5.4))continue;
   let clear=true;
   for(let i=0;i<24;i++){
    const a=i*Math.PI/12,lx=Math.cos(a)*1.65,lz=Math.sin(a)*.7,x=p.x+Math.cos(yaw)*lx+Math.sin(yaw)*lz,z=p.z-Math.sin(yaw)*lx+Math.cos(yaw)*lz;
    if(Math.hypot((x-zone.x)/(rx-.35),(z-zone.z)/(rz-.35))>=1)clear=false;
   }
   for(const z of RESORT_ZONES.filter(z=>z.level===zone.level)){
    for(const pool of resortPools(z))if(Math.hypot((p.x-pool.x)/(pool.rx+margin),(p.z-pool.z)/(pool.rz+margin))<1)clear=false;
    for(let slot=0;slot<z.seats;slot++){
     const s=resortSpaSeat(z,slot);
     for(const q of [s,s.seat,s.staff,s.approach,s.exit].filter(Boolean))if(Math.hypot(p.x-q.x,p.z-q.z)<margin+1.2)clear=false;
     if(segmentDistance(p,s.approach,s.exit)<margin)clear=false;
    }
   }
   for(const bridge of RESORT_BRIDGES.filter(b=>b.level===zone.level))if(segmentDistance(p,...bridge.points)<radius+3.2)clear=false;
   for(const stair of RESORT_STAIRS)if(zone.level===stair.level||zone.level===stair.level+1)if(distanceBox(p,stair.x,204,3.5,19)<margin)clear=false;
   if(key==='cafe')for(const side of [-1,1])for(let i=0;i<4;i++)if(distanceBox(p,-12+i*8,203+side*26,2,2.3)<radius+.7)clear=false;
   if(zone.level===0)for(const cascade of AROMA_CASCADES)if(Math.hypot(p.x-cascade.x,p.z-cascade.z)<radius+4.3)clear=false;
   if(!clear)continue;
   sites.push({id:zone.id+'-garden-'+count,room:zone.id,level:zone.level,...p,yaw,rx:1.65,rz:.7});if(++count===max)break;
  }
 }
 return sites;
}
