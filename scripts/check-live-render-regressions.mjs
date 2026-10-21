// Private-world diagnostic: real full-resolution raster and native RAF/fences.
// Individual switches isolate a regression; none is a shipping quality setting.
import fs from "node:fs";
import path from "node:path";
export async function checkLiveRenderRegressions(page, review) {
  const id = process.env.CHICHI_REGRESSION_BIOME || "summer";
  const cdp = process.env.CHICHI_REGRESSION_PROFILE ? await page.context().newCDPSession(page) : null;
  if(cdp) await cdp.send("Profiler.enable");
  await page.evaluate(id => {
    const q = __lagoonQA;
    q.drawPaused = true; q.cpuOnly = true;
    document.querySelector(`[data-biome="${id}"]`).click();
    const b = q.islands.get(id);
    q.reviewView(b.position.x,b.position.z,85);
  },id);
  await page.waitForFunction(id => !__lagoonQA.islands.get(id).userData.lowOnly &&
    __lagoonQA.look.distanceTo(__lagoonQA.desiredLook)<.01 &&
    Math.abs(__lagoonQA.getDistance()-85)<.01 &&
    __lagoonQA.shaderWarmup.idle(),id);
  await page.evaluate(() => {
    const q=__lagoonQA;
    q.freeze=true;
    q.drawFrame();q.renderer.getContext().finish();
    q.gpuFrames.clear();
    q.originalReady=q.gpuFrames.ready;
    q.originalSubmitted=q.gpuFrames.submitted;
  });
  const results=[];
  for(const mode of process.env.CHICHI_REGRESSION_MODES?.split(",") || ["released","released-repeat"]) {
    const setup=await page.evaluate(mode => {
      const q=__lagoonQA;
      q.probePaints=[];
      if(mode.startsWith("opaque-scenery")) q.scene.traverse(o=>{
        for(const m of (Array.isArray(o.material)?o.material:[o.material])) {
          if(m?.userData.sharedScenery && m.transparent && m.opacity===1) {
            q.probePaints.push(m);m.transparent=false;m.needsUpdate=true;
          }
        }
      });
      q.gpuFrames.ready = mode.startsWith("single-pending")
        ? ()=>q.originalReady() && q.gpuFrames.pending===0 : q.originalReady;
      q.gpuFrames.submitted=q.originalSubmitted;
      if(mode==="no-fences") {q.gpuFrames.ready=()=>true;q.gpuFrames.submitted=()=>{};}
      if(mode==="raf-flush") q.gpuFrames.submitted=()=>{
        const gl=q.renderer.getContext(),flush=gl.flush;
        gl.flush=()=>{};
        try{q.originalSubmitted();}finally{gl.flush=flush;}
      };
      q.shadowDepth.setEnabled(mode!=="no-shadow-cache");
      q.drawPaused=false;q.cpuOnly=false;q.freeze=false;q.liveFrames=[];
      q.probeStart=performance.now();
      let i=0;
      q.probeTimer=setInterval(()=>q.renderer.domElement.dispatchEvent(new WheelEvent("wheel",{
        deltaY:Math.cos(i++/12)*20,bubbles:true,cancelable:true
      })),80);
      return {programs:q.renderer.info.programs.length,opaquePaints:q.probePaints.length};
    },mode);
    if(cdp) await cdp.send("Profiler.start");
    await page.waitForTimeout(10000);
    if(cdp) fs.writeFileSync(path.join(review,mode+"-live-profile.json"),JSON.stringify(await cdp.send("Profiler.stop")));
    const row=await page.evaluate(() => {
      const q=__lagoonQA;clearInterval(q.probeTimer);
      const elapsed=performance.now()-q.probeStart;
      q.freeze=true;q.drawPaused=true;
      const frames=q.liveFrames,gaps=frames.slice(1).map((x,i)=>x[0]-frames[i][0]).sort((a,b)=>a-b),cpu=frames.map(x=>x[1]).sort((a,b)=>a-b);
      q.renderer.getContext().finish();q.gpuFrames.clear();
      for(const m of q.probePaints){m.transparent=true;m.needsUpdate=true;}
      return {elapsed,frames:frames.length,fps:frames.length*1000/elapsed,
        gapMedian:gaps[Math.floor(gaps.length*.5)],gapP95:gaps[Math.floor(gaps.length*.95)],
        renderMedian:cpu[Math.floor(cpu.length*.5)],renderMax:cpu.at(-1),
        shadows:{...q.shadowDepth.stats},draw:{...q.renderer.info.render},
        dpr:q.renderer.getPixelRatio(),buffer:[q.renderer.domElement.width,q.renderer.domElement.height],
        programs:q.renderer.info.programs.length};
    });
    results.push({id,mode,setup,...row});
    fs.writeFileSync(path.join(review,"render-regressions.json"),JSON.stringify(results,null,2));
    console.log("RENDER_REGRESSION",JSON.stringify(results.at(-1)));
  }
  await cdp?.detach();
}
