import {MOSA_SEA,mosaBedY} from './mosasaur-data.js';
import {mosaTerrainObstacles} from './mosasaur-collision.js';
import {mosaReefClearance} from './mosasaur-reef-data.js';
import {mallPressureContact} from './mall-pressure.js';
import {pushCapsule} from './submarine-physics.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createOceanSwimmer(raw,{radius=.6,obstacles=mosaTerrainObstacles()}={}){
  const state={...raw,vertical:0};let jumping=false;
  function clear(p){
    if(Math.hypot(p.x/(MOSA_SEA.rx-2),p.z/(MOSA_SEA.rz-2))>1||p.y<mosaBedY(p.x,p.z)+.15)return false;
    const body={x:p.x,y:p.y+.7,z:p.z};
    if(mosaReefClearance(body.x,body.y,body.z)<radius||mallPressureContact(body.x,body.y,body.z,radius))return false;
    for(const obstacle of obstacles)if(pushCapsule({...body},obstacle,radius))return false;
    return true;
  }
  function step(dt,input={}){
    dt=clamp(dt,0,.1);state.yaw+=clamp(input.turn||0,-1,1)*1.3*dt;
    let f=clamp(input.forward||0,-1,1),side=clamp(input.strafe||0,-1,1),length=Math.max(1,Math.hypot(f,side));f/=length;side/=length;
    const heading=Number.isFinite(input.heading)?input.heading:state.yaw;
    const dx=(Math.sin(heading)*f+Math.cos(heading)*side)*12,dz=(Math.cos(heading)*f-Math.sin(heading)*side)*12;
    const n=Math.max(1,Math.ceil(dt*20/.18)),h=dt/n;
    for(let i=0;i<n;i++){
      if(state.y>MOSA_SEA.surfaceY+.2){state.vertical-=9.81*h;}
      else{state.vertical=(input.vertical||0)*8;if(input.jump&&!jumping&&state.y>MOSA_SEA.surfaceY-1){state.vertical=8;jumping=true;}if(!input.jump)jumping=false;}
      const next={...state,x:state.x+dx*h,z:state.z+dz*h,y:Math.min(60,state.y+state.vertical*h)};
      if(clear(next)){state.x=next.x;state.y=next.y;state.z=next.z;}
      else{
        for(const key of ['x','z','y']){const axis={...state,[key]:next[key]};if(clear(axis))state[key]=axis[key];else if(key==='y')state.vertical=0;}
      }
    }
    return state;
  }
  return {state,step,clear};
}
