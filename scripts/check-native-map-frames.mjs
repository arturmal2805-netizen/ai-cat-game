// Full native RAF, simulation, graphics and nonblocking GPU queue. Private QA
// only: a readback BEFORE sampling drains old work, never during the timed run.
// The harness holds the game clock at noon, not Date.now()/cloud lease time.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

export async function checkNativeMapFrames(page, review) {
  const ids = process.env.CHICHI_LIVE_BIOMES?.split(",") ||
    await page.locator("[data-biome]").evaluateAll(ns => ns.map(n => n.dataset.biome));
  const rows = [], ms = Number(process.env.CHICHI_NATIVE_SAMPLE_MS || 8000),
    imageOnly = !!process.env.CHICHI_NATIVE_PIXEL_PROOF,
    repeats = process.env.CHICHI_NATIVE_REPEATS?.split(",") || ["summer", "aquarium", "homestead", "sakura"];
  for (const id of [...ids, ...repeats.filter(id => ids.includes(id))]) {
    const started = Date.now();
    await page.evaluate(id => {
      const q = __lagoonQA;
      q.freeze = false; q.drawPaused = false; q.cpuOnly = false;
      document.querySelector(`[data-biome="${id}"]`).click();
      const b = q.islands.get(id);
      q.reviewView(b.position.x, b.position.z, 85);
    }, id);
    await page.waitForFunction(id => {
      const q = __lagoonQA;
      return !q.islands.get(id).userData.lowOnly &&
        q.look.distanceTo(q.desiredLook) < .01 && Math.abs(q.getDistance() - 85) < .01 &&
        q.shaderWarmup.idle();
    }, id, { timeout: 180000 });
    const readyMs = Date.now() - started;
    if (imageOnly) {
      const image = await page.evaluate(() => {
        const q = __lagoonQA, gl = q.renderer.getContext(), paints = new Set();
        q.freeze = true;
        q.scene.traverse(o => {
          for (const m of (Array.isArray(o.material) ? o.material : [o.material]))
            if (m?.userData.opaqueSceneryBlend) paints.add(m);
        });
        const fast = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4),
          native = new Uint8Array(fast.length),
          read = pixels => gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight,
            gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        q.shadowDepth.setEnabled(false);
        let first, second;
        try {
          q.drawFrame(); read(fast); first = { ...q.renderer.info.render };
          for (const m of paints) m.blending = q.THREE.NormalBlending;
          q.drawFrame(); read(native); second = { ...q.renderer.info.render };
        } finally {
          for (const m of paints) m.blending = q.THREE.NoBlending;
          q.shadowDepth.setEnabled(true);
          q.gpuFrames.clear();
        }
        let changed = 0, max = 0;
        for (let i = 0; i < fast.length; i++) {
          const delta = Math.abs(fast[i] - native[i]);
          if (delta) { changed++; max = Math.max(max, delta); }
        }
        return { changed, max, fast: first, native: second, sharedPaints: paints.size,
          error: gl.getError(), dpr: q.renderer.getPixelRatio(),
          buffer: [gl.drawingBufferWidth, gl.drawingBufferHeight], contextLost: gl.isContextLost() };
      });
      assert.equal(image.changed, 0, `${id}: alpha-one blending must preserve every pixel`);
      assert.equal(image.fast.triangles, image.native.triangles);
      assert.equal(image.fast.calls, image.native.calls);
      assert.equal(image.error, 0); assert.equal(image.dpr, 2); assert.equal(image.contextLost, false);
      rows.push({ id, repeat: rows.some(r => r.id === id), readyMs, ...image });
      fs.writeFileSync(path.join(review, "native-map-images.json"), JSON.stringify(rows, null, 2));
      console.log("NATIVE_IMAGE", JSON.stringify(rows.at(-1)));
      continue;
    }
    await page.evaluate(() => {
      const q = __lagoonQA;
      q.freeze = true;
      q.captureProbe = e => { q.probePointerId = e.pointerId; };
      q.renderer.domElement.addEventListener("pointerdown", q.captureProbe);
    });
    const box = await page.locator("#map canvas").boundingBox();
    let anchor;
    for (const [u, v] of [[.04, .24], [.48, .28], [.04, .62]]) {
      const x = box.x + box.width * u, y = box.y + box.height * v;
      await page.evaluate(() => { __lagoonQA.probePointerId = null; });
      await page.mouse.move(x, y);
      await page.mouse.down();
      const usable = await page.evaluate(() => {
        const q = __lagoonQA;
        return q.probePointerId !== null && !q.getDragging();
      });
      if (usable) { anchor = { x, y }; break; }
      await page.evaluate(() => {
        const q = __lagoonQA;
        q.renderer.domElement.dispatchEvent(new PointerEvent("pointercancel", { pointerId: q.probePointerId }));
      });
      await page.mouse.up();
    }
    assert.ok(anchor, `${id}: input must reach the canvas, not an overlapping HUD button`);
    const row = await page.evaluate(({ ms, anchor }) => new Promise(resolve => {
      const q = __lagoonQA, gl = q.renderer.getContext(), canvas = q.renderer.domElement;
      q.drawFrame();
      // finish() alone is not a reliable GPU completion boundary on all
      // software backends. This isolated QA readback is outside measurement.
      const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
      gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight,
        gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      q.gpuFrames.clear(); q.liveFrames = [];
      const start = performance.now();
      let minAngle = Infinity, maxAngle = -Infinity, minZoom = Infinity, maxZoom = -Infinity;
      q.freeze = false;
      const timer = setInterval(() => {
        const elapsed = performance.now() - start,
          angle = Math.atan2(q.camera.position.x - q.look.x, q.camera.position.z - q.look.z);
        minAngle = Math.min(minAngle, angle); maxAngle = Math.max(maxAngle, angle);
        minZoom = Math.min(minZoom, q.getDesiredDistance()); maxZoom = Math.max(maxZoom, q.getDesiredDistance());
        if (elapsed < ms) {
          // Equal time-based trajectories. Automation round-trips must not
          // make a slow browser spend longer at an easier camera angle.
          const phase = elapsed / ms * Math.PI * 4,
            target = 85 + Math.sin(phase) * 8;
          canvas.dispatchEvent(new WheelEvent("wheel", {
            deltaY: (target - q.getDesiredDistance()) / .025, bubbles: true, cancelable: true,
          }));
          canvas.dispatchEvent(new PointerEvent("pointermove", {
            pointerId: q.probePointerId, pointerType: "mouse", buttons: 1,
            clientX: anchor.x + Math.sin(phase) * 24,
            clientY: anchor.y + (Math.cos(phase) - 1) * 8,
          }));
          return;
        }
        clearInterval(timer); q.freeze = true; q.gpuFrames.ready();
        const frames = q.liveFrames, pending = q.gpuFrames.pending,
          gaps = frames.slice(1).map((t, i) => t[0] - frames[i][0]).sort((a, b) => a - b),
          cpu = frames.map(t => t[1]).sort((a, b) => a - b);
        resolve({ elapsed, frames: frames.length,
          submittedFps: frames.length * 1000 / elapsed,
          completedFpsLowerBound: Math.max(0, frames.length - pending) * 1000 / elapsed,
          pending, gapMedian: gaps[Math.floor(gaps.length * .5)] ?? null,
          gapP95: gaps[Math.floor(gaps.length * .95)] ?? null,
          renderCpuMedian: cpu[Math.floor(cpu.length * .5)] ?? null,
          renderCpuMax: cpu.at(-1) ?? null,
          orbitRange: maxAngle - minAngle, zoomRange: maxZoom - minZoom,
          draw: { ...q.renderer.info.render }, shaders: { ...q.shaderWarmup.stats },
          memory: { ...q.renderer.info.memory },
          geometryResidency: { ...q.geometryResidency.stats },
          dpr: q.renderer.getPixelRatio(),
          buffer: [canvas.width, canvas.height],
          contextLost: gl.isContextLost(), visible: q.isVisible() });
      }, 100);
    }), { ms, anchor });
    await page.evaluate(() => {
      const q = __lagoonQA, canvas = q.renderer.domElement;
      canvas.removeEventListener("pointerdown", q.captureProbe);
      canvas.dispatchEvent(new PointerEvent("pointercancel", { pointerId: q.probePointerId }));
    });
    await page.mouse.up();
    assert.ok(row.orbitRange > .08, `${id}: the actual camera must rotate during sampling`);
    assert.ok(row.zoomRange > 6, `${id}: the actual input handler must change camera zoom`);
    assert.ok(row.frames > 0, `${id}: real frames must complete during camera input`);
    assert.equal(row.dpr, 2); assert.equal(row.contextLost, false); assert.equal(row.visible, true);
    rows.push({ id, repeat: rows.some(r => r.id === id), readyMs, ...row });
    fs.writeFileSync(path.join(review, "native-map-frames.json"), JSON.stringify(rows, null, 2));
    console.log("NATIVE_MAP", JSON.stringify(rows.at(-1)));
  }
}
