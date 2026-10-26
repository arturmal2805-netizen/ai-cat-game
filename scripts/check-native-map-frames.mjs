// Full native RAF, simulation, graphics and nonblocking GPU queue. Private QA
// only: a readback BEFORE sampling drains old work, never during the timed run.
// The harness holds the game clock at noon, not Date.now()/cloud lease time.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

export async function checkNativeMapFrames(page, review) {
  const compareReuse = !!process.env.CHICHI_COMPARE_STATIC_REUSE, proofs = [];
  let workSettled = false;
  if (compareReuse) await page.evaluate(() => {
    const q = __lagoonQA, before = q.scene.onBeforeRender;
    q.staticReuseEnabled = true;
    q.setStaticReuse = enabled => {
      q.staticReuseEnabled = enabled;
      const changed = new Set();
      for (const [g, r] of globalThis.__qaStaticIndices || []) {
        if (r.current === enabled) continue;
        g.index.array.set(enabled ? r.fast : r.native);
        g.index.needsUpdate = true; r.current = enabled;
        changed.add(g);
      }
      // Small scenery has already been copied into a BatchedMesh. Switch its
      // exact index data too, without rebuilding materials or shader variants.
      for (const e of q.staticDraws.qaEntries())
        if (changed.has(e.geometry))
          e.batch.setGeometryAt(e.batch.getGeometryIdAt(e.id), e.geometry);
    };
    let known = -1;
    q.scene.onBeforeRender = function (...args) {
      const count = globalThis.__qaStaticIndices?.size || 0;
      if (count !== known) { q.setStaticReuse(q.staticReuseEnabled); known = count; }
      return before.apply(this, args);
    };
  });
  if (process.env.CHICHI_COMPARE_COLONY_CACHE) await page.evaluate(() => {
    const q=__lagoonQA,before=q.scene.onBeforeRender;
    q.scene.onBeforeRender=function(...args){
      before.apply(this,args);
      if(q.legacyColonyDeletion && q.colonyDraws.stats.active)
        q.poseAtlas.forEachCat(cat=>{
          if(q.poseAtlas.relevant(cat))for(const m of cat.userData.renderBatches.batches)
            if(m.layers.isEnabled(29)&&m.visible)m.userData.releaseDrawBuffers?.();
        });
    };
  });
  const ids = process.env.CHICHI_LIVE_BIOMES?.split(",") ||
    await page.locator("[data-biome]").evaluateAll(ns => ns.map(n => n.dataset.biome));
  if (compareReuse && ids.includes("jobcity")) {
    ids.splice(ids.indexOf("jobcity"), 1); ids.unshift("jobcity");
  }
  const rows = [], ms = Number(process.env.CHICHI_NATIVE_SAMPLE_MS || 8000),
    imageOnly = !!process.env.CHICHI_NATIVE_PIXEL_PROOF,
    repeats = process.env.CHICHI_NATIVE_REPEATS?.split(",") || ["summer", "aquarium", "homestead", "sakura"];
  const views=[...ids,...repeats.filter(id=>ids.includes(id))],
    checks=compareReuse
      ? views.flatMap((id,i)=>(i%2?[true,false]:[false,true]).map(reuse=>({id,legacy:false,reuse})))
      : process.env.CHICHI_COMPARE_COLONY_CACHE
      ? views.flatMap((id,i)=>(i%2?[false,true]:[true,false]).map(legacy=>({id,legacy})))
      : views.map(id=>({id,legacy:false}));
  for (const {id,legacy,reuse} of checks) {
    const started = Date.now();
    await page.evaluate(({id,legacy,reuse}) => {
      const q = __lagoonQA;
      q.legacyColonyDeletion=legacy;
      if (q.setStaticReuse) q.setStaticReuse(reuse);
      q.freeze = false; q.drawPaused = false; q.cpuOnly = false;
      document.querySelector(`[data-biome="${id}"]`).click();
      const b = q.islands.get(id);
      q.reviewView(b.position.x, b.position.z, 85);
    }, {id,legacy,reuse});
    await page.waitForFunction(id => {
      const q = __lagoonQA;
      return !q.islands.get(id).userData.lowOnly &&
        q.look.distanceTo(q.desiredLook) < .01 && Math.abs(q.getDistance() - 85) < .01 &&
        q.shaderWarmup.idle();
    }, id, { timeout: 180000 });
    if (process.env.CHICHI_NATIVE_SETTLE_JOBS && id === "jobcity" && !workSettled) {
      // Private fixture preparation only. The timed run still uses the native
      // RAF, full animation/simulation and original nonblocking GPU queue.
      const at = await page.evaluate(() => { __lagoonQA.settleJobs(180); return __lagoonQA.frames; });
      await page.waitForFunction(at => __lagoonQA.frames >= at + 3 && __lagoonQA.shaderWarmup.idle(), at);
      workSettled = true;
    }
    const readyMs = Date.now() - started;
    if (compareReuse && !proofs.some(p => p.id === id)) {
      const proof = await page.evaluate(reuse => {
        const q = __lagoonQA, gl = q.renderer.getContext();
        q.freeze = true; q.shadowDepth.setEnabled(false);
        const a = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4), b = new Uint8Array(a.length);
        let native, fast;
        try {
          q.setStaticReuse(false); q.drawFrame(); native = { ...q.renderer.info.render };
          gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, a);
          q.setStaticReuse(true); q.drawFrame(); fast = { ...q.renderer.info.render };
          gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, b);
        } finally {
          q.setStaticReuse(reuse); q.shadowDepth.setEnabled(true); q.gpuFrames.clear();
        }
        let changed = 0, corners = 0, geometries = 0;
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) changed++;
        for (const r of globalThis.__qaStaticIndices.values()) {
          geometries++; for (let i = 0; i < r.fast.length; i++) if (r.native[i] !== r.fast[i]) corners++;
        }
        return { changed, native, fast, corners, geometries, dpr: q.renderer.getPixelRatio(),
          buffer: [gl.drawingBufferWidth, gl.drawingBufferHeight], error: gl.getError() };
      }, reuse);
      proofs.push({ id, ...proof });
      fs.writeFileSync(path.join(review, "static-reuse-images.json"), JSON.stringify(proofs, null, 2));
      console.log("STATIC_REUSE_IMAGE", JSON.stringify(proofs.at(-1)));
      assert.equal(proof.changed, 0, `${id}: preserve exact native colour and shadow pixels`);
      assert.equal(proof.native.triangles, proof.fast.triangles);
      assert.equal(proof.native.calls, proof.fast.calls);
      assert.equal(proof.error, 0); assert.equal(proof.dpr, 2);
      assert.ok(proof.corners > 0);
      await page.evaluate(() => __lagoonQA.freeze = false);
    }
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
      if (["summer", "aquarium", "homestead", "sakura", "moon"].includes(id) && !rows.some(r => r.id === id)) {
        image.frozenCompletion = await page.evaluate(() => {
          const q = __lagoonQA, gl = q.renderer.getContext(), paints = new Set(), samples = [];
          q.scene.traverse(o => {
            for (const m of (Array.isArray(o.material) ? o.material : [o.material]))
              if (m?.userData.opaqueSceneryBlend) paints.add(m);
          });
          const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
          q.shadowDepth.setEnabled(false);
          try {
            for (const native of [true, false, false, true]) {
              for (const m of paints) m.blending = native ? q.THREE.NormalBlending : q.THREE.NoBlending;
              const times = [];
              for (let i = 0; i < 3; i++) {
                const start = performance.now();
                q.drawFrame();
                gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight,
                  gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                times.push(performance.now() - start);
              }
              samples.push({ nativeBlending: native, times, draw: { ...q.renderer.info.render } });
            }
          } finally {
            for (const m of paints) m.blending = q.THREE.NoBlending;
            q.shadowDepth.setEnabled(true);
          }
          // This includes complete GPU raster/readback, but is not native RAF
          // or gameplay FPS. Use alongside, never instead of the live audit.
          return samples;
        });
      }
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
          shadows: { ...q.shadowDepth.stats },
          gpuBufferBytes: q.gpuBuffers.snapshot().bytes,
          memory: { ...q.renderer.info.memory },
          colony: { ...q.colonyDraws.stats },
          atlas: { ...q.poseAtlas.stats },
          npcCount: q.npcs.size,
          visibleNPCs: [...q.npcs.values()].filter(n => n.carrier.visible).length,
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
    rows.push({ id, legacy, reuse, repeat: rows.some(r => r.id === id), readyMs, ...row });
    fs.writeFileSync(path.join(review, "native-map-frames.json"), JSON.stringify(rows, null, 2));
    console.log("NATIVE_MAP", JSON.stringify(rows.at(-1)));
    if(process.env.CHICHI_NATIVE_MAP_CAPTURE && !rows.slice(0,-1).some(r=>r.id===id))
      await page.screenshot({path:path.join(review,`map-${id}.png`)});
  }
}
