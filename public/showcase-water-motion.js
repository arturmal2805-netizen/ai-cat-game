import * as T from 'three';
import {runData} from './reference-slide-motion.js';
import {smoothWaterFrames} from './water-route-smoothing.js';
import {runSceneSteps} from './scene-tasks.js';
const cache=new Map(),TAU=Math.PI*2,smooth=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);},V=p=>new T.Vector3(...p),lerp=(a,b,u)=>a.map((v,i)=>v+(b[i]-v)*u);
const spiral=(top,low,r,turns,cx=0,cz=-8)=>Array.from({length:145},(_,i)=>{const u=i/144,a=u*TAU*turns+.3;return[cx+Math.sin(a)*r,top+(low-top)*u,cz+Math.cos(a)*r];});
const loop=(x,y,z,r,drift=12)=>Array.from({length:97},(_,i)=>{const a=i/96*TAU;return[x+Math.sin(a)*r,y-Math.cos(a)*r,z+drift*i/96];});
export function showcaseRecipe(spec){
 const h=spec.height,r=spec.radius,parts=[],bowl=[],pool=[...spec.pool],end=[pool[0],spec.surfaceY+r-.15,pool[1]],path=(points,options={})=>parts.push({points,...options});
 switch(spec.kind){
 case 'barrel-wave':path([[-30,h-5,-31],[-30,h-5,-27],[-10,57,-22],...Array.from({length:121},(_,i)=>{const u=i/120,a=Math.PI*1.02*(1-u);return[-Math.sin(a)*23,31-Math.cos(a)*23,-15+u*6];}),[-15,8,4],[12,6.2,18],end],{barrel:true});break;
 case 'jungle-coaster':path([[-34,h,-34],[-34,h,-28],[-29,48,-22],[-18,17,-17],...loop(4,37,-14,22,15),[29,13,10],[13,9,23],end],{loop:true,keepInversion:true,loops:[[4,100]]});break;
 case 'crystal-vortex':{
  const b={x:0,z:-8,radius:32,base:15,depth:20,hole:8};bowl.push(b);
  const p=Array.from({length:241},(_,i)=>{const u=i/240,a=-Math.PI/2+u*TAU*2.6,rad=30-22*u,normal=new T.Vector3(-Math.cos(a)*.9,1,-Math.sin(a)*.9).normalize();return new T.Vector3(b.x+Math.cos(a)*rad,b.base+b.depth*(rad/b.radius)**1.7,b.z+Math.sin(a)*rad).addScaledVector(normal,r+.5).toArray();});
  path([[-36,h,-40],[-36,h,-35],[-28,48,-32],p[0]]);path(p,{bowl:b});path([p.at(-1),[0,24,-8],[0,18,-8],[0,9,-8],[9,8,14],end]);break;
 }
 case 'canyon-rafting':path([[-30,h,-38],[-30,h,-33],[-21,36,-24],[20,29,-15],[24,25,-6],[-19,19,5],[-25,14,14],[14,9,24],end],{rapids:true});break;
 case 'glass-drop':path([[9,h,-10],[9,h,-7],[9,h-6,-5],[9,22,-5],[9,8,4],[6,7,20],end],{drop:true});break;
 case 'lagoon-launch':path([[-8,10,-40],[-8,10,-35],[-8,8,-29],[-8,7,-21],[0,9,-14]],{launch:true});path([[0,7,27],end],{landing:true});break;
 case 'surf-halfpipe':{
  const p=Array.from({length:145},(_,i)=>{const a=-1.35+i/144*2.7;return[Math.sin(a)*34,(spec.radius+spec.surfaceY-.15)+34*(1-Math.cos(a)),-1];});path(p,{surf:true});break;
 }
 case 'lazy-river':path(Array.from({length:181},(_,i)=>{const a=i/180*TAU;return[Math.sin(a)*(33+Math.sin(a*3)*3),8+Math.sin(a*2)*1.2,-3+Math.cos(a)*(27+Math.sin(a*2)*2)];}),{river:true,closed:true});break;
 case 'fountain-carousel':path(Array.from({length:145},(_,i)=>{const a=i/144*TAU;return[Math.sin(a)*16,5.3,Math.cos(a)*16];}),{carousel:true,closed:true});pool.splice(0,4,0,0,25,25);break;
 case 'pool-pendulum':pool.splice(0,4,0,0,26,23);break;
 default:throw Error('Unknown water installation '+spec.kind);
 }
 return {parts,bowls:bowl,pool};
}
function seatOffset(spec,i){
 if(spec.kind==='fountain-carousel')return[0,0,0];
 return spec.seats===4?[(i%2?1:-1)*2.65,0,(i<2?-1:1)*2.2]:spec.seats===2?[(i?1:-1)*1.9,0,0]:[0,0,0];
}
export function* showcaseRouteSteps(spec){
 if(cache.has(spec.id))return cache.get(spec.id);
 const authored=showcaseRecipe(spec),geometry=[],legs=[],impacts=[],flights=[],r=spec.radius,entry=[-46,.16,10];let clock=0;
 for(const part of authored.parts){yield;const data=runData(part,-r+.65);smoothWaterFrames(data);Object.assign(data,part);data.flumeSteps=360;geometry.push(data);}
 for(let k=1;k<geometry.length;k++){
  if(spec.kind==='lagoon-launch')continue;
  const previous=geometry[k-1],next=geometry[k],tail=!!next.bowl,data=tail?previous:next,source=tail?previous.samples.at(-1).q:next.samples[0].q,target=tail?next.samples[0].q:previous.samples.at(-1).q,correction=target.clone().multiply(source.clone().invert());
  for(let j=0;j<data.samples.length;j++){const w=tail?smooth((j-450)/150):1-smooth(j/150);if(!w)continue;const sample=data.samples[j];sample.q.premultiply(new T.Quaternion().slerp(correction,w));sample.up.set(0,1,0).applyQuaternion(sample.q);sample.right.set(1,0,0).applyQuaternion(sample.q);}
 }
 const add=(duration,phase,fn)=>{legs.push({start:clock,duration,phase,fn});clock+=duration;},frame=(position,quaternion=[0,0,0,1],extra={})=>({position,quaternion,walking:false,...extra}),
  walk=(a,b,d,phase='board',endQ=null)=>{const previous=legs.at(-1)?.fn(1)?.quaternion||[0,0,0,1],target=endQ||new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.atan2(b[0]-a[0],b[2]-a[2])).toArray();add(d,phase,u=>{const position=lerp(a,b,smooth(u));if(surface){const high=Math.max(a[1],b[1],1.95);position[1]=a[1]+(high-a[1])*smooth(u/.18)+(b[1]-high)*smooth((u-.82)/.18);}return frame(position,new T.Quaternion().fromArray(previous).slerp(new T.Quaternion().fromArray(target),smooth(u/.25)).toArray(),{walking:true,yaw:Math.atan2(b[0]-a[0],b[2]-a[2])});});},
  hold=(duration,phase)=>{const f=legs.at(-1).fn(1);add(duration,phase,()=>({...f,walking:false}));},
  run=(data,duration,phase='ride')=>{
   // Integrate travel once at construction: drops visibly accelerate and high
   // inversions slow down. The runtime reads the table, never solves a path.
   const times=[0],startY=data.samples[0].p.y;
   for(let i=1;i<data.samples.length;i++){const p=data.samples[i].p,b=data.samples[i-1].p,speed=Math.max(8,Math.min(40,Math.sqrt(Math.max(64,100+17*(startY-(p.y+b.y)/2)))));times.push(times.at(-1)+p.distanceTo(b)/speed);}
   const total=times.at(-1);add(duration,phase,u=>{const t=u*total;let lo=0,hi=times.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(times[m]<t)lo=m;else hi=m;}return data.at((lo+(t-times[lo])/Math.max(1e-9,times[hi]-times[lo]))/(times.length-1));});
  },bottom=spec.kind==='surf-halfpipe'?[0,spec.surfaceY+.5,-1]:authored.parts[0]?geometry[0].at(0).position:[0,2,0],bottomQ=['surf-halfpipe','fountain-carousel','pool-pendulum'].includes(spec.kind)?[0,0,0,1]:geometry[0].at(0).quaternion;

 const motor=['jungle-coaster','glass-drop'].includes(spec.kind),surface=['lazy-river','fountain-carousel','pool-pendulum','surf-halfpipe'].includes(spec.kind);
 add(1.5,'board',()=>frame(entry));
 if(motor){const boarding=spec.kind==='glass-drop'?[bottom[0],1.95,bottom[2]]:[-35,1.4,30];walk(entry,boarding,8);hold(2,'anticipation');const fromQ=legs.at(-1).fn(1).quaternion;add(13,'lift',u=>frame(lerp(boarding,bottom,smooth(u)),new T.Quaternion().fromArray(fromQ).slerp(new T.Quaternion().fromArray(bottomQ),smooth(u)).toArray(),{lift:true}));hold(spec.kind==='glass-drop'?3.2:1.2,'hold');}
 else if(!surface){const top=[-44,spec.kind==='lagoon-launch'?10:spec.height-r+.65,-30],base=[-44,.16,-30];walk(entry,base,Math.max(3,V(entry).distanceTo(V(base))/4.8));const climbQ=legs.at(-1).fn(1).quaternion;add(Math.max(9,spec.height*.17),'climb',u=>{const a=u*TAU*Math.ceil(spec.height/12);return frame([-44+Math.sin(a)*7,.16+(top[1]-.16)*u,-37+Math.cos(a)*7],new T.Quaternion().fromArray(climbQ).slerp(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2+a),smooth(u/.12)).toArray(),{walking:true,yaw:Math.PI/2+a});});walk(top,bottom,Math.max(3,V(top).distanceTo(V(bottom))/5),'board',bottomQ);hold(1.3,'anticipation');}
 else {if(spec.kind==='surf-halfpipe'){walk(entry,[-50,.16,-20],10);walk([-50,.16,-20],[0,1.95,-20],9);walk([0,1.95,-20],bottom,4,'board',bottomQ);}else walk(entry,spec.kind==='pool-pendulum'?[0,2,0]:bottom,9,'board',bottomQ);hold(2,'anticipation');}
 const rideStart=clock;
 switch(spec.kind){
 case 'barrel-wave':run(geometry[0],11.8);break;
 case 'jungle-coaster':run(geometry[0],15.4);break;
 case 'crystal-vortex':run(geometry[0],3.8);run(geometry[1],14.8,'vortex');run(geometry[2],4,'drop');break;
 case 'canyon-rafting':add(24,'rafting',u=>{const f=geometry[0].at(u),q=new T.Quaternion().fromArray(f.quaternion),spin=Math.sin(u*TAU*3)*1.1+u*TAU;q.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),spin));f.quaternion=q.toArray();f.position[1]+=Math.sin(u*Math.PI*22)*.38*Math.sin(Math.PI*u)**2;return f;});break;
 case 'glass-drop':run(geometry[0],3.8,'drop');break;
 case 'lagoon-launch':{
  run(geometry[0],2.6,'boost');const from=geometry[0].at(1).position,to=geometry[1].at(0).position,duration=4.7,gravity=9.81,vx=(to[0]-from[0])/duration,vz=(to[2]-from[2])/duration,vy=(to[1]-from[1]+.5*gravity*duration**2)/duration;
  flights.push({from,to,duration,gravity,vx,vy,vz,start:clock});add(duration,'flight',u=>{const t=u*duration,tangent=new T.Vector3(vx,vy-gravity*t,vz).normalize(),q=new T.Quaternion().fromArray(geometry[0].at(1).quaternion).slerp(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),tangent),smooth(u/.15));q.slerp(new T.Quaternion().fromArray(geometry[1].at(0).quaternion),smooth((u-.84)/.16));return frame([from[0]+vx*t,from[1]+vy*t-.5*gravity*t*t,from[2]+vz*t],q.toArray(),{flight:true});});impacts.push({time:clock,strength:1.8,position:to});run(geometry[1],2.8,'skim');break;
 }
 case 'surf-halfpipe':{
  const length=23;for(let j=1;j<6;j++)impacts.push({time:rideStart+j*length/6,strength:1.1,position:[0,spec.surfaceY,-1]});add(length,'surf',u=>{const a=Math.sin(u*TAU*3)*1.32*Math.sin(Math.PI*u)**.55,x=Math.sin(a)*34,y=(spec.radius+spec.surfaceY-.15)+34*(1-Math.cos(a))-r+.65,q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),-a);return frame([x,y,-1],q.toArray(),{surf:true});});break;
 }
 case 'lazy-river':for(const u of [.21,.43,.67,.91])impacts.push({time:rideStart+42*u,strength:.8,position:geometry[0].at(u).position,basin:false});add(42,'float',u=>{const f=geometry[0].at(u),q=new T.Quaternion().fromArray(f.quaternion),surge=Math.sin(Math.PI*u)**2;f.position[1]+=Math.sin(u*TAU*9)*surge*.18;q.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.sin(u*TAU*3)*surge*.35));f.quaternion=q.toArray();return f;});break;
 case 'fountain-carousel':impacts.push({time:rideStart+14,strength:1.1,position:[0,spec.surfaceY,16]});add(28,'carousel',u=>{const a=TAU*4*(u-Math.sin(TAU*u)/TAU),q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),a);return frame([Math.sin(a)*16,1.95,Math.cos(a)*16],q.toArray(),{carouselAngle:a});});break;
 case 'pool-pendulum':{
  const L=44,pivot=46,seconds=38;add(seconds,'swing',u=>{const angle=Math.sin(u*TAU*4)*1.43*Math.sin(Math.PI*u)**.8,q=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),angle);return frame([0,pivot-L*Math.cos(angle),-L*Math.sin(angle)],q.toArray(),{swingAngle:angle,pivot:[0,pivot,0]});});for(let j=1;j<8;j++)impacts.push({time:rideStart+j*seconds/8,strength:1.6,position:[0,1.45,0]});break;
 }
 }
 let finish=legs.at(-1).fn(1);if(!surface)impacts.push({time:clock,strength:spec.kind==='glass-drop'?2:1.4,position:finish.position});
 add(2.2,'splash',u=>frame(finish.position,finish.quaternion,{splash:true,paw:smooth(u)}));
 let departure=finish.position,departureQ=finish.quaternion;
 if(!surface){const dock=[authored.pool[0]+authored.pool[2]-3,spec.surfaceY+.5,authored.pool[1]],q=new T.Quaternion().fromArray(finish.quaternion||[0,0,0,1]),target=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2);add(3,'unload',u=>frame(lerp(finish.position,dock,smooth(u)),q.clone().slerp(target,smooth(u)).toArray()));departure=dock;departureQ=target.toArray();}
 const dismount=surface?bottom:[authored.pool[0]+authored.pool[2]+2.5,2.3,authored.pool[1]];
 if(V(departure).distanceTo(V(dismount))<.1)add(.8,'splash',u=>frame(lerp(departure,dismount,smooth(u)),departureQ));else walk(departure,dismount,6,'exit');if(spec.kind==='surf-halfpipe'){walk(dismount,[0,1.95,-20],4,'exit');walk([0,1.95,-20],[-50,.16,-20],9,'exit');walk([-50,.16,-20],entry,10,'exit');}else if(!surface){
  let from=dismount;for(let i=1;i<=8;i++){const a=i/8*Math.PI,to=[authored.pool[0]+Math.cos(a)*(authored.pool[2]+2.5),2.3,authored.pool[1]+Math.sin(a)*(authored.pool[3]+2.5)];walk(from,to,Math.max(.5,V(from).distanceTo(V(to))/4.8),'exit');from=to;}walk(from,entry,Math.max(3,V(from).distanceTo(V(entry))/4.8),'exit');
 }else walk(dismount,entry,Math.max(5,V(dismount).distanceTo(V(entry))/6),'exit');
 const seatStart=legs.find(l=>l.phase==='anticipation').start,seatEnd=legs.find(l=>l.phase==='exit').start,seatHeight=['barrel-wave','surf-halfpipe'].includes(spec.kind) ? .09 : .36;
 const seated=f=>{if(!f.seatBlend)return f;const lift=new T.Vector3(0,seatHeight*f.seatBlend,0).applyQuaternion(new T.Quaternion().fromArray(f.quaternion));return{...f,position:V(f.position).add(lift).toArray()};};

 function vehicleFrame(elapsed,reduced=false){if(reduced||elapsed>=clock)return frame(entry,undefined,{phase:'done',seatBlend:0});const t=T.MathUtils.clamp(elapsed,0,clock),leg=legs.find(l=>t<=l.start+l.duration)||legs.at(-1),f=leg.fn((t-leg.start)/leg.duration);return {phase:leg.phase,paw:0,seatBlend:smooth(Math.min((t-seatStart)/.6,(seatEnd-t)/.6)),...f};}
 for(const e of impacts){e.point=e.position;e.power=e.strength;delete e.position;delete e.strength;}
 const lanes=Array.from({length:spec.seats},(_,i)=>({geometry,impacts:spec.kind==='fountain-carousel'?impacts.map(e=>({...e,point:[Math.sin(i*TAU/spec.seats)*16,spec.surfaceY,Math.cos(i*TAU/spec.seats)*16]})):impacts,flights,legs,frame:(elapsed,reduced=false)=>{const f=vehicleFrame(elapsed,reduced);if(spec.kind==='fountain-carousel'&&['board','anticipation','exit','done'].includes(f.phase)){const angle=i*TAU/spec.seats,q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),angle);return seated({...f,position:V(f.position).applyQuaternion(q).toArray(),quaternion:q.multiply(new T.Quaternion().fromArray(f.quaternion)).toArray(),yaw:(f.yaw||0)+angle});}const q=new T.Quaternion().fromArray(f.quaternion||[0,0,0,1]);if(spec.kind==='fountain-carousel'){const a=(f.carouselAngle||0)+i*TAU/spec.seats;return seated({...f,position:[Math.sin(a)*16,1.95,Math.cos(a)*16],quaternion:new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),a).toArray()});}const offset=V(seatOffset(spec,i)).applyQuaternion(q);return seated({...f,position:V(f.position).add(offset).toArray()});}}));
 const boatFrame=(t,reduced=false,lane=0)=>{const f=lanes[lane%lanes.length].frame(t,reduced),lift=new T.Vector3(0,seatHeight*(f.seatBlend||0),0).applyQuaternion(new T.Quaternion().fromArray(f.quaternion));return{...f,position:V(f.position).sub(lift).toArray()};};
 const route={...authored,geometry,lanes,legs,impacts,flights,entry,top:bottom,height:spec.height,duration:clock,rideStart,boardingStart:seatStart,boardingEnd:seatStart+legs.find(l=>l.phase==='anticipation').duration,vehicleFrame,boatFrame,frame:(t,reduced=false,lane=0)=>lanes[lane%lanes.length].frame(t,reduced),footprint:spec.footprint,waterRideSpeed:1};cache.set(spec.id,route);return route;
}
export const createShowcaseRoute=spec=>runSceneSteps(showcaseRouteSteps(spec));
