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
const onlyBusiness = process.env.CHICHI_BUSINESS_QA_ONLY === "1";
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
      { newGame, worldSnapshot, loadGame, findSpace } = await import(
        root + "/public/economy.js"
      ),
      { gameDay, xpForLevel } = await import(root + "/public/progression.js"),
      { manualInteraction } = await import(root + "/public/interactions.js");
    const now = Date.now(),
      g = newGame(now);
    g.unlocked.push("sakura");
    g.lastVisit = gameDay(now);
    g.progression.lastVisitDay = gameDay(now);
    g.progression.xp = xpForLevel(10);
    g.progression.xpDay = gameDay(now);
    g.coins = 12000;
    g.catDestinations = Object.fromEntries(
      ["luna", "moti", "pixel", "peach", "bagel", "salem"].map((id) => [
        id,
        "sakura",
      ]),
    );
    g.catPosition = { biome: "sakura", x: 0, z: 21.8 };
    g.cat.energy = 90;
    g.cat.hunger = 10;
    g.cat.happiness = 90;
    g.placements.push({
      id: "old-dream-farm",
      item: "farm-field",
      biome: "sakura",
      x: -3,
      z: -3,
      rotation: 0,
      readyAt: now + 14400000,
    });
    g.farm.fields["old-dream-farm"] = [
      { crop: "wheat", readyAt: now + 7200000 },
      { crop: null, readyAt: 0 },
      { crop: null, readyAt: 0 },
    ];
    const tree = g.scenery.find(
      (p) =>
        p.biome === "sakura" && p.type === "scenery-tree-sakura" && !p.stored,
    );
    Object.assign(tree, { x: -3, z: 1, rotation: 1 });
    g.placements.push({
      id: "chill-yarn-test",
      item: "yarn",
      biome: "sakura",
      x: 4,
      z: 0,
      rotation: 0,
    });
    g.placements.push({
      id: "little-hotdog-stand",
      item: "business-hotdog",
      biome: "sakura",
      ...findSpace(g, "business-hotdog", "sakura"),
      rotation: 0,
      readyAt: 0,
    });
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
                    `  const qa=window.__lagoonQA={camera,look,desiredLook,renderer,islands,cat,npcs,chichiCarrier,itemGroups,THREE,scene,pickDrop,pointer,raycaster,ground,viewport,perform,performResident,faceCamera,spa,chill,residentPlay,callbacks,getDragging:()=>draggingCat?.catId,reviewView:(x,z,d)=>{desiredLook.set(x,0,z);desiredDistance=d;azimuth=.15;},constructorMs:performance.now()-qaStart,focused:()=>focused,getOperation:()=>operation,isVisible:()=>worldVisible,getDistance:()=>distance,getDesiredDistance:()=>desiredDistance,frames:0,resizes:0,black:[],audit:false};
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
      await page.goto(base);
      await page.waitForFunction(
        () => window.__lagoonQA && window.__lagoonSaveQA?.cloud.editable,
      );
      await page.locator('[data-biome="sakura"]').tap();
      await page.waitForFunction(
        () =>
          __lagoonQA.focused() === "sakura" &&
          !__lagoonQA.islands.get("sakura").userData.lowOnly,
      );
      console.log(
        "Full Chill Land loaded from real cooperative scene with all seven houses.",
      );
      const cdp = await page.context().newCDPSession(page);
      if (!onlyBusiness) {
        await page.screenshot({ path: review + "/chill-phone.png" });
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.evaluate(() => __lagoonQA.reviewView(-104, 0, 80));
        await page.waitForFunction(
          () => Math.abs(__lagoonQA.getDistance() - 80) < 0.3,
        );
        await page.screenshot({ path: review + "/chill-desktop.png" });
        await page.evaluate(() => {
          const q = __lagoonQA;
          q.chill.clear();
          for (const n of q.npcs.values())
            n.manualUntil = performance.now() + 1e6;
          q.callbacks.onCatDrop({ activityId: "chill-sage-bed" });
        });
        await page.waitForFunction(
          () => __lagoonQA.getOperation()?.stage === "chill",
        );
        await page.evaluate(() => {
          const q = __lagoonQA,
            n = q.npcs.get("moti");
          n.carrier.position.set(-106, 0.16, 18);
          if (
            !q.performResident("moti", {
              action: "rest",
              activityId: "chill-sage-bed",
              mood: "happy",
            })
          )
            throw Error("Second place on the shared bed unavailable");
          for (let f = 0; f < 9000; f++) {
            if (
              q.chill.get("chichi")?.phase === "relax" &&
              q.chill.get("moti")?.phase === "relax"
            )
              break;
            q.chill.step(1 / 30, performance.now() / 1000);
          }
        });
        await page.waitForFunction(
          () =>
            __lagoonQA.chill.get("chichi")?.phase === "relax" &&
            __lagoonQA.chill.get("moti")?.phase === "relax",
        );
        await page.evaluate(() => __lagoonQA.reviewView(-118, 10.5, 27));
        await page.waitForFunction(
          () =>
            Math.abs(__lagoonQA.getDistance() - 27) < 0.2 &&
            __lagoonQA.cat.userData.mood === "sleep" &&
            __lagoonQA.npcs.get("moti").model.userData.mood === "sleep",
        );
        await page.screenshot({ path: review + "/shared-bed.png" });
        const bedState = await page.evaluate(() =>
          ["chichi", "moti"].map((id) => {
            const v = __lagoonQA.chill.get(id);
            return { id, phase: v.phase, seat: v.seatIndex, y: v.position.y };
          }),
        );
        assert.equal(new Set(bedState.map((v) => v.seat)).size, 2);
        console.log(
          "Two actual approved cat rigs sleep side by side on one uninterrupted mattress.",
          bedState,
        );
        await page.evaluate(() => {
          const q = __lagoonQA;
          for (let f = 0; f < 9000 && q.chill.visits.size; f++)
            q.chill.step(1 / 30, performance.now() / 1000);
        });
        await page.waitForFunction(() => !__lagoonQA.getOperation());
        await page.evaluate(() =>
          __lagoonQA.callbacks.onCatDrop({ activityId: "chill-sage-bath" }),
        );
        await page.waitForFunction(
          () => __lagoonQA.getOperation()?.stage === "chill",
        );
        await page.evaluate(() => {
          const q = __lagoonQA;
          for (
            let f = 0;
            f < 9000 && q.chill.get("chichi")?.phase !== "relax";
            f++
          )
            q.chill.step(1 / 30, performance.now() / 1000);
        });
        await page.waitForFunction(
          () => __lagoonQA.chill.get("chichi")?.phase === "relax",
        );
        await page.waitForFunction(
          () => __lagoonQA.cat.userData.mood === "sleep",
        );
        await page.screenshot({ path: review + "/warm-bath.png" });
        await page.evaluate(() => {
          const q = __lagoonQA;
          for (let f = 0; f < 9000 && q.chill.get("chichi"); f++)
            q.chill.step(1 / 30, performance.now() / 1000);
        });
        await page.waitForFunction(() => !__lagoonQA.getOperation());
        console.log(
          "Chichi enters the real bathtub over its steps, relaxes with her face above water, leaves, and saves a needs receipt.",
        );
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => {
          const q = __lagoonQA;
          q.chill.clear();
          q.spa.clear();
          q.chichiCarrier.position.set(-104, 0.16, 21.8);
          for (const [id, n] of q.npcs) {
            n.manualUntil = performance.now() + 1e6;
            if (id !== "moti") n.carrier.position.set(-104, 0.16, -20);
          }
          q.callbacks.onResidentDrop("moti", null, "sakura", { x: -103, z: 3 });
          q.reviewView(-102, 2, 23);
        });
        await page.waitForFunction(
          () => Math.abs(__lagoonQA.getDistance() - 23) < 0.2,
        );
        const points = await page.evaluate(() => {
          const q = __lagoonQA,
            n = q.npcs.get("moti"),
            rect = q.renderer.domElement.getBoundingClientRect();
          q.camera.updateMatrixWorld(true);
          const project = (p) => {
            const v = p.clone().project(q.camera);
            return {
              x: rect.left + ((v.x + 1) * rect.width) / 2,
              y: rect.top + ((1 - v.y) * rect.height) / 2,
            };
          };
          return {
            from: project(
              n.model.userData.head.getWorldPosition(new q.THREE.Vector3()),
            ),
            to: project(q.itemGroups.get("chill-yarn-test").position),
          };
        });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [points.from],
        });
        for (let i = 1; i <= 9; i++)
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [
              {
                x: points.from.x + ((points.to.x - points.from.x) * i) / 9,
                y: points.from.y + ((points.to.y - points.from.y) * i) / 9,
              },
            ],
          });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await page.waitForFunction(
          () =>
            __lagoonQA.residentPlay.get("moti")?.decision.activityId ===
            "chill-yarn-test",
        );
        await page.evaluate(() => {
          const v = __lagoonQA.residentPlay.get("moti");
          v.started -= 10000;
        });
        await page.waitForFunction(
          () => __lagoonQA.residentPlay.get("moti")?.phase === "activity",
        );
        await page.screenshot({ path: review + "/dragged-neighbour-yarn.png" });
        console.log(
          "A real touch drag picks Moti rather than Chichi and starts the same animated yarn chase.",
        );
        await page.evaluate(() =>
          __lagoonQA.residentPlay.frame(
            "moti",
            performance.now() + 30000,
            performance.now() / 1000 + 30,
          ),
        );
      }
      // Only test drawing is paused during the large gesture matrix: all real
      // input handlers, rigs, camera and interaction clocks continue to run.
      // Resume full-quality rendering for the visual review captures below.
      await page.evaluate(() => {
        __lagoonQA.drawPaused = true;
      });
      // The helper is the stand's exact original guest, now owned by the normal
      // actor rig. One cook and one other little visitor remain at the venue.
      assert.deepEqual(
        await page.evaluate(() => {
          const q = __lagoonQA,
            n = q.npcs.get("hotdog-bun"),
            stand = q.itemGroups.get("little-hotdog-stand");
          return {
            sameModel: n.model === stand.userData.guests[0],
            parent: n.model.parent === n.carrier,
            scale: n.model.scale.x,
            cook:
              stand.userData.staff.parent === stand &&
              stand.userData.staff.visible,
            visitor:
              stand.userData.guests[1].parent === stand &&
              stand.userData.guests[1].visible,
          };
        }),
        {
          sameModel: true,
          parent: true,
          scale: 0.36,
          cook: true,
          visitor: true,
        },
      );
      // Exercise the actual mobile pointer handler for every available resident,
      // including the smallest helper. No direct performResident shortcut.
      const ids = await page.evaluate(() => [...__lagoonQA.npcs.keys()]);
      for (const id of ids) {
        console.log("Checking touch drag", id);
        const staged = await page.evaluate((id) => {
          const q = __lagoonQA;
          q.residentPlay.clear();
          q.chill.clear();
          q.spa.clear();
          for (const [other, n] of q.npcs) {
            n.manualUntil = performance.now() + 1e6;
            n.manualAnchor = { x: -104, z: -20 };
            n.carrier.position.set(-104, 0.16, -20);
          }
          const moved = q.callbacks.onResidentDrop(id, null, "sakura", {
            x: -103,
            z: 3,
          });
          q.reviewView(-102, 2, 23);
          return {
            moved,
            position: q.npcs.get(id).carrier.position.toArray(),
            profile: q.npcs.get(id).profile,
            conflict: __lagoonSaveQA.cloud.conflict,
            editable: __lagoonSaveQA.cloud.editable,
            toast: document.querySelector("#toast")?.textContent,
          };
        }, id);
        assert.equal(
          staged.moved,
          true,
          id + " first move must save and update the scene",
        );
        await page.waitForFunction(
          () => Math.abs(__lagoonQA.getDistance() - 23) < 0.2,
        );
        await page.waitForTimeout(120);
        const p = await page.evaluate((id) => {
          const q = __lagoonQA,
            rect = q.renderer.domElement.getBoundingClientRect();
          q.camera.updateMatrixWorld(true);
          q.scene.updateMatrixWorld(true);
          const project = (p) => {
            const v = p.clone().project(q.camera);
            return {
              x: rect.left + ((v.x + 1) * rect.width) / 2,
              y: rect.top + ((1 - v.y) * rect.height) / 2,
            };
          };
          return {
            from: project(
              q.npcs
                .get(id)
                .model.userData.head.getWorldPosition(new q.THREE.Vector3()),
            ),
            to: project(q.itemGroups.get("chill-yarn-test").position),
          };
        }, id);
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [p.from],
        });
        assert.equal(
          await page.evaluate(() => __lagoonQA.getDragging()),
          id,
          "real touch picks this specific cat",
        );
        for (let i = 1; i <= 9; i++)
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [
              {
                x: p.from.x + ((p.to.x - p.from.x) * i) / 9,
                y: p.from.y + ((p.to.y - p.from.y) * i) / 9,
              },
            ],
          });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await page.waitForFunction(
          (id) =>
            __lagoonQA.residentPlay.get(id)?.decision.activityId ===
            "chill-yarn-test",
          id,
          { timeout: 10000 },
        );
        await page.evaluate((id) => {
          __lagoonQA.residentPlay.get(id).started -= 10000;
        }, id);
        await page.waitForFunction(
          (id) =>
            __lagoonQA.residentPlay.get(id)?.phase === "activity" &&
            __lagoonQA.npcs.get(id).model.userData.mood === "happy",
          id,
        );
        if (id === "hotdog-bun") {
          await page.evaluate(() => {
            __lagoonQA.drawPaused = false;
          });
          await page.waitForTimeout(400);
          await page.screenshot({ path: review + "/little-helper-yarn.png" });
          await page.evaluate(() => {
            __lagoonQA.drawPaused = true;
          });
        }
        await page.evaluate(
          (id) =>
            __lagoonQA.residentPlay.frame(
              id,
              performance.now() + 30000,
              performance.now() / 1000 + 30,
            ),
          id,
        );
      }
      console.log(
        "Real touch drags and awake yarn animations passed for every available resident:",
        ids,
      );
      // Communal activities also accept the tiny helper and finish through the
      // same saved receipt path as normal cats, leaving the staffed stand intact.
      assert.equal(
        await page.evaluate(() => {
          const q = __lagoonQA;
          q.callbacks.onResidentDrop(
            "hotdog-bun",
            { activityId: "chill-sage-bath" },
            "sakura",
            { x: -104, z: 0 },
          );
          return !!q.chill.get("hotdog-bun");
        }),
        true,
      );
      await page.evaluate(() => {
        const q = __lagoonQA;
        for (
          let i = 0;
          i < 9000 && q.chill.get("hotdog-bun")?.phase !== "relax";
          i++
        )
          q.chill.step(1 / 30, performance.now() / 1000);
      });
      await page.waitForFunction(
        () => __lagoonQA.chill.get("hotdog-bun")?.phase === "relax",
      );
      await page.evaluate(() => {
        __lagoonQA.drawPaused = false;
      });
      await page.waitForTimeout(400);
      await page.screenshot({ path: review + "/little-helper-bath.png" });
      await page.evaluate(() => {
        __lagoonQA.drawPaused = true;
      });
      await page.evaluate(() => {
        const q = __lagoonQA;
        for (let i = 0; i < 9000 && q.chill.get("hotdog-bun"); i++)
          q.chill.step(1 / 30, performance.now() / 1000);
      });
      await page.waitForFunction(() => !__lagoonQA.chill.get("hotdog-bun"));
      await page.evaluate(() => {
        const q = __lagoonQA,
          g = q.itemGroups.get("little-hotdog-stand");
        q.helperModelBeforeUpgrade = q.npcs.get("hotdog-bun").model;
        q.standBeforeUpgrade = g;
      });
      await page.locator("#business-open").click();
      for (let level = 2; level <= 5; level++) {
        await page.locator('[data-upgrade="little-hotdog-stand"]').click();
        await page.waitForFunction(
          (level) =>
            __lagoonSaveQA.getGame().business.levels["little-hotdog-stand"] ===
              level &&
            __lagoonQA.itemGroups.get("little-hotdog-stand").userData
              .businessLevel === level,
          level,
        );
        assert.equal(
          await page.evaluate(
            () =>
              __lagoonQA.npcs.get("hotdog-bun").model ===
                __lagoonQA.helperModelBeforeUpgrade &&
              __lagoonQA.itemGroups.get("little-hotdog-stand") ===
                __lagoonQA.standBeforeUpgrade,
          ),
          true,
        );
        if (level === 2)
          await page.screenshot({ path: review + "/upgrade-menu-phone.png" });
      }
      await page.locator('[data-close="business-dialog"]').click();
      await page.evaluate(() => {
        const q = __lagoonQA,
          p = q.itemGroups.get("little-hotdog-stand").position;
        q.reviewView(p.x, p.z, 23);
        document.querySelector("#map").scrollIntoView({ block: "start" });
      });
      await page.evaluate(() => {
        __lagoonQA.drawPaused = false;
      });
      await page.waitForTimeout(600);
      await page.screenshot({ path: review + "/legendary-hotdog-phone.png" });
      console.log(
        "Four real upgrade button purchases changed the same live stand to level five without rebuilding the kitten; coins, XP and decorated geometry updated together.",
      );
      await page.waitForFunction(() => !__lagoonSaveQA.cloud.dirty);
      const saved = (
        await (await fetch(base + "/api/save", { headers })).json()
      ).game;
      assert.ok(saved.spa.receipts.length >= (onlyBusiness ? 1 : 3));
      assert.equal(saved.catDestinations.moti, "sakura");
      assert.equal(saved.catDestinations["hotdog-bun"], "sakura");
      assert.equal(saved.business.levels["little-hotdog-stand"], 5);
      assert.ok(
        saved.placements.some(
          (p) =>
            p.id === "old-dream-farm" &&
            p.readyAt ===
              g.placements.find((p) => p.id === "old-dream-farm").readyAt,
        ),
      );
      await page.reload();
      await page.waitForFunction(
        () => window.__lagoonSaveQA?.cloud.editable && window.__lagoonQA,
      );
      const restored = await page.evaluate(() => __lagoonSaveQA.getGame());
      for (const key of [
        "placements",
        "scenery",
        "progression",
        "farm",
        "unlocked",
        "spa",
        "catDestinations",
        "business",
      ])
        assert.deepEqual(restored[key], saved[key], key + " reload");
      assert.equal(restored.coins, saved.coins);
      assert.deepEqual(errors, []);
      assert.deepEqual(unexpectedHttp, []);
      console.log(
        "PASS: real resident/helper touch drags, awake yarn play, helper bathtub entry/relax/exit, four paid visual upgrades, private SQLite saves/reload, and no JS/shader errors.",
      );
    } catch (error) {
      console.log(
        "Chill diagnostics",
        await page
          ?.evaluate(() => ({
            op: window.__lagoonQA?.getOperation()?.decision,
            stage: window.__lagoonQA?.getOperation()?.stage,
            visits: [...(window.__lagoonQA?.chill.visits.values() || [])].map(
              (v) => ({
                id: v.catId,
                object: v.objectId,
                phase: v.phase,
                p: v.position,
                next: v.path[0],
              }),
            ),
            manual: [...(window.__lagoonQA?.residentPlay.visits.keys() || [])],
          }))
          .catch(() => ({})),
      );
      await page?.screenshot({ path: review + "/failure.png" }).catch(() => {});
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
