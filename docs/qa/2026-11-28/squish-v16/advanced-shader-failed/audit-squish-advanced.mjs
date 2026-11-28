import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
export async function auditSquishAdvanced({
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
    q.testNow = performance.now();
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
  const camera = async (id, eye, target) => {
    await activate(`[data-squish-zone="${id}"]`);
    await page.evaluate(
      ({ id, eye, target }) => {
        const q = __lagoonQA,
          t = q
            .warehouse()
            .interior.userData.toys.find((t) => t.userData.material === id),
          p = t.getWorldPosition(new q.THREE.Vector3());
        q.oceanReviewCamera = {
          eye: eye.map((v, i) => v + p.getComponent(i)),
          target: target.map((v, i) => v + p.getComponent(i)),
          fov: 48,
          far: 20000,
        };
        q.manualStepping = true;
        q.step((q.testNow += 100));
        q.manualStepping = false;
      },
      { id, eye, target },
    );
  };
  const point = (id, position) =>
    page.evaluate(
      ({ id, position }) => {
        const q = __lagoonQA,
          t = q
            .warehouse()
            .interior.userData.toys.find((t) => t.userData.material === id),
          p = new q.THREE.Vector3(...position);
        t.localToWorld(p);
        p.project(q.camera);
        const r = q.renderer.domElement.getBoundingClientRect();
        return {
          x: r.x + ((p.x + 1) * r.width) / 2,
          y: r.y + ((1 - p.y) * r.height) / 2,
        };
      },
      { id, position },
    );
  let cdp = null,
    pointer = null;
  const down = async (p) => {
    pointer = p;
    if (desktop) {
      await page.mouse.move(p.x, p.y);
      await page.mouse.down();
    } else {
      cdp ??= await page.context().newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ ...p, id: 14 }],
      });
    }
  };
  const move = async (p) => {
    pointer = p;
    if (desktop) await page.mouse.move(p.x, p.y);
    else
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ ...p, id: 14 }],
      });
  };
  const up = async () => {
    if (desktop) await page.mouse.up();
    else
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    pointer = null;
  };
  const frames = [];
  const shot = async (id, state, group = id) => {
    const r = await page.evaluate((id) => {
      const q = __lagoonQA,
        t = q
          .warehouse()
          .interior.userData.toys.find((t) => t.userData.material === id);
      assertCamera();
      function assertCamera() {
        const eye = q.oceanReviewCamera.eye;
        if (q.camera.position.distanceTo(new q.THREE.Vector3(...eye)) > 1e-6)
          throw Error("Paced camera not applied");
      }
      q.drawFrame();
      q.renderer.getContext().finish();
      return {
        raw: q.renderer.domElement.toDataURL("image/png").split(",")[1],
        material: id,
        solver: t.userData.solver.diagnostics(),
        butter: t.userData.butter?.diagnostics,
        filaments: t.userData.filaments?.diagnostics,
        coalescence: t.userData.coalescence?.diagnostics,
        camera: {
          position: q.camera.position.toArray(),
          target: q.look.toArray(),
          fov: q.camera.fov,
          aspect: q.camera.aspect,
          near: q.camera.near,
          far: q.camera.far,
        },
        renderer: {
          dpr: q.renderer.getPixelRatio(),
          shadow: q.renderer.shadowMap.type,
          toneMapping: q.renderer.toneMapping,
        },
        time: t.userData.solver.time,
      };
    }, id);
    const file = `material-${group}-${state}`;
    await writeFile(join(review, file + ".png"), Buffer.from(r.raw, "base64"));
    delete r.raw;
    await writeFile(join(review, file + ".json"), JSON.stringify(r, null, 2));
    frames.push({ state, ...r });
    console.log("SQUISH_ADVANCED_FRAME", id, state);
    return r;
  };
  await camera("butter", [4, 4, 6], [0, 2.4, 1.3]);
  await shot("butter", "rest");
  await activate('[data-squish-mode="press"]');
  await down(await point("butter", [0, 2.6, 1.9]));
  await step(12);
  const gentle = await shot("butter", "press");
  assert(gentle.solver.maxDeformation > 0.05);
  await step(75);
  const crack = await shot("butter", "cracked");
  assert(crack.butter.crackedVertices > 0);
  await page.locator("[data-squish-pressure]").focus();
  await page.keyboard.press("End");
  await step(240);
  const fractured = await shot("butter", "fractured");
  assert(
    fractured.butter.detached > 0,
    "actual load sheds physical rind fragments",
  );
  await up();
  await activate("[data-squish-reset]");
  await step(2);
  const reset = await shot("butter", "reset");
  assert.equal(reset.solver.damage, 0);
  assert.equal(reset.butter.detached, 0);
  await camera("slime", [7, 5.5, 10], [0, 2, 0]);
  await activate("[data-squish-reset]");
  await page.locator("[data-squish-pressure]").focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowRight");
  await shot("slime", "rest");
  await activate('[data-squish-mode="stretch"]');
  const start = await point("slime", [0.3, 2.4, 1.7]),
    end = await point("slime", [1.3, 3, 1.7]);
  await down(start);
  for (let i = 1; i <= 8; i++) {
    await move({
      x: start.x + ((end.x - start.x) * i) / 8,
      y: start.y + ((end.y - start.y) * i) / 8,
    });
    await step(2);
  }
  const stretch = await shot("slime", "stretch");
  assert(
    stretch.filaments.active > 0,
    "actual drag stretches physical filaments",
  );
  assert(stretch.filaments.filaments.every((f) => f.finite));
  await up();
  await step(45);
  await shot("slime", "release");
  await activate('[data-squish-mode="twist"]');
  const turn = await point("slime", [1, 2.4, 1.3]);
  await down(turn);
  await move({ x: turn.x + 80, y: turn.y });
  await step(60);
  const twist = await shot("slime", "twist");
  assert(twist.solver.maxDeformation > 0.04);
  await up();
  await activate('[data-squish-mode="camera"]');
  await camera("slime", [-3.7, 3.2, 7.3], [-3.7, 0.9, 2.9]);
  await activate("[data-squish-reset]");
  const separate = await shot("slime", "rest", "slimeMerge");
  assert.equal(separate.coalescence.components, 2);
  await activate("[data-squish-merge]");
  await step(240);
  const merged = await shot("slime", "merged", "slimeMerge");
  assert.equal(merged.coalescence.components, 1);
  assert(Math.abs(merged.coalescence.volumeProxyRatio - 1) < 0.1);
  await activate("[data-squish-split]");
  await step(240);
  const split = await shot("slime", "split", "slimeMerge");
  assert.equal(split.coalescence.components, 2);
  await cdp?.detach();
  assert.deepEqual(errors, []);
  assert.deepEqual(httpErrors, []);
  await writeFile(
    join(review, "advanced-result.json"),
    JSON.stringify(
      {
        passed: true,
        desktop,
        frames,
        errors,
        httpErrors,
        paidInferenceCalled: false,
        limitations:
          "Implicit two-mass coalescence is a volume-normalized visual approximation. Fixed-step game state captures do not measure real-device FPS. Final ten-sector interior/ASMR/full acceptance remain open.",
      },
      null,
      2,
    ),
  );
  console.log("SQUISH_ADVANCED_NATIVE_PASS");
}
