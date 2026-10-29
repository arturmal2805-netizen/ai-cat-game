import {ZOO_LEGS} from './zoo-anatomy-data.js';
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);},pulse=(u,a,b)=>Math.sin(Math.PI*clamp((u-a)/(b-a)))**2;
// Runs only when baking the shared pose palette. Actual paws stay on a stable
// ground plane while the shoulder, elbow and hock articulate above them.
export function zooLegPose(species,time,role,root,body){
 if(!/^(Leg|Knee|Foot)/.test(role)||!ZOO_LEGS[species])return null;
 const data=ZOO_LEGS[species],u=((time%32)+32)%32/32,a=u*Math.PI*2,front=role.includes('Front'),left=role.includes('Left'),part=role.startsWith('Knee')?'knee':role.startsWith('Foot')?'foot':'upper';
 const blend=species==='otter'?1:species==='polar'?smooth((u-.1)/.12)*(1-smooth((u-.8)/.12)):0,
  back=species==='otter'?pulse(u,.35,.68):0,rest=species==='otter'?pulse(u,.78,1):0,
  swimUpper=(Math.sin(a*(species==='polar'?15:20)+(left?Math.PI:0)+(front?0:Math.PI))*(species==='polar'?.38:.3)*(front?1-back:1)-(front?.8:0)*back)*(1-rest),
  swimBend=(.15+Math.max(0,Math.sin(a*15))*.2)*(1-rest),swimRX=part==='upper'?swimUpper:part==='knee'?swimBend:-swimUpper-swimBend;
 if(blend>=.999999)return {rx:swimRX};
 const yHip=data.hip+(front?.08:-.06),zHip=front?data.front:data.rear,yKnee=data.hip*.48,zKnee=zHip+(front?.02:species==='elephant'?-.02:-.22),yFoot=data.foot*.53,zFoot=zHip+(front?.09:species==='elephant'?.08:.03)+data.foot*.53,
  dy1=yKnee-yHip,dz1=zKnee-zHip,dy2=yFoot-yKnee,dz2=zFoot-zKnee,L1=Math.hypot(dy1,dz1),L2=Math.hypot(dy2,dz2),rest1=Math.atan2(dz1,-dy1),rest2=Math.atan2(dz2,-dy2),
  walk=species==='elephant'?pulse(u,0,.4):species==='tiger'?pulse(u,0,.2):0,
  phase=a*(species==='elephant'?18:15)+(left?Math.PI:0)+(front?0:species==='elephant'?Math.PI*.6:Math.PI),
  stride=(species==='elephant'?.16:.23)*Math.cos(phase)*walk,lift=(species==='elephant'?.1:.16)*Math.max(0,Math.sin(phase))**2*walk;
 let targetY=yFoot+lift-root.y-body.y,targetZ=zFoot+stride;
 if(species==='tiger'){
  const stretch=pulse(u,.2,.42),lie=pulse(u,.45,.7);targetZ+=stretch*(front?.24:-.08)+lie*(front?.16:.03);
  if(front&&!left){const groom=pulse(u,.35,.48);targetY+=groom*.87;targetZ+=groom*.25;}
  if(front&&left){const play=pulse(u,.72,.97)*Math.max(0,Math.sin(a*8));targetY+=play*.23;targetZ+=play*.12;}
 }
 const dy=targetY-yHip,dz=targetZ-zHip,D=Math.min(L1+L2-.0001,Math.max(Math.abs(L1-L2)+.0001,Math.hypot(dy,dz))),phi=Math.atan2(dz,-dy),acos=x=>Math.acos(Math.max(-1,Math.min(1,x))),
  angle1=phi-acos((L1*L1+D*D-L2*L2)/(2*L1*D)),angle2=phi+acos((L2*L2+D*D-L1*L1)/(2*L2*D)),upper=rest1-angle1,knee=rest2-upper-angle2;
 const groundRX=part==='upper'?upper:part==='knee'?knee:-upper-knee;return {rx:groundRX*(1-blend)+swimRX*blend};
}
