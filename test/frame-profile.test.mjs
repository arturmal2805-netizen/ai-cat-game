import test from "node:test";
import assert from "node:assert/strict";
import {createFrameSamples, createFrameProfile} from "../public/frame-profile.js";

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
  try { assert.equal(createFrameProfile(),null); }
  finally { if(previous)Object.defineProperty(globalThis,"location",previous);else delete globalThis.location; }
});
