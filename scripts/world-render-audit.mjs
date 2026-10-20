// QA only: profile the COMPLETE renderer without saturating the software GPU.
// Suppress raster draw/clear commands after warming real frames. Scene traversal,
// matrices, frustum tests, shaders, uniform uploads and material work still run.
import fs from "node:fs";
import path from "node:path";
export async function auditWorldRender(page, context, review) {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.setSamplingInterval", { interval: 100 });
  const rows = [];
  for (const id of ["moon", "homestead", "aquarium"]) {
    await page.evaluate((id) => {
      const q = __lagoonQA;
      q.freeze = false;
      q.drawPaused = true;
      q.cpuOnly = true;
      document.querySelector(`[data-biome="${id}"]`).click();
      const island = q.islands.get(id);
      q.reviewView(
        island.position.x,
        island.position.z,
        id === "moon" ? 38 : 85,
      );
    }, id);
    await page.waitForFunction(
      (id) =>
        !__lagoonQA.islands.get(id).userData.lowOnly &&
        __lagoonQA.look.distanceTo(__lagoonQA.desiredLook) < 0.01,
      id,
    );
    await page.waitForTimeout(1000);
    await page.waitForFunction(() => __lagoonQA.colonyDraws?.stats.ready);
    await page.evaluate(() => {
      const q = __lagoonQA;
      q.auditBaseCamera = q.camera.position.clone();
      q.auditBaseLook = q.look.clone();
    });
    for (const motion of [false, true]) {
      for (const optimized of [false, true]) {
        await page.evaluate((optimized) => {
          const q = __lagoonQA,
            gl = q.renderer.getContext();
          q.freeze = true;
          q.poseAtlas.setEnabled(optimized);
          q.camera.position.copy(q.auditBaseCamera);
          q.camera.lookAt(q.auditBaseLook);
          q.drawFrame();
          gl.finish(); // QA only: drain the fixed real frame before CPU sampling.
          q.suppressed = [];
          function suppress(object, name) {
            const before = object[name];
            if (typeof before !== "function") return;
            q.suppressed.push(() => {
              object[name] = before;
            });
            object[name] = () => {};
          }
          for (const name of [
            "drawArrays",
            "drawElements",
            "drawArraysInstanced",
            "drawElementsInstanced",
            "clear",
          ])
            suppress(gl, name);
          const ext = gl.getExtension("WEBGL_multi_draw");
          if (ext)
            for (const name of [
              "multiDrawArraysWEBGL",
              "multiDrawElementsWEBGL",
              "multiDrawArraysInstancedWEBGL",
              "multiDrawElementsInstancedWEBGL",
            ])
              suppress(ext, name);
          q.wholeFrames = [];
          q.fixedCamera = {
            position: q.auditBaseCamera,
            look: q.auditBaseLook,
          };
          q.poseAtlas.forEachCat((cat) =>
            q.setCatMood(cat, "happy", { immediate: true }),
          );
        }, optimized);
        await cdp.send("Profiler.start");
        await page.evaluate(async (motion) => {
          const q = __lagoonQA;
          for (let i = 0; i < 90; i++) {
            const start = performance.now();
            if (motion) {
              const p = q.fixedCamera.position,
                look = q.fixedCamera.look,
                a = Math.sin(i / 20) * 0.16,
                dx = p.x - look.x,
                dz = p.z - look.z;
              q.camera.position.set(
                look.x + dx * Math.cos(a) - dz * Math.sin(a),
                p.y,
                look.z + dx * Math.sin(a) + dz * Math.cos(a),
              );
              q.camera.lookAt(look);
              let index = 0;
              q.poseAtlas.forEachCat((cat) =>
                q.animateCat(cat, 3 + i / 60 + index++, true, false),
              );
            }
            q.drawFrame();
            q.wholeFrames.push(performance.now() - start);
            if (i % 10 === 9) await new Promise(requestAnimationFrame);
          }
        }, motion);
        const profile = await cdp.send("Profiler.stop");
        fs.writeFileSync(
          path.join(
            review,
            id +
              (motion ? "-moving" : "-still") +
              (optimized ? "-shared" : "-native") +
              "-whole-render-profile.json",
          ),
          JSON.stringify(profile),
        );
        const result = await page.evaluate(() => {
          const q = __lagoonQA;
          for (const restore of q.suppressed) restore();
          const a = q.wholeFrames.slice(10).sort((a, b) => a - b);
          let nodes = 0,
            meshes = 0,
            activeNodes = 0,
            activeMeshes = 0;
          q.scene.traverse((o) => {
            nodes++;
            if (o.isMesh) meshes++;
          });
          q.scene.traverseVisible((o) => {
            activeNodes++;
            if (o.isMesh) activeMeshes++;
          });
          return {
            renderCPU: {
              samples: a.length,
              median: a[Math.floor(a.length * 0.5)],
              p95: a[Math.floor(a.length * 0.95)],
              max: a.at(-1),
            },
            draw: { ...q.renderer.info.render },
            memory: { ...q.renderer.info.memory },
            nodes,
            meshes,
            activeNodes,
            activeMeshes,
            dpr: q.renderer.getPixelRatio(),
            buffer: [q.renderer.domElement.width, q.renderer.domElement.height],
            colony: { ...q.colonyDraws.stats },
            poses: { ...q.poseAtlas.stats },
          };
        });
        rows.push({ id, motion, optimized, ...result });
        console.log(JSON.stringify(rows.at(-1)));
      }
    }
  }
  fs.writeFileSync(
    path.join(review, "whole-render.json"),
    JSON.stringify(rows, null, 2),
  );
}
