// Complete frame + persistence profile in a private world. Real full-resolution
// frames are warmed first; command-only samples do not claim device GPU FPS.
import fs from "node:fs";
import path from "node:path";
export async function auditFullFrames(page, context, review) {
  const cdp = await context.newCDPSession(page),
    rows = [];
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.setSamplingInterval", { interval: 100 });
  for (const id of (
    process.env.CHICHI_FULL_FRAME_BIOMES || "bikini,aquarium,homestead"
  ).split(",")) {
    await page.evaluate((id) => {
      const q = __lagoonQA;
      q.freeze = false;
      q.manualFrames = false;
      q.drawPaused = true;
      q.cpuOnly = true;
      document.querySelector(`[data-biome="${id}"]`).click();
      const island = q.islands.get(id);
      q.reviewView(island.position.x, island.position.z, 85);
    }, id);
    await page.waitForFunction(
      (id) => !__lagoonQA.islands.get(id).userData.lowOnly,
      id,
    );
    await page.waitForFunction(
      () =>
        Math.abs(__lagoonQA.getDistance() - 85) < 0.1 &&
        __lagoonQA.look.distanceTo(__lagoonQA.desiredLook) < 0.01 &&
        __lagoonQA.colonyDraws.stats.ready,
    );
    await page.waitForFunction(
      () => !__lagoonQA.shaderWarmup || __lagoonQA.shaderWarmup.idle(),
    );
    await page.evaluate(() => {
      const q = __lagoonQA,
        gl = q.renderer.getContext();
      q.freeze = true;
      q.drawFrame();
      gl.finish();
      q.restoreRaster = [];
      const suppress = (object, key) => {
        const original = object[key];
        if (typeof original !== "function") return;
        q.restoreRaster.push(() => (object[key] = original));
        object[key] = () => {};
      };
      for (const key of [
        "drawArrays",
        "drawElements",
        "drawArraysInstanced",
        "drawElementsInstanced",
        "clear",
      ])
        suppress(gl, key);
      const multi = gl.getExtension("WEBGL_multi_draw");
      if (multi)
        for (const key of [
          "multiDrawArraysWEBGL",
          "multiDrawElementsWEBGL",
          "multiDrawArraysInstancedWEBGL",
          "multiDrawElementsInstancedWEBGL",
        ])
          suppress(multi, key);
      q.manualFrames = true;
      q.commandOnly = true;
      q.freeze = false;
      q.longTasks = [];
      q.observer = new PerformanceObserver((list) =>
        q.longTasks.push(
          ...list
            .getEntries()
            .map((e) => ({ start: e.startTime, duration: e.duration })),
        ),
      );
      q.observer.observe({ type: "longtask", buffered: false });
    });
    await cdp.send("Profiler.start");
    let result;
    try {
      result = await page.evaluate(async () => {
        const q = __lagoonQA,
          canvas = q.renderer.domElement,
          frames = [];
        for (let i = 0; i < 180; i++) {
          canvas.dispatchEvent(
            new WheelEvent("wheel", {
              deltaY: Math.cos(i / 20) * 40,
              bubbles: true,
              cancelable: true,
            }),
          );
          q.manualStepping = true;
          const start = performance.now();
          try {
            q.step(start);
          } finally {
            q.manualStepping = false;
          }
          frames.push(performance.now() - start);
          await new Promise((r) => setTimeout(r, 17));
        }
        frames.sort((a, b) => a - b);
        return {
          frames: {
            samples: frames.length,
            median: frames[90],
            p95: frames[170],
            max: frames.at(-1),
          },
          longTasks: q.longTasks,
          draw: { ...q.renderer.info.render },
          poses: { ...q.poseAtlas.stats },
          colony: { ...q.colonyDraws.stats },
          dpr: q.renderer.getPixelRatio(),
          buffer: [q.renderer.domElement.width, q.renderer.domElement.height],
          residency: { ...q.geometryResidency.stats },
        };
      });
    } finally {
      const profile = await cdp.send("Profiler.stop");
      fs.writeFileSync(
        path.join(review, id + "-full-profile.json"),
        JSON.stringify(profile),
      );
      await page.evaluate(() => {
        const q = __lagoonQA;
        q.observer.disconnect();
        q.commandOnly = false;
        q.freeze = true;
        for (const restore of q.restoreRaster) restore();
      });
    }
    const persistence = await page.evaluate(() => {
      const q = __lagoonQA,
        save = __lagoonSaveQA,
        storageTimes = [],
        original = Storage.prototype.setItem;
      const clones = globalThis.structuredClone;
      let copies = 0;
      globalThis.structuredClone = function (...args) {
        copies++;
        return clones.apply(this, args);
      };
      Storage.prototype.setItem = function (key, ...args) {
        const start = performance.now();
        try {
          return original.call(this, key, ...args);
        } finally {
          storageTimes.push({ key, ms: performance.now() - start });
        }
      };
      const checkpoints = [];
      try {
        for (let i = 0; i < 12; i++) {
          const start = performance.now();
          save.commit(save.getGame(), false);
          checkpoints.push(performance.now() - start);
        }
      } finally {
        Storage.prototype.setItem = original;
        globalThis.structuredClone = clones;
      }
      checkpoints.sort((a, b) => a - b);
      return {
        samples: checkpoints.length,
        median: checkpoints[6],
        max: checkpoints.at(-1),
        clones: copies,
        writes: storageTimes.length,
        storageMs: storageTimes.reduce((n, x) => n + x.ms, 0),
        outboxBytes: localStorage.getItem("chichi-cloud-outbox").length,
      };
    });
    rows.push({ id, ...result, persistence });
    fs.writeFileSync(
      path.join(review, "full-frames.json"),
      JSON.stringify(rows, null, 2),
    );
    console.log("FULL_FRAME", JSON.stringify(rows.at(-1)));
  }
  await cdp.detach();
}
