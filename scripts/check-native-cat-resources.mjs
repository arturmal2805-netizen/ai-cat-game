// Readbacks only in isolated QA, outside the native frame timing window.
export async function captureNativeCatResources(page){
 return page.evaluate(()=>{
  const q=__lagoonQA,gl=q.renderer.getContext(),a=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4),b=new Uint8Array(a.length),
    uploads=q.trackUploads(gl),before={cats:q.poseAtlas.stats.cats,slots:q.poseAtlas.stats.entries},modes=[];
  q.freeze=true;q.shadowDepth.setEnabled(false);q.colonyDraws.setEnabled(false);
  try{
   for(const sharing of [true,false]){
    q.poseAtlas.setSharingEnabled(sharing);uploads.clear();q.drawFrame();
    gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,sharing?a:b);
    modes.push({sharing,...q.renderer.info.render,poseBytes:q.poseAtlas.stats.bytes,poseRows:q.poseAtlas.stats.rows,uploads:uploads.snapshot()});
   }
   let changed=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])changed++;
   return {changed,modes,before,after:{cats:q.poseAtlas.stats.cats,slots:q.poseAtlas.stats.entries},
    colony:{...q.colonyDraws.stats},error:gl.getError(),contextLost:gl.isContextLost(),dpr:q.renderer.getPixelRatio()};
  }finally{uploads.dispose();q.poseAtlas.setSharingEnabled(false);q.shadowDepth.setEnabled(true);q.freeze=false;q.gpuFrames.clear();}
 });
}
