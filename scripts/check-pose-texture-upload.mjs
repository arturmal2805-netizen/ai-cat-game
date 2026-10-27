import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

export async function checkPoseTextureUpload(page, review) {
  const result=await page.evaluate(async restoreContext=>{
    const q=__lagoonQA,T=q.THREE;q.freeze=true;
    const renderer=new T.WebGLRenderer({antialias:false});renderer.setSize(64,32);
    const gl=renderer.getContext(),scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.1,10);
    camera.position.z=2;
    const a=new T.DataTexture(new Float32Array(64*16*4),64,16,T.RGBAFormat,T.FloatType),
      b=new T.DataTexture(new Float32Array(64*16*4),64,16,T.RGBAFormat,T.FloatType),
      material=new T.MeshBasicMaterial({map:a}),geometry=new T.PlaneGeometry(2,2),
      pixels=new Uint8Array(64*32*4),reference=new Uint8Array(pixels.length),native=gl.texSubImage2D;
    scene.add(new T.Mesh(geometry,material));
    const counts=[];let current=null;
    gl.texSubImage2D=function(...args){if(current){current.calls++;current.rectangleBytes+=args[4]*args[5]*16;current.viewBytes+=args[8]?.byteLength||0;}
      return native.apply(this,args);};
    let changed=0;
    try {
      for(const t of [a,b]){t.needsUpdate=true;renderer.initTexture(t);}
      for(let cycle=0;cycle<6;cycle++){
        for(const t of [a,b]) {
          for(const row of [1,2,3,4,8,9,13]) {
            for(let column=0;column<64;column++) {
              const at=(row*64+column)*4;
              t.image.data.set([((cycle+column)%7)/7,(row+1)/17,(cycle+1)/7,1],at);
            }
            t.addUpdateRange(row*64*4,64*4);
          }
        }
        const row={cycle,native:{calls:0,rectangleBytes:0,viewBytes:0},coalesced:{calls:0,rectangleBytes:0,viewBytes:0}};
        current=row.native;a.needsUpdate=true;material.map=a;renderer.render(scene,camera);
        gl.readPixels(0,0,64,32,gl.RGBA,gl.UNSIGNED_BYTE,reference);
        current=row.coalesced;
        if(!q.uploadPoseRows(renderer,b))throw Error("real texture did not qualify");
        material.map=b;renderer.render(scene,camera);
        gl.readPixels(0,0,64,32,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
        for(let i=0;i<pixels.length;i++)if(pixels[i]!==reference[i])changed++;
        counts.push(row);
      }
      current=null;
      const lose=gl.getExtension("WEBGL_lose_context");let restored=false;
      if(restoreContext && lose){
        renderer.domElement.style.cssText="position:fixed;left:0;top:0;pointer-events:none";
        document.body.append(renderer.domElement);
        const contextEvent=name=>new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>reject(Error(name+" timed out")),10000);
          renderer.domElement.addEventListener(name,()=>{clearTimeout(timer);resolve();},{once:true});
        });
        const lost=contextEvent("webglcontextlost");lose.loseContext();await lost;
        // Restoration is only legal after the lost-event dispatch completes.
        await new Promise(resolve=>setTimeout(resolve,50));
        const restoredEvent=contextEvent("webglcontextrestored");lose.restoreContext();await restoredEvent;
        material.map=a;renderer.render(scene,camera);
        gl.readPixels(0,0,64,32,gl.RGBA,gl.UNSIGNED_BYTE,reference);
        b.addUpdateRange(64*4,64*4);
        if(!q.uploadPoseRows(renderer,b))throw Error("restored texture did not qualify");
        material.map=b;renderer.render(scene,camera);
        gl.readPixels(0,0,64,32,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
        for(let i=0;i<pixels.length;i++)if(pixels[i]!==reference[i])changed++;
        restored=true;
      }
      return {changed,counts,restored,error:gl.getError(),contextLost:gl.isContextLost()};
    } finally {gl.texSubImage2D=native;a.dispose();b.dispose();material.dispose();geometry.dispose();renderer.dispose();renderer.domElement.remove();q.freeze=false;q.gpuFrames.clear();}
  },!!process.env.CHICHI_POSE_CONTEXT_RESTORE);
  fs.writeFileSync(path.join(review,"pose-upload-gl.json"),JSON.stringify(result,null,2));
  console.log("POSE_UPLOAD_GL",JSON.stringify(result));
  assert.equal(result.changed,0);assert.equal(result.error,0);assert.equal(result.contextLost,false);
  for(const row of result.counts){assert.equal(row.native.calls,7);assert.equal(row.coalesced.calls,3);
    assert.equal(row.native.rectangleBytes,row.coalesced.rectangleBytes);
    assert.equal(row.coalesced.viewBytes,row.coalesced.rectangleBytes);}
}

export async function capturePoseUploadFrame(page) {
  return page.evaluate(()=>{
    const q=__lagoonQA,gl=q.renderer.getContext(),native=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4),
      pixels=new Uint8Array(native.length);
    q.freeze=true;q.shadowDepth.setEnabled(false);
    try {
      q.poseAtlas.setRowUploadEnabled(false);q.poseAtlas.dirtyRowsForQA();q.drawFrame();
      gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,native);
      const before={...q.renderer.info.render};
      q.poseAtlas.setRowUploadEnabled(true);q.poseAtlas.dirtyRowsForQA();q.drawFrame();
      gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      let changed=0;for(let i=0;i<pixels.length;i++)if(pixels[i]!==native[i])changed++;
      return {changed,before,after:{...q.renderer.info.render},cats:q.poseAtlas.stats.cats,slots:q.poseAtlas.stats.entries,
        error:gl.getError(),contextLost:gl.isContextLost(),dpr:q.renderer.getPixelRatio()};
    }finally{q.poseAtlas.setRowUploadEnabled(true);q.shadowDepth.setEnabled(true);q.gpuFrames.clear();q.freeze=false;}
  });
}
