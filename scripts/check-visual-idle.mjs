// Actual viewport/menus and the native RAF; no synthetic rendering cadence,
// game-clock changes, live accounts or paid model calls.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

export async function checkVisualIdle(page, out, base) {
  const rows=[];
  await page.waitForFunction(()=>__lagoonQA.frames>3 && __lagoonQA.shaderWarmup.idle(),null,{timeout:240000});
  const initial=await page.evaluate(()=>{
    const q=__lagoonQA,step=q.jobs.step;
    q.idleWorkSteps=0;q.jobs.step=function(...args){q.idleWorkSteps++;return step.apply(this,args);};
    const spacer=document.createElement("div");spacer.id="qa-scroll-space";spacer.style.height="6000px";document.body.append(spacer);
    return {cats:q.npcs.size,dpr:q.renderer.getPixelRatio(),buffer:[q.renderer.domElement.width,q.renderer.domElement.height]};
  });
  await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));
  await page.waitForFunction(()=>!__lagoonQA.isVisible());
  for(const legacy of [true,false]){
    const before=await page.evaluate(legacy=>{
      globalThis.__qaWarmupCovered=legacy;
      const q=__lagoonQA,T=q.THREE;
      const texture=new T.DataTexture(new Uint8Array(16*16*4).fill(255),16,16);texture.needsUpdate=true;
      const g=q.idleTestMesh=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial({map:texture}));
      q.idlePreparationReady=false;q.shaderWarmup.prepare(g).then(()=>q.idlePreparationReady=true);
      return {frames:q.frames,steps:q.idleWorkSteps,compiled:q.shaderWarmup.stats.compiled,textures:q.shaderWarmup.stats.textures};
    },legacy);
    if(legacy)await page.waitForFunction(()=>__lagoonQA.idlePreparationReady);
    await page.waitForTimeout(800);
    const row=await page.evaluate(before=>({frames:__lagoonQA.frames-before.frames,workSteps:__lagoonQA.idleWorkSteps-before.steps,
      compiled:__lagoonQA.shaderWarmup.stats.compiled-before.compiled,textures:__lagoonQA.shaderWarmup.stats.textures-before.textures,
      prepared:__lagoonQA.idlePreparationReady,visible:__lagoonQA.isVisible(),hidden:document.hidden}),before);
    rows.push({phase:legacy?"released-offscreen-preparation":"candidate-offscreen-preparation",...row});
    console.log("VISUAL_STEP",JSON.stringify(rows.at(-1)));
    assert.equal(row.visible,false);assert.equal(row.hidden,false);assert.ok(row.workSteps>0);
    assert.equal(row.frames,0,"the released renderer already omits offscreen GPU frames");
    if(legacy){
      assert.equal(row.prepared,true);assert.ok(row.compiled>0);assert.equal(row.textures,1);
      await page.evaluate(()=>{const g=__lagoonQA.idleTestMesh;g.geometry.dispose();g.material.map.dispose();g.material.dispose();});
    }else{
      assert.equal(row.prepared,false);assert.equal(row.compiled,0);assert.equal(row.textures,0);
    }
  }
  await page.evaluate(()=>{scrollTo(0,0);});
  await page.waitForFunction(()=>__lagoonQA.isVisible() && __lagoonQA.idlePreparationReady);
  await page.evaluate(()=>{const q=__lagoonQA;q.idleTestMesh.geometry.dispose();q.idleTestMesh.material.map.dispose();q.idleTestMesh.material.dispose();});
  const visibleFrame=await page.evaluate(()=>__lagoonQA.frames);
  await page.waitForFunction(f=>__lagoonQA.frames>f+2,visibleFrame);
  rows.push({phase:"visible-return",frames:await page.evaluate(f=>__lagoonQA.frames-f,visibleFrame),preparationResumed:true});

  await page.evaluate(()=>{
    const d=document.createElement("dialog");d.id="qa-covered-map";d.textContent="Private test menu";document.body.append(d);d.showModal();
    const q=__lagoonQA,T=q.THREE;q.idlePreparationReady=false;
    const g=q.idleTestMesh=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());
    q.shaderWarmup.prepare(g).then(()=>q.idlePreparationReady=true);
  });
  const covered=await page.evaluate(()=>__lagoonQA.frames);
  await page.waitForTimeout(800);
  assert.equal(await page.evaluate(()=>__lagoonQA.idlePreparationReady),false,"shader preparation must sleep behind menus");
  assert.equal(await page.evaluate(()=>__lagoonQA.frames),covered);
  await page.evaluate(()=>{document.querySelector("#qa-covered-map").close();document.querySelector("#qa-covered-map").remove();});
  await page.waitForFunction(()=>__lagoonQA.idlePreparationReady);
  await page.evaluate(()=>{const g=__lagoonQA.idleTestMesh;g.geometry.dispose();g.material.dispose();});
  rows.push({phase:"menu-preparation",slept:true,resumed:true});
  const afterMenu=await page.evaluate(()=>__lagoonQA.frames);
  await page.waitForFunction(f=>__lagoonQA.frames>f+2,afterMenu);

  const toggle=page.locator("[data-profile-pause]");await toggle.click();
  const stopped=await page.evaluate(()=>({frames:__lagoonQA.frames,steps:__lagoonQA.idleWorkSteps}));
  await page.waitForTimeout(3000);
  const manual=await page.evaluate(before=>({frames:__lagoonQA.frames-before.frames,workSteps:__lagoonQA.idleWorkSteps-before.steps}),stopped);
  assert.equal(manual.frames,0);assert.ok(manual.workSteps>0);rows.push({phase:"manual-profile-stop",...manual});
  await page.evaluate(()=>Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async text=>globalThis.__idleReport=text}}));
  await page.locator("[data-profile-copy]").click();
  const report=await page.evaluate(()=>JSON.parse(globalThis.__idleReport));
  assert.equal(report.suspended,true);assert.ok(report.samples>0);
  await fs.writeFile(path.join(out,"paused-report.json"),JSON.stringify(report,null,2)+"\n");
  await toggle.click();
  const resumed=await page.evaluate(()=>__lagoonQA.frames);await page.waitForFunction(f=>__lagoonQA.frames>f,resumed);
  const returned=await page.evaluate(()=>{
    const q=__lagoonQA,gl=q.renderer.getContext();q.freeze=true;q.drawFrame();
    const pixel=new Uint8Array(4);gl.readPixels(gl.drawingBufferWidth/2,gl.drawingBufferHeight/2,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
    return {cats:q.npcs.size,dpr:q.renderer.getPixelRatio(),buffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],error:gl.getError(),contextLost:gl.isContextLost(),pixel:Array.from(pixel)};
  });
  assert.equal(returned.cats,initial.cats);assert.equal(returned.dpr,initial.dpr);assert.deepEqual(returned.buffer,initial.buffer);
  assert.equal(returned.error,0);assert.equal(returned.contextLost,false);assert.ok(returned.pixel.slice(0,3).some(v=>v>0));
  await page.screenshot({path:path.join(out,"visible-return.png")});

  await page.evaluate(()=>__lagoonSaveQA.cloud.flush());
  // A second page avoids cancelled unload requests contaminating a visual
  // diagnostic with WebKit's expected navigation-teardown console messages.
  const automatic=await page.context().newPage(),autoErrors=[];
  automatic.on("pageerror",e=>autoErrors.push(e.message));
  automatic.on("console",m=>{if(m.type()==="error")autoErrors.push(m.text());});
  await automatic.goto(base+"?profile=1&pauseAfter=5");
  await automatic.waitForFunction(()=>document.querySelector("[data-profile-pause]")?.textContent==="Продолжить 3D",null,{timeout:120000});
  await automatic.waitForFunction(()=>!!globalThis.__lagoonQA);
  const autoFrame=await automatic.evaluate(()=>__lagoonQA.frames);await automatic.waitForTimeout(1200);
  assert.equal(await automatic.evaluate(()=>__lagoonQA.frames),autoFrame,"the automatic deadline must stop native GPU submissions");
  assert.deepEqual(autoErrors,[]);
  rows.push({phase:"automatic-profile-stop",frames:0,seconds:5});
  await fs.writeFile(path.join(out,"visual-idle.json"),JSON.stringify({rows,initial,returned},null,2)+"\n");
  console.log("VISUAL_IDLE",JSON.stringify({rows,initial,returned}));
}
