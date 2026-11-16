import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';

export async function auditTerrainNative({page,review,errors,httpErrors,assetJobs,terrainAssets}){
 const stage=process.env.CHICHI_MEADOW_STAGE||'grass',preview=!!process.env.CHICHI_TERRAIN_PREVIEW,rows=[];
 const owned=()=>page.evaluate(()=>{const g=__lagoonSaveQA.getGame();return {coins:g.coins,inventory:g.inventory,placements:g.placements};});
 const initial=await owned();
 await page.evaluate(()=>{const q=__lagoonQA,b=q.islands.get('autumn');q.drawPaused=true;q.faceCamera.setEnabled(false,q.look);document.querySelector('[data-biome="autumn"]').click();q.reviewView(b.position.x+275,b.position.z-25,21);q.reviewOrbit(1.5,.35);});
 await page.waitForFunction(()=>{const q=__lagoonQA;return !q.islands.get('autumn').userData.lowOnly&&q.shaderWarmup.idle()&&q.look.distanceTo(q.desiredLook)<.02;},null,{timeout:240000});
 await Promise.all(assetJobs);
 await writeFile(join(review,'loaded-assets.json'),JSON.stringify(terrainAssets,null,2));
 const settings=await page.evaluate(stage=>{
  const q=__lagoonQA,b=q.islands.get('autumn'),patches=[],grass=[];
  b.traverse(o=>{for(const m of [o.material].flat().filter(Boolean))if(m.userData.meadow){m.uniforms.uMeadowEnabled.value=stage==='legacy'?0:1;const {uniforms,...metadata}=m.userData.meadow;patches.push({...metadata,textures:Object.fromEntries(Object.entries(m.uniforms).filter(([,u])=>u.value?.isTexture).map(([key,{value:t}])=>[key,{name:t.name,colorSpace:t.colorSpace,flipY:t.flipY,anisotropy:t.anisotropy,mipmaps:t.generateMipmaps,width:t.image.width,height:t.image.height}]))});}if(o.userData.meadowGrass){o.visible=stage==='grass';grass.push({count:o.userData.instanceCount,chunks:o.children.length});}});
  // Private framing fixture: original native rig/scale, fixed ground location
  // only in this audit. No save schema or production actor behavior is changed.
  q.terrainClock=60;
  q.terrainAnchor={x:b.position.x+275,y:.14,z:b.position.z-25};
  return {stage,patches,grass,viewport:{width:innerWidth,height:innerHeight},fov:q.camera.fov,toneMapping:q.renderer.toneMapping,exposure:q.renderer.toneMappingExposure,antialias:q.renderer.getContext().getContextAttributes().antialias,maxAnisotropy:q.renderer.capabilities.getMaxAnisotropy(),shaderClock:q.terrainClock,shadowEnabled:q.renderer.shadowMap.enabled,catScale:q.cat.scale.toArray(),carrierScale:q.chichiCarrier.scale.toArray(),shadows:q.renderer.shadowMap.type,lights:q.scene.children.filter(o=>o.isDirectionalLight).map(o=>({position:o.position.toArray(),intensity:o.intensity,shadow:{mapSize:o.shadow.mapSize.toArray(),bias:o.shadow.bias,normalBias:o.shadow.normalBias,left:o.shadow.camera.left,right:o.shadow.camera.right,top:o.shadow.camera.top,bottom:o.shadow.camera.bottom}}))};
 },stage);
 if(stage!=='legacy'){assert.equal(settings.patches.length,1);assert.ok(terrainAssets.length>=4);}
 await writeFile(join(review,'settings.json'),JSON.stringify(settings,null,2));
 const percentile=(a,p)=>{a=[...a].sort((x,y)=>x-y);return a.length?a[Math.floor((a.length-1)*p)]:null;};
 const views=[{name:'close',d:9,a:1.5,e:.22},{name:'gameplay',d:21,a:1.5,e:.35},{name:'medium',d:40,a:1.5,e:.45},{name:'wide',d:100,a:1.5,e:.6}];
 async function frames(n,measure=false){await page.evaluate(({n,measure})=>{const q=__lagoonQA;if(measure)q.renderer.getContext().finish();q.liveFrames=[];q.cpu=[];q.measure=measure;q.targetFrames=q.frames+n;q.drawPaused=false;},{n,measure});await page.waitForFunction(()=>__lagoonQA.frames>=__lagoonQA.targetFrames,null,{timeout:600000});return page.evaluate(()=>{const q=__lagoonQA;q.drawPaused=true;q.measure=false;return {frames:q.liveFrames,cpu:q.cpu,camera:q.camera.position.toArray(),look:q.look.toArray(),dpr:q.renderer.getPixelRatio(),gpuBuffers:((s)=>({bytes:s.bytes,peak:s.peak,buffers:s.buffers}))(q.gpuBuffers.snapshot()),heap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize}:null,memory:{...q.renderer.info.memory},geometryBytes:q.geometryResidency.stats.bytes,programs:q.renderer.info.programs.length,cat:q.chichiCarrier.position.toArray()};});}
 async function nativeState(state){
  await page.evaluate(state=>{const b=__lagoonQA.islands.get('autumn'),shore=b.getObjectByName('Wide dry beaches and walkable island ring');
   if(!shore.userData.qaMeadowMaterials)shore.userData.qaMeadowMaterials=shore.material;
   const authored=shore.userData.qaMeadowMaterials;shore.material=state==='legacy'&&Array.isArray(authored)?[authored[0],authored[0]]:authored;
   b.traverse(o=>{if(o.userData.meadowGrass)o.visible=state==='grass';});
  },state);
 }
 for(const v of views){
  console.log('Meadow',stage,v.name);
  await page.evaluate(v=>{const q=__lagoonQA,b=q.islands.get('autumn');q.reviewView(b.position.x+275,b.position.z-25,v.d);q.reviewOrbit(v.a,v.e);},v);
  await page.waitForFunction(v=>{const q=__lagoonQA;return Math.abs(q.getDistance()-v.d)<.04&&q.shaderWarmup.idle();},v,{timeout:240000});
  await frames(2);assert.deepEqual(errors,[]);
  await page.screenshot({path:join(review,v.name+'-hud.png')});
  const raw=await page.evaluate(()=>{const q=__lagoonQA;q.drawFrame(q.scene,q.camera);return q.renderer.domElement.toDataURL('image/png').split(',')[1];});
  await writeFile(join(review,v.name+'.png'),Buffer.from(raw,'base64'));
  if(preview){rows.push({...v,preview:true});continue;}
  const paired={};
  if(stage==='grass'){
   // Alternate ordering to limit drift. Both states use the same native scene,
   // camera, DPR, real legacy ground shader and unchanged large-leaf geometry.
   for(const state of views.indexOf(v)%2?['grass','legacy']:['legacy','grass']){
    await nativeState(state);await frames(2);paired[state]=await frames(6,true);
   }
   await nativeState('grass');
  }
  const sample=paired.grass||await frames(12,true),gaps=sample.frames.slice(1).map((f,i)=>f[0]-sample.frames[i][0]);
  const control=paired.legacy?{...paired.legacy,label:'Original ground material and no grass; same partitioned shore and authored large leaves',gapMedian:percentile(paired.legacy.frames.slice(1).map((f,i)=>f[0]-paired.legacy.frames[i][0]),.5)}:null;
  rows.push({...v,...sample,control,gapMedian:percentile(gaps,.5),cpuMedian:percentile(sample.cpu,.5),cpuP95:percentile(sample.cpu,.95),renderMedian:percentile(sample.frames.map(f=>f[1]),.5),renderP95:percentile(sample.frames.map(f=>f[1]),.95),gapP95:percentile(gaps,.95),gapMax:Math.max(...gaps)});console.log('Meadow completed view',v.name,JSON.stringify({renderMedian:rows.at(-1).renderMedian,cpuMedian:rows.at(-1).cpuMedian,gapMax:rows.at(-1).gapMax}));assert.equal(sample.dpr,2);await writeFile(join(review,'terrain-partial.json'),JSON.stringify({stage,rows,errors,httpErrors,completed:false},null,2));
 }
 // Actual camera movement, normal RAF/render/GPU queue; no readback during
 // measured frames. Endpoints additionally retained as raw native PNGs.
 await page.evaluate(()=>{const q=__lagoonQA,b=q.islands.get('autumn');q.reviewView(b.position.x+275,b.position.z-25,21);q.reviewOrbit(1.5,.35);});
 await page.waitForFunction(()=>Math.abs(__lagoonQA.getDistance()-21)<.04);
 if(!preview)await page.evaluate(()=>{const q=__lagoonQA;q.renderer.getContext().finish();q.liveFrames=[];q.cpu=[];q.measure=true;q.terrainMotion={start:q.frames,frames:24};q.targetFrames=q.frames+24;q.drawPaused=false;});
 if(!preview)await page.waitForFunction(()=>__lagoonQA.frames>=__lagoonQA.targetFrames,null,{timeout:600000});
 console.log('Meadow camera motion complete');
 const motion=await page.evaluate(()=>{const q=__lagoonQA;q.drawPaused=true;q.measure=false;q.terrainMotion=null;return {frames:q.liveFrames,cpu:q.cpu};});
 assert.deepEqual(await owned(),initial);assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
 // A separate visual motion sequence; screenshot readbacks never enter the
 // timing windows above. The raw frames retain actual game lighting/geometry.
 for(let i=0;i<8;i++){
  await page.evaluate(i=>__lagoonQA.reviewOrbit(1.5+i*.105,.35),i);
  await page.waitForFunction(i=>{const q=__lagoonQA;return Math.abs(q.camera.position.x-(q.look.x+Math.sin(1.5+i*.105)*21*Math.cos(.35)))<.08;},i);
  const raw=await page.evaluate(()=>{const q=__lagoonQA;q.drawFrame();return q.renderer.domElement.toDataURL('image/png').split(',')[1];});
  await writeFile(join(review,'motion-'+String(i).padStart(2,'0')+'.png'),Buffer.from(raw,'base64'));
 }
 // Isolate material versus geometry using the SAME compiled candidate and
 // pinned visual clock. These are diagnostic stills, outside timing windows;
 // the independent c9 run remains the published-code performance base.
 const contributions=[];
 if(stage==='grass'&&!preview){for(const state of ['legacy','material','grass']){
  await nativeState(state);
  for(const v of views){
   await page.evaluate(v=>{const q=__lagoonQA,b=q.islands.get('autumn');q.reviewView(b.position.x+275,b.position.z-25,v.d);q.reviewOrbit(v.a,v.e);},v);
   await page.waitForFunction(v=>{const q=__lagoonQA;return Math.abs(q.getDistance()-v.d)<.04&&Math.abs(q.camera.position.x-(q.look.x+Math.sin(v.a)*v.d*Math.cos(v.e)))<.08;},v);
   const raw=await page.evaluate(()=>{const q=__lagoonQA;q.drawFrame();return q.renderer.domElement.toDataURL('image/png').split(',')[1];});
   const name='state-'+state+'-'+v.name+'.png';await writeFile(join(review,name),Buffer.from(raw,'base64'));contributions.push(name);
  }
 }}
 const files={};for(const name of contributions)files[name]=createHash('sha256').update(await readFile(join(review,name))).digest('hex');for(let i=0;i<8;i++){const name='motion-'+String(i).padStart(2,'0')+'.png';files[name]=createHash('sha256').update(await readFile(join(review,name))).digest('hex');}
 for(const v of views)for(const suffix of ['.png','-hud.png']){const name=v.name+suffix;files[name]=createHash('sha256').update(await readFile(join(review,name))).digest('hex');}
 await writeFile(join(review,'terrain-results.json'),JSON.stringify({stage,completed:true,performanceAudit:!preview,source:process.env.CHICHI_BASELINE_REF||'working-tree',settings,initial,final:await owned(),rows,motion,pngSha256:files,errors,httpErrors,renderer:'Native game, sequential Chromium SwiftShader DPR2. Timings are not physical-device FPS. Frames use native RAF/GPU queue; QA drains occur before timing only.'},null,2));console.log('PASS: native local meadow states, exact build provenance and unchanged private ownership.');
}
