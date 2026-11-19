import test from 'node:test';
import assert from 'node:assert/strict';
import {resortSpaModelSteps} from '../public/resort-spa-model.js';
import {resortZone,resortSpaSeat,RESORT_SPA as S} from '../public/resort-spa-data.js';
import {createResortSpaNavigation} from '../public/resort-spa-navigation.js';
import {createResortPoolNavigation} from '../public/resort-spa-pool-navigation.js';
import {createResortSpaRuntime} from '../public/resort-spa-runtime.js';
const local=p=>({...p,y:p.y-S.y}),absolute=p=>({...p,y:p.y+S.y});
function scene(){const it=resortSpaModelSteps();let r;do{r=it.next();}while(!r.done);const root=r.value,nav=createResortSpaNavigation(root),water=createResortPoolNavigation(()=>nav);return{root,nav,water};}
function runtime(nav,water,onComplete){return createResortSpaRuntime({route:(a,b,r)=>nav.path(local(a),local(b),r)?.map(absolute),segmentClear:(a,b,r)=>nav.segmentClear(local(a),local(b),r),poolNavigation:water,onPurchase:()=> 'cafe-ticket',onUse:()=>true,onComplete});}
test('four Cafe water tables have real floor holes, body-blocking furniture and complete eating/stair/return paths',()=>{
 const {root,nav,water}=scene(),zone=resortZone('resort-cafe');
 for(const slot of [0,2,4,6])assert(!resortSpaSeat(zone,slot).pool,'dry table retained '+slot);
 for(const slot of [1,3,5,7]){
  const c=resortSpaSeat(zone,slot),origin={...c.approach,z:c.approach.z+.8};let result;
  assert(c.pool&&c.table);assert.equal(nav.support({x:c.pool.x-2,y:9.012,z:c.pool.z},.571),null,'pool opening is not painted over floor');
  assert(!water.swimClear({x:c.table.x,y:c.y,z:c.table.z},c.pool,.571),'table actually blocks swimmer');
  const r=runtime(nav,water,(id,v)=>result=v),phases=new Set(),actions=new Set();assert(r.start({catId:'chichi',zoneId:zone.id,position:origin}));assert.equal(r.get('chichi').slot,slot);
  for(let i=0;i<1800&&r.has('chichi');i++){r.step(.1);const f=r.frame('chichi');if(f){phases.add(f.phase);actions.add(f.action);}}
  assert(!r.has('chichi'),JSON.stringify({slot,visit:r.get('chichi')}));assert(result.completed);assert.deepEqual(result.position,origin);
  for(const phase of ['wet-enter','wet-float','wet-swim','procedure','wet-return','wet-land','wet-exit','wet-shake'])assert(phases.has(phase),slot+': '+phase);
  for(const action of ['drink','lick-lips','taste-treat'])assert(actions.has(action),slot+': '+action);
 }
 root.userData.dispose();
});
test('Cafe cancellation reverses only physically reached water waypoints and does not consume an interrupted ticket',()=>{
 const {root,nav,water}=scene(),zone=resortZone('resort-cafe'),c=resortSpaSeat(zone,1);
 for(const stage of ['wet-float','wet-swim','procedure']){
  const origin={...c.approach,z:c.approach.z+.8};let result,uses=0;
  const r=createResortSpaRuntime({route:(a,b,rad)=>nav.path(local(a),local(b),rad)?.map(absolute),segmentClear:(a,b,rad)=>nav.segmentClear(local(a),local(b),rad),poolNavigation:water,onPurchase:()=> 'paid-cafe',onUse:()=>{uses++;return true;},onComplete:(id,v)=>result=v});
  assert(r.start({catId:'chichi',zoneId:zone.id,position:origin}));let cancelled=false;
  for(let i=0;i<1800&&r.has('chichi');i++){r.step(.1);const v=r.get('chichi');if(v&&!cancelled&&v.phase===stage&&(stage!=='wet-swim'||v.poolRouteIndex===1)){r.cancel('chichi');cancelled=true;}}
  assert(cancelled,stage);assert(!r.has('chichi'),stage+' must physically exit');assert.equal(uses,0);assert.equal(result.completed,false);assert.equal(result.receipt,'paid-cafe');assert.deepEqual(result.position,origin);
 }
 root.userData.dispose();
});
