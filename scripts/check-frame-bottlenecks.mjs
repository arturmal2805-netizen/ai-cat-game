// Private-world diagnosis: retain native rendering, original graphics and the
// real GPU queue. Memory inventories are outside timed frame sampling.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

export async function checkFrameBottlenecks(page, context, review) {
  const cdp = process.env.CHICHI_BROWSER === "webkit" ? null : await context.newCDPSession(page);
  if (cdp) {
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.setSamplingInterval", { interval: 1000 });
  }
  const rows = [];
  for (const id of (process.env.CHICHI_LIVE_BIOMES || "moon,jobcity,summer,aquarium,homestead,moon").split(",")) {
    await page.evaluate(id => {
      const q = __lagoonQA;
      q.freeze = false;
      document.querySelector(`[data-biome="${id}"]`).click();
      const b = q.islands.get(id);
      q.reviewView(b.position.x, b.position.z, 85);
    }, id);
    await page.waitForFunction(id => {
      const q = __lagoonQA;
      return !q.islands.get(id).userData.lowOnly && q.shaderWarmup.idle() &&
        q.look.distanceTo(q.desiredLook) < .01 && Math.abs(q.getDistance()-85) < .01;
    }, id, { timeout: 240000 });
    await page.waitForTimeout(1000);
    await page.evaluate(() => { __lagoonQA.liveFrames = []; });
    if (cdp) await cdp.send("Profiler.start");
    await page.waitForTimeout(Number(process.env.CHICHI_NATIVE_SAMPLE_MS || 15000));
    if (cdp) {
      const profile = await cdp.send("Profiler.stop");
      fs.writeFileSync(path.join(review, `${rows.length}-${id}-cpu.json`), JSON.stringify(profile));
    }
    const row = await page.evaluate(id => {
      const q = __lagoonQA;
      q.freeze = true;
      const arrays = new Set(), geometries = new Set(), materials = new Set(),
        textures = new Set(), roots = [];
      let nodes = 0, meshes = 0;
      for (const root of q.scene.children) {
        let bytes = 0, count = 0;
        root.traverse(o => {
          nodes++;
          if (!o.geometry) return;
          meshes++; count++;
          const g = o.geometry;
          if (!geometries.has(g)) {
            geometries.add(g);
            const attributes = [g.index, ...Object.values(g.attributes), ...Object.values(g.morphAttributes).flat()].filter(Boolean);
            for (const attribute of attributes) {
              const buffer = (attribute.isInterleavedBufferAttribute ? attribute.data : attribute).array?.buffer;
              if (buffer && !arrays.has(buffer)) { arrays.add(buffer); bytes += buffer.byteLength; }
            }
          }
          for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
            if (!m || materials.has(m)) continue;
            materials.add(m);
            for (const v of Object.values(m)) if (v?.isTexture) textures.add(v);
            for (const u of Object.values(m.uniforms || {})) if (u?.value?.isTexture) textures.add(u.value);
          }
        });
        roots.push({name:root.name,biome:root.userData.biomeId,placement:root.userData.placementId,bytes,meshes:count});
      }
      const frames = q.liveFrames, gaps=frames.slice(1).map((f,i)=>f[0]-frames[i][0]),
        pct=(v,p)=>v.slice().sort((a,b)=>a-b)[Math.floor((v.length-1)*p)]??null;
      return {id,frames:frames.length,gapMedian:pct(gaps,.5),gapP95:pct(gaps,.95),
        renderMedian:pct(frames.map(f=>f[1]),.5),renderP95:pct(frames.map(f=>f[1]),.95),
        graph:{nodes,meshes,geometries:geometries.size,materials:materials.size,textures:textures.size,
          geometryBytes:roots.reduce((s,r)=>s+r.bytes,0),roots:roots.sort((a,b)=>b.bytes-a.bytes)},
        draw:{...q.renderer.info.render},shaders:{...q.shaderWarmup.stats},residency:{...q.geometryResidency.stats},
        buffers:q.gpuBuffers.snapshot(),npcCount:q.npcs.size,dpr:q.renderer.getPixelRatio(),
        contextLost:q.renderer.getContext().isContextLost()};
    }, id);
    if (cdp) row.heap = await cdp.send("Runtime.getHeapUsage");
    if (process.env.CHICHI_OPAQUE_SORT_AUDIT) row.opaqueSort = await page.evaluate(() => {
      const q=__lagoonQA,gl=q.renderer.getContext(),
        reference=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4),
        pixels=new Uint8Array(reference.length),rows=[];
      const frontToBack=(a,b)=>a.groupOrder-b.groupOrder || a.renderOrder-b.renderOrder ||
        a.z-b.z || a.material.id-b.material.id || a.materialVariant-b.materialVariant || a.id-b.id;
      const draw=()=>{
        const at=performance.now();q.drawFrame();
        gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
        return performance.now()-at;
      };
      q.shadowDepth.setEnabled(false);
      try {
        q.renderer.setOpaqueSort(null);draw();reference.set(pixels);
        for (const candidate of [false,true,true,false]) {
          q.renderer.setOpaqueSort(candidate?frontToBack:null);draw();
          const ms=[draw(),draw()];let changed=0,maxDelta=0;
          for(let i=0;i<pixels.length;i++)if(pixels[i]!==reference[i]){changed++;maxDelta=Math.max(maxDelta,Math.abs(pixels[i]-reference[i]));}
          rows.push({candidate,ms,changed,maxDelta,draw:{...q.renderer.info.render}});
        }
      } finally {q.renderer.setOpaqueSort(null);q.shadowDepth.setEnabled(true);q.gpuFrames.clear();}
      return rows;
    });
    if (process.env.CHICHI_COMPARE_COMPACT_RANGES) row.compactRanges = await page.evaluate(() => {
      const q=__lagoonQA,gl=q.renderer.getContext(),
        reference=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4),
        pixels=new Uint8Array(reference.length),rows=[];
      const draw=()=>{const at=performance.now();q.drawFrame();gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return performance.now()-at;};
      q.shadowDepth.setEnabled(false);
      try {
        globalThis.__qaCompactRanges=false;draw();reference.set(pixels);
        for(const compact of [false,true,true,false]){
          globalThis.__qaCompactRanges=compact;draw();
          const ms=[draw(),draw()];let changed=0,maxDelta=0;
          for(let i=0;i<pixels.length;i++)if(pixels[i]!==reference[i]){changed++;maxDelta=Math.max(maxDelta,Math.abs(pixels[i]-reference[i]));}
          rows.push({compact,ms,changed,maxDelta,draw:{...q.renderer.info.render},commands:q.gpuBuffers.snapshot()});
        }
      } finally {globalThis.__qaCompactRanges=false;q.shadowDepth.setEnabled(true);q.gpuFrames.clear();}
      return rows.map(r=>({...r,commands:{...r.commands,compiles:undefined}}));
    });
    for(const proof of row.compactRanges || []) {
      assert.equal(proof.changed,0,`${id}: retain every reference pixel`);
      assert.equal(proof.draw.calls,row.compactRanges[0].draw.calls);
      assert.ok(proof.draw.triangles<=row.compactRanges[0].draw.triangles*1.03);
    }
    assert.equal(row.dpr,2);assert.equal(row.contextLost,false);assert.ok(row.frames>0);
    rows.push(row);
    fs.writeFileSync(path.join(review,"frame-bottlenecks.json"),JSON.stringify(rows,null,2));
    console.log("FRAME_BOTTLENECK",JSON.stringify({...row,graph:{...row.graph,roots:row.graph.roots.slice(0,4)},buffers:{...row.buffers,compiles:undefined}}));
  }
}
