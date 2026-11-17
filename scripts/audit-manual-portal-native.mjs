import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function auditManualPortal({page,review,errors,httpErrors}){
 await page.evaluate(async()=>{__lagoonQA.drawPaused=true;await __lagoonQA.mall().ensure();});
 await page.evaluate(()=>{__lagoonQA.manualFrames=true;__lagoonQA.submarine().update(.05,7);});
 const button=page.locator('[data-chichi-door]');assert.equal(await button.isVisible(),true,'desktop has a contextual actual-door interaction');assert.equal(await page.locator('.submarine-panel').isVisible(),false,'desktop directional overlay stays hidden');await button.click();await page.waitForFunction(()=>__lagoonQA.submarine().phase==='airlock');
 const transit=async phase=>{const frames=await page.evaluate(phase=>{const q=__lagoonQA;for(let i=0;i<300;i++){q.submarine().update(.1,8+i*.1);if(q.submarine().phase===phase)return i;}throw Error('Actual airlock did not reach '+phase);},phase);assert.ok(frames>80);return frames;};
 const entry=await transit('mall');assert.equal(await page.evaluate(()=>__lagoonQA.submarine().explorer.mode),'mall');assert.match(await button.textContent(),/Выйти/);
 const before=await page.evaluate(()=>({...__lagoonQA.submarine().explorer}));await page.keyboard.down('KeyW');await page.evaluate(()=>{for(let i=0;i<4;i++){__lagoonQA.submarine().update(.05,50+i*.05);__lagoonQA.submarine().updateCamera(.05);}});await page.keyboard.up('KeyW');const walked=await page.evaluate(()=>({...__lagoonQA.submarine().explorer}));assert.ok(Math.hypot(walked.x-before.x,walked.z-before.z)>.3,'actual walk inside after entry');assert.equal(walked.mode,'mall');
 await button.click();await page.waitForFunction(()=>__lagoonQA.submarine().phase==='airlock');const exit=await transit('swimming');await page.locator('#camera-all').click();assert.equal(await page.evaluate(()=>__lagoonQA.submarine().controlled),false);assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);await writeFile(join(review,'portal.json'),JSON.stringify({entry,exit,before,walked,desktopMovementOverlayHidden:true,actualContextualButton:true,worldReleased:true,errors,httpErrors},null,2));console.log('PASS actual desktop door button, sequential entry, real interior walking, sequential exit and World release');
}
