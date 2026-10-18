// Actual WebGL audit of every water attraction. Optional browser tooling;
// no live account, cloud save, external API or production credentials are used.
import { build } from "esbuild";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { WATER_RIDES } from "../public/water-ride-data.js";
const { chromium } = createRequire(import.meta.url)(
  process.env.CHICHI_PLAYWRIGHT_MODULE || "playwright",
);
const folder = resolve(
  process.env.CHICHI_SLIDE_REVIEW || "/tmp/chichi-slide-water-review",
);
await mkdir(folder, { recursive: true });
const roots = [
  ...(process.env.CHICHI_SLIDE_BASELINE
    ? [{ name: "before", path: resolve(process.env.CHICHI_SLIDE_BASELINE) }]
    : []),
  { name: "after", path: resolve(".") },
];
const source = `
import * as T from 'three';import {makeAttraction,animateAttraction} from './public/world-assets.js';import {disposeScenery} from './public/scenery-models.js';
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.toneMapping=T.ACESFilmicToneMapping;renderer.setSize(720,600);document.body.style='margin:0';document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0xc4d9e3);scene.add(new T.HemisphereLight(0xe7f1ff,0x81856c,1.5));const sun=new T.DirectionalLight(0xffeed9,2.3);sun.position.set(-8,14,7);scene.add(sun);
const camera=new T.PerspectiveCamera(35,1.2,.1,600);let model,extent,center;
window.loadRide=async(id)=>{if(model){model.removeFromParent();disposeScenery(model);}model=makeAttraction(id);scene.add(model);const box=new T.Box3().setFromObject(model);center=box.getCenter(new T.Vector3());extent=box.getSize(new T.Vector3()).length();camera.position.copy(center).add(new T.Vector3(.6,.48,.85).multiplyScalar(extent*1.25));camera.lookAt(center);await renderer.compileAsync(scene,camera);window.model=model;draw(5);};
window.draw=(time,reduced=false)=>{if(model.userData.update)model.userData.update(time,reduced);else animateAttraction(model,reduced?0:time);model.userData.moving.visible=false;for(const vehicle of model.userData.vehicles||[])vehicle.visible=false;renderer.render(scene,camera);};
window.reviewAngle=(grazing=false)=>{camera.position.copy(center).add(new T.Vector3(grazing?.85:.6,grazing?.12:.48,grazing?.85:.85).multiplyScalar(extent*1.25));camera.lookAt(center);};
window.check={renderer,scene,camera};window.ready=true;`;
const bundles = new Map();
for (const root of roots) {
  const r = await build({
    stdin: { contents: source, resolveDir: root.path, loader: "js" },
    bundle: true,
    format: "esm",
    write: false,
  });
  bundles.set("/" + root.name, r.outputFiles[0].text);
}
const server = createServer((req, res) => {
  if (req.url === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }
  const script = bundles.get(req.url);
  res.writeHead(script ? 200 : 404, { "Content-Type": "text/html" });
  res.end(script ? '<script type="module">' + script + "</script>" : "");
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
let browser;
const report = [];
try {
  browser = await chromium.launch({
    executablePath: process.env.CHICHI_CHROMIUM,
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  for (const root of roots) {
    const page = await browser.newPage({
        viewport: { width: 720, height: 600 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(
      "http://127.0.0.1:" + server.address().port + "/" + root.name,
    );
    await page.waitForFunction(() => window.ready);
    for (const spec of WATER_RIDES.filter(
      (r) =>
        !process.env.CHICHI_SLIDE_FILTER ||
        process.env.CHICHI_SLIDE_FILTER.split(",").includes(r.id),
    )) {
      await page.evaluate((id) => loadRide(id), spec.id);
      const stats = await page.evaluate(async () => {
        const { renderer: r } = check,
          w = model.userData.slideWater;
        draw(6);
        const still = r.domElement.toDataURL();
        draw(6.4);
        const animated = still !== r.domElement.toDataURL();
        draw(5, true);
        const frozen = r.domElement.toDataURL();
        draw(35, true);
        const stable = frozen === r.domElement.toDataURL();
        const versions = w
          ? [
              w.effects.spray.geometry.attributes.aLife.version,
              w.effects.spray.geometry.attributes.aOrigin.version,
            ]
          : [];
        draw(40);
        draw(41);
        const buffersStable =
          !w ||
          (versions[0] === w.effects.spray.geometry.attributes.aLife.version &&
            versions[1] ===
              w.effects.spray.geometry.attributes.aOrigin.version);
        const idleSpray = w?.effects.spray.visible;
        if (w?.events.length) {
          model.userData.rideElapsed = w.events[0].time + 0.02;
          draw(50);
        }
        const impact = w
          ? Array.from(w.effects.power).some((n) => n > 0)
          : null;
        delete model.userData.rideElapsed;
        const gl = r.getContext(),
          times = [];
        for (let i = 0; i < 16; i++) {
          const start = performance.now();
          draw(60 + i / 30);
          gl.finish();
          if (i >= 4) times.push(performance.now() - start);
        }
        times.sort((a, b) => a - b);
        return {
          draws: r.info.render.calls,
          triangles: r.info.render.triangles,
          textures: r.info.memory.textures,
          medianMs: times[Math.floor(times.length / 2)],
          p95Ms: times.at(-1),
          animated,
          stable,
          buffersStable,
          idleSpray,
          impact,
          channels: w
            ? w.channels.length +
              w.materials.filter((m) => m.uniforms.uFlowing.value === 2).length
            : null,
          outlets: w?.outlets.length,
          contextLost: gl.isContextLost(),
        };
      });
      if (root.name === "after") {
        assert.equal(stats.channels, spec.channels, spec.id);
        assert.equal(stats.animated, true, spec.id + " is static");
        assert.equal(stats.stable, true, spec.id + " reduced motion");
        assert.equal(stats.buffersStable, true);
        assert.equal(stats.contextLost, false);
        assert.equal(stats.idleSpray, spec.kind !== "dive");
        assert.equal(stats.impact, true);
      }
      await page.screenshot({
        path: resolve(folder, root.name + "-" + spec.id + ".png"),
      });
      if (root.name === "after")
        for (const view of ["flow", "outlet"]) {
          const exists = await page.evaluate(
            ({ view, id }) => {
              const w = model.userData.slideWater;
              let p =
                view === "flow"
                  ? w.channels[0]?.geometry.userData.flowFrames[
                      Math.floor(
                        w.channels[0].geometry.userData.flowFrames.length * 0.4,
                      )
                    ].p
                  : w.outlets.at(-1)?.to;
              if (view === "flow" && id === "slide-titan-funnel")
                p = { x: 3, y: 5.55, z: 1 };
              if (!p) return false;
              check.camera.position.set(p.x + 4, p.y + 3, p.z + 5);
              if (id === "slide-titan-funnel" && view === "flow")
                check.camera.position.set(p.x + 3, p.y + 9, p.z + 4);
              check.camera.lookAt(p.x, p.y, p.z);
              draw(63);
              return true;
            },
            { view, id: spec.id },
          );
          if (exists)
            await page.screenshot({
              path: resolve(
                folder,
                root.name + "-" + spec.id + "-" + view + "-close.png",
              ),
            });
        }
      if (
        root.name === "after" &&
        [
          "slide-glass-corkscrew",
          "slide-titan-funnel",
          "slide-marshmallow",
          "waterslide",
          "slide-rainbow-tsunami",
        ].concat(WATER_RIDES.filter(r=>r.id.startsWith("slide-dream-")).map(r=>r.id)).includes(spec.id)
      ) {
        await page.evaluate(() => {
          reviewAngle(true);
          draw(63);
        });
        await page.screenshot({
          path: resolve(folder, root.name + "-" + spec.id + "-grazing.png"),
        });
      }
      report.push({ version: root.name, id: spec.id, ...stats });
      console.log(root.name, spec.id, JSON.stringify(stats));
    }
    await page.setViewportSize({ width: 390, height: 560 });
    for (const id of [
      "slide-marshmallow",
      "slide-glass-corkscrew",
      "slide-rainbow-tsunami",
      ...WATER_RIDES.filter(r=>r.id.startsWith("slide-dream-") && (!process.env.CHICHI_SLIDE_FILTER || process.env.CHICHI_SLIDE_FILTER.split(",").includes(r.id))).map(r=>r.id),
    ]) {
      await page.evaluate(async (id) => {
        const { renderer: r, camera: c } = check;
        r.setPixelRatio(2);
        r.setSize(390, 560);
        c.aspect = 390 / 560;
        c.updateProjectionMatrix();
        await loadRide(id);
        draw(7);
      }, id);
      const canvas = await page.evaluate(() => [
        check.renderer.domElement.width,
        check.renderer.domElement.height,
      ]);
      assert.deepEqual(canvas, [780, 1120]);
      await page.screenshot({
        path: resolve(folder, root.name + "-" + id + "-phone.png"),
      });
    }
    assert.deepEqual(errors, [], root.name + " browser/GLSL errors");
    await page.close();
  }
  await writeFile(
    resolve(folder, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    "Every water ride rendered: flowing channels, real outlets, ballistic droplets, foam, rider impacts, stable reduced motion and full mobile DPR.",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
