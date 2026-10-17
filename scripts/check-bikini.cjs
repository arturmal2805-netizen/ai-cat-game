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
    g.unlocked.push("bikini");
    g.progression.xp = xpForLevel(8);
    g.lastVisit = gameDay(now);
    g.progression.lastVisitDay = gameDay(now);
    g.coins = 19000;
    g.catPosition = { biome: "bikini", x: 0, z: 27 };
    g.catDestinations = { luna: "bikini", moti: "bikini" };
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
                "import {placeItem as qaPlace,findSpace as qaSpace} from './economy.js'; window.__diamondQA={placeItem:qaPlace,findSpace:qaSpace};\n" +
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

    await page.locator('[data-biome="bikini"]').tap();
    await page.waitForFunction(
      () =>
        __lagoonQA.itemGroups.get("bikini-krusty")?.userData.built &&
        __lagoonQA.itemGroups.get("bikini-sponge")?.userData.reserve &&
        !__lagoonQA.islands.get("bikini").userData.lowOnly,
    );
    await page.evaluate(() => {
      const q = __lagoonQA;
      q.court.clear();
      for (const n of q.npcs.values()) n.manualUntil = performance.now() + 1e8;
      const start = q.court.start;
      q.court.start = (o) =>
        o.catId === "bikini-patrick-guest" && q.pausePatrick ? null : start(o);
      q.pausePatrick = true;
      q.reviewView(-225, 80, 78);
    });
    await page.waitForFunction(
      () => Math.abs(__lagoonQA.getDistance() - 78) < 0.3,
    );
    await page.screenshot({ path: path.join(review, "bikini-city-phone.png") });
    await page.evaluate(() => {
      __lagoonQA.drawPaused = true;
    });
    console.log("Mobile sky city ready, both characters and restaurant exist.");
    async function tapCharacter(id) {
      await page.evaluate((id) => {
        const q = __lagoonQA,
          g = q.itemGroups.get(id);
        q.reviewView(g.position.x, g.position.z + 1, 22);
      }, id);
      await page.waitForFunction(
        () => Math.abs(__lagoonQA.getDistance() - 22) < 0.3,
      );
      const point = await page.evaluate((id) => {
        const q = __lagoonQA,
          g = q.itemGroups.get(id),
          p = g.position.clone();
        p.y += 2.8;
        q.scene.updateMatrixWorld(true);
        q.camera.updateMatrixWorld(true);
        p.project(q.camera);
        const r = q.renderer.domElement.getBoundingClientRect();
        return {
          x: r.left + ((p.x + 1) * r.width) / 2,
          y: r.top + ((1 - p.y) * r.height) / 2,
        };
      }, id);
      await page.touchscreen.tap(point.x, point.y);
      await page.waitForFunction(
        () => document.querySelector("#item-dialog").open,
      );
    }
    if (process.env.CHICHI_BIKINI_ACTIONS !== "0") {
      for (const [id, intents] of [
        [
          "bikini-sponge",
          ["greet", "five", "hug", "pet", "carry", "play", "dance"],
        ],
        ["bikini-patrick", ["greet", "photo", "sit"]],
      ]) {
        for (const intent of intents) {
          await page.evaluate(() => {
            const q = __lagoonQA;
            q.court.clear();
            const s = q.itemGroups.get("bikini-sponge");
            s.userData.chefBusy = false;
          });
          await tapCharacter(id);
          await page.locator('[data-bikini-action="' + intent + '"]').tap();
          await page.waitForFunction(
            () => __lagoonQA.getOperation()?.stage === "activity",
          );
          const audit = await page.evaluate(
            ({ id, intent }) => {
              const q = __lagoonQA,
                g = q.itemGroups.get(id),
                op = q.getOperation();
              q.pinnedRide =
                intent === "carry" ? 18 : intent === "play" ? 12 : 6;
              q.reviewView(g.position.x, g.position.z + 1, 18);
              return {
                intent: op.decision.characterAction,
                duration: g.userData.duration,
              };
            },
            { id, intent },
          );
          assert.equal(audit.intent, intent);
          await page.waitForFunction(
            () => Math.abs(__lagoonQA.getDistance() - 18) < 0.3,
          );
          await page.waitForTimeout(250);
          if (intent === "carry") {
            await page.waitForFunction(
              () =>
                __lagoonQA.itemGroups.get("bikini-sponge").userData.playTime ===
                18,
            );
            const carry = await page.evaluate(() => {
              const q = __lagoonQA,
                g = q.itemGroups.get("bikini-sponge"),
                d = g.userData;
              const anchor = d.rig.localToWorld(
                new q.THREE.Vector3(
                  0,
                  2 - d.carrySize.bellyY,
                  0.7 + d.carrySize.depth,
                ),
              );
              const p = d.rig.getWorldPosition(new q.THREE.Vector3());
              q.reviewView(p.x, p.z, 18);
              return {
                error: anchor.distanceTo(q.chichiCarrier.position),
                phase: d.pose.phase,
                length: d.carryRoute.total,
                height: q.chichiCarrier.position.y,
              };
            });
            assert.ok(carry.error < 1e-6, JSON.stringify(carry));
            assert.ok(carry.length > 10);
            assert.ok(carry.height > 1);
            assert.equal(carry.phase, "carry");
            console.log("Chichi held on the actual moving rig:", carry);
          }
          if (["five", "hug", "carry", "play", "photo"].includes(intent)) {
            await page.evaluate(() => {
              __lagoonQA.drawPaused = false;
            });
            await page.waitForTimeout(150);
            await page.screenshot({
              path: path.join(review, id + "-" + intent + "-phone.png"),
            });
            await page.evaluate(() => {
              __lagoonQA.drawPaused = true;
            });
          }
          await page.evaluate(() => {
            const q = __lagoonQA;
            delete q.pinnedRide;
            if (q.getOperation())
              q.getOperation().activityStart = performance.now() - 40000;
          });
          await page.waitForFunction(() => !__lagoonQA.getOperation());
          await page.waitForFunction(
            () => !document.querySelector("#toggle").disabled,
          );
          console.log("Physical friendship menu/action completed:", id, intent);
        }
      }
      await page.evaluate(() => {
        const q = __lagoonQA;
        q.reviewView(
          q.chichiCarrier.position.x,
          q.chichiCarrier.position.z,
          18,
        );
      });
      await page.waitForFunction(
        () => Math.abs(__lagoonQA.getDistance() - 18) < 0.3,
      );
      const catPoint = await page.evaluate(() => {
        const q = __lagoonQA;
        q.scene.updateMatrixWorld(true);
        q.camera.updateMatrixWorld(true);
        const p = q.cat.userData.head
            .localToWorld(new q.THREE.Vector3(0, 0, 0.3))
            .project(q.camera),
          r = q.renderer.domElement.getBoundingClientRect();
        return {
          x: r.left + ((p.x + 1) * r.width) / 2,
          y: r.top + ((1 - p.y) * r.height) / 2,
        };
      });
      await page.touchscreen.tap(catPoint.x, catPoint.y);
      await page.waitForFunction(
        () => document.querySelector("#item-dialog").open,
      );
      assert.equal(await page.locator("[data-bikini-action]").count(), 7);
      await page.evaluate(() => document.querySelector("#item-dialog").close());
      console.log("A real tap on Chichi opens the same friendship choices.");
    }
    await page.evaluate(() => {
      const q = __lagoonQA;
      q.court.clear();
      q.itemGroups.get("bikini-sponge").userData.chefBusy = false;
      q.enterCourt("bikini-krusty");
    });
    assert.equal(
      await page.evaluate(
        () => __lagoonQA.itemGroups.get("bikini-krusty").userData.roof.visible,
      ),
      false,
    );
    await page.locator(".court-order").tap();
    await page.waitForFunction(() => __lagoonQA.court.get("chichi"));
    await page.evaluate(() => {
      __lagoonQA.drawPaused = true;
    });
    const phases = new Set(),
      captured = new Set();
    let chef = false,
      food = false;
    for (let i = 0; i < 240; i++) {
      const state = await page.evaluate(() => {
        const q = __lagoonQA;
        for (let j = 0; j < 30; j++) {
          q.bikiniLife.step(1 / 30, performance.now() / 1000);
          q.court.step(1 / 30, performance.now() / 1000);
          // The accelerated simulation must move the visible actors too;
          // otherwise collision checks see the hero's stale pre-order position.
          for (const v of q.court.visits.values()) {
            const carrier =
              v.catId === "chichi"
                ? q.chichiCarrier
                : q.npcs.get(v.catId)?.carrier;
            if (carrier)
              carrier.position.set(
                -225 + v.position.x,
                v.position.y,
                80 + v.position.z,
              );
          }
        }
        const v = q.court.get("chichi");
        return v
          ? {
              phase: v.phase,
              chef: q.itemGroups.get("bikini-sponge").userData.chefReady,
              food: q.itemGroups.get("bikini-krusty").userData.servingFood
                .visible,
            }
          : null;
      });
      if (!state) break;
      phases.add(state.phase);
      chef ||= state.chef;
      food ||= state.food;
      if (
        (state.phase === "prepare" || state.phase === "consume") &&
        !captured.has(state.phase)
      ) {
        captured.add(state.phase);
        await page.evaluate(() => {
          __lagoonQA.drawPaused = false;
        });
        await page.waitForTimeout(150);
        await page.screenshot({
          path: path.join(review, "krusty-" + state.phase + "-phone.png"),
        });
        await page.evaluate(() => {
          __lagoonQA.drawPaused = true;
        });
      }
    }
    assert.ok(
      chef && food,
      JSON.stringify({
        phases: [...phases],
        state: await page.evaluate(() => {
          const q = __lagoonQA,
            g = q.itemGroups.get("bikini-sponge");
          return {
            position: g.position.toArray(),
            playing: g.userData.playing,
            chef: g.userData.chefReady,
            visit: q.court.get("chichi")?.phase,
            path: q.bikiniLife.getStates().get(g),
            actors: [...q.npcs].map(([id, n]) => ({
              id,
              biome: n.profile.biome,
              p: n.carrier.position.toArray(),
              scale: n.model.scale.x,
            })),
            hero: q.chichiCarrier.position.toArray(),
            customer: q.court.get("chichi"),
          };
        }),
      }),
    );
    for (const phase of ["prepare", "serve", "consume", "leave"])
      assert.ok(phases.has(phase), phase);
    await page.waitForFunction(() => !__lagoonQA.getOperation());
    await page.evaluate(() => {
      __lagoonQA.exitCourt();
      __lagoonQA.drawPaused = false;
    });
    assert.equal(
      await page.evaluate(
        () => __lagoonQA.itemGroups.get("bikini-krusty").userData.roof.visible,
      ),
      true,
    );
    console.log(
      "One SpongeBob cooks/serves; Chichi receives, eats, exits and restores roof.",
      [...phases],
    );
    // Test touch browser behavior and the new currency against this private SQLite world.
    await page.evaluate(() => window.scrollTo(0, 0));
    const browserScale = await page.evaluate(() => visualViewport.scale);
    const walletPoint = await page.locator("#diamonds-open").boundingBox();
    await page.touchscreen.tap(
      walletPoint.x + walletPoint.width / 2,
      walletPoint.y + walletPoint.height / 2,
    );
    await page.touchscreen.tap(
      walletPoint.x + walletPoint.width / 2,
      walletPoint.y + walletPoint.height / 2,
    );
    await page.evaluate(() => {
      for (const d of document.querySelectorAll("dialog[open]")) d.close();
    });
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(() => visualViewport.scale), browserScale);
    assert.equal(
      await page.evaluate(() => getComputedStyle(document.body).touchAction),
      "manipulation",
    );
    assert.equal(
      await page.evaluate(
        () => getComputedStyle(__lagoonQA.renderer.domElement).touchAction,
      ),
      "none",
    );
    const initialMine = await page.evaluate(() => {
      const qa = __lagoonSaveQA,
        api = __diamondQA,
        at = Date.now();
      let g = structuredClone(qa.getGame());
      g.diamonds = 6;
      g.inventory["diamond-mine"] = 1;
      let space = api.findSpace(g, "diamond-mine", "moon");
      g = api.placeItem(g, "diamond-mine", "moon", space.x, space.z, 0, at);
      const mine = g.placements.at(-1);
      mine.readyAt = 0;
      mine.startedAt = at - 3600000;
      g.business.accounts[mine.id].collectedAt = at - 3600000;
      g.inventory.yarn = (g.inventory.yarn || 0) + 1;
      space = api.findSpace(g, "yarn", "moon");
      g = api.placeItem(g, "yarn", "moon", space.x, space.z, 0, at);
      const work = g.placements.at(-1);
      qa.commit(g);
      return { mine: mine.id, work: work.id, deadline: work.readyAt };
    });
    await page.locator("#diamonds-open").click();
    await page.locator('[data-collect="' + initialMine.mine + '"]').click();
    assert.equal(
      await page.evaluate(() => __lagoonSaveQA.getGame().diamonds),
      8,
    );
    await page.locator("#builder-boost-buy").click();
    await page.waitForFunction(
      () => __lagoonSaveQA.getGame().builderBoosts.length === 1,
    );
    const boosted = await page.evaluate(() => __lagoonSaveQA.getGame());
    assert.equal(boosted.diamonds, 0);
    assert.ok(
      boosted.placements.find((p) => p.id === initialMine.work).readyAt <
        initialMine.deadline,
    );
    assert.equal(await page.locator("#builder-boost-buy").isDisabled(), true);
    assert.equal(await page.locator("#builder-boost-hud").isVisible(), true);
    await page.screenshot({
      path: path.join(review, "diamond-boost-phone.png"),
    });
    await page.evaluate(async () => {
      await __lagoonSaveQA.cloud.flush();
    });
    const savedMine = await (
      await fetch(base + "/api/save", { headers })
    ).json();
    assert.equal(savedMine.game.diamonds, 0);
    assert.deepEqual(savedMine.game.builderBoosts, boosted.builderBoosts);
    assert.equal(
      savedMine.game.placements.find((p) => p.id === initialMine.work).readyAt,
      boosted.placements.find((p) => p.id === initialMine.work).readyAt,
    );
    await page.reload();
    await page.waitForFunction(
      () => window.__lagoonQA && window.__lagoonSaveQA?.cloud.editable,
    );
    const restoredBoost = await page.evaluate(() => __lagoonSaveQA.getGame());
    assert.equal(restoredBoost.diamonds, 0);
    assert.deepEqual(restoredBoost.builderBoosts, boosted.builderBoosts);
    assert.equal(
      restoredBoost.placements.find((p) => p.id === initialMine.work).readyAt,
      boosted.placements.find((p) => p.id === initialMine.work).readyAt,
    );
    await page.evaluate(() =>
      document.querySelector("#map").scrollIntoView({ block: "start" }),
    );
    const canvasPoint = await page.evaluate(() => {
      const r = __lagoonQA.renderer.domElement.getBoundingClientRect();
      return {
        x: r.left + r.width / 2,
        y: Math.min(innerHeight - 90, Math.max(r.top + 170, innerHeight / 2)),
      };
    });
    await page.touchscreen.tap(canvasPoint.x, canvasPoint.y);
    await page.touchscreen.tap(canvasPoint.x, canvasPoint.y);
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(() => visualViewport.scale), browserScale);
    await page.evaluate(() => {
      for (const d of document.querySelectorAll("dialog[open]")) d.close();
    });
    const beforePinch = await page.evaluate(() =>
      __lagoonQA.getDesiredDistance(),
    );
    const cdp = await context.newCDPSession(page);
    const touches = (gap) => [
      { id: 1, x: canvasPoint.x - gap, y: canvasPoint.y },
      { id: 2, x: canvasPoint.x + gap, y: canvasPoint.y },
    ];
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: touches(30),
    });
    for (let i = 1; i <= 6; i++)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: touches(30 + i * 6),
      });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    assert.ok(
      Math.abs(
        (await page.evaluate(() => __lagoonQA.getDesiredDistance())) -
          beforePinch,
      ) > 1,
    );
    assert.equal(await page.evaluate(() => visualViewport.scale), browserScale);
    console.log(
      "PASS: double taps retain browser scale and game pinch still zooms the camera; mine collection, 8-diamond boost, earlier deadline and exact persistent hour survive reload.",
    );
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
    assert.deepEqual(remote.game.catPosition, current.catPosition);
    assert.ok(remote.game.unlocked.includes("bikini"));
    if (process.env.CHICHI_BIKINI_ACTIONS !== "0")
      assert.ok(
        remote.game.spa.receipts.some((id) => id.startsWith("bikini-friend-")),
      );
    assert.ok(remote.game.spa.receipts.some((id) => id.startsWith("court-")));
    console.log(
      "Private cloud retained exact coins, XP, city position and friendship/meal receipts:",
      remote.revision,
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
      "PASS: mobile city, requested friendship actions, physical chef, food, touch gestures and private persistent saves.",
    );
  } catch (error) {
    console.error("Bikini Bottom browser check failed", error);
    throw error;
  } finally {
    await browser?.close();
    local.stop();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
