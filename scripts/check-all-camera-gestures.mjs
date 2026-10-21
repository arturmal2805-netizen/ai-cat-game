import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

// All authored islands, live input handlers, full geometry/shadows and DPR 2.
// CPU command diagnostics suppress only raster work; image checks render real
// full-resolution frames separately. No player account or production AI is used.
export async function checkAllCameraGestures(page, context, review) {
  const ids = await page
    .locator("[data-biome]")
    .evaluateAll((nodes) => nodes.map((n) => n.dataset.biome));
  assert.equal(new Set(ids).size, 30);
  const previous = path.join(review, "all-camera-gestures.json");
  const rows = process.env.CHICHI_GESTURE_RESUME && fs.existsSync(previous)
    ? JSON.parse(fs.readFileSync(previous,"utf8")) : [];
  const itinerary = [...ids, "aquarium"];
  rows.forEach((row,i) => assert.equal(row.id,itinerary[i],"Resume must keep the same island order"));
  for (const id of itinerary.slice(rows.length)) {
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
        __lagoonQA.look.distanceTo(__lagoonQA.desiredLook) < 0.01 &&
        Math.abs(__lagoonQA.getDistance() - 85) < 0.1,
    );
    const image = await page.evaluate((id) => {
      const q = __lagoonQA,
        gl = q.renderer.getContext();
      q.freeze = true;
      q.shadowDepth?.setEnabled(false);
      // Native comparison: independent paints and unindexed flower triangles.
      // These are the same authored buffers, not a reduced-detail reference.
      const paints = [],
        geometries = new Map();
      q.scene.traverse((o) => {
        if (!o.isMesh) return;
        if (o.name === "Meadow flower" && !geometries.has(o.geometry)) {
          geometries.set(o.geometry, o.geometry.index);
          o.geometry.setIndex(null);
        }
        let scenery = false;
        for (let p = o; p; p = p.parent)
          if (p.userData.sceneryId) {
            scenery = true;
            break;
          }
        if ((scenery || o.material?.userData.opaqueSceneryBlend) && !Array.isArray(o.material)) {
          const shared = o.material,
            copy = shared.clone();
          copy.onBeforeCompile = shared.onBeforeCompile;
          copy.customProgramCacheKey = shared.customProgramCacheKey;
          // Compare the new alpha-one bypass with the actual released blend
          // operation, retaining transparent sort order in both frames.
          if (shared.userData.opaqueSceneryBlend) copy.blending = q.THREE.NormalBlending;
          paints.push([o, shared, copy]);
          o.material = copy;
        }
      });
      const a = new Uint8Array(
          gl.drawingBufferWidth * gl.drawingBufferHeight * 4,
        ),
        b = new Uint8Array(a.length);
      if (q.matrixCache) q.matrixCache.enabled = false;
      if (q.staticDraws?.traversal) q.staticDraws.traversal.enabled = false;
      const traversal = [];
      q.poseAtlas.forEachCat((cat) => {
        const batching = cat.userData.renderBatches;
        traversal.push([batching, batching.renderChildren]);
        if (batching.matrixDeferral) batching.matrixDeferral.enabled = false;
        batching.renderChildren = () => null;
      });
      try {
        q.drawFrame();
      } finally {
        for (const [geometry, index] of geometries) geometry.setIndex(index);
        for (const [object, shared] of paints) object.material = shared;
        for (const [batching, original] of traversal) {
          batching.renderChildren = original;
          if (batching.matrixDeferral) batching.matrixDeferral.enabled = true;
        }
      }
      gl.readPixels(
        0,
        0,
        gl.drawingBufferWidth,
        gl.drawingBufferHeight,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        a,
      );
      const before = { ...q.renderer.info.render };
      if (q.matrixCache) q.matrixCache.enabled = true;
      if (q.staticDraws?.traversal) q.staticDraws.traversal.enabled = true;
      q.shadowDepth?.setEnabled(true);
      if(q.shadowDepth) for(let i=0;i<4;i++) q.drawFrame();
      q.drawFrame();
      gl.readPixels(
        0,
        0,
        gl.drawingBufferWidth,
        gl.drawingBufferHeight,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        b,
      );
      for (const [, , copy] of paints) copy.dispose();
      let changed = 0;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) changed++;
      let reuploadChanged = null;
      if (["aquarium", "homestead"].includes(id)) {
        const registrations = q.poseAtlas.stats.cats,
          slots = q.poseAtlas.stats.entries;
        const geometries = new Set(),
          direct = q.renderer.renderBufferDirect;
        q.renderer.renderBufferDirect = function (...args) {
          geometries.add(args[2]);
          return direct.apply(this, args);
        };
        try {
          q.drawFrame();
        } finally {
          q.renderer.renderBufferDirect = direct;
        }
        for (const geometry of geometries) q.geometryResidency.retire(geometry);
        if (
          q.poseAtlas.stats.cats !== registrations ||
          q.poseAtlas.stats.entries !== slots
        )
          throw Error("GPU retirement changed live cat/pose registrations");
        q.drawFrame();
        const restored = new Uint8Array(a.length);
        gl.readPixels(
          0,
          0,
          gl.drawingBufferWidth,
          gl.drawingBufferHeight,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          restored,
        );
        reuploadChanged = 0;
        for (let i = 0; i < b.length; i++)
          if (b[i] !== restored[i]) reuploadChanged++;
      }
      const registered = new Set();
      let registeredEntries = 0;
      q.poseAtlas.forEachCat((cat) => {
        registered.add(cat);
        for (const palette of cat.userData.renderBatches.palettes)
          if (palette.slot) registeredEntries += palette.entries.length;
      });
      if (registeredEntries !== q.poseAtlas.stats.entries)
        throw Error("Live cat joint slots were retired with GPU buffers");
      let attachedCats = 0;
      q.scene.traverse((object) => {
        if (object.userData.renderBatches?.atlas !== q.poseAtlas) return;
        attachedCats++;
        if (!registered.has(object))
          throw Error(
            "A live cat lost its render registration: " + object.name,
          );
      });
      return {
        shadowDepth: q.shadowDepth ? { ...q.shadowDepth.stats } : null,
        attachedCats,
        registeredCats: registered.size,
        changed,
        reuploadChanged,
        before,
        after: { ...q.renderer.info.render },
        buffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
        dpr: q.renderer.getPixelRatio(),
        lost: gl.isContextLost(),
        memory: q.gpuBuffers.snapshot(),
        residency: q.geometryResidency
          ? { ...q.geometryResidency.stats }
          : null,
      };
    }, id);
    assert.equal(
      image.changed,
      0,
      `${id}: matrix/traversal caching must retain the exact image`,
    );
    if (image.reuploadChanged !== null)
      assert.equal(
        image.reuploadChanged,
        0,
        `${id}: re-upload retains exact colour and shadow pixels`,
      );
    assert.equal(image.dpr, 2);
    assert.equal(image.lost, false);
    assert.ok(image.after.triangles <= image.before.triangles, id);
    await page.evaluate(() => {
      const q = __lagoonQA,
        gl = q.renderer.getContext();
      q.restoreGL = [];
      const suppress = (object, key) => {
        const before = object[key];
        if (typeof before !== "function") return;
        q.restoreGL.push(() => (object[key] = before));
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
      q.measure = true;
    });
    const phases = [];
    try {
      for (const cached of [false, true]) {
        const phase = await page.evaluate(async (cached) => {
          const q = __lagoonQA,
            canvas = q.renderer.domElement;
          q.shadowDepth?.setEnabled(cached);
          if (q.matrixCache) q.matrixCache.enabled = cached;
          if (q.staticDraws?.traversal)
            q.staticDraws.traversal.enabled = cached;
          const traversal = [];
          q.poseAtlas.forEachCat((cat) => {
            const batching = cat.userData.renderBatches;
            traversal.push([batching, batching.renderChildren]);
            if (batching.matrixDeferral)
              batching.matrixDeferral.enabled = cached;
            if (!cached) batching.renderChildren = () => null;
          });
          q.cpu = [];
          const frames = [],
            start = performance.now();
          try {
            for (let i = 0; i < 30; i++) {
              canvas.dispatchEvent(
                new WheelEvent("wheel", {
                  deltaY: i < 15 ? -128 : 128,
                  bubbles: true,
                  cancelable: true,
                }),
              );
              q.manualStepping = true;
              const t = performance.now();
              try {
                q.step(t);
              } finally {
                q.manualStepping = false;
              }
              frames.push(performance.now() - t);
              await new Promise((r) => setTimeout(r, 17));
            }
          } finally {
            for (const [batching, original] of traversal) {
              batching.renderChildren = original;
              if (batching.matrixDeferral)
                batching.matrixDeferral.enabled = true;
            }
          }
          frames.sort((a, b) => a - b);
          return {
            cached,
            samples: frames.length,
            elapsed: performance.now() - start,
            median: frames[15],
            p95: frames[28],
            max: frames.at(-1),
            distance: q.getDistance(),
            desired: q.getDesiredDistance(),
          };
        }, cached);
        phases.push(phase);
      }
      const bounds = await page.locator("#map canvas").boundingBox();
      // A real browser wheel event, independent of the synthetic repeat above.
      await page.mouse.move(
        bounds.x + bounds.width * 0.5,
        bounds.y + bounds.height * 0.4,
      );
      const before = await page.evaluate(() => __lagoonQA.getDesiredDistance());
      await page.mouse.wheel(0, -80);
      await page.waitForFunction(
        (before) => __lagoonQA.getDesiredDistance() < before,
        before,
      );
      // Native pointer capture and orbit; choose an empty point before moving.
      let rotated = false;
      for (const [x, y] of [
        [0.04, 0.24],
        [0.48, 0.28],
        [0.04, 0.62],
      ]) {
        await page.mouse.move(
          bounds.x + bounds.width * x,
          bounds.y + bounds.height * y,
        );
        await page.mouse.down();
        const dragging = await page.evaluate(() => __lagoonQA.getDragging());
        if (!dragging) {
          await page.mouse.move(
            bounds.x + bounds.width * x + 22,
            bounds.y + bounds.height * y + 10,
            { steps: 3 },
          );
          rotated = true;
        }
        await page.mouse.up();
        if (rotated) break;
      }
      assert.ok(rotated, `${id}: a blank-space orbit must remain available`);
      const scale = await page.evaluate(() => {
        const q = __lagoonQA,
          original = q.raycaster.intersectObjects;
        q.pinchPicks = 0;
        q.raycaster.intersectObjects = function (...args) {
          q.pinchPicks++;
          return original.apply(this, args);
        };
        q.restorePick = () => (q.raycaster.intersectObjects = original);
        return visualViewport.scale;
      });
      const cdp = await context.newCDPSession(page);
      const a = {
          x: bounds.x + bounds.width * 0.35,
          y: bounds.y + bounds.height * 0.45,
        },
        b = { x: bounds.x + bounds.width * 0.65, y: a.y };
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { ...a, id: 31 },
          { ...b, id: 32 },
        ],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { ...a, x: a.x - 20, id: 31 },
          { ...b, x: b.x + 20, id: 32 },
        ],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { ...a, x: a.x - 40, id: 31 },
          { ...b, x: b.x + 40, id: 32 },
        ],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await cdp.detach();
      const picks = await page.evaluate(() => {
        const q = __lagoonQA;
        q.restorePick();
        return q.pinchPicks;
      });
      assert.equal(
        picks,
        0,
        `${id}: pinch does not initialize a cat drag or raycast cat rigs`,
      );
      assert.equal(
        await page.evaluate(() => visualViewport.scale),
        scale,
        `${id}: pinch controls the game camera, not page zoom`,
      );
    } finally {
      await page.evaluate(() => {
        const q = __lagoonQA;
        q.measure = false;
        q.commandOnly = false;
        q.freeze = true;
        q.shadowDepth?.setEnabled(true);
        if (q.matrixCache) q.matrixCache.enabled = true;
        if (q.staticDraws?.traversal) q.staticDraws.traversal.enabled = true;
        for (const restore of q.restoreGL) restore();
        q.restoreGL = [];
      });
    }
    await page.evaluate(async () => {
      const before = scrollY;
      window.scrollBy(0, 160);
      await new Promise(requestAnimationFrame);
      window.scrollTo(0, before);
    });
    rows.push({ id, repeat: rows.some((r) => r.id === id), image, phases });
    fs.writeFileSync(
      path.join(review, "all-camera-gestures.json"),
      JSON.stringify(rows, null, 2),
    );
    console.log(
      "CAMERA",
      JSON.stringify({
        id,
        repeat: rows.at(-1).repeat,
        changed: image.changed,
        triangles: image.after.triangles,
        bufferBytes: image.memory.bytes,
        residency: image.residency,
        phases,
      }),
    );
  }
  assert.equal(rows.length, 31);
  if (process.env.CHICHI_QA_HOMES) {
    const homes=await page.evaluate(()=>Object.values(__lagoonSaveQA.getGame().housing.homes).sort((a,b)=>a.plot-b.plot));
    assert.equal(homes.length,Number(process.env.CHICHI_QA_HOMES));
    const visits=[];
    for (const home of [homes[0],homes.at(-1),homes[0]]) {
      await page.evaluate(id=>{
        const q=__lagoonQA;q.manualFrames=false;q.freeze=false;q.cpuOnly=true;q.drawPaused=true;
        q.showCatHome(id);
      },home.id);
      await page.waitForFunction(id=>{
        const q=__lagoonQA;
        return q.look.distanceTo(q.desiredLook)<.01 && q.islands.get('cat-homes').userData.houses.has(id);
      },home.id);
      const result=await page.evaluate(id=>{
        const root=__lagoonQA.islands.get('cat-homes'), data=root.userData;
        const copies=data.detail.children.filter(o=>o.userData.houseId===id);
        return {id,copies:copies.length,loaded:data.houses.size,sections:data.sections.size,
          templates:data.templates.size,pending:data.pendingHouses?.size||0,
          ledger:Object.keys(__lagoonSaveQA.getGame().housing.homes).length};
      },home.id);
      assert.equal(result.copies,1,'one live model per permanent purchase, including after eviction/return');
      assert.equal(result.ledger,homes.length);
      assert.ok(result.templates<=7);
      visits.push(result);
    }
    fs.writeFileSync(path.join(review,'housing-return.json'),JSON.stringify(visits,null,2));
    console.log('HOUSING_RETURN',JSON.stringify(visits));
  }
}
