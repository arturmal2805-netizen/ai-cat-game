import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {REFERENCE_SLIDES} from '../public/reference-slide-data.js';
import {ATOLL_SLIDES} from '../public/atoll-slide-data.js';
import {MEGA_RIDES} from '../public/mega-ride-data.js';
import {createReferenceRoute} from '../public/reference-slide-motion.js';
import {createMegaRoute} from '../public/mega-ride-motion.js';
import {WATER_SLIDE_SPEED,paceLegacyWaterRide} from '../public/water-ride-pace.js';

const fast=new Set(['ride','slide','vortex','drain','underwater','lift']);
const q=f=>f.quaternion?new T.Quaternion(...f.quaternion):new T.Quaternion().setFromEuler(new T.Euler(f.pitch||0,f.yaw||0,f.roll||0));
const point=f=>new T.Vector3(...f.position);
test('all canonical water runs are 33% faster on the identical physical path, with real gravity and undisturbed dry walking',()=>{
 for(const spec of [...REFERENCE_SLIDES,...ATOLL_SLIDES,...MEGA_RIDES]){
  const factory=spec.referenceCell?createReferenceRoute:createMegaRoute;
  const authored=factory(spec,{speed:1}),play=factory(spec);
  if(spec.id.startsWith('coaster')){assert.equal(play.duration,authored.duration);continue;}
  assert.equal(play.waterRideSpeed,1.33);
  for(const [index,lane] of (play.lanes||[play]).entries()){
   const original=(authored.lanes||[authored])[index];
   lane.legs.forEach((leg,i)=>{
    const old=original.legs[i],ratio=fast.has(leg.phase)?WATER_SLIDE_SPEED:1;
    assert.ok(Math.abs(old.duration/leg.duration-ratio)<1e-8,spec.id+' '+leg.phase);
    for(const u of [.1,.4,.75,.98])assert.ok(point(leg.fn(u)).distanceTo(point(old.fn(u)))<1e-8,spec.id+' path');
    if(leg.phase==='flight'){
     const h=.01,t=leg.start+leg.duration*.5;
     const acceleration=(lane.frame(t+h).position[1]-2*lane.frame(t).position[1]+lane.frame(t-h).position[1])/(h*h);
     assert.ok(Math.abs(acceleration+9.81)<1e-5,spec.id+' gravity');
    }
   });
   for(const event of lane.impacts){const prior=original.impacts.find(e=>Math.abs(lane.toPlayTime(e.time)-event.time)<1e-7);assert.ok(prior,spec.id+' impact clock');}
  }
 }
});

test('every authored lane keeps position and orientation continuous at all ride boundaries, and reaches its exact safe dry return',()=>{
 for(const spec of [...REFERENCE_SLIDES,...ATOLL_SLIDES,...MEGA_RIDES.filter(s=>!s.id.startsWith('coaster'))]){
  const route=spec.referenceCell?createReferenceRoute(spec):createMegaRoute(spec);
  for(const lane of route.lanes||[route]){
   for(const leg of lane.legs){
    if(!leg.start)continue;
    const a=lane.frame(leg.start-1e-6),b=lane.frame(leg.start+1e-6);
    assert.ok(point(a).distanceTo(point(b))<.002,spec.id+' position '+leg.phase);
    assert.ok(q(a).angleTo(q(b))<.001,spec.id+' rotation '+leg.phase);
   }
   const a=lane.frame(lane.duration-1e-6),b=lane.frame(lane.duration+1e-6);
   assert.ok(point(a).distanceTo(point(b))<.002,spec.id+' return');
   assert.ok(q(a).angleTo(q(b))<.001,spec.id+' return rotation');
  }
 }
});

test('fast reference lanes avoid single-frame orientation flips while preserving full inversions and fixed sample counts',()=>{
 for(const spec of [...REFERENCE_SLIDES,...ATOLL_SLIDES]){
  const route=createReferenceRoute(spec);
  for(const lane of route.lanes){
   for(const leg of lane.legs.filter(l=>['ride','vortex','flight','lift','drain'].includes(l.phase))){
    for(let t=leg.start+.01;t<leg.start+leg.duration-.02;t+=1/60){
     const a=lane.frame(t),b=lane.frame(t+1/120);
     assert.ok(q(a).angleTo(q(b))<.3,spec.id+' '+leg.phase+' '+t);
    }
   }
   for(const g of lane.geometry)assert.equal(g.samples.length,601);
   for(const g of lane.geometry.filter(g=>g.part?.keepInversion))for(const [first,last] of g.part.loops){
    const inverted=g.samples.some((s,i)=>{
     const knot=g.curve.getUtoTmapping(i/600)*(g.part.points.length-1);
     return knot>first&&knot<last&&s.up.y<-.5;
    });assert.ok(inverted,spec.id+' complete loop '+first);
   }
  }
 }
});

test('simultaneous race lanes retain separate flumes and landings instead of converging into the same cat',()=>{
 for(const spec of [...REFERENCE_SLIDES,...ATOLL_SLIDES].filter(s=>s.lanes>1)){
  const route=createReferenceRoute(spec),grid=new Map();
  for(const [laneId,lane] of route.lanes.entries()){
   for(const g of lane.geometry)for(let k=0;k<g.samples.length;k+=3){
    const p=g.samples[k].p,cell=[Math.floor(p.x/5),Math.floor(p.y/5),Math.floor(p.z/5)];
    for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){
     for(const other of grid.get([cell[0]+x,cell[1]+y,cell[2]+z].join(','))||[])
      if(other.lane!==laneId)assert.ok(p.distanceTo(other.p)>=4.8,spec.id+' intersecting lanes');
    }
    const key=cell.join(',');if(!grid.has(key))grid.set(key,[]);grid.get(key).push({lane:laneId,p});
   }
  }
  for(const [i,lane] of route.lanes.entries())for(const other of route.lanes.slice(i+1)){
   const a=lane.impacts.at(-1).point,b=other.impacts.at(-1).point;
   assert.ok(new T.Vector3(...a).distanceTo(new T.Vector3(...b))>3,spec.id+' overlapping finishes');
  }
 }
});

test('legacy clocks accelerate the occupied raft and public seat together and restore authored state even after exceptions',()=>{
 const originalFrame=t=>({position:[t,1,0]}),seen=[];
 const d={duration:10,rideFrame:originalFrame,rideElapsed:3,update(){seen.push([this.rideElapsed,this.duration,this.rideFrame(2).position[0]]);}},root={userData:d};
 // The original builders close over userData, rather than relying on `this`.
 d.update=()=>{seen.push([d.rideElapsed,d.duration,d.rideFrame(2).position[0]]);};
 const events=paceLegacyWaterRide(root,[{time:5,point:[0,1,0]}]);
 assert.equal(d.duration,10/1.33);assert.equal(d.rideFrame(3).position[0],3*1.33);assert.equal(events[0].time,5/1.33);
 d.update(7);assert.deepEqual(seen,[[3*1.33,10,2]]);assert.equal(d.rideElapsed,3);assert.equal(d.duration,10/1.33);
 const frame=d.rideFrame;assert.equal(paceLegacyWaterRide(root,events),events);assert.equal(d.rideFrame,frame);
 const broken={userData:{duration:10,rideFrame:originalFrame,rideElapsed:2,update(){throw Error('probe');}}};
 paceLegacyWaterRide(broken,[]);const f=broken.userData.rideFrame;
 assert.throws(()=>broken.userData.update(1),/probe/);assert.equal(broken.userData.rideFrame,f);assert.equal(broken.userData.rideElapsed,2);assert.equal(broken.userData.duration,10/1.33);
});
