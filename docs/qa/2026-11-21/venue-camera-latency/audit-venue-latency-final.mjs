import {writeFile} from 'node:fs/promises';import {join} from 'node:path';import assert from 'node:assert/strict';
export async function auditVenueLatency({page,review,errors,httpErrors}){
 page.setDefaultTimeout(15000);
 await page.evaluate(()=>{const q=__lagoonQA;q.drawPaused=true;q.freeze=false;q.reviewHour=12;document.querySelector('[data-biome="autumn"]').click();globalThis.__venueEvents=[];
  document.addEventListener('click',e=>{const button=e.target.closest('.venue-access');if(button)globalThis.__venueActive={target:button.dataset.venue,at:performance.now(),writes:[]};},true);
  for(const name of ['set','copy']){const original=q.desiredLook[name];q.desiredLook[name]=function(...args){const r=original.apply(this,args);if(globalThis.__venueActive)__venueActive.writes.push({atMs:performance.now()-__venueActive.at,value:this.toArray()});return r;};}
 });
 await page.locator('.resort-spa-access').waitFor({state:'visible',timeout:180000});
 await page.evaluate(()=>{for(const b of document.querySelectorAll('.venue-access')){const native=b.onclick;b.onclick=function(...args){const start=performance.now();try{return native.apply(this,args);}finally{__venueEvents.push({target:b.dataset.venue,handlerMs:performance.now()-start});}};}});
 const cold=await page.evaluate(()=>({ready:__lagoonQA.resortSpa().ready}));await page.locator('.resort-spa-access').click();
 Object.assign(cold,await page.evaluate(()=>({inspection:__lagoonQA.resortSpa().inspection,menu:document.querySelector('.resort-spa-zones').textContent,writes:__venueActive.writes,event:__venueEvents.at(-1)})));assert(cold.inspection);for(const retired of ['Cat Nap Galaxy','Ocean Meditation Dome','Beauty & Grooming','Sauna & Steam Palace'])assert(!cold.menu.includes(retired));assert(cold.writes.length&&cold.writes[0].atMs<100);console.log('COLD_CAMERA_IMMEDIATE',JSON.stringify(cold));
 // All commands below run while actual venue construction is still pending.
 await page.locator('.mall-access').click();assert(await page.evaluate(()=>__lagoonQA.mall().inspection));
 await page.locator('.resort-spa-access').click();assert(!(await page.evaluate(()=>__lagoonQA.mall().inspection)));
 await page.locator('#camera-random-cat').click();assert(!(await page.evaluate(()=>__lagoonQA.resortSpa().inspection)));
 await page.locator('[data-biome="autumn"]').click();
 await page.locator('#camera-island').click();const island=await page.evaluate(()=>__lagoonQA.desiredLook.toArray());
 await page.evaluate(async()=>{await Promise.all([__lagoonQA.mall().ensure(),__lagoonQA.resortSpa().ensure()]);});
 await page.waitForFunction(()=>!__lagoonQA.islands.get('autumn').userData.lowOnly&&__lagoonQA.shaderWarmup.idle(),null,{timeout:600000});
 const after=await page.evaluate(()=>({mall:__lagoonQA.mall().inspection,spa:__lagoonQA.resortSpa().inspection,look:__lagoonQA.desiredLook.toArray()}));assert(!after.mall&&!after.spa);assert.deepEqual(after.look,island);console.log('COLD_REQUEST_CANCELLATION_PASS',JSON.stringify(after));
 const rows=[];for(const selector of ['.warehouse-access','.mall-access','.resort-spa-access','.warehouse-access','.warehouse-access']){
  await page.locator('#camera-island').click();await page.locator(selector).click();
  const row=await page.evaluate(selector=>({selector,look:__lagoonQA.desiredLook.toArray(),writes:__venueActive.writes,event:__venueEvents.at(-1),mall:__lagoonQA.mall().inspection,spa:__lagoonQA.resortSpa().inspection}),selector);assert(row.writes.length);rows.push(row);console.log('HOT_CAMERA',JSON.stringify(row));
 }
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);await writeFile(join(review,'venue-latency.json'),JSON.stringify({cold,cancellation:{island,after},rows,errors,httpErrors,scope:'Actual product clicks and native full preparation; no raster while cold construction only in QA. Camera intent latency, not physical-device FPS/model-ready latency.'},null,2));
 const {auditVenueButtons}=await import('/workspace/chichi-v12-island-warehouse/scripts/audit-venue-buttons-native.mjs');await auditVenueButtons({page,review,errors,httpErrors});
 if(process.env.CHICHI_V12_PHONE_ONLY){const {auditV12}=await import('/workspace/chichi-v12-island-warehouse/scripts/audit-v12-native.mjs');await auditV12({page,review,errors,httpErrors});}
}
