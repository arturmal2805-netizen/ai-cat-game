import test from "node:test";
import assert from "node:assert/strict";
import {createWorkSamples,activateWorkSamples,profileFunction} from "../public/work-profile.js";

test("task timings preserve receivers, results and exceptions and keep a bounded non-private trace",()=>{
  let now=0;const p=createWorkSamples({clock:()=>now,limit:3}),receiver={value:8},arg={secret:'must not retain arguments'};
  assert.equal(p.run('commit',function(a){assert.equal(a,arg);now+=80;return this.value;},receiver,[arg]),8);
  assert.throws(()=>p.run('sync',()=>{now+=150;throw Error('original');},null,[]),/original/);
  for(let i=0;i<50;i++)p.run('different-'+i,()=>{now+=51;},null,[]);
  const r=p.report();assert.ok(Object.keys(r.phases).length<=3);assert.equal(r.longest.length,12);
  assert.equal(r.phases.commit.maxMs,80);assert.equal(r.phases.sync.maxMs,150);
  assert.equal(JSON.stringify(r).includes(arg.secret),false);
  r.phases.commit.calls=99;assert.equal(p.report().phases.commit.calls,1);
  p.clear();assert.deepEqual(p.report(),{phases:{},longest:[]});
});

test("ordinary play retains original functions and opt-in wrappers use only their active diagnostic owner",()=>{
  const old=Object.getOwnPropertyDescriptor(globalThis,'location');let now=0;
  try {
    globalThis.location={search:'?update=test'};
    const fn=function(n){now+=n;return this.value;};
    assert.equal(profileFunction('work',fn),fn);
    location.search='?profile=1';const wrapped=profileFunction('work',fn),p=createWorkSamples({clock:()=>now});
    assert.equal(wrapped.call({value:7},1),7);
    const stop=activateWorkSamples(p);assert.equal(wrapped.call({value:8},50),8);
    assert.equal(p.report().phases.work.maxMs,50);stop();wrapped.call({value:4},20);
    assert.equal(p.report().phases.work.calls,1);
  } finally {if(old)Object.defineProperty(globalThis,'location',old);else delete globalThis.location;}
});
