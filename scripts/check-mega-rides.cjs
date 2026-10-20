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
  fs.copyFileSync(
    path.join(root, ".generated/worker.mjs"),
    path.join(temp, "worker.mjs"),
  );
  fs.writeFileSync(
    config,
    JSON.stringify({
      name: "chichi-chill-local",
      main: path.join(temp, "worker.mjs"),
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
    g.unlocked.push("homestead", "candy", "nature", "rainbow", "clouds");
    g.adoption.cats = [
      { id: "adopt-crumb", homeBiome: "homestead" },
      { id: "adopt-doughnut", homeBiome: "homestead" },
      { id: "adopt-biscuit", homeBiome: "homestead" },
    ];
    g.progression.xp = xpForLevel(20);
    g.lastVisit = gameDay(now);
    g.progression.lastVisitDay = gameDay(now);
    g.coins = 8000000;
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
                    "    if(window.__lagoonQA?.pinnedRide !== undefined && operation?.stage === 'activity') operation.activityStart=now-window.__lagoonQA.pinnedRide*1000;\n    if(window.__lagoonQA?.pinnedResident){const p=window.__lagoonQA.pinnedResident,v=residentPlay.get(p.id);if(v)v.activityStart=now-p.time*1000;}\n    for(const p of window.__lagoonQA?.pinnedResidents||[]){const v=residentPlay.get(p.id);if(v)v.activityStart=now-p.time*1000;}\n    const time = now / 1000;",
                  )
                  .replace(
                    "  const reduced =",
                    "  const qaStart=performance.now();\n  const reduced =",
                  )
                  .replace(
                    marker,
                    `  const qa=window.__lagoonQA={camera,look,desiredLook,renderer,islands,cat,npcs,chichiCarrier,itemGroups,THREE,scene,pickDrop,pointer,raycaster,ground,viewport,perform,performResident,faceCamera,spa,chill,court,cinema,courtFoods,bikiniLife,enterCourt,exitCourt,getCourtCamera:()=>courtCamera,residentPlay,callbacks,getDragging:()=>draggingCat?.catId,reviewView:(x,z,d)=>{desiredLook.set(x,0,z);desiredDistance=d;azimuth=.15;},constructorMs:performance.now()-qaStart,focused:()=>focused,getOperation:()=>operation,isVisible:()=>worldVisible,getDistance:()=>distance,getDesiredDistance:()=>desiredDistance,frames:0,resizes:0,black:[],audit:false};
  qa.focus=focus;qa.reviewYaw=(yaw)=>{azimuth=yaw+.2;};const draw=renderer.render.bind(renderer);qa.drawFrame=()=>draw(scene,camera);renderer.render=(...args)=>{if(qa.drawPaused)return;draw(...args);qa.frames++;};
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

    const { MEGA_RIDES } = await import(root + "/public/mega-ride-data.js"),
      { REFERENCE_SLIDES } = await import(
        root + "/public/reference-slide-data.js"
      ),
      rides = process.env.CHICHI_REFERENCE_SLIDES
        ? REFERENCE_SLIDES
        : MEGA_RIDES;
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
    const selected = process.env.CHICHI_MEGA_FILTER
      ? rides.filter((r) =>
          process.env.CHICHI_MEGA_FILTER.split(",").includes(r.id),
        )
      : rides;
    for (const spec of selected) {
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
      if (process.env.CHICHI_CAMERA_CHECKS) {
        await page.evaluate((id) => {
          __lagoonQA.residentPlay.clear();
          for (const n of __lagoonQA.npcs.values())
            n.manualUntil = performance.now() + 1e8;
          __lagoonQA.callbacks.onSelectItem(id);
        }, id);
        await page.locator("#item-guest-camera").waitFor({ state: "visible" });
        assert.equal(
          await page.locator("#item-guest-camera").isDisabled(),
          true,
        );
        await page.locator("#item-attraction-camera").tap();
        assert.equal(
          await page.locator("#item-dialog").evaluate((d) => d.open),
          false,
        );
        assert.equal(
          await page.evaluate(
            (id) =>
              __lagoonQA.getCourtCamera()?.id === id &&
              __lagoonQA.getCourtCamera()?.attraction,
            id,
          ),
          true,
          id,
        );
        await page.waitForFunction(() => {
          const q = __lagoonQA;
          return (
            q.look.distanceTo(q.desiredLook) < 0.025 &&
            Math.abs(q.getDistance() - q.getDesiredDistance()) < 0.1
          );
        });
        const fit = await page.evaluate((id) => {
          const q = __lagoonQA,
            g = q.itemGroups.get(id),
            b = new q.THREE.Box3().setFromObject(g);
          const projected = Array.from({ length: 8 }, (_, i) =>
            new q.THREE.Vector3(
              i & 1 ? b.max.x : b.min.x,
              i & 2 ? b.max.y : b.min.y,
              i & 4 ? b.max.z : b.min.z,
            )
              .project(q.camera)
              .toArray(),
          );
          return {
            distance: q.getDesiredDistance(),
            target: q.desiredLook.toArray(),
            center: b.getCenter(new q.THREE.Vector3()).toArray(),
            projected,
          };
        }, id);
        // Animated rafts and staff can shift the live bounding-box centre
        // slightly after the tap. Check the actual view, not a frozen pose.
        assert.ok(
          fit.target.every((v, i) => Math.abs(v - fit.center[i]) < 0.5) &&
            fit.projected.every(
              ([x, y, z]) =>
                Math.abs(x) < 0.98 && Math.abs(y) < 0.98 && z > -1 && z < 1,
            ),
          JSON.stringify(fit),
        );
        await page
          .locator(".court-camera-exit")
          .filter({ hasText: "Вернуться" })
          .tap();
        assert.equal(
          await page.evaluate(() => __lagoonQA.getCourtCamera()),
          null,
        );
        console.log(
          "Attraction overview button and return checked:",
          spec.id,
          fit.distance,
        );
      }
      if (spec.kind === "funnel") {
        await page.evaluate(() => {
          const q = __lagoonQA;
          q.residentPlay.clear();
          for (const n of q.npcs.values()) n.manualUntil = 0;
        });
        await page.waitForFunction(
          (id) =>
            [...__lagoonQA.residentPlay.visits.values()].some(
              (v) => v.autonomous && v.decision.activityId === id,
            ),
          id,
          { timeout: 15000 },
        );
        console.log("Titan autonomously chosen by a real resident.");
      }
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
      if (process.env.CHICHI_CAMERA_CHECKS) {
        await page.evaluate((id) => __lagoonQA.callbacks.onSelectItem(id), id);
        assert.equal(
          await page.locator("#item-guest-camera").isEnabled(),
          true,
        );
        assert.equal(await page.locator("#item-move").isDisabled(), true);
        await page.locator("#item-guest-camera").tap();
        await page.waitForFunction(() => {
          const q = __lagoonQA,
            p = q.cat.userData.head
              .getWorldPosition(new q.THREE.Vector3())
              .project(q.camera);
          return (
            q.faceCamera.enabled &&
            Math.abs(p.x) < 0.9 &&
            Math.abs(p.y) < 0.9 &&
            p.z < 1
          );
        });
        assert.equal(
          await page.evaluate(() => __lagoonQA.faceCamera.enabled),
          true,
        );
        assert.equal(
          await page.evaluate(
            (id) => __lagoonQA.getOperation()?.decision.activityId === id,
            id,
          ),
          true,
          id,
        );
        const guestFrame = await page.evaluate(() => {
          const q = __lagoonQA;
          q.drawFrame();
          return q.cat.userData.head
            .getWorldPosition(new q.THREE.Vector3())
            .project(q.camera)
            .toArray();
        });
        assert.ok(
          Math.abs(guestFrame[0]) < 0.9 &&
            Math.abs(guestFrame[1]) < 0.9 &&
            guestFrame[2] < 1,
          "Guest camera must contain its actual rider: " + guestFrame,
        );
        await page.screenshot({
          path: path.join(review, spec.id + "-guest-camera.png"),
        });
        await page.evaluate(() => {
          const q = __lagoonQA;
          q.faceCamera.setEnabled(false, q.look);
          q.focus("homestead");
          q.reviewView(-250, -55, 105);
          q.desiredLook.y = 9;
        });
        console.log("Actual occupied guest-camera button checked:", spec.id);
      }
      const times = await page.evaluate((id) => {
        const r = __lagoonQA.itemGroups.get(id).userData.route;
        let t = r.legs.find(
          (l) =>
            l.phase === "flight" || l.phase === "vortex" || l.phase === "ride",
        );
        if (__lagoonQA.itemGroups.get(id).userData.id === "slide-titan-funnel")
          t = r.legs.find((l) => l.phase === "vortex");
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
        return {
          sample: t,
          impact: r.impacts.at(-1)?.time,
          duration: r.duration,
        };
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
          p = g.localToWorld(new q.THREE.Vector3(...f.position)),
          reaction = g.userData.rideReaction(q.pinnedRide),
          rig = q.cat.userData,
          front = rig.legs.find((leg) => leg.position.z > 0);
        return {
          gap: q.chichiCarrier.position.distanceTo(p),
          finite: q.chichiCarrier.matrixWorld.elements.every(Number.isFinite),
          phase: f.phase,
          elapsed: g.userData.rideElapsed,
          pin: q.pinnedRide,
          actingError:
            Math.abs(rig.body.rotation.x - reaction.bodyPitch) +
            Math.abs(Math.abs(front.rotation.z) - reaction.pawSpread),
          actingSpeed: reaction.speed,
        };
      }, id);
      assert.ok(seat.gap < 0.005 && seat.finite, JSON.stringify(seat));
      assert.ok(
        seat.actingError < 0.001,
        "real hero ride choreography: " + JSON.stringify(seat),
      );
      if (spec.kind === "funnel") {
        const prior = page.viewportSize();
        await page.setViewportSize({ width: 1000, height: 800 });
        for (const phase of [0.18, 0.5, 0.82]) {
          await page.evaluate(
            ({ id, phase }) => {
              const q = __lagoonQA,
                g = q.itemGroups.get(id),
                l = g.userData.route.legs.find((l) => l.phase === "vortex");
              q.pinnedRide = l.start + l.duration * phase;
              const p = g.localToWorld(
                new q.THREE.Vector3(
                  ...g.userData.rideFrame(q.pinnedRide).position,
                ),
              );
              q.reviewView(p.x, p.z, 14);
              q.desiredLook.y = p.y + 0.65;
            },
            { id, phase },
          );
          await page.waitForFunction(
            () =>
              Math.abs(__lagoonQA.getDistance() - 14) < 0.1 &&
              __lagoonQA.look.distanceTo(__lagoonQA.desiredLook) < 0.025,
          );
          await page.evaluate(() => __lagoonQA.drawFrame());
          await page.screenshot({
            path: path.join(
              review,
              "titan-chichi-clear-seat-" + phase + ".png",
            ),
          });
        }
        await page.setViewportSize(prior);
        await page.evaluate(() => {
          __lagoonQA.reviewView(-250, -55, 105);
          __lagoonQA.desiredLook.y = 9;
        });
      }
      if (["launch", "dive"].includes(spec.kind)) {
        for (const phase of ["climb", "flight", "splash"]) {
          const exists = await page.evaluate(
            ({ id, phase }) => {
              const q = __lagoonQA,
                g = q.itemGroups.get(id),
                leg = g.userData.route.legs
                  .filter((l) => l.phase === phase)
                  .at(-1);
              if (!leg) return false;
              q.pinnedRide =
                leg.start + (phase === "splash" ? 0.11 : leg.duration * 0.55);
              const f = g.userData.rideFrame(q.pinnedRide),
                p = g.localToWorld(new q.THREE.Vector3(...f.position));
              q.reviewView(p.x, p.z, 8);
              q.desiredLook.y = p.y + 0.6;
              q.reviewYaw((f.yaw || 0) + g.rotation.y);
              return true;
            },
            { id, phase },
          );
          if (!exists) continue;
          await page.waitForFunction(
            () =>
              Math.abs(__lagoonQA.getDistance() - 8) < 0.05 &&
              __lagoonQA.look.distanceTo(__lagoonQA.desiredLook) < 0.025,
          );
          await page.evaluate(() => __lagoonQA.drawFrame());
          const inFrame = await page.evaluate(() => {
            const q = __lagoonQA,
              p = q.cat.userData.head
                .getWorldPosition(new q.THREE.Vector3())
                .project(q.camera);
            return Math.abs(p.x) < 0.8 && Math.abs(p.y) < 0.8 && p.z < 1;
          });
          assert.ok(inFrame, "reaction close-up must actually contain Chichi");
          await page.screenshot({
            path: path.join(review, spec.id + "-acting-" + phase + ".png"),
          });
        }
        await page.evaluate((t) => {
          const q = __lagoonQA;
          q.pinnedRide = t;
          q.reviewView(-250, -55, 105);
          q.desiredLook.y = 9;
        }, times.sample);
      }
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
      for (const kitten of ["adopt-crumb", "adopt-doughnut"]) {
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
            __lagoonQA.pinnedResident = { id: kitten, time: t };
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
              new q.THREE.Vector3(
                ...g.userData.rideFrame(v.elapsed, false, v.rider?.lane || 0)
                  .position,
              ),
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
              f = g.userData.rideFrame(v.elapsed, false, v.rider?.lane || 0),
              p = g.localToWorld(new q.THREE.Vector3(...f.position)),
              rig = q.npcs.get(kitten).model.userData,
              reaction = g.userData.rideReaction(
                v.elapsed,
                false,
                v.rider?.lane || 0,
              ),
              front = rig.legs.find((leg) => leg.position.z > 0);
            return {
              gap: q.npcs.get(kitten).carrier.position.distanceTo(p),
              finite: q.npcs
                .get(kitten)
                .carrier.matrixWorld.elements.every(Number.isFinite),
              actingError:
                Math.abs(rig.body.rotation.x - reaction.bodyPitch) +
                Math.abs(Math.abs(front.rotation.z) - reaction.pawSpread),
            };
          },
          { kitten, id },
        );
        assert.ok(
          resident.gap < 0.005 && resident.finite,
          JSON.stringify(resident),
        );
        assert.ok(
          resident.actingError < 0.001,
          "real resident ride choreography: " + JSON.stringify(resident),
        );
        if (spec.kind === "funnel") {
          await page.evaluate((kitten) => {
            const q = __lagoonQA,
              p = q.npcs.get(kitten).carrier.position;
            q.reviewView(p.x, p.z, 16);
            q.desiredLook.y = p.y + 1;
          }, kitten);
          await page.waitForFunction(
            () => Math.abs(__lagoonQA.getDistance() - 16) < 0.1,
          );
          await page.evaluate(() => __lagoonQA.drawFrame());
          await page.screenshot({
            path: path.join(review, "titan-" + kitten + "-seat.png"),
          });
          await page.evaluate(() => {
            __lagoonQA.reviewView(-250, -55, 105);
            __lagoonQA.desiredLook.y = 9;
          });
        }
        await page.evaluate((kitten) => {
          delete __lagoonQA.pinnedResident;
          __lagoonQA.residentPlay.get(kitten).activityStart -= 100000;
        }, kitten);
        await page.waitForFunction(
          (kitten) => !__lagoonQA.residentPlay.get(kitten),
          kitten,
        );
      }
      if (spec.kind === "funnel") {
        await page.evaluate((id) => {
          const q = __lagoonQA,
            g = q.itemGroups.get(id);
          q.residentPlay.clear();
          q.chichiCarrier.position.copy(
            g.localToWorld(new q.THREE.Vector3(-11, 0.16, -2)),
          );
          q.reviewView(g.position.x - 3, g.position.z, 50);
          q.desiredLook.y = 4;
        }, id);
        await page.waitForFunction(
          () => Math.abs(__lagoonQA.getDistance() - 50) < 0.1,
        );
        const points = await page.evaluate((id) => {
          const q = __lagoonQA,
            g = q.itemGroups.get(id);
          q.scene.updateMatrixWorld(true);
          q.camera.updateMatrixWorld(true);
          const r = q.renderer.domElement.getBoundingClientRect();
          return [
            q.cat.userData.head.getWorldPosition(new q.THREE.Vector3()),
            g.localToWorld(new q.THREE.Vector3(0, 6.4, 4)),
          ].map((p) => {
            p.project(q.camera);
            return {
              x: r.left + ((p.x + 1) * r.width) / 2,
              y: r.top + ((1 - p.y) * r.height) / 2,
            };
          });
        }, id);
        await page.evaluate(() => __lagoonQA.drawFrame());
        await page.screenshot({
          path: path.join(review, "titan-phone-before-touch.png"),
        });
        console.log(
          "Titan touch screen points:",
          JSON.stringify(points),
          await page.evaluate(
            (points) =>
              points.map((p) => ({
                tag: document.elementFromPoint(p.x, p.y)?.tagName,
                within:
                  p.x >= 0 && p.x < innerWidth && p.y >= 0 && p.y < innerHeight,
              })),
            points,
          ),
        );
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ ...points[0], id: 1 }],
        });
        assert.equal(
          await page.evaluate(() => __lagoonQA.getDragging()),
          undefined,
        );
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ ...points[0], x: points[0].x + 8, id: 1 }],
        });
        assert.equal(
          await page.evaluate(() => __lagoonQA.getDragging()),
          "chichi",
          "phone can pick the actual Chichi mesh",
        );
        for (let i = 1; i <= 8; i++) {
          const u = i / 8;
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [
              {
                x: points[0].x + (points[1].x - points[0].x) * u,
                y: points[0].y + (points[1].y - points[0].y) * u,
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
          (id) => __lagoonQA.getOperation()?.decision.activityId === id,
          id,
        );
        await page.evaluate(() => (__lagoonQA.getOperation().start -= 20000));
        await page.waitForFunction(
          () => __lagoonQA.getOperation()?.stage === "activity",
        );
        await page.evaluate((id) => {
          const q = __lagoonQA,
            g = q.itemGroups.get(id),
            l = g.userData.route.legs.find((l) => l.phase === "vortex");
          q.pinnedRide = l.start + l.duration * 0.5;
          const p = g.localToWorld(
            new q.THREE.Vector3(...g.userData.rideFrame(q.pinnedRide).position),
          );
          q.reviewView(p.x, p.z, 16);
          q.desiredLook.y = p.y + 0.6;
        }, id);
        await page.waitForFunction(
          () => Math.abs(__lagoonQA.getDistance() - 16) < 0.1,
        );
        await page.evaluate(() => __lagoonQA.drawFrame());
        await page.screenshot({
          path: path.join(review, "titan-actual-phone-touch-rider.png"),
        });
        await page.evaluate(() => {
          const q = __lagoonQA;
          delete q.pinnedRide;
          q.getOperation().activityStart -= 100000;
          q.reviewView(-250, -55, 105);
          q.desiredLook.y = 9;
        });
        await page.waitForFunction(
          () => !__lagoonQA.getOperation() && !__expansionActions.busy(),
        );
        await cdp.detach();
        console.log(
          "Titan actual phone touch drag completed a visible bowl ride.",
        );
      }
      console.log("Real hero and resident rides completed:", spec.id);
      if (spec.kind === "canyon-twins") {
        const kittens = ["adopt-crumb", "adopt-doughnut", "adopt-biscuit"];
        await page.evaluate(
          ({ id, kittens }) => {
            const q = __lagoonQA;
            q.residentPlay.clear();
            for (const n of q.npcs.values())
              n.manualUntil = performance.now() + 1e8;
            q.callbacks.onCatDrop({ activityId: id });
            q.getOperation().start -= 20000;
            for (const cat of kittens) {
              if (
                !q.callbacks.onResidentDrop(
                  cat,
                  { activityId: id },
                  "homestead",
                  { x: 0, z: 0 },
                )
              )
                throw Error("Concurrent drop rejected: " + cat);
              q.residentPlay.get(cat).started -= 20000;
            }
          },
          { id, kittens },
        );
        await page.waitForFunction(
          ({ id, kittens }) => {
            const q = __lagoonQA,
              g = q.itemGroups.get(id);
            return (
              g.userData.slideRiders?.size === 4 &&
              [...g.userData.slideRiders.values()].every(
                (r) => r.launchAt !== null,
              )
            );
          },
          { id, kittens },
        );
        const headways = await page.evaluate((id) => {
          const riders = [
            ...__lagoonQA.itemGroups.get(id).userData.slideRiders.values(),
          ];
          const times = riders.map((r) => r.launchAt).sort((a, b) => a - b);
          riders.forEach((r) => (r.launchAt -= 30000));
          return times.slice(1).map((t, i) => t - times[i]);
        }, id);
        assert.ok(
          headways.every((ms) => ms >= 5200 - 1e-6),
          JSON.stringify(headways),
        );
        await page.waitForFunction(
          (kittens) =>
            __lagoonQA.getOperation()?.stage === "activity" &&
            kittens.every(
              (id) => __lagoonQA.residentPlay.get(id)?.phase === "activity",
            ),
          kittens,
        );
        await page.evaluate(
          ({ id, kittens }) => {
            const q = __lagoonQA,
              g = q.itemGroups.get(id),
              leg = g.userData.route.legs.find((l) => l.phase === "ride");
            q.pinnedRide = leg.start + leg.duration * 0.2;
            q.pinnedResidents = kittens.map((id, i) => ({
              id,
              time: leg.start + leg.duration * (0.4 + i * 0.2),
            }));
          },
          { id, kittens },
        );
        // GPU back-pressure can defer a world update in software WebGL. Wait
        // for the actual pinned poses and the subsequent raft update, rather
        // than inspecting actors which have not left the entrance yet.
        await page.waitForFunction(
          ({ id, kittens }) => {
            const q = __lagoonQA,
              g = q.itemGroups.get(id),
              actors = [
                [q.getOperation(), q.chichiCarrier, q.pinnedRide],
                ...kittens.map((cat, i) => [
                  q.residentPlay.get(cat),
                  q.npcs.get(cat).carrier,
                  q.pinnedResidents[i].time,
                ]),
              ];
            return (
              actors.every(([v, carrier, time]) => {
                if (!v?.rider || Math.abs(v.rider.elapsed - time) > 0.001)
                  return false;
                const frame = g.userData.rideFrame(time, false, v.rider.lane);
                return (
                  carrier.position.distanceTo(
                    g.localToWorld(new q.THREE.Vector3(...frame.position)),
                  ) < 0.005
                );
              }) &&
              g.userData.slideVehicles.filter((v) => v.visible).length === 4
            );
          },
          { id, kittens },
          { timeout: 90000 },
        );
        const concurrent = await page.evaluate(
          ({ id, kittens }) => {
            const q = __lagoonQA,
              g = q.itemGroups.get(id),
              positions = [];
            const errors = [
              ["chichi", q.getOperation()],
              ...kittens.map((id) => [id, q.residentPlay.get(id)]),
            ].map(([cat, v]) => {
              const elapsed = cat === "chichi" ? q.pinnedRide : v.elapsed,
                f = g.userData.rideFrame(elapsed, false, v.rider.lane),
                p = g.localToWorld(new q.THREE.Vector3(...f.position)),
                carrier =
                  cat === "chichi" ? q.chichiCarrier : q.npcs.get(cat).carrier;
              positions.push(carrier.position.toArray());
              return carrier.position.distanceTo(p);
            });
            return {
              errors,
              positions,
              rafts: g.userData.slideVehicles.filter((v) => v.visible).length,
            };
          },
          { id, kittens },
        );
        assert.ok(
          concurrent.errors.every((e) => e < 0.005),
          JSON.stringify(concurrent),
        );
        assert.equal(concurrent.rafts, 4);
        for (let i = 0; i < 4; i++)
          for (let j = 0; j < i; j++)
            assert.ok(
              Math.hypot(
                ...concurrent.positions[i].map(
                  (v, k) => v - concurrent.positions[j][k],
                ),
              ) > 1,
              "Concurrent riders must not overlap: " +
                JSON.stringify(concurrent),
            );
        await page.evaluate(() => {
          const q = __lagoonQA;
          delete q.pinnedRide;
          delete q.pinnedResidents;
          q.getOperation().activityStart -= 100000;
          for (const v of q.residentPlay.visits.values())
            v.activityStart -= 100000;
        });
        await page.waitForFunction(
          () =>
            !__lagoonQA.getOperation() &&
            !__lagoonQA.residentPlay.visits.size &&
            !__expansionActions.busy(),
        );
        console.log(
          "Four actual simultaneous riders keep separate lanes, clocks, rafts and launch headways.",
        );
      }
    }
    for (const biome of ["candy", "nature", "rainbow", "clouds"]) {
      const building = await page.evaluate((biome) => {
        const s = __lagoonSaveQA,
          a = __expansionActions;
        let g = s.getGame();
        g = a.placeItem(
          a.purchase(g, "business-hotdog"),
          "business-hotdog",
          biome,
          18,
          0,
          0,
        );
        const p = g.placements.at(-1);
        p.readyAt = 0;
        s.commit(g);
        __lagoonQA.focus(biome);
        return p.id;
      }, biome);
      await page.waitForFunction(
        ({ biome, building }) =>
          !__lagoonQA.islands.get(biome)?.userData.lowOnly &&
          __lagoonQA.itemGroups.get(building)?.userData.built,
        { biome, building },
      );
      await page.waitForFunction(
        () =>
          Math.abs(__lagoonQA.getDistance() - __lagoonQA.getDesiredDistance()) <
          0.3,
      );
      await page.evaluate(() => __lagoonQA.drawFrame());
      await page.screenshot({
        path: path.join(review, "expanded-" + biome + "-outer-business.png"),
      });
      console.log(
        "Expanded island and actual outer-land business rendered:",
        biome,
      );
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
    // Reproduce a second phone still using the old, smaller shoreline. Its
    // normalized snapshot loses the four new outer plots without storing them.
    const oldPhone = structuredClone(remote.game),
      outerIds = new Set(
        oldPhone.placements
          .filter(
            (p) =>
              ["candy", "nature", "rainbow", "clouds"].includes(p.biome) &&
              p.x === 18,
          )
          .map((p) => p.id),
      );
    assert.equal(outerIds.size, 4);
    oldPhone.placements = oldPhone.placements.filter(
      (p) => !outerIds.has(p.id),
    );
    const clipped = loadGame(
      {
        getItem: (k) =>
          k === "chichi-world-v2" ? JSON.stringify(oldPhone) : null,
      },
      Date.now(),
      { advance: false },
    );
    const staleReply = await fetch(base + "/api/save", {
      method: "PUT",
      headers,
      body: JSON.stringify({
        cooperative: true,
        clientId: crypto.randomUUID(),
        sequence: 1,
        expectedRevision: remote.revision,
        mutationId: crypto.randomUUID(),
        baseGame: remote.game,
        game: clipped,
      }),
    });
    assert.equal(staleReply.status, 200);
    const protectedSave = await staleReply.json();
    assert.deepEqual(protectedSave.game.placements, current.placements);
    assert.deepEqual(
      protectedSave.game.business.accounts,
      remote.game.business.accounts,
    );
    assert.equal(protectedSave.game.coins, current.coins);
    console.log(
      "Cached old phone snapshot preserved all four outer-land businesses in the real SQLite Worker.",
    );
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
      `PASS: ${selected.length} selected models render on mobile; hero/tiny/giant seats and choreography match; ${selected.some((r) => r.kind === "funnel") ? "Titan autonomy and actual touch drag work; " : ""}water impacts fire; four expanded islands accept outer businesses; purchases/coins/XP survive cloud reload.`,
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
      `PASS: ${selected.length} legendary rides rendered without browser or shader errors.`,
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
