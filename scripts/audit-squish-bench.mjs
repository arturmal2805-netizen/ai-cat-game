import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function auditSquishBench({
  page,
  review,
  errors,
  httpErrors,
  desktop,
}) {
  if (process.env.CHICHI_SQUISH_TEMPORAL) {
    const { auditSquishTemporal } = await import("./audit-squish-temporal.mjs");
    return auditSquishTemporal({ page, review, errors, httpErrors, desktop });
  }
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
  await page.waitForFunction(() => !!__lagoonQA.warehouse().testScene, {
    timeout: 180000,
  });
  await page.evaluate(() => {
    const q = __lagoonQA;
    q.manualFrames = true;
    q.testNow = Math.max(q.testNow || 0, performance.now());
    q.warehouse().testScene.setPlaying(false);
  });
  const capture = async (material, state, number) => {
    const r = await page.evaluate(() => {
      const q = __lagoonQA,
        bench = q.warehouse().testScene,
        toy = bench.toys.find(
          (t) => t.userData.material === bench.diagnostics.selected,
        ),
        u = toy.userData;
      const start = performance.now();
      q.drawFrame();
      q.renderer.getContext().finish();
      return {
        raw: q.renderer.domElement.toDataURL("image/png").split(",")[1],
        renderFinishMs: performance.now() - start,
        bench: bench.diagnostics,
        material: u.material,
        solver: u.solver.diagnostics(),
        effects: {
          butter: u.butter?.diagnostics,
          filaments: u.filaments?.diagnostics,
          merge: u.coalescence?.diagnostics,
          foam: u.foam?.diagnostics,
        },
        camera: {
          position: q.camera.position.toArray(),
          target: q.look.toArray(),
          fov: q.camera.fov,
          aspect: q.camera.aspect,
        },
        renderer: {
          dpr: q.renderer.getPixelRatio(),
          shadow: q.renderer.shadowMap.type,
          toneMapping: q.renderer.toneMapping,
          info: { ...q.renderer.info.render },
        },
        sceneTime: q.terrainClock,
        reviewHour: q.reviewHour,
        seed: 4419,
      };
    });
    const name = `bench-${material}-${number}`;
    await writeFile(join(review, name + ".png"), Buffer.from(r.raw, "base64"));
    delete r.raw;
    r.state = state;
    await writeFile(join(review, name + ".json"), JSON.stringify(r, null, 2));
    assert(r.solver.minTetRatio > 0, material + " positive tetrahedra");
    assert.equal(r.solver.faults, 0);
    return { name, state, ...r };
  };
  const times = {
    foam: [0, 2, 4.8, 9],
    jelly: [0, 1.16, 3.64, 8],
    slime: [0, 2.7, 4.7, 9],
    butter: [0, 2, 3.5, 4.9],
    cloud: [0, 2.7, 4.7, 9],
  };
  const labels = {
    foam: ["NORMAL", "PAW PRESS", "DEEP COMPRESSION", "SLOW RECOVERY"],
    jelly: ["NORMAL", "COMPRESSION", "WOBBLE", "RECOVERY"],
    slime: ["REST", "STRETCH", "TWIST / STRANDS", "MERGE / RELAX"],
    butter: ["INTACT", "STRONG COMPRESSION", "CRACKS", "LOCAL FRACTURE"],
    cloud: ["FLUFFY REST", "SOFT SINK", "WIDE COMPRESSION", "SLOW RECOVERY"],
  };
  const frames = [];
  for (const material of process.env.CHICHI_SQUISH_MATERIALS?.split(",") ||
    Object.keys(times)) {
    await page.evaluate((material) => {
      const q = __lagoonQA,
        bench = q.warehouse().testScene;
      bench.select(material);
      const toy = bench.toys.find((t) => t.userData.material === material),
        p = toy.getWorldPosition(new q.THREE.Vector3());
      q.oceanReviewCamera = {
        eye: [p.x + 6, p.y + 5.8, p.z + 9],
        target: [p.x, p.y + 2.4, p.z],
        fov: 48,
        far: 20000,
      };
      q.manualStepping = true;
      try {
        q.step((q.testNow += 100));
      } finally {
        q.manualStepping = false;
      }
    }, material);
    let previous = 0;
    for (let i = 0; i < 4; i++) {
      const target = Math.round(times[material][i] * 60);
      await page.evaluate(
        (n) => __lagoonQA.warehouse().testScene.advanceFixed(n),
        target - previous,
      );
      previous = target;
      frames.push(await capture(material, labels[material][i], i));
    }
    console.log("SQUISH_BENCH_FOUR_STATES", material);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(httpErrors, []);
  await writeFile(
    join(review, "bench-states-result.json"),
    JSON.stringify(
      {
        passed: true,
        desktop,
        frames,
        limitations:
          "Real developer-only solver models with one temporary original-factory native rig, not replacements for live player/toys. Original pink toy tested independently. Rendering timings are software QA, not physical-device FPS. Semantic review and full cycles still required.",
      },
      null,
      2,
    ),
  );
  const escape = (s) =>
    String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  await writeFile(
    join(review, "reference-board.html"),
    `<!doctype html><meta charset="utf-8"><title>V19 actual state review</title><style>body{font:16px sans-serif;background:#211a2c;color:#fff}table{border-collapse:collapse}td,th{border:1px solid #796783;padding:12px;vertical-align:top}img{max-width:620px;width:100%}</style><h1>REFERENCE | CURRENT GAME | DIFFERENCES</h1><p>The user reference was viewed inline. Its original image bytes are not mounted; no invented original or generated game evidence is substituted.</p><table><tr><th>Reference state</th><th>Actual game</th><th>Review</th></tr>${frames.map((f) => `<tr><td>${escape(f.material)}: ${escape(f.state)}</td><td><img src="${f.name}.png"><a href="${f.name}.json">Actual measurements/source metadata</a></td><td>Await semantic inspection. Existing primary pink model proof is separate. Slime merge remains a labelled implicit approximation.</td></tr>`).join("")}</table>`,
  );
  console.log("SQUISH_BENCH_NATIVE_PASS");
}
