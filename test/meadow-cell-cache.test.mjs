import test from 'node:test';import assert from 'node:assert/strict';
import {createMeadowCellCache} from '../public/meadow-cell-cache.js';
const tick=()=>new Promise(setImmediate),cell=key=>({key}),model=id=>({id,visible:true,removeFromParent(){}});
test('coalesces desired cells, respects pending and resident caps, and evicts idle models before attachment',async()=>{
 const builds=[],released=[],attached=[];
 const cache=createMeadowCellCache({maxResident:3,maxPending:2,prepare:c=>new Promise(resolve=>builds.push({c,resolve})),release:m=>released.push(m.id),onReady:m=>attached.push(m.id)});
 cache.update([cell('a'),cell('b'),cell('a'),cell('c')]);cache.update([cell('a'),cell('b'),cell('c')]);assert.equal(builds.length,2);assert.equal(cache.snapshot().pending,2);
 builds[0].resolve(model('a'));builds[1].resolve(model('b'));await tick();assert.equal(builds.length,3);builds[2].resolve(model('c'));await tick();assert.equal(cache.snapshot().resident,3);cache.update([cell('a'),cell('b'),cell('c')]);assert.equal(builds.length,3);
 cache.update([cell('d'),cell('e'),cell('f')]);assert.equal(builds.length,5);builds[3].resolve(model('d'));builds[4].resolve(model('e'));await tick();assert.equal(builds.length,6);builds[5].resolve(model('f'));await tick();
 assert.equal(cache.snapshot().resident,3);assert.equal(cache.snapshot().peakResident,3);assert.equal(cache.snapshot().peakPending,2);assert.deepEqual(released,['a','b','c']);assert.deepEqual(attached,['a','b','c','d','e','f']);cache.dispose();assert.equal(released.length,6);
});
test('stale builds and warmups cannot attach after travel or disposal and release each late model once',async()=>{
 const builds=[],warms=[],released=[],attached=[];
 const cache=createMeadowCellCache({maxPending:2,prepare:(c,o)=>new Promise(resolve=>builds.push({c,o,resolve})),warm:(m,o)=>new Promise(resolve=>warms.push({m,o,resolve})),release:m=>released.push(m.id),onReady:m=>attached.push(m.id)});
 cache.update([cell('a'),cell('b')]);builds[0].resolve(model('a'));await tick();assert.equal(warms.length,1);
 cache.update([cell('c')]);assert.equal(builds[0].o.signal.aborted,true);assert.equal(warms[0].o.needed(),false);warms[0].resolve();builds[1].resolve(model('b'));await tick();assert.deepEqual(released.sort(),['a','b']);assert.equal(builds.length,3);
 builds[2].resolve(model('c'));await tick();cache.dispose();cache.dispose();assert.equal(warms[1].o.needed(),false);warms[1].resolve();await tick();assert.deepEqual(attached,[]);assert.deepEqual(released.sort(),['a','b','c']);assert.equal(cache.snapshot().resident,0);assert.equal(cache.snapshot().pending,0);
});
test('empty cells and failures remain bounded and never cause immediate retry loops',async()=>{
 let builds=0;const cache=createMeadowCellCache({maxResident:2,maxPending:1,prepare:async c=>{builds++;if(c.key==='bad')throw Error('Unavailable');return null;},release:()=>{}});
 for(let i=0;i<12;i++){cache.update([cell('empty-'+i)]);await tick();}
 assert.ok(cache.snapshot().empty<=4);cache.update([cell('bad')]);await tick();assert.equal(cache.snapshot().failures,1);const after=builds;for(let i=0;i<8;i++)cache.update([cell('bad')]);await tick();assert.equal(builds,after);cache.update([]);cache.update([cell('bad')]);await tick();assert.equal(builds,after+1);cache.dispose();
});
