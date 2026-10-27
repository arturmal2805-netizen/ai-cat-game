// Full native RAF, simulation, graphics and nonblocking GPU queue. Private QA
// only: a readback BEFORE sampling drains old work, never during the timed run.
// The harness holds the game clock at noon, not Date.now()/cloud lease time.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

export async function checkNativeMapFrames(page, review) {
  const compareReuse = !!process.env.CHICHI_COMPARE_STATIC_REUSE,
    compareActors = !!process.env.CHICHI_COMPARE_ACTOR_SCOPE,
    compareColony = !!process.env.CHICHI_COMPARE_COLONY_MODE,
    compareBlend = !!process.env.CHICHI_COMPARE_SCENERY_BLEND,
    compareRefault = !!process.env.CHICHI_COMPARE_REFAULT_CACHE,
    comparePose = !!process.env.CHICHI_COMPARE_POSE_UPLOADS, proofs = [], nativeProofs = [];
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
    checks=comparePose
      ? views.flatMap((id,i)=>(i%2?[true,false]:[false,true]).map(poseRows=>({id,legacy:false,poseRows})))
      : compareRefault
      ? views.flatMap((id,i)=>(i%2?[true,false]:[false,true]).map(refault=>({id,legacy:false,refault})))
      : compareBlend
      ? views.flatMap((id,i)=>(i%2?[true,false]:[false,true]).map(blend=>({id,legacy:false,blend})))
      : compareColony
      ? views.flatMap((id,i)=>(i%2?[true,false]:[false,true]).map(individual=>({id,legacy:false,individual})))
      : compareActors
      ? views.flatMap((id,i)=>(i%2?[false,true]:[true,false]).map(actorLegacy=>({id,legacy:false,actorLegacy})))
      : compareReuse
      ? views.flatMap((id,i)=>(i%2?[true,false]:[false,true]).map(reuse=>({id,legacy:false,reuse})))
      : process.env.CHICHI_COMPARE_COLONY_CACHE
      ? views.flatMap((id,i)=>(i%2?[false,true]:[true,false]).map(legacy=>({id,legacy})))
      : views.map(id=>({id,legacy:false}));
  for (const {id,legacy,reuse,actorLegacy,individual,blend,refault,poseRows} of checks) {
    const started = Date.now();
    await page.evaluate(({id,legacy,reuse,actorLegacy,compareActors,individual,compareBlend,blend,compareRefault,refault,comparePose,poseRows}) => {
      const q = __lagoonQA;
      if(individual!==undefined){
        q.poseAtlas.setSharingEnabled?.(true);
        q.colonyDraws.setEnabled?.(true);q.colonyDraws.sync();
      }
      if(comparePose)q.poseAtlas.setRowUploadEnabled(poseRows);
      if(compareRefault)q.geometryResidency.setRefaultProtectionEnabled(refault);
      if (compareBlend) {
        globalThis.__qaLegacySceneryBlend = !blend;
        q.scene.traverse(o=>{
          for (const m of (Array.isArray(o.material)?o.material:[o.material]))
            if (m?.userData.opaqueSceneryBlend) m.blending=blend&&m.opacity===1?q.THREE.NoBlending:q.THREE.NormalBlending;
        });
      }
      globalThis.__qaIndividualCats = individual;
      q.legacyColonyDeletion=legacy;
      if (q.setStaticReuse) q.setStaticReuse(reuse);
      if (compareActors) {
        globalThis.__legacyActorStaticSync=actorLegacy;
        const base=structuredClone(__lagoonSaveQA.getGame()), actor=base.adoption.cats[0].id,
          home=base.catDestinations[actor]||"homestead", away=home==="moon"?"homestead":"moon";
        q.actorSyncSample=i=>{
          const next=structuredClone(base);next.catDestinations[actor]=i%2?home:away;
          const start=performance.now();__lagoonSaveQA.getWorld().sync(next);return performance.now()-start;
        };
      }
      q.freeze = false; q.drawPaused = false; q.cpuOnly = false;
      document.querySelector(`[data-biome="${id}"]`).click();
      const b = q.islands.get(id);
      q.reviewView(b.position.x, b.position.z, 85);
    }, {id,legacy,reuse,actorLegacy,compareActors,individual,compareBlend,blend,compareRefault,refault,comparePose,poseRows});
    await page.waitForFunction(id => {
      const q = __lagoonQA;
      return !q.islands.get(id).userData.lowOnly &&
        q.look.distanceTo(q.desiredLook) < .01 && Math.abs(q.getDistance() - 85) < .01 &&
        q.shaderWarmup.idle();
    }, id, { timeout: 180000 });
    if(compareColony){
      await page.waitForFunction(()=>__lagoonQA.colonyDraws.stats.ready);
      await page.evaluate(individual=>__lagoonQA.colonyDraws.setEnabled(!individual),individual);
    }
    if (process.env.CHICHI_NATIVE_SETTLE_JOBS && id === "jobcity" && !workSettled) {
      // Private fixture preparation only. The timed run still uses the native
      // RAF, full animation/simulation and original nonblocking GPU queue.
      const at = await page.evaluate(seconds => { __lagoonQA.settleJobs(seconds); return __lagoonQA.frames; },Number(process.env.CHICHI_SETTLE_JOB_SECONDS||180));
      await page.waitForFunction(at => __lagoonQA.frames >= at + 3 && __lagoonQA.shaderWarmup.idle(), at);
      workSettled = true;
    }
    const readyMs = Date.now() - started;
    if(process.env.CHICHI_NATIVE_CAT_RESOURCES && !nativeProofs.some(p=>p.id===id)){
      const {captureNativeCatResources}=await import('./check-native-cat-resources.mjs'),proof=await captureNativeCatResources(page);
      nativeProofs.push({id,...proof});fs.writeFileSync(path.join(review,'native-cat-resources.json'),JSON.stringify(nativeProofs,null,2));
      assert.equal(proof.changed,0);assert.equal(proof.error,0);assert.equal(proof.contextLost,false);assert.equal(proof.dpr,2);
      assert.deepEqual(proof.before,proof.after);assert.equal(proof.colony.active,false);assert.equal(proof.colony.batches,0);
      assert.equal(proof.modes[0].calls,proof.modes[1].calls);assert.equal(proof.modes[0].triangles,proof.modes[1].triangles);
      assert.equal(proof.modes[1].poseBytes,0);
      console.log('NATIVE_CAT_RESOURCES',JSON.stringify(nativeProofs.at(-1)));
    }
    if(process.env.CHICHI_POSE_UPLOAD_AUDIT && !proofs.some(p=>p.id===id)) {
      const {capturePoseUploadFrame}=await import("./check-pose-texture-upload.mjs"),proof=await capturePoseUploadFrame(page);
      proofs.push({id,...proof});fs.writeFileSync(path.join(review,"pose-upload-images.json"),JSON.stringify(proofs,null,2));
      console.log("POSE_UPLOAD_IMAGE",JSON.stringify(proofs.at(-1)));
      assert.equal(proof.changed,0);assert.equal(proof.error,0);assert.equal(proof.contextLost,false);assert.equal(proof.dpr,2);
      assert.equal(proof.before.calls,proof.after.calls);assert.equal(proof.before.triangles,proof.after.triangles);
      await page.evaluate(poseRows=>{__lagoonQA.poseAtlas.setRowUploadEnabled(poseRows!==false);},poseRows);
    }
    if(process.env.CHICHI_REFAULT_CACHE_AUDIT && !proofs.some(p=>p.id===id)) {
      const {captureRefaultReturn}=await import("./check-refault-cache.mjs"),proof=await captureRefaultReturn(page);
      proofs.push({id,...proof});fs.writeFileSync(path.join(review,"refault-return-images.json"),JSON.stringify(proofs,null,2));
      console.log("REFAULT_RETURN_IMAGE",JSON.stringify(proofs.at(-1)));
      assert.equal(proof.changed,0);assert.equal(proof.error,0);assert.equal(proof.contextLost,false);assert.equal(proof.dpr,2);
      assert.equal(proof.before.calls,proof.after.calls);assert.equal(proof.before.triangles,proof.after.triangles);
      assert.equal(proof.cats,proof.afterCats);assert.equal(proof.slots,proof.afterSlots);
      assert.ok(proof.retiredBytes<proof.gpuBefore);
    }
    if (compareColony && !proofs.some(p=>p.id===id)) {
      const proof=await page.evaluate(individual=>{
        const q=__lagoonQA,gl=q.renderer.getContext(),a=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4),b=new Uint8Array(a.length);
        q.freeze=true;q.shadowDepth.setEnabled(false);
        let shared,native;
        try {
          globalThis.__qaIndividualCats=false;q.colonyDraws.setEnabled?.(true);q.drawFrame();shared={...q.renderer.info.render};
          gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,a);
          globalThis.__qaIndividualCats=true;q.colonyDraws.setEnabled?.(false);q.drawFrame();native={...q.renderer.info.render};
          gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,b);
        } finally {
          globalThis.__qaIndividualCats=individual;q.colonyDraws.setEnabled?.(!individual);q.shadowDepth.setEnabled(true);q.gpuFrames.clear();
        }
        let changed=0,large=0,max=0,total=0;
        for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d){changed++;total+=d;max=Math.max(max,d);if(d>8)large++;}}
        return {changed,large,max,mean:total/a.length,shared,native,error:gl.getError(),contextLost:gl.isContextLost(),dpr:q.renderer.getPixelRatio(),buffer:[gl.drawingBufferWidth,gl.drawingBufferHeight]};
      },individual);
      proofs.push({id,...proof});fs.writeFileSync(path.join(review,"colony-mode-images.json"),JSON.stringify(proofs,null,2));
      console.log("COLONY_MODE_IMAGE",JSON.stringify(proofs.at(-1)));
      assert.equal(proof.error,0);assert.equal(proof.contextLost,false);assert.equal(proof.dpr,2);
      assert.ok(proof.mean<.02 && proof.large<proof.buffer[0]*proof.buffer[1]*.0002);
      await page.evaluate(()=>__lagoonQA.freeze=false);
    }
    if (compareActors && !proofs.some(p=>p.id===id)) {
      const {captureActorScopeImage}=await import("./check-actor-sync-scope.mjs"),proof=await captureActorScopeImage(page);
      proofs.push({id,...proof});fs.writeFileSync(path.join(review,"actor-scope-images.json"),JSON.stringify(proofs,null,2));
      console.log("ACTOR_SCOPE_IMAGE",JSON.stringify(proofs.at(-1)));
      assert.equal(proof.changed,0);assert.equal(proof.newCalls,0);assert.ok(proof.oldCalls>0);assert.equal(proof.stableActors,true);
      assert.equal(proof.oldDraw.triangles,proof.newDraw.triangles);assert.equal(proof.oldDraw.calls,proof.newDraw.calls);
      assert.equal(proof.error,0);assert.equal(proof.dpr,2);assert.equal(proof.contextLost,false);
      await page.evaluate(()=>__lagoonQA.freeze=false);
    }
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
            if (m?.userData.opaqueSceneryBlend && m.opacity === 1) paints.add(m);
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
      assert.ok(image.sharedPaints > 0, `${id}: do not accept an empty alpha-one comparison`);
      assert.equal(image.fast.triangles, image.native.triangles);
      assert.equal(image.fast.calls, image.native.calls);
      assert.equal(image.error, 0); assert.equal(image.dpr, 2); assert.equal(image.contextLost, false);
      if (["summer", "aquarium", "homestead", "sakura", "moon"].includes(id) && !rows.some(r => r.id === id)) {
        image.frozenCompletion = await page.evaluate(() => {
          const q = __lagoonQA, gl = q.renderer.getContext(), paints = new Set(), samples = [];
          q.scene.traverse(o => {
            for (const m of (Array.isArray(o.material) ? o.material : [o.material]))
              if (m?.userData.opaqueSceneryBlend && m.opacity === 1) paints.add(m);
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
      q.refaultUploadCounts ||= q.trackUploads(gl);
      q.nativeGlTimings ||= q.trackGl(gl,{multiDraw:gl.getExtension("WEBGL_multi_draw")});
      q.nativeGlTimings.clear();
      q.refaultUploadCounts.clear();q.refaultStatsBefore={...q.geometryResidency.stats};
      const start = performance.now();
      let minAngle = Infinity, maxAngle = -Infinity, minZoom = Infinity, maxZoom = -Infinity, nextActor=500,actorTimes=[];
      q.freeze = false;
      const timer = setInterval(() => {
        const elapsed = performance.now() - start,
          angle = Math.atan2(q.camera.position.x - q.look.x, q.camera.position.z - q.look.z);
        minAngle = Math.min(minAngle, angle); maxAngle = Math.max(maxAngle, angle);
        minZoom = Math.min(minZoom, q.getDesiredDistance()); maxZoom = Math.max(maxZoom, q.getDesiredDistance());
        if (elapsed < ms) {
          if(q.actorSyncSample && elapsed>=nextActor) {
            actorTimes.push(q.actorSyncSample(actorTimes.length));nextActor=elapsed+500;
          }
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
          actorSyncTimes:actorTimes,
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
          refaultDelta:Object.fromEntries(["evicted","refaults","refaultBytes","rapidRefaults","rapidRefaultBytes"].map(k=>[k,q.geometryResidency.stats[k]-q.refaultStatsBefore[k]])),
          uploads:q.refaultUploadCounts.snapshot(),
          glTimings:q.nativeGlTimings.snapshot(),
          dpr: q.renderer.getPixelRatio(),
          buffer: [canvas.width, canvas.height],
          contextLost: gl.isContextLost(), visible: q.isVisible(),
          inputState:{faceTracking:q.faceCamera.enabled,draggingCat:q.getDragging()||null,pointerId:q.probePointerId} });
      }, 100);
    }), { ms, anchor });
    await page.evaluate(() => {
      const q = __lagoonQA, canvas = q.renderer.domElement;
      canvas.removeEventListener("pointerdown", q.captureProbe);
      canvas.dispatchEvent(new PointerEvent("pointercancel", { pointerId: q.probePointerId }));
      if(q.actorSyncSample)__lagoonSaveQA.getWorld().sync(__lagoonSaveQA.getGame());
    });
    await page.mouse.up();
    if(!(row.orbitRange>.08&&row.zoomRange>6&&row.frames>0))
      fs.writeFileSync(path.join(review,'failed-native-camera.json'),JSON.stringify({id,anchor,...row},null,2));
    assert.ok(row.orbitRange > .08, `${id}: the actual camera must rotate during sampling`);
    assert.ok(row.zoomRange > 6, `${id}: the actual input handler must change camera zoom`);
    assert.ok(row.frames > 0, `${id}: real frames must complete during camera input`);
    assert.equal(row.dpr, 2); assert.equal(row.contextLost, false); assert.equal(row.visible, true);
    rows.push({ id, legacy, reuse, actorLegacy, individual, blend, refault, poseRows, repeat: rows.some(r => r.id === id), readyMs, ...row });
    fs.writeFileSync(path.join(review, "native-map-frames.json"), JSON.stringify(rows, null, 2));
    console.log("NATIVE_MAP", JSON.stringify(rows.at(-1)));
    if(process.env.CHICHI_NATIVE_MAP_CAPTURE && !rows.slice(0,-1).some(r=>r.id===id))
      await page.screenshot({path:path.join(review,`map-${id}.png`)});
  }
}
