import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function auditSpaceJump({page,review,errors,httpErrors}){
  await page.evaluate(()=>{const q=__lagoonQA;q.drawPaused=true;q.manualFrames=true;q.reviewHour=12;});
  await page.locator('#chichi-control').click();
  await page.waitForFunction(()=>__lagoonQA.manualWalk().active);
  assert(await page.evaluate(()=>__lagoonQA.manualWalk().active),'real control button');
  const initial=await page.evaluate(()=>({position:__lagoonQA.chichiCarrier.position.toArray(),scroll:scrollY}));
  const step=async n=>page.evaluate(n=>{const q=__lagoonQA,frames=[];for(let i=0;i<n;i++){q.testNow=Math.max(q.testNow||0,performance.now())+1000/60;q.gpuFrames.clear();q.manualStepping=true;try{q.step(q.testNow);}finally{q.manualStepping=false;}frames.push({position:q.chichiCarrier.position.toArray(),diagnostics:q.manualWalk().jumpDiagnostics,safe:q.manualWalk().safePosition?.toArray(),active:q.manualWalk().active});}return frames;},n);
  await page.keyboard.down('Space');
  const ascent=await step(18);assert(ascent.at(-1).position[1]>initial.position[1]+1);
  assert.equal(ascent.at(-1).diagnostics.launches,1);assert.equal(ascent.at(-1).safe[1],initial.position[1]);
  await page.evaluate(()=>{__lagoonQA.drawFrame();__lagoonQA.renderer.getContext().finish();});
  await page.screenshot({path:join(review,'space-airborne.png')});
  const held=await step(125);assert(!held.at(-1).diagnostics.airborne);assert.equal(held.at(-1).diagnostics.launches,1);
  assert(Math.abs(held.at(-1).position[1]-initial.position[1])<1e-6);
  await page.keyboard.up('Space');await step(1);
  await page.keyboard.press('Space');const tap=await step(10);assert.equal(tap.at(-1).diagnostics.launches,2);
  await page.keyboard.press('Space');const twice=await step(5);assert.equal(twice.at(-1).diagnostics.launches,2);
  await page.keyboard.press('Escape');const exit=await step(120);assert(!exit.at(-1).active);assert(!exit.at(-1).diagnostics.airborne);
  assert.equal(await page.evaluate(()=>scrollY),initial.scroll,'Space does not scroll while controlling Chichi');
  await page.evaluate(()=>__lagoonQA.drawFrame());await page.screenshot({path:join(review,'space-landed-release.png')});
  const result={initial,ascent,held,tap,twice,exit,realKeyboard:true,realNativeModel:true,errors,httpErrors};
  await writeFile(join(review,'space-jump.json'),JSON.stringify(result,null,2));
  assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
  console.log('PASS native Space / held / quick tap / no double jump / safe ground / Escape gravity / no scroll');
}
