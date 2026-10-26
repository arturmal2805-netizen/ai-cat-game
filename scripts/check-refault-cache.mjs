// Actual GL transfer/return proof. A small isolated renderer models a camera
// cycle at 25 Hz; it is a resource test, never a physical-device FPS claim.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

export async function checkRefaultCache(page,review) {
  const result=await page.evaluate(()=>{
    const q=__lagoonQA,T=q.THREE;q.freeze=true;
    const renderer=new T.WebGLRenderer({antialias:true,alpha:false});
    renderer.setSize(64,64);renderer.setPixelRatio(1);
    const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,1,.1,30);
    camera.position.set(0,0,6);camera.lookAt(0,0,0);
    const gl=renderer.getContext(),uploads=q.trackUploads(gl),pixels=new Uint8Array(64*64*4),
      reference=Array.from({length:4},()=>new Uint8Array(pixels.length)),rows=[];
    try {
      for(const protection of [false,true]) {
        let time=0;
        const meshes=Array.from({length:4},(_,i)=>new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial({color:[0xe4b3dc,0xa2d8ce,0xc4b2e7,0xf3dc9d][i]}))),
          g=meshes[0].geometry,bytes=[g.index,...Object.values(g.attributes)].reduce((n,a)=>n+a.array.byteLength,0),
          cache=q.geometryResidencyFactory(renderer,{budget:bytes*3,refaultBudget:bytes,clock:()=>time});
        cache.setRefaultProtectionEnabled(protection);
        scene.add(...meshes);uploads.clear();let changed=0;
        for(let frame=1;frame<=120;frame++){
          time=frame*40;const active=(frame-1)%4;
          meshes.forEach((m,i)=>m.visible=i===active);
          renderer.render(scene,camera);cache.sweep(time);
          gl.readPixels(0,0,64,64,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
          if(!protection&&frame<=4)reference[active].set(pixels);
          else for(let i=0;i<pixels.length;i++)if(pixels[i]!==reference[active][i])changed++;
        }
        rows.push({protection,changed,uploads:uploads.snapshot(),cache:{...cache.stats},bytesPerGeometry:bytes});
        cache.dispose();
        for(const mesh of meshes){mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}
      }
      return {rows,error:gl.getError(),contextLost:gl.isContextLost(),gameDpr:q.renderer.getPixelRatio()};
    } finally {uploads.dispose();renderer.dispose();q.freeze=false;q.gpuFrames.clear();}
  });
  fs.writeFileSync(path.join(review,"refault-gl-cycle.json"),JSON.stringify(result,null,2));
  const [before,after]=result.rows;
  assert.equal(result.error,0);assert.equal(result.contextLost,false);assert.equal(result.gameDpr,2);
  assert.equal(before.changed,0);assert.equal(after.changed,0);
  assert.ok(after.uploads.dataBytes<before.uploads.dataBytes/5);
  assert.ok(after.cache.evicted<before.cache.evicted/5);
  assert.ok(after.cache.bytes<=after.bytesPerGeometry*4);
  console.log("REFAULT_GL_CYCLE",JSON.stringify(result));
}

export async function captureRefaultReturn(page) {
  return page.evaluate(()=>{
    const q=__lagoonQA,gl=q.renderer.getContext(),pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4),
      returned=new Uint8Array(pixels.length),geometries=new Set(),native=q.renderer.renderBufferDirect;
    q.freeze=true;q.shadowDepth.setEnabled(false);
    q.renderer.renderBufferDirect=function(...args){geometries.add(args[2]);return native.apply(this,args);};
    try{
      q.drawFrame();gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      const before={...q.renderer.info.render},cats=q.poseAtlas.stats.cats,slots=q.poseAtlas.stats.entries,
        gpuBefore=q.gpuBuffers.snapshot().bytes;
      q.renderer.renderBufferDirect=native;
      for(const geometry of geometries)q.geometryResidency.retire(geometry);
      const retiredBytes=q.gpuBuffers.snapshot().bytes;
      q.drawFrame();gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,returned);
      let changed=0;for(let i=0;i<pixels.length;i++)if(pixels[i]!==returned[i])changed++;
      return {changed,before,after:{...q.renderer.info.render},gpuBefore,retiredBytes,gpuAfter:q.gpuBuffers.snapshot().bytes,
        cats,slots,afterCats:q.poseAtlas.stats.cats,afterSlots:q.poseAtlas.stats.entries,
        error:gl.getError(),contextLost:gl.isContextLost(),dpr:q.renderer.getPixelRatio()};
    }finally{q.renderer.renderBufferDirect=native;q.shadowDepth.setEnabled(true);q.gpuFrames.clear();q.freeze=false;}
  });
}
