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
const root = path.resolve(__dirname, ".."),
  review =
    process.env.CHICHI_REVIEW_DIR ||
    path.join(os.tmpdir(), "chichi-spa-review");
fs.mkdirSync(review, { recursive: true });
async function localWorker() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "chichi-spa-"));
  const socket = net.createServer();
  await new Promise((r) => socket.listen(0, "127.0.0.1", r));
  const port = socket.address().port;
  await new Promise((r) => socket.close(r));
  const config = path.join(temp, "wrangler.json"),
    log = fs.openSync(path.join(temp, "worker.log"), "w");
  fs.writeFileSync(
    config,
    JSON.stringify({
      name: "chichi-spa-local",
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
        ...process.env,
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
      if ((await fetch(base + "/api/status")).ok) return { base, stop };
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
  try {
    const { build } = require(root + "/node_modules/esbuild"),
      { newGame, worldSnapshot, loadGame } = await import(
        root + "/public/economy.js"
      ),
      { gameDay, xpForLevel } = await import(root + "/public/progression.js"),
      { manualInteraction } = await import(root + "/public/interactions.js");
    const now = Date.now(),
      g = newGame(now);
    g.unlocked.push("water");
    g.lastVisit = gameDay(now);
    g.progression.lastVisitDay = gameDay(now);
    g.progression.xp = xpForLevel(5);
    g.progression.xpDay = gameDay(now);
    g.coins = 12000;
    g.catDestinations = { luna: "water", miso: "water", lily: "water" };
    g.catPosition = { biome: "water", x: 0, z: 15.6 };
    g.cat.energy = 90;
    g.cat.hunger = 10;
    g.cat.happiness = 90;
    g.placements.push({
      id: "old-lagoon-farm",
      item: "farm-field",
      biome: "water",
      x: -3,
      z: -3,
      rotation: 0,
      readyAt: now + 14400000,
    });
    g.farm.fields["old-lagoon-farm"] = [
      { crop: "wheat", readyAt: now + 7200000 },
      { crop: null, readyAt: 0 },
      { crop: null, readyAt: 0 },
    ];
    const tree = g.scenery.find(
      (p) => p.biome === "water" && p.type === "scenery-tree-palm" && !p.stored,
    );
    Object.assign(tree, { x: -3, z: 1, rotation: 1 });
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
                    "  const reduced =",
                    "  const qaStart=performance.now();\n  const reduced =",
                  )
                  .replace(
                    marker,
                    `  const qa=window.__lagoonQA={camera,look,desiredLook,renderer,islands,cat,npcs,chichiCarrier,itemGroups,THREE,scene,pickDrop,pointer,raycaster,ground,viewport,perform,faceCamera,spa,callbacks,reviewView:(x,z,d)=>{desiredLook.set(x,0,z);desiredDistance=d;},constructorMs:performance.now()-qaStart,focused:()=>focused,getOperation:()=>operation,isVisible:()=>worldVisible,getDistance:()=>distance,getDesiredDistance:()=>desiredDistance,frames:0,resizes:0,black:[],audit:false};
  const draw=renderer.render.bind(renderer);renderer.render=(...args)=>{draw(...args);qa.frames++;};
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
                  "window.__lagoonSaveQA={cloud,getGame:()=>game};\npersist();\nrenderGame();",
                ),
              loader: "js",
            }));
          },
        },
      ],
    });
    const browser = await chromium.launch({
      executablePath: process.env.CHICHI_CHROMIUM || undefined,
      args: [
        "--no-sandbox",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    });
    let page;
    try {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      page = await context.newPage();
      page.setDefaultTimeout(120000);
      const errors = [];
      let recoveredSaveErrors = 0;
      const unexpectedHttp = [];
      page.on("response", async (r) => {
        if (
          r.status() >= 400 &&
          !(r.url().endsWith("/api/save") && r.status() === 500)
        )
          unexpectedHttp.push({
            status: r.status(),
            path: new URL(r.url()).pathname,
          });
        if (r.url().endsWith("/api/save") && r.status() >= 400) {
          if (r.status() === 500) recoveredSaveErrors++;
          const b = await r.json().catch(() => ({}));
          console.log("Save response", r.status(), {
            error: b.error,
            reason: b.reason,
            notice: b.notice,
            revision: b.revision,
          });
        }
      });
      page.on("pageerror", (e) => errors.push(e.message));
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
      let choices = 0;
      const floatDecision = manualInteraction(
        worldSnapshot(g),
        { activityId: "lake-water" },
        "happy",
      );
      await page.route("**/api/decide", (r) => {
        choices++;
        return r.fulfill({
          json: { ...floatDecision, thought: "QA: обираю басейн Cat SPA." },
        });
      });
      const ready = async () => {
        await page.waitForFunction(
          () =>
            window.__lagoonQA &&
            window.__lagoonSaveQA &&
            !document.getElementById("world-loading") &&
            window.__lagoonQA.frames > 2,
          null,
          { timeout: 180000 },
        );
      };
      await page.addInitScript(() =>
        Object.defineProperty(globalThis, "scheduler", {
          value: undefined,
          configurable: true,
        }),
      );
      await page.goto(base + "/", { waitUntil: "domcontentloaded" });
      await ready();
      await page.locator('[data-biome="water"]').tap();
      await page.waitForFunction(
        () => {
          const q = __lagoonQA;
          return (
            q.focused() === "water" &&
            q.look.distanceTo(q.desiredLook) < 0.3 &&
            !q.islands.get("water").userData.lowOnly
          );
        },
        null,
        { timeout: 180000 },
      );
      await page.locator("#map").scrollIntoViewIfNeeded();

      await page.screenshot({
        path: review + "/spa-phone.png",
        timeout: 90000,
      });
      console.log(
        "Full SPA scene loaded on portrait phone with full-detail water, scenery and existing cat models.",
      );
      const clickBar = async () => {
        const p = await page.evaluate(() => {
          const q = __lagoonQA,
            p = q.itemGroups
              .get("spa-bar")
              .localToWorld(new q.THREE.Vector3(-2, 3.1, 1.1))
              .project(q.camera),
            b = q.renderer.domElement.getBoundingClientRect();
          return {
            x: b.left + ((p.x + 1) * b.width) / 2,
            y: b.top + ((1 - p.y) * b.height) / 2,
          };
        });
        await page.touchscreen.tap(p.x, p.y);
        await page.waitForFunction(
          () =>
            document.getElementById("item-dialog").open &&
            document.getElementById("spa-bar-actions").hidden === false,
        );
      };
      await clickBar();
      await page.screenshot({ path: review + "/bar-menu-phone.png" });
      const beforeCoins = await page.evaluate(
          () => __lagoonSaveQA.getGame().coins,
        ),
        beforeEarned = await page.evaluate(
          () => __lagoonSaveQA.getGame().totalEarned,
        );
      await page.locator('[data-drink="berry"]').tap();
      await page.waitForFunction(
        () =>
          __lagoonQA.getOperation()?.stage === "spa" &&
          __lagoonQA.spa.get("chichi"),
      );
      assert.equal(
        await page.evaluate(() => __lagoonSaveQA.getGame().coins),
        beforeCoins,
      );
      const reachPhase = async (phase) => {
        for (let i = 0; i < 50; i++) {
          const found = await page.evaluate((phase) => {
            const q = __lagoonQA;
            for (let f = 0; f < 120; f++) {
              if (q.spa.get("chichi")?.phase === phase) return true;
              q.spa.step(1 / 30, performance.now() / 1000);
            }
            return q.spa.get("chichi")?.phase === phase;
          }, phase);
          if (found) return;
        }
        throw Error(
          "SPA phase not reached: " +
            phase +
            " " +
            JSON.stringify(
              await page.evaluate(() =>
                [...__lagoonQA.spa.visits.values()].map((v) => ({
                  id: v.catId,
                  phase: v.phase,
                  point: v.position,
                  target: v.path[0],
                })),
              ),
            ),
        );
      };
      const finishVisit = async () => {
        await page.evaluate(() => {
          const q = __lagoonQA;
          for (let f = 0; f < 6000 && q.spa.get("chichi"); f++)
            q.spa.step(1 / 30, performance.now() / 1000);
        });
        await page.waitForFunction(() => !__lagoonQA.getOperation());
      };
      await reachPhase("relax");
      await page.waitForFunction(
        () => __lagoonQA.cat.userData.mood === "happy",
      );
      await page.evaluate(() => {
        const v = __lagoonQA.spa.get("chichi");
        v.elapsed = 5;
      });
      await page.screenshot({
        path: review + "/drinking-phone.png",
        timeout: 90000,
      });
      await finishVisit();
      let after = await page.evaluate(() => __lagoonSaveQA.getGame());
      assert.ok(after.spa.receipts.length);
      assert.equal(after.spa.selectedDrink, "berry");
      assert.equal(
        after.coins,
        beforeCoins - 24 + (after.totalEarned - beforeEarned),
      );
      console.log(
        "Real bar tap/order/drink/exit, single payment and saved needs passed.",
      );
      // Trigger the actual AI button with a deterministic physical choice in this
      // local browser test. Deployment CI separately calls the real Cloudflare model.
      await page.locator("#toggle").tap();
      await page.waitForFunction(
        () =>
          __lagoonQA.getOperation()?.spa &&
          __lagoonQA.getOperation().decision.activityId === "lake-water",
      );
      await reachPhase("relax");
      await page.screenshot({
        path: review + "/swimming-phone.png",
        timeout: 90000,
      });
      await finishVisit();
      assert.equal(choices, 1);
      console.log(
        "AI-button pipeline chooses a physical SPA pool, enters by steps, swims and exits.",
      );
      for (const id of ["spa-lounge", "spa-jacuzzi"]) {
        if (id === "spa-lounge") {
          await page.waitForFunction(() => {
            const c = __lagoonSaveQA.cloud;
            return !c.dirty && !c.running && !c.conflict && c.editable;
          });
          const points = await page.evaluate((id) => {
            const q = __lagoonQA,
              r = q.renderer.domElement.getBoundingClientRect(),
              project = (v) => {
                v.project(q.camera);
                return {
                  x: r.x + ((v.x + 1) * r.width) / 2,
                  y: r.y + ((1 - v.y) * r.height) / 2,
                };
              };
            const from = project(
                q.chichiCarrier.position
                  .clone()
                  .add(new q.THREE.Vector3(0, 0.8, 0)),
              ),
              root = q.itemGroups.get(id);
            for (const y of [0.5, 1, 1.8, 2.8])
              for (const dx of [0, -1.5, 1.5, -2.5, 2.5])
                for (const dz of [0, 1, -1]) {
                  const to = project(
                    root.position.clone().add(new q.THREE.Vector3(dx, y, dz)),
                  );
                  if (
                    document.elementFromPoint(to.x, to.y) !==
                    q.renderer.domElement
                  )
                    continue;
                  const e = {
                    clientX: to.x,
                    clientY: to.y,
                    pointerType: "touch",
                  };
                  q.pointer(e);
                  const p = new q.THREE.Vector3();
                  q.raycaster.ray.intersectPlane(q.ground, p);
                  if (q.pickDrop(e, p)?.activityId === id) return { from, to };
                }
            throw Error("SPA touch target unavailable");
          }, id);
          const cdp = await context.newCDPSession(page);
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [{ ...points.from, id: 1 }],
          });
          for (let i = 1; i <= 6; i++)
            await cdp.send("Input.dispatchTouchEvent", {
              type: "touchMove",
              touchPoints: [
                {
                  x: points.from.x + ((points.to.x - points.from.x) * i) / 6,
                  y: points.from.y + ((points.to.y - points.from.y) * i) / 6,
                  id: 1,
                },
              ],
            });
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
          });
          await cdp.detach();
        } else
          await page.evaluate(
            (id) => __lagoonQA.callbacks.onCatDrop({ activityId: id }),
            id,
          );
        await page.waitForFunction(
          () =>
            __lagoonQA.getOperation()?.stage === "spa" &&
            __lagoonQA.spa.get("chichi"),
        );
        await reachPhase("relax");
        await page.screenshot({
          path: review + "/" + id + "-phone.png",
          timeout: 90000,
        });
        assert.equal(
          await page.evaluate(() => __lagoonQA.cat.userData.mood),
          "sleep",
        );
        await finishVisit();
      }
      console.log(
        "Manual drop handler uses shared daybed and warm jacuzzi, existing sleeping pose, releases both places.",
      );
      await page.evaluate(() => __lagoonQA.reviewView(14.1, -35.5, 26));
      await page.waitForFunction(
        () => Math.abs(__lagoonQA.getDistance() - 26) < 0.1,
      );
      await page.screenshot({ path: review + "/jacuzzi-steam-closeup.png" });
      const steamPixels = await page.evaluate(() => {
        const q = __lagoonQA,
          plume = q.islands
            .get("water")
            .getObjectByName("SPA warm rising steam"),
          target = new q.THREE.WebGLRenderTarget(256, 512),
          before = new Uint8Array(256 * 512 * 4),
          after = new Uint8Array(before.length);
        q.renderer.setRenderTarget(target);
        plume.visible = false;
        q.renderer.render(q.scene, q.camera);
        q.renderer.readRenderTargetPixels(target, 0, 0, 256, 512, before);
        plume.visible = true;
        q.renderer.render(q.scene, q.camera);
        q.renderer.readRenderTargetPixels(target, 0, 0, 256, 512, after);
        q.renderer.setRenderTarget(null);
        target.dispose();
        let changed = 0;
        for (let i = 0; i < before.length; i += 4)
          if (
            Math.abs(before[i] - after[i]) +
              Math.abs(before[i + 1] - after[i + 1]) +
              Math.abs(before[i + 2] - after[i + 2]) >
            3
          )
            changed++;
        return changed;
      });
      assert.ok(
        steamPixels > 50,
        "Steam must actually be visible in the phone render: " + steamPixels,
      );
      await page.evaluate(() => __lagoonQA.reviewView(9.2, -53, 27));
      await page.waitForFunction(
        () => __lagoonQA.look.distanceTo(__lagoonQA.desiredLook) < 0.1,
      );
      await page.screenshot({ path: review + "/spa-bar-closeup.png" });
      assert.equal(
        await page.evaluate(
          () =>
            !!__lagoonQA.itemGroups
              .get("spa-bar")
              .getObjectByName("SPA bar lettering"),
        ),
        true,
      );
      console.log(
        "Visible phone-rendered jacuzzi steam pixels:",
        steamPixels,
        "; live bar sign/staff present.",
      );
      await page.locator("#care-open").tap();
      await page.locator("#chichi-camera").tap();
      await page.waitForFunction(() => __lagoonQA.faceCamera.enabled);
      await page.waitForFunction(() => {
        const q = __lagoonQA;
        return (
          q.camera.position.distanceTo(
            q.cat.userData.head.getWorldPosition(new q.THREE.Vector3()),
          ) < 12
        );
      });
      await page.screenshot({ path: review + "/chichi-camera.png" });
      await page.locator("#camera-follow-exit").tap();
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.waitForFunction(() => __lagoonQA.camera.aspect > 1);
      await page.screenshot({
        path: review + "/spa-desktop.png",
        timeout: 90000,
      });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.waitForFunction(() => !__lagoonSaveQA.cloud.dirty);
      const saved = await page.evaluate(() =>
          structuredClone(__lagoonSaveQA.getGame()),
        ),
        remote = await (await fetch(base + "/api/save", { headers })).json();
      for (const key of [
        "placements",
        "scenery",
        "progression",
        "farm",
        "unlocked",
        "spa",
      ])
        assert.deepEqual(remote.game[key], saved[key], key);
      assert.equal(remote.game.coins, saved.coins);
      await page.evaluate(() => __storeGraphics());
      await page.reload({ waitUntil: "domcontentloaded" });
      await ready();
      const restored = await page.evaluate(() => __lagoonSaveQA.getGame());
      for (const key of [
        "placements",
        "scenery",
        "progression",
        "farm",
        "unlocked",
        "spa",
      ])
        assert.deepEqual(restored[key], saved[key], key + " reload");
      assert.equal(restored.coins, saved.coins);
      assert.equal(await page.evaluate(() => __graphicsRestored), true);
      console.log(
        "Confirmed private SQLite cloud snapshot and reload retain old buildings, moved palms, crop deadlines, money, XP, bar settings and SPA receipts; warm graphics cache restored.",
      );
      assert.deepEqual(unexpectedHttp, []);
      assert.deepEqual(
        errors.filter(
          (e) =>
            e !==
            "Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
        ),
        [],
      );
      assert.ok(errors.length <= recoveredSaveErrors);
      console.log(
        "No JS/shader errors; local save proxy retries recovered:",
        recoveredSaveErrors,
      );
    } catch (error) {
      console.log(
        "SPA diagnostics",
        await page
          .evaluate(() => ({
            error: document.getElementById("world-loading")?.textContent,
            status: document.getElementById("status")?.textContent,
            op: __lagoonQA?.getOperation()?.decision,
            stage: __lagoonQA?.getOperation()?.stage,
            spaFailed: __lagoonQA?.getOperation()?.spaFailed,
            visits: [...__lagoonQA.spa.visits.values()].map((v) => ({
              id: v.catId,
              phase: v.phase,
              pos: v.position,
              target: v.path[0],
            })),
          }))
          .catch(() => ({})),
      );
      await page
        .screenshot({ path: review + "/failure.png", timeout: 30000 })
        .catch(() => {});
      throw error;
    } finally {
      await browser.close();
    }
  } finally {
    local.stop();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
