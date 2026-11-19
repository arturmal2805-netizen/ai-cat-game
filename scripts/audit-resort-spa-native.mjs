import assert from 'node:assert/strict';import{writeFile}from'node:fs/promises';import{join}from'node:path';
export async function auditResortSpaNative({page,review,errors,httpErrors}){
 await page.locator('[data-biome="autumn"]').click();await page.evaluate(()=>{__lagoonQA.drawPaused=true;});
 if(process.env.CHICHI_RESORT_SPA_AUTOLOAD_AUDIT){
  const progress=setInterval(()=>console.log('SPA automatic selected-island preparation pending'),15000);
  try{await page.waitForFunction(()=>__lagoonQA.resortSpa()?.ready,null,{timeout:240000});}finally{clearInterval(progress);}
  const auto=await page.evaluate(()=>{const r=__lagoonQA.resortSpa(),g=__lagoonSaveQA.getGame();return{ready:r.ready,visible:r.root.visible,inspection:r.inspection,zones:r.root.userData.zones.size,coins:g.coins,diamonds:g.diamonds,profiles:Object.keys(g.jobCity.profiles).length};});assert(auto.ready&&auto.visible&&!auto.inspection);assert.equal(auto.zones,14);await writeFile(join(review,'automatic-spa-loading.json'),JSON.stringify(auto,null,2));console.log('PASS SPA scene appears without first clicking SPA',auto);
 }
 await page.locator('.resort-spa-access').waitFor({state:'visible'});await page.locator('.resort-spa-access').click();
 const progress=setInterval(()=>console.log('SPA required scene preparation pending'),15000);
 try{await page.waitForFunction(()=>__lagoonQA.resortSpa()?.inspection,null,{timeout:240000});}finally{clearInterval(progress);}
 if(process.env.CHICHI_SPA_V7_MASS_AUDIT){const {auditSpaV7Mass}=await import('./audit-resort-spa-v7-mass.mjs');await auditSpaV7Mass({page,review,errors,httpErrors});return;}
 const result=await page.evaluate(()=>{const r=__lagoonQA.resortSpa();return{zones:r.root.userData.zones.size,basins:r.root.userData.basins.length,spaInspection:r.inspection,mallInspection:__lagoonQA.mall().inspection,appScripts:[...document.scripts].filter(s=>s.src.includes('app.js')).length};});assert.equal(result.zones,14);assert.equal(result.basins,21);assert.equal(result.mallInspection,false);
 if(process.env.CHICHI_SPA_PROBE_BAKE){const {bakeResortNativeProbes}=await import('./bake-resort-spa-native-probes.mjs');await bakeResortNativeProbes({page,review,errors});await page.locator('#camera-all').click();assert.equal(await page.evaluate(()=>__lagoonQA.resortSpa().inspection),false);assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);return;}
 const buttons=page.locator('.resort-spa-zones button');assert.equal(await buttons.count(),22);await buttons.filter({hasText:'Massage Palace'}).click();await page.waitForFunction(()=>__lagoonQA.resortSpa().selected==='resort-massage');
 await page.evaluate(()=>{const q=__lagoonQA;q.targetFrames=q.frames+2;q.drawPaused=false;});await page.waitForFunction(()=>__lagoonQA.frames>=__lagoonQA.targetFrames,null,{timeout:240000});await page.evaluate(()=>{__lagoonQA.drawPaused=true;});await page.screenshot({path:join(review,'actual-game-massage.png')});
 if(process.env.CHICHI_SPA_V6_AUDIT){const {auditResortV6}=await import('./audit-resort-spa-v6.mjs');await auditResortV6({page,review});}
 else if(process.env.CHICHI_RESORT_SPA_PHONE_ONLY_AUDIT){const {auditResortPhoneWalk}=await import('./audit-resort-spa-phone-walk.mjs');await auditResortPhoneWalk({page,review});}
 else if(process.env.CHICHI_RESORT_SPA_RELOAD_AUDIT){const {auditResortReload}=await import('./audit-resort-spa-reload.mjs');await auditResortReload({page,review});}
 else if(process.env.CHICHI_RESORT_SPA_DRY_AUDIT){const {auditResortDry}=await import('./audit-resort-spa-dry.mjs');await auditResortDry({page,review,reload:!process.env.CHICHI_RESORT_SPA_POOLS_AUDIT});if(process.env.CHICHI_RESORT_SPA_POOLS_AUDIT){const {auditResortPools}=await import('./audit-resort-spa-pools.mjs');await auditResortPools({page,review});}}
 else if(process.env.CHICHI_RESORT_SPA_POOLS_AUDIT){const {auditResortPools}=await import('./audit-resort-spa-pools.mjs');await auditResortPools({page,review});}
 else if(process.env.CHICHI_RESORT_SPA_TRANSIT_AUDIT){const {auditResortTransit}=await import('./audit-resort-spa-transit.mjs');await auditResortTransit({page,review});}
 else if(process.env.CHICHI_RESORT_SPA_PROCEDURE_AUDIT){const {auditResortProcedure}=await import('./audit-resort-spa-procedure.mjs');await auditResortProcedure({page,review});}
 await page.locator('#camera-all').click();assert.equal(await page.evaluate(()=>__lagoonQA.resortSpa().inspection),false);assert.equal(await page.locator('.resort-spa-zones').isVisible(),false);
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);await writeFile(join(review,'game-scene.json'),JSON.stringify({...result,actualZoneCamera:true,worldReleased:true,errors,httpErrors,scope:'Native private game scene/camera only; full procedures, transport and SQLite receipts not yet audited'},null,2));console.log('PASS native SPA required loading, actual scene, zone camera and World release');
}
