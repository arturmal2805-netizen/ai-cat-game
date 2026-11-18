import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {byBiome} from '../public/game-data.js';
import {resortSpaOrigin,RESORT_SPA} from '../public/resort-spa-data.js';
export async function auditResortPhoneWalk({page,review}){
 await page.locator('.resort-spa-access').tap();await page.waitForFunction(()=>__lagoonQA.resortSpa()?.ready,null,{timeout:240000});
 const centre=resortSpaOrigin(byBiome('autumn').center);
 await page.evaluate(async({centre,y})=>{await __lagoonSaveQA.cloud.claimEditor();const q=__lagoonQA;q.manualFrames=true;q.drawPaused=true;q.jobs.cancel('chichi');q.chichiCarrier.position.set(centre[0],y+.012,centre[1]+233);},{centre,y:RESORT_SPA.y});
 await page.locator('#chichi-control').tap();assert(await page.evaluate(()=>__lagoonQA.manualWalk().active));
 if(process.env.CHICHI_RESORT_SPA_PHONE_ONLY_AUDIT)assert.equal(await page.locator('.resort-spa-zones').isVisible(),false,'manual walking releases the independent SPA inspection panel');
 const pad=page.locator('.chichi-walk-controls');assert(await pad.isVisible());const bounds=await pad.boundingBox();assert(bounds&&bounds.x>=0&&bounds.x+bounds.width<=390.5);
 const before=await page.evaluate(()=>__lagoonQA.chichiCarrier.position.toArray()),button=await pad.locator('[data-walk-key="KeyW"]').boundingBox();assert(button);
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:button.x+button.width/2,y:button.y+button.height/2}]});
 await page.evaluate(()=>{const q=__lagoonQA;for(let i=0;i<8;i++){q.appointmentClock=Math.max(performance.now(),q.appointmentClock||0)+100;q.gpuFrames.clear();q.manualStepping=true;try{q.step(q.appointmentClock);}finally{q.manualStepping=false;}}});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 const after=await page.evaluate(()=>__lagoonQA.chichiCarrier.position.toArray());assert(Math.hypot(after[0]-before[0],after[2]-before[2])>1,'Actual held touch must move native Chichi on the real SPA floor');assert(Math.abs(after[1]-before[1])<.1);
 await page.evaluate(()=>{const q=__lagoonQA;q.drawPaused=false;q.gpuFrames.clear();q.appointmentClock+=100;q.manualStepping=true;try{q.step(q.appointmentClock);}finally{q.manualStepping=false;q.drawPaused=true;}});
 await page.screenshot({path:join(review,'actual-phone-third-person-controls.png')});
 const css=await page.evaluate(async()=>{const href=document.querySelector('link[rel="stylesheet"]').href;return{href,source:await(await fetch(href)).text()};});await writeFile(join(review,'loaded-style.css'),css.source);
 await page.locator('#camera-all').tap();assert.equal(await page.evaluate(()=>__lagoonQA.manualWalk().active),false);assert.equal(await pad.isVisible(),false);
 await writeFile(join(review,'actual-phone-third-person.json'),JSON.stringify({scope:'390x844 at DPR2, native SPA hall starting fixture, actual held touch on compact movement pad, original actor/third-person camera, World release. Not a complete phone shore/all-floor walking tour or hardware FPS.',before,after,bounds},null,2));console.log('PASS actual phone SPA third-person held touch and World release');
}
