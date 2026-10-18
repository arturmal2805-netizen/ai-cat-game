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
    path.join(os.tmpdir(), "chichi-aquarium-review");
fs.mkdirSync(review, { recursive: true });
const baseline = process.env.CHICHI_BASELINE_REF;
if (baseline && !/^[a-f0-9]{7,40}$/.test(baseline))
  throw Error("Expected a commit hash");
const readPublic = (name) =>
  baseline
    ? require("node:child_process").execFileSync(
        "git",
        ["show", baseline + ":public/" + name],
        { cwd: root, encoding: "utf8" },
      )
    : fs.readFileSync(root + "/public/" + name, "utf8");

async function localWorker() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "chichi-aquarium-"));
  const socket = net.createServer();
  await new Promise((r) => socket.listen(0, "127.0.0.1", r));
  const port = socket.address().port;
  await new Promise((r) => socket.close(r));
  const config = path.join(temp, "wrangler.json"),
    log = fs.openSync(path.join(temp, "worker.log"), "w");
  fs.writeFileSync(
    config,
    JSON.stringify({
      name: "chichi-aquarium-local",
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
      { newGame, loadGame, purchase, placeItem, findSpace } = await import(
        root + "/public/economy.js"
      ),
      { xpForLevel, gameDay } = await import(root + "/public/progression.js");
    const now = Date.now(),
      g = newGame(now);
    g.unlocked.push("aquarium", "homestead");
    g.progression.xp = xpForLevel(14);
    g.lastVisit = gameDay(now);
    g.progression.lastVisitDay = gameDay(now);
    g.coins = 19000;
    g.catPosition = { biome: "aquarium", x: 0, z: 33 };
    g.catDestinations = { luna: "aquarium", moti: "aquarium" };
    g.cat.energy = 95;
    g.cat.hunger = 5;
    g.cat.happiness = 95;
    const legacySpace = findSpace(g, "coaster-lagoon", "homestead");
    assert.ok(legacySpace);
    Object.assign(
      g,
      placeItem(
        purchase(g, "coaster-lagoon", now),
        "coaster-lagoon",
        "homestead",
        legacySpace.x,
        legacySpace.z,
      ),
    );
    for (const p of g.placements)
      if (p.item === "coaster-lagoon") p.readyAt = now - 1000;
    if (process.env.CHICHI_SCENE_STRESS) {
      const { ADOPTION_CATS } = await import(root + "/public/cat-breeds.js");
      g.progression.xp = xpForLevel(30);
      g.coins = 8_000_000;
      for (const item of [
        "slide-glass-corkscrew",
        "slide-titan-funnel",
        "slide-sky-cannon",
        "slide-rainbow-tsunami",
        ...Array.from({ length: 16 }, (_, i) =>
          i % 2 ? "business-hotdog" : "cat-barista",
        ),
      ]) {
        const space = findSpace(g, item, "homestead");
        assert.ok(space, item);
        Object.assign(
          g,
          placeItem(
            purchase(g, item, now),
            item,
            "homestead",
            space.x,
            space.z,
          ),
        );
      }
      for (const p of g.placements) p.readyAt = now - 1000;
      for (const c of ADOPTION_CATS.slice(0, 16)) {
        g.adoption.cats.push({
          id: c.id,
          adoptedAt: now,
          homeBiome: "homestead",
          centerId: "",
        });
        g.catDestinations[c.id] = "homestead";
      }
    }
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
              const source = readPublic("world.js"),
                marker = "  return {\n    perform,";
              assert.ok(source.includes(marker));
              return {
                contents: source
                  .replace(
                    "manualFriendDrop && chooseSocialRide()",
                    "manualFriendDrop && chooseSocialRide(()=>window.__lagoonQA?.socialRoll ?? Math.random())",
                  )
                  .replace(
                    "const residentPlay = createResidentPlay({",
                    "const residentPlay = createResidentPlay({random:()=>window.__lagoonQA?.socialRoll ?? Math.random(),",
                  )
                  .replace(
                    "    const time = now / 1000;",
                    "    if(window.__lagoonQA?.pinnedRide !== undefined && operation?.stage === 'activity') operation.activityStart=now-window.__lagoonQA.pinnedRide*1000;\n    const time = now / 1000;",
                  )
                  .replace(
                    "    const dt = Math.min((now - previousTime) / 1000, 0.1);",
                    "    const qaFrameStart=performance.now();\n    const dt = Math.min((now - previousTime) / 1000, 0.1);",
                  )
                  .replace(
                    "      renderer.render(scene, camera);",
                    "      if(window.__lagoonQA?.measure)window.__lagoonQA.cpu.push(performance.now()-qaFrameStart);\n      renderer.render(scene, camera);",
                  )
                  .replace(
                    "  const reduced =",
                    "  const qaStart=performance.now();\n  const reduced =",
                  )
                  .replace(
                    marker,
                    `  const qa=window.__lagoonQA={camera,look,desiredLook,renderer,islands,cat,npcs,chichiCarrier,itemGroups,THREE,scene,pickDrop,pointer,raycaster,ground,viewport,sync,perform,performResident,faceCamera,spa,chill,court,cinema,courtFoods,bikiniLife,enterCourt,exitCourt,getCourtCamera:()=>courtCamera,residentPlay,callbacks,getDragging:()=>draggingCat?.catId,reviewView:(x,z,d)=>{desiredLook.set(x,0,z);desiredDistance=d;azimuth=.15;},constructorMs:performance.now()-qaStart,focused:()=>focused,getOperation:()=>operation,isVisible:()=>worldVisible,getDistance:()=>distance,getDesiredDistance:()=>desiredDistance,frames:0,resizes:0,black:[],audit:false,measure:false,cpu:[]};
  const draw=renderer.render.bind(renderer);qa.drawFrame=()=>draw(scene,camera);renderer.render=(...args)=>{if(qa.drawPaused)return;draw(...args);qa.frames++;};
  const size=renderer.setSize.bind(renderer);renderer.setSize=(...args)=>{qa.resizes++;return size(...args);};
  const audit=new MutationObserver(()=>{if(!qa.audit)return;const gl=renderer.getContext(),p=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);if(p[0]+p[1]+p[2]===0)qa.black.push(Array.from(p));});audit.observe(renderer.domElement,{attributes:true,attributeFilter:['width','height']});
  return {\n    perform,`,
                  ),
                loader: "js",
              };
            });
            b.onLoad({ filter: /\/public\/app\.js$/ }, () => ({
              contents: (
                "import {placeItem as qaPlace,findSpace as qaSpace} from './economy.js'; window.__diamondQA={placeItem:qaPlace,findSpace:qaSpace};\n" +
                "import {storeSculptCache as qaStoreGraphics} from './sculpt-cache.js';\n" +
                readPublic("app.js")
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
            if (baseline)
              b.onLoad({ filter: /\/public\/.*\.js$/ }, (args) => ({
                contents: readPublic(path.basename(args.path)),
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

    await page.locator('[data-biome="aquarium"]').tap();
    const tankIds = [
      "aquarium-aurora",
      "aquarium-pearl",
      "aquarium-coral",
      "aquarium-lilac",
      "aquarium-sunrise",
    ];
    await page.waitForFunction(
      (ids) =>
        ids.every((id) => __lagoonQA.itemGroups.get(id)?.userData.aquarium) &&
        !__lagoonQA.islands.get("aquarium").userData.lowOnly,
      tankIds,
    );
    const report = {};
    report.scene = await page.evaluate(() => {
      const q = __lagoonQA,
        g = q.islands.get("aquarium"),
        tanks = [...q.itemGroups.values()].filter(
          (o) => o.userData.aquarium === true,
        );
      return {
        legacyShopAquarium: [...q.itemGroups.values()]
          .filter((g) => g.userData.placement?.item === "coaster-lagoon")
          .map((g) => ({
            visible: g.visible,
            fish: g.userData.aquarium?.userData.fishCount,
          })),
        tanks: tanks.length,
        fish: tanks.reduce((n, t) => n + t.userData.tank.fish, 0),
        fishDraws: tanks.reduce(
          (n, t) => n + t.userData.stats.instancedFishDraws,
          0,
        ),
        roofOpacity: g.userData.roof.material.opacity,
        stats: g.userData.stats,
        locals: [...q.npcs.values()].filter(
          (n) => n.profile.biome === "aquarium",
        ).length,
        constructorMs: q.constructorMs,
      };
    });
    assert.equal(report.scene.tanks, 5);
    assert.equal(report.scene.legacyShopAquarium.length, 1);
    assert.equal(report.scene.legacyShopAquarium[0].fish, 12);
    assert.equal(report.scene.fish, 50);
    assert.ok(report.scene.locals >= 6);
    if (process.env.CHICHI_DRAW_AUDIT) {
      await page.evaluate((stress) => {
        if (stress) {
          __lagoonQA.callbacks.onFocus?.("homestead");
          document.querySelector('[data-biome="homestead"]').click();
          __lagoonQA.reviewView(-250, -55, 85);
        } else __lagoonQA.reviewView(-335, 95, 90);
      }, !!process.env.CHICHI_SCENE_STRESS);
      await page.waitForTimeout(6000);
      const audit = await page.evaluate(async () => {
        const q = __lagoonQA;
        q.drawPaused = true;
        for (const n of q.npcs.values())
          n.manualUntil = performance.now() + 1e9;
        await new Promise((r) => setTimeout(r, 500));
        const rows = new Map();
        q.scene.traverse((mesh) => {
          if (!mesh.isMesh && !mesh.isPoints) return;
          const before = mesh.onBeforeRender;
          mesh.onBeforeRender = function (...args) {
            before.apply(this, args);
            let root = this;
            while (root.parent && root.parent !== q.scene) root = root.parent;
            const key =
              root.userData.placement?.item ||
              root.userData.biomeId ||
              (root === q.chichiCarrier
                ? "chichi"
                : [...q.npcs.values()].find((n) => n.carrier === root)?.profile
                    .id) ||
              root.name ||
              root.type;
            const row = rows.get(key) || {
              calls: 0,
              triangles: 0,
              materials: {},
            };
            row.calls++;
            const count =
              ((this.geometry.index?.count ||
                this.geometry.attributes.position.count) /
                3) *
              (this.count ?? 1);
            row.triangles += count;
            row.materials[this.material.name || this.material.type] =
              (row.materials[this.material.name || this.material.type] || 0) +
              1;
            rows.set(key, row);
          };
        });
        const cats = [];
        q.scene.traverse((o) => {
          if (o.userData.renderBatches) cats.push(o);
        });
        const snapshot = () => ({ ...q.renderer.info.render });
        for (const cat of cats) {
          cat.userData.renderBatches.setEnabled(false);
        }
        q.drawFrame();
        const originalDraws = snapshot();
        for (const cat of cats) {
          cat.userData.renderBatches.setEnabled(true);
        }
        rows.clear();
        q.drawFrame();
        const gl = q.renderer.getContext();
        gl.finish();
        return {
          look: q.look.toArray(),
          camera: q.camera.position.toArray(),
          rows: [...rows].sort((a, b) => b[1].triangles - a[1].triangles),
          render: { ...q.renderer.info.render },
          samePoseComparison: {
            original: originalDraws,
            batched: snapshot(),
            cats: cats.length,
          },
          placements: [...q.itemGroups.values()]
            .filter((g) => !g.userData.permanent && g.userData.placement)
            .map((g) => ({
              id: g.userData.placement.id,
              item: g.userData.placement.item,
              visible: g.visible,
            })),
          gpu: gl.getParameter(gl.RENDERER),
        };
      });
      fs.writeFileSync(
        path.join(review, "draw-audit.json"),
        JSON.stringify(audit, null, 2),
      );
      console.log(JSON.stringify(audit, null, 2));
      return;
    }
    if (process.env.CHICHI_PERF_ONLY) {
      await page.evaluate(() => {
        const q = __lagoonQA;
        q.reviewView(-335, 95, 130);
        q.drawPaused = false;
      });
      await page.waitForTimeout(5000);
      const cdp = await context.newCDPSession(page);
      await cdp.send("Profiler.enable");
      await cdp.send("Profiler.setSamplingInterval", { interval: 500 });
      await page.evaluate(() => {
        const q = __lagoonQA,
          gl = q.renderer.getContext(),
          sub = gl.bufferSubData.bind(gl);
        q.uploads = { calls: 0, bytes: 0 };
        gl.bufferSubData = (...a) => {
          q.uploads.calls++;
          q.uploads.bytes += a[2]?.byteLength || 0;
          return sub(...a);
        };
        q.cpu = [];
        q.measure = true;
        q.startFrames = q.frames;
      });
      await cdp.send("Profiler.start");
      await page.waitForTimeout(10000);
      const gpuPhase = await page.evaluate(() => {
        const q = __lagoonQA;
        return {
          frames: q.frames - q.startFrames,
          uploads: { ...q.uploads },
          draws: q.renderer.info.render.calls,
          triangles: q.renderer.info.render.triangles,
        };
      });
      await cdp.send("Profiler.stop");
      await page.evaluate(() => {
        const q = __lagoonQA;
        q.drawPaused = true;
        q.cpu = [];
      });
      await cdp.send("Profiler.start");
      await page.waitForTimeout(10000);
      const profile = await cdp.send("Profiler.stop");
      const perf = await page.evaluate(() => {
        const q = __lagoonQA,
          a = q.cpu.sort((a, b) => a - b),
          percent = (p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];
        q.measure = false;
        const g = __lagoonSaveQA.getGame(),
          times = [];
        for (let i = 0; i < 50; i++) {
          const t = performance.now();
          q.sync(g);
          times.push(performance.now() - t);
        }
        return {
          frames: q.frames - q.startFrames,
          cpu: {
            samples: a.length,
            median: percent(0.5),
            p95: percent(0.95),
            p99: percent(0.99),
            max: a.at(-1),
          },
          sync: {
            mean: times.reduce((s, v) => s + v, 0) / times.length,
            max: Math.max(...times),
          },
          uploads: q.uploads,
          draws: q.renderer.info.render.calls,
          triangles: q.renderer.info.render.triangles,
          geometries: q.renderer.info.memory.geometries,
          textures: q.renderer.info.memory.textures,
          pixelRatio: q.renderer.getPixelRatio(),
          size: [q.renderer.domElement.width, q.renderer.domElement.height],
        };
      });
      fs.writeFileSync(
        path.join(review, "cpu-profile.json"),
        JSON.stringify(profile),
      );
      fs.writeFileSync(
        path.join(review, "performance.json"),
        JSON.stringify(
          { ...report, perf, gpuPhase, errors, httpErrors },
          null,
          2,
        ),
      );
      console.log(JSON.stringify({ perf, gpuPhase }, null, 2));
      await page.evaluate(() => __lagoonQA.drawFrame());
      await page.screenshot({ path: path.join(review, "aquarium-phone.png") });
      return;
    }
    await page.evaluate(() => {
      const q = __lagoonQA;
      q.court.clear();
      for (const n of q.npcs.values()) n.manualUntil = performance.now() + 1e8;
      q.reviewView(-335, 95, 130);
    });
    await page.waitForFunction(
      () => Math.abs(__lagoonQA.getDistance() - 130) < 0.3,
    );
    await page.evaluate(() => __lagoonQA.drawFrame());
    await page.screenshot({ path: path.join(review, "aquarium-phone.png") });
    console.log("Mobile palace and all 50 fish rendered.");
    await page.evaluate(() => (__lagoonQA.drawPaused = true));
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.evaluate(() => __lagoonQA.reviewView(-335, 95, 110));
    await page.waitForFunction(
      () => Math.abs(__lagoonQA.getDistance() - 110) < 0.3,
    );
    await page.evaluate(() => __lagoonQA.drawFrame());
    await page.screenshot({
      path: path.join(review, "aquarium-palace-desktop.png"),
    });
    await page.evaluate(() => __lagoonQA.enterCourt("aquarium-pearl", 0));
    await page.waitForFunction(
      () =>
        Math.abs(__lagoonQA.getDistance() - __lagoonQA.getDesiredDistance()) <
        0.3,
    );
    console.log("Glass interior camera entered.");
    const before = await page.evaluate(() => __lagoonQA.desiredLook.toArray());
    await page.waitForFunction(
      (before) =>
        __lagoonQA.desiredLook.distanceTo(
          new __lagoonQA.THREE.Vector3(...before),
        ) > 0.01,
      before,
    );
    const after = await page.evaluate(() => __lagoonQA.desiredLook.toArray());
    assert.notDeepEqual(before, after);
    await page.evaluate(() => __lagoonQA.drawFrame());
    await page.screenshot({
      path: path.join(review, "aquarium-plush-kitten-fish.png"),
    });
    const clickPoint = await page.evaluate(() => {
      const q = __lagoonQA,
        t = q.itemGroups.get("aquarium-pearl");
      q.scene.updateMatrixWorld(true);
      const p = t.localToWorld(
        t.userData.fishPoint(0, performance.now() / 1000),
      );
      p.project(q.camera);
      const r = q.renderer.domElement.getBoundingClientRect();
      return {
        x: r.left + ((p.x + 1) * r.width) / 2,
        y: r.top + ((1 - p.y) * r.height) / 2,
      };
    });
    report.raycast = await page.evaluate((p) => {
      const q = __lagoonQA;
      q.pointer({ clientX: p.x, clientY: p.y });
      return q.raycaster
        .intersectObjects(
          [...q.itemGroups.values()].filter((g) => g.visible),
          true,
        )
        .filter((h) => h.object.userData.aquariumFish)
        .map((h) => ({ instance: h.instanceId, name: h.object.name }))
        .slice(0, 4);
    }, clickPoint);
    assert.ok(report.raycast.length);
    console.log("Fish camera tracking and instanced raycast passed.");
    // Real touch selection, including instance IDs through transparent glass.
    await page.touchscreen.tap(clickPoint.x, clickPoint.y);
    await page.waitForFunction(
      () => __lagoonQA.getCourtCamera()?.fishIndex !== undefined,
    );
    await page.evaluate(() => {
      const q = __lagoonQA;
      q.exitCourt();
      q.reviewView(-335, 95, 130);
    });
    await page.waitForFunction(
      () =>
        !__lagoonQA.getCourtCamera() &&
        Math.abs(__lagoonQA.getDistance() - 130) < 0.3,
    );
    assert.equal(
      await page.evaluate(
        () => __lagoonQA.islands.get("aquarium").userData.roofRibs.visible,
      ),
      true,
    );
    report.visitors = await page.evaluate(() => {
      const q = __lagoonQA,
        ids = [
          "luna",
          "moti",
          ...Array.from(q.npcs.keys()).filter((id) =>
            id.startsWith("aquarium-"),
          ),
        ],
        tanks = [
          "aquarium-aurora",
          "aquarium-pearl",
          "aquarium-coral",
          "aquarium-lilac",
          "aquarium-sunrise",
        ];
      q.court.clear();
      const starts = ids.map((id, i) =>
        q.performResident(id, {
          action: "play",
          mood: "happy",
          activityId: tanks[i % 5],
        }),
      );
      let paw = false,
        watch = false,
        minDistance = Infinity;
      for (let i = 0; i < 10000 && q.court.visits.size; i++) {
        q.court.step(1 / 30, i / 30);
        const all = [...q.court.visits.values()];
        for (let j = 0; j < all.length; j++) {
          const v = all[j];
          if (v.phase === "watch") {
            watch = true;
            paw ||= v.reaction?.paw > 0.3;
            if (v.holding) throw Error("Aquarium visitor has a food prop");
          }
          for (let k = j + 1; k < all.length; k++)
            if (all[k].biome === v.biome)
              minDistance = Math.min(
                minDistance,
                Math.hypot(
                  v.position.x - all[k].position.x,
                  v.position.z - all[k].position.z,
                ) -
                  v.radius -
                  all[k].radius,
              );
        }
      }
      return {
        starts,
        paw,
        watch,
        minDistance,
        remaining: q.court.visits.size,
      };
    });
    assert.ok(report.visitors.starts.every(Boolean));
    assert.ok(report.visitors.paw && report.visitors.watch);
    assert.equal(report.visitors.remaining, 0);
    assert.ok(report.visitors.minDistance > -0.001);
    console.log("Six visitors completed their visits without overlaps.");
    const social = [];
    for (const ride of [false, true]) {
      await page.evaluate((ride) => {
        const q = __lagoonQA;
        q.court.clear();
        const a = q.npcs.get("luna"),
          b = q.npcs.get("moti");
        a.carrier.position.set(-335, 0.2, 126);
        b.carrier.position.set(-331, 0.2, 126);
        q.socialRoll = ride ? 0.2 : 0.8;
        try {
          q.performResident("luna", {
            action: "meet",
            friendId: "moti",
            mood: "happy",
          });
        } finally {
          delete q.socialRoll;
        }
        q.reviewView(-332, 124, 15);
      }, ride);
      await page.waitForFunction(
        () => __lagoonQA.residentPlay.get("luna")?.phase === "activity",
      );
      await page.evaluate(() => {
        __lagoonQA.residentPlay.get("luna").activityStart =
          performance.now() - 8000;
      });
      await page.waitForTimeout(400);
      social.push(
        await page.evaluate(() => {
          const q = __lagoonQA,
            v = q.residentPlay.get("luna");
          return {
            kind: v?.socialKind,
            a: q.npcs.get("luna").carrier.position.toArray(),
            b: q.npcs.get("moti").carrier.position.toArray(),
            seat: v?.social?.seat,
          };
        }),
      );
      await page.evaluate(() => __lagoonQA.drawFrame());
      await page.screenshot({
        path: path.join(
          review,
          ride ? "friendship-piggyback.png" : "friendship-play.png",
        ),
      });
      await page.evaluate(() => __lagoonQA.residentPlay.clear());
    }
    assert.equal(social[0].kind, "play");
    assert.equal(social[1].kind, "piggyback");
    assert.ok(Math.abs(social[1].a[1] - social[1].b[1]) > 0.4);
    report.social = social;
    // Exercise the actual phone gesture and application callbacks, not just
    // direct runtime calls, for both a resident and Chichi.
    const cdp = await context.newCDPSession(page);
    async function dropFriend(actorId, targetId = "moti") {
      const heroMeeting = actorId === "chichi" || targetId === "chichi";
      await page.evaluate(
        ({ actorId, targetId }) => {
          const q = __lagoonQA;
          q.court.clear();
          q.residentPlay.clear();
          q.socialRoll = 0.2;
          q.chichiCarrier.position.set(
            targetId === "chichi" ? -331 : actorId === "chichi" ? -335 : -342,
            0.2,
            126,
          );
          if (actorId !== "chichi")
            q.npcs.get(actorId).carrier.position.set(-335, 0.2, 126);
          q.npcs
            .get("moti")
            .carrier.position.set(
              targetId === "chichi" ? -325 : -331,
              0.2,
              126,
            );
          q.reviewView(-333, 126, 14);
        },
        { actorId, targetId },
      );
      await page.waitForFunction(
        () => Math.abs(__lagoonQA.getDistance() - 14) < 0.1,
      );
      const points = await page.evaluate(
        (ids) => {
          const q = __lagoonQA;
          q.scene.updateMatrixWorld(true);
          q.camera.updateMatrixWorld(true);
          const r = q.renderer.domElement.getBoundingClientRect();
          return ids.map((id) => {
            const model = id === "chichi" ? q.cat : q.npcs.get(id).model;
            const p = model.userData.head
              .getWorldPosition(new q.THREE.Vector3())
              .project(q.camera);
            return {
              x: r.left + ((p.x + 1) * r.width) / 2,
              y: r.top + ((1 - p.y) * r.height) / 2,
            };
          });
        },
        [actorId, targetId],
      );
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ ...points[0], id: 1 }],
      });
      assert.equal(
        await page.evaluate(() => __lagoonQA.getDragging()),
        actorId,
      );
      for (let i = 1; i <= 8; i++) {
        const t = i / 8;
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            {
              x: points[0].x + (points[1].x - points[0].x) * t,
              y: points[0].y + (points[1].y - points[0].y) * t,
              id: 1,
            },
          ],
        });
      }
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await page.waitForFunction(
        ({ actorId, heroMeeting }) =>
          (heroMeeting
            ? __lagoonQA.getOperation()
            : __lagoonQA.residentPlay.get(actorId)
          )?.stage === "activity" ||
          (!heroMeeting &&
            __lagoonQA.residentPlay.get(actorId)?.phase === "activity"),
        { actorId, heroMeeting },
      );
      const encounter = await page.evaluate(
        ({ actorId, heroMeeting }) => {
          const v = heroMeeting
            ? __lagoonQA.getOperation()
            : __lagoonQA.residentPlay.get(actorId);
          return { kind: v.socialKind, friend: v.decision.friendId };
        },
        { actorId, heroMeeting },
      );
      assert.equal(encounter.kind, "piggyback");
      assert.equal(
        encounter.friend,
        targetId === "chichi" ? actorId : targetId,
      );
      await page.evaluate(
        ({ actorId, heroMeeting }) => {
          const q = __lagoonQA,
            v = heroMeeting ? q.getOperation() : q.residentPlay.get(actorId);
          v.activityStart = performance.now() - 8000;
        },
        { actorId, heroMeeting },
      );
      await page.waitForTimeout(150);
      await page.evaluate(() => __lagoonQA.drawFrame());
      await page.screenshot({
        path: path.join(
          review,
          actorId + "-onto-" + targetId + "-touch-piggyback.png",
        ),
      });
      await page.evaluate(
        ({ actorId, heroMeeting }) => {
          const q = __lagoonQA,
            v = heroMeeting ? q.getOperation() : q.residentPlay.get(actorId);
          v.activityStart = performance.now() - 19000;
          delete q.socialRoll;
        },
        { actorId, heroMeeting },
      );
      await page.waitForFunction(
        ({ actorId, heroMeeting }) =>
          heroMeeting
            ? !__lagoonQA.getOperation()
            : !__lagoonQA.residentPlay.get(actorId),
        { actorId, heroMeeting },
      );
      console.log("Actual touch drop passed:", actorId, "onto", targetId);
      return { actor: actorId, target: targetId, ...encounter };
    }
    report.touchDrops = [
      await dropFriend("luna"),
      await dropFriend("chichi"),
      await dropFriend("luna", "chichi"),
    ];
    await cdp.detach();
    await page.waitForFunction(
      () => __lagoonSaveQA.getGame().social.relationships.moti.meetings > 0,
    );
    const beforeReload = await page.evaluate(() => {
      const g = __lagoonSaveQA.getGame();
      return {
        placements: g.placements,
        adoption: g.adoption,
        unlocked: g.unlocked,
        friend: g.social.relationships.moti,
      };
    });
    await page.evaluate(() => {
      __lagoonQA.exitCourt();
      __lagoonQA.reviewView(-335, 95, 110);
    });
    await page.waitForTimeout(500);
    report.renderer = await page.evaluate(() => {
      const q = __lagoonQA;
      return {
        draws: q.renderer.info.render.calls,
        triangles: q.renderer.info.render.triangles,
        geometries: q.renderer.info.memory.geometries,
        textures: q.renderer.info.memory.textures,
        frames: q.frames,
        contextLost: q.renderer.getContext().isContextLost(),
      };
    });
    assert.equal(report.renderer.contextLost, false);
    assert.ok(
      await page.evaluate(() =>
        __lagoonSaveQA.getGame().unlocked.includes("aquarium"),
      ),
    );
    await page.reload();
    await page.waitForFunction(
      () => window.__lagoonQA && window.__lagoonSaveQA?.cloud.editable,
    );
    assert.ok(
      await page.evaluate(() =>
        __lagoonSaveQA.getGame().unlocked.includes("aquarium"),
      ),
    );
    const afterReload = await page.evaluate(() => {
      const g = __lagoonSaveQA.getGame();
      return {
        placements: g.placements,
        adoption: g.adoption,
        unlocked: g.unlocked,
        friend: g.social.relationships.moti,
      };
    });
    assert.deepEqual(afterReload, beforeReload);
    assert.deepEqual(errors, []);
    assert.deepEqual(httpErrors, []);
    fs.writeFileSync(
      path.join(review, "aquarium-report.json"),
      JSON.stringify({ ...report, errors, httpErrors }, null, 2),
    );
    console.log(JSON.stringify(report, null, 2));
    console.log(
      "Aquarium, ordinary visitors, fish camera, shared saves and friendship animations passed.",
    );
  } finally {
    await browser?.close();
    local.stop();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
