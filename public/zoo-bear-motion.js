import {ZOO_LEGS} from './zoo-anatomy-data.js';
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);},envelope=u=>smooth(u/.12)*smooth((1-u)/.12),pulse=u=>Math.sin(Math.PI*clamp(u))**2;
const walkZ=u=>-1.15+.42*pulse(u)*envelope(u);
// Offline two-bone solve, using the exact rest landmarks from the model. The
// sole stays level while the wrist and elbow absorb body weight/movement.
function foot(role,targetY,targetZ){
 const d=ZOO_LEGS.polar,front=role.includes('Front'),part=role.startsWith('Knee')?'knee':role.startsWith('Foot')?'foot':'upper',
  yh=d.hip+(front?.08:-.06),zh=front?d.front:d.rear,yk=d.hip*.48,zk=zh+(front?.02:-.22),yf=d.foot*.53,zf=zh+(front?.09:.03)+d.foot*.53,
  a=Math.hypot(yk-yh,zk-zh),b=Math.hypot(yf-yk,zf-zk),r1=Math.atan2(zk-zh,yh-yk),r2=Math.atan2(zf-zk,yk-yf),dy=targetY-yh,dz=targetZ-zh,
  length=Math.min(a+b-.0001,Math.max(Math.abs(a-b)+.0001,Math.hypot(dy,dz))),phi=Math.atan2(dz,-dy),acos=x=>Math.acos(Math.max(-1,Math.min(1,x))),
  upper=r1-phi+acos((a*a+length*length-b*b)/(2*a*length)),knee=r2-upper-phi-acos((b*b+length*length-a*a)/(2*b*length));
 return {rx:part==='upper'?upper:part==='knee'?knee:-upper-knee};
}
export function zooBearClipPose(name,u,role){
 if(!['shore-walk','snow-play','rest'].includes(name))return null;
 const w=envelope(u),rest=pulse(u)*w,tap=pulse((u-.12)/.68)*w,
  rootY=name==='rest'?-.52*rest:0,rootZ=name==='shore-walk'?walkZ(u):-1.15,
  bodyY=name==='shore-walk'?.015*Math.sin(u*Math.PI*8)*w:name==='rest'?.009*Math.sin(u*Math.PI*12)*w:-.025*tap;
 if(role==='root')return {y:rootY,z:rootZ};
 if(role==='body')return {y:bodyY};
 if(role==='head')return {rx:name==='snow-play'?.18*tap:.12*rest,ry:Math.sin(u*Math.PI*2)*(name==='rest'?.07:.13)*w};
 if(role.startsWith('eye')&&name==='rest')return {sy:1-rest*.8};
 if(role.startsWith('lid')&&name==='rest'){const s=.001+rest*.92;return {sx:s,sy:s,sz:s};}
 if(role==='toy'){
  const s=name==='snow-play'?.001+rest*.999:.001;
  return {x:name==='snow-play'?.12*Math.sin(u*Math.PI*2)*tap:0,z:name==='snow-play'?.38*tap:0,y:name==='snow-play'?.04*Math.abs(Math.sin(u*Math.PI*4))*tap:0,sx:s,sy:s,sz:s};
 }
 if(!/^(Leg|Knee|Foot)/.test(role))return null;
 const d=ZOO_LEGS.polar,front=role.includes('Front'),left=role.includes('Left'),yf=d.foot*.53,zf=(front?d.front:d.rear)+(front?.09:.03)+d.foot*.53;
 let y=yf-rootY-bodyY,z=zf;
 if(name==='shore-walk'){
  const omega=Math.PI*8,phase=omega*u+(front?(left?0:Math.PI):left?Math.PI*.55:Math.PI*1.55),q=((phase%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
  if(q>=Math.PI){const strike=u-(q-Math.PI)/omega;z+=(walkZ(strike)-rootZ)*w;}
  else {const previous=u-(q+Math.PI)/omega,next=u+(Math.PI-q)/omega,t=smooth(q/Math.PI);z+=(walkZ(previous)*(1-t)+walkZ(next)*t-rootZ)*w;y+=.105*Math.sin(q)**2*w;}
 }else if(name==='snow-play'&&front&&!left){y+=.23*tap;z+=.28*tap;}
 else if(name==='rest')z+=rest*(front?.2:.18);
 return foot(role,y,z);
}
