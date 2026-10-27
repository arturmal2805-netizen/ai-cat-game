import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

export async function checkFrameProfile(page, review) {
  await page.waitForFunction(()=>document.querySelector("#frame-profile [data-profile-copy]"));
  await page.evaluate(()=>Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async text=>globalThis.__copiedProfile=text}}));
  const button=page.locator("#frame-profile [data-profile-copy]");
  let report;
  for (let i=0;i<20;i++) {
    await page.waitForTimeout(1000);
    await button.click();
    report=await page.evaluate(()=>JSON.parse(globalThis.__copiedProfile));
    if(report.samples>=5)break;
  }
  assert.ok(report.samples>=5);
  assert.equal(typeof report.gpu,"string");
  assert.ok(report.fps>0);assert.equal(report.last.dpr,2);
  assert.ok(report.cpuP95>=0);assert.ok(report.renderP95>=0);
  for(const field of ["refaults","refaultBytes","rapidRefaults","rapidRefaultBytes","shaderPreparing"])
    assert.equal(typeof report.last[field],"number",field);
  assert.equal(typeof report.geometryRefaultsDuringWindow,"number");
  assert.equal(typeof report.geometryRapidRefaultBytesDuringWindow,"number");
  assert.equal(typeof report.nativeGlCallsSinceReset,"object");
  assert.ok(report.nativeGlCallsSinceReset.texSubImage2D?.calls>0);
  assert.ok(Array.isArray(report.longestMainThreadTasksMs));
  assert.equal(typeof report.mainThreadLongTasksSupported,"boolean");
  assert.ok(report.longestMainThreadTasksMs.length<=20);
  assert.ok(report.last.pending<=2);
  const privacy=await page.evaluate(()=>({
    token:__lagoonSaveQA.cloud.token,
    actualDpr:__lagoonQA.renderer.getPixelRatio(),
    buffer:[__lagoonQA.renderer.domElement.width,__lagoonQA.renderer.domElement.height],
    contextLost:__lagoonQA.renderer.getContext().isContextLost(),
    destination:location.origin,
  }));
  assert.equal(privacy.contextLost,false);assert.equal(privacy.actualDpr,2);
  assert.deepEqual(report.last.buffer,privacy.buffer);
  if(privacy.token)assert.equal(JSON.stringify(report).includes(privacy.token),false);
  fs.writeFileSync(path.join(review,"device-profile.json"),JSON.stringify(report,null,2));
  await page.evaluate(()=>Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async()=>{throw Error("Clipboard permission unavailable");}}}));
  await button.click();
  const output=page.locator("#frame-profile textarea");
  assert.equal(await output.isVisible(),true);
  const fallback=JSON.parse(await output.inputValue());
  assert.ok(fallback.samples>=5);assert.equal(fallback.gpu,report.gpu);
  await page.screenshot({path:path.join(review,"device-profile.png")});
  console.log("DEVICE_PROFILE",JSON.stringify(report));
}
