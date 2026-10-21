// Real application/picking and private SQLite. Never reads a player world or
// spends AI credits. Run after npm run build; screenshots keep the native DPR.
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { localQAWorker } from "./local-qa-worker.mjs";
import { newGame } from "../public/economy.js";
import { ensureJobCity } from "../public/jobcity-system.js";
import { JOB_BUSINESSES } from "../public/jobcity-data.js";

const root = fileURLToPath(new URL("../", import.meta.url)),
  require = createRequire(import.meta.url),
  { webkit, chromium } = require(process.env.CHICHI_PLAYWRIGHT_MODULE || "playwright"),
  review = process.env.CHICHI_REVIEW_DIR || path.join(os.tmpdir(), "chichi-job-building-camera");
await fs.mkdir(review, { recursive: true });
let game = newGame();
game.unlocked = ["moon", "jobcity"];
game.progression.xp = 10000;
game = ensureJobCity(game);
const token = crypto.randomBytes(32).toString("hex"),
  local = await localQAWorker(root),
  headers = { "Content-Type": "application/json", "X-Chichi-Save-Token": token };
let browser;
try {
  const stored = await (await fetch(local.base + "/api/save", {
    method: "PUT", headers,
    body: JSON.stringify({ expectedRevision: 0, mutationId: crypto.randomUUID(), game }),
  })).json();
  assert.equal(stored.revision, 1);
  const output = await build({
    entryPoints: [path.join(root, "public/app.js")], bundle: true, format: "esm", write: false,
    define: { __CHICHI_SCULPT_VERSION__: JSON.stringify("job-camera-private-qa") },
    plugins: [{ name: "job-camera-private-qa", setup(b) {
      b.onLoad({ filter: /\/public\/app\.js$/ }, async () => ({ loader: "js", contents:
        (await fs.readFile(path.join(root, "public/app.js"), "utf8"))
          .replace("persist();\nrenderGame();", "window.__cityCameraSave={world,cloud};\npersist();\nrenderGame();")
          .replace("onSelectJobCity: (id) => world?.inspectJobBusiness(id)", "onSelectJobCity: (id) => { window.__selectedCityBuilding=id; return world?.inspectJobBusiness(id); }")
      }));
      b.onLoad({ filter: /\/public\/world\.js$/ }, async () => ({ loader: "js", contents:
        (await fs.readFile(path.join(root, "public/world.js"), "utf8"))
          .replace("  return {\n    perform,", `
  window.__cityCameraQA={itemGroups,camera,renderer,scene,shaderWarmup,
    settled:()=>look.distanceTo(desiredLook)<.01 && Math.abs(distance-desiredDistance)<.01,
    state:()=>({id:courtCamera?.id,elevation,azimuth,distance:desiredDistance,target:desiredLook.toArray(),roofs:[...itemGroups].filter(([,g])=>g.userData.jobBusiness).map(([id,g])=>({id,visible:g.userData.roof.visible})),dpr:renderer.getPixelRatio(),contextLost:renderer.getContext().isContextLost()}),
    prepare:id=>{focus('jobcity');const g=itemGroups.get(id);desiredLook.copy(new THREE.Box3().setFromObject(g).getCenter(new THREE.Vector3()));desiredDistance=60;azimuth=.16;elevation=.6;},
    point:id=>{const g=itemGroups.get(id),canvas=renderer.domElement,r=canvas.getBoundingClientRect();for(const x of [0,-6,6])for(const z of [0,4,-4]){const p=g.localToWorld(new THREE.Vector3(x,15,z)).project(camera),point={x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};if(document.elementFromPoint(point.x,point.y)===canvas)return point;}throw Error('Building roof is covered by phone HUD');},
    fit:id=>{const b=new THREE.Box3().setFromObject(itemGroups.get(id));camera.updateMatrixWorld();return Array.from({length:8},(_,i)=>new THREE.Vector3(i&1?b.max.x:b.min.x,i&2?b.max.y:b.min.y,i&4?b.max.z:b.min.z).project(camera).toArray());}
  };
  return {\n    perform,`)
      }));
    }}],
  });
  const safari = process.env.CHICHI_BROWSER === "webkit";
  browser = await (safari ? webkit : chromium).launch(safari
    ? { env: { ...process.env, LIBGL_ALWAYS_SOFTWARE: "1" } }
    : { executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({ viewport: process.env.CHICHI_PHONE_ONLY ? { width: 390, height: 844 } : { width: 1280, height: 900 }, deviceScaleFactor: 2, hasTouch: !!process.env.CHICHI_PHONE_ONLY, isMobile: !!process.env.CHICHI_PHONE_ONLY });
  page.setDefaultTimeout(240000);
  const errors = [], rows = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(({ game, token }) => {
    localStorage.setItem("chichi-world-v2", JSON.stringify(game));
    localStorage.setItem("chichi-recovery-code", token);
    localStorage.setItem("chichi-cloud-save", JSON.stringify({ token, revision: 1, dirty: false }));
  }, { game, token });
  await page.route("**/dist/app.js?*", r => r.fulfill({ contentType: "text/javascript", body: output.outputFiles[0].text }));
  await page.route("**/api/status", r => r.fulfill({ json: { configured: true, cloudSave: true, release: "development", protocol: "living-cat-world-v4" } }));
  for (const endpoint of ["jobcity/plan", "crypto/forecast"])
    await page.route("**/api/" + endpoint, r => r.fulfill({ status: 503, json: { error: "Private QA: no paid inference" } }));
  await page.goto(local.base);
  await page.waitForFunction(() => window.__cityCameraQA && window.__cityCameraSave?.cloud.editable);
  await page.evaluate(() => __cityCameraSave.world.focus("jobcity"));
  await page.waitForFunction(ids => ids.every(id => __cityCameraQA.itemGroups.get(id)?.userData.roof), JOB_BUSINESSES.map(b => b.id));
  for (const viewport of (process.env.CHICHI_PHONE_ONLY ? [{ width: 390, height: 844 }] : [{ width: 1280, height: 900 }, { width: 390, height: 844 }])) {
    await page.setViewportSize(viewport);
    const device = viewport.width < 500 ? "phone" : "desktop";
    for (const business of JOB_BUSINESSES.filter(b => !process.env.CHICHI_JOB_CAMERA_IDS || process.env.CHICHI_JOB_CAMERA_IDS.split(",").includes(b.id))) {
      await page.evaluate(id => { window.__selectedCityBuilding = null; __cityCameraQA.prepare(id); }, business.id);
      await page.waitForFunction(() => __cityCameraQA.settled() && __cityCameraQA.shaderWarmup.idle());
      const point = await page.evaluate(id => __cityCameraQA.point(id), business.id);
      if (process.env.CHICHI_PHONE_ONLY) await page.touchscreen.tap(point.x, point.y);
      else await page.mouse.click(point.x, point.y);
      await page.waitForFunction(id => window.__selectedCityBuilding === id && __cityCameraQA.state().id === id, business.id);
      await page.waitForFunction(() => __cityCameraQA.settled());
      const state = await page.evaluate(() => __cityCameraQA.state()),
        corners = await page.evaluate(id => __cityCameraQA.fit(id), business.id);
      assert.equal(state.elevation, .38);
      assert.equal(state.dpr, 2);
      assert.equal(state.contextLost, false);
      assert.ok(state.roofs.every(r => r.visible === (r.id !== business.id)));
      assert.ok(corners.every(([x,y,z]) => Math.abs(x)<.85 && Math.abs(y)<.81 && z>0 && z<1), business.id + ": fitted viewport");
      assert.equal(await page.locator("#jobcity-dialog").evaluate(el => el.open), false);
      await page.screenshot({ path: path.join(review, device + "-" + business.id + ".png") });
      await page.getByRole("button", { name: "← Вернуться на остров", exact: true }).click();
      await page.waitForFunction(() => __cityCameraQA.settled());
      const restored = await page.evaluate(() => __cityCameraQA.state());
      assert.equal(restored.id, undefined);
      assert.ok(restored.roofs.every(r => r.visible));
      rows.push({ device, id: business.id, state, restored });
      await fs.writeFile(path.join(review, "result.json"), JSON.stringify({ rows, errors }, null, 2));
      console.log("CITY_CAMERA", device, business.id, "real click, fit, roof and exit passed");
    }
  }
  // A destination change must restore a hidden roof too, without using Exit.
  await page.evaluate(() => { __cityCameraSave.world.inspectJobBusiness("job-bank"); __cityCameraSave.world.inspectJobBusiness("job-crypto"); });
  assert.ok((await page.evaluate(() => __cityCameraQA.state().roofs)).every(r => r.visible === (r.id !== "job-crypto")));
  await page.evaluate(() => __cityCameraSave.world.focus("moon"));
  assert.ok((await page.evaluate(() => __cityCameraQA.state().roofs)).every(r => r.visible));
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(review, "result.json"), JSON.stringify({ rows, switching: true, errors }, null, 2));
} finally {
  await browser?.close();
  local.stop();
}
