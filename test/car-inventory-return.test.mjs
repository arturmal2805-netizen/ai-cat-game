import { test } from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../public/economy.js';
import {ensureJobCity,startCatDrive,finishCatDrive,buyCatProduct} from '../public/jobcity-system.js';
import {createJobCityRuntime,jobCatFrame} from '../public/jobcity-runtime.js';
const now=1792587600000;
test('an owned car respawns near the cat for its next trip without another purchase or a walk to old parking',()=>{
 let g=newGame(now);g.unlocked.push('jobcity');g=ensureJobCity(g,now);
 const p=g.jobCity.profiles.chichi;p.coins=10000;p.schedule={day:0,job:'rest',evening:'drive'};
 g=buyCatProduct(g,'chichi','car-peach','buy-chichi-1',now);
 g.jobCity.profiles.chichi.parkedAt={x:-16,z:-38};g.jobCity.profiles.chichi.parkedCar='car-peach';
 const wallet=g.jobCity.profiles.chichi.coins,inventory=structuredClone(g.jobCity.profiles.chichi.inventory),
  actor={id:'chichi',index:0,biome:'jobcity',local:{x:32,y:.32,z:40}},frames=new Set();
 g=startCatDrive(g,'chichi','car-peach',{x:50,z:25},now,false);
 const rt=createJobCityRuntime({onTripDone:(id,trip,position)=>{g=finishCatDrive(g,id,trip,position);}});
 for(let i=0;i<3000&&g.jobCity.profiles.chichi.trip;i++){
  rt.step(g,[actor],1/30,i/30,{now:now+420000});
  const v=rt.get('chichi');if(v){frames.add(v.phase);const f=jobCatFrame(v,i/30);actor.local={...f.position};
   if(i===0)assert.ok(Math.hypot(v.parking.x-32,v.parking.z-40)<3,'spawn at current road, not old parking');}
 }
 assert.equal(g.jobCity.profiles.chichi.trip,null);
 for(const phase of ['to-car','enter-car','drive','park','exit-car'])assert.ok(frames.has(phase),phase);
 assert.equal(rt.has('chichi'),false);
 assert.deepEqual(g.jobCity.profiles.chichi.inventory,inventory);assert.equal(g.jobCity.profiles.chichi.coins,wallet);
});
