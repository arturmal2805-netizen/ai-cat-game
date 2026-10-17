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
    g.adoption.cats = [
      { id: "adopt-crumb", homeBiome: "homestead" },
      { id: "adopt-doughnut", homeBiome: "homestead" },
    ];
    g.progression.xp = xpForLevel(20);
    g.lastVisit = gameDay(now);
    g.progression.lastVisitDay = gameDay(now);
    g.coins = 1000000;
    g.catPosition = { biome: "homestead", x: -18, z: 20 };
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
                  "window.__expansionActions={purchase,placeItem,storeItem,busy:()=>busy};window.__lagoonSaveQA={cloud,getGame:()=>game,commit};\npersist();\nrenderGame();",
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

    const { MEGA_RIDES } = await import(root + "/public/mega-ride-data.js");
    await page.locator('[data-biome="homestead"]').tap();
    await page.waitForFunction(
      () =>
        __lagoonQA.islands.get("homestead") &&
        !__lagoonQA.islands.get("homestead").userData.lowOnly &&
        __lagoonQA.npcs.has("adopt-crumb"),
    );
    await page.evaluate(() => {
      __lagoonQA.reviewView(-250, -55, 105);
      __lagoonQA.desiredLook.y = 9;
      __lagoonQA.drawPaused = true;
    });
    let previous = null;
    for (const spec of MEGA_RIDES) {
      console.log("Checking mobile ride:", spec.id);
      const id = await page.evaluate(
        ({ type, previous }) => {
          const s = __lagoonSaveQA,
            a = __expansionActions;
          let g = s.getGame();
          if (previous) g = a.storeItem(g, previous);
          g = a.placeItem(a.purchase(g, type), type, "homestead", 0, 0, 0);
          const p = g.placements.at(-1);
          p.readyAt = 0;
          g.business.accounts[p.id].collectedAt = Date.now() - 3600000;
          s.commit(g);
          return p.id;
        },
        { type: spec.id, previous },
      );
      previous = id;
      await page.waitForFunction(
        (id) => __lagoonQA.itemGroups.get(id)?.userData.built,
        id,
      );
      await page.waitForFunction(() => !__expansionActions.busy());
      assert.equal(
        await page.evaluate(
          (id) => __lagoonQA.callbacks.onCatDrop({ activityId: id }),
          id,
        ),
        true,
      );
      await page.waitForFunction(
        (id) => __lagoonQA.getOperation()?.decision.activityId === id,
        id,
      );
      await page.evaluate(() => {
        __lagoonQA.getOperation().start -= 20000;
      });
      await page.waitForFunction(
        () => __lagoonQA.getOperation()?.stage === "activity",
      );
      const times = await page.evaluate((id) => {
        const r = __lagoonQA.itemGroups.get(id).userData.route;
        let t = r.legs.find(
          (l) =>
            l.phase === "flight" || l.phase === "vortex" || l.phase === "ride",
        );
        if (r.impacts.length === 3)
          t = r.legs.filter((l) => l.phase === "flight").at(-1);
        t = t.start + t.duration * 0.5;
        if (r.coaster)
          for (let i = 0; i < r.duration; i += 0.01) {
            const f = r.frame(i);
            if (
              f.quaternion &&
              new __lagoonQA.THREE.Vector3(0, 1, 0).applyQuaternion(
                new __lagoonQA.THREE.Quaternion().fromArray(f.quaternion),
              ).y < -0.99
            ) {
              t = i;
              break;
            }
          }
        __lagoonQA.pinnedRide = t;
        return { sample: t, impact: r.impacts[0]?.time, duration: r.duration };
      }, id);
      await page.waitForFunction((id) => {
        const q = __lagoonQA,
          g = q.itemGroups.get(id);
        if (!q.getOperation() || g.userData.rideElapsed === undefined)
          return false;
        const p = g.localToWorld(
          new q.THREE.Vector3(...g.userData.rideFrame(q.pinnedRide).position),
        );
        return q.chichiCarrier.position.distanceTo(p) < 0.005;
      }, id);
      const seat = await page.evaluate((id) => {
        const q = __lagoonQA,
          g = q.itemGroups.get(id),
          f = g.userData.rideFrame(q.pinnedRide),
          p = g.localToWorld(new q.THREE.Vector3(...f.position));
        return {
          gap: q.chichiCarrier.position.distanceTo(p),
          finite: q.chichiCarrier.matrixWorld.elements.every(Number.isFinite),
          phase: f.phase,
          elapsed: g.userData.rideElapsed,
          pin: q.pinnedRide,
        };
      }, id);
      assert.ok(seat.gap < 0.005 && seat.finite, JSON.stringify(seat));
      await page.evaluate(() => {
        __lagoonQA.drawPaused = false;
      });
      await page.waitForTimeout(150);
      await page.screenshot({
        path: path.join(review, spec.id + "-phone.png"),
      });
      await page.evaluate(() => {
        __lagoonQA.drawPaused = true;
      });
      if (times.impact !== undefined) {
        await page.evaluate((t) => {
          __lagoonQA.pinnedRide = t + 0.1;
        }, times.impact);
        await page.waitForFunction(
          (id) =>
            __lagoonQA.itemGroups.get(id).userData.pool.userData.water.uniforms
              .uRippleCount.value > 0,
          id,
        );
        assert.ok(
          await page.evaluate(
            (id) =>
              __lagoonQA.itemGroups.get(id).userData.pool.userData.water
                .uniforms.uRippleCount.value > 0,
            id,
          ),
        );
      }
      await page.evaluate(() => {
        const q = __lagoonQA;
        delete q.pinnedRide;
        q.getOperation().activityStart -= 100000;
      });
      await page.waitForFunction(
        () => !__lagoonQA.getOperation() && !__expansionActions.busy(),
      );
      // Exercise the actual resident-drop callback with two very different sizes.
      const kitten = spec.id.includes("coaster")
        ? "adopt-doughnut"
        : "adopt-crumb";
      assert.equal(
        await page.evaluate(
          ({ kitten, id }) =>
            __lagoonQA.callbacks.onResidentDrop(
              kitten,
              { activityId: id },
              "homestead",
              { x: 0, z: 0 },
            ),
          { kitten, id },
        ),
        true,
      );
      await page.evaluate((kitten) => {
        __lagoonQA.residentPlay.get(kitten).started -= 20000;
      }, kitten);
      await page.waitForFunction(
        (kitten) => __lagoonQA.residentPlay.get(kitten)?.phase === "activity",
        kitten,
      );
      await page.evaluate(
        ({ kitten, t }) => {
          const v = __lagoonQA.residentPlay.get(kitten);
          v.activityStart = performance.now() - t * 1000;
        },
        { kitten, t: times.sample },
      );
      await page.waitForFunction(
        ({ kitten, id, t }) => {
          const q = __lagoonQA,
            v = q.residentPlay.get(kitten),
            g = q.itemGroups.get(id);
          if (!v || v.elapsed < t - 0.01) return false;
          const p = g.localToWorld(
            new q.THREE.Vector3(...g.userData.rideFrame(v.elapsed).position),
          );
          return q.npcs.get(kitten).carrier.position.distanceTo(p) < 0.005;
        },
        { kitten, id, t: times.sample },
      );
      const resident = await page.evaluate(
        ({ kitten, id }) => {
          const q = __lagoonQA,
            v = q.residentPlay.get(kitten),
            g = q.itemGroups.get(id),
            f = g.userData.rideFrame(v.elapsed),
            p = g.localToWorld(new q.THREE.Vector3(...f.position));
          return {
            gap: q.npcs.get(kitten).carrier.position.distanceTo(p),
            finite: q.npcs
              .get(kitten)
              .carrier.matrixWorld.elements.every(Number.isFinite),
          };
        },
        { kitten, id },
      );
      assert.ok(
        resident.gap < 0.005 && resident.finite,
        JSON.stringify(resident),
      );
      await page.evaluate((kitten) => {
        __lagoonQA.residentPlay.get(kitten).activityStart -= 100000;
      }, kitten);
      await page.waitForFunction(
        (kitten) => !__lagoonQA.residentPlay.get(kitten),
        kitten,
      );
      console.log("Real hero and resident rides completed:", spec.id);
    }
    await page.waitForFunction(
      () =>
        !__lagoonSaveQA.cloud.pending &&
        !__lagoonSaveQA.cloud.retryEntry &&
        !__lagoonSaveQA.cloud.dirty,
    );
    const current = await page.evaluate(() => __lagoonSaveQA.getGame()),
      remote = await (await fetch(base + "/api/save", { headers })).json();
    assert.equal(remote.game.coins, current.coins);
    assert.equal(remote.game.progression.xp, current.progression.xp);
    assert.deepEqual(remote.game.placements, current.placements);
    assert.deepEqual(remote.game.inventory, current.inventory);
    await page.reload();
    await page.waitForFunction(
      (id) =>
        window.__lagoonSaveQA?.cloud.editable &&
        __lagoonQA.itemGroups.get(id)?.userData.built,
      previous,
    );
    const restored = await page.evaluate(() => {
      __lagoonQA.drawPaused = true;
      return __lagoonSaveQA.getGame();
    });
    assert.equal(restored.coins, current.coins);
    assert.deepEqual(restored.inventory, current.inventory);
    assert.deepEqual(restored.placements, current.placements);
    console.log(
      "PASS: all 10 models render on mobile, 20 real manual rides match their seats, all water impacts fire, purchases/coins/XP survive cloud reload.",
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
      "PASS: all legendary rides render without browser or shader errors.",
    );
  } catch (error) {
    console.error("Mega rides browser check failed", error);
    throw error;
  } finally {
    await browser?.close();
    local.stop();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
