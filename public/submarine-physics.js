import {MOSA_SEA,mosaBedY} from './mosasaur-data.js';
import {mosaTerrainObstacles} from './mosasaur-collision.js';
import {mosaReefClearance} from './mosasaur-reef-data.js';
export const SUBMARINE_DOCK=Object.freeze({x:-6,y:-.85,z:92,yaw:Math.PI});
export const SUBMARINE_MAX_SPEED=24;
export const SUBMARINE_BOARDING_POINT=Object.freeze({x:0,y:.16,z:96});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const hullOffsets=[-1.9,0,1.9];
function overlapsReef(s){return hullOffsets.some(offset=>mosaReefClearance(s.x+Math.sin(s.yaw)*offset,s.y,s.z+Math.cos(s.yaw)*offset)<1.25);}
export function normalizeSubmarine(raw={}){
 const valid=Number.isFinite(raw.x+raw.y+raw.z+raw.yaw)&&Math.hypot(raw.x/(MOSA_SEA.rx-4),raw.z/(MOSA_SEA.rz-4))<1&&raw.y>mosaBedY(raw.x,raw.z)+1.1&&raw.y<12&&!overlapsReef(raw);
 return {...(valid?{x:raw.x,y:raw.y,z:raw.z,yaw:wrap(raw.yaw)}:SUBMARINE_DOCK),speed:0,vertical:0,turn:0,active:valid&&raw.active===true,mode:raw.mode==='cockpit'?'cockpit':'chase'};
}
export function submarineAtDock(s){return Math.hypot(s.x-SUBMARINE_DOCK.x,s.z-SUBMARINE_DOCK.z)<4&&Math.abs(s.y-SUBMARINE_DOCK.y)<2.5&&Math.abs(s.speed)<1.1;}
export function submarineSnapshot(s){return {x:s.x,y:s.y,z:s.z,yaw:s.yaw,active:!!s.active,mode:s.mode==='cockpit'?'cockpit':'chase'};}
function pushCapsule(p,o,radius){
 const ax=o.a[0],ay=o.a[1],az=o.a[2],dx=o.b[0]-ax,dy=o.b[1]-ay,dz=o.b[2]-az,t=clamp(((p.x-ax)*dx+(p.y-ay)*dy+(p.z-az)*dz)/(dx*dx+dy*dy+dz*dz||1),0,1),x=p.x-ax-dx*t,y=p.y-ay-dy*t,z=p.z-az-dz*t,d=Math.hypot(x,y,z),gap=radius+o.radius;
 if(d>=gap)return false;if(d<1e-8){p.x+=gap;return true;}const k=(gap-d)/d;p.x+=x*k;p.y+=y*k;p.z+=z*k;return true;
}
export function createSubmarinePhysics(raw,obstacles=mosaTerrainObstacles()){
 const state=normalizeSubmarine(raw);let boostCooldown=0;
 function hullFloor(){let floor=-Infinity;for(const offset of [-1.9,0,1.9])floor=Math.max(floor,mosaBedY(state.x+Math.sin(state.yaw)*offset,state.z+Math.cos(state.yaw)*offset)+1.3);return floor;}
 function constrain(previous=null){
  let hit=false;const r=Math.hypot(state.x/(MOSA_SEA.rx-3.5),state.z/(MOSA_SEA.rz-3.5));if(r>1){state.x/=r;state.z/=r;hit=true;}
  let floor=hullFloor();
  if(state.y<floor){
   if(previous&&floor>previous.y+Math.max(.02,Math.hypot(state.x-previous.x,state.z-previous.z)*.8)){state.x=previous.x;state.z=previous.z;state.yaw=previous.yaw;state.speed=0;floor=hullFloor();}
   state.y=Math.max(state.y,floor);state.vertical=Math.max(0,state.vertical);hit=true;
  }
  for(let pass=0;pass<2;pass++)for(const offset of [-1.9,0,1.9]){
   const p={x:state.x+Math.sin(state.yaw)*offset,y:state.y,z:state.z+Math.cos(state.yaw)*offset};
   for(const o of obstacles)if(pushCapsule(p,o,1.25)){state.x=p.x-Math.sin(state.yaw)*offset;state.y=p.y;state.z=p.z-Math.cos(state.yaw)*offset;hit=true;}
  }
  if(previous&&overlapsReef(state)){
   const candidate={x:state.x,y:state.y,z:state.z,yaw:state.yaw};state.x=previous.x;state.z=previous.z;state.yaw=previous.yaw;
   if(overlapsReef(state))state.y=previous.y;
   state.x=candidate.x;state.z=candidate.z;state.yaw=candidate.yaw;
   if(overlapsReef(state)){state.x=previous.x;state.z=previous.z;state.yaw=previous.yaw;state.speed=0;}
   if(state.y===previous.y)state.vertical=0;hit=true;
  }
  if(hit)state.speed*=.72;state.y=Math.max(-198,state.y,hullFloor());return hit;
 }
 function step(dt,input={}){
  dt=clamp(dt,0,.1);if(!state.active)return state;const steps=Math.max(1,Math.ceil(dt*Math.max(10,Math.abs(state.speed))/ .45)),h=dt/steps;
  for(let i=0;i<steps;i++){
   const previous={x:state.x,y:state.y,z:state.z,yaw:state.yaw};
   boostCooldown=Math.max(0,boostCooldown-h);const throttle=clamp(input.forward||0,-1,1),steer=clamp(input.turn||0,-1,1),dive=clamp(input.vertical||0,-1,1),submerged=state.y<MOSA_SEA.surfaceY+.15;
   state.speed+=(throttle*(throttle<0?12:20)-state.speed*(throttle?.65:2.5))*h;state.speed=clamp(state.speed,-9,SUBMARINE_MAX_SPEED);
   const wantedTurn=steer*(.8+Math.abs(state.speed)*.015);state.turn+=(wantedTurn-state.turn)*(1-Math.exp(-7*h));state.yaw=wrap(state.yaw+state.turn*h);
   if(input.boost&&boostCooldown===0&&submerged){state.vertical=Math.max(state.vertical,submerged?13:0);boostCooldown=.9;}
   if(submerged)state.vertical+=(dive*15-state.vertical*(dive?1.5:3))*h;else state.vertical-=9.81*h;
   state.x+=Math.sin(state.yaw)*state.speed*h;state.z+=Math.cos(state.yaw)*state.speed*h;state.y+=state.vertical*h;
   constrain(previous);
  }return state;
 }
 return {state,step,constrain,snapshot:()=>submarineSnapshot(state),atDock:()=>submarineAtDock(state)};
}
