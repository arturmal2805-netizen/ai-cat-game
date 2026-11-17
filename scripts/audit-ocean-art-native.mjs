import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
// Full native game, its real immersion/fog/light pipeline and private SQLite.
// The camera fixture runs after tracking, before native culling and lighting.
export async function auditOceanArtNative({page,review,errors,httpErrors}){
 const initial=await page.evaluate(()=>{const g=__lagoonSaveQA.getGame();return{coins:g.coins,inventory:g.inventory,placements:g.placements};});
 await page.locator('#camera-island').click();
 await page.evaluate(()=>{const q=__lagoonQA;q.drawPaused=true;q.terrainClock=7;q.faceCamera.setEnabled(false,q.look);document.querySelector('[data-biome="autumn"]').click();q.reviewView(q.islands.get('autumn').position.x,q.islands.get('autumn').position.z+65,80);});
 await page.waitForFunction(()=>{const q=__lagoonQA;return !q.islands.get('autumn').userData.lowOnly&&q.shaderWarmup.idle();},null,{timeout:240000});
 await page.evaluate(async()=>{await __lagoonQA.mall().ensure();});
 console.log('Ocean native: full detail and native shaders ready');
 const specs=[
  {name:'surface',eye:[80,105,225],target:[0,-8,65],distance:190},
  {name:'water-close',eye:[18,14,35],target:[-8,.155,-12],distance:52},
  {name:'forecourt',eye:[25,-158,170],target:[105,-185,176],distance:85},
 ];
 const rows=[];
 for(const hour of [12,0])for(const spec of specs){
  const state=await page.evaluate(({spec,hour})=>{const q=__lagoonQA,b=q.islands.get('autumn'),g=__lagoonSaveQA.getGame();g.jobCity.epoch=Date.now()-(hour===0?720000:0);q.terrainClock=7;q.reviewView(b.position.x+spec.target[0],b.position.z+spec.target[2],spec.distance);q.oceanReviewCamera={eye:[spec.eye[0]+b.position.x,spec.eye[1],spec.eye[2]+b.position.z],target:[spec.target[0]+b.position.x,spec.target[1],spec.target[2]+b.position.z]};return q.oceanReviewCamera;},{spec,hour});
  await page.waitForFunction(state=>{const q=__lagoonQA;return q.camera.position.distanceTo(new q.THREE.Vector3(...state.eye))<.001&&q.shaderWarmup.idle();},state,{timeout:240000});
  await page.waitForTimeout(250);
  const data=await page.evaluate(()=>{const q=__lagoonQA;q.drawFrame();return{png:q.renderer.domElement.toDataURL('image/png').split(',')[1],camera:q.camera.position.toArray(),target:q.look.toArray(),fog:{color:q.scene.fog.color.getHex(),density:q.scene.fog.density},lights:q.scene.children.filter(o=>o.isLight).map(o=>({type:o.type,color:o.color.getHex(),intensity:o.intensity})),exposure:q.renderer.toneMappingExposure,toneMapping:q.renderer.toneMapping,dpr:q.renderer.getPixelRatio(),calls:q.renderer.info.render.calls,triangles:q.renderer.info.render.triangles,textureCount:q.renderer.info.memory.textures,geometryCount:q.renderer.info.memory.geometries,heap:performance.memory?.usedJSHeapSize,lost:q.renderer.getContext().isContextLost()};});
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
 // Measure real complete RAF intervals including native simulation, submission
 // and queue pressure. SwiftShader diagnostics, never physical-phone FPS.
 const metrics=await page.evaluate(async()=>{const q=__lagoonQA;q.drawPaused=false;const intervals=[],renders=[];q.liveFrames=renders;let last=performance.now();await new Promise(resolve=>{let n=0;const sample=t=>{intervals.push(t-last);last=t;if(++n===80)resolve();else requestAnimationFrame(sample);};requestAnimationFrame(sample);});q.drawPaused=true;delete q.liveFrames;const sorted=intervals.slice(5).sort((a,b)=>a-b),pick=p=>sorted[Math.floor((sorted.length-1)*p)];return{frames:sorted.length,p50:pick(.5),p95:pick(.95),p99:pick(.99),max:Math.max(...sorted),pausesOver100ms:sorted.filter(t=>t>100).length,renderCPU:renders.map(r=>r[1]),heap:performance.memory?.usedJSHeapSize,contextLost:q.renderer.getContext().isContextLost()};});
 assert.equal(metrics.contextLost,false);
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.waitForFunction(()=>!__lagoonSaveQA.cloud.dirty&&!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.retryEntry);
 await page.reload();await page.waitForFunction(()=>window.__lagoonQA&&__lagoonSaveQA.cloud.editable,null,{timeout:240000});
 const final=await page.evaluate(()=>{__lagoonQA.drawPaused=true;const g=__lagoonSaveQA.getGame();return{coins:g.coins,inventory:g.inventory,placements:g.placements};});assert.deepEqual(final,initial);
 assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
 await writeFile(join(review,'ocean-art-results.json'),JSON.stringify({completed:true,rows,metrics,initial,final,errors,httpErrors,renderer:'Native game at DPR2, Chromium SwiftShader. Equal camera/clock fixtures; diagnostic timing, not physical-device FPS.'},null,2));
 console.log('PASS: native ocean views at two clock times, frame intervals/memory, and ownership after private SQLite reload.');
}
