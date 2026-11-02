import * as T from 'three';
import {sampleRideActing} from './ride-acting.js';
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{const u=clamp(x);return u*u*(3-2*u);};
const wetPhases=new Set(['rafting','drop','boost','skim','surf','float','carousel','swing','unload']);
export function sampleShowcaseActing(lane,duration){
 const direction=new T.Vector3(),q=new T.Quaternion();
 return sampleRideActing(t=>{
  const f=lane.frame(t),phase=wetPhases.has(f.phase)?'ride':f.phase==='hold'?'anticipation':f.phase;
  direction.set(0,0,1).applyQuaternion(q.fromArray(f.quaternion||[0,0,0,1]));
  return {...f,phase,yaw:Math.atan2(direction.x,direction.z)};
 },duration,lane.impacts);
}
export function showcaseRideReaction(spec,route,time,out,reduced){
 out.rideSit=0;out.waterSurf=0;out.waterProne=0;if(reduced)return out;
 const f=route.vehicleFrame(time),weight=out.weight||0,t=time-route.rideStart;
 if(f.walking||['board','climb','exit','done'].includes(f.phase))return out;
 const leg=route.legs.find(l=>time>=l.start&&time<=l.start+l.duration)||route.legs[0],u=clamp((time-leg.start)/leg.duration),gate=smooth(u/.09)*(1-smooth((u-.88)/.12)),w=weight*gate;
 const pulse=Math.sin(t*3.4),edge=smooth(Math.min(Math.max(0,t),route.duration-time)/.6),seat=f.seatBlend||0;out.rideSit=['surf-halfpipe','barrel-wave'].includes(spec.kind)?0:seat;
 switch(spec.kind){
 case 'barrel-wave':out.waterProne=f.phase==='ride'?weight*edge*gate*seat:0;out.crouch+=w*.13;out.grip+=w*.65;out.headPitch-=w*.13;out.paw+=f.phase==='splash'?w*.85:0;out.tailSway+=pulse*w*.17;break;
 case 'jungle-coaster':out.headRoll+=pulse*w*.09;out.grip+=f.phase==='lift'?w*.2:w*.55;out.surprise+=f.phase==='hold'?w*.8:0;out.pawSpread+=w*.18;break;
 case 'crystal-vortex':out.bodyLean+=Math.sin(t*.8)*w*.2;out.headYaw+=w*.27;out.grip+=w*.5;out.surprise+=f.phase==='drop'?w*.7:0;break;
 case 'canyon-rafting':out.crouch+=w*.13*(.5+.5*pulse);out.grip+=w*.65;out.tailSway+=pulse*w*.23;out.headYaw+=w*Math.sin(t*1.7)*.26;out.paw+=f.phase==='splash'?w*.6:0;break;
 case 'glass-drop':out.surprise+=f.phase==='hold'?w*.95:0;out.headPitch+=f.phase==='hold'?w*.2:0;out.paw+=f.phase==='drop'?w*.75:0;out.eyeClose+=f.phase==='splash'?w*.85:0;out.hindTuck+=f.phase==='drop'?w*.25:0;break;
 case 'lagoon-launch':out.paw+=f.phase==='flight'?w:0;out.frontLift+=f.phase==='flight'?w*.55:0;out.grip+=f.phase==='boost'?w*.8:0;out.tailSway+=f.phase==='flight'?Math.sin(t*9)*w*.23:0;break;
 case 'surf-halfpipe':out.waterSurf=f.phase==='surf'?weight*edge*gate*seat:0;out.bodyLean+=pulse*w*.22;out.pawSpread+=w*.55;out.headYaw+=w*Math.sin(t*1.4)*.3;out.crouch+=w*(.08+.08*Math.cos(t*2));out.surprise+=w*clamp(out.height/22)*.6;break;
 case 'lazy-river':out.earRelax-=w*.16;out.tailSway+=Math.sin(t*1.7)*w*.2;out.headYaw+=Math.sin(t*.85)*w*.27;out.grip+=w*.3;out.paw+=Math.max(0,Math.sin(t*1.4))*w*.25;break;
 case 'fountain-carousel':out.paw+=w*(.35+.4*Math.max(0,pulse));out.headRoll+=pulse*w*.12;out.tailSway+=w*.3;out.pawSpread+=w*.25;break;
 case 'pool-pendulum':out.grip+=w*.75;out.surprise+=w*clamp((f.position[1]-3)/30)*.9;out.hindTuck+=w*.24;out.frontLift+=w*clamp((f.position[1]-20)/20)*.2;break;
 }
 for(const key of ['grip','paw','surprise','eyeClose'])out[key]=clamp(out[key]);
 out.crouch=Math.min(.285,Math.max(0,out.crouch));
 return out;
}
