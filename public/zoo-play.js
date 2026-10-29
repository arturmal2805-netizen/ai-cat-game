import * as T from 'three';
import {zooFacing} from './zoo-data.js';
import {zooJointPoint,zooLocalJointPoint} from './zoo-animals.js';
import {gorillaPickupPose,GORILLA_WALK_FIRST as WALK,GORILLA_HOLD_FIRST as HOLD} from './zoo-play-poses.js';
import {carriedCatSize} from './bikini-carry.js';
export const ZOO_PLAY_SECONDS=31;
export const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const lerp=(a,b,w)=>a+(b-a)*w,angle=(a,b,w)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*w;
export function zooJump(t,height){const duration=2*Math.sqrt(2*height/9.81);return t>0&&t<duration?Math.sqrt(2*9.81*height)*t-4.905*t*t:0;}
// Single bounded performance, owned by the native reserved public visitor seat.
// Its clock is simulation time, so a modal pause cannot detach the cat.
export function createGorillaPlay(mesh,exhibit,visit,model){
 const actor=mesh.userData.actors[0],anchor=actor.anchor,yaw=zooFacing(exhibit),forward={x:Math.sin(yaw),z:Math.cos(yaw)},target={x:forward.x*(exhibit.radius+.55),z:forward.z*(exhibit.radius+.55)},clock=()=>mesh.userData.uniforms.uZooTime.value;
 const root=zooJointPoint(mesh,'root',0,clock(),new T.Vector3()),origin={x:root.x,z:root.z,y:root.y},size=carriedCatSize(model),body=model.userData.body,scale=model.scale.x;
 size.bodyY=body.position.y*scale;size.bodyH=body.scale.y*scale;size.bodyD=body.scale.z*scale;
 const seat={...visit.seat},startYaw=visit.yaw,palmL=new T.Vector3(-1.12,.4,.56),palmR=new T.Vector3(1.12,.4,.56),raw=new T.Vector3(),shoulder=new T.Vector3(),left=new T.Vector3(),right=new T.Vector3();
 let finished=false;
 function frame(t,reduced=false){
  if(finished)return {phase:'goodbye',position:{...seat},yaw:startYaw,carry:0,active:t<ZOO_PLAY_SECONDS,photo:t>27&&t<30,done:t>=ZOO_PLAY_SECONDS};
  let phase,frame=0,x=origin.x,z=origin.z,y=0,turn=0,mix=1,pick=0,weight=0;
  if(t<2.8){phase='surprise';mix=smooth(t/.42);y=origin.y*(1-smooth(t/1.2));if(!reduced)y+=zooJump(t-.65,.35)+zooJump(t-1.5,.58);frame=Math.min(79,t/2.8*79);}
  else if(t<7.6){phase='approach';const q=(t-2.8)/4.8,w=smooth(q);x=lerp(origin.x,target.x,w);z=lerp(origin.z,target.z,w);turn=angle(0,Math.atan2(target.x-origin.x,target.z-origin.z),smooth(q/.18));turn=angle(turn,yaw,smooth((q-.8)/.2));frame=WALK+((t-2.8)%1.6)/1.6*47;}
  else if(t<10.8){phase='pickup';pick=(t-7.6)/3.2;weight=smooth((pick-.65)/.35);frame=HOLD+.3*pick*47;x=target.x;z=target.z;turn=yaw;}
  else if(t<18){phase='carry';pick=weight=1;frame=HOLD+.5*47;x=target.x;z=target.z;turn=yaw;if(!reduced)y=zooJump(t-11.6,.48)+zooJump(t-13.5,.82)+zooJump(t-15.6,.58);}
  else if(t<21.2){phase='putdown';pick=1-(t-18)/3.2;weight=smooth((pick-.65)/.35);frame=HOLD+(.7+.3*(1-pick))*47;x=target.x;z=target.z;turn=yaw;}
  else if(t<26){phase='return';const q=(t-21.2)/4.8,w=smooth(q);x=lerp(target.x,anchor[0],w);z=lerp(target.z,anchor[2],w);const back=Math.atan2(anchor[0]-target.x,anchor[2]-target.z);turn=angle(yaw,back,smooth(q/.18));turn=angle(turn,0,smooth((q-.82)/.18));frame=WALK+((t-21.2)%1.6)/1.6*47;}
  else {phase='goodbye';x=anchor[0];z=anchor[2];frame=0;}
  const reach=gorillaPickupPose(pick).reach;x+=forward.x*reach;z+=forward.z*reach;
  const play={frame,mix,x:(x-anchor[0])*mix,y:y*mix,z:(z-anchor[2])*mix,yaw:turn,grip:0};mesh.userData.setActorPlay(0,play);
  if(pick>0){
   zooLocalJointPoint(mesh,'ElbowRight',0,clock(),raw,palmR);zooLocalJointPoint(mesh,'ArmRight',0,clock(),shoulder);
   const dx=raw.x-shoulder.x,dz=raw.z-shoulder.z,r=Math.hypot(dx,dz),wanted=Math.min(size.bodyD*.45,1.05)-shoulder.x;
   play.grip=Math.max(0,Math.min(1.55,Math.atan2(dx,dz)-Math.asin(Math.max(-1,Math.min(1,wanted/r)))))*smooth(pick/.55);
   mesh.userData.setActorPlay(0,play);
  }
  let position={...seat},catYaw=startYaw;
  if(weight>0){
   zooJointPoint(mesh,'ElbowLeft',0,clock(),left,palmL);zooJointPoint(mesh,'ElbowRight',0,clock(),right,palmR);
   const hand=left.clone().add(right).multiplyScalar(.5),relativeX=hand.x-x,relativeZ=hand.z-z,front=relativeX*forward.x+relativeZ*forward.z,
    chest=.75+.4*Math.sin(gorillaPickupPose(pick).bodyPitch),center=Math.max(front+.04,chest+size.width+.08),offset=center-front,
    across=left.distanceTo(right)/2,sy=Math.min(.95,across/size.bodyD),sz=Math.min(.95,offset/size.width),belly=size.bodyY-size.bodyH*Math.sqrt(Math.max(.08,1-sy*sy-sz*sz)),
    lift=Math.max(0,hand.y-belly),landY=seat.y;
   position={x:lerp(seat.x,exhibit.x+x+forward.x*center,weight),z:lerp(seat.z,exhibit.z+z+forward.z*center,weight),y:landY+lift*weight};catYaw=angle(startYaw,yaw+Math.PI/2,weight);
  }
  if(t>=26.5&&!finished){mesh.userData.restartActor(0,clock());finished=true;}
  return {phase,position,yaw:catYaw,carry:weight,active:t<ZOO_PLAY_SECONDS,photo:t>27&&t<30,done:t>=ZOO_PLAY_SECONDS,handLeft:left.clone(),handRight:right.clone(),jump:y,play};
 }
 return {frame,cancel(){if(finished)return;mesh.userData.restartActor(0,clock());finished=true;},visit,seat};
}
