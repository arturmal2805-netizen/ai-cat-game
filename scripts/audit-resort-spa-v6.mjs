import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

export async function auditResortV6({page,review}){
 const stage=process.env.CHICHI_SPA_V6_STAGE||'candidate',frames=[];
 const names=process.env.CHICHI_SPA_V6_ALL?['Общий вид','Grand Thermal Lagoon','Luxury Jacuzzi Terraces','Massage Palace','Aroma Therapy Garden','Sauna & Steam Palace','Floating Glass Cabanas','Beauty & Grooming','Golden Galaxy VIP Suite','Ocean Meditation Dome','Cat Nap Galaxy','Wellness Café','Waterfall Relaxation Garden','Amber Star Lounge','Midnight Blue Relaxation Room']:['Общий вид','Aroma Therapy Garden','Golden Galaxy VIP Suite','Wellness Café','Floating Glass Cabanas'];
 if(process.env.CHICHI_SPA_V6_ALL)names.push('Верхний бассейн');
 for(const name of names){
  await page.locator('.resort-spa-zones').getByRole('button',{name,exact:true}).click();
  await page.waitForFunction(()=>__lagoonQA.look.distanceTo(__lagoonQA.desiredLook)<.03&&Math.abs(__lagoonQA.getDistance()-__lagoonQA.getDesiredDistance())<.03,null,{timeout:60000});
  await page.evaluate(()=>{const q=__lagoonQA;q.liveFrames=[];q.targetFrames=q.frames+2;q.drawPaused=false;});
  await page.waitForFunction(()=>__lagoonQA.frames>=__lagoonQA.targetFrames,null,{timeout:240000});
  const state=await page.evaluate(()=>{const q=__lagoonQA;q.drawPaused=true;return{selected:q.resortSpa().selected,camera:q.camera.position.toArray(),look:q.look.toArray(),render:q.renderer.info.render,memory:q.renderer.info.memory,frameSamples:q.liveFrames,heap:performance.memory?.usedJSHeapSize,gl:q.renderer.getContext().getParameter(q.renderer.getContext().VERSION),clock:q.gameClock(),fog:{color:q.scene.fog.color.getHex(),density:q.scene.fog.density},dpr:q.renderer.getPixelRatio(),luxury:q.resortSpa().root.userData.luxury?.report||null};});
  const png=stage+'-'+(name==='Верхний бассейн'?'sky-pool':state.selected||'overview')+'.png';await page.screenshot({path:join(review,png)});frames.push({name,png,...state});
  await writeFile(join(review,'v6-reference-frames.json'),JSON.stringify({stage,scope:'Actual running private game; brief software-renderer frame samples, not Mac/phone FPS or visual approval.',frames},null,2));console.log('V6 reference review frame',stage,name);
 }
 if(process.env.CHICHI_SPA_V6_PROCEDURES){
  const {auditResortDry}=await import('./audit-resort-spa-dry.mjs');await auditResortDry({page,review,reload:false});
  const {auditResortPools}=await import('./audit-resort-spa-pools.mjs');await auditResortPools({page,review});
 }
 if(process.env.CHICHI_WORLD_BACKUP_AUDIT){
  await page.locator('#account-open').click();
  const downloadPromise=page.waitForEvent('download');await page.locator('#cloud-world-export').click();const download=await downloadPromise;
  assert.match(download.suggestedFilename(),/^CHICHI_WORLD_BACKUP_.*\.json$/);const path=join(review,'qa-world-backup.json');await download.saveAs(path);
  await page.locator('#save-file').setInputFiles(path);await page.locator('#world-import-confirm').waitFor({state:'visible'});
  const before=await page.evaluate(()=>JSON.stringify(__lagoonSaveQA.getGame()));await page.locator('#world-import-confirm [data-close]').last().click();
  assert.equal(await page.evaluate(()=>JSON.stringify(__lagoonSaveQA.getGame())),before);
  await page.locator('#save-file').setInputFiles(path);await page.locator('#world-import-confirm').waitFor({state:'visible'});
  const rollbackPromise=page.waitForEvent('download');await page.locator('#world-import-apply').click();const rollback=await rollbackPromise;
  assert.match(rollback.suggestedFilename(),/_BEFORE_RESTORE\.json$/);
  await page.waitForFunction(()=>window.__lagoonSaveQA&&__lagoonSaveQA.cloud.editable,null,{timeout:240000});
  const restored=await page.evaluate(()=>({coins:__lagoonSaveQA.getGame().coins,rollback:!!localStorage.getItem('chichi-world-before-file-import')}));assert(restored.rollback);
  await writeFile(join(review,'world-backup-browser.json'),JSON.stringify({download:download.suggestedFilename(),cancelDidNotChangeWorld:true,beforeRestoreDownload:rollback.suggestedFilename(),restored,scope:'Native Chromium/private SQLite. Actual Mac browser download not tested.'},null,2));
  console.log('PASS actual Cloud backup download, cancellation, confirmed restore, pre-restore copy and reload');
 }
}
