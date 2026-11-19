import {SPA_PALACE as P,SPA_V6_ROOMS,SPA_V7_ROOMS,spaPalacePools,spaTicketDestination,SPA_RETIRED_ROOMS} from './resort-spa-layout-v7.js';
// The physical room is distinct from the immutable historical purchase address.
// A prepaid retired service becomes one admission, not a currency conversion.
const procedures={thermal:'swim',vip:'vip',midnight:'sleep',massage:'massage',aroma:'aroma',cabana:'cabana',cafe:'eat',waterfall:'garden',jacuzzi:'jacuzzi',amber:'lounge',nap:'sleep',meditation:'meditate',beauty:'groom',sauna:'sauna'};
const capacities={thermal:16,vip:30,midnight:16,massage:6,aroma:6,cabana:6,cafe:8,waterfall:8};
export const SPA_V7_ZONES=Object.freeze(SPA_V7_ROOMS.map(z=>Object.freeze({...z,roomId:z.id,seats:capacities[z.key],price:SPA_V6_ROOMS.find(o=>o.id===z.id).price,procedure:procedures[z.key],biome:'autumn',resort:true,kind:z.key==='cafe'?'food':'spa',action:z.key==='cafe'?'eat':z.key==='thermal'?'swim':'rest'})));
export const SPA_V7_SERVICES=Object.freeze(SPA_V6_ROOMS.map(old=>{
 const room=SPA_V7_ZONES.find(z=>z.id===spaTicketDestination(old.id)),retired=SPA_RETIRED_ROOMS.includes(old.id);
 return Object.freeze({...room,id:old.id,key:old.key,roomKey:room.key,roomId:room.id,price:old.price,procedure:retired?'sleep':procedures[old.key],retired,legacy:old.id!==room.id,seats:room.seats});
}));
export const spaV7Service=id=>SPA_V7_SERVICES.find(z=>z.id===id);
export function spaV7Slots(zone){
 if(zone.key==='jacuzzi')return Array.from({length:18},(_,i)=>i);
 if(zone.key==='amber')return[10,11,12,13];
 if(zone.retired)return[0,1,2,3,4,5,6,7,8,9,14,15];
 return Array.from({length:zone.seats},(_,i)=>i);
}
export function spaV7Pools(zone){return spaPalacePools().filter(p=>p.room===(zone.roomId||zone.id));}
export function spaV7PoolContact(zone,slot){
 const key=zone.roomKey||zone.key,pools=spaV7Pools(zone);let pool,index;
 if(key==='cafe'){pool=pools.find(p=>p.cafeSlot===slot);index=0;}
 else{let cursor=0;for(const p of pools){if(slot>=cursor&&slot<cursor+p.capacity){pool=p;index=slot-cursor;break;}cursor+=p.capacity;}}
 if(!pool)return null;
 if(key==='cafe'){
  const y=pool.y-.9,table={x:pool.x,y:pool.y+.58,z:pool.z-2.1};
  return{pool,index,x:pool.x+2.5,z:table.z,y,yaw:-Math.PI/2,table,approach:{x:pool.x,y:pool.y+.012,z:pool.z+pool.rz+2},entry:{x:pool.x,y:pool.y-pool.depth+.012,z:pool.z+pool.rz-5.2},swimWaypoints:[{x:pool.x+2.5,y,z:pool.z+.4}]};
 }
 const a=(index+.5)*Math.PI*2/pool.capacity,swim=key==='thermal';
 return{pool,index,x:pool.x+Math.sin(a)*(swim?pool.rx*.63:Math.min(2,pool.rx*.3)),z:pool.z+Math.cos(a)*(swim?pool.rz*.57:Math.min(1.2,pool.rz*.3)),y:pool.y-.9,yaw:a+Math.PI,approach:{x:pool.x,y:pool.y+.012,z:pool.z+pool.rz+2},entry:{x:pool.x,y:pool.y-pool.depth+.012,z:pool.z+pool.rz-5.2}};
}
export function spaV7Seat(zone,index){
 const wet=spaV7PoolContact(zone,index);if(wet)return{...wet,staff:null,exit:{...wet.approach}};
 const key=zone.roomKey||zone.key,y=zone.y+.012;let x,z,yaw=0;
 if(key==='vip'){const i=index-18;x=zone.x-33+(i%2)*14;z=zone.z-23+Math.floor(i/2)*9;}
 else if(key==='midnight'){
  const positions=[[-16,-9],[0,-9],[16,-9],[-16,5],[0,5],[16,5],[-32,-12],[-32,-3],[-32,6],[-32,15],[31,-12],[31,-3],[31,6],[31,15],[-12,15],[12,15]];
  [x,z]=positions[index];x+=zone.x;z+=zone.z;
 }else if(key==='cafe'){const a=index*Math.PI/4;x=Math.sin(a)*20;z=203+Math.cos(a)*20;if(index===2||index===6){x=index===2?32:-32;z=215;}yaw=Math.PI;}
 else if(key==='cabana'){x=zone.x+(index-2.5)*9;z=zone.z;}
 else{const columns=key==='massage'?3:key==='aroma'?3:4,spacing=key==='massage'?12:key==='aroma'?13:10;x=zone.x+(index%columns-(columns-1)/2)*spacing;z=zone.z+(Math.floor(index/columns)-(Math.ceil(zone.seats/columns)-1)/2)*(key==='massage'?15:12);}
 const seat=['vip','midnight','cabana','aroma'].includes(key)?{x,y:y+(key==='aroma'?.8:.92),z}:key==='cafe'?{x,y:y+.92,z:z+2.8}:undefined;
 return{x,y,z,yaw,...(seat?{seat}:{}),approach:{x:x+(key==='cafe'?3.6:0),y,z:z+3.6},staff:key==='massage'?{x:x+2.2,y,z}:null,exit:{x:x+(key==='cafe'?4.5:0),y,z:z+(key==='cafe'?3.6:5)}};
}
export const SPA_V7_RUNTIME_CONTRACT=Object.freeze({zones:SPA_V7_ZONES,zone:spaV7Service,seat:spaV7Seat,slots:spaV7Slots,skyY:P.baseY+2*P.rise});
