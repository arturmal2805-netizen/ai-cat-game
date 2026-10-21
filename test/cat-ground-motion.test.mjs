import test from 'node:test';
import assert from 'node:assert/strict';
import {stepCatGround} from '../public/cat-ground-motion.js';
const plots=[{biome:'homestead',x:100,z:40,w:26,d:28}];
test('new construction around an idle cat permits a continuous walking escape at every body size and slow frame',()=>{
 for(const radius of [.2,.6,1.8])for(const dt of [.016,.033,.1]){
  let p={x:100,z:40};
  for(let i=0;i<3000;i++){
   const next=stepCatGround(p.x,p.z,0,0,dt,plots,'homestead',radius);
   assert.ok(Math.hypot(next.x-p.x,next.z-p.z)<=3.5*dt+1e-8);
   p=next;
  }
  assert.ok(Math.abs(p.x-100)>=13+radius+.079||Math.abs(p.z-40)>=14+radius+.079);
 }
});
test('walkers outside a complex cannot cross its edge or diagonal corner, and can always walk away from a boundary',()=>{
 for(const radius of [.2,.6,1.8])for(const from of [[80,40],[100,20],[84,23]]){
  let p={x:from[0],z:from[1]};
  for(let i=0;i<300;i++){
   p=stepCatGround(p.x,p.z,100,40,.1,plots,'homestead',radius);
   assert.ok(Math.abs(p.x-100)>=13+radius+.079||Math.abs(p.z-40)>=14+radius+.079);
  }
  const out=stepCatGround(p.x,p.z,50,0,.1,plots,'homestead',radius);
  assert.ok(Math.hypot(out.x-100,out.z-40)>Math.hypot(p.x-100,p.z-40));
 }
});
test('restored distant cats keep walking speed while close wandering retains its exact easing and other islands stay untouched',()=>{
 const p=stepCatGround(200,0,0,0,.1,[],'homestead',.6);assert.equal(p.x,199.65);
 assert.deepEqual(stepCatGround(1,2,2,3,.016,plots,'moon',.6),{x:1+.016*.8,z:2+.016*.8});
});
