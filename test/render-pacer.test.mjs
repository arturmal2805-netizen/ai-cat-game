import { test } from "node:test";
import assert from "node:assert/strict";
import { createRenderPacer } from "../public/render-pacer.js";

test("jittered 60 Hz callbacks retain 30 target frames per second without restarting the interval after each delay", () => {
  const due = createRenderPacer();
  let frames = 0;
  for (let i = 0; i < 3600; i++) {
    const now = (i * 1000) / 60 + [-1, 1, -1.5, 1.5][i % 4];
    if (due(now, 1000 / 30)) frames++;
  }
  assert.ok(frames >= 1798 && frames <= 1802, frames);
});
test("camera, offscreen and viewport transitions draw immediately while a long pause never creates a GPU catch-up burst", () => {
  const due = createRenderPacer();
  assert.equal(due(100, 1000 / 30), true);
  assert.equal(due(101, 1000 / 30), false);
  assert.equal(due(102, 1000 / 60), true);
  assert.equal(due(103, 1000 / 60), false);
  assert.equal(due(104, 1000 / 60, true), true);
  assert.equal(due(1100, 1000 / 60), true);
  assert.equal(due(1100, 1000 / 60), false);
  assert.equal(due(1101, 100), true);
  assert.equal(due(1150, 100), false);
});

test('60 FPS survives every starting phase of a jittered 60 Hz display without alternate-frame drops',()=>{
 for(const pattern of [[1.5,-1.5],[1,-1,2,-2],[0,.8,-.8,1.4,-1.4]])for(let phase=0;phase<pattern.length;phase++){
  const due=createRenderPacer();let frames=0;
  for(let i=0;i<3600;i++)if(due(i*1000/60+pattern[(i+phase)%pattern.length],1000/60))frames++;
  assert.ok(frames>=3598&&frames<=3600,`${JSON.stringify(pattern)} phase ${phase}: ${frames} frames`);
 }
});

test('the jitter allowance retains 60/30/10 Hz limits on faster displays and never emits a catch-up burst',()=>{
 for(const rafHz of [60,90,120,144,240])for(const target of [10,30,60]){
  const due=createRenderPacer(),times=[];
  for(let i=0;i<rafHz*10;i++){
   const now=i*1000/rafHz+[1.5,-1.5][i%2];
   if(due(now,1000/target))times.push(now);
   assert.equal(due(now,1000/target),false,'duplicate callbacks cannot submit another frame');
  }
  assert.ok(Math.abs(times.length-target*10)<=1,`${rafHz} Hz / target ${target}: ${times.length}`);
  assert.ok(times.slice(1).every((t,i)=>t>times[i]));
 }
});
