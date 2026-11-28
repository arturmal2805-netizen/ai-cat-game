import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
export async function auditRelease({
  page,
  review,
  errors,
  httpErrors,
  desktop,
}) {
  const activate = (s) =>
    desktop ? page.locator(s).click() : page.locator(s).tap();
  await page.evaluate(async () => {
    const q = __lagoonQA;
    q.freeze = false;
    q.manualFrames = false;
    q.drawPaused = true;
    q.reviewHour = 12;
    q.terrainClock = 7;
    document.querySelector('[data-biome="autumn"]').click();
    console.log("SQUISH_NATIVE_FOCUS");
  });
  await page.waitForFunction(
    () => !!__lagoonQA.islands.get("autumn")?.userData.ocean?.warehouse,
    { timeout: 240000 },
  );
  await page.evaluate(async () => {
    const q = __lagoonQA;
    await q.warehouse().ensure();
  });
  await activate(".warehouse-access");
  await activate("[data-warehouse-interior]");
  await page.waitForFunction(() => !!__lagoonQA.warehouse().interior, {
    timeout: 180000,
  });
  await page.evaluate(() => {
    const q = __lagoonQA,
      m = q.warehouse().interior,
      p = m.userData.toys
        .find((t) => t.userData.material === "jelly")
        .getWorldPosition(new q.THREE.Vector3());
    q.manualFrames = true;
    q.testNow = performance.now();
    q.oceanReviewCamera = {
      eye: [p.x + 7, p.y + 5.5, p.z + 10],
      target: [p.x, p.y + 2, p.z],
      fov: 48,
      far: 20000,
    };
    q.manualStepping = true;
    q.step((q.testNow += 100));
    q.manualStepping = false;
  });
  const frame = async (name) => {
    const result = await page.evaluate(() => {
      const q = __lagoonQA;
      q.drawFrame();
      q.renderer.getContext().finish();
      const m = q.warehouse().interior,
        t = m.userData.toys.find(
          (t) => t.userData.material === (q.squishReviewMaterial || "jelly"),
        ),
        s = t.userData.solver;
      return {
        raw: q.renderer.domElement.toDataURL("image/png").split(",")[1],
        solver: s.diagnostics(),
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
          info: { ...q.renderer.info.render },
        },
        time: s.time,
        sceneTime: q.terrainClock,
        reviewHour: q.reviewHour,
        seed: 4419,
        nativePaws: q.warehouse().pawDiagnostics,
      };
    });
    await writeFile(
      join(review, name + ".png"),
      Buffer.from(result.raw, "base64"),
    );
    delete result.raw;
    await writeFile(
      join(review, name + ".json"),
      JSON.stringify(result, null, 2),
    );
    return result;
  };
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
  await frame("one-squish-rest");
  await activate('[data-squish-mode="press"]');
  const location = await page.evaluate(() => {
    const q = __lagoonQA,
      T = q.THREE,
      m = q.warehouse().interior,
      p = new T.Vector3(0, 2.6, 1.9);
    m.userData.toys
      .find((t) => t.userData.material === "jelly")
      .localToWorld(p);
    p.project(q.camera);
    const r = q.renderer.domElement.getBoundingClientRect();
    return {
      x: r.x + ((p.x + 1) * r.width) / 2,
      y: r.y + ((1 - p.y) * r.height) / 2,
    };
  });
  let cdp;
  if (desktop) {
    await page.mouse.move(location.x, location.y);
    await page.mouse.down();
  } else {
    cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...location, id: 7 }],
    });
  }
  await step(60);
  const pressed = await frame("one-squish-press");
  assert.equal(pressed.solver.contacts, 1, "real mouse/touch contact");
  assert(pressed.solver.maxDeformation > 0.2);
  assert(pressed.solver.minTetRatio > 0);
  assert.equal(pressed.solver.faults, 0);
  if (desktop) await page.mouse.up();
  else
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  await step(12);
  await frame("one-squish-release");
  await step(180);
  const recovered = await frame("one-squish-recovery");
  assert.equal(recovered.solver.contacts, 0);
  assert(recovered.solver.maxDeformation < 0.03);
  await cdp?.detach();
  await activate('[data-squish-mode="camera"]');
  const catMaterial = process.env.CHICHI_SQUISH_CAT_MATERIAL || "jelly";
  await activate(`[data-squish-zone="${catMaterial}"]`);
  await page.evaluate((id) => {
    const q = __lagoonQA,
      t = q
        .warehouse()
        .interior.userData.toys.find((t) => t.userData.material === id),
      p = t.getWorldPosition(new q.THREE.Vector3());
    q.squishReviewMaterial = id;
    q.oceanReviewCamera = {
      eye: [p.x + 7, p.y + 6, p.z + 10],
      target: [p.x, p.y + 3, p.z],
      fov: 48,
      far: 20000,
    };
  }, catMaterial);
  await activate("[data-warehouse-squish-cat]");
  const phases = [];
  let found = false;
  const advance = (n) =>
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
      const w = q.warehouse(),
        v = w.runtime.get("chichi");
      return {
        manual: w.runtime.manual,
        wanted: v?.manualWanted,
        active: q.manualWalk().active,
        startFailure: q.manualWalk().startFailure,
        ground: (() => {
          const s = q.manualSurface(q.chichiCarrier.position, q.catRadius());
          return s ? { y: s.y, biome: s.biome } : null;
        })(),
        phase: v?.phase,
        squish: v?.frame?.squish?.state,
        paws: w.pawDiagnostics,
        position: q.chichiCarrier.position.toArray(),
      };
    }, n);
  for (let i = 0; i < 1200; i++) {
    const state = await advance(30);
    if (!phases.includes(state.phase)) {
      phases.push(state.phase);
      console.log("NATIVE_SQUISH_CAT_PHASE", state.phase);
    }
    if (
      state.squish &&
      state.paws.length >= 1 &&
      state.paws.every((p) => Math.abs(p.error) < 0.06)
    ) {
      found = true;
      await frame("one-squish-native-paws");
      await writeFile(
        join(review, "native-paw-contact.json"),
        JSON.stringify({ state, phases }, null, 2),
      );
      assert(
        state.paws.every((p) => Math.abs(p.error) < 0.06),
        "actual skinned paw positions follow deformed mesh",
      );
      break;
    }
  }
  assert(
    found,
    "original Chichi boards submarine, enters and jumps onto the squish",
  );
  if (process.env.CHICHI_SQUISH_RECORD) {
    const hashes = [];
    const { createHash } = await import("node:crypto");
    for (let i = 0; i < 37; i++) {
      if (i) await advance(5);
      const name = `sequence-native-${String(i).padStart(3, "0")}`;
      const meta = await frame(name);
      const { readFile } = await import("node:fs/promises");
      const bytes = await readFile(join(review, name + ".png"));
      hashes.push({
        frame: i,
        physicsStep: i * 5,
        time: i / 12,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        nativePaws: meta.nativePaws,
      });
    }
    await writeFile(
      join(review, "native-sequence-frames.json"),
      JSON.stringify(
        {
          fps: 12,
          duration: 37 / 12,
          kind: "Actual native fixed-step game rendering; not wall-clock hardware FPS",
          frames: hashes,
        },
        null,
        2,
      ),
    );
  }

  await writeFile(
    join(review, "native-paw-contact-sequence.json"),
    JSON.stringify(await advance(12), null, 2),
  );
  await frame("one-squish-native-knead");
  if (process.env.CHICHI_SQUISH_MANUAL_AUDIT) {
    await activate("[data-warehouse-control]");
    let ready = false;
    const manualTrace = [];
    let lastManualState = null;
    for (let i = 0; i < 1600; i++) {
      const st = await advance(15);
      const key = [
        st.phase,
        st.manual,
        st.wanted,
        st.active,
        st.startFailure,
        st.squish,
      ].join(":");
      if (key !== lastManualState || i % 120 === 0) {
        manualTrace.push({ i, ...st });
        lastManualState = key;
        console.log("SQUISH_MANUAL_TRACE", JSON.stringify(manualTrace.at(-1)));
      }
      if (
        st.manual === "chichi" &&
        (await page.locator(".chichi-walk-controls").isVisible())
      ) {
        ready = true;
        break;
      }
    }
    await writeFile(
      join(review, "manual-handoff-trace.json"),
      JSON.stringify(
        {
          manualTrace,
          dom: await page.evaluate(() => {
            const e = document.querySelector(".chichi-walk-controls");
            return {
              hidden: e.hidden,
              display: getComputedStyle(e).display,
              coarse: matchMedia("(pointer:coarse)").matches,
            };
          }),
          errors,
          httpErrors,
        },
        null,
        2,
      ),
    );
    if (!ready) await frame("manual-handoff-failed");
    assert(
      ready,
      "actual UI starts existing native third-person controller after safe descent",
    );
    await page.evaluate(() => {
      __lagoonQA.oceanReviewCamera = null;
    });
    await advance(8);
    const floor = await page.evaluate(
      () => __lagoonQA.chichiCarrier.position.y,
    );
    let controlCdp;
    if (desktop) {
      await page.keyboard.down("KeyS");
      await page.keyboard.down("Space");
    } else {
      const points = await page.evaluate(() =>
        [
          '.chichi-walk-controls [data-walk-key="KeyS"]',
          "[data-warehouse-jump]",
        ].map((s, i) => {
          const r = document.querySelector(s).getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2, id: 51 + i };
        }),
      );
      controlCdp = await page.context().newCDPSession(page);
      await controlCdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: points,
      });
    }
    await advance(55);
    const air = await frame("manual-actual-jump");
    const height = await page.evaluate(
      () => __lagoonQA.chichiCarrier.position.y,
    );
    assert(
      height > floor + 2,
      "keyboard/touch produces real high jump, not a camera animation",
    );
    if (desktop) {
      await page.keyboard.up("KeyS");
      await page.keyboard.up("Space");
    } else {
      await controlCdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await controlCdp.detach();
    }
    await advance(70);
    await frame("manual-soft-surface-landing");
    const landed = await page.evaluate(() => {
      const q = __lagoonQA,
        w = q.warehouse(),
        p = q.chichiCarrier.position,
        v = w.runtime.get("chichi");
      return {
        p: p.toArray(),
        manual: w.runtime.manual,
        wanted: v?.manualWanted,
        active: q.manualWalk().active,
        startFailure: q.manualWalk().startFailure,
        ground: (() => {
          const s = q.manualSurface(q.chichiCarrier.position, q.catRadius());
          return s ? { y: s.y, biome: s.biome } : null;
        })(),
        paws: w.pawDiagnostics,
        contacts: w.interior.userData.toys.reduce(
          (n, t) => n + t.userData.solver.contacts.size,
          0,
        ),
      };
    });
    assert.equal(landed.manual, "chichi");
    assert(landed.contacts > 0, "manual actor actually loads soft surface");
    assert(landed.paws.every((p) => Math.abs(p.error) < 0.06));
    await activate(".warehouse-access");
    await activate("[data-warehouse-return]");
    let released = false;
    for (let i = 0; i < 400; i++) {
      const st = await advance(15);
      if (st.manual !== "chichi") {
        released = true;
        break;
      }
    }
    assert(released, "return button releases after supported landing");
    await frame("manual-safe-release");
    await writeFile(
      join(review, "manual-native-result.json"),
      JSON.stringify(
        {
          passed: true,
          desktop,
          air,
          height,
          floor,
          landed,
          limitations:
            "Actual fixed-step native input/collision; not physical-device latency or FPS.",
        },
        null,
        2,
      ),
    );
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(httpErrors, []);
  await writeFile(
    join(review, "prototype-result.json"),
    JSON.stringify(
      {
        passed: true,
        desktop,
        pressed,
        recovered,
        actualInput: true,
        errors,
        httpErrors,
        limitations:
          "Stage-one single prop, not final interior/art or physical device FPS.",
      },
      null,
      2,
    ),
  );
  console.log("SQUISH_PROTOTYPE_NATIVE_PASS");
}
