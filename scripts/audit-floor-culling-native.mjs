import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
// Frozen actual game, complete Mall/65-resident private stress save. The only
// A/B variable is section visibility; compare the entire native framebuffer.
export async function auditFloorCullingNative({page,review,errors,httpErrors}){
 await page.locator('#camera-island').click();await page.evaluate(()=>{const q=__lagoonQA;q.drawPaused=true;q.terrainClock=7;q.faceCamera.setEnabled(false,q.look);document.querySelector('[data-biome="autumn"]').click();});
 await page.evaluate(async()=>{await __lagoonQA.mall().ensure();});
 await page.waitForFunction(()=>!__lagoonQA.islands.get('autumn').userData.lowOnly&&__lagoonQA.shaderWarmup.idle(),null,{timeout:240000});
 const rows=[];
 for(const spec of [{name:'underwater',eye:[12,-115.8,-75],target:[0,-124.8,-95]},{name:'overview',eye:[0,-25,-140],target:[0,-125,0]},{name:'phone',eye:[5,-120.8,-87],target:[0,-124.8,-95],phone:true}]){
  if(spec.phone)await page.setViewportSize({width:390,height:844});
  const row=await page.evaluate(spec=>{
   const q=__lagoonQA,b=q.islands.get('autumn'),root=b.userData.ocean.sandRegion,T=q.THREE,gl=q.renderer.getContext();q.manualFrames=true;q.drawPaused=true;q.oceanReviewCamera={eye:[spec.eye[0]+b.position.x,spec.eye[1],spec.eye[2]+b.position.z],target:[spec.target[0]+b.position.x,spec.target[1],spec.target[2]+b.position.z]};q.manualStepping=true;try{q.step(performance.now()+100);}finally{q.manualStepping=false;}
   const updates=root.children.map(l=>l.update),snap=()=>{const {compiles,...stats}=q.gpuBuffers.snapshot();return stats;},pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4),before=new Uint8Array(pixels.length);
   const draw=(enabled,output)=>{root.children.forEach((l,i)=>l.update=enabled?updates[i]:T.LOD.prototype.update);const at=performance.now();q.drawFrame();gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,output);return{completeGpuFrameMs:performance.now()-at,calls:q.renderer.info.render.calls,triangles:q.renderer.info.render.triangles,visibleSections:root.children.filter(l=>l.levels.some(v=>v.object.visible)).length,buffers:snap()};};
   try{draw(false,pixels);draw(true,pixels);const baseline=draw(false,before),candidate=draw(true,pixels);let changedChannels=0,maxDelta=0;for(let i=0;i<pixels.length;i++){const d=Math.abs(before[i]-pixels[i]);if(d)changedChannels++;maxDelta=Math.max(maxDelta,d);}return{name:spec.name,baseline,candidate,changedChannels,maxDelta,dpr:q.renderer.getPixelRatio(),camera:q.camera.position.toArray(),lost:gl.isContextLost(),png:q.renderer.domElement.toDataURL('image/png').split(',')[1]};}
   finally{root.children.forEach((l,i)=>l.update=updates[i]);q.manualFrames=false;}
  },spec);
  await writeFile(join(review,spec.name+'.png'),Buffer.from(row.png,'base64'));delete row.png;rows.push(row);console.log('Floor native A/B',JSON.stringify(row));assert.equal(row.changedChannels,0,'exact colour and shadow pixels');assert.equal(row.lost,false);assert.equal(row.dpr,2);assert.ok(row.candidate.calls<=row.baseline.calls);
 }
 assert.ok(rows.some(r=>r.candidate.calls<r.baseline.calls));assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);await writeFile(join(review,'floor-culling.json'),JSON.stringify({completed:true,rows,errors,httpErrors,limitations:'SwiftShader synchronized offline frame timings, not Mac/iPhone FPS. Actual private stress save, full Mall. Counts, shaders, DPR and geometry unchanged.'},null,2));console.log('PASS whole-floor exact native colour/shadow A/B');
}
