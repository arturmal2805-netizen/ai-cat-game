// Optional browser/SQLite integration check. No production save or AI key is used.
const fs = require("node:fs"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto"),
  path = require("node:path"),
  os = require("node:os"),
  net = require("node:net"),
  { spawn } = require("node:child_process");
const { chromium } = require(
  process.env.CHICHI_PLAYWRIGHT_MODULE || "playwright",
);
const capture = process.env.CHICHI_MOSA_CAPTURE !== "0";
const root = path.resolve(__dirname, ".."),
  review =
    process.env.CHICHI_REVIEW_DIR ||
    path.join(os.tmpdir(), "chichi-chill-review");
fs.mkdirSync(review, { recursive: true });
async function localWorker() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "chichi-chill-"));
  const socket = net.createServer();
  await new Promise((r) => socket.listen(0, "127.0.0.1", r));
  const port = socket.address().port;
  await new Promise((r) => socket.close(r));
  const config = path.join(temp, "wrangler.json"),
    log = fs.openSync(path.join(temp, "worker.log"), "w");
  fs.writeFileSync(
    config,
    JSON.stringify({
      name: "chichi-chill-local",
      main: path.join(root, ".generated/worker.mjs"),
      compatibility_date: "2026-10-13",
      assets: {
        directory: path.join(root, "public"),
        binding: "ASSETS",
        run_worker_first: ["/api/*"],
      },
      durable_objects: {
        bindings: [{ name: "SAVE_VAULT", class_name: "SaveVault" }],
      },
      migrations: [{ tag: "save-vault-v1", new_sqlite_classes: ["SaveVault"] }],
      vars: { GAME_RELEASE: "development" },
    }),
  );
  const localEnv = { ...process.env };
  for (const key of [
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "ALL_PROXY",
    "http_proxy",
    "https_proxy",
    "all_proxy",
  ])
    delete localEnv[key];
  localEnv.NO_PROXY = "127.0.0.1,localhost";
  localEnv.CLOUDFLARE_SEND_METRICS = "false";
  const child = spawn(
    path.join(root, "node_modules/.bin/wrangler"),
    [
      "dev",
      "--local",
      "--config",
      config,
      "--persist-to",
      path.join(temp, "sqlite"),
      "--port",
      String(port),
      "--inspector-port",
      "0",
    ],
    {
      cwd: root,
      detached: true,
      env: {
        ...localEnv,
        WRANGLER_LOG_PATH: path.join(temp, "wrangler.log"),
      },
      stdio: ["ignore", log, log],
    },
  );
  const stop = () => {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
    fs.closeSync(log);
  };
  const base = "http://127.0.0.1:" + port;
  for (let i = 0; i < 150; i++) {
    try {
      if ((await fetch(base + "/api/status")).ok)
        return { base, stop, logPath: path.join(temp, "worker.log") };
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  stop();
  throw Error(
    "Local Worker startup failed. Log: " + path.join(temp, "worker.log"),
  );
}
(async () => {
  const local = await localWorker();
  let browser;
  try {
    const { build } = require(root + "/node_modules/esbuild"),
      { newGame, loadGame } = await import(root + "/public/economy.js"),
      { xpForLevel, gameDay } = await import(root + "/public/progression.js");
    const now = Date.now(),
      g = newGame(now);
    g.unlocked.push("homestead");
    g.placements.push({
      id: "player-adoption-center",
      item: "adoption-center",
      biome: "homestead",
      x: -20,
      z: -20,
      rotation: 0,
      readyAt: 0,
    });
    g.progression.xp = xpForLevel(20);
    g.lastVisit = gameDay(now);
    g.progression.lastVisitDay = gameDay(now);
    g.coins = 1000000;
    g.catPosition = { biome: "homestead", x: 0, z: 0 };
    g.catDestinations = {};
    g.cat.energy = 95;
    g.cat.hunger = 5;
    g.cat.happiness = 95;
    const base = local.base,
      token = crypto.randomBytes(32).toString("hex"),
      headers = {
        "Content-Type": "application/json",
        "X-Chichi-Save-Token": token,
      };
    const seed = await (
      await fetch(base + "/api/save", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          expectedRevision: 0,
          mutationId: crypto.randomUUID(),
          game: loadGame(
            {
              getItem: (k) =>
                k === "chichi-world-v2" ? JSON.stringify(g) : null,
            },
            now,
            { advance: false },
          ),
        }),
      })
    ).json();
    assert.equal(seed.revision, 1);
    const normalizedSeed = await (
      await fetch(base + "/api/save", { headers })
    ).json();
    const output = await build({
      entryPoints: [root + "/public/app.js"],
      bundle: true,
      format: "esm",
      write: false,
      plugins: [
        {
          name: "qa",
          setup(b) {
            b.onLoad({ filter: /\/public\/world\.js$/ }, () => {
              const source = fs.readFileSync(root + "/public/world.js", "utf8"),
                marker = "  return {\n    perform,";
              assert.ok(source.includes(marker));
              return {
                contents: source
                  .replace(
                    "    const time = now / 1000;",
                    "    if(window.__lagoonQA?.pinnedRide !== undefined && operation?.stage === 'activity') operation.activityStart=now-window.__lagoonQA.pinnedRide*1000;\n    const time = now / 1000;",
                  )
                  .replace(
                    "  const reduced =",
                    "  const qaStart=performance.now();\n  const reduced =",
                  )
                  .replace(
                    marker,
                    `  const qa=window.__lagoonQA={camera,look,desiredLook,renderer,islands,cat,npcs,chichiCarrier,itemGroups,THREE,scene,pickDrop,pointer,raycaster,ground,viewport,perform,performResident,faceCamera,spa,chill,court,cinema,courtFoods,bikiniLife,enterCourt,exitCourt,getCourtCamera:()=>courtCamera,residentPlay,callbacks,getDragging:()=>draggingCat?.catId,reviewView:(x,z,d)=>{desiredLook.set(x,0,z);desiredDistance=d;azimuth=.15;},constructorMs:performance.now()-qaStart,focused:()=>focused,getOperation:()=>operation,isVisible:()=>worldVisible,getDistance:()=>distance,getDesiredDistance:()=>desiredDistance,frames:0,resizes:0,black:[],audit:false};
  const draw=renderer.render.bind(renderer);renderer.render=(...args)=>{if(qa.drawPaused)return;draw(...args);qa.frames++;};
  const size=renderer.setSize.bind(renderer);renderer.setSize=(...args)=>{qa.resizes++;return size(...args);};
  const audit=new MutationObserver(()=>{if(!qa.audit)return;const gl=renderer.getContext(),p=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);if(p[0]+p[1]+p[2]===0)qa.black.push(Array.from(p));});audit.observe(renderer.domElement,{attributes:true,attributeFilter:['width','height']});
  return {\n    perform,`,
                  ),
                loader: "js",
              };
            });
            b.onLoad({ filter: /\/public\/app\.js$/ }, () => ({
              contents: (
                "import {storeSculptCache as qaStoreGraphics} from './sculpt-cache.js';\n" +
                fs.readFileSync(root + "/public/app.js", "utf8")
              )
                .replace(
                  "await restoreSculptCache();",
                  "window.__graphicsRestored=await restoreSculptCache();window.__storeGraphics=qaStoreGraphics;",
                )
                .replace(
                  "persist();\nrenderGame();",
                  "window.__expansionActions={purchase,placeItem};window.__lagoonSaveQA={cloud,getGame:()=>game,commit};\npersist();\nrenderGame();",
                ),
              loader: "js",
            }));
          },
        },
      ],
    });

    browser = await chromium.launch({
      executablePath: process.env.CHICHI_CHROMIUM || undefined,
      args: [
        "--no-sandbox",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(120000);
    const errors = [],
      httpErrors = [];
    page.on("response", (r) => {
      if (r.status() >= 400)
        httpErrors.push({
          path: new URL(r.url()).pathname,
          status: r.status(),
        });
    });
    page.on("pageerror", (e) => {
      errors.push(e.message);
      console.log("PAGE ERROR", e.message);
    });
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.addInitScript(
      ({ g, token }) => {
        if (!localStorage.getItem("chichi-world-v2")) {
          localStorage.setItem("chichi-world-v2", JSON.stringify(g));
          localStorage.setItem("chichi-recovery-code", token);
          localStorage.setItem(
            "chichi-cloud-save",
            JSON.stringify({ token, revision: 1, dirty: false }),
          );
        }
      },
      { g: normalizedSeed.game, token },
    );
    await page.route("**/dist/app.js?*", (r) =>
      r.fulfill({
        contentType: "text/javascript",
        body: output.outputFiles[0].text,
      }),
    );
    await page.route("**/api/status", (r) =>
      r.fulfill({
        json: {
          configured: true,
          cloudSave: true,
          revision: "development",
          protocol: "living-cat-world-v4",
        },
      }),
    );
    await page.goto(base);
    await page.waitForFunction(
      () => window.__lagoonQA && window.__lagoonSaveQA?.cloud.editable,
    );

    await page.locator('[data-biome="homestead"]').tap();
    await page.waitForFunction(
      () =>
        __lagoonQA.islands.get("homestead") &&
        !__lagoonQA.islands.get("homestead").userData.lowOnly,
    );
    const before = await page.evaluate(() => {
      const q = __lagoonQA;
      const b = __lagoonSaveQA.getGame();
      q.reviewView(-250, -55, 140);
      return {
        scenery: b.scenery.filter((s) => s.biome === "homestead").length,
        empty: q.islands.get("homestead").userData.emptyPlot,
      };
    });
    assert.deepEqual(before, { scenery: 0, empty: true });
    await page.waitForFunction(
      () => Math.abs(__lagoonQA.getDistance() - 140) < 0.3,
    );
    await page.screenshot({
      path: path.join(review, "empty-island-phone.png"),
    });
    await page.evaluate(() => {
      __lagoonQA.drawPaused = true;
    });
    await page.locator("#adoption-open").tap();
    await page.waitForFunction(
      () =>
        document.querySelectorAll("#adoption-grid [data-adopt]").length === 95,
    );
    assert.equal(await page.locator("#adoption-grid img").count(), 95);
    assert.equal(
      await page.locator("#adoption-grid img.portrait-loading").count(),
      0,
    );
    await page.locator("#adoption-filter").selectOption("tiny");
    assert.equal(await page.locator("#adoption-grid [data-adopt]").count(), 32);
    const ids = [
      "adopt-crumb",
      "adopt-dumpling",
      "adopt-pebble",
      "adopt-magic-fairy-tiny",
      "adopt-magic-dragon-tiny",
      "adopt-magic-moon",
      "adopt-mountainbun",
    ];
    for (const id of ids) {
      await page.locator("#adoption-filter").selectOption("all");
      await page.locator('[data-adopt="' + id + '"]').tap();
      await page.waitForFunction(
        (id) => __lagoonSaveQA.getGame().adoption.cats.some((c) => c.id === id),
        id,
      );
      await page.waitForFunction((id) => __lagoonQA.npcs.has(id), id);
    }
    await page.locator("#adoption-filter").selectOption("magic");
    assert.equal(await page.locator("#adoption-grid [data-adopt]").count(), 24);
    await page.waitForFunction(() =>
      [...document.querySelectorAll("#adoption-grid img")]
        .slice(0, 4)
        .every((img) => img.complete && img.naturalWidth > 0),
    );
    await page.screenshot({
      path: path.join(review, "legendary-adoption-phone.png"),
    });
    await page.locator("#adoption-filter").selectOption("new-breeds");
    assert.equal(await page.locator("#adoption-grid [data-adopt]").count(), 16);
    await page.locator('[data-close="adoption-dialog"]').tap();
    const models = await page.evaluate(
      (ids) =>
        ids.map((id) => {
          const n = __lagoonQA.npcs.get(id);
          return {
            id,
            scale: n.model.scale.x,
            magic: n.model.userData.magic?.kind || null,
            breed: n.model.userData.appearance.breed,
          };
        }),
      ids,
    );
    for (const m of models.filter(
      (m) => !["adopt-magic-moon", "adopt-mountainbun"].includes(m.id),
    ))
      assert.equal(m.scale, 0.36);
    assert.equal(
      models.find((m) => m.id === "adopt-magic-fairy-tiny").magic,
      "fairy",
    );
    await page.evaluate(() => {
      const qa = __lagoonSaveQA;
      let g = qa.getGame();
      for (const [x, z] of [
        [30, 0],
        [-30, 0],
        [0, 30],
        [0, -30],
      ])
        g = __expansionActions.placeItem(
          __expansionActions.purchase(g, "business-hotdog"),
          "business-hotdog",
          "homestead",
          x,
          z,
          0,
        );
      qa.commit(g);
      __lagoonQA.drawPaused = false;
    });
    await page.waitForFunction(
      () =>
        [...__lagoonQA.itemGroups.values()].filter(
          (g) => g.userData.placement?.biome === "homestead",
        ).length >= 5,
    );
    await page.screenshot({
      path: path.join(review, "player-building-phone.png"),
    });
    await page.evaluate(() => {
      __lagoonQA.drawPaused = true;
    });
    await page.waitForFunction(
      () =>
        !__lagoonSaveQA.cloud.pending &&
        !__lagoonSaveQA.cloud.retryEntry &&
        !__lagoonSaveQA.cloud.dirty,
    );
    const expected = await page.evaluate(() => {
      const g = __lagoonSaveQA.getGame();
      return {
        coins: g.coins,
        xp: g.progression.xp,
        cats: g.adoption,
        placements: g.placements,
        destinations: g.catDestinations,
      };
    });
    const remote = await (await fetch(base + "/api/save", { headers })).json();
    assert.equal(remote.game.coins, expected.coins);
    assert.equal(remote.game.progression.xp, expected.xp);
    assert.deepEqual(remote.game.adoption, expected.cats);
    assert.deepEqual(remote.game.placements, expected.placements);
    await page.reload();
    await page.waitForFunction(
      () =>
        window.__lagoonSaveQA?.cloud.editable &&
        __lagoonQA.npcs.has("adopt-magic-fairy-tiny"),
    );
    const restored = await page.evaluate(() => {
      __lagoonQA.drawPaused = true;
      const g = __lagoonSaveQA.getGame();
      return {
        coins: g.coins,
        xp: g.progression.xp,
        cats: g.adoption,
        placements: g.placements,
        destinations: g.catDestinations,
      };
    });
    assert.deepEqual(restored, expected);
    console.log(
      "PASS: mobile filters, 95 cached portraits, 7 real adoptions, exact tiny scale, magical rigs, 4 outer-area builds and exact cloud reload.",
    );
    const transport = fs.readFileSync(local.logPath, "utf8"),
      recovered = httpErrors.filter(
        (e) => e.path === "/api/save" && e.status === 500,
      );
    if (recovered.length) {
      assert.equal(
        recovered.length,
        (transport.match(/Error inside ProxyWorker/g) || []).length,
      );
      assert.ok(transport.includes("Network connection lost"));
    }
    assert.ok(
      httpErrors.every((e) => e.path === "/api/save" && e.status === 500),
    );
    assert.deepEqual(
      errors.filter((e) => !(recovered.length && e.includes("status of 500"))),
      [],
    );
    console.log(
      "PASS: empty plot and expanded adoption have no browser/rendering errors.",
    );
  } catch (error) {
    console.error("Homestead adoption browser check failed", error);
    throw error;
  } finally {
    await browser?.close();
    local.stop();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
