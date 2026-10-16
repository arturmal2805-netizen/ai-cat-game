import fs from "node:fs/promises";
import http from "node:http";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const root = fileURLToPath(new URL("../", import.meta.url)),
  variants = new Map();
for (const [name, folder] of [
  ["after", root],
  ...(process.env.CHICHI_LOADING_BASELINE
    ? [["before", process.env.CHICHI_LOADING_BASELINE]]
    : []),
]) {
  const source = await fs.readFile(folder + "/public/world.js", "utf8");
  const bundle = await build({
    stdin: {
      resolveDir: folder,
      contents: `
 import {createWorld} from './public/world.js';import {newGame} from './public/economy.js';import {BIOMES} from './public/game-data.js';
 const g=newGame();g.unlocked=BIOMES.map(b=>b.id);const start=performance.now();window.world=createWorld(document.getElementById('map'),g);window.constructMs=performance.now()-start;window.ready=true;
 window.loadIsland=async(id)=>{const start=performance.now();world.focus(id);await new Promise((resolve,reject)=>{const deadline=start+120000;const poll=()=>{if(!qa.islands.get(id).userData.lowOnly)return resolve();if(performance.now()>deadline)return reject(Error('Island not ready: '+id));setTimeout(poll,30)};poll()});const r=qa.islands.get(id),stats={meshes:0,triangles:0,instances:0};r.traverse(o=>{if(!o.isMesh)return;stats.meshes++;stats.triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;stats.instances+=o.isInstancedMesh?o.count:0;});return{id,ms:performance.now()-start,stats};};`,
    },
    bundle: true,
    format: "esm",
    write: false,
    plugins: [
      {
        name: "loading-probe",
        setup(b) {
          b.onLoad({ filter: /\/public\/world\.js$/ }, () => ({
            contents: source.replace(
              "  return {\n    perform,",
              "  window.qa={islands,renderer,camera};\n  return {\n    perform,",
            ),
            loader: "js",
          }));
        },
      },
    ],
  });
  variants.set("/" + name, bundle.outputFiles[0].text);
}
const server = http.createServer((q, r) => {
  r.setHeader("Content-Type", "text/html");
  r.end(
    '<style>body{margin:0}#map{width:390px;height:700px}canvas{display:block}</style><div id="map"></div><script type="module">' +
      variants.get(q.url) +
      "</script>",
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const results = {};
  for (const [name] of variants) {
    const page = await browser.newPage({
        viewport: { width: 390, height: 700 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    if (process.env.CHICHI_MESSAGE_CHANNEL === "1")
      await page.addInitScript(() =>
        Object.defineProperty(globalThis, "scheduler", {
          value: undefined,
          configurable: true,
        }),
      );
    await page.goto("http://127.0.0.1:" + server.address().port + name);
    await page.waitForFunction(() => window.ready, null, { timeout: 120000 });
    console.log(
      name,
      "constructor (cold)",
      await page.evaluate(() => constructMs),
    );
    const ids =
      name === "/after" && process.env.CHICHI_ALL_ISLANDS === "1"
        ? await page.evaluate(() =>
            [...qa.islands.keys()].filter((id) => id !== "moon"),
          )
        : ["summer", "beach", "winter", "clockwork", "aquapark"];
    results[name] = [];
    for (const id of ids) {
      const result = await page.evaluate((id) => loadIsland(id), id);
      results[name].push(result);
      console.log(name, result);
    }
    assert.equal(await page.evaluate(() => qa.renderer.getPixelRatio()), 2);
    assert.deepEqual(errors, []);
    await page.evaluate(() => world.dispose());
    await page.close();
  }
  if (results["/before"])
    for (const b of results["/before"]) {
      const a = results["/after"].find((a) => a.id === b.id);
      assert.deepEqual(
        a.stats,
        b.stats,
        b.id + " must retain all geometry and instances",
      );
    }
  await fs.writeFile(
    process.env.CHICHI_LOADING_RESULTS || "/tmp/chichi-world-loading.json",
    JSON.stringify(results, null, 2),
  );
  console.log(
    "Full-resolution island loading passed; timings are software Chromium, not device FPS.",
  );
} finally {
  await browser.close();
  server.close();
}
