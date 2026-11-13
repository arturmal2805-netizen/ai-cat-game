import {mallBuildingFootprintDistance,MALL_LAYOUT as MALL} from './mall-layout.js';
import {MOSA_CAVES} from './mosasaur-collision.js';
import {SUBMARINE_DOCK} from './submarine-physics.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// A cavern has a solid roof. Leave through its real opening at chamber height
// before ascending; steering toward the pier and ascending together wedges the
// hull under the arch. The same swept physics still owns every movement.
export function createSubmarineReturn(state){
 const cave=MOSA_CAVES.find(c=>Math.abs(state.x-c.x)<c.radius&&state.z>c.z-c.depth&&state.z<c.z+3&&state.y>c.y-1&&state.y<c.y+c.radius+2);
 let phase=cave?'cave':'ascent';
 const belowMall=s=>s.y<MALL.y-.5&&mallBuildingFootprintDistance(s.x,s.z)<3;
 const underY=MALL.y-2.8,exit={x:0,y:underY,z:-8},gather={x:0,y:underY,z:25};
 return current=>{
  if(phase==='cave'&&current.z>cave.z+5)phase='ascent';
  if(phase==='ascent'&&belowMall(current))phase='mall-rise';
  if(phase==='mall-rise'&&current.y>underY-.5)phase='mall-gather';
  if(phase==='mall-gather'&&Math.hypot(current.x-gather.x,current.z-gather.z)<3)phase='mall-exit';
  if(phase==='mall-exit'&&Math.hypot(current.x-exit.x,current.z-exit.z)<3)phase='ascent';
  if(phase==='ascent'&&current.y>-2)phase='dock';
  const target=phase==='mall-rise'?{x:current.x,y:underY,z:current.z}:phase==='mall-gather'?gather:phase==='mall-exit'?exit:phase==='cave'?{x:cave.x,y:cave.y+3,z:cave.z+8}:phase==='ascent'?{x:current.x,y:SUBMARINE_DOCK.y,z:current.z}:SUBMARINE_DOCK;
  const dx=target.x-current.x,dz=target.z-current.z,d=Math.hypot(dx,dz),angle=Math.atan2(Math.sin(Math.atan2(dx,dz)-current.yaw),Math.cos(Math.atan2(dx,dz)-current.yaw));
  return {turn:['ascent','mall-rise'].includes(phase)?0:clamp(angle*2,-1,1),forward:!['ascent','mall-rise'].includes(phase)&&d>2.5&&Math.abs(angle)<.65?Math.min(1,d/16):0,vertical:clamp((target.y-current.y)*.6,-1,1)};
 };
}
