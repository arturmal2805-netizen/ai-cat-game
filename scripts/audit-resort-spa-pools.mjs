import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';import {join} from 'node:path';
import {byBiome} from '../public/game-data.js';import {resortSpaOrigin,resortZone,resortSpaSeat} from '../public/resort-spa-data.js';
export async function auditResortPools({page,review}){
 const centre=resortSpaOrigin(byBiome('autumn').center),results=[];
 const read=()=>page.evaluate(()=>{const g=__lagoonSaveQA.getGame(),p=g.jobCity.profiles.chichi;return{coins:p.coins,worldCoins:g.coins,inventory:g.inventory,used:p.mall?.used||{},receipts:p.mall?.receipts||{},position:__lagoonQA.chichiCarrier.position.toArray()};});
 const before=await read();assert(before.coins>=1000);
 for(const id of ['resort-thermal','resort-jacuzzi','resort-vip']){
  const zone=resortZone(id),contact=resortSpaSeat(zone,0);await page.locator('.resort-spa-zones').getByRole('button',{name:zone.name,exact:true}).click();await page.evaluate(async({centre,contact,id})=>{if(!await __lagoonSaveQA.cloud.claimEditor())throw Error('No private owner');const q=__lagoonQA;q.manualFrames=true;q.jobs.cancel('chichi');q.chichiCarrier.position.set(centre[0]+contact.approach.x,contact.approach.y,centre[1]+contact.approach.z+.8);if(!q.resortSpa().startReady('chichi',id))throw Error('Could not start '+id);},{centre,contact,id});
  const trace=[],captured=new Set();let done=false;
  for(let batch=0;batch<400;batch++){
   const frame=await page.evaluate(()=>{const q=__lagoonQA;for(let i=0;i<10;i++){q.appointmentClock=Math.max(performance.now(),q.appointmentClock||0)+100;q.gpuFrames.clear();q.manualStepping=true;try{q.step(q.appointmentClock);}finally{q.manualStepping=false;}}const f=q.resortSpa().frame('chichi');return f?{phase:f.phase,action:f.action,position:f.position,locomotion:f.locomotion}:null;});
   if(!frame){done=true;break;}if(trace.at(-1)?.phase!==frame.phase||trace.at(-1)?.action!==frame.action){trace.push(frame);console.log('Native SPA pool',id,frame.phase,frame.action);}
   const signature=id==='resort-thermal'?'water-play':id==='resort-vip'?'star-gaze':'bubble-surprise';
   if(['wet-enter','procedure','wet-shake'].includes(frame.phase)&&!captured.has(frame.phase)&&(frame.phase!=='procedure'||frame.action===signature)){
    captured.add(frame.phase);await page.evaluate(()=>{const q=__lagoonQA,p=q.chichiCarrier.position;q.reviewView(p.x,p.z,12);q.desiredLook.y=p.y+1;q.reviewOrbit(-.65,.22);q.drawPaused=false;q.gpuFrames.clear();q.appointmentClock+=100;q.manualStepping=true;try{q.step(q.appointmentClock);}finally{q.manualStepping=false;q.drawPaused=true;}});await page.screenshot({path:join(review,id+'-'+frame.phase+'.png')});
   }
  }
  const after=await read();results.push({id,done,trace,after});await writeFile(join(review,'pool-progress.json'),JSON.stringify({before,results},null,2));assert(done,id+' must physically exit and return');assert.equal(after.used[id+'-session'],1);assert(trace.some(f=>f.phase==='wet-enter'));assert(trace.some(f=>f.phase==='wet-shake'));assert(trace.some(f=>f.action===(id==='resort-thermal'?'water-play':id==='resort-vip'?'star-gaze':'bubble-surprise')));
 }
 const after=await read();assert.equal(after.coins,before.coins-1000);assert.equal(after.worldCoins,before.worldCoins);assert.deepEqual(after.inventory,before.inventory);
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.waitForFunction(()=>!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.dirty&&!__lagoonSaveQA.cloud.retryEntry,null,{timeout:120000});await page.reload();await page.waitForFunction(()=>window.__lagoonQA&&__lagoonSaveQA.cloud.editable,null,{timeout:240000});await page.evaluate(()=>{__lagoonQA.drawPaused=true;});const reloaded=await read();assert.equal(reloaded.coins,after.coins);assert.deepEqual(reloaded.used,after.used);assert.deepEqual(reloaded.receipts,after.receipts);
 await writeFile(join(review,'actual-pools-sqlite.json'),JSON.stringify({scope:'Private dry pool-rim starting fixtures. Actual native Chichi/step supports/water poses/app receipts/SQLite, not complete shore arrival/all14procedures/phone/art approval.',before,results,after,reloaded},null,2));console.log('PASS native thermal/jacuzzi/VIP entry, distinct procedures, dry exit, receipts and SQLite');
}
