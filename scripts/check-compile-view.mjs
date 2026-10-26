// Real colony rebuilds: measure target-light traversal, then compare complete
// colour/shadow frames. Preparation wall time is not gameplay/device FPS.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

export async function checkCompileView(page,review){
  await page.evaluate(()=>{
    const q=__lagoonQA,native=q.renderer.compileAsync;
    q.compileReview=null;
    q.renderer.compileAsync=function(model,camera,target){
      if(!q.compileReview || !model.name.startsWith("Exact colony cats"))return native.apply(this,arguments);
      const stats=q.compileReview,walk=target.traverseVisible;
      target.traverseVisible=function(visit){return walk.call(this,o=>{stats.visits++;if(o.isLight)stats.lights.push(o.uuid);visit(o);});};
      stats.calls++;
      try{return native.apply(this,arguments);}finally{target.traverseVisible=walk;}
    };
  });
  const rows=[];
  for(const id of (process.env.CHICHI_LIVE_BIOMES || "jobcity,summer,aquarium,homestead").split(",")){
    await page.evaluate(id=>{
      const q=__lagoonQA;q.freeze=false;q.drawPaused=true;q.cpuOnly=true;
      document.querySelector(`[data-biome="${id}"]`).click();
      const b=q.islands.get(id);q.reviewView(b.position.x,b.position.z,85);
    },id);
    await page.waitForFunction(id=>{
      const q=__lagoonQA;
      return !q.islands.get(id).userData.lowOnly && q.shaderWarmup.idle() && q.colonyDraws.stats.ready &&
        q.look.distanceTo(q.desiredLook)<.01 && Math.abs(q.getDistance()-85)<.01 &&
        __lagoonSaveQA.getGame().placements.every(p=>p.readyAt>Date.now() || q.itemGroups.get(p.id)?.userData.built);
    },id,{timeout:240000});
    await page.evaluate(()=>{const q=__lagoonQA;q.freeze=true;q.drawPaused=false;q.cpuOnly=false;q.shadowDepth.setEnabled(false);});
    const phases=[];
    for(const legacy of [true,false]){
      await page.evaluate(legacy=>{
        const q=__lagoonQA;q.compileReview={calls:0,visits:0,lights:[],at:performance.now()};q.colonyDraws.rebuildCompileForQA(legacy);
      },legacy);
      await page.waitForFunction(()=>__lagoonQA.colonyDraws.stats.ready && __lagoonQA.shaderWarmup.idle());
      const phase=await page.evaluate(legacy=>{
        const q=__lagoonQA,stats=q.compileReview;q.compileReview=null;
        const result={legacy,calls:stats.calls,visits:stats.visits,lights:stats.lights,elapsed:performance.now()-stats.at};
        q.drawFrame();q.drawFrame();return result;
      },legacy);
      await page.waitForFunction(()=>__lagoonQA.shaderWarmup.idle());
      const image=await page.evaluate(legacy=>{
        const q=__lagoonQA,gl=q.renderer.getContext();q.drawFrame();
        const pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);
        gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
        let changed=0;
        if(legacy)q.compileReferencePixels=pixels;
        else {for(let i=0;i<pixels.length;i++)if(pixels[i]!==q.compileReferencePixels[i])changed++;delete q.compileReferencePixels;}
        return {changed,draw:{...q.renderer.info.render},dpr:q.renderer.getPixelRatio(),error:gl.getError(),contextLost:gl.isContextLost()};
      },legacy);
      phases.push({...phase,...image});
    }
    const [before,after]=phases;
    rows.push({id,phases});fs.writeFileSync(path.join(review,"compile-view.json"),JSON.stringify(rows,null,2));
    assert.equal(after.changed,0);assert.equal(before.calls,after.calls);assert.deepEqual(before.lights,after.lights);
    assert.equal(before.draw.calls,after.draw.calls);assert.equal(before.draw.triangles,after.draw.triangles);
    assert.ok(after.visits<before.visits/10);assert.equal(after.dpr,2);assert.equal(after.error,0);assert.equal(after.contextLost,false);
    console.log("COMPILE_VIEW",JSON.stringify(rows.at(-1)));
    await page.evaluate(()=>{const q=__lagoonQA;q.shadowDepth.setEnabled(true);q.gpuFrames.clear();q.freeze=false;});
  }
}
