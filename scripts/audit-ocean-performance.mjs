import {writeFile}from'node:fs/promises';import{join}from'node:path';import assert from'node:assert/strict';
export async function auditOceanPerformance({page,review,errors,httpErrors}){
 await page.exposeFunction('savePerfProgress',async row=>{await writeFile(join(review,'progress.json'),JSON.stringify(row,null,2));console.log('Perf progress',row.frame,row.calls);});
 await page.locator('#camera-island').click();await page.evaluate(()=>{const q=__lagoonQA;q.drawPaused=true;q.terrainClock=7;q.faceCamera.setEnabled(false,q.look);document.querySelector('[data-biome="autumn"]').click();});
 await page.evaluate(async()=>{await __lagoonQA.mall().ensure();});await page.evaluate(()=>__lagoonQA.mall().inspect(null));
 await page.waitForFunction(()=>!__lagoonQA.islands.get('autumn').userData.lowOnly&&__lagoonQA.shaderWarmup.idle(),null,{timeout:240000});
 console.log('Perf trace: complete real Mall and island ready');
 const result=await page.evaluate(async()=>{
  const q=__lagoonQA,T=q.THREE,gl=q.renderer.getContext(),draw=q.renderer.renderBufferDirect,groups=new Map();let collect=false;
  q.renderer.renderBufferDirect=function(...args){const before=q.renderer.info.render.calls,tri=q.renderer.info.render.triangles,r=draw.apply(this,args);if(collect&&q.renderer.info.render.calls>before){const o=args[4],names=[];for(let p=o;p&&names.length<5;p=p.parent)names.push(p.name||p.type);const key=names.join('/');const row=groups.get(key)||{calls:0,triangles:0,vertices:0};row.calls+=q.renderer.info.render.calls-before;row.triangles+=q.renderer.info.render.triangles-tri;row.vertices+=args[2].attributes.position.count;groups.set(key,row);}return r;};
  const rows=[];try{
   q.manualFrames=true;let base=performance.now();for(let f=0;f<6;f++){
    q.terrainClock=7+f/30;q.drawPaused=false;q.manualStepping=true;try{q.step(base+f*1000/30);}finally{q.manualStepping=false;}
    const pixel=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
    rows.push({frame:f,calls:q.renderer.info.render.calls,triangles:q.renderer.info.render.triangles,residency:{...q.geometryResidency.stats},gpu:(()=>{const {compiles,...stats}=q.gpuBuffers.snapshot();return stats;})()});
    await window.savePerfProgress(rows.at(-1));await new Promise(r=>setTimeout(r,0));
   }
   q.drawPaused=true;collect=true;q.drawFrame();gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4));collect=false;
   return{rows,geometryEvents:__resTrace.events,groups:[...groups].map(([name,r])=>({name,...r})).sort((a,b)=>b.triangles-a.triangles),camera:q.camera.position.toArray(),target:q.look.toArray(),dpr:q.renderer.getPixelRatio(),poseCats:q.poseAtlas.stats.updatedCats,registeredCats:q.poseAtlas.stats.cats,heap:performance.memory?.usedJSHeapSize,lost:gl.isContextLost(),png:q.renderer.domElement.toDataURL('image/png').split(',')[1]};
  }finally{q.renderer.renderBufferDirect=draw;q.manualFrames=false;}
 });
 await writeFile(join(review,'mall-full.png'),Buffer.from(result.png,'base64'));delete result.png;await writeFile(join(review,'trace.json'),JSON.stringify({...result,errors,httpErrors,limitations:'Native Chromium SwiftShader resource trace, not Apple M2 FPS. Synthetic roster65 plus original cats, complete real Mall. No live player save touched.'},null,2));assert.equal(result.lost,false);assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);console.log('PASS resource trace',result.rows.at(-1).residency);
}
