import {test} from 'node:test';import assert from 'node:assert/strict';
import {resortSpaModelSteps} from '../public/resort-spa-model.js';
import {createResortSpaNavigation} from '../public/resort-spa-navigation.js';
import {createResortPoolNavigation,resortPoolBodyClear} from '../public/resort-spa-pool-navigation.js';
import {resortZone,resortSpaSeat} from '../public/resort-spa-data.js';
test('thermal, sky pool, all eight jacuzzis and VIP retain full-body stair descent/ascent and actual enclosed swimming space',()=>{
 const it=resortSpaModelSteps();let result;do{result=it.next();}while(!result.done);const root=result.value,nav=createResortSpaNavigation(root),wet=createResortPoolNavigation(()=>nav);
 for(const id of ['resort-thermal','resort-jacuzzi','resort-vip']){const zone=resortZone(id),slots=id==='resort-thermal'?[0,12]:id==='resort-jacuzzi'?Array.from({length:8},(_,i)=>i):[0];
  for(const slot of slots){const contact=resortSpaSeat(zone,slot),pool=contact.pool;let p={...contact.approach};for(const target of [contact.entry,contact.approach]){for(let i=0;i<600&&Math.abs(p.z-target.z)>.005;i++){const q={...p,z:p.z+Math.sign(target.z-p.z)*Math.min(.06,Math.abs(target.z-p.z))},hit=wet.support(q,pool,.571);assert(hit,JSON.stringify({id,slot,p,q,target}));assert(Math.abs(hit.y-p.y)<=.65);assert(resortPoolBodyClear(hit,pool,.571));p=hit;}assert(Math.abs(p.z-target.z)<.01);assert(Math.abs(p.y-target.y)<.02,JSON.stringify({id,p,target}));}
   for(let j=slot;j<Math.min(zone.seats,slot+(id==='resort-thermal'?12:4));j++){const seat=resortSpaSeat(zone,j),a={...seat.entry,y:seat.y};for(let i=0;i<=100;i++){const u=i/100,p={x:a.x+(seat.x-a.x)*u,y:seat.y,z:a.z+(seat.z-a.z)*u};assert(wet.swimClear(p,seat.pool,.571),JSON.stringify({id,j,p}));}}
   assert.equal(wet.swimClear({x:pool.x+pool.rx-.05,y:pool.y-.9,z:pool.z},pool,.571),false);assert.equal(wet.swimClear({x:pool.x,y:pool.y-2,z:pool.z},pool,.571),false);
  }
 }root.userData.dispose();
});
