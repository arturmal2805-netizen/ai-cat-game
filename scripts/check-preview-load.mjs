import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

export async function checkPreviewLoad(page, review) {
  console.log("PREVIEW_LOAD_START", process.env.CHICHI_BASELINE_REF || "candidate");
  let failedMetadata = 0;
  await page.route("**/art/previews/catalog.json", route => {
    failedMetadata++;
    return route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
  });
  await page.evaluate(() => {
    __lagoonSaveQA.getWorld().focus("jobcity");
    const q=__lagoonQA,b=q.islands.get("jobcity");q.reviewView(b.position.x,b.position.z,85);
  });
  await page.waitForFunction(() => !__lagoonQA.islands.get("jobcity").userData.lowOnly && __lagoonQA.shaderWarmup.idle(), null, { timeout: 240000 });
  console.log("PREVIEW_LOAD_CITY_READY");
  const before = await page.evaluate(() => ({ frames: __lagoonQA.frames, previewContexts: globalThis.__previewRendererCount || 0 }));
  await page.locator("#shop-open").click();
  await page.waitForFunction(() => document.querySelector("#shop-dialog").open);
  await page.waitForTimeout(400);
  const closed = await page.evaluate(() => {
    document.querySelector("#shop-dialog").close();
    return { at: performance.now(), draws: globalThis.__previewDraws || 0 };
  });
  const ms = Number(process.env.CHICHI_PREVIEW_SAMPLE_MS || 20000);
  const result = await page.evaluate(ms => new Promise(resolve => {
    const q = __lagoonQA, start = performance.now(), distance = q.getDesiredDistance();
    q.liveFrames = [];
    let minZoom = Infinity, maxZoom = -Infinity, timerTicks = 0;
    const timer = setInterval(() => {
      const elapsed = performance.now() - start;
      minZoom = Math.min(minZoom, q.getDesiredDistance()); maxZoom = Math.max(maxZoom, q.getDesiredDistance()); timerTicks++;
      if (elapsed < ms) {
        const target = distance + Math.sin(elapsed / ms * Math.PI * 4) * 8;
        q.renderer.domElement.dispatchEvent(new WheelEvent("wheel", { deltaY: (target - q.getDesiredDistance()) / .025, bubbles: true, cancelable: true }));
        return;
      }
      clearInterval(timer); q.freeze = true; q.gpuFrames.ready();
      const frames = q.liveFrames, gaps = frames.slice(1).map((f, i) => f[0] - frames[i][0]).sort((a,b) => a-b);
      resolve({ elapsed, frames: frames.length, submittedFps: frames.length * 1000 / elapsed,
        gapMedian: gaps[Math.floor(gaps.length * .5)], gapP95: gaps[Math.floor(gaps.length * .95)], gapMax: gaps.at(-1),
        timerTicks, zoomRange: maxZoom - minZoom, pending: q.gpuFrames.pending,
        previewContexts: globalThis.__previewRendererCount || 0, previewDraws: globalThis.__previewDraws || 0,
        dpr: q.renderer.getPixelRatio(), contextLost: q.renderer.getContext().isContextLost(),
        shopOpen: document.querySelector("#shop-dialog").open,
        readyPNGs: [...document.querySelectorAll("[data-preview] img")].filter(i => i.src.includes("/art/previews/")).length });
    }, 100);
  }), ms);
  result.failedMetadata = failedMetadata;
  result.previewDrawsAfterClose = result.previewDraws - closed.draws;
  result.before = before;
  fs.writeFileSync(path.join(review, "preview-load.json"), JSON.stringify(result, null, 2));
  console.log("PREVIEW_LOAD", JSON.stringify(result));
  assert.equal(result.contextLost, false); assert.equal(result.dpr, 2); assert.equal(result.shopOpen, false);
  if (!process.env.CHICHI_BASELINE_REF) {
    assert.ok(result.frames > 0); assert.ok(result.zoomRange > 6);
    assert.equal(result.previewContexts, 0); assert.equal(result.previewDrawsAfterClose, 0);
    assert.equal(failedMetadata, 0, "normal preview loading no longer depends on this network request");
    assert.ok(result.readyPNGs > 0);
    await page.screenshot({ path: path.join(review, "after-shop-close.png") });
  }
}
