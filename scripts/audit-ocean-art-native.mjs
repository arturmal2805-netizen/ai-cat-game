import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
// Full native game, its real immersion/fog/light pipeline and private SQLite.
// The camera fixture runs after tracking, before native culling and lighting.
export async function auditOceanArtNative({page,review,errors,httpErrors}){
 const reef=!!process.env.CHICHI_SEABED_PATCH_AUDIT;
 const initial=await page.evaluate(()=>{const g=__lagoonSaveQA.getGame();return{coins:g.coins,inventory:g.inventory,placements:g.placements};});
 if(!reef)await page.locator('#camera-island').click();
 await page.evaluate(reef=>{const q=__lagoonQA;q.drawPaused=true;q.terrainClock=7;q.faceCamera.setEnabled(false,q.look);if(!reef)document.querySelector('[data-biome="autumn"]').click();q.reviewView(q.islands.get('autumn').position.x,q.islands.get('autumn').position.z+(reef?-95:65),reef?24:80);},reef);
 await page.waitForFunction(()=>{const q=__lagoonQA;return !q.islands.get('autumn').userData.lowOnly&&q.shaderWarmup.idle();},null,{timeout:240000});
 if(!reef)await page.evaluate(async()=>{await __lagoonQA.mall().ensure();});
 if(reef){await page.keyboard.press('KeyE');await page.waitForFunction(()=>__lagoonQA.submarine().phase==='swimming');await page.keyboard.down('KeyW');await page.evaluate(()=>{const q=__lagoonQA;for(let i=0;i<10;i++)q.submarine().update(.05,7+i*.05);});await page.keyboard.up('KeyW');console.log('Reef: actual Chichi left the boat and swam along the sand opening');}

 console.log('Ocean native: full detail and native shaders ready');
 const specs=process.env.CHICHI_SEABED_COVERAGE_AUDIT?[
  {name:'reef-ocean-overview',eye:[0,-25,-140],target:[0,-125,0],distance:180},
  {name:'reef-remote-garden',eye:[-123,-50,-85],target:[-135,-58.9,-105],distance:26},
  {name:'reef-phone',eye:[5,-120.8,-87],target:[0,-124.8,-95],distance:12,phone:true},
 ]:reef?[
  {name:'reef-third-person',native:true,distance:12},
  {name:'reef-normal',eye:[12,-115.8,-75],target:[0,-124.8,-95],distance:26},
  {name:'reef-wide',eye:[27,-104.8,-57],target:[0,-124.8,-95],distance:50},
  {name:'reef-phone',eye:[5,-120.8,-87],target:[0,-124.8,-95],distance:12,phone:true},
 ]:[
  {name:'surface',eye:[80,105,225],target:[0,-8,65],distance:190},
  {name:'water-close',eye:[18,14,35],target:[-8,.155,-12],distance:52},
  {name:'forecourt',eye:[25,-158,170],target:[105,-185,176],distance:85},
 ];
 const rows=[];
 const reefCounts=reef?await page.evaluate(()=>{const root=__lagoonQA.islands.get('autumn').userData.ocean.reefPatch;return{colonies:root.userData.colonies.length,plants:root.userData.plants.length,groups:root.children.length};}):null;
 if(reef){assert.equal(reefCounts.colonies,1216);assert.equal(reefCounts.plants,19456);}
 for(const hour of (reef?[12]:[12,0]))for(const spec of specs){
  if(spec.phone)await page.setViewportSize({width:390,height:844});
  const state=await page.evaluate(({spec,hour})=>{const q=__lagoonQA,b=q.islands.get('autumn'),g=__lagoonSaveQA.getGame();g.jobCity.epoch=Date.now()-(hour===0?720000:0);q.terrainClock=7;if(spec.native){q.oceanReviewCamera=null;return null;}q.reviewView(b.position.x+spec.target[0],b.position.z+spec.target[2],spec.distance);q.oceanReviewCamera={eye:[spec.eye[0]+b.position.x,spec.eye[1],spec.eye[2]+b.position.z],target:[spec.target[0]+b.position.x,spec.target[1],spec.target[2]+b.position.z]};return q.oceanReviewCamera;},{spec,hour});
  if(state)await page.waitForFunction(state=>{const q=__lagoonQA;return q.camera.position.distanceTo(new q.THREE.Vector3(...state.eye))<.001&&q.shaderWarmup.idle();},state,{timeout:240000});
  await page.waitForTimeout(250);
  const data=await page.evaluate(()=>{const q=__lagoonQA;q.drawFrame();return{png:q.renderer.domElement.toDataURL('image/png').split(',')[1],camera:q.camera.position.toArray(),target:q.look.toArray(),fog:{color:q.scene.fog.color.getHex(),density:q.scene.fog.density},lights:q.scene.children.filter(o=>o.isLight).map(o=>({type:o.type,color:o.color.getHex(),intensity:o.intensity})),exposure:q.renderer.toneMappingExposure,toneMapping:q.renderer.toneMapping,dpr:q.renderer.getPixelRatio(),calls:q.renderer.info.render.calls,triangles:q.renderer.info.render.triangles,textureCount:q.renderer.info.memory.textures,geometryCount:q.renderer.info.memory.geometries,phase:q.submarine().phase,actor:q.chichiCarrier.position.toArray(),visible:q.chichiCarrier.visible&&q.cat.visible,heap:performance.memory?.usedJSHeapSize,lost:q.renderer.getContext().isContextLost()};});
  assert.equal(data.dpr,2);assert.equal(data.lost,false);assert.equal(data.exposure,1);
  const name=spec.name+'-'+(hour===12?'day':'night');await writeFile(join(review,name+'.png'),Buffer.from(data.png,'base64'));delete data.png;rows.push({name,clockHour:hour,...data});
  if(hour===12&&spec.name==='water-close'){
   const waves=await page.evaluate(()=>{const q=__lagoonQA,water=q.islands.get('autumn').userData.ocean.sea.userData.water,hidden=[],time=water.uniforms.uTime.value;
    q.scene.traverse(o=>{if(o.isMesh&&o.material!==water){hidden.push([o,o.visible]);o.visible=false;}});
    try{return[7,8].map(t=>{water.uniforms.uTime.value=t;q.drawFrame();return q.renderer.domElement.toDataURL('image/png').split(',')[1];});}
    finally{water.uniforms.uTime.value=time;for(const [o,visible]of hidden)o.visible=visible;}
   });assert.notEqual(waves[0],waves[1],'the actual isolated water framebuffer must move between fixed clock samples');
   for(let i=0;i<2;i++)await writeFile(join(review,'isolated-native-wave-t'+(7+i)+'.png'),Buffer.from(waves[i],'base64'));
  }
  console.log('Ocean native capture',name,JSON.stringify({triangles:data.triangles,calls:data.calls,fog:data.fog}));
 }
 if(reef)await page.setViewportSize({width:1100,height:800});
 if(reef&&process.env.CHICHI_PROFILE_QUERY){
  assert.equal(await page.locator('#frame-profile').count(),1);assert.equal(new URL(page.url()).searchParams.has('profile'),false,'diagnostic request must be consumed');
  await page.context().grantPermissions(['clipboard-read','clipboard-write']);await page.locator('[data-profile-copy]').click();
  const diagnostic=await page.evaluate(async()=>JSON.parse(await navigator.clipboard.readText()));assert.ok(diagnostic.samples>0);assert.ok(diagnostic.loading.slowest.length>0);assert.ok(diagnostic.app);await writeFile(join(review,'copied-diagnostic.json'),JSON.stringify(diagnostic,null,2));
  await page.locator('[data-profile-close]').click();assert.equal(await page.locator('#frame-profile').count(),0);assert.equal(await page.evaluate(()=>Object.entries(__lagoonProfileOriginals).every(([k,v])=>__lagoonQA.renderer.getContext()[k]===v)),true,'closing restores native GL calls');
 }
 // Measure real complete RAF intervals including native simulation, submission
 // and queue pressure. SwiftShader diagnostics, never physical-phone FPS.
 const metrics=await page.evaluate(async reef=>{const q=__lagoonQA;q.drawPaused=false;const intervals=[],renders=[];q.liveFrames=renders;let last=performance.now();await new Promise(resolve=>{let n=0;const sample=t=>{intervals.push(t-last);last=t;if(++n===(reef?24:80))resolve();else requestAnimationFrame(sample);};requestAnimationFrame(sample);});q.drawPaused=true;delete q.liveFrames;const sorted=intervals.slice(5).sort((a,b)=>a-b),pick=p=>sorted[Math.floor((sorted.length-1)*p)];return{frames:sorted.length,p50:pick(.5),p95:pick(.95),p99:pick(.99),max:Math.max(...sorted),pausesOver100ms:sorted.filter(t=>t>100).length,renderCPU:renders.map(r=>r[1]),heap:performance.memory?.usedJSHeapSize,contextLost:q.renderer.getContext().isContextLost()};},reef);
 assert.equal(metrics.contextLost,false);

 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.waitForFunction(()=>!__lagoonSaveQA.cloud.dirty&&!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.retryEntry);
 await page.reload();await page.waitForFunction(()=>window.__lagoonQA&&__lagoonSaveQA.cloud.editable,null,{timeout:240000});
 const final=await page.evaluate(()=>{__lagoonQA.drawPaused=true;const g=__lagoonSaveQA.getGame();return{coins:g.coins,inventory:g.inventory,placements:g.placements};});assert.deepEqual(final,initial);
 if(reef){assert.equal(await page.evaluate(()=>__lagoonQA.submarine().phase),'swimming');assert.equal(await page.locator('#frame-profile').count(),0,'normal reload must not reopen diagnostics');}
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
 await writeFile(join(review,'ocean-art-results.json'),JSON.stringify({completed:true,reefCounts,rows,metrics,initial,final,errors,httpErrors,renderer:'Native game at DPR2, Chromium SwiftShader. Equal camera/clock fixtures; diagnostic timing, not physical-device FPS.'},null,2));
 console.log(reef?'PASS: native third-person reef, ordinary/wide/phone views, frame/memory, private SQLite reload; opt-in diagnostic copied/closed when requested.':'PASS: native ocean views at two clock times, frame intervals/memory, and ownership after private SQLite reload.');
}
