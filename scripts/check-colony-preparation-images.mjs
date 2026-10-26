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
        [...q.itemGroups.values()].filter(g=>g.userData.placement?.biome===id).every(g=>g.userData.built);
    },id,{timeout:600000});
    const frame=await page.evaluate(()=>{
      const q=__lagoonQA;q.drawPaused=false;q.cpuOnly=false;return q.frames;
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
      const q=__lagoonQA,gl=q.renderer.getContext();q.drawFrame();
      q.preparationPixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);
      gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,q.preparationPixels);
      q.preparationDraw={...q.renderer.info.render};
      q.colonyDraws.rebuildForQA(false);
    });
    await page.waitForFunction(()=>__lagoonQA.colonyDraws.stats.ready && __lagoonQA.shaderWarmup.idle());
    await page.evaluate(()=>{__lagoonQA.drawFrame();__lagoonQA.drawFrame();});
    await page.waitForFunction(()=>__lagoonQA.shaderWarmup.idle());
    const row=await page.evaluate(()=>{
      const q=__lagoonQA,gl=q.renderer.getContext();q.drawFrame();
      const pixels=new Uint8Array(q.preparationPixels.length);
      gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      let changed=0;for(let i=0;i<pixels.length;i++)if(pixels[i]!==q.preparationPixels[i])changed++;
      delete q.preparationPixels;
      const result={changed,released:q.preparationDraw,candidate:{...q.renderer.info.render},
        colony:{...q.colonyDraws.stats},atlas:{...q.poseAtlas.stats},npcCount:q.npcs.size,
        dpr:q.renderer.getPixelRatio(),buffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],
        error:gl.getError(),contextLost:gl.isContextLost()};
      q.shadowDepth.setEnabled(true);q.gpuFrames.clear();return result;
    });
    rows.push({id,...row});console.log("PREPARATION_IMAGE",JSON.stringify(rows.at(-1)));
    await fs.writeFile(path.join(out,"images.json"),JSON.stringify(rows,null,2)+"\n");
    assert.equal(row.changed,0);assert.equal(row.released.calls,row.candidate.calls);
    assert.equal(row.released.triangles,row.candidate.triangles);
    assert.equal(row.error,0);assert.equal(row.contextLost,false);assert.equal(row.dpr,2);
    await page.screenshot({path:path.join(out,`preparation-${id}.png`)});
  }
}
