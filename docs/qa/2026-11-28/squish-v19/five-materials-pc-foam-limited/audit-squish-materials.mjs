import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
export async function auditSquishMaterials({
  page,
  review,
  errors,
  httpErrors,
  desktop,
}) {
  const activate = (s) =>
    desktop ? page.locator(s).click() : page.locator(s).tap();
  await page.evaluate(() => {
    const q = __lagoonQA;
    q.freeze = false;
    q.drawPaused = true;
    q.reviewHour = 12;
    q.terrainClock = 7;
    document.querySelector('[data-biome="autumn"]').click();
  });
  await page.waitForFunction(
    () => !!__lagoonQA.islands.get("autumn")?.userData.ocean?.warehouse,
    { timeout: 240000 },
  );
  await activate(".warehouse-access");
  await activate("[data-warehouse-interior]");
  await page.waitForFunction(() => !!__lagoonQA.warehouse().interior, {
    timeout: 180000,
  });
  await page.evaluate(() => {
    const q = __lagoonQA;
    q.manualFrames = true;
    q.drawPaused = true;
    q.testNow = Math.max(q.testNow || 0, performance.now());
  });
  const step = (n) =>
    page.evaluate((n) => {
      const q = __lagoonQA;
      for (let i = 0; i < n; i++) {
        q.testNow += 1000 / 60;
        q.manualStepping = true;
        try {
          q.step(q.testNow);
        } finally {
          q.manualStepping = false;
        }
      }
    }, n);
  const frames = [];
  const shot = async (id, state) => {
    const r = await page.evaluate((id) => {
      const q = __lagoonQA,
        t = q
          .warehouse()
          .interior.userData.toys.find((t) => t.userData.material === id);
      q.drawFrame();
      q.renderer.getContext().finish();
      return {
        raw: q.renderer.domElement.toDataURL("image/png").split(",")[1],
        material: id,
        solver: t.userData.solver.diagnostics(),
        foam: t.userData.foam?.diagnostics,
        crunchy: t.userData.crunchy?.diagnostics,
        sceneTime: q.terrainClock,
        reviewHour: q.reviewHour,
        seed: 4419,
        camera: {
          position: q.camera.position.toArray(),
          target: q.look.toArray(),
          fov: q.camera.fov,
          aspect: q.camera.aspect,
          near: q.camera.near,
          far: q.camera.far,
        },
        objectPosition: t.getWorldPosition(new q.THREE.Vector3()).toArray(),
        renderer: {
          dpr: q.renderer.getPixelRatio(),
          shadow: q.renderer.shadowMap.type,
          toneMapping: q.renderer.toneMapping,
          info: { ...q.renderer.info.render },
        },
        time: t.userData.solver.time,
      };
    }, id);
    await writeFile(
      join(review, `material-${id}-${state}.png`),
      Buffer.from(r.raw, "base64"),
    );
    delete r.raw;
    await writeFile(
      join(review, `material-${id}-${state}.json`),
      JSON.stringify(r, null, 2),
    );
    frames.push({ id, state, ...r });
    return r;
  };
  for (const id of process.env.CHICHI_SQUISH_MATERIALS
    ? process.env.CHICHI_SQUISH_MATERIALS.split(",")
    : ["jelly", "butter", "slime", "cloud", "foam", "crunchy", "mochi"]) {
    await activate(`[data-squish-zone="${id}"]`);
    await page.evaluate((id) => {
      const q = __lagoonQA,
        T = q.THREE,
        t = q
          .warehouse()
          .interior.userData.toys.find((t) => t.userData.material === id),
        p = t.getWorldPosition(new T.Vector3()),
        sy = t.userData.solver.size[1];
      q.oceanReviewCamera = {
        eye:
          id === "giant"
            ? [p.x + 16, p.y + 14, p.z + 23]
            : id === "foam"
              ? [p.x + 2, p.y + 7, p.z + 4.5]
              : [p.x + 7, p.y + 5.5, p.z + 10],
        target: [p.x, p.y + sy * 0.45, p.z],
        fov: 48,
        far: 20000,
      };
      q.manualStepping = true;
      q.step((q.testNow += 100));
      q.manualStepping = false;
    }, id);
    const cameraError = await page.evaluate(() => {
      const q=__lagoonQA;return q.camera.position.distanceTo(new q.THREE.Vector3(...q.oceanReviewCamera.eye));
    });
    assert(cameraError < 1e-6, id+" actual camera matches the requested material view: "+cameraError);
    await shot(id, "rest");
    await activate('[data-squish-mode="press"]');
    const position = await page.evaluate((id) => {
      const q = __lagoonQA,
        T = q.THREE,
        t = q
          .warehouse()
          .interior.userData.toys.find((t) => t.userData.material === id),
        p = new T.Vector3(
          0,
          id === "giant" ? 6 : id === "foam" ? 1.38 : 2.6,
          id === "giant" ? 1 : id === "foam" ? 0.3 : 1.9,
        );
      t.localToWorld(p);
      p.project(q.camera);
      const r = q.renderer.domElement.getBoundingClientRect();
      return {
        x: r.x + ((p.x + 1) * r.width) / 2,
        y: r.y + ((1 - p.y) * r.height) / 2,
      };
    }, id);
    let cdp;
    if (desktop) {
      await page.mouse.move(position.x, position.y);
      await page.mouse.down();
    } else {
      cdp = await page.context().newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ ...position, id: 9 }],
      });
    }
    await step(120);
    const press = await shot(id, "press");
    assert.equal(press.solver.contacts, 1, id + " actual pointer contact");
    assert(press.solver.maxDeformation > 0.02, id + " real deformation");
    assert(press.solver.minTetRatio > 0, id + " positive tetrahedra");
    if (desktop) await page.mouse.up();
    else
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    await cdp?.detach();
    await step(60);
    await shot(id, "hold");
    await step(240);
    await shot(id, "recovery");
    await activate('[data-squish-mode="camera"]');
    console.log("SQUISH_MATERIAL_NATIVE_STATES", id);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(httpErrors, []);
  await writeFile(
    join(review, "material-states-result.json"),
    JSON.stringify(
      {
        passed: true,
        desktop,
        frames,
        errors,
        httpErrors,
        paidInferenceCalled: false,
        scope:
          "Material rest/press/recovery stage. Fracture, strands, merge and final rich interior are separate OPEN stages.",
      },
      null,
      2,
    ),
  );
  console.log("SQUISH_MATERIAL_NATIVE_PASS");
}
