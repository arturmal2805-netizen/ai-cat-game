import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
export async function checkWarmupMode(page,review){
 const ids=(process.env.CHICHI_LIVE_BIOMES||'jobcity,aquarium,summer,homestead').split(','),rows=[];
 for(const id of ids){
  const start=Date.now();
  await page.evaluate(id=>{const q=__lagoonQA;q.drawPaused=true;q.cpuOnly=true;q.freeze=false;document.querySelector(`[data-biome="${id}"]`).click();const b=q.islands.get(id);q.reviewView(b.position.x,b.position.z,85);},id);
  await page.waitForFunction(id=>{const q=__lagoonQA;return !q.islands.get(id).userData.lowOnly&&q.shaderWarmup.idle()&&Math.abs(q.getDistance()-85)<.01&&q.look.distanceTo(q.desiredLook)<.01;},id,{timeout:180000});
  const readyMs=Date.now()-start;
  const row=await page.evaluate(()=>{
   const q=__lagoonQA,gl=q.renderer.getContext(),stale=[],helpers=[],logs=[];
   q.freeze=true;q.drawPaused=false;q.cpuOnly=false;
   q.scene.traverse(o=>{const c=o.userData.staticSubmission;if(c){helpers.push(c);if(!c.isStatic()&&o.customDepthMaterial)stale.push({name:o.name,indices:o.geometry.index?.count});}});
   const before=q.renderer.info.programs.length;
   for(const key of ['getProgramInfoLog','getShaderInfoLog']){const fn=gl[key];gl[key]=function(...a){const t=performance.now();try{return fn.apply(this,a);}finally{logs.push({key,ms:performance.now()-t});}};logs.push({restore:()=>gl[key]=fn});}
   const firstStart=performance.now();q.drawFrame();const firstDrawMs=performance.now()-firstStart,after=q.renderer.info.programs.length;
   for(const l of logs)l.restore?.();
   q.shadowDepth.setEnabled(false);
   const a=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4),b=new Uint8Array(a.length),read=p=>gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,p);
   q.drawFrame();read(a);const draw={...q.renderer.info.render};
   try{for(const c of helpers)c.setEnabled(false);q.drawFrame();read(b);}finally{for(const c of helpers)c.setEnabled(true);q.shadowDepth.setEnabled(true);q.gpuFrames.clear();}
   let changed=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])changed++;
   return {stale,firstDrawMs,programsBefore:before,programsAfter:after,newPrograms:after-before,logs:logs.filter(x=>x.key),changed,draw,contextLost:gl.isContextLost(),error:gl.getError(),dpr:q.renderer.getPixelRatio()};
  });
  assert.equal(row.changed,0,`${id}: native pixels`);assert.equal(row.error,0);assert.equal(row.contextLost,false);assert.equal(row.dpr,2);
  rows.push({id,readyMs,...row});fs.writeFileSync(path.join(review,'warmup-mode.json'),JSON.stringify(rows,null,2));console.log('WARMUP_MODE',JSON.stringify(rows.at(-1)));
 }
}
