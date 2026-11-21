import assert from 'node:assert/strict';import{writeFile}from'node:fs/promises';import{join}from'node:path';
export async function auditCacheCycles({page,review,errors,httpErrors}){
 await page.exposeFunction('cacheProgress',async row=>{console.log('Cache cycle',JSON.stringify(row));await writeFile(join(review,'progress.json'),JSON.stringify(row));});
 await page.locator('#camera-island').click();await page.evaluate(()=>{const q=__lagoonQA;q.drawPaused=true;q.terrainClock=7;q.faceCamera.setEnabled(false,q.look);document.querySelector('[data-biome="autumn"]').click();});
 await page.evaluate(async()=>{await __lagoonQA.mall().ensure();await __lagoonQA.resortSpa().ensure();});await page.waitForFunction(()=>!__lagoonQA.islands.get('autumn').userData.lowOnly&&__lagoonQA.shaderWarmup.idle(),null,{timeout:600000});console.log('Cache cycle: full real Mall and island prepared');
 const data=await page.evaluate(async()=>{
  const q=__lagoonQA,gl=q.renderer.getContext(),restore=[],ext=q.renderer.extensions.get('WEBGL_multi_draw'),base=performance.now(),b=q.islands.get('autumn'),views=[{name:'wide',eye:[2350,2400,3300],target:[1250,-75,450]},{name:'mall',eye:[15,-65,200],target:[0,-138,75]},{name:'reef',eye:[12,-115.8,-75],target:[0,-124.8,-95]},{name:'surface',eye:[80,105,225],target:[0,-8,65]},{name:'interior',eye:[10,-134,99],target:[-25,-138,112]},{name:'remote',eye:[-123,-50,-85],target:[-135,-58.9,-105]}],rows=[];
  // Submission-only trace: real scene/visibility/shaders/buffer uploads and
  // retirement, but no raster work. This is NOT a frame-time/pixel benchmark.
  for(const [owner,names]of [[gl,['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']],[ext,['multiDrawElementsWEBGL','multiDrawArraysWEBGL','multiDrawElementsInstancedWEBGL','multiDrawArraysInstancedWEBGL']]])for(const name of names)if(owner?.[name]){const fn=owner[name];owner[name]=()=>{};restore.push(()=>owner[name]=fn);}
  q.manualFrames=true;let f=0;
  try{for(let cycle=0;cycle<3;cycle++)for(const view of views){for(let hold=0;hold<10;hold++){
    const now=base+f++*1000/30;__resTrace.now=now;q.oceanReviewCamera={eye:[view.eye[0]+b.position.x,view.eye[1],view.eye[2]+b.position.z],target:[view.target[0]+b.position.x,view.target[1],view.target[2]+b.position.z],far:10000};q.gpuFrames.clear();q.manualStepping=true;try{q.step(now);}finally{q.manualStepping=false;}q.camera.near=.2;q.camera.fov=50;q.camera.updateProjectionMatrix();q.drawFrame();q.geometryResidency.sweep(now);
   }const {compiles,...gpu}=q.gpuBuffers.snapshot(),row={cycle,view:view.name,frame:f,stats:{...q.geometryResidency.stats},gpu};rows.push(row);await window.cacheProgress(row);}
   return{rows,events:__resTrace.events,contextLost:gl.isContextLost()};
  }finally{for(const fn of restore)fn();q.manualFrames=false;q.drawPaused=true;delete __resTrace.now;}
 });
 await writeFile(join(review,'cache-cycles.json'),JSON.stringify({...data,errors,httpErrors,limitations:'Submission-only resource attribution. Native game/private SQLite/private18-adoption fixture/full real Mall+SPA and expanded lagoon. GPU draw commands suppressed only in QA, native uploads and shader dispatch retained; virtual30Hz cache clock, not host wall-clock. No FPS/pixel claims.'},null,2));assert.equal(data.contextLost,false);assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);console.log('PASS cache resource attribution',data.rows.at(-1).stats);
}
