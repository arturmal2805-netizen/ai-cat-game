// Private native-render regression probe. Original detail/DPR and real camera
// handlers; no inference and no access to a player save.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

export async function checkCityStalls(page, review) {
  await page.evaluate(() => {
    const q = __lagoonQA;
    document.querySelector('[data-biome="jobcity"]').click();
    const b = q.islands.get("jobcity");
    q.reviewView(b.position.x, b.position.z, 85);
    const p = q.profile = { sync: [], jobs: [], sweep: [], uploads: [], frames: [], tasks: [] };
    q.normalCatViews = new Map([...q.npcs].map(([id,n])=>[id,n.inView]));
    for (const [o,k,name] of [[__lagoonSaveQA.getWorld(),"sync","sync"], [q.jobs,"step","jobs"], [q.geometryResidency,"sweep","sweep"]]) {
      const native = o[k];
      o[k] = function(...args) { const at=performance.now(), evicted=q.geometryResidency.stats.evicted;
        try { return native.apply(this,args); }
        finally { p[name].push([at,performance.now()-at,q.geometryResidency.stats.evicted-evicted]); }
      };
    }
    const gl=q.renderer.getContext(), native=gl.bufferData.bind(gl);
    gl.bufferData=(...args)=>{const at=performance.now();const r=native(...args);p.uploads.push([at,performance.now()-at,typeof args[1]==="number"?args[1]:args[1]?.byteLength||0]);return r;};
    if(PerformanceObserver.supportedEntryTypes?.includes("longtask"))
      new PerformanceObserver(list=>p.tasks.push(...list.getEntries().map(e=>[e.startTime,e.duration]))).observe({type:"longtask"});
  });
  await page.waitForFunction(() => {
    const q=__lagoonQA;
    return !q.islands.get("jobcity").userData.lowOnly && q.shaderWarmup.idle() &&
      q.look.distanceTo(q.desiredLook)<.01 && Math.abs(q.getDistance()-85)<.01 &&
      [...q.itemGroups].filter(([id])=>id.startsWith("job-")).every(([,g])=>g.userData.built);
  },null,{timeout:240000});
  const rows=[];
  const modes=process.env.CHICHI_CITY_MODES?.split(",") || ["early","grace","grace","early"];
  for(const mode of modes){
    await page.evaluate(mode=>{
      const q=__lagoonQA; q.geometryResidency.setFrameRetirementEnabled(mode!=="grace");
      for(const [id,n] of q.npcs)n.inView=mode==="legacy-cats"
        ? ()=>Math.hypot(n.carrier.position.x-q.look.x,n.carrier.position.z-q.look.z)<45
        : q.normalCatViews.get(id);
      q.liveFrames=[]; q.measure=true;q.cpu=[];
      for(const k of Object.keys(q.profile))q.profile[k]=[];
      q.profile.start=performance.now();
    },mode);
    // Original RAF/simulation/GPU fences are all active throughout sampling.
    const ms=Number(process.env.CHICHI_NATIVE_SAMPLE_MS||20000);
    if(process.env.CHICHI_CITY_ORBIT) await page.evaluate(ms=>{
      const q=__lagoonQA,canvas=q.renderer.domElement,r=canvas.getBoundingClientRect(),
        x=r.left+r.width*.04,y=r.top+r.height*.6,start=performance.now();
      canvas.dispatchEvent(new PointerEvent("pointerdown",{pointerId:799,pointerType:"mouse",button:0,clientX:x,clientY:y,bubbles:true}));
      q.profile.timer=setInterval(()=>{
        const t=(performance.now()-start)/ms*Math.PI*4;
        canvas.dispatchEvent(new PointerEvent("pointermove",{pointerId:799,pointerType:"mouse",buttons:1,clientX:x+Math.sin(t)*24,clientY:y+(Math.cos(t)-1)*8,bubbles:true}));
        canvas.dispatchEvent(new WheelEvent("wheel",{deltaY:(85+Math.sin(t)*8-q.getDesiredDistance())/.025,bubbles:true,cancelable:true}));
      },100);
    },ms);
    await page.waitForTimeout(ms);
    const row=await page.evaluate(mode=>{
      const q=__lagoonQA,p=q.profile,end=performance.now();clearInterval(p.timer);delete p.timer;
      q.renderer.domElement.dispatchEvent(new PointerEvent("pointercancel",{pointerId:799}));
      const percentile=(a,k)=>a.slice().sort((a,b)=>a-b)[Math.floor((a.length-1)*k)]??null;
      const frames=q.liveFrames,gaps=frames.slice(1).map((f,i)=>f[0]-frames[i][0]);
      const data={};for(const k of ["sync","jobs","sweep","uploads"])data[k]={calls:p[k].length,totalMs:p[k].reduce((a,r)=>a+r[1],0),maxMs:Math.max(0,...p[k].map(r=>r[1])),events:p[k].filter(r=>r[1]>10||k==="sweep"&&r[2])};
      return {mode,elapsed:end-p.start,frames:frames.length,fps:frames.length*1000/(end-p.start),
        gapMedian:percentile(gaps,.5),gapP95:percentile(gaps,.95),gapMax:Math.max(0,...gaps),
        cpuMedian:percentile(q.cpu,.5),cpuP95:percentile(q.cpu,.95),cpuMax:Math.max(0,...q.cpu),
        renderMedian:percentile(frames.map(f=>f[1]),.5),renderP95:percentile(frames.map(f=>f[1]),.95),
        detail:data,uploadBytes:p.uploads.reduce((a,r)=>a+r[2],0),
        memory:q.gpuBuffers.snapshot(),residency:{...q.geometryResidency.stats},shadows:{...q.shadowDepth.stats},
        shaders:{...q.shaderWarmup.stats},draw:{...q.renderer.info.render},npcCount:q.npcs.size,
        visibleNPC:[...q.npcs.values()].filter(n=>n.carrier.visible).length,
        colony:{...q.colonyDraws.stats},atlas:{...q.poseAtlas.stats},multiDraw:q.renderer.extensions.has("WEBGL_multi_draw"),
        dpr:q.renderer.getPixelRatio(),contextLost:q.renderer.getContext().isContextLost(),
        framesRaw:frames,tasks:p.tasks};
    },mode);
    rows.push(row);fs.writeFileSync(path.join(review,"city-stalls.json"),JSON.stringify(rows,null,2));
    console.log("CITY_STALLS",JSON.stringify({...row,framesRaw:undefined,memory:{...row.memory,compiles:row.memory.compiles.slice(-3)},detail:Object.fromEntries(Object.entries(row.detail).map(([k,v])=>[k,{...v,events:v.events.slice(-4)}]))}));
    assert.equal(row.contextLost,false);assert.equal(row.dpr,2);assert.ok(row.frames>0);
  }
}
