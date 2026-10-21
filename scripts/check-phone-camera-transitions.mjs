// Actual WebKit phone view, real ride/guest buttons, native geometry and DPR.
// Isolated local saves only; readback is an exact-image QA check, never runtime.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
export async function checkPhoneCameraTransitions(page,review){
 const ids=await page.locator('[data-biome]').evaluateAll(ns=>[...new Set(ns.map(n=>n.dataset.biome))]),rows=[];
 assert.equal(ids.length,17);
 for(const removed of ['stars','coral','clouds'])assert.ok(!ids.includes(removed));
 for(const id of (process.env.CHICHI_PHONE_TRANSITION_ONLY ? [] : ids)){
  await page.evaluate(id=>{const q=__lagoonQA;q.drawPaused=true;q.cpuOnly=true;q.freeze=false;__lagoonSaveQA.getWorld().focus(id);const b=q.islands.get(id);q.reviewView(b.position.x,b.position.z,85);},id);
  await page.waitForFunction(id=>{const q=__lagoonQA;return !q.islands.get(id).userData.lowOnly&&q.look.distanceTo(q.desiredLook)<.02&&Math.abs(q.getDistance()-85)<.02&&q.shaderWarmup.idle();},id,{timeout:240000});
  const proof=await page.evaluate(()=>{
   const q=__lagoonQA,gl=q.renderer.getContext();q.freeze=true;
   const pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4),again=new Uint8Array(pixels.length),read=p=>gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,p);
   q.drawPaused=false;q.cpuOnly=false;q.drawFrame();read(pixels);
   const before=q.gpuBuffers.snapshot(),draw={...q.renderer.info.render},slots={...q.poseAtlas.stats},geometries=new Set();
   q.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});
   for(const g of geometries)q.geometryResidency.retire(g);
   const retired=q.gpuBuffers.snapshot();
   q.drawFrame();read(again);let changed=0;for(let i=0;i<pixels.length;i++)if(pixels[i]!==again[i])changed++;
   q.gpuFrames.clear();
   return {changed,before:{bytes:before.bytes,peak:before.peak,buffers:before.buffers},retiredBytes:retired.bytes,after:{bytes:q.gpuBuffers.snapshot().bytes},draw,afterDraw:{...q.renderer.info.render},slots,afterSlots:{...q.poseAtlas.stats},residency:{...q.geometryResidency.stats},dpr:q.renderer.getPixelRatio(),glError:gl.getError(),contextLost:gl.isContextLost()};
  });
  assert.equal(proof.changed,0,id+': wake must preserve the complete native frame');assert.equal(proof.glError,0);assert.equal(proof.contextLost,false);assert.equal(proof.dpr,2);assert.equal(proof.slots.cats,proof.afterSlots.cats);assert.equal(proof.slots.entries,proof.afterSlots.entries);
  rows.push({id,proof});fs.writeFileSync(path.join(review,'phone-camera-transitions.json'),JSON.stringify({rows},null,2));console.log('PHONE_RETURN',id,JSON.stringify({changed:proof.changed,gpuBytes:proof.before.bytes,retiredBytes:proof.retiredBytes}));
 }
 const pressure=await page.evaluate(()=>{
  const q=__lagoonQA,gl=q.renderer.getContext();q.freeze=true;q.drawPaused=false;q.cpuOnly=false;
  // Three real render frames, with the wall clock still below the old ten-
  // second grace. The second controller uses the identical runtime algorithm;
  // budget=0 isolates which buffers are eligible, not their geometry quality.
  const cache=q.makeGeometryResidency({budget:0,grace:10000,clock:()=>100}),
    pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4),again=new Uint8Array(pixels.length),
    read=p=>gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,p),
    roots=q.scene.children.map(o=>[o,o.visible]);
  cache.setFrameRetirementEnabled(false);q.shadowDepth.setEnabled(false);
  try{
   q.drawFrame();read(pixels);const before=q.gpuBuffers.snapshot().bytes;
   for(const [o]of roots)if(!o.isLight)o.visible=false;
   for(let i=0;i<3;i++)q.drawFrame();
   cache.sweep(100);const legacy=q.gpuBuffers.snapshot().bytes;
   cache.setFrameRetirementEnabled(true);cache.sweep(100);const early=q.gpuBuffers.snapshot().bytes,evicted=cache.stats.evicted;
   for(const [o,visible]of roots)o.visible=visible;
   q.drawFrame();read(again);let changed=0;for(let i=0;i<pixels.length;i++)if(pixels[i]!==again[i])changed++;
   return{before,legacy,early,evicted,changed,restored:q.gpuBuffers.snapshot().bytes,contextLost:gl.isContextLost()};
  }finally{for(const [o,visible]of roots)o.visible=visible;cache.dispose();q.shadowDepth.setEnabled(true);q.gpuFrames.clear();}
 });
 assert.equal(pressure.before,pressure.legacy,'old policy retains the unused buffers during its grace');assert.ok(pressure.early<pressure.legacy);assert.ok(pressure.evicted>0);assert.equal(pressure.changed,0);assert.equal(pressure.contextLost,false);console.log('PHONE_MEMORY_PRESSURE',JSON.stringify(pressure));
 await page.evaluate(()=>{const q=__lagoonQA;q.freeze=false;q.drawPaused=true;q.cpuOnly=true;__lagoonSaveQA.getWorld().focus('homestead');const b=q.islands.get('homestead'),n=q.npcs.get('adopt-magic-dragon');n.carrier.position.set(b.position.x+48,.16,b.position.z);n.manualAnchor=n.carrier.position.clone();n.manualUntil=performance.now()+3600000;q.reviewView(b.position.x,b.position.z,300);});
 await page.waitForFunction(()=>{const q=__lagoonQA;return Math.abs(q.getDistance()-300)<.02;});
 await page.waitForFunction(()=>[...__lagoonQA.itemGroups.values()].some(g=>g.userData.placement?.item==='slide-glass-corkscrew'&&g.userData.built),null,{timeout:240000});
 const dragon=await page.evaluate(()=>{const q=__lagoonQA,n=q.npcs.get('adopt-magic-dragon'),p=n.model.userData.head.getWorldPosition(new q.THREE.Vector3()).project(q.camera);return {visible:n.carrier.visible,point:p.toArray(),position:n.carrier.position.toArray(),target:q.look.toArray()};});
 assert.ok(Math.abs(dragon.point[0])<1&&Math.abs(dragon.point[1])<1);assert.equal(dragon.visible,true,'visible dragon beyond the old distance cutoff must remain drawn');
 for(let i=0;i<6;i++){
  const rideId=await page.evaluate(()=>{const q=__lagoonQA,g=[...q.itemGroups.values()].find(g=>g.userData.placement?.item==='slide-glass-corkscrew');if(!g?.userData.built)throw Error('Missing real glass ride');const id='adopt-magic-dragon';if(!q.performResident(id,{action:'ride',activityId:g.userData.placementId,mood:'happy'}))throw Error('Guest admission failed');const v=q.residentPlay.get(id),now=performance.now();v.started=now-v.travel-1;q.residentPlay.frame(id,now,now/1000);q.residentPlay.frame(id,(v.rider?.launchAt||now)+1200,now/1000+1.2);if(v.phase!=='activity')throw Error('Guest must really be riding');v.activityStart=performance.now();return g.userData.placementId;});
  await page.evaluate(id=>__lagoonQA.callbacks.onSelectItem(id),rideId);
  await page.locator('#item-guest-camera').tap();
  await page.waitForFunction(()=>__lagoonQA.faceCamera.enabled);
  await page.evaluate(()=>{__lagoonQA.drawPaused=false;__lagoonQA.cpuOnly=false;});
  const frames=await page.evaluate(()=>__lagoonQA.frames);
  await page.waitForFunction(n=>__lagoonQA.frames>=n+2,frames);
  assert.equal(await page.evaluate(()=>__lagoonQA.renderer.getContext().isContextLost()),false);
  await page.locator('#camera-all').tap();
  await page.waitForFunction(()=>!__lagoonQA.faceCamera.enabled&&Math.abs(__lagoonQA.getDistance()-__lagoonQA.getDesiredDistance())<.1);
  await page.locator('#camera-island').tap();
  await page.waitForFunction(()=>Math.abs(__lagoonQA.getDistance()-__lagoonQA.getDesiredDistance())<.1);
  console.log('PHONE_GUEST_WORLD',i+1,'passed');
 }
 const final=await page.evaluate(()=>{const q=__lagoonQA,gl=q.renderer.getContext();q.freeze=true;q.drawFrame();const p=new Uint8Array(4);gl.readPixels(Math.floor(gl.drawingBufferWidth/2),Math.floor(gl.drawingBufferHeight/2),1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return{contextLost:gl.isContextLost(),pixel:[...p],dpr:q.renderer.getPixelRatio(),gpu:{bytes:q.gpuBuffers.snapshot().bytes,peak:q.gpuBuffers.snapshot().peak},residency:{...q.geometryResidency.stats},scenes:[...q.islands.keys()]};});
 assert.equal(final.contextLost,false);assert.ok(final.pixel[0]+final.pixel[1]+final.pixel[2]>0);assert.equal(final.dpr,2);
 for(const id of ['stars','coral','clouds'])assert.ok(!final.scenes.includes(id));
 await page.screenshot({path:path.join(review,'phone-after-guest-and-world.png')});
 fs.writeFileSync(path.join(review,process.env.CHICHI_PHONE_TRANSITION_ONLY?'phone-camera-buttons.json':'phone-camera-transitions.json'),JSON.stringify({rows,pressure,dragon,guestWorldRepeats:6,final},null,2));
}
