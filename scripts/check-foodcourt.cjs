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
    g.unlocked.push("foodcourt");
    g.progression.xp = xpForLevel(8);
    g.lastVisit = gameDay(now);
    g.progression.lastVisitDay = gameDay(now);
    g.coins = 19000;
    g.catPosition = { biome: "foodcourt", x: 0, z: 27 };
    g.catDestinations = { luna: "foodcourt", moti: "foodcourt" };
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
                    `  const qa=window.__lagoonQA={camera,look,desiredLook,renderer,islands,cat,npcs,chichiCarrier,itemGroups,THREE,scene,pickDrop,pointer,raycaster,ground,viewport,perform,performResident,faceCamera,spa,chill,court,cinema,courtFoods,enterCourt,exitCourt,getCourtCamera:()=>courtCamera,residentPlay,callbacks,getDragging:()=>draggingCat?.catId,reviewView:(x,z,d)=>{desiredLook.set(x,0,z);desiredDistance=d;azimuth=.15;},constructorMs:performance.now()-qaStart,focused:()=>focused,getOperation:()=>operation,isVisible:()=>worldVisible,getDistance:()=>distance,getDesiredDistance:()=>desiredDistance,frames:0,resizes:0,black:[],audit:false};
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
                  "window.__lagoonSaveQA={cloud,getGame:()=>game,commit};\npersist();\nrenderGame();",
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
    await page.locator('[data-biome="foodcourt"]').tap();
    await page.waitForFunction(
      () =>
        __lagoonQA.itemGroups.get("court-coffee")?.userData.built &&
        __lagoonQA.itemGroups.get("court-cinema")?.userData.built &&
        !__lagoonQA.islands.get("foodcourt").userData.lowOnly,
    );
    await page.evaluate(() => {
      const q = __lagoonQA;
      q.drawPaused = true;
      q.court.clear();
      for (const n of q.npcs.values()) n.manualUntil = performance.now() + 1e7;
      q.reviewView(-172, 70, 44);
    });
    await page.waitForFunction(
      () => Math.abs(__lagoonQA.getDistance() - 44) < 0.3,
    );
    console.log(
      "Initialized mobile food court",
      await page.evaluate(() => ({
        constructorMs: __lagoonQA.constructorMs,
        models: [...__lagoonQA.itemGroups.keys()].filter((id) =>
          id.startsWith("court-"),
        ),
      })),
    );
    async function tapVenue(id) {
      const p = await page.evaluate((id) => {
        const q = __lagoonQA,
          g = q.itemGroups.get(id);
        q.scene.updateMatrixWorld(true);
        q.camera.updateMatrixWorld(true);
        const p = g.position.clone();
        p.y += 2.3;
        p.z += 5.1;
        const v = p.project(q.camera),
          r = q.renderer.domElement.getBoundingClientRect();
        return {
          x: r.left + ((v.x + 1) * r.width) / 2,
          y: r.top + ((1 - v.y) * r.height) / 2,
        };
      }, id);
      console.log("Physical tap", id, p);
      await page.touchscreen.tap(p.x, p.y);
      console.log(
        "Touch result",
        await page.evaluate(() => ({
          open: [...document.querySelectorAll("dialog[open]")].map((d) => d.id),
          focused: __lagoonQA.focused(),
          drag: __lagoonQA.getDragging(),
        })),
      );
    }
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll(".island-build-badge")].filter((b) =>
          b.textContent.includes("Построить"),
        ).length === 3,
    );
    // A real physical blueprint tap, normal payment and immediate private save.
    await tapVenue("court-burger");
    await page.screenshot({
      path: path.join(review, "construction-tap-phone.png"),
    });
    await page.waitForFunction(
      () => document.querySelector("#item-dialog").open,
    );
    assert.ok(
      (await page.locator("#item-name").textContent()).includes("McDonald"),
    );
    await page.locator("#spa-bar-actions button").tap();
    await page.waitForFunction(
      () => !!__lagoonSaveQA.getGame().islandConstruction["court-burger"],
    );
    const paid = await page.evaluate(() => ({
      coins: __lagoonSaveQA.getGame().coins,
      start: __lagoonSaveQA.getGame().islandConstruction["court-burger"],
    }));
    assert.ok(paid.start > 0);
    console.log("Paid construction via real touch", paid);
    assert.equal(
      await page.evaluate(
        () => __lagoonQA.itemGroups.get("court-burger").userData.unstarted,
      ),
      false,
    );
    // Advance only the private test world's construction clock (not a player world).
    await page.evaluate(() => {
      const q = __lagoonSaveQA,
        g = structuredClone(q.getGame());
      for (const id of ["court-burger", "court-boba", "court-bakery"])
        g.islandConstruction[id] = Date.now() - 101 * 60000;
      q.commit(g);
    });
    await page.waitForFunction(() =>
      ["court-burger", "court-boba", "court-bakery"].every(
        (id) => __lagoonQA.itemGroups.get(id)?.userData.built,
      ),
    );
    for (const id of [
      "court-burger",
      "court-boba",
      "court-coffee",
      "court-bakery",
      "court-cinema",
    ]) {
      await page.evaluate((id) => __lagoonQA.enterCourt(id), id);
      await page.waitForFunction(
        (id) => __lagoonQA.getCourtCamera()?.id === id,
        id,
      );
      if (id !== "court-cinema")
        assert.equal(
          await page.evaluate(
            (id) => __lagoonQA.itemGroups.get(id).userData.roof.visible,
            id,
          ),
          false,
        );
      await page.locator(".court-camera-exit:not(.court-order)").tap();
      assert.equal(
        await page.evaluate(() => __lagoonQA.getCourtCamera()),
        null,
      );
      if (id !== "court-cinema")
        assert.equal(
          await page.evaluate(
            (id) => __lagoonQA.itemGroups.get(id).userData.roof.visible,
            id,
          ),
          true,
        );
    }
    console.log(
      "All five interiors enter and restore roofs/cameras on a mobile viewport.",
    );
    await page.evaluate(() => {
      const q = __lagoonQA;
      q.enterCourt("court-coffee");
      q.drawPaused = false;
    });
    await page.waitForTimeout(1400);
    assert.equal(
      await page.locator('[data-income="court-coffee"]').isVisible(),
      false,
    );
    await page.screenshot({
      path: path.join(review, "coffee-interior-phone.png"),
    });
    await page.evaluate(() => (__lagoonQA.drawPaused = true));
    await page.evaluate(() => __lagoonQA.court.clear());
    await page.locator(".court-order").tap();
    console.log(
      "Order tap",
      await page.evaluate(() => ({
        op: __lagoonQA.getOperation()?.stage,
        visit: __lagoonQA.court.get("chichi")?.phase,
        camera: __lagoonQA.getCourtCamera()?.id,
        bubble: document.querySelector("#bubble").textContent,
        cloud: __lagoonSaveQA.cloud.conflict,
      })),
    );
    await page.waitForFunction(() => __lagoonQA.court.get("chichi"));
    const phases = new Set(),
      captured = new Set();
    for (let i = 0; i < 250; i++) {
      const state = await page.evaluate(() => {
        const q = __lagoonQA;
        for (let j = 0; j < 30; j++)
          q.court.step(1 / 30, performance.now() / 1000);
        const v = q.court.get("chichi");
        return v ? { phase: v.phase, holding: v.holding } : null;
      });
      if (!state) break;
      phases.add(state.phase);
      if (
        (state.phase === "prepare" || state.phase === "consume") &&
        !captured.has(state.phase)
      ) {
        captured.add(state.phase);
        await page.evaluate(() => (__lagoonQA.drawPaused = false));
        await page.waitForTimeout(150);
        await page.screenshot({
          path: path.join(review, "coffee-" + state.phase + "-phone.png"),
        });
        await page.evaluate(() => (__lagoonQA.drawPaused = true));
      }
    }
    await page.waitForFunction(() => !__lagoonQA.getOperation());
    assert.ok(phases.has("prepare"));
    assert.ok(phases.has("consume"));
    assert.ok(
      await page.evaluate(() =>
        __lagoonSaveQA
          .getGame()
          .spa.receipts.some((id) => id.startsWith("court-")),
      ),
    );
    console.log(
      "Chichi orders, receives a physical cup, drinks, leaves and saves her visit",
      [...phases],
    );
    const resident = await page.evaluate(() => {
      const q = __lagoonQA,
        id = [...q.npcs].find(([, n]) => n.profile.biome === "foodcourt")[0];
      q.court.clear();
      return {
        id,
        started: q.performResident(id, {
          mood: "happy",
          thought: "Попробую бабл-ти!",
          action: "eat",
          activityId: "court-boba",
          target: "picnic",
        }),
      };
    });
    assert.ok(resident.started);
    for (let i = 0; i < 220; i++) {
      const alive = await page.evaluate((id) => {
        for (let j = 0; j < 30; j++)
          __lagoonQA.court.step(1 / 30, performance.now() / 1000);
        return !!__lagoonQA.court.get(id);
      }, resident.id);
      if (!alive) break;
    }
    assert.equal(
      await page.evaluate((id) => !!__lagoonQA.court.get(id), resident.id),
      false,
    );
    console.log("Resident orders and drinks bubble tea", resident.id);
    // The actual VideoTexture is exercised using a private test clip. It is
    // never shipped or represented as a supplied SpongeBob episode.
    await page.evaluate(() => __lagoonQA.enterCourt("court-cinema"));
    const clip = fs.readFileSync(
      process.env.CHICHI_TEST_VIDEO || "/tmp/court-video-test.mp4",
    );
    await page.route("**/test-video.mp4", (r) =>
      r.fulfill({ contentType: "video/mp4", body: clip }),
    );
    await page.evaluate(
      (base) =>
        __lagoonQA.cinema.load(
          base + "/test-video.mp4",
          "Private decoder test",
        ),
      base,
    );
    await page.waitForFunction(() => __lagoonQA.cinema.video.readyState >= 2);
    await page.locator(".court-cinema-controls button").first().tap();
    await page.waitForTimeout(1100);
    const first = await page.evaluate(() => ({
      time: __lagoonQA.cinema.video.currentTime,
      version:
        __lagoonQA.itemGroups.get("court-cinema").userData.videoSurface.material
          .map.version,
    }));
    assert.ok(first.time > 0.1);
    await page.evaluate(() => (__lagoonQA.drawPaused = false));
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(review, "cinema-video-phone.png"),
    });
    await page.locator(".court-cinema-controls button").first().tap();
    const paused = await page.evaluate(
      () => __lagoonQA.cinema.video.currentTime,
    );
    await page.waitForTimeout(400);
    assert.ok(
      Math.abs(
        (await page.evaluate(() => __lagoonQA.cinema.video.currentTime)) -
          paused,
      ) < 0.08,
    );
    await page.evaluate(() => {
      __lagoonQA.drawPaused = true;
      __lagoonQA.exitCourt();
    });
    console.log(
      "VideoTexture playback, decoding, pause and exit verified",
      first,
    );
    await page.evaluate(() => {
      const q = __lagoonQA;
      q.reviewView(-155, 80, 118);
      q.drawPaused = false;
    });
    await page.waitForTimeout(1400);
    await page.screenshot({
      path: path.join(review, "whole-foodcourt-phone.png"),
    });
    await page.evaluate(() => (__lagoonQA.drawPaused = true));
    await page.waitForFunction(
      () =>
        !__lagoonSaveQA.cloud.pending &&
        !__lagoonSaveQA.cloud.retryEntry &&
        !__lagoonSaveQA.cloud.dirty,
    );
    const remote = await (await fetch(base + "/api/save", { headers })).json(),
      current = await page.evaluate(() => __lagoonSaveQA.getGame());
    assert.equal(remote.game.coins, current.coins);
    assert.equal(remote.game.progression.xp, current.progression.xp);
    assert.deepEqual(
      remote.game.islandConstruction,
      current.islandConstruction,
    );
    assert.ok(remote.game.spa.receipts.some((id) => id.startsWith("court-")));
    console.log(
      "Private cloud retains exact coins, XP, construction and completed visits",
      remote.revision,
    );
    fs.writeFileSync(
      path.join(review, "errors.json"),
      JSON.stringify(errors, null, 2),
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
      console.log(
        "Private dev proxy recovered; exact saved state verified",
        recovered.length,
      );
    }
    assert.ok(
      httpErrors.every((e) => e.path === "/api/save" && e.status === 500),
    );
    assert.deepEqual(
      errors.filter((e) => !(recovered.length && e.includes("status of 500"))),
      [],
    );
    console.log(
      "PASS: physical construction, five interiors, food preparation/consumption, actual video and private cloud persistence.",
    );
  } catch (error) {
    console.error("Food-court browser failure", error);
    throw error;
  } finally {
    await browser?.close();
    local.stop();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
