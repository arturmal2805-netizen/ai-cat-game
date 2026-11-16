import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';import {join} from 'node:path';
export async function auditMeadowLodNative({page,review,errors,httpErrors}){
 await page.evaluate(()=>{const q=__lagoonQA,b=q.islands.get('autumn');q.drawPaused=true;q.faceCamera.setEnabled(false,q.look);document.querySelector('[data-biome="autumn"]').click();q.terrainClock=60;q.terrainAnchor={x:b.position.x+275,y:.14,z:b.position.z-25};q.reviewView(b.position.x+275,b.position.z-25,21);q.reviewOrbit(1.5,.35);});
 await page.waitForFunction(()=>{const q=__lagoonQA;return !q.islands.get('autumn').userData.lowOnly&&q.shaderWarmup.idle()&&q.look.distanceTo(q.desiredLook)<.02;},null,{timeout:240000});
 const rows=[];
 for(const v of [{name:'gameplay',d:21,e:.35},{name:'close',d:9,e:.22},{name:'medium',d:40,e:.45},{name:'wide',d:100,e:.6}]){
  await page.evaluate(v=>{const q=__lagoonQA,b=q.islands.get('autumn');q.reviewView(b.position.x+275,b.position.z-25,v.d);q.reviewOrbit(1.5,v.e);},v);
  await page.waitForFunction(v=>Math.abs(__lagoonQA.getDistance()-v.d)<.04,v);
  const row=await page.evaluate(v=>{
   const q=__lagoonQA,r=q.renderer,gl=r.getContext(),b=q.islands.get('autumn'),lods=[];b.traverse(o=>{if(o.userData.meadowLod)lods.push(o);});
   q.look.set(b.position.x+275,0,b.position.z-25);q.camera.position.set(q.look.x+Math.sin(1.5)*v.d*Math.cos(v.e),Math.sin(v.e)*v.d,q.look.z+Math.cos(1.5)*v.d*Math.cos(v.e));q.camera.lookAt(q.look);q.camera.updateMatrixWorld();
   const data=[],png=[],samples=[],native=r.renderBufferDirect;let counts;
   r.renderBufferDirect=function(cam,scene,g,m,o,group){const before=r.info.render.triangles,out=native.apply(this,arguments);if(o.userData.meadowPacked){counts.triangles+=r.info.render.triangles-before;counts.draws++;}return out;};
   try{for(const enabled of [false,false,true,true,false]){
    for(const lod of lods)lod.userData.meadowLod.setEnabled(enabled);counts={triangles:0,draws:0};q.drawFrame();const bytes=new Uint8Array(r.domElement.width*r.domElement.height*4);gl.readPixels(0,0,r.domElement.width,r.domElement.height,gl.RGBA,gl.UNSIGNED_BYTE,bytes);data.push(bytes);png.push(r.domElement.toDataURL('image/png').split(',')[1]);samples.push({enabled,...counts});
   }}finally{r.renderBufferDirect=native;for(const lod of lods)lod.userData.meadowLod.setEnabled(true);}
   function diff(a,b){let changed=0,maxDelta=0;for(let i=0;i<data[a].length;i+=4){let pixel=false;for(let c=0;c<3;c++){const delta=Math.abs(data[a][i+c]-data[b][i+c]);maxDelta=Math.max(maxDelta,delta);pixel ||=delta>0;}if(pixel)changed++;}return {changed,maxDelta};}
   return {name:v.name,lods:lods.length,samples,pixels:diff(1,3),repeats:[diff(0,1),diff(2,3),diff(1,4)],png:[png[1],png[3]],dpr:r.getPixelRatio(),lost:gl.isContextLost()};
  },v);
  for(let i=0;i<2;i++)await writeFile(join(review,v.name+'-'+(i?'root-box':'original')+'.png'),Buffer.from(row.png[i],'base64'));delete row.png;rows.push(row);await writeFile(join(review,'meadow-lod-results.json'),JSON.stringify({completed:false,rows,errors,httpErrors},null,2));console.log(JSON.stringify(row));assert.equal(row.pixels.changed,0);assert.equal(row.pixels.maxDelta,0);assert.ok(row.repeats.every(r=>r.changed===0));assert.equal(row.dpr,2);assert.equal(row.lost,false);assert.ok(row.samples[3].triangles<=row.samples[1].triangles);
 }
 assert.ok(rows.some(r=>r.samples[3].triangles<r.samples[1].triangles));assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);await writeFile(join(review,'meadow-lod-results.json'),JSON.stringify({completed:true,rows,errors,httpErrors,renderer:'Native game, exact frozen images at DPR2; submission counts are not physical-device FPS.'},null,2));console.log('PASS: original grass pixels and fewer fully-morphed fine triangles.');
}
