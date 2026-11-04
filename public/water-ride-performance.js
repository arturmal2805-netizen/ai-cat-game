// Authored gestures sampled once from each real seat. Playing/pausing/seeking
// only interpolates immutable tables; no timers, meshes or route queries.
import { WATER_RIDES } from './water-ride-data.js';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=x=>{const u=clamp(x);return u*u*(3-2*u);};
const beat=(u,at,width)=>1-smooth(Math.abs(u-at)/width);
const styles={
 flume:['waterslide','water-extreme','ride-crystal-slide','slide-glass-corkscrew','slide-jungle-titan','slide-dream-ribbon-tower','slide-dream-lighthouse','slide-dream-royal-aqueduct'],
 race:['slide-marshmallow','slide-rainbow-tsunami','slide-dream-canyon-twins','slide-atoll-rainbow-race','slide-atoll-double-serpent','slide-atoll-red-canyon'],
 loop:['slide-dream-crystal-loops','slide-dream-canyon-eight','slide-dream-dragon-tail','slide-dream-cave-loop','slide-atoll-lagoon-loop','slide-atoll-mega-loops'],
 vortex:['water-whirlpool','slide-vortex-bowl','slide-titan-funnel','slide-dream-pearl-funnel','slide-dream-orbital-shell','slide-dream-luminous-vortex','slide-dream-four-funnels','slide-dream-twin-shell','slide-atoll-blue-whirlpool','slide-atoll-purple-vortex'],
 rapids:['water-river','slide-atoll-emerald-canyon','ride-water-canyon-rafting','ride-water-lazy-river'],
 cascade:['slide-royal-cascade','slide-dream-waterfall-arch','slide-dream-terrace-cascades','slide-atoll-waterfall-cascade'],
 cave:['slide-dream-ocean-tunnel','slide-dream-ice-tunnel','slide-atoll-rock-arch','slide-atoll-crystal-cavern','slide-atoll-coral-arch'],
 garden:['slide-dream-blossom-tree','slide-dream-cloud-star','slide-atoll-sky-serpent','slide-atoll-root-valley','slide-atoll-cloud-islets','slide-atoll-flower-lagoon','slide-atoll-green-valley'],
 launch:['slide-sky-cannon','dive-triple-sky','slide-dream-rainbow-launch','slide-dream-ring-launch','slide-dream-twin-flights','ride-water-lagoon-launch'],
 drop:['slide-abyss-capsule','slide-dream-water-lift','slide-dream-sky-bridge','slide-atoll-abyss-bridge','ride-water-glass-drop'],
 surf:['slide-dream-tidal-wave','slide-atoll-giant-wave','slide-atoll-blue-halfpipe','ride-water-barrel-wave','ride-water-surf-halfpipe'],
 carousel:['ride-water-fountain-carousel'],swing:['ride-water-pool-pendulum'],
};
export const WATER_PERFORMANCES=Object.freeze(WATER_RIDES.map(({id})=>{
 const style=Object.keys(styles).find(k=>styles[k].includes(id));
 if(!style)throw Error('Missing water performance: '+id);
 let seed=0;for(const ch of id)seed=(seed*31+ch.charCodeAt(0))>>>0;
 return Object.freeze({id,style,seed,hand:seed%2?1:-1,accent:(seed%17)/17});
}));
const recipes=new Map(WATER_PERFORMANCES.map(s=>[s.id,s])),cache=new Map();
export const WATER_GESTURE_KEYS=['waterGesture','waterLeftPaw','waterRightPaw','waterLeftSweep','waterRightSweep','waterLeftCurl','waterRightCurl','waterEarFlutter'];
export const WATER_PERFORMANCE_KEYS=['weight','speed','height','turnForce','crouch','paw','pawSpread','grip','frontLift','hindTuck','headPitch','headRoll','headYaw','bodyLean','bodyPitch','earRelax','tailSway','tailTrail','eyeClose','surprise','rideSit','waterSurf','waterProne','waterPawLift',...WATER_GESTURE_KEYS];
const phases=new Set(['ride','slide','vortex','drain','flight','underwater','rafting','drop','boost','skim','surf','float','carousel','swing']);
const resting=new Set(['anticipation','hold','lift']);
function perform(recipe,frame,leg,time,out,lane){
 for(const key of WATER_GESTURE_KEYS)out[key]=0;
 const weight=out.weight||0,phase=frame.phase;
 if(!weight||frame.walking||(!phases.has(phase)&&!resting.has(phase)&&phase!=='splash'))return out;
 const u=clamp((time-leg.start)/Math.max(.01,leg.duration)),gate=smooth(u/.13)*smooth((1-u)/.13)*weight,
  side=(lane%2?-1:1)*recipe.hand,shift=(recipe.accent-.5)*.12+(lane%4)*.025,
  fast=clamp((out.speed-3)/26),high=clamp((out.height-3)/35),turn=clamp(out.turnForce||0,-1,1),
  first=beat(u,.23+shift,.16),middle=beat(u,.52-shift,.18),last=beat(u,.81-shift,.13);
 let left=0,right=0,sweep=0,curl=0,cheer=0,peek=0;
 const wave=(amount)=>{if(side<0)left+=amount;else right+=amount;sweep+=amount*Math.sin(time*9)*.22;curl+=amount*(.5+.5*Math.sin(time*9+1.2));};
 if(resting.has(phase)){
  peek=first*.42;wave(last*.48);out.headYaw+=gate*side*middle*.38;
 }else if(phase==='splash'){
  const shake=beat(u,.3,.22),happy=beat(u,.73,.21);
  out.headRoll+=gate*shake*Math.sin(u*24)*.14;out.headYaw+=gate*shake*Math.sin(u*19)*.14;
  out.eyeClose=clamp(out.eyeClose+gate*shake*.3,0,.98);wave(happy*.72);
  out.waterEarFlutter=gate*shake*Math.sin(u*28)*.12;
 }else{
  switch(recipe.style){
   case 'rapids':{
    const stroke=.5+.5*Math.sin(u*Math.PI*(recipe.id.includes('lazy')?8:12)+lane*Math.PI*.5),power=(.35+.65*middle);
    left=stroke*power*.65;right=(1-stroke)*power*.65;sweep=Math.cos(u*Math.PI*12+lane*Math.PI*.5)*.16*power;
    curl=.4*power;wave(last*.7);out.headYaw+=gate*(side*first*.35-turn*.16);break;
   }
   case 'race':wave(middle*.72);cheer=last*.45;out.headYaw+=gate*side*(first*.42-last*.18);out.tailSway+=gate*Math.sin(time*7)*middle*.2;break;
   case 'loop':cheer=(first*.55+last*.8)*(1-high*.25);peek=middle*.25;out.headRoll+=gate*turn*.1;break;
   case 'vortex':wave(first*.5+last*.75);peek=middle*.28;out.headYaw+=gate*side*middle*.48;out.bodyLean-=gate*turn*.045;break;
   case 'cascade':cheer=middle*.7;wave(last*.65);out.eyeClose=clamp(out.eyeClose+gate*first*.3,0,.98);out.headPitch+=gate*first*.18;break;
   case 'cave':peek=first*.35;wave(last*.8);out.headYaw+=gate*side*middle*.48;out.headPitch-=gate*middle*.1;break;
   case 'garden':wave(first*.65+last*.65);out.headYaw+=gate*side*(first*.36-middle*.4);out.headRoll+=gate*side*last*.13;break;
   case 'launch':cheer=phase==='flight'?.7+.3*middle:last*.65;peek=first*.25;out.headYaw+=gate*side*middle*.32;break;
   case 'drop':cheer=phase==='drop'?.8:middle*.7;peek=first*.4;out.earRelax-=gate*fast*.08;break;
   case 'surf':{
    const balance=Math.sin(u*Math.PI*(recipe.id.includes('halfpipe')?12:4));
    left=(.5+.5*balance)*.6;right=(.5-.5*balance)*.6;wave(last*.55);
    out.headRoll-=gate*balance*.14;out.headYaw+=gate*side*middle*.3;break;
   }
   case 'carousel':wave((first+last)*.95);cheer=middle*.38;out.headYaw+=gate*side*middle*.55;break;
   case 'swing':cheer=high*.9;wave(last*.45);peek=(1-high)*middle*.32;out.headYaw+=gate*side*high*.25;break;
   default:wave(last*.8);cheer=middle*.55;peek=first*.3;break;
  }
 }
 // Positive shoulder lifts retain supporting paw clearance. Keep one paw on
 // the rim during waves; do not move the carrier or fabricate another path.
 left+=cheer*.75;right+=cheer*.75;
 out.waterLeftPaw=gate*clamp(left,0,.95);out.waterRightPaw=gate*clamp(right,0,.95);
 out.waterLeftSweep=gate*sweep;out.waterRightSweep=-gate*sweep;
 out.waterLeftCurl=gate*curl*clamp(left);out.waterRightCurl=gate*curl*clamp(right);
 out.waterGesture=gate;
 out.headPitch+=gate*(peek-cheer*.12);out.surprise=clamp(out.surprise+gate*cheer*.25);
 out.tailSway+=gate*cheer*Math.sin(time*7)*.13;
 out.crouch=clamp(out.crouch,0,.285);return out;
}
// Spend samples on quick drops and landings rather than long empty walks.
// The sorted, phase-aware time table still has no more than 512 intervals.
function timeline(duration,legs){
 if(!legs?.length||legs.length>60)return Float32Array.from({length:513},(_,i)=>i/512*duration);
 const score=l=>l.phase==='board'||l.phase==='climb'||l.phase==='exit'?0:Math.sqrt(l.duration),
  total=legs.reduce((sum,l)=>sum+score(l),0),spare=Math.max(0,512-legs.length*8),times=[0];
 for(const leg of legs){
  const count=2+Math.floor(spare*score(leg)/Math.max(1,total));
  for(let i=1;i<=count;i++)times.push(leg.start+i/count*leg.duration);
  for(const dt of [.15,.35,.6])if(leg.duration>dt*2)times.push(leg.start+dt,leg.start+leg.duration-dt);
 }
 return Float32Array.from([...new Set(times)].sort((a,b)=>a-b));
}
export function sampleWaterPerformance(d,recipe,lane=0){
 const route=d.route?.lanes?.[lane]||d.route,legs=route?.legs,times=timeline(d.duration,legs),stride=WATER_PERFORMANCE_KEYS.length,rows=new Float32Array(times.length*stride);
 // Legacy slides expose phases through their native frame rather than legs.
 const frames=Array.from(times,t=>d.rideFrame(t,false,lane));
 for(let i=0;i<times.length;i++){
  const t=times[i],f=frames[i];let leg=legs?.find(l=>t>=l.start-1e-5&&t<=l.start+l.duration+1e-5);
  if(!leg){let a=i,b=i;while(a>0&&frames[a-1].phase===f.phase)a--;while(b<frames.length-1&&frames[b+1].phase===f.phase)b++;leg={start:times[a],duration:Math.max(.1,times[b]-times[a])};}
  const out=perform(recipe,f,leg,t,{...d.rideReaction(t,false,lane)},lane);
  WATER_PERFORMANCE_KEYS.forEach((key,k)=>{rows[i*stride+k]=out[key]||0;});
 }
 return {duration:d.duration,count:times.length-1,times,rows,recipe};
}
export function waterPerformanceFrame(profile,elapsed,reduced=false,out={}){
 const t=clamp(Number.isFinite(elapsed)?elapsed:0,0,profile.duration),times=profile.times;let lo=0,hi=profile.count;
 while(hi-lo>1){const mid=(lo+hi)>>1;if(times[mid]<=t)lo=mid;else hi=mid;}
 const u=clamp((t-times[lo])/Math.max(1e-8,times[hi]-times[lo])),stride=WATER_PERFORMANCE_KEYS.length;
 out.ride=true;
 for(let j=0;j<stride;j++){const key=WATER_PERFORMANCE_KEYS[j];out[key]=reduced&&!['speed','height','turnForce'].includes(key)?0:profile.rows[lo*stride+j]*(1-u)+profile.rows[hi*stride+j]*u;}
 return out;
}
export function installWaterPerformance(root){
 const d=root.userData,recipe=recipes.get(d.id);if(!recipe||!d.rideReaction||!d.rideFrame||d.waterPerformance)return root;
 const key=d.id+':'+d.duration,n=d.route?.lanes?.length||1;
 if(!cache.has(key))cache.set(key,Array.from({length:n},(_,i)=>sampleWaterPerformance(d,recipe,i)));
 const profiles=cache.get(key),scratch=profiles.map(()=>({}));d.waterPerformance=profiles;
 d.rideReaction=(t,reduced=false,lane=0)=>{const i=lane%profiles.length;return waterPerformanceFrame(profiles[i],t,reduced,scratch[i]);};return root;
}
