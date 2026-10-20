// Private-world QA: exercise the actual wheel/pointer handlers and live RAF.
// Software GPU timings are diagnostics, never physical Mac/iPhone FPS claims.
import fs from "node:fs";
import path from "node:path";

export async function auditCameraGestures(page, context, review) {
  const id = process.env.CHICHI_GESTURE_BIOME || "homestead";
  await page.locator(`[data-biome="${id}"]`).tap();
  await page.waitForFunction(
    (id) => !__lagoonQA.islands.get(id).userData.lowOnly,
    id,
  );
  await page.evaluate((id) => {
    const q = __lagoonQA,
      g = q.islands.get(id);
    q.reviewView(g.position.x, g.position.z, 100);
    q.drawPaused = true;
    q.cpuOnly = true;
  }, id);
  await page.waitForFunction(
    () =>
      Math.abs(__lagoonQA.getDistance() - 100) < 0.1 &&
      __lagoonQA.colonyDraws.stats.ready,
  );
  await page
    .waitForFunction(
      () => !__lagoonQA.shaderWarmup || __lagoonQA.shaderWarmup.idle(),
    )
    .catch(async (error) => {
      console.log(
        "WARMUP",
        await page.evaluate(() => __lagoonQA.shaderWarmup?.stats),
      );
      throw error;
    });
  await page.evaluate(() => {
    const q = __lagoonQA;
    q.drawFrame();
    q.renderer.getContext().finish(); // QA only; production keeps nonblocking fences.
    q.longTasks = [];
    new PerformanceObserver((list) =>
      q.longTasks.push(
        ...list
          .getEntries()
          .map((e) => ({ start: e.startTime, duration: e.duration })),
      ),
    ).observe({ type: "longtask", buffered: false });
  });
  if (process.env.CHICHI_GESTURE_HIDE_CATS)
    await page.evaluate(() => {
      __lagoonQA.cat.visible = false;
      __lagoonQA.poseAtlas.forEachCat((cat) => (cat.visible = false));
    });
  const cdp = await context.newCDPSession(page);
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.setSamplingInterval", { interval: 100 });
  await cdp.send("Performance.enable");
  const rows = [];
  for (const raster of [false, true]) {
    await page.evaluate((raster) => {
      const q = __lagoonQA;
      q.drawPaused = !raster;
      q.cpuOnly = !raster;
      q.cpu = [];
      q.measure = true;
      q.longTasks = [];
      q.gestureStart = performance.now();
      q.startFrames = q.frames;
      q.startResizes = q.resizes;
      q.manualFrames = !raster;
    }, raster);
    const before = await cdp.send("Performance.getMetrics");
    await cdp.send("Profiler.start");
    await page.evaluate(async (raster) => {
      const canvas = __lagoonQA.renderer.domElement;
      for (let i = 0; i < (raster ? 48 : 180); i++) {
        canvas.dispatchEvent(
          new WheelEvent("wheel", {
            bubbles: true,
            cancelable: true,
            deltaY: Math.cos(i / (raster ? 7 : 26)) * 80,
          }),
        );
        if (!raster) {
          __lagoonQA.manualStepping = true;
          __lagoonQA.step(performance.now());
          __lagoonQA.manualStepping = false;
        }
        await new Promise((resolve) => setTimeout(resolve, raster ? 80 : 16));
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }, raster);
    const profile = await cdp.send("Profiler.stop");
    fs.writeFileSync(
      path.join(review, `gesture-${id}-${raster ? "gpu" : "cpu"}-profile.json`),
      JSON.stringify(profile),
    );
    const after = await cdp.send("Performance.getMetrics");
    const result = await page.evaluate(() => {
      const q = __lagoonQA,
        a = q.cpu.slice().sort((a, b) => a - b);
      q.measure = false;
      return {
        elapsed: performance.now() - q.gestureStart,
        frames: q.frames - q.startFrames,
        samples: a.length,
        cpu: {
          median: a[Math.floor(a.length * 0.5)],
          p95: a[Math.floor(a.length * 0.95)],
          max: a.at(-1),
        },
        resizes: q.resizes - q.startResizes,
        longTasks: q.longTasks,
        draw: { ...q.renderer.info.render },
        colony: { ...q.colonyDraws.stats },
        distance: q.getDistance(),
        desiredDistance: q.getDesiredDistance(),
        dpr: q.renderer.getPixelRatio(),
        buffer: [q.renderer.domElement.width, q.renderer.domElement.height],
      };
    });
    const metrics = {};
    for (const a of after.metrics) {
      const b = before.metrics.find((v) => v.name === a.name);
      if (b && /Duration|Count/.test(a.name))
        metrics[a.name] = a.value - b.value;
    }
    rows.push({ id, raster, ...result, metrics });
    console.log("GESTURE", JSON.stringify(rows.at(-1)));
  }
  fs.writeFileSync(
    path.join(review, "camera-gestures.json"),
    JSON.stringify(rows, null, 2),
  );
  if (process.env.CHICHI_GESTURE_ABLATE) {
    const ablation = await page.evaluate(() => {
      const q = __lagoonQA,
        gl = q.renderer.getContext(),
        rows = [],
        waters = [],
        all = [];
      q.freeze = true;
      q.drawPaused = true;
      q.manualFrames = false;
      q.scene.traverse((o) => {
        if (o.isMesh) {
          all.push(o);
          if (o.material.uniforms?.uWaterField) waters.push(o);
        }
      });
      const cats = [q.chichiCarrier];
      q.poseAtlas.forEachCat((cat) => cats.push(cat));
      const read = new Uint8Array(
        gl.drawingBufferWidth * gl.drawingBufferHeight * 4,
      );
      const draw = () => {
        const t = performance.now();
        q.drawFrame();
        gl.readPixels(
          0,
          0,
          gl.drawingBufferWidth,
          gl.drawingBufferHeight,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          read,
        );
        return performance.now() - t;
      };
      for (const [name, hidden, shadows] of [
        ["full", [], true],
        ["cats-hidden", cats, true],
        ["water-hidden", waters, true],
        ["shadow-disabled", [], false],
        ["full-repeat", [], true],
      ]) {
        const shown = hidden.map((o) => o.visible);
        hidden.forEach((o) => (o.visible = false));
        q.renderer.shadowMap.enabled = shadows;
        draw();
        const ms = draw();
        rows.push({ name, ms, draw: { ...q.renderer.info.render } });
        hidden.forEach((o, i) => (o.visible = shown[i]));
        q.renderer.shadowMap.enabled = true;
      }
      return rows;
    });
    fs.writeFileSync(
      path.join(review, "gesture-gpu-ablation.json"),
      JSON.stringify(ablation, null, 2),
    );
    console.log("ABLATION", JSON.stringify(ablation));
  }
}
