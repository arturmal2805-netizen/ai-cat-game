// Optional real WebGL regression check. Normal builds/tests need no browser.
// Set CHICHI_PLAYWRIGHT_MODULE and CHICHI_CHROMIUM when not on the system path.
// CHICHI_WATER_BASELINE can point to an earlier checkout for an A/B comparison.
import { build } from "esbuild";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
const { chromium } = createRequire(import.meta.url)(
  process.env.CHICHI_PLAYWRIGHT_MODULE || "playwright",
);
const roots = [
  ...(process.env.CHICHI_WATER_BASELINE
    ? [{ name: "before", path: resolve(process.env.CHICHI_WATER_BASELINE) }]
    : []),
  { name: "after", path: resolve(".") },
];
const scene = `
import * as T from 'three';
import {createLagoon,createWaterfall} from './public/lagoon.js';
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.toneMapping=T.ACESFilmicToneMapping;
document.body.style='margin:0';document.body.append(renderer.domElement);
const world=new T.Scene();world.background=new T.Color(0xb4c6d8);
world.add(new T.HemisphereLight(0xdcecff,0x75876c,1.3));
const sun=new T.DirectionalLight(0xffeed9,2.2);sun.position.set(-6,10,5);world.add(sun);
const camera=new T.PerspectiveCamera(36,1,.1,100);
const lakes=[createLagoon({x:-3.6,rx:3.3,rz:2.5,fishCount:24,seed:41}),
createLagoon({x:3.6,rx:3.1,rz:2.4,fishCount:24,seed:7,color:0xf49cc8,bedColor:0xe9a0c0,wallColor:0xf5bad3,shoreColor:0xffd2e9})];
const falls=[createWaterfall(-3.6,-2.4,1.1,2,{color:0x68dbe4}),createWaterfall(3.6,-2.4,1.1,2,{color:0xf49cc8})];
falls.forEach(f=>f.position.y=1.2);world.add(...lakes,...falls);
camera.position.set(9,13,18);camera.lookAt(0,0,0);
await renderer.compileAsync(world,camera);
window.check={renderer,world,camera,lakes,falls};
window.draw=(time,reduced=false)=>{lakes.forEach(l=>l.userData.update(time,reduced));falls.forEach(f=>f.userData.update(time,reduced));renderer.render(world,camera);};
draw(5);window.ready=true;`;
const bundles = new Map();
for (const root of roots) {
  const built = await build({
    stdin: { contents: scene, resolveDir: root.path, loader: "js" },
    bundle: true,
    format: "esm",
    write: false,
  });
  bundles.set("/" + root.name, built.outputFiles[0].text);
}
const server = createServer((req, res) => {
  if (req.url === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }
  const code = bundles.get(req.url);
  res.writeHead(code ? 200 : 404, { "Content-Type": "text/html" });
  res.end(code ? '<script type="module">' + code + "</script>" : "");
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const folder = resolve(
  process.env.CHICHI_WATER_REVIEW || "/tmp/chichi-water-review",
);
await mkdir(folder, { recursive: true });
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.CHICHI_CHROMIUM || undefined,
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  for (const root of roots) {
    const page = await browser.newPage({
        viewport: { width: 900, height: 700 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (e) => {
      if (e.type() === "error") errors.push(e.text());
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/${root.name}`);
    await page.waitForFunction(() => window.ready, null, { timeout: 120000 });
    for (const mode of [
      { name: "desktop", width: 900, height: 700, dpr: 1 },
      { name: "phone", width: 390, height: 560, dpr: 2 },
      { name: "swimming", width: 390, height: 560, dpr: 2, wakes: true },
    ]) {
      await page.setViewportSize({ width: mode.width, height: mode.height });
      const result = await page.evaluate(async (mode) => {
        const { renderer: r, camera: c, lakes } = check;
        r.setPixelRatio(mode.dpr);
        r.setSize(mode.width, mode.height);
        c.aspect = mode.width / mode.height;
        c.updateProjectionMatrix();
        const gl = r.getContext(),
          intervals = [],
          updates = [],
          submits = [];
        let last = performance.now();
        for (let i = 0; i < 72; i++) {
          await new Promise(requestAnimationFrame);
          const now = performance.now(),
            t = 5 + i / 30;
          if (i >= 12) intervals.push(now - last);
          last = now;
          if (mode.wakes && i % 4 === 0)
            lakes.forEach((l) =>
              l.userData.disturb(Math.sin(t) * 0.6, Math.cos(t) * 0.5, t, 1),
            );
          const start = performance.now();
          lakes.forEach((l) => l.userData.update(t));
          const elapsed = performance.now() - start;
          const submit = performance.now();
          draw(t);
          gl.finish();
          if (i >= 12) {
            updates.push(elapsed);
            submits.push(performance.now() - submit);
          }
        }
        const percentile = (a, p) =>
          a.sort((a, b) => a - b)[
            Math.min(a.length - 1, Math.floor(a.length * p))
          ];
        const stats = {
          frameMedian: percentile(intervals, 0.5),
          frameP95: percentile(intervals, 0.95),
          submitMedian: percentile(submits, 0.5),
          updateMedian: percentile(updates, 0.5),
          draws: r.info.render.calls,
          triangles: r.info.render.triangles,
          textures: r.info.memory.textures,
          canvas: [r.domElement.width, r.domElement.height],
        };
        draw(5, true);
        const frozen = r.domElement.toDataURL();
        draw(30, true);
        if (frozen !== r.domElement.toDataURL())
          throw Error("Reduced motion is not stable");
        draw(5);
        const still = r.domElement.toDataURL();
        draw(7);
        if (still === r.domElement.toDataURL())
          throw Error("Water/fish are not animated");
        if (mode.wakes) {
          // Six nearby strokes must not bleach a whole small pond white.
          for (let i = 0; i < 6; i++)
            lakes.forEach((l) =>
              l.userData.disturb(
                Math.sin(i) * 0.15,
                Math.cos(i) * 0.15,
                6.35 + i * 0.12,
                0.65,
              ),
            );
          draw(7.05);
        }
        const pixel = new Uint8Array(4);
        stats.paletteContrast = lakes.map((lake, index) => {
          let contrast = 0,
            count = 0;
          for (let x = -2; x <= 2; x++)
            for (let z = -2; z <= 2; z++) {
              const point = lake.position.clone();
              point.x += x * 0.4;
              point.z += z * 0.4;
              point.y = 0.16;
              point.project(c);
              gl.readPixels(
                Math.floor(((point.x + 1) * r.domElement.width) / 2),
                Math.floor(((point.y + 1) * r.domElement.height) / 2),
                1,
                1,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                pixel,
              );
              contrast += index ? pixel[0] - pixel[1] : pixel[2] - pixel[0];
              count++;
            }
          return contrast / count;
        });
        return stats;
      }, mode);
      assert.deepEqual(result.canvas, [
        mode.width * mode.dpr,
        mode.height * mode.dpr,
      ]);
      if (root.name === "after") {
        assert.ok(result.paletteContrast[0] > 20, "Blue lagoon washed out");
        assert.ok(
          result.paletteContrast[1] > 10,
          "Pink lagoon lost its palette",
        );
      }
      console.log(root.name, mode.name, JSON.stringify(result));
      await page.screenshot({
        path: resolve(folder, `${root.name}-${mode.name}.png`),
      });
    }
    assert.deepEqual(errors, [], "WebGL compilation or browser runtime failed");
    await page.close();
  }
  console.log(
    "Blue and pink water, underwater instances, waterfall shaders, swim wakes, reduced motion and full DPR rendered without browser errors.",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
