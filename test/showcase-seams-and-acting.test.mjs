import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {SHOWCASE_WATER_RIDES} from '../public/showcase-water-data.js';
import {createShowcaseRoute} from '../public/showcase-water-motion.js';
import {naturalBank} from '../public/showcase-bank.js';
import {receivingBankEnd} from '../public/showcase-water-optics.js';
import {slideRibbon} from '../public/slide-water.js';
import {sampleShowcaseActing,showcaseActingFrame} from '../public/showcase-water-acting.js';
import {createCat,animateCat,reactCat,disposeCat} from '../public/cat-model.js';
import {applyAtollSit} from '../public/atoll-slide-acting.js';
import {showcaseTrough} from '../public/showcase-water-assets.js';

test('both real banks and their solid bed meet continuously across the wet edge of the rapids and river',()=>{
 let checked=0;
 for(const spec of SHOWCASE_WATER_RIDES){const route=createShowcaseRoute(spec);
  for(const data of route.geometry.filter(g=>g.rapids||g.river)){
   const end=receivingBankEnd(data,spec.radius,route.pool,spec.surfaceY),water=slideRibbon({samples:data.samples,width:spec.radius-.12,offset:-spec.radius+.15,steps:360});
   const shell=showcaseTrough(data,spec.radius,spec.radius,end);
   for(const side of [-1,1]){
    const geometry=naturalBank(data,spec.radius,spec.radius,side,{end}),material=new T.MeshBasicMaterial({side:T.DoubleSide}),bank=new T.Group();bank.add(new T.Mesh(geometry,material),new T.Mesh(shell.floor,material));bank.updateMatrixWorld(true);
    for(let row=Math.ceil(.045*360)+3;row<Math.floor(end*360)-3;row++){
     const wet=new T.Vector3().fromBufferAttribute(water.attributes.position,row*9+(side===1?8:0)),up=data.samples[Math.round(row/360*600)].up;
     for(const across of row/360<end-.04?[0,.35,.7,1]:[0]){
      const target=wet.clone().addScaledVector(data.samples[Math.round(row/360*600)].right,side*across);
      const hits=new T.Raycaster(target.addScaledVector(up,2),up.clone().negate(),0,4).intersectObject(bank);
      assert.ok(hits.some(h=>h.distance>2.0945),spec.kind+' open bank/bed seam at '+side+':'+row+':'+across);
     }
     checked++;
    }
    geometry.dispose();material.dispose();
   }
   // The under-bank overlap must end with the bank, not become an exposed
   // rectangular apron in the receiving pool or across the open entrance.
   for(const row of [0,360])for(const side of [-1,1]){
    const p=new T.Vector3().fromBufferAttribute(shell.floor.attributes.position,row*9+(side===1?8:0)),s=data.samples[Math.round(row/360*600)];
    assert.ok(Math.abs(p.clone().sub(s.p).dot(s.right)-side*spec.radius)<1e-4,spec.kind+' protruding bed at open mouth');
   }
   water.dispose();shell.floor.dispose();shell.walls.forEach(g=>g.dispose());
  }
 }assert.ok(checked>1000);
});

test('every activity retains its authored phase instead of inheriting the spline sampler generic ride label',()=>{
 for(const spec of SHOWCASE_WATER_RIDES){const route=createShowcaseRoute(spec);for(const leg of route.legs){assert.equal(route.vehicleFrame(leg.start+leg.duration*.5).phase,leg.phase,spec.kind+':'+leg.phase);}}
});

test('rider choreography is shared fixed data; playing, pausing and seeking never reevaluate a route or mutate the table',()=>{
 const spec=SHOWCASE_WATER_RIDES.find(s=>s.kind==='canyon-rafting'),route=createShowcaseRoute(spec);let calls=0;
 const lane={...route.lanes[0],frame:t=>{calls++;return route.lanes[0].frame(t);}},measured={...route,vehicleFrame:t=>{calls++;return route.vehicleFrame(t);}},profile=sampleShowcaseActing(lane,route.duration,spec,measured),initial=calls,rows=profile.poseRows.slice(),out={};
 for(let i=0;i<2000;i++)assert.equal(showcaseActingFrame(profile,i/2000*route.duration,false,out),out);
 assert.equal(calls,initial);assert.deepEqual(profile.poseRows,rows);assert.ok(profile.count<=512);
 const t=route.rideStart+9,at={...showcaseActingFrame(profile,t)};showcaseActingFrame(profile,route.duration-.2);assert.deepEqual(showcaseActingFrame(profile,t),at);
 const reduced=showcaseActingFrame(profile,t,true);for(const [k,v]of Object.entries(reduced))if(!['ride','speed','height','turnForce'].includes(k))assert.equal(v,0,k);
});

test('all eight rides move native heads and paws through readable multiple beats, with smooth seat-boundary poses and independent group gestures',()=>{
 const cat=createCat('happy',{detail:'npc'});
 try{for(const spec of SHOWCASE_WATER_RIDES){const route=createShowcaseRoute(spec),profiles=route.lanes.map((l,i)=>sampleShowcaseActing(l,route.duration,spec,route,i)),leg=route.legs.find(l=>['ride','rafting','drop','flight','surf','float','carousel','swing'].includes(l.phase)),heads=[],paws=[];
  for(let i=1;i<40;i++){
   const t=leg.start+i/40*leg.duration,reaction=showcaseActingFrame(profiles[0],t);animateCat(cat,t,false);reactCat(cat,reaction);applyAtollSit(cat,reaction);
   heads.push(cat.userData.head.rotation.y);paws.push(cat.userData.legs.find(l=>l.position.z>0).rotation.x);
  }
  assert.ok(Math.max(...heads)-Math.min(...heads)>.12,spec.kind+' head stays rigid');
  assert.ok(Math.max(...paws)-Math.min(...paws)>.12,spec.kind+' paws stay rigid');
  for(let t=0;t<route.duration;t+=.067){const a=showcaseActingFrame(profiles[0],t),b=showcaseActingFrame(profiles[0],t+.0001);
   for(const key of ['headRoll','headYaw','paw','waterProne','waterSurf','rideSit'])assert.ok(Math.abs(a[key]-b[key])<.005,spec.kind+' pose discontinuity: '+key);
  }
  if(spec.seats>1){let difference=0;for(let u=.1;u<.95;u+=.03){const t=leg.start+u*leg.duration,a=showcaseActingFrame(profiles[0],t),b=showcaseActingFrame(profiles[1],t);difference=Math.max(difference,Math.abs(a.headYaw-b.headYaw),Math.abs(a.paw-b.paw));}assert.ok(difference>.1,spec.kind+' passengers mirror each other');}
 }}finally{disposeCat(cat);}
});
