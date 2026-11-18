// Independent sealed access lift in the added front-water space. All values
// remain ocean-local metres; it does not move the Mall's existing lift/pier.
export const RESORT_LIFT=Object.freeze({x:20,z:300,radius:6,upperY:.35,lowerY:-164.82,speed:6,doorSeconds:1.2,capacity:4});
export function createResortSpaLift(){
 const L=RESORT_LIFT,passengers=new Map(),state={floor:0,target:0,y:L.upperY,phase:'open',door:1,elapsed:0};
 const floorY=f=>f===0?L.upperY:L.lowerY;
 const seat=(slot,y=state.y)=>({x:L.x+(slot%2?1.5:-1.5),y,z:L.z+(slot<2?-1.5:1.5)});
 return{state,passengers,seat,
  board(id,position){if(state.phase!=='open'||passengers.has(id)||passengers.size>=L.capacity)return false;let slot=0;while([...passengers.values()].some(p=>p.slot===slot))slot++;const target=seat(slot);if(Math.hypot(position.x-target.x,position.y-target.y,position.z-target.z)>.05)return false;passengers.set(id,{slot,phase:'boarded'});return true;},
  depart(floor){if(![0,1].includes(floor)||floor===state.floor||state.phase!=='open'||[...passengers.values()].some(p=>p.phase!=='boarded'))return false;state.target=floor;state.phase='closing';state.elapsed=0;return true;},
  beginExit(id){const p=passengers.get(id);if(!p||state.phase!=='open')return false;p.phase='leaving';return true;},
  finishExit(id,position,radius=.571){const p=passengers.get(id);if(!p||p.phase!=='leaving'||Math.abs(position.y-state.y)>.1||position.z<L.z+L.radius+radius)return false;passengers.delete(id);return true;},
  position(id){const p=passengers.get(id);return p?.phase==='boarded'?seat(p.slot):null;},
  step(dt){let time=Math.max(0,Math.min(.25,dt));while(time>1e-9){if(state.phase==='open')break;
   if(state.phase==='travelling'){const target=floorY(state.target),distance=Math.abs(target-state.y),duration=distance/L.speed,h=Math.min(time,duration);state.y+=Math.sign(target-state.y)*h*L.speed;time-=h;if(duration<=h+1e-9){state.y=target;state.floor=state.target;state.phase='opening';state.elapsed=0;}else break;}
   else{const h=Math.min(time,L.doorSeconds-state.elapsed);state.elapsed+=h;time-=h;state.door=state.phase==='closing'?1-state.elapsed/L.doorSeconds:state.elapsed/L.doorSeconds;if(state.elapsed>=L.doorSeconds-1e-9){state.elapsed=0;if(state.phase==='closing'){state.door=0;state.phase='travelling';}else{state.door=1;state.phase='open';}}else break;}
  }},
 };
}
