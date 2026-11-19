import test from 'node:test';import assert from 'node:assert/strict';
import {resortSpaModelSteps} from '../public/resort-spa-model.js';
import {createResortSpaNavigation} from '../public/resort-spa-navigation.js';
import {createResortPoolNavigation} from '../public/resort-spa-pool-navigation.js';
import {spaV7Seat,spaV7Service,SPA_V7_RUNTIME_CONTRACT} from '../public/resort-spa-services-v7.js';
import {createResortSpaRuntime} from '../public/resort-spa-runtime.js';
test('all fourteen actual palace pools retain full-body entry, procedure, physical exit and supported return across coping seams',()=>{
 let s,it=resortSpaModelSteps({layoutVersion:7});while(!(s=it.next()).done);const root=s.value;
 try{const nav=createResortSpaNavigation(root),loc=p=>({...p,y:p.y+165}),abs=p=>({...p,y:p.y-165}),covered=new Set();
 for(const[key,slots]of [['thermal',[0,12]],['vip',[0,4,6,8,12,14,16,17]],['cafe',[1,3,5,7]]])for(const slot of slots){const id='resort-'+key,c=spaV7Seat(spaV7Service(id),slot),runtime=createResortSpaRuntime({contract:SPA_V7_RUNTIME_CONTRACT,route:(a,b,r)=>nav.path(loc(a),loc(b),r)?.map(abs),segmentClear:(a,b,r)=>nav.segmentClear(loc(a),loc(b),r),poolNavigation:createResortPoolNavigation(()=>nav),onPurchase:()=> 'original-receipt',onUse:()=>true}),phases=new Set();let result;runtime.start({catId:'a',zoneId:id,position:c.approach});for(let i=0;i<2500&&runtime.has('a');i++){const v=runtime.get('a');phases.add(v.phase);covered.add(v.contact?.pool?.id);result={...v.position};runtime.step(.1);}assert(!runtime.has('a'),c.pool.id+' must physically exit and return');assert(phases.has('procedure')&&phases.has('wet-shake'),c.pool.id);assert(Math.hypot(result.x-c.approach.x,result.y-c.approach.y,result.z-c.approach.z)<.05);}
 assert.equal(covered.size,14);
 }finally{root.userData.dispose();}
});
