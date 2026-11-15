import {MALL_AIRLOCK as AIRLOCK} from './mall-airlock-data.js';
import {MALL_LAYOUT as L} from './mall-layout.js';
import {mallWalkable} from './mall-navigation.js';

export function stepMallWalker(state,dt,input,obstacles,radius=.6,actors=[]){
  const speed=5,forward=input.forward||0,side=input.strafe||0,length=Math.max(1,Math.hypot(forward,side));
  const heading=Number.isFinite(input.heading)?input.heading:state.yaw;
  const dx=(Math.sin(heading)*forward+Math.cos(heading)*side)*speed/length,dz=(Math.cos(heading)*forward-Math.sin(heading)*side)*speed/length;
  const count=Math.max(1,Math.ceil(Math.min(dt,.1)*speed/.15)),h=Math.min(dt,.1)/count;
  function surface(p){
    // Ordinary walking cannot cross a closed pressure door or side pane.
    // Only the sequential transit owns movement through this chamber.
    if(state.floor===1&&Math.abs(p.x-AIRLOCK.x)<AIRLOCK.w/2+radius&&p.z>AIRLOCK.z-AIRLOCK.d/2-radius&&p.z<AIRLOCK.z+AIRLOCK.d/2+radius)return null;
    for(let floor=1;floor<7;floor++)if(Math.abs(Math.abs(p.x)-18.4)<1.18&&p.z>=L.z-13.7&&p.z<=L.z+13.7){
      const y=L.y+(floor-1)*L.rise+.18+Math.max(0,Math.min(1,(p.z-(L.z-13.5))/27))*L.rise;
      if(Math.abs(state.y-y)<(state.jumpVelocity?2:.7))return {y,floor:p.z>L.z+13.2?floor+1:floor,ramp:true};
    }
    const floor=state.floor,y=L.y+(floor-1)*L.rise+.18,boxes=obstacles.get(floor);
    if(!boxes||!mallWalkable({x:p.x,z:p.z-L.z},radius,boxes))return null;
    return {y,floor,ramp:false};
  }
  let moved=false;
  for(let i=0;i<count;i++)for(const key of ['x','z']){
    const p={...state,[key]:state[key]+(key==='x'?dx:dz)*h},support=surface(p);
    if(!support||actors.some(a=>a.id!=='chichi'&&Math.abs(a.y-p.y)<2&&Math.hypot(a.x-p.x,a.z-p.z)<radius+a.radius+.1))continue;
    if(Math.abs(support.y-state.y)>1.2&&!state.jumpVelocity)continue;
    state[key]=p[key];state.floor=support.floor;state.groundY=support.y;if(!state.jumpVelocity)state.y=support.y;moved||=dx!==0||dz!==0;
  }
  if(input.jump&&!state.jumpHeld&&!state.jumpVelocity)state.jumpVelocity=4.2;
  state.jumpHeld=!!input.jump;
  if(state.jumpVelocity){state.jumpVelocity-=9.81*Math.min(dt,.1);state.y+=state.jumpVelocity*Math.min(dt,.1);if(state.y<=(state.groundY??L.y+(state.floor-1)*L.rise+.18)){state.y=state.groundY??L.y+(state.floor-1)*L.rise+.18;state.jumpVelocity=0;}}
  return moved;
}
