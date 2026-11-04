import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {WATER_RIDES} from '../public/water-ride-data.js';
import {WATER_PERFORMANCES,WATER_GESTURE_KEYS,sampleWaterPerformance,waterPerformanceFrame,installWaterPerformanceSteps} from '../public/water-ride-performance.js';
import {makeAttraction} from '../public/world-assets.js';
import {referenceSlideAttraction,referenceSlideSteps} from '../public/reference-slide-assets.js';
import {runSceneSteps} from '../public/scene-tasks.js';
import {disposeScenery} from '../public/scenery-models.js';
import {createCat,animateCat,reactCat,disposeCat} from '../public/cat-model.js';
import {applyAtollSit} from '../public/atoll-slide-acting.js';
import {createShowcaseRoute} from '../public/showcase-water-motion.js';
import {SHOWCASE_WATER_RIDES} from '../public/showcase-water-data.js';

test('all 68 water rides have an individual performance; every factory including background construction installs it',()=>{
 assert.deepEqual(WATER_PERFORMANCES.map(s=>s.id),WATER_RIDES.map(s=>s.id));
 const fingerprints=new Set();
 for(const spec of WATER_RIDES){
  const g=makeAttraction(spec.id),d=g.userData,other=makeAttraction(spec.id);
  assert.ok(d.waterPerformance?.length,spec.id);assert.equal(d.waterPerformance,other.userData.waterPerformance);
  const p=d.waterPerformance[0],initial=p.rows.slice();assert.ok(p.count<=512);
  let asymmetry=0,previous;const seen=new Set();
  for(let i=0;i<=800;i++){
   const t=d.duration*i/800,r={...d.rideReaction(t)},next={...d.rideReaction(Math.min(d.duration,t+.0001))};
   for(const [key,v]of Object.entries(r))if(typeof v==='number')assert.ok(Number.isFinite(v),spec.id+':'+key);
   for(const key of ['headYaw','headRoll',...WATER_GESTURE_KEYS])assert.ok(Math.abs(r[key]-next[key])<.006,spec.id+' discontinuity '+key);
   assert.ok(r.crouch>=0&&r.crouch<.3);asymmetry=Math.max(asymmetry,Math.abs(r.waterLeftPaw-r.waterRightPaw));
   if(r.waterGesture>.1)seen.add(Math.round(r.waterLeftPaw*20)+':'+Math.round(r.waterRightPaw*20));
   if(i%80===0)fingerprints.add(spec.id+':'+r.waterLeftPaw);previous=r;
  }
  assert.ok(asymmetry>.07,spec.id+' stiff symmetric paws');assert.ok(seen.size>5,spec.id+' no multi-beat gestures');assert.deepEqual(p.rows,initial);
  const reduced=d.rideReaction(d.duration*.5,true);for(const [k,v]of Object.entries(reduced))if(!['ride','speed','height','turnForce'].includes(k))assert.equal(v,0,spec.id+' reduced '+k);
  disposeScenery(g);disposeScenery(other);
 }
 for(const id of ['slide-dream-crystal-loops','slide-atoll-mega-loops','ride-water-canyon-rafting']){
  for(const g of [referenceSlideAttraction(id),runSceneSteps(referenceSlideSteps(id))]){assert.ok(g.userData.waterPerformance);disposeScenery(g);}
 }
});

test('runtime only interpolates fixed cached data, supports deterministic seeking and preserves source frame/carrier',()=>{
 let calls=0;const duration=80,legs=[{start:0,duration:35,phase:'climb'},{start:35,duration:3,phase:'ride'},{start:38,duration:2,phase:'splash'},{start:40,duration:40,phase:'exit'}];
 const d={duration,route:{legs},rideFrame:t=>{calls++;const l=legs.find(l=>t<l.start+l.duration)||legs.at(-1);return {phase:l.phase,walking:['climb','exit'].includes(l.phase),position:[0,30-t*.3,t]};},rideReaction:t=>({ride:true,weight:t>=35&&t<=40?1:0,speed:20,height:12,turnForce:0,crouch:.1,paw:0,headYaw:0,headRoll:0,headPitch:0,eyeClose:0,surprise:0,tailSway:0})};
 const p=sampleWaterPerformance(d,WATER_PERFORMANCES.find(s=>s.id==='ride-water-canyon-rafting')),initial=calls,rows=p.rows.slice(),out={};
 assert.ok(p.times.filter(t=>t>=35&&t<=40).length>100,'quick ride and splash need dense samples rather than empty walks');
 const before={...waterPerformanceFrame(p,36.4)};for(let i=0;i<10000;i++)assert.equal(waterPerformanceFrame(p,i/125,false,out),out);
 assert.equal(calls,initial);assert.deepEqual(p.rows,rows);assert.deepEqual(waterPerformanceFrame(p,36.4),before);
});

test('left and right paws move independently on the native rig and cancellation/reduced motion restore it',()=>{
 const a=createCat('happy'),b=createCat('happy'),pose=c=>[c.userData.head,...c.userData.ears,...c.userData.legs,...c.userData.legJoints.flatMap(j=>[j.knee,j.ankle])].flatMap(n=>[...n.position,...n.quaternion,...n.scale]),carrier=new T.Group();carrier.add(a);const position=carrier.position.toArray();
 try{
  animateCat(a,1);animateCat(b,1);const before=a.userData.legs.filter(l=>l.position.z>0).map(l=>l.rotation.x);
  applyAtollSit(a,{waterGesture:1,waterLeftPaw:.9,waterRightPaw:0,waterLeftSweep:.15,waterLeftCurl:.7});
  const after=a.userData.legs.filter(l=>l.position.z>0);assert.ok(Math.abs(after[0].rotation.x-before[0])>.5);assert.equal(after[1].rotation.x,before[1]);assert.deepEqual(carrier.position.toArray(),position);
  animateCat(a,1.1);animateCat(b,1.1);assert.deepEqual(pose(a),pose(b));
  reactCat(a,{ride:true,waterGesture:1,waterLeftPaw:1},true);applyAtollSit(a,{waterGesture:1,waterLeftPaw:1},true);assert.deepEqual(pose(a),pose(b));
 }finally{disposeCat(a);disposeCat(b);}
});

test('faster rafting and river use a single native clock without changing true gravity, walking, boarding or landing',()=>{
 const rafting=createShowcaseRoute(SHOWCASE_WATER_RIDES.find(s=>s.kind==='canyon-rafting')),river=createShowcaseRoute(SHOWCASE_WATER_RIDES.find(s=>s.kind==='lazy-river'));
 assert.equal(rafting.legs.find(l=>l.phase==='rafting').duration,24/1.3);assert.equal(river.legs.find(l=>l.phase==='float').duration,42/1.25);
 for(const r of [rafting,river]){
  assert.equal(r.legs.find(l=>l.phase==='anticipation').duration,r===rafting?1.3:2);assert.equal(r.legs.find(l=>l.phase==='splash').duration,2.2);
  for(const l of r.legs)for(const u of [.1,.5,.9])for(let lane=0;lane<r.lanes.length;lane++){
   const t=l.start+u*l.duration,f=r.frame(t,false,lane),boat=r.boatFrame(t,false,lane);assert.equal(f.phase,l.phase);assert.ok(f.position.every(Number.isFinite));assert.ok(boat.position.every(Number.isFinite));
  }
 }
 const launch=createShowcaseRoute(SHOWCASE_WATER_RIDES.find(s=>s.kind==='lagoon-launch'));assert.equal(launch.flights[0].gravity,9.81);assert.equal(launch.flights[0].duration,4.7);
});


test('background performance preparation yields between lanes and never exposes a partial cached table',()=>{
 let calls=0;const make=()=>({userData:{id:'slide-atoll-rainbow-race',duration:12.12345,route:{lanes:Array.from({length:6},()=>({legs:[{start:0,duration:12.12345,phase:'ride'}]}))},rideFrame:t=>{calls++;return {phase:'ride',position:[0,3,t]};},rideReaction:()=>({ride:true,weight:1,speed:12,height:3,turnForce:0,crouch:0,paw:0,headYaw:0,headRoll:0,headPitch:0,eyeClose:0,surprise:0,tailSway:0})}}),root=make(),iterator=installWaterPerformanceSteps(root);
 for(let i=0;i<6;i++){const step=iterator.next();assert.equal(step.done,false);assert.equal(root.userData.waterPerformance,undefined);assert.ok(calls<=(i+1)*513);}
 assert.equal(iterator.next().value,root);assert.equal(root.userData.waterPerformance.length,6);
 const count=calls,same=make(),cached=installWaterPerformanceSteps(same);assert.equal(cached.next().done,true);assert.equal(calls,count);assert.equal(same.userData.waterPerformance,root.userData.waterPerformance);
});
