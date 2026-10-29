import {gorillaSwingPose} from './zoo-gorilla-swing.js';
import {zooBearClipPose} from './zoo-bear-motion.js';
// Five independent action clips per species, all baked once. The per-animal
// shuffle bag is local: no AI requests, timers, new instances or saved animals.
export const ZOO_CLIP_FRAMES=80,ZOO_CLIP_COUNT=5;
export const ZOO_ACTION_SECONDS={elephant:12,axolotl:16,otter:24,tiger:9,polar:26,gorilla:12};
export const ZOO_CLIPS={
 elephant:[{name:'walk',from:0,to:12.8},{name:'spray',from:13.76,to:21.44},{name:'rest',from:21.76,to:29.76},{name:'ears',from:0,to:8,still:true},{name:'trunk-curl',from:13.76,to:21.44,still:true,dry:true}],
 axolotl:[{name:'swim',from:0,to:32},{name:'glide',from:0,to:32,soft:true},{name:'look-at-glass',from:0,to:16,still:true},{name:'gill-fan',from:0,to:32,still:true},{name:'bubble-peek',from:16,to:32,still:true}],
 otter:[{name:'swim',from:0,to:32},{name:'backstroke',from:11.2,to:21.76},{name:'rock-rest',from:24.96,to:32},{name:'dive',from:3.84,to:10.88},{name:'shore-peek',from:0,to:16,still:true}],
 tiger:[{name:'walk',from:0,to:6.4},{name:'stretch',from:6.4,to:11.2},{name:'groom',from:11.2,to:15.36},{name:'play',from:23.04,to:31.04},{name:'lie-down',from:14.4,to:22.4}],
 polar:[{name:'swim-dive',from:0,to:32},{name:'snow-play',from:24,to:32},{name:'shore-walk',from:0,to:3.2,pingpong:true},{name:'look-around',from:0,to:12,still:true},{name:'rest',from:24,to:32,still:true,dry:true}],
 gorilla:[{name:'chest-beat',from:0,to:6.4},{name:'branch-swing',from:6.4,to:19.2},{name:'sit',from:20.48,to:30.4},{name:'look-around',from:0,to:12,still:true},{name:'wave',from:0,to:6.4,still:true,wave:true}]
};
export const POLAR_ACTION_SECONDS=[26,9,10,7,13];
export const POLAR_ACTION_PERIOD=POLAR_ACTION_SECONDS.reduce((a,b)=>a+b,0);
const ids={elephant:1,gorilla:2,tiger:3,polar:4,otter:5,axolotl:6};
function hash(n){n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return (n^(n>>>16))>>>0;}
export function zooBehaviorFrame(species,actor,time){
 if(species==='polar'){const seconds=POLAR_ACTION_PERIOD,t=Math.max(0,time)+actor*ZOO_ACTION_SECONDS.polar*.213,bag=Math.floor(t/seconds),h=hash(bag+ids.polar*97+actor*131);let remaining=t-bag*seconds;for(let j=0;j<5;j++){const clip=((h%5)+j*(1+(h>>>2)%4))%5,d=POLAR_ACTION_SECONDS[clip];if(remaining<d||j===4)return Math.fround(clip*ZOO_CLIP_FRAMES+remaining/d*(ZOO_CLIP_FRAMES-1));remaining-=d;}}
 const tick=Math.max(0,time)/ZOO_ACTION_SECONDS[species]+actor*.213,block=Math.floor(tick),h=hash(Math.floor(block/5)+ids[species]*97+actor*131),
  clip=((h%5)+(block%5)*(1+(h>>>2)%4))%5,u=tick-block;
 return Math.fround(clip*ZOO_CLIP_FRAMES+u*(ZOO_CLIP_FRAMES-1));
}
export function zooBehaviorSample(species,actor,time){
 const frame=zooBehaviorFrame(species,actor,time),clip=Math.floor(frame/ZOO_CLIP_FRAMES),u=(frame-clip*ZOO_CLIP_FRAMES)/(ZOO_CLIP_FRAMES-1);
 return {clip,u,frame,name:ZOO_CLIPS[species][clip].name};
}
// Descriptive schedule for UI/QA; the frame loop uses the allocation-free
// sampler above. Each shuffled bag includes every action exactly once.
export function zooBehaviorBag(species,actor,bag){
 const durations=species==='polar'?POLAR_ACTION_SECONDS:Array(5).fill(ZOO_ACTION_SECONDS[species]),total=durations.reduce((a,b)=>a+b,0),h=hash(bag+ids[species]*97+actor*131),out=[];let start=bag*total-actor*ZOO_ACTION_SECONDS[species]*.213;
 for(let j=0;j<5;j++){const clip=((h%5)+j*(1+(h>>>2)%4))%5,seconds=durations[clip];out.push({clip,name:ZOO_CLIPS[species][clip].name,start,end:start+seconds,seconds});start+=seconds;}return out;
}
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
// Blend both ends into the same rest pose offline. Clip changes require exactly
// the original two matrix samples on the GPU, with no live crossfade atlas.
export function zooClipPose(species,clip,u,role,pose){
 if(species==='gorilla'&&clip===1)return gorillaSwingPose(u,role);
 const c=ZOO_CLIPS[species][clip],q=c.pingpong?1-Math.abs(2*u-1):u,t=c.from+(c.to-c.from)*q,
  base=pose(species,0,role),target=pose(species,t,role),w=smooth(u/.12)*smooth((1-u)/.12);
 if(species==='polar'){const bear=zooBearClipPose(c.name,u,role);if(bear)return {...base,...bear};}
 if(c.still&&role==='root')return base;
 if(c.still&&/^(Leg|Knee|Foot)/.test(role))return base;
 const out={};for(const k of Object.keys(base)){
  let delta=target[k]-base[k];if(k.startsWith('r'))delta=Math.atan2(Math.sin(delta),Math.cos(delta));
  out[k]=base[k]+delta*w*(c.soft?.55:1);
 }
 if(c.dry&&(role.startsWith('spray')||role==='toy'))out.sx=out.sy=out.sz=.001;
 if(c.wave&&role==='ArmRight'){out.rx=-.9*w;out.rz=.65*w;out.ry=Math.sin(u*Math.PI*8)*.18*w;}
 if(c.wave&&role==='ElbowRight')out.rx=-1.1*w;
 if(c.still&&role==='head'){out.ry+=Math.sin(u*Math.PI*2)*.15*w;out.rx+=Math.sin(u*Math.PI*4)*.06*w;}
 return out;
}
