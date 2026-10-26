// Rebuild the real colony using either released temporary clones or borrowed
// immutable source streams; compare its complete frozen native colour/shadows.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

export async function checkColonyPreparationImages(page, out) {
  const rows=[];
  for(const id of (process.env.CHICHI_LIVE_BIOMES||"jobcity,summer,aquarium,homestead").split(",")){
    await page.evaluate(id=>{
      const q=__lagoonQA;q.freeze=false;q.drawPaused=true;q.cpuOnly=true;
      document.querySelector(`[data-biome="${id}"]`).click();
      const b=q.islands.get(id);q.reviewView(b.position.x,b.position.z,85);
    },id);
    await page.waitForFunction(id=>{
      const q=__lagoonQA;
      return !q.islands.get(id).userData.lowOnly && q.shaderWarmup.idle() &&
        q.colonyDraws.stats.ready && q.look.distanceTo(q.desiredLook)<.01 &&
        Math.abs(q.getDistance()-85)<.01 &&
        __lagoonSaveQA.getGame().placements.every(p=>p.readyAt>Date.now() || q.itemGroups.get(p.id)?.userData.built) &&
        [...q.islands.values()].every(g=>!g.userData.pendingHouses?.size) &&
        [...q.itemGroups.values()].filter(g=>g.userData.placement?.biome===id).every(g=>g.userData.built);
    },id,{timeout:600000});
    const frame=await page.evaluate(()=>{
      const q=__lagoonQA;q.drawPaused=false;q.cpuOnly=false;
      if (!q.preparationTrace) {
        const direct=q.renderer.renderBufferDirect;
        q.preparationTrace=[];
        q.renderer.renderBufferDirect=function(...args){
          const o=args[4],g=args[2];
          if(q.recordPreparation)q.preparationTrace.push({name:o.name||o.type,object:o.id,geometry:g.id,
            indexCount:g.index?.count,shadow:args[1]===null,
            commands:o._multiDrawCount,indices:o._multiDrawCounts?Array.from(o._multiDrawCounts).slice(0,o._multiDrawCount):null});
          return direct.apply(this,args);
        };
      }
      return q.frames;
    });
    await page.waitForFunction(frame=>__lagoonQA.frames>=frame+3 && __lagoonQA.shaderWarmup.idle(),frame,{timeout:240000});
    await page.evaluate(()=>{
      const q=__lagoonQA;q.freeze=true;q.shadowDepth.setEnabled(false);
      q.colonyDraws.rebuildForQA(true);
    });
    await page.waitForFunction(()=>__lagoonQA.colonyDraws.stats.ready && __lagoonQA.shaderWarmup.idle());
    await page.evaluate(()=>{__lagoonQA.drawFrame();__lagoonQA.drawFrame();});
    await page.waitForFunction(()=>__lagoonQA.shaderWarmup.idle());
    await page.evaluate(()=>{
      const q=__lagoonQA,gl=q.renderer.getContext();q.preparationTrace=[];q.recordPreparation=true;
      try{q.drawFrame();}finally{q.recordPreparation=false;}
      q.preparationPixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);
      gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,q.preparationPixels);
      q.preparationDraw={...q.renderer.info.render};
      q.preparationOldTrace=q.preparationTrace.slice();
      q.colonyDraws.rebuildForQA(false);
    });
    await page.waitForFunction(()=>__lagoonQA.colonyDraws.stats.ready && __lagoonQA.shaderWarmup.idle());
    await page.evaluate(()=>{__lagoonQA.drawFrame();__lagoonQA.drawFrame();});
    await page.waitForFunction(()=>__lagoonQA.shaderWarmup.idle());
    const row=await page.evaluate(()=>{
      const q=__lagoonQA,gl=q.renderer.getContext();q.preparationTrace=[];q.recordPreparation=true;
      try{q.drawFrame();}finally{q.recordPreparation=false;}
      const pixels=new Uint8Array(q.preparationPixels.length);
      gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      let changed=0;for(let i=0;i<pixels.length;i++)if(pixels[i]!==q.preparationPixels[i])changed++;
      delete q.preparationPixels;
      const result={changed,released:q.preparationDraw,candidate:{...q.renderer.info.render},
        trace:q.preparationDraw.calls!==q.renderer.info.render.calls || q.preparationDraw.triangles!==q.renderer.info.render.triangles
          ? {released:q.preparationOldTrace,candidate:q.preparationTrace} : undefined,
        colony:{...q.colonyDraws.stats},atlas:{...q.poseAtlas.stats},npcCount:q.npcs.size,
        dpr:q.renderer.getPixelRatio(),buffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],
        error:gl.getError(),contextLost:gl.isContextLost()};
      q.shadowDepth.setEnabled(true);q.gpuFrames.clear();return result;
    });
    rows.push({id,...row});console.log("PREPARATION_IMAGE",JSON.stringify({...rows.at(-1),trace:undefined}));
    await fs.writeFile(path.join(out,"images.json"),JSON.stringify(rows,null,2)+"\n");
    assert.equal(row.changed,0);assert.equal(row.released.calls,row.candidate.calls);
    assert.equal(row.released.triangles,row.candidate.triangles);
    assert.equal(row.error,0);assert.equal(row.contextLost,false);assert.equal(row.dpr,2);
    await page.screenshot({path:path.join(out,`preparation-${id}.png`)});
  }
}
