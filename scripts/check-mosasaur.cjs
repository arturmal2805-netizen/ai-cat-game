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
    g.unlocked.push("autumn");
    g.progression.xp = xpForLevel(8);
    g.lastVisit = gameDay(now);
    g.progression.lastVisitDay = gameDay(now);
    g.coins = 19000;
    g.catPosition = { biome: "autumn", x: 0, z: 23 };
    g.catDestinations = { luna: "autumn", moti: "autumn" };
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
    await page.locator('[data-biome="autumn"]').tap();
    await page.waitForFunction(
      () =>
        __lagoonQA.itemGroups.get("island-mosasaur") &&
        __lagoonQA.islands.get("autumn").userData.ocean &&
        !__lagoonQA.islands.get("autumn").userData.lowOnly,
    );
    await page.evaluate(() => {
      const q = __lagoonQA;
      q.drawPaused = true;
      for (const n of q.npcs.values()) {
        n.manualAnchor = n.carrier.position.clone();
        n.manualUntil = performance.now() + 1e7;
      }
      q.reviewView(-150, -28, 48);
    });
    await page.waitForFunction(
      () => Math.abs(__lagoonQA.getDistance() - 48) < 0.2,
    );
    console.log(
      "Mobile world initialized with a level-eight island and private cloud save.",
    );
    // Real touch input selects Chichi and releases her on the mosasaur mesh.
    const cdp = await context.newCDPSession(page);
    const points = await page.evaluate(() => {
      const q = __lagoonQA;
      q.scene.updateMatrixWorld(true);
      q.camera.updateMatrixWorld(true);
      const rect = q.renderer.domElement.getBoundingClientRect(),
        project = (p) => {
          const v = p.clone().project(q.camera);
          return {
            x: rect.left + ((v.x + 1) * rect.width) / 2,
            y: rect.top + ((1 - v.y) * rect.height) / 2,
          };
        };
      return {
        from: project(
          q.cat.userData.head.getWorldPosition(new q.THREE.Vector3()),
        ),
        to: project(
          q.itemGroups
            .get("island-mosasaur")
            .userData.moving.localToWorld(new q.THREE.Vector3(0, 1, 0.6)),
        ),
      };
    });
    console.log("Touch points", points);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [points.from],
    });
    for (let i = 1; i <= 10; i++)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: points.from.x + ((points.to.x - points.from.x) * i) / 10,
            y: points.from.y + ((points.to.y - points.from.y) * i) / 10,
          },
        ],
      });
    assert.equal(await page.evaluate(() => __lagoonQA.getDragging()), "chichi");
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await page.waitForFunction(
      () =>
        __lagoonQA.getOperation()?.decision.activityId === "island-mosasaur",
    );
    await page.evaluate(() => (__lagoonQA.getOperation().start -= 20000));
    await page.waitForFunction(
      () => __lagoonQA.getOperation()?.stage === "activity",
    );
    console.log("Real mobile drag starts the shared authored ride.");
    for (const mode of [false, true]) {
      if (mode) {
        await page.waitForTimeout(500);
        await page.locator("#care-open").tap();
        await page.waitForFunction(
          () => document.getElementById("care-dialog").open,
        );
        await page.locator("#chichi-camera").tap();
        await page.waitForFunction(() => __lagoonQA.faceCamera.enabled);
      }

      await page.evaluate((enabled) => {
        const q = __lagoonQA;
        q.faceCamera.setEnabled(enabled, q.look);
      }, mode);
      for (const [phase, t] of [
        ["boarding", 1],
        ["surface-crossing", 3.2],
        ["deep", 12],
        ["ascent", 18.4],
        ["launch", 19.45],
        ["leap", 20.4],
        ["dive-entry", 21.35],
        ["splash", 22],
        ["return", 28.8],
      ]) {
        await page.evaluate((t) => {
          const q = __lagoonQA;
          q.pinnedRide = t;
          q.getOperation().activityStart = performance.now() - t * 1000;
        }, t);
        await page.waitForFunction(
          ({ t, mode }) => {
            const q = __lagoonQA,
              g = q.itemGroups.get("island-mosasaur");
            if (
              !Number.isFinite(g.userData.rideElapsed) ||
              Math.abs(g.userData.rideElapsed - t) > 0.001
            )
              return false;
            q.camera.updateMatrixWorld(true);
            if (!mode) return true;
            const p = q.faceCamera
              .facePoint(new q.THREE.Vector3())
              .project(q.camera);
            return Math.abs(p.x) < 0.03 && Math.abs(p.y) < 0.03;
          },
          { t, mode },
        );
        const audit = await page.evaluate(() => {
          const q = __lagoonQA;
          q.camera.updateMatrixWorld(true);
          const head = q.cat.userData.head.getWorldPosition(
              new q.THREE.Vector3(),
            ),
            look = q.faceCamera.facePoint(new q.THREE.Vector3()),
            v = look.project(q.camera),
            g = q.itemGroups.get("island-mosasaur"),
            seat = g.userData.moving.localToWorld(
              g.userData.saddleLocal.clone(),
            );
          return {
            camera: q.camera.position.toArray(),
            head: head.toArray(),
            screen: v.toArray(),
            seatError: seat.distanceTo(q.chichiCarrier.position),
            phase: g.userData.phase,
            draws: q.renderer.info.render.calls,
          };
        });
        assert.ok(audit.camera.every(Number.isFinite));
        assert.ok(audit.seatError < 0.002, JSON.stringify(audit));
        if (mode) {
          assert.ok(
            Math.abs(audit.screen[0]) < 0.03 &&
              Math.abs(audit.screen[1]) < 0.03,
            JSON.stringify(audit),
          );
          if (phase === "deep") assert.ok(audit.camera[1] < 0);
        }
        console.log(mode ? "Face camera" : "Orbit camera", phase, audit);
        if (
          capture &&
          ["deep", "launch", "leap", "dive-entry", "splash"].includes(phase)
        ) {
          await page.evaluate(() => (__lagoonQA.drawPaused = false));
          await page.waitForTimeout(500);
          await page.screenshot({
            path: path.join(
              review,
              (mode ? "face-" : "orbit-") + phase + "-phone.png",
            ),
          });
          await page.evaluate(() => (__lagoonQA.drawPaused = true));
        }
      }
    }
    await page.evaluate(() => {
      const q = __lagoonQA;
      q.faceCamera.setEnabled(false, q.look);
      delete q.pinnedRide;
      q.getOperation().activityStart = performance.now() - 31000;
    });
    await page.waitForFunction(() => !__lagoonQA.getOperation());
    const end = await page.evaluate(() =>
      __lagoonQA.chichiCarrier.position.toArray(),
    );
    assert.ok(end[2] > -20);
    console.log("Safe dry dismount", end);
    const npcId = await page.evaluate(() => [...__lagoonQA.npcs.keys()][0]);
    await page.evaluate(
      (id) =>
        __lagoonQA.callbacks.onResidentDrop(
          id,
          { activityId: "island-mosasaur" },
          "autumn",
        ),
      npcId,
    );
    await page.waitForFunction((id) => __lagoonQA.residentPlay.get(id), npcId);
    await page.evaluate(
      (id) => (__lagoonQA.residentPlay.get(id).started -= 20000),
      npcId,
    );
    await page.waitForFunction(
      (id) => __lagoonQA.residentPlay.get(id)?.phase === "activity",
      npcId,
    );
    await page.evaluate(
      (id) =>
        (__lagoonQA.residentPlay.get(id).activityStart =
          performance.now() - 16000),
      npcId,
    );
    await page.waitForFunction(
      (id) => __lagoonQA.npcs.get(id).carrier.position.y < -5,
      npcId,
    );
    const resident = await page.evaluate((id) => {
      const q = __lagoonQA,
        n = q.npcs.get(id);
      return { y: n.carrier.position.y, visit: q.residentPlay.get(id)?.phase };
    }, npcId);
    assert.ok(resident.y < -5);
    console.log("Resident also dives from the same saddle", resident);
    await page.evaluate(
      ({ id, capture }) => {
        const q = __lagoonQA;
        q.residentPlay.cancel(id);
        q.drawPaused = !capture;
        q.reviewView(-150, -42, 160);
      },
      { id: npcId, capture },
    );
    await page.waitForFunction(
      () =>
        __lagoonQA.itemGroups.get("island-mosasaur").userData.phase ===
        "boarding",
    );
    await page.waitForFunction(
      () => Math.abs(__lagoonQA.getDistance() - 160) < 0.2,
    );
    if (capture)
      await page.screenshot({
        path: path.join(review, "whole-island-phone.png"),
      });
    await page.evaluate(() => (__lagoonQA.drawPaused = true));
    await page.waitForTimeout(1200);
    await page.waitForFunction(
      () =>
        !__lagoonSaveQA.cloud.pending &&
        !__lagoonSaveQA.cloud.retryEntry &&
        !__lagoonSaveQA.cloud.dirty,
    );
    const remote = await (await fetch(base + "/api/save", { headers })).json();
    assert.ok(remote.game.unlocked.includes("autumn"));
    assert.ok(remote.revision >= 3);
    await page.waitForFunction(
      () =>
        !__lagoonSaveQA.cloud.pending &&
        !__lagoonSaveQA.cloud.retryEntry &&
        !__lagoonSaveQA.cloud.dirty,
    );
    const localGame = await page.evaluate(() => __lagoonSaveQA.getGame());
    assert.equal(remote.game.progression.xp, localGame.progression.xp);
    assert.equal(remote.game.coins, localGame.coins);
    assert.deepEqual(remote.game.placements, localGame.placements);
    const transport = fs.readFileSync(local.logPath, "utf8");
    const recovered = httpErrors.filter(
      (e) => e.path === "/api/save" && e.status === 500,
    );
    if (recovered.length) {
      assert.equal(
        recovered.length,
        (transport.match(/Error inside ProxyWorker/g) || []).length,
      );
      assert.ok(
        transport.includes("Error inside ProxyWorker") &&
          transport.includes("Network connection lost"),
      );
      console.log(
        "Local dev proxy interruption recovered with the complete saved world:",
        recovered.length,
      );
    }
    assert.ok(
      httpErrors.every((e) => e.path === "/api/save" && e.status === 500),
    );
    const actualErrors = errors.filter(
      (e) => !(recovered.length && e.includes("status of 500")),
    );

    assert.equal(remote.game.progression.xp >= g.progression.xp, true);
    fs.writeFileSync(
      path.join(review, "errors.json"),
      JSON.stringify(errors, null, 2),
    );
    assert.deepEqual(actualErrors, []);
    console.log(
      "PASS: mobile drag, full ride, both cameras through water and jump, resident, exact saddle and private persistence; no JS or shader errors.",
    );
  } finally {
    await browser?.close();
    local.stop();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
