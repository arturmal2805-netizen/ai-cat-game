import test from "node:test";
import assert from "node:assert/strict";
import {createFrameSamples, createFrameProfile, createProfilePause, trackProfileUploads} from "../public/frame-profile.js";

test("local frame reports separate CPU, render submission and GPU waits with a bounded window",()=>{
  const p=createFrameSamples(30);
  for(let i=0;i<100;i++)p.frame({at:i*20,cpu:3,render:7,cats:12,biome:"moon",dpr:2});
  p.blocked("gpu",2);p.blocked("gpu",3);p.queue(1);p.delay(12);p.delay(9);
  const r=p.report();assert.equal(r.samples,30);assert.equal(r.fps,50);assert.equal(r.gapP95,20);
  assert.equal(r.cpuMedian,3);assert.equal(r.renderMedian,7);assert.equal(r.gpuWaitCallbacksSinceReset,2);
  assert.equal(r.queueCpuTotalSinceReset,6);assert.equal(r.queueCpuMaxSinceReset,3);assert.equal(r.eventLoopDelayMax,12);
  r.last.cats=99;assert.equal(p.report().last.cats,12,"reports do not expose mutable internal rows");
  p.clear();p.frame({at:50000,cpu:2,render:5});assert.equal(p.report().gapMax,null);assert.equal(p.report().gpuWaitCallbacksSinceReset,0);
});

test("ordinary play never allocates a diagnostic panel or reads browser resources",()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,"location");
  globalThis.location={search:"?update=test"};
  try {
    assert.equal(createFrameProfile(),null);
    globalThis.location.search="?pauseAfter=5";
    assert.equal(createFrameProfile(),null,"a diagnostic deadline must never enable itself in ordinary play");
  }
  finally { if(previous)Object.defineProperty(globalThis,"location",previous);else delete globalThis.location; }
});

test("a bounded local profile pauses despite late callbacks, preserves one stop event and can resume",()=>{
  let now=1000;const events=[];
  const p=createProfilePause({seconds:15,clock:()=>now,onChange:s=>events.push(s)});
  now=15999;assert.equal(p.suspended,false);
  now=31000;assert.equal(p.suspended,true,"checking the deadline must not need a timely RAF or timer callback");
  p.stop();assert.equal(p.suspended,true);assert.deepEqual(events,[true]);
  p.resume();assert.equal(p.suspended,false);assert.deepEqual(events,[true,false]);
  now=46000;assert.equal(p.suspended,true);assert.deepEqual(events,[true,false,true]);
  const normal=createProfilePause({clock:()=>now});now=1e12;
  assert.equal(normal.suspended,false,"no automatic pause without the explicit diagnostic deadline");
  normal.stop();assert.equal(normal.suspended,true);normal.resume();assert.equal(normal.suspended,false);
});

test("local upload counters preserve GL arguments, account for typed offsets and release their hooks",()=>{
  const calls=[],gl={bufferData(...a){calls.push(a);return 7;},bufferSubData(...a){calls.push(a);}};
  const original=gl.bufferData,p=trackProfileUploads(gl),a=new Float32Array(10);
  assert.equal(gl.bufferData(1,100,2),7);
  gl.bufferData(1,a,2,2,3);gl.bufferData(1,a,2,4,0);gl.bufferSubData(1,8,a,1,2);
  assert.deepEqual(p.snapshot(),{dataCalls:3,dataBytes:136,subCalls:1,subBytes:8});
  assert.equal(calls[1][1],a);assert.deepEqual(calls[1],[1,a,2,2,3]);
  const copy=p.snapshot();copy.dataBytes=0;assert.equal(p.snapshot().dataBytes,136);
  p.clear();assert.equal(p.snapshot().dataCalls,0);p.dispose();assert.equal(gl.bufferData,original);
});
