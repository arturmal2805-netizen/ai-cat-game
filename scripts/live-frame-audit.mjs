// Observe the real RAF / WebGL / GPU-fence path. Never suppress draws, manually
// step simulation, disable backpressure or infer FPS from command-only frames.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

export async function auditLiveFrames(page, review) {
  const ids = process.env.CHICHI_LIVE_BIOMES?.split(",") ||
    await page.locator("[data-biome]").evaluateAll(ns => ns.map(n => n.dataset.biome));
  const rows = [];
  const inspect = () => page.evaluate(() => {
    const q = __lagoonQA, times = q.liveFrames || [], gaps = [];
    for (let i = 1; i < times.length; i++) gaps.push(times[i][0] - times[i - 1][0]);
    gaps.sort((a,b) => a-b);
    const cpu = times.map(t => t[1]).sort((a,b) => a-b);
    return {
      renderedFrames: times.length,
      frameGapMedian: gaps[Math.floor(gaps.length * .5)] ?? null,
      frameGapP95: gaps[Math.floor(gaps.length * .95)] ?? null,
      frameGapMax: gaps.at(-1) ?? null,
      renderCpuMedian: cpu[Math.floor(cpu.length * .5)] ?? null,
      renderCpuMax: cpu.at(-1) ?? null,
      pendingGpu: q.gpuFrames?.pending ?? null,
      shaders: { ...q.shaderWarmup?.stats },
      triangles: times.at(-1)?.[3], calls: times.at(-1)?.[2],
      dpr: q.renderer.getPixelRatio(), contextLost: q.renderer.getContext().isContextLost(),
      visible: q.isVisible(), documentHidden: document.hidden, scrollY,
      buffer: [q.renderer.domElement.width,q.renderer.domElement.height],
      distance: q.getDistance(), targetDistance: q.getDesiredDistance(),
      distanceToTarget: q.look.distanceTo(q.desiredLook),
    };
  });
  for (const id of [...ids, ...(process.env.CHICHI_LIVE_NO_REPEAT ? [] : [ids[0]])]) {
    const started = Date.now();
    await page.evaluate(id => {
      const q = __lagoonQA;
      q.liveFrames = [];
      document.querySelector(`[data-biome="${id}"]`).click();
      const b = q.islands.get(id);
      q.reviewView(b.position.x, b.position.z, 85);
    }, id);
    let error = null;
    try {
      await page.waitForFunction(id => !__lagoonQA.islands.get(id).userData.lowOnly,
        id, { timeout: 120000 });
    } catch (e) { error = e.message.slice(0,160); }
    const detailReadyMs = Date.now() - started, cold = await inspect();
    await page.evaluate(() => { __lagoonQA.liveFrames = []; });
    await page.waitForTimeout(2000);
    const still = await inspect();
    await page.evaluate(() => { __lagoonQA.liveFrames = []; });
    for (let i = 0; i < 12; i++) {
      await page.evaluate(i => __lagoonQA.renderer.domElement.dispatchEvent(
        new WheelEvent("wheel", { deltaY: i < 6 ? -35 : 35, bubbles: true, cancelable: true })
      ), i);
      await page.waitForTimeout(90);
    }
    await page.waitForTimeout(700);
    const zoom = await inspect();
    await page.evaluate(() => { __lagoonQA.liveFrames = []; });
    const box = await page.locator("#map canvas").boundingBox();
    const x = box.x + box.width * .65, y = box.y + box.height * .35;
    await page.mouse.move(x,y);
    await page.mouse.down();
    for (let i=1;i<=6;i++) {
      await page.mouse.move(x+i*8,y+i*2);
      await page.waitForTimeout(90);
    }
    await page.mouse.up();
    await page.waitForTimeout(700);
    const orbit = await inspect();
    const row = { id, repeat: rows.some(r=>r.id===id), detailReadyMs, error, cold, still, zoom, orbit };
    rows.push(row);
    fs.writeFileSync(path.join(review,"live-frames.json"),JSON.stringify(rows,null,2));
    console.log("LIVE_FRAME",JSON.stringify(row));
    assert.equal(zoom.contextLost, false);
    assert.equal(zoom.dpr,2);
    if (["summer","sakura","aquarium"].includes(id))
      await page.screenshot({ path: path.join(review,id+"-live.png") });
  }
  assert.ok(rows.every(r=>!r.error), "Every island must finish loading");
  assert.ok(rows.every(r=>r.zoom.renderedFrames>0), "Every island must keep rendering while zooming");
  assert.ok(rows.every(r=>r.orbit.renderedFrames>0), "Every island must keep rendering while orbiting");
}
