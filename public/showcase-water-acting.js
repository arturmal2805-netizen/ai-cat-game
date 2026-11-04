import * as T from 'three';
import {sampleRideActing,rideActingFrame} from './ride-acting.js';
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{const u=clamp(x);return u*u*(3-2*u);};
const beat=(u,at,width)=>1-smooth(Math.abs(u-at)/width);
const wetPhases=new Set(['rafting','drop','boost','skim','surf','float','carousel','swing','unload']);
export const SHOWCASE_POSE_KEYS=['weight','speed','height','turnForce','crouch','paw','pawSpread','grip','frontLift','hindTuck','headPitch','headRoll','headYaw','bodyLean','bodyPitch','earRelax','tailSway','tailTrail','eyeClose','surprise','rideSit','waterSurf','waterProne','waterPawLift'];
export function sampleShowcaseActing(lane,duration,spec,route,passenger=0){
 const direction=new T.Vector3(),q=new T.Quaternion();
 const profile=sampleRideActing(t=>{
  const f=lane.frame(t),phase=wetPhases.has(f.phase)?'ride':f.phase==='hold'?'anticipation':f.phase;
  direction.set(0,0,1).applyQuaternion(q.fromArray(f.quaternion||[0,0,0,1]));
  return {...f,phase,yaw:Math.atan2(direction.x,direction.z)};
 },duration,lane.impacts);
 // Author once from measured motion. A playing cat only interpolates this
 // fixed table: no second route evaluation, phase search or trigonometry.
 if(spec&&route){
  const rows=new Float32Array((profile.count+1)*SHOWCASE_POSE_KEYS.length);
  for(let i=0;i<=profile.count;i++){
   const t=i/profile.count*duration,out=showcaseRideReaction(spec,route,t,rideActingFrame(profile,t),false,passenger);
   SHOWCASE_POSE_KEYS.forEach((key,j)=>{rows[i*SHOWCASE_POSE_KEYS.length+j]=out[key]||0;});
  }
  profile.poseRows=rows;
 }
 return profile;
}
export function showcaseActingFrame(profile,time,reduced=false,out={}){
 const sample=clamp((Number.isFinite(time)?time:0)/profile.duration)*profile.count,i=Math.min(profile.count-1,Math.floor(sample)),u=sample-i,stride=SHOWCASE_POSE_KEYS.length;
 out.ride=true;
 for(let j=0;j<stride;j++){
  const key=SHOWCASE_POSE_KEYS[j];
  out[key]=reduced&&!['speed','height','turnForce'].includes(key)?0:profile.poseRows[i*stride+j]*(1-u)+profile.poseRows[(i+1)*stride+j]*u;
 }
 return out;
}
export function showcaseRideReaction(spec,route,time,out,reduced,passenger=0){
 out.rideSit=0;out.waterSurf=0;out.waterProne=0;out.waterPawLift=0;if(reduced)return out;
 const f=route.vehicleFrame(time),weight=out.weight||0,t=time-route.rideStart;
 if(f.walking||['board','climb','exit','done'].includes(f.phase))return out;
 const leg=route.legs.find(l=>time>=l.start&&time<=l.start+l.duration)||route.legs[0],u=clamp((time-leg.start)/leg.duration),gate=smooth(u/.09)*(1-smooth((u-.88)/.12)),w=weight*gate;
 const pulse=Math.sin(t*3.4),edge=smooth(Math.min(Math.max(0,t),route.duration-time)/.6),seat=f.seatBlend||0,side=passenger%2?1:-1,shift=(passenger-1.5)*.018,turn=Math.max(-1,Math.min(1,out.turnForce||0)),fast=clamp(out.speed/28);
 out.rideSit=['surf-halfpipe','barrel-wave'].includes(spec.kind)?0:seat;
 switch(spec.kind){
 case 'barrel-wave':out.waterProne=f.phase==='ride'?weight*edge*gate*seat:0;out.crouch+=w*.13;out.grip+=w*.65;out.headPitch-=w*.13;out.paw+=f.phase==='splash'?w*.85:0;out.tailSway+=pulse*w*.17;break;
 case 'canyon-rafting':out.crouch+=w*.13*(.5+.5*pulse);out.grip+=w*.65;out.tailSway+=pulse*w*.23;out.headYaw+=w*Math.sin(t*1.7)*.26;out.paw+=f.phase==='splash'?w*.6:0;break;
 case 'glass-drop':out.surprise+=f.phase==='hold'?w*.95:0;out.headPitch+=f.phase==='hold'?w*.2:0;out.paw+=f.phase==='drop'?w*.75:0;out.eyeClose+=f.phase==='splash'?w*.85:0;out.hindTuck+=f.phase==='drop'?w*.25:0;break;
 case 'lagoon-launch':out.paw+=f.phase==='flight'?w:0;out.frontLift+=f.phase==='flight'?w*.55:0;out.grip+=f.phase==='boost'?w*.8:0;out.tailSway+=f.phase==='flight'?Math.sin(t*9)*w*.23:0;break;
 case 'surf-halfpipe':out.waterSurf=f.phase==='surf'?weight*edge*gate*seat:0;out.bodyLean+=pulse*w*.22;out.pawSpread+=w*.55;out.headYaw+=w*Math.sin(t*1.4)*.3;out.crouch+=w*(.08+.08*Math.cos(t*2));out.surprise+=w*clamp(out.height/22)*.6;break;
 case 'lazy-river':out.earRelax-=w*.16;out.tailSway+=Math.sin(t*1.7)*w*.2;out.headYaw+=Math.sin(t*.85)*w*.27;out.grip+=w*.3;out.paw+=Math.max(0,Math.sin(t*1.4))*w*.25;break;
 case 'fountain-carousel':out.paw+=w*(.35+.4*Math.max(0,pulse));out.headRoll+=pulse*w*.12;out.tailSway+=w*.3;out.pawSpread+=w*.25;break;
 case 'pool-pendulum':out.grip+=w*.75;out.surprise+=w*clamp((f.position[1]-3)/30)*.9;out.hindTuck+=w*.24;out.frontLift+=w*clamp((f.position[1]-20)/20)*.2;break;
 }
 // Readable multi-beat performances, anchored to each real activity phase.
 // Neighbours share the boat clock but look/wave at different moments.
 if(['anticipation','hold'].includes(f.phase)){
  const peek=beat(u,.33+shift,.28),greet=beat(u,.72-shift,.22);
  out.headPitch+=w*peek*.32;out.headYaw+=w*side*greet*.38;
  out.paw+=w*greet*.65;out.earRelax+=w*greet*.12;
 }
 switch(spec.kind){
 case 'barrel-wave':if(f.phase==='ride'){
  const duck=beat(u,.47,.27),clear=beat(u,.83,.16);
  out.crouch+=w*duck*.075;out.headPitch+=w*duck*.18;
  out.eyeClose+=w*duck*.32;out.headYaw+=w*Math.sin(u*Math.PI*2)*.28;
  out.paw+=w*clear*.85;out.pawSpread+=w*clear*.22;out.tailSway+=w*clear*Math.sin(t*8)*.2;
 }break;
 case 'canyon-rafting':if(f.phase==='rafting'){
  const brace=Math.max(...[.16,.37,.61,.82].map(at=>beat(u,at,.075))),wave=beat(u,.49+shift,.12)+beat(u,.91-shift,.07),friend=beat(u,.28+shift,.12)+beat(u,.7-shift,.10);
  out.crouch+=w*brace*.07;out.grip+=w*brace*.3;out.paw+=w*wave*.85;
  out.bodyLean-=w*turn*.12;out.bodyPitch+=w*brace*.045;
  out.headYaw+=w*(side*friend*.42-turn*.2);out.headRoll-=w*turn*.12;
  out.surprise+=w*brace*.4;out.pawSpread+=w*wave*.22;
 }break;
 case 'glass-drop':
  if(f.phase==='hold'){out.headPitch+=w*beat(u,.45,.38)*.4;out.headYaw+=w*side*beat(u,.8,.16)*.32;out.grip+=w*.4;}
  if(f.phase==='drop'){const release=beat(u,.45+shift,.4);out.paw+=w*release*.55;out.frontLift+=w*release*.3;out.headPitch-=w*release*.2;out.headYaw+=w*side*beat(u,.72+shift,.2)*.22;out.earRelax-=w*release*.18;out.surprise+=w*.8;}
  break;
 case 'lagoon-launch':
  if(f.phase==='boost'){out.crouch+=w*.07;out.bodyPitch+=w*.07;out.headPitch+=w*.16;}
  if(f.phase==='flight'){const float=beat(u,.48+shift,.33),landing=smooth((u-.68)/.25);out.headYaw+=w*side*float*.45;out.headRoll+=w*Math.sin(u*Math.PI*3)*.15;out.pawSpread+=w*float*.3;out.headPitch+=w*landing*.3;out.hindTuck+=w*float*.13;}
  if(f.phase==='skim'){out.paw+=w*beat(u,.62+shift,.3)*.75;out.tailSway+=w*Math.sin(t*8)*.22;}
  break;
 case 'surf-halfpipe':if(f.phase==='surf'){
  const crest=clamp((f.position[1]-8)/18),bottom=1-crest,trick=beat(u,.25,.1)+beat(u,.59,.09)+beat(u,.84,.08);
  out.bodyLean+=w*turn*.12;out.crouch+=w*bottom*.065;
  out.paw+=w*crest*.75;out.frontLift+=w*trick*.24;
  out.headRoll-=w*turn*.13;out.headPitch-=w*crest*.12;out.tailSway+=w*Math.sin(t*7)*trick*.24;
 }break;
 case 'lazy-river':if(f.phase==='float'){
  const paddle=beat(u,.27,.1)+beat(u,.65,.11),look=beat(u,.13,.11)-beat(u,.52,.13),wave=beat(u,.86,.1);
  out.paw+=w*(paddle*.48+wave*.8);out.frontLift+=w*paddle*.13;
  out.headYaw+=w*look*.42;out.bodyLean-=w*turn*.11;out.headRoll+=w*wave*.14;
  out.eyeClose+=w*beat(u,.4,.09)*.24;out.surprise+=w*Math.abs(turn)*.25;
 }break;
 case 'fountain-carousel':if(f.phase==='carousel'){
  const wave=beat(u,.18+passenger*.025,.1)+beat(u,.72-passenger*.025,.12),friend=beat(u,.44+shift,.16);
  out.paw+=w*wave*.6;out.headYaw+=w*side*friend*.48;
  out.bodyLean-=w*turn*.12;out.headRoll+=w*wave*side*.13;out.pawSpread+=w*wave*.17;
 }break;
 case 'pool-pendulum':if(f.phase==='swing'){
  const crest=clamp((f.position[1]-16)/22),cheer=crest*(.65+.35*beat(u,.5+shift,.4));
  out.grip*=1-cheer*.42;out.paw+=w*cheer*.95;out.pawSpread+=w*cheer*.2;
  out.headYaw+=w*side*cheer*.32;out.headPitch+=w*(fast*.17-crest*.2);out.tailSway+=w*cheer*Math.sin(t*7)*.2;
 }break;
 }
 if(f.phase==='splash'){
  const shake=beat(u,.32,.25),happy=beat(u,.73+shift,.23);
  out.headRoll+=w*shake*Math.sin(u*23)*.22;out.headYaw+=w*shake*Math.sin(u*19)*.2;
  out.eyeClose+=w*shake*.7;out.earRelax+=w*happy*.18;
  out.paw+=w*happy*.8;out.tailSway+=w*happy*Math.sin(u*18)*.3;
 }
 for(const key of ['grip','paw','surprise','eyeClose'])out[key]=clamp(out[key]);
 out.crouch=Math.min(.285,Math.max(0,out.crouch));
 out.waterPawLift=f.phase==='splash'?out.crouch*.3:0;
 return out;
}
