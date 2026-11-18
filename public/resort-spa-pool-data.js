// One authored description for actual basin geometry, entry stairs and guest
// contacts. A jacuzzi's four guests share a real basin, not four dry grid seats.
import {RESORT_SPA as S} from './resort-spa-data.js';
export const RESORT_POOL=Object.freeze({depth:1.8,rise:.3,run:.75,steps:6,width:4,foot:.012});
export const resortSkyPool=()=>({x:0,z:203,y:S.y+2*S.rise,rx:10,rz:10,depth:RESORT_POOL.depth,sky:true});
export function resortPools(zone){
 const common={y:zone.y,depth:RESORT_POOL.depth};
 if(zone.procedure==='swim')return[{...common,x:zone.x,z:zone.z,rx:zone.rx-5,rz:zone.rz-5},resortSkyPool()];
 if(zone.procedure==='jacuzzi')return[...[-1,1].map(side=>({...common,x:zone.x+side*8,z:zone.z,rx:6,rz:6})),...[-1,1].flatMap(side=>[-10,0,10].map(x=>({...common,x:zone.x+x,z:zone.z+side*12,rx:3.3,rz:3.3})))];
 if(zone.procedure==='vip')return[{...common,x:zone.x+6,z:zone.z-2,rx:6,rz:6}];
 return[];
}
export function resortPoolContact(zone,slot){
 const pools=resortPools(zone);if(!pools.length)return null;const group=zone.procedure==='swim'?12:zone.procedure==='jacuzzi'?1:4,pool=pools[Math.floor(slot/group)%pools.length],index=slot%group,a=(index+.5)*Math.PI*2/group;
 const x=pool.x+Math.sin(a)*(zone.procedure==='swim'?pool.rx*.63:Math.min(2,pool.rx*.3)),z=pool.z+(zone.procedure==='swim'?Math.cos(a)*pool.rz*.57:Math.cos(a)*Math.min(1.2,pool.rz*.3));
 return{pool,index,x,z,y:pool.y-.9,yaw:a+Math.PI,approach:{x:pool.x,y:pool.y+RESORT_POOL.foot,z:pool.z+pool.rz+2},entry:{x:pool.x,y:pool.y-RESORT_POOL.depth+RESORT_POOL.foot,z:pool.z+pool.rz-RESORT_POOL.steps*RESORT_POOL.run-.7}};
}
