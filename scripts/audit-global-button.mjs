import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function auditGlobalButton({page,review,errors,httpErrors}){
 await page.evaluate(()=>{__lagoonQA.drawPaused=true;});
 const snap=()=>page.evaluate(()=>{const q=__lagoonQA,s=q.submarine();return{phase:s.phase,controlled:s.controlled,explorer:s.explorer&&{...s.explorer},land:q.manualWalk().active,visible:q.cat.visible&&q.chichiCarrier.visible,position:q.chichiCarrier.position.toArray()};});
 const advance=n=>page.evaluate(n=>{const q=__lagoonQA;for(let i=0;i<n;i++){q.submarine().update(.05,performance.now()/1000+i*.05);q.submarine().updateCamera(.05);}},n);
 await page.evaluate(()=>{__lagoonQA.manualFrames=true;});
 const initial=await snap(),mall=initial.phase==='mall';
 if(mall){await page.evaluate(async()=>{await __lagoonQA.mall().ensure();});await page.locator('#chichi-control').click();assert.equal((await snap()).controlled,false);}
 else assert.equal(initial.phase,'piloting');
 await page.locator('#chichi-control').click();await page.waitForFunction(()=>__lagoonQA.submarine().controlled&&!!__lagoonQA.submarine().explorer);
 const entered=await snap();assert.equal(entered.phase,mall?'mall':'swimming');assert.equal(entered.land,false);assert.ok(entered.visible);
 await page.keyboard.down('KeyW');await advance(8);await page.keyboard.up('KeyW');const moved=await snap();assert.ok(Math.hypot(...moved.position.map((v,i)=>v-entered.position[i]))>.1);
 if(!mall){await page.keyboard.down('ArrowDown');await advance(6);await page.keyboard.up('ArrowDown');assert.ok((await snap()).explorer.y<moved.explorer.y-.3);await page.keyboard.down('Space');await advance(6);await page.keyboard.up('Space');console.log('Before reboard',await snap(),await page.evaluate(()=>__lagoonQA.submarine().snapshot()));await page.keyboard.press('KeyE');console.log('Reboard input',await snap());await advance(70);assert.equal((await snap()).phase,'piloting');await page.locator('#chichi-control').click();await page.waitForFunction(()=>__lagoonQA.submarine().phase==='swimming');}
 await page.locator('#camera-all').click();const released=await snap();assert.equal(released.controlled,false);assert.equal(released.land,false);assert.equal(await page.evaluate(()=>__lagoonQA.submarine().updateCamera(.1)),false);assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
 await writeFile(join(review,'global-button.json'),JSON.stringify({initial,entered,moved,released,errors,httpErrors,native:true,privateSQLite:true},null,2));console.log('PASS global entry button:',mall?'Mall release/resume/walk':'underwater exit/movement/dive/rise/reboard', 'and World releases camera');
}
