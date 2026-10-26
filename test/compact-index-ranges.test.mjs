import test from "node:test";
import assert from "node:assert/strict";
import {compactIndexRanges} from "../scripts/compact-index-ranges.mjs";

test("experimental range compaction preserves selected intervals and bounds added offscreen work",()=>{
  let seed=431;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  for(const bytes of [2,4])for(let round=0;round<100;round++){
    const ranges=[];let cursor=0;
    for(let i=0;i<80;i++){
      const count=3*(100+random()%5000);
      ranges.push({start:cursor*bytes,count});cursor+=count+3*(random()%200);
    }
    const starts=Int32Array.from(ranges,r=>r.start),counts=Int32Array.from(ranges,r=>r.count),
      n=compactIndexRanges(starts,counts,ranges.length,bytes),
      before=ranges.reduce((s,r)=>s+r.count,0),after=counts.slice(0,n).reduce((s,c)=>s+c,0);
    assert.ok(n<=ranges.length);assert.ok(after>=before);assert.ok(after-before<=Math.floor(before*.03/3)*3);
    for(const range of ranges)assert.ok(Array.from({length:n},(_,i)=>i).some(i=>starts[i]<=range.start&&starts[i]+counts[i]*bytes>=range.start+range.count*bytes));
    for(let i=1;i<n;i++)assert.ok(starts[i]>=starts[i-1]+counts[i-1]*bytes);
    for(let i=0;i<n;i++)assert.equal(counts[i]%3,0);
  }
});

test("short-gap compaction does not bridge a large gap or spend an unavailable budget",()=>{
  const starts=new Int32Array([0,4*6099,4*12297]),counts=new Int32Array([6000,6000,6000]);
  assert.equal(compactIndexRanges(starts,counts,3,4),1);
  assert.equal(counts[0],18297);
  const a=new Int32Array([0,4*7000]),b=new Int32Array([6000,6000]);
  assert.equal(compactIndexRanges(a,b,2,4),2);
  const c=new Int32Array([0,4*800]),d=new Int32Array([600,600]);
  assert.equal(compactIndexRanges(c,d,2,4),2);
  assert.equal(compactIndexRanges(new Int32Array(),new Int32Array(),0,4),0);
});
