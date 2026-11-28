import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

// Invoked by the existing private native harness with STAGE=bench and
// CHICHI_SQUISH_TEMPORAL=1; add squishTest=1 to CHICHI_PROFILE_QUERY.
// This module never creates a mock renderer, alternative cat or fake image.
export async function auditSquishTemporal({
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
    null,
    { timeout: 240000 },
  );
  await activate(".warehouse-access");
  await activate("[data-warehouse-interior]");
  await page.waitForFunction(
    () => typeof __lagoonQA.warehouse().testScene?.startTemporal === "function",
    null,
    { timeout: 180000 },
  );
  await page.evaluate(() => {
    const q = __lagoonQA;
    q.manualFrames = true;
    q.drawPaused = true;
    q.testNow = Math.max(q.testNow || 0, performance.now());
    q.warehouse().testScene.setPlaying(false);
    // Exact immutable vertex-byte signature of the approved native body/limbs.
    q.v22NativeSignature = () => {
      let hash = 2166136261,
        count = 0,
        meshes = 0;
      q.warehouse().testScene.actor.traverse((o) => {
        const a = o.geometry?.attributes?.position?.array;
        if (!o.isMesh || !a) return;
        const bytes = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
        meshes++;
        for (const byte of bytes) {
          hash ^= byte;
          hash = Math.imul(hash, 16777619) >>> 0;
        }
        count += a.length / 3;
      });
      return { hash: hash.toString(16), vertices: count, meshes };
    };
  });
  const materials = process.env.CHICHI_SQUISH_MATERIALS?.split(",") || [
    "jelly",
    "foam",
    "slime",
    "butter",
    "cloud",
  ];
  const times = [0, 0.2, 0.5, 1, 2, 4, 6, 10],
    all = [];
  const advance = async (frames) => {
    // Bounded actual fixed steps. Rendering pauses do not fabricate physics time.
    while (frames > 0) {
      const count = Math.min(30, frames);
      await page.evaluate(
        (n) => __lagoonQA.warehouse().testScene.advanceFixed(n),
        count,
      );
      frames -= count;
    }
  };
  const capture = async (material, time, phase) => {
    const result = await page.evaluate(() => {
      const q = __lagoonQA,
        b = q.warehouse().testScene,
        T = q.THREE;
      const toy = b.toys.find(
        (t) => t.userData.material === b.diagnostics.selected,
      );
      const measure = b.diagnostics.materials.find(
        (m) => m.material === b.diagnostics.selected,
      );
      const catMin = new T.Vector3(Infinity, Infinity, Infinity),
        catMax = new T.Vector3(-Infinity, -Infinity, -Infinity),
        v = new T.Vector3();
      b.actor.updateWorldMatrix(true, true);
      let nativeVertices = 0;
      b.actor.traverse((o) => {
        const p = o.geometry?.attributes?.position;
        if (!o.isMesh || !p) return;
        for (let i = 0; i < p.count; i++) {
          o.getVertexPosition(i, v);
          o.localToWorld(v);
          catMin.min(v);
          catMax.max(v);
          nativeVertices++;
        }
      });
      const gl = q.renderer.getContext(),
        before = [];
      for (let i = 0; i < 16; i++) {
        const code = gl.getError();
        if (code === gl.NO_ERROR) break;
        before.push(code);
      }
      const start = performance.now();
      q.drawFrame();
      const raw = q.renderer.domElement.toDataURL("image/png").split(",")[1],
        after = [];
      for (let i = 0; i < 16; i++) {
        const code = gl.getError();
        if (code === gl.NO_ERROR) break;
        after.push(code);
      }
      const point = toy.getWorldPosition(new T.Vector3());
      return {
        raw,
        bench: b.diagnostics,
        measure,
        nativeSignature: q.v22NativeSignature(),
        nativeBounds: {
          min: catMin.toArray(),
          max: catMax.toArray(),
          vertices: nativeVertices,
        },
        glErrors: { before, after },
        contextLost: gl.isContextLost(),
        renderReadbackMs: performance.now() - start,
        objectPosition: point.toArray(),
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
        seed: 4419,
        reviewHour: q.reviewHour,
        sceneTime: q.terrainClock,
      };
    });
    const name = `temporal-${material}-${phase}-${String(time).replace(".", "p")}s`;
    await writeFile(
      join(review, name + ".png"),
      Buffer.from(result.raw, "base64"),
    );
    delete result.raw;
    const frame = { name, material, phase, requestedTime: time, ...result };
    await writeFile(
      join(review, name + ".json"),
      JSON.stringify(frame, null, 2),
    );
    all.push(frame);
    assert.equal(frame.contextLost, false, material + " context remains live");
    assert.deepEqual(
      frame.glErrors,
      { before: [], after: [] },
      material + " native GL",
    );
    assert.equal(frame.measure.solver.faults, 0);
    assert(
      frame.measure.solver.minTetRatio >= 0.08,
      material + " positive cage",
    );
    assert(
      frame.nativeBounds.min.every(Number.isFinite) &&
        frame.nativeBounds.max.every(Number.isFinite),
    );
    assert(
      frame.nativeBounds.vertices > 1000,
      "actual original native vertices sampled",
    );
    assert(
      frame.nativeBounds.min[1] >= frame.objectPosition[1] - 0.03,
      material + " native cat never crosses physical bottom",
    );
    return frame;
  };
  for (const material of materials) {
    await page.evaluate((material) => {
      const q = __lagoonQA,
        b = q.warehouse().testScene;
      if (!b.startTemporal(material))
        throw Error("unknown temporal material " + material);
      const toy = b.toys.find((t) => t.userData.material === material),
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
    const loaded = [];
    let previous = 0;
    for (const time of times) {
      const target = Math.round(time * 60);
      await advance(target - previous);
      previous = target;
      const frame = await capture(material, time, "load");
      loaded.push(frame);
      assert.equal(
        frame.bench.steps,
        target,
        material + " actual continuous step count",
      );
      assert.equal(
        frame.measure.contacts.length,
        4,
        material + " four original native paws",
      );
      assert(
        Math.abs(frame.measure.supportForce - 8.5 * 9.81) < 1e-8,
        material + " stationary weight stays applied",
      );
      assert(
        frame.bench.nativePaws.every((p) => Math.abs(p.error) < 0.04),
        material + " actual skinned paws on actual triangles",
      );
      assert.equal(
        frame.measure.solver.impactEvents,
        0,
        "standing never invents impact",
      );
      assert.deepEqual(
        frame.nativeSignature,
        loaded[0].nativeSignature,
        "approved rig vertex bytes unchanged",
      );
    }
    const at2 = loaded.find((f) => f.requestedTime === 2),
      at10 = loaded.at(-1);
    if (material === "jelly")
      assert(
        Math.abs(at10.measure.maxContactDepth - at2.measure.maxContactDepth) <
          0.06,
        "jelly static equilibrium",
      );
    else
      assert(
        at10.measure.maxContactDepth - at2.measure.maxContactDepth > 0.02,
        material + " continuous creep under actual static native load",
      );
    await page.evaluate(() =>
      __lagoonQA.warehouse().testScene.releaseTemporal(),
    );
    previous = 0;
    let recovered;
    for (const time of [0.2, 0.5, 2, 6, 10]) {
      const target = Math.round(time * 60);
      await advance(target - previous);
      previous = target;
      recovered = await capture(material, time, "release");
      assert.equal(
        recovered.measure.contacts.length,
        0,
        material + " release ends all static contacts",
      );
      assert.deepEqual(recovered.nativeSignature, loaded[0].nativeSignature);
    }
    assert(
      recovered.measure.maxVertexDisplacement <
        at10.measure.maxVertexDisplacement,
      material + " actual mesh recovers after release",
    );
    console.log("SQUISH_V22_TEMPORAL_MATERIAL_PASS", material);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(httpErrors, []);
  await writeFile(
    join(review, "temporal-result.json"),
    JSON.stringify(
      {
        passed: true,
        desktop,
        frames: all,
        errors,
        httpErrors,
        scope:
          "Actual existing developer bench models and original createCat factory native rig. Continuous fixed60 static load and real mesh/paw measurements. Not production hero proof, physical-device FPS, reference acceptance or complete V22.",
        reference:
          "Original inline user-reference bytes remain unmounted; no generated substitute is used.",
      },
      null,
      2,
    ),
  );
  const curves = materials.map((material) => ({
    material,
    points: all
      .filter((f) => f.material === material)
      .map((f) => ({
        phase: f.phase,
        time: f.requestedTime,
        depth: f.measure.maxContactDepth,
        meshDisplacement: f.measure.maxVertexDisplacement,
        force: f.measure.supportForce,
        contacts: f.measure.contacts.length,
      })),
  }));
  await writeFile(
    join(review, "temporal-curves.json"),
    JSON.stringify(curves, null, 2),
  );
  const escape = (s) =>
    String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  await writeFile(
    join(review, "temporal-board.html"),
    `<!doctype html><meta charset="utf-8"><title>V22 actual temporal native frames</title><style>body{background:#211a2c;color:#fff;font:14px sans-serif}table{border-collapse:collapse}td,th{border:1px solid #796783;padding:8px}img{width:300px}</style><h1>V22 actual native static-load and release timeline</h1><p>Actual game captures. Fixed seed4419; original native rig; identical per-material camera. User reference bytes are not mounted. Semantic review, videos and production hero proof remain open.</p>${materials
      .map(
        (material) =>
          `<h2>${escape(material)}</h2><table><tr>${all
            .filter((f) => f.material === material)
            .map(
              (f) =>
                `<td>${f.phase} t=${f.requestedTime}s<br><img src="${f.name}.png"><br>depth ${f.measure.maxContactDepth.toFixed(4)}m<br><a href="${f.name}.json">Actual source/mesh/paw data</a></td>`,
            )
            .join("")}</tr></table>`,
      )
      .join("")}`,
  );
  console.log("SQUISH_V22_TEMPORAL_NATIVE_PASS");
}
