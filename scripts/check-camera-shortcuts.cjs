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
    g.inventory["adoption-center"] = 1;
    g.inventory["slide-glass-corkscrew"] = 1;
    g.adoption.cats = ["adopt-crumb", "adopt-doughnut"].map((id) => ({
      id,
      homeBiome: "homestead",
    }));
    g.progression.xp = xpForLevel(20);
    g.lastVisit = gameDay(now);
    g.progression.lastVisitDay = gameDay(now);
    g.catDestinations = {};
    g.placements.push({
      id: "saved-player-hotdog",
      item: "business-hotdog",
      biome: "homestead",
      x: -12,
      z: -14,
      rotation: 0,
      readyAt: 0,
    });
    const token = crypto.randomBytes(32).toString("hex"),
      headers = {
        "Content-Type": "application/json",
        "X-Chichi-Save-Token": token,
      },
      base = local.base;
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
    seed.game = (
      await (await fetch(base + "/api/save", { headers })).json()
    ).game;
    const output = await build({
      entryPoints: [root + "/public/app.js"],
      bundle: true,
      format: "esm",
      write: false,
      plugins: [
        {
          name: "qa-camera",
          setup(b) {
            b.onLoad({ filter: /\/public\/world\.js$/ }, () => {
              const source = fs.readFileSync(root + "/public/world.js", "utf8"),
                marker = "  return {\n    perform,";
              assert.ok(source.includes(marker));
              return {
                contents: source.replace(
                  marker,
                  `
  const qa = window.__cameraQA = {camera, look, desiredLook, renderer, islands, cat, npcs, chichiCarrier, itemGroups, THREE, faceCamera,
    focused:()=>focused, target:()=>followedCatId, distance:()=>distance, desiredDistance:()=>desiredDistance, elevation:()=>elevation,
    enterCourt, exitCourt, view:()=>({focused,viewingOverview,overviewElevation}), frames:0};
  const draw=renderer.render.bind(renderer);renderer.render=(...args)=>{if(qa.drawPaused)return;draw(...args);qa.frames++;};
  return {\n    perform,`,
                ),
                loader: "js",
              };
            });
            b.onLoad({ filter: /\/public\/app\.js$/ }, () => ({
              contents: fs
                .readFileSync(root + "/public/app.js", "utf8")
                .replace(
                  "persist();\nrenderGame();",
                  "window.__cameraSave={cloud,getGame:()=>game,commit,beginPlacement,getWorld:()=>world};\npersist();\nrenderGame();",
                ),
              loader: "js",
            }));
          },
        },
      ],
    });
    browser = await chromium.launch({
      executablePath: process.env.CHICHI_CHROMIUM || "/usr/bin/chromium",
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
    let page = await context.newPage();
    const errors = [];
    page.setDefaultTimeout(120000);
    page.on("pageerror", (e) => {
      errors.push(e.message);
      console.log("PAGE ERROR", e.message);
    });
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await context.addInitScript(
      ({ g, token }) => {
        const nativeFetch = window.fetch.bind(window);
        window.__saveWire = [];
        window.fetch = (url, options = {}) => {
          if (options.method === "PUT")
            window.__saveWire.push({
              keepalive: options.keepalive,
              size: options.body.byteLength || options.body.length,
              encoding: options.headers?.["Content-Encoding"],
            });
          return nativeFetch(url, options);
        };
        if (!localStorage.getItem("chichi-world-v2")) {
          localStorage.setItem("chichi-world-v2", JSON.stringify(g));
          localStorage.setItem("chichi-recovery-code", token);
          localStorage.setItem(
            "chichi-cloud-save",
            JSON.stringify({ token, revision: 1, dirty: false }),
          );
        }
      },
      { g: seed.game, token },
    );
    await context.route("**/dist/app.js?*", (r) =>
      r.fulfill({
        contentType: "text/javascript",
        body: output.outputFiles[0].text,
      }),
    );
    await context.route("**/api/status", (r) =>
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
      () => window.__cameraQA && window.__cameraSave?.cloud.editable,
    );
    await page.locator('[data-biome="homestead"]').tap();
    await page.locator("#map").scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        !__cameraQA.islands.get("homestead").userData.lowOnly &&
        __cameraQA.npcs.has("adopt-crumb") &&
        __cameraQA.itemGroups.has("saved-player-hotdog"),
    );
    await page.evaluate(() => {
      __cameraQA.drawPaused = true;
    });
    console.log(
      "Loaded the actual mobile world with a saved building, a tiny kitten and a giant cat.",
    );
    await page.locator("#camera-island").tap();
    await page.waitForFunction(
      () =>
        Math.abs(__cameraQA.distance() - __cameraQA.desiredDistance()) < 0.1 &&
        Math.abs(__cameraQA.elevation() - 1.03) < 0.001,
    );
    const readOverview = () =>
      page.evaluate(() => {
        const q = __cameraQA,
          b = q.islands.get(q.focused()),
          r = 46.6 * Math.SQRT2;
        q.camera.updateMatrixWorld();
        let max = 0;
        for (let i = 0; i < 96; i++) {
          const a = (i / 96) * Math.PI * 2,
            p = new q.THREE.Vector3(
              -250 + Math.cos(a) * r,
              0,
              -55 + Math.sin(a) * r,
            ).project(q.camera);
          max = Math.max(max, Math.abs(p.x), Math.abs(p.y));
        }
        return { max, focused: q.focused(), follow: q.faceCamera.enabled };
      });
    const fit = await readOverview();
    assert.ok(fit.max < 0.91, JSON.stringify(fit));
    assert.equal(fit.focused, "homestead");
    assert.equal(fit.follow, false);
    console.log("Whole giant island fits portrait:", fit);
    await page.locator("#camera-all").tap();
    await page.locator("#camera-island").tap();
    assert.equal(
      await page.evaluate(() => __cameraQA.focused()),
      "homestead",
      "world view remembers the current island",
    );
    const portraits = [];
    for (const id of [
      "adopt-crumb",
      "adopt-doughnut",
      "adopt-crumb",
      "adopt-doughnut",
    ]) {
      await page.evaluate((id) => {
        const q = __cameraQA,
          list = [...q.npcs].filter(
            ([candidate, n]) =>
              n.carrier.parent &&
              n.model.userData.head &&
              candidate !== (q.faceCamera.enabled ? q.target() : null),
          );
        const index = list.findIndex(([candidate]) => candidate === id);
        if (index < 0) throw Error("Missing camera target " + id);
        window.__realRandom = Math.random;
        Math.random = () => (index + 0.1) / list.length;
      }, id);
      await page.locator("#camera-random-cat").tap();
      await page.evaluate(() => {
        Math.random = window.__realRandom;
      });
      await page.waitForFunction((id) => {
        const q = __cameraQA;
        if (!q.faceCamera.enabled || q.target() !== id) return false;
        q.camera.updateMatrixWorld();
        const p = q.faceCamera
          .facePoint(new q.THREE.Vector3())
          .project(q.camera);
        return Math.hypot(p.x, p.y) < 0.001;
      }, id);
      const state = await page.evaluate(() => {
        const q = __cameraQA,
          head = q.npcs.get(q.target()).model.userData.head;
        return {
          id: q.target(),
          distance: q.camera.position.distanceTo(
            q.faceCamera.facePoint(new q.THREE.Vector3()),
          ),
          scale: head.getWorldScale(new q.THREE.Vector3()).toArray(),
        };
      });
      assert.equal(
        await page.locator("#camera-random-cat").getAttribute("aria-pressed"),
        "true",
      );
      assert.equal(
        await page.locator("#chichi-camera").getAttribute("aria-pressed"),
        "false",
      );
      portraits.push(state);
    }
    console.log("Tiny and giant face tracking:", JSON.stringify(portraits));
    for (let i = 0; i < 12; i++) {
      const before = await page.evaluate(() => __cameraQA.target());
      await page.locator("#camera-random-cat").tap();
      assert.notEqual(await page.evaluate(() => __cameraQA.target()), before);
    }
    console.log(
      "Twelve additional random switches never immediately repeat a cat.",
    );
    await page.locator("#care-open").tap();
    await page.locator("#chichi-camera").tap();
    await page.waitForFunction(
      () => __cameraQA.faceCamera.enabled && __cameraQA.target() === "chichi",
    );
    assert.equal(
      await page.locator("#chichi-camera").getAttribute("aria-pressed"),
      "true",
    );
    await page.locator("#camera-island").tap();
    assert.equal(await page.locator("#camera-follow-exit").isVisible(), false);
    await page.locator('[data-biome="homestead"]').tap();
    await page.locator("#map").scrollIntoViewIfNeeded();
    await page.locator("#camera-island").tap();
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForFunction(
      () =>
        __cameraQA.camera.aspect > 1 &&
        Math.abs(__cameraQA.distance() - __cameraQA.desiredDistance()) < 0.1,
    );
    const landscape = await readOverview();
    assert.ok(landscape.max < 0.91, JSON.stringify(landscape));
    console.log("Phone rotation refits without cropping:", landscape);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(
      () =>
        __cameraQA.camera.aspect < 1 &&
        Math.abs(__cameraQA.distance() - __cameraQA.desiredDistance()) < 0.1,
    );
    await page.evaluate(() => {
      __cameraQA.frames = 0;
      __cameraQA.drawPaused = false;
    });
    await page.waitForFunction(() => __cameraQA.frames > 2);
    await page.screenshot({
      path: path.join(review, "island-overview-phone.png"),
    });
    const layout = await page.evaluate(() =>
      [...document.querySelectorAll(".map-controls button")].map((b) => {
        const r = b.getBoundingClientRect();
        return {
          id: b.id,
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
          height: r.height,
        };
      }),
    );
    for (const b of layout) {
      assert.ok(b.left >= 0 && b.right <= 390, JSON.stringify(b));
      assert.ok(b.height >= 44, JSON.stringify(b));
    }
    const bubbleOverlap = await page.evaluate(() => {
      const bubble = document.getElementById("bubble").getBoundingClientRect();
      return (
        Math.max(
          ...[...document.querySelectorAll(".map-controls button")].map(
            (b) => b.getBoundingClientRect().bottom,
          ),
        ) - bubble.top
      );
    });
    assert.ok(
      bubbleOverlap <= 0,
      "speech bubble overlaps controls by " + bubbleOverlap,
    );
    console.log("All top controls retain 44px touch targets without overlap.");
    await page.evaluate(() => {
      __cameraQA.drawPaused = true;
      __cameraSave.getWorld().followRandomCat();
    });
    // Removing a followed resident during shared-world sync must restore a valid camera.
    await page.evaluate(() => {
      const q = __cameraQA,
        id = [...q.npcs.keys()].find((id) => id.startsWith("adopt-"));
      const n = q.npcs.get(id),
        others = [...q.npcs];
      // Select this real resident through the public random-camera action.
      const candidates = others.filter(
          ([candidate]) => candidate !== q.target(),
        ),
        i = candidates.findIndex(([candidate]) => candidate === id);
      if (i >= 0) {
        const old = Math.random;
        Math.random = () => (i + 0.1) / candidates.length;
        __cameraSave.getWorld().followRandomCat();
        Math.random = old;
      }
      const game = structuredClone(__cameraSave.getGame());
      game.adoption.cats = game.adoption.cats.filter(
        (c) => c.id !== q.target(),
      );
      __cameraSave.getWorld().sync(game);
    });
    assert.equal(
      await page.evaluate(() => __cameraQA.faceCamera.enabled),
      false,
    );
    // Camera actions never edit saved construction data; reload through the actual local vault.
    const saved = await (await fetch(base + "/api/save", { headers })).json();
    assert.deepEqual(saved.game.placements, seed.game.placements);
    await page.reload();
    await page.waitForFunction(
      () =>
        window.__cameraQA && __cameraQA.itemGroups.has("saved-player-hotdog"),
    );
    const after = await page.evaluate(() => __cameraSave.getGame().placements);
    assert.deepEqual(after, seed.game.placements);
    const expected = structuredClone(seed.game.placements);
    for (const item of ["adoption-center", "slide-glass-corkscrew"]) {
      await page.evaluate(() => {
        __cameraQA.drawPaused = true;
      });
      await page.locator('[data-biome="homestead"]').tap();
      await page.locator("#map").scrollIntoViewIfNeeded();
      await page.evaluate((item) => __cameraSave.beginPlacement(item), item);
      await page.locator("#build-biome").selectOption("homestead");
      const before = await page.evaluate(() => __saveWire.length);
      await page.locator("#build-confirm").tap();
      await page.waitForFunction((count) => __saveWire.length > count, before);
      const placed = await page.evaluate(() =>
        __cameraSave.getGame().placements.at(-1),
      );
      assert.equal(placed.item, item);
      expected.push(placed);
      const wire = await page.evaluate(() => __saveWire.at(-1));
      assert.equal(wire.keepalive, true);
      assert.ok(wire.size < 60000);
      assert.equal(wire.encoding, "gzip");
      // Close the phone page immediately after starting its native keepalive upload.
      await page.close();
      let remote;
      for (let attempt = 0; attempt < 100; attempt++) {
        remote = await (await fetch(base + "/api/save", { headers })).json();
        if (remote.game.placements.some((p) => p.id === placed.id)) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.deepEqual(
        remote.game.placements,
        expected,
        "second device must see the placed building after closing the phone",
      );
      page = await context.newPage();
      page.setDefaultTimeout(120000);
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base);
      await page.waitForFunction(
        () =>
          window.__cameraQA &&
          window.__cameraSave?.cloud.editable &&
          !__cameraSave.cloud.dirty,
      );
      const restored = await page.evaluate(
        () => __cameraSave.getGame().placements,
      );
      assert.deepEqual(
        restored,
        expected,
        "phone reopen must keep exact IDs, coordinates and deadlines without duplicates",
      );
      console.log(
        "Mobile place → close → second-device read → reopen:",
        item,
        wire,
      );
    }
    assert.deepEqual(errors, []);
    console.log(
      "Camera transitions, removed-target recovery, existing Chichi mode, seam-free lawn and saved-building reload passed. No browser errors.",
    );
  } finally {
    await browser?.close();
    local.stop();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
