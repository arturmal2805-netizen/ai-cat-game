import test from 'node:test';
import assert from 'node:assert/strict';
import {createGpuProfile} from '../public/gpu-profile.js';

test('GPU profiling polls availability without waiting, reuses a bounded pool and rejects disjoint results',()=>{
  let created=0,active=null,reads=0,disjoint=false;const ready=new Set(),deleted=[];
  const gl={QUERY_RESULT_AVAILABLE:1,QUERY_RESULT:2,getExtension:()=>({TIME_ELAPSED_EXT:3,GPU_DISJOINT_EXT:4}),
    createQuery:()=>({id:++created}),beginQuery(t,q){assert.equal(active,null);ready.delete(q);active=q;},
    endQuery(){active=null;},getQueryParameter(q,p){if(p===1)return ready.has(q);assert.ok(ready.has(q));return q.id*1e6;},
    getParameter(){reads++;return disjoint;},deleteQuery(q){deleted.push(q);}};
  const p=createGpuProfile(gl,{limit:2});p.begin();const a=active;p.end();p.begin();const b=active;p.end();p.begin();
  assert.equal(created,2);assert.equal(active,null);assert.equal(reads,0);
  ready.add(a);p.begin();assert.equal(active,a);p.end();assert.equal(created,2);ready.add(b);ready.add(a);
  const r=p.report();assert.equal(r.supported,true);assert.equal(r.samples,3);assert.equal(reads,1);
  assert.equal(r.medianMs,1);assert.equal(r.maxMs,2);
  disjoint=true;assert.equal(p.report().samples,0);assert.ok(deleted.length>=2);
  p.dispose();assert.equal(p.report().supported,false);
});

test('unsupported GPU timers do no work',()=>{
  const p=createGpuProfile({getExtension:()=>null});p.begin();p.end();p.clear();
  assert.deepEqual(p.report(),{supported:false,samples:0});p.dispose();
});
