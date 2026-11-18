import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {byBiome} from '../public/game-data.js';
import {resortSpaOrigin} from '../public/resort-spa-data.js';
import {RESORT_LIFT as L} from '../public/resort-spa-lift.js';

export async function auditResortReload({page,review}){
 const centre=resortSpaOrigin(byBiome('autumn').center);
 const step=()=>page.evaluate(()=>{const q=__lagoonQA;for(let i=0;i<10;i++){q.appointmentClock=Math.max(performance.now(),q.appointmentClock||0)+100;q.gpuFrames.clear();q.manualStepping=true;try{q.step(q.appointmentClock);}finally{q.manualStepping=false;}}const r=q.resortSpa();return{active:r.has('chichi'),lift:{...r.transit.lift.state},position:q.chichiCarrier.position.toArray(),passengers:r.transit.lift.passengers.size};});
 await page.evaluate(async({centre,L})=>{if(!await __lagoonSaveQA.cloud.claimEditor())throw Error('Private editor unavailable');const q=__lagoonQA;q.manualFrames=true;q.drawPaused=true;q.jobs.cancel('chichi');q.chichiCarrier.position.set(centre[0],L.upperY,centre[1]+309);if(!q.resortSpa().startReady('chichi','resort-massage'))throw Error('Appointment did not start');},{centre,L});
 let saved;
 for(let i=0;i<150;i++){const s=await step();if(s.lift.phase==='travelling'&&s.lift.y<-60){saved=s;break;}}
 assert(saved,'Actual cabin must descend before reload');
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 await page.waitForFunction(()=>!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.dirty&&!__lagoonSaveQA.cloud.retryEntry,null,{timeout:120000});
 const durable=await page.evaluate(()=>{const g=__lagoonSaveQA.getGame();return{location:g.catLocations.chichi,coins:g.jobCity.profiles.chichi.coins,worldCoins:g.coins,inventory:g.inventory,receipts:g.jobCity.profiles.chichi.mall?.receipts||{}};});
 assert.equal(durable.location.y,saved.position[1]);assert.equal(durable.coins,2000);
 // Freeze only the instrumented QA animation clock from its first assignment;
 // cooperative scene/shader preparation remains asynchronous and unmodified.
 await page.addInitScript(()=>{let qa;Object.defineProperty(window,'__lagoonQA',{configurable:true,get:()=>qa,set(value){qa=value;value.manualFrames=true;value.drawPaused=true;}});});
 await page.reload();
 const progress=setInterval(()=>console.log('SPA cold lift reload: required preparation pending'),15000);
 try{await page.waitForFunction(()=>window.__lagoonQA&&__lagoonSaveQA.cloud.editable&&__lagoonQA.resortSpa()?.ready,null,{timeout:240000});}finally{clearInterval(progress);}
 const restored=await page.evaluate(()=>{const q=__lagoonQA,r=q.resortSpa();return{active:r.has('chichi'),lift:{...r.transit.lift.state},position:q.chichiCarrier.position.toArray()};});
 assert(restored.active);assert.equal(restored.lift.y,saved.lift.y);assert.equal(restored.lift.door,0);assert.deepEqual(restored.position,saved.position);
 let exited;
 for(let i=0;i<220;i++){const s=await step();if(!s.active){exited=s;break;}}
 assert(exited,'Restored actor must walk out of the upper landing');assert.equal(exited.passengers,0);assert(Math.abs(exited.position[1]-L.upperY)<.05);assert(exited.position[2]>centre[1]+L.z+L.radius);
 await page.locator('#camera-all').click();
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 await page.waitForFunction(()=>!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.dirty&&!__lagoonSaveQA.cloud.retryEntry,null,{timeout:120000});
 await page.reload();await page.waitForFunction(()=>window.__lagoonQA&&__lagoonSaveQA.cloud.editable,null,{timeout:240000});
 const final=await page.evaluate(()=>{const q=__lagoonQA,g=__lagoonSaveQA.getGame();return{active:q.resortSpa()?.has('chichi'),position:q.chichiCarrier.position.toArray(),coins:g.jobCity.profiles.chichi.coins,worldCoins:g.coins,inventory:g.inventory,receipts:g.jobCity.profiles.chichi.mall?.receipts||{}};});
 assert(!final.active);assert(Math.abs(final.position[1]-L.upperY)<.05);for(const key of ['coins','worldCoins','inventory','receipts'])assert.deepEqual(final[key],durable[key]);
 await writeFile(join(review,'actual-cold-lift-reload.json'),JSON.stringify({scope:'Actual native private SQLite mid-descent save, cold model/shader loading, exact cabin restoration, continuous physical return/exit, World release and second reload; not mid-procedure or phone acceptance.',saved,durable,restored,exited,final},null,2));
 console.log('PASS cold SQLite lift reload, exact cabin height, physical return and second reload');
}
