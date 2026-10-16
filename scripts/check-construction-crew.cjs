// Local-only rendering check; uses a disposable game, never a real cloud save.
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const { build } = require("esbuild"),
  { chromium } = require(process.env.CHICHI_PLAYWRIGHT_MODULE || "playwright");
const root = path.resolve(__dirname, ".."),
  review = process.env.CHICHI_REVIEW_DIR || "/tmp/chichi-builders-review";
fs.mkdirSync(review, { recursive: true });
(async () => {
  const code = await build({
    stdin: {
      contents: `import {createWorld} from './public/world.js';import {newGame} from './public/economy.js';
 const g=newGame();g.cat.energy=90;g.cat.hunger=10;g.cat.mood='happy';
 g.placements=[{id:'building-test',item:'swing',biome:'moon',x:0,z:0,rotation:0,startedAt:Date.now(),readyAt:Date.now()+3600000}];
 g.scenery=[];g.catPosition={biome:'moon',x:-6,z:3};window.testGame=g;window.before=JSON.stringify(g);window.world=createWorld(document.querySelector('#map'),g);`,
      resolveDir: root,
      sourcefile: "review-entry.js",
    },
    bundle: true,
    format: "esm",
    write: false,
    plugins: [
      {
        name: "review-only",
        setup(b) {
          b.onLoad({ filter: /\/public\/world\.js$/ }, () => ({
            contents: fs
              .readFileSync(root + "/public/world.js", "utf8")
              .replace(
                "  return {\n    perform,",
                "  window.qa={crew,cat,npcs,renderer,camera,chichiCarrier,itemGroups,builderHammers,islands};\n  return {\n    perform,",
              ),
            loader: "js",
          }));
        },
      },
    ],
  });
  const server = http.createServer((req, res) => {
    if (req.url === "/") {
      res.setHeader("Content-Type", "text/html");
      return res.end(
        '<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}#map{height:100vh;position:relative;overflow:hidden}canvas{display:block;width:100%;height:100%;touch-action:none}</style><div id="map"></div><script type="module" src="/review.js"></script>',
      );
    }
    if (req.url === "/review.js") {
      res.setHeader("Content-Type", "text/javascript");
      return res.end(code.outputFiles[0].contents);
    }
    const p = path.resolve(root, "public", "." + req.url.split("?")[0]);
    if (!p.startsWith(root + "/public/")) {
      res.statusCode = 403;
      return res.end();
    }
    fs.readFile(p, (e, d) => {
      res.statusCode = e ? 404 : 200;
      res.end(e ? "" : d);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
    executablePath: process.env.CHICHI_CHROMIUM || "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 430, height: 900 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      }),
      errors = [];
    page.on("pageerror", (e) => {
      errors.push(e.message);
      console.log("JS error", e.message);
    });
    page.on("console", (m) => {
      if (m.type() === "error" && !m.text().includes("404"))
        errors.push(m.text());
    });
    await page.goto("http://127.0.0.1:" + server.address().port);
    await page.waitForFunction(() => window.qa?.crew.workers.size > 0, null, {
      timeout: 120000,
    });
    console.log("World running");
    await page.waitForFunction(() => qa.crew.workers.size >= 5, null, {
      timeout: 60000,
    });
    await page.evaluate(() => {
      for (let f = 0; f < 2100; f++)
        for (const [id, n] of [
          ...qa.npcs,
          [
            "chichi",
            {
              carrier: qa.chichiCarrier,
              profile: { biome: "moon" },
              index: -1,
            },
          ],
        ]) {
          const v = qa.crew.frame(
            id,
            n.carrier.position,
            n.profile.biome,
            n.index,
            0.55,
            1 / 30,
            performance.now() / 1000 + f / 30,
          );
          if (v)
            n.carrier.position.set(v.position.x, v.position.y, v.position.z);
        }
    });
    console.log(
      await page.evaluate(() =>
        [...qa.npcs].map(([id, n]) => ({
          id,
          p: n.carrier.position.toArray(),
          needs: testGame.care.residents[id],
          index: n.index,
        })),
      ),
    );
    console.log(
      await page.evaluate(() =>
        [...qa.crew.workers].map(([id, w]) => ({
          id,
          phase: w.phase,
          p: w.position,
          slot: w.slot,
          path: w.path.length,
          blocked: w.blocked,
        })),
      ),
    );
    await page.waitForFunction(
      () =>
        [...qa.crew.workers.values()].filter((w) => w.phase === "hammer")
          .length >= 5,
      null,
      { timeout: 30000 },
    );
    await page.screenshot({ path: review + "/builders-phone.png" });
    const result = await page.evaluate(() => ({
      workers: [...qa.crew.workers].map(([id, w]) => ({
        id,
        phase: w.phase,
        site: w.site.id,
      })),
      hammers: [...qa.builderHammers].map(([id, h]) => ({
        id,
        visible: h.visible,
        bone: h.parent?.isBone,
      })),
      saveUntouched: JSON.stringify(testGame) === before,
      ratio: qa.renderer.getPixelRatio(),
      calls: qa.renderer.info.render.calls,
    }));
    assert.ok(result.saveUntouched);
    assert.ok(result.hammers.some((h) => h.visible && h.bone));
    assert.equal(result.ratio, 2);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify(result));
    await page.evaluate(() => {
      testGame.placements[0].readyAt = Date.now() - 1;
      world.sync(testGame);
    });
    await page.waitForFunction(
      () =>
        qa.crew.workers.size === 0 &&
        [...qa.builderHammers.values()].every((h) => !h.visible),
      null,
      { timeout: 20000 },
    );
    console.log(
      "PASS: actual mobile world runs/works with paw hammers, keeps saves intact and clears all helpers when construction finishes; no JS/shader errors.",
    );
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
