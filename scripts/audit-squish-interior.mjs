import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
export async function auditSquishInterior({
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
  const frames = [];
  const shot = async (id) => {
    await step(120);
    const r = await page.evaluate(() => {
      const q = __lagoonQA,
        w = q.warehouse(),
        a = w.interior.userData.art;
      q.drawFrame();
      q.renderer.getContext().finish();
      return {
        raw: q.renderer.domElement.toDataURL("image/png").split(",")[1],
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
        sceneTime: q.terrainClock,
        reviewHour: q.reviewHour,
        seed: 4419,
        sectorCount: a.userData.sectors.length,
        collectables: a.userData.collectables,
        environments: [...new Set([...a.children].filter(o=>o.isMesh).map(o=>o.material))].map(m=>({colour:m.color?.getHex(),metalness:m.metalness,emissive:m.emissive?.getHex(),intensity:m.envMapIntensity,inputMap:!!m.envMap,preparedMap:!!q.renderer.properties.get(m).envMap,preparedMapping:q.renderer.properties.get(m).envMap?.mapping,textureType:q.renderer.properties.get(m).envMap?.type})),
        materials: w.interior.userData.toys.map((t) => ({
          sector: t.userData.sectorId,
          material: t.userData.material,
          solver: t.userData.solver.diagnostics(),
        })),
      };
    });
    await writeFile(
      join(review, `interior-${id}.png`),
      Buffer.from(r.raw, "base64"),
    );
    delete r.raw;
    await writeFile(
      join(review, `interior-${id}.json`),
      JSON.stringify(r, null, 2),
    );
    frames.push({ id, ...r });
    assert.deepEqual(errors, [], "GL errors in " + id);
    assert.equal(r.sectorCount, 10);
    assert(r.collectables >= 2000);
    console.log("SQUISH_INTERIOR_FRAME", id);
  };
  await activate("[data-squish-overview]");
  await shot("overview");
  for (const id of [
    "butter",
    "slime",
    "cloud",
    "giant",
    "jelly",
    "crunchy",
    "collection",
    "mochi",
    "foam",
    "sensory",
  ]) {
    await activate(`[data-squish-zone="${id}"]`);
    await shot(id);
  }
  assert.deepEqual(httpErrors, []);
  await writeFile(
    join(review, "interior-result.json"),
    JSON.stringify(
      {
        passed: true,
        desktop,
        frames,
        errors,
        httpErrors,
        paidInferenceCalled: false,
        limitations:
          "Architecture and shader validation only. Full material sequences, native manual support, AI/audio/LOD and final acceptance remain separate stages.",
      },
      null,
      2,
    ),
  );
  console.log("SQUISH_INTERIOR_NATIVE_PASS");
}
