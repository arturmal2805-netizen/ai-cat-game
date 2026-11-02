import {ZOO_CLIP_FRAMES} from './zoo-behavior.js';
import {housingPlot} from './housing-data.js';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export const zooGuestActivity=(v,now,working=false)=>{
 const age=Math.max(0,(now-v.startedAt)/1000),cycle=age%144;
 if(working)return {kind:'wait',age,cycle,clip:null};
 return cycle<42?{kind:'play',age,cycle,clip:null}:cycle<91?{kind:'sleep',age,cycle,clip:'rest'}:{kind:'bath',age,cycle,clip:'swim'};
};
// Fixed furniture-safe aisle. Cats leave their own reserved bed seats, go around
// its front, and return on the same route; the guest occupies the central mat.
export function zooHostPlayFrame(visit,plot,now,record){
 if(visit.phase!=='relax')return null;
 const t=Math.max(0,(now-record.startedAt)/1000)%144;if(t>=42)return null;
 const p=housingPlot(plot),seat=visit.seat,index=visit.seatIndex,points=[seat,{x:seat.x,y:.78,z:p.z+2.2},{x:seat.x,y:.5,z:p.z+3.6},{x:p.x+(index?-1.05:-4.05),y:.5,z:p.z+3.6},{x:p.x+(index?-1.05:-4.05),y:.5,z:p.z+3.0}];
 const travel=t<10?t/10:t>32?(42-t)/10:1,at=travel*(points.length-1),i=Math.min(points.length-2,Math.floor(at)),u=smooth(at-i),a=points[i],b=points[i+1],playing=t>=10&&t<=32;
 return {position:{x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,z:a.z+(b.z-a.z)*u},walking:!playing,yaw:playing?(index?-1:1)*.7:Math.atan2(b.x-a.x,b.z-a.z),reaction:{headPitch:-.08,headRoll:playing?Math.sin(t*2+index)*.09:0,paw:playing?.5:0,tailSway:.25},playing};
}
export function zooGuestFrame(v,home,now,{working=false,slot=0,count=1,bathSlot=null}={}){
 const p=housingPlot(home.plot),activity=zooGuestActivity(v,now,working),t=activity.age,c=activity.cycle,
  bath=activity.kind==='bath'&&slot===(bathSlot??Math.floor(t/144)%count),
  kind=bath?'bath':activity.kind==='bath'?'wait':activity.kind,
  cols=Math.max(Math.ceil(Math.sqrt(count)),Math.ceil(count/3)),row=Math.floor(slot/cols),col=slot%cols,
  mat={x:p.x+(count===1?.8:(col-(cols-1)/2)*1.3),y:.5,z:p.z+(count===1?3:2.6+row*.45)},
  bed=count===1?{x:p.x-2.55,y:1.14,z:p.z+.65}:mat,
  tub={x:p.x+3.05,y:1.40,z:p.z+.65},
  rest={elephant:2,axolotl:2,otter:2,polar:4,gorilla:2},play={elephant:4,axolotl:3,otter:4,polar:3,gorilla:4},wet={elephant:3,axolotl:0,otter:1,polar:0,gorilla:3},species=v.animalId.slice(4,v.animalId.lastIndexOf('-')),
  sample=(type,at)=>{const clip=type==='sleep'?rest[species]:type==='bath'?wet[species]:play[species],u=type==='sleep'?.42+.015*Math.sin(at*.5):.15+(.5-.5*Math.cos(at*.65))*.70;return clip*ZOO_CLIP_FRAMES+u*(ZOO_CLIP_FRAMES-1);};
 let position={...mat},yaw=Math.PI/2,frame=sample(kind,t),baseFrame=frame,blend=1;
 const move=(a,b,w,lift=.6)=>({x:a.x+(b.x-a.x)*w,y:a.y+(b.y-a.y)*w+Math.sin(Math.PI*w)*lift,z:a.z+(b.z-a.z)*w});
 if(kind==='sleep'){const w=smooth((c-42)/8);position=move(mat,bed,w);yaw=(1-w)*Math.PI/2;if(c<46){baseFrame=sample('play',t);blend=smooth((c-42)/4);}}
 else if(kind==='bath'){
  const enter=smooth((c-91)/8),exit=smooth((c-136)/8);position=exit>0?move(tub,mat,exit):move(bed,tub,enter,.9);yaw=exit*Math.PI/2;
  if(c<95){baseFrame=sample('sleep',t);blend=smooth((c-91)/4);}
 }else if(!working&&c<4&&t>=144){baseFrame=sample(bath?'bath':'wait',t);blend=smooth(c/4);}
 return {kind,position,yaw,frame,baseFrame,blend,fit:count===1?1:Math.min(.34,.9/Math.sqrt(count)),age:t};
}
