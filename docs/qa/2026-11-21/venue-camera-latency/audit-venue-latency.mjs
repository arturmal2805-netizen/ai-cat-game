import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
export async function auditVenueLatency({page,review,errors,httpErrors}){
 await page.evaluate(()=>{const q=__lagoonQA;q.drawPaused=true;q.freeze=false;q.reviewHour=12;document.querySelector('[data-biome="autumn"]').click();globalThis.__venueEvents=[];document.addEventListener('click',e=>{if(e.target.closest('.venue-access')){const t=performance.now(),target=e.target.closest('.venue-access').dataset.venue;queueMicrotask(()=>__venueEvents.push({target,handlerMs:performance.now()-t}));}},true);});
 await page.locator('.resort-spa-access').waitFor({state:'visible',timeout:180000});
 const cold=await page.evaluate(()=>{const q=__lagoonQA;globalThis.__venueStart=performance.now();return{ready:q.resortSpa().ready,pending:{...q.shaderWarmup.stats}};});
 await page.locator('.resort-spa-access').click();
 await page.waitForFunction(()=>__lagoonQA.resortSpa().inspection,null,{timeout:300000});
 cold.selectedMs=await page.evaluate(()=>performance.now()-__venueStart);console.log('VENUE_COLD_SPA',JSON.stringify(cold));
 await page.evaluate(async()=>{await Promise.all([__lagoonQA.mall().ensure(),__lagoonQA.resortSpa().ensure()]);});
 await page.waitForFunction(()=>!__lagoonQA.islands.get('autumn').userData.lowOnly&&__lagoonQA.shaderWarmup.idle(),null,{timeout:600000});
 const client=await page.context().newCDPSession(page);await client.send('Profiler.enable');await client.send('Profiler.start');
 const rows=[];
 for(const selector of ['.warehouse-access','.mall-access','.resort-spa-access','.warehouse-access','.warehouse-access']){
  await page.locator('#camera-island').click();
  const before=await page.evaluate(()=>({now:performance.now(),look:__lagoonQA.desiredLook.toArray()}));
  await page.locator(selector).click();
  const row=await page.evaluate(({selector,before})=>({selector,dispatchToEvaluateMs:performance.now()-before.now,look:__lagoonQA.desiredLook.toArray(),event:__venueEvents.at(-1),mall:__lagoonQA.mall().inspection,spa:__lagoonQA.resortSpa().inspection}),{selector,before});rows.push(row);console.log('VENUE_HOT',JSON.stringify(row));
 }
 const profile=(await client.send('Profiler.stop')).profile;await writeFile(join(review,'venue-click.cpuprofile'),JSON.stringify(profile));await client.detach();
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);await writeFile(join(review,'venue-latency.json'),JSON.stringify({cold,rows,errors,httpErrors,scope:'Actual product toolbar clicks with native preparation and camera owners; draw paused only in QA. Handler attribution, not physical device latency/FPS.'},null,2));
}
