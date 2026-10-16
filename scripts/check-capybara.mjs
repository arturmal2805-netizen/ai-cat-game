import fs from "node:fs/promises";
import http from "node:http";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const root = fileURLToPath(new URL("../", import.meta.url)),
  folder = process.env.CHICHI_CAPYBARA_REVIEW || "/tmp/chichi-capybara-review";
await fs.mkdir(folder, { recursive: true });
const bundle = await build({
  stdin: {
    resolveDir: root,
    contents: `
import * as T from 'three';
import {byBiome} from './public/game-data.js';
import {createBiomeScene,disposeBiome} from './public/biome-scenes.js';
import {createCapybara} from './public/capybara-model.js';
import {capybaraRide} from './public/capybara-rides.js';
const renderer=new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
renderer.setSize(1200,950);renderer.setClearColor(0xaebcdb);renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
document.body.append(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(37,1200/950,.5,200);
scene.add(new T.HemisphereLight(0xe8f7ff,0x858e64,1.8));
const sun=new T.DirectionalLight(0xfff0ce,3);sun.position.set(-20,45,20);sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-28,right:28,top:28,bottom:-28});scene.add(sun);
let object;
window.qa={renderer,scene,camera};
window.view=async(kind)=>{
 if(object){scene.remove(object);disposeBiome(object)}
 if(kind==='island'){
   object=createBiomeScene(byBiome('summer'),{preview:true});camera.position.set(43,37,49);camera.lookAt(0,.5,0);
 }else{
   object=kind==='animal'?createCapybara({saddle:true,flower:true}):capybaraRide(kind);
   camera.position.set(-4.6,3.1,6.4);camera.lookAt(0,1,.3);
 }
 scene.add(object);window.qa.object=object;object.userData.update?.(3.2);await renderer.compileAsync(scene,camera);renderer.render(scene,camera);
 return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,fish:object.userData.stats?.fishCount,fallCount:object.userData.capybara?.waterfalls.length,crowd:object.userData.capybara?.crowd.length};
};
window.draw=(time)=>{object.userData.update?.(time);const start=performance.now();renderer.render(scene,camera);renderer.getContext().finish();return performance.now()-start};
window.ready=true;`,
  },
  bundle: true,
  format: "esm",
  write: false,
});
const server = http.createServer((req, res) => {
  if (req.url === "/app.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(bundle.outputFiles[0].contents);
  } else {
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<style>body{margin:0}canvas{display:block}</style><script type="module" src="/app.js"></script>',
    );
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const page = await browser.newPage({
      viewport: { width: 1200, height: 950 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.ready);
  const stats = await page.evaluate(() => view("island"));
  console.log("Complete preview scene", stats);
  assert.equal(stats.fallCount, 10);
  assert.ok(stats.crowd >= 15);
  assert.equal(stats.fish, 48);
  await page.screenshot({ path: folder + "/lagoon.png" });
  await page.evaluate(() => {
    qa.camera.position.set(-37, 35, 49);
    qa.camera.lookAt(0, 0.5, 0);
    draw(5);
  });
  await page.screenshot({ path: folder + "/lagoon-reverse.png" });
  for (const kind of ["animal", "ride-capybara-mango", "ride-capybara-float"]) {
    console.log(kind, await page.evaluate((kind) => view(kind), kind));
    await page.screenshot({ path: folder + "/" + kind + ".png" });
  }
  await page.evaluate(async () => {
    await view("island");
    qa.renderer.setPixelRatio(2);
    qa.renderer.setSize(390, 700);
    qa.camera.aspect = 390 / 700;
    qa.camera.updateProjectionMatrix();
    qa.camera.position.set(37, 42, 60);
    qa.camera.lookAt(0, 1, 0);
    draw(4);
  });
  await page.setViewportSize({ width: 390, height: 700 });
  await page.screenshot({ path: folder + "/phone-lagoon.png" });
  const times = [];
  for (let i = 0; i < 12; i++)
    times.push(await page.evaluate((t) => draw(t), i * 0.2));
  times.sort((a, b) => a - b);
  console.log("390×700, full DPR2, software Chromium only", {
    median: times[6],
    p95: times[11],
    canvas: await page.evaluate(() => [
      qa.renderer.domElement.width,
      qa.renderer.domElement.height,
    ]),
  });
  assert.ok(stats.calls < 350, "Lagoon draw-call budget");
  assert.ok(stats.triangles < 2100000, "Lagoon geometry budget");
  assert.deepEqual(errors, []);
  console.log("Lagoon and capybara renders passed without shader errors.");
} finally {
  await browser.close();
  server.close();
}
