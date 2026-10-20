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
  fs.copyFileSync(
    path.join(root, ".generated/worker.mjs"),
    path.join(temp, "worker.mjs"),
  );
  fs.writeFileSync(
    config,
    JSON.stringify({
      name: "chichi-aquarium-local",
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
    const { build } = require(root + "/node_modules/esbuild");
    const { newGame, loadGame, SAVE_KEY } = await import(
      root + "/public/economy.js"
    );
    const { ensureJobCity, applyJobPlan, localJobPlan } = await import(
      root + "/public/jobcity-system.js"
    );
    const { ADOPTION_CATS } = await import(root + "/public/cat-breeds.js");
    const { xpForLevel, gameDay } = await import(
      root + "/public/progression.js"
    );
    const now = Date.now();
    let g = newGame(now);
    g.unlocked.push("jobcity");
    g.progression.xp = xpForLevel(14);
    g.coins = 50000;
    g.lastVisit = gameDay(now);
    g.progression.lastVisitDay = gameDay(now);
    g.catPosition = { biome: "jobcity", x: 0, z: 55 };
    g.cat.hunger = 2;
    g.cat.energy = 95;
    g.cat.happiness = 95;
    for (const cat of ADOPTION_CATS.slice(0, 14)) {
      g.adoption.cats.push({
        id: cat.id,
        adoptedAt: now,
        homeBiome: "jobcity",
        centerId: "",
      });
      g.catDestinations[cat.id] = "jobcity";
    }
    g = ensureJobCity(g, now);
    for (const p of Object.values(g.jobCity.profiles)) p.coins = 5000;
    const token = crypto.randomBytes(32).toString("hex"),
      headers = {
        "Content-Type": "application/json",
        "X-Chichi-Save-Token": token,
      };
    const response = await fetch(local.base + "/api/save", {
      method: "PUT",
      headers,
      body: JSON.stringify({
        expectedRevision: 0,
        mutationId: crypto.randomUUID(),
        game: loadGame(
          { getItem: (k) => (k === SAVE_KEY ? JSON.stringify(g) : null) },
          now,
          { advance: false },
        ),
      }),
    });
    const saved = await response.json();
    assert.equal(saved.revision, 1, JSON.stringify(saved));
    const output = await build({
      entryPoints: [root + "/public/app.js"],
      bundle: true,
      format: "esm",
      write: false,
      plugins: [
        {
          name: "city-qa",
          setup(b) {
            b.onLoad({ filter: /\/public\/world\.js$/ }, () => {
              const source = fs.readFileSync(root + "/public/world.js", "utf8"),
                marker = "  return {\n    perform,";
              assert.ok(source.includes(marker));
              return {
                loader: "js",
                contents: source.replace(
                  marker,
                  `  window.__cityQA={jobs,cityCars,itemGroups,npcs,cat,chichiCarrier,islands,renderer,camera,scene,desiredLook,faceCamera,focus,islandOverview,inspectAttraction,followCat,snap:()=>{look.copy(desiredLook);distance=desiredDistance;},capture:()=>{gpuFrames.clear();look.copy(desiredLook);distance=desiredDistance;camera.position.set(look.x+Math.sin(azimuth)*Math.cos(elevation)*distance,look.y+Math.sin(elevation)*distance,look.z+Math.cos(azimuth)*Math.cos(elevation)*distance);camera.lookAt(look);for(const [id,n] of npcs){const v=jobs.get(id);if(v){const f=jobCatFrame(v,performance.now()/1000,reduced);applyJobFrame(f,n.carrier);animateCat(n.model,performance.now()/1000,f.walking,reduced);if(f.reaction)reactCat(n.model,f.reaction,reduced);}}const mask=cityViewOccluders(courtCamera?.id,{x:camera.position.x-JOB_CITY_CENTER[0],y:camera.position.y,z:camera.position.z-JOB_CITY_CENTER[1]});for(const g of itemGroups.values())if(mask.has(g.userData.placementId))g.visible=false;renderer.render(scene,camera);renderer.getContext().finish();},chooseCityDrive:null,actors:()=>[{id:'chichi',index:-1,biome:'jobcity',local:{x:chichiCarrier.position.x+440,y:chichiCarrier.position.y,z:chichiCarrier.position.z+50}},...[...npcs].map(([id,n])=>({id,index:n.index,biome:n.profile.biome,local:{x:n.carrier.position.x+440,y:n.carrier.position.y,z:n.carrier.position.z+50}}))],step:seconds=>{for(let i=0;i<seconds*10;i++)jobs.step(window.__citySave.getGame(),window.__cityQA.actors(),.1,i/10);sync(window.__citySave.getGame());},project:(x,y,z)=>{const v=new THREE.Vector3(x,y,z).project(camera),r=renderer.domElement.getBoundingClientRect();return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};}};\n` +
                    marker,
                ),
              };
            });
            b.onLoad({ filter: /\/public\/app\.js$/ }, () => ({
              loader: "js",
              contents: fs
                .readFileSync(root + "/public/app.js", "utf8")
                .replace(
                  "persist();\nrenderGame();",
                  "window.__citySave={getGame:()=>game,commit,cityTick,world,cloud};\npersist();\nrenderGame();",
                ),
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
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(120000);
    const errors = [];
    page.on("pageerror", (e) => {
      errors.push(e.message);
      console.log("PAGE ERROR", e.message);
    });
    page.on("console", (m) => {
      if (m.type() === "error" && !m.text().includes("503"))
        errors.push(m.text());
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
      { g: saved.game, token },
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
    let aiCalls = 0,
      aiAvailable = false;
    await page.route("**/api/jobcity/plan", (r) => {
      aiCalls++;
      if (!aiAvailable)
        return r.fulfill({
          status: 503,
          json: { error: "private QA unavailable" },
        });
      const state = JSON.parse(r.request().postData());
      return r.fulfill({
        json: {
          day: state.day,
          phase: state.phase,
          assignments: localJobPlan(
            state.cats.map((c) => ({ ...c, inventory: {} })),
            state.day,
          ),
        },
      });
    });
    await page.goto(local.base);
    await page.waitForFunction(
      () => window.__cityQA && window.__citySave?.cloud.editable,
    );
    await page.evaluate(() => {
      window.__cityQA.focus("jobcity");
      window.__cityQA.islandOverview();
    });
    await page.waitForFunction(
      () =>
        [...window.__cityQA.itemGroups.values()].filter(
          (g) => g.userData.jobBusiness,
        ).length === 6,
    );
    await page.waitForFunction(
      () => window.__citySave.getGame().jobCity.plan?.source === "local",
    );
    assert.equal(aiCalls, 1);
    console.log(
      "All six buildings prepared; one failed batch fell back locally.",
    );
    await page.evaluate(() => {
      const s = window.__citySave,
        w = s.world;
      w.performResident("jobcat-cars-0", {
        activityId: "job-furniture",
        action: "explore",
        mood: "happy",
      });
      window.__cityManualResult = null;
      w.perform({
        activityId: "job-bank",
        action: "explore",
        mood: "happy",
      }).then((result) => (window.__cityManualResult = result));
      w.sync(s.getGame());
      window.__cityQA.step(160);
    });
    await page.waitForTimeout(1500);
    const report = await page.evaluate(() => ({
      workers: [...window.__cityQA.jobs.states.values()]
        .filter((s) => s.phase === "work")
        .map((s) => ({
          id: s.id,
          job: s.job,
          floor: Math.round((s.position.y - 0.32) / 4.6),
        })),
      buildings: [...window.__cityQA.itemGroups.values()]
        .filter((g) => g.userData.jobBusiness)
        .map((g) => ({ id: g.userData.id, stats: g.userData.stats })),
      render: window.__cityQA.renderer.info.render,
      memory: window.__cityQA.renderer.info.memory,
      dpr: window.__cityQA.renderer.getPixelRatio(),
      canvas: {
        w: window.__cityQA.renderer.domElement.width,
        h: window.__cityQA.renderer.domElement.height,
      },
    }));
    assert.ok(report.workers.length >= 12, JSON.stringify(report));
    assert.equal(new Set(report.workers.map((w) => w.job)).size, 6);
    await page.screenshot({ path: review + "/jobcity-desktop.png" });
    await page.evaluate(() => window.__cityQA.inspectAttraction("job-bank"));
    console.log(
      "Bank camera",
      await page
        .evaluate(() => ({
          desired: window.__cityQA.desiredLook.toArray(),
          job: window.__cityQA.itemGroups.get("job-bank").position.toArray(),
        }))
        .catch(() => null),
    );
    await page.evaluate(() => window.__cityQA.snap());
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.__cityQA.capture());
    await page.waitForFunction(() => window.__cityManualResult?.completed);
    await page.screenshot({ path: review + "/jobcity-bank.png" });
    await page.locator("#jobcity-open").click();
    assert.match(
      await page.locator("#jobcity-dialog").innerText(),
      /зароблено/,
    );
    await page.locator("#jobcity-cat").selectOption("chichi");
    await page
      .getByRole("button", { name: "Купити", exact: true })
      .first()
      .click();
    assert.equal(
      await page.evaluate(
        () =>
          window.__citySave.getGame().jobCity.profiles.chichi.inventory[
            "car-peach"
          ],
      ),
      1,
    );
    await page
      .getByRole("button", { name: "🚗 Вибрати машину й точку" })
      .click();
    await page.evaluate(() => window.__cityQA.snap());
    await page.waitForTimeout(2000);
    const road = await page.evaluate(() =>
      window.__cityQA.project(-456, 0.24, -88),
    );
    await page.mouse.click(road.x, road.y);
    await page.waitForFunction(
      () => window.__citySave.getGame().jobCity.profiles.chichi.trip,
    );
    const destination = await page.evaluate(() => ({
      ...window.__citySave.getGame().jobCity.profiles.chichi.trip.destination,
    }));
    await page.evaluate(() => window.__cityQA.step(150));
    await page.waitForFunction(
      () => !window.__citySave.getGame().jobCity.profiles.chichi.trip,
    );
    const parked = await page.evaluate(
      () => window.__citySave.getGame().jobCity.profiles.chichi.parkedAt,
    );
    assert.ok(
      Math.hypot(parked.x - destination.x, parked.z - destination.z) < 1.6,
      "parked in the chosen road lane",
    );
    assert.equal(aiCalls, 1);
    console.log("Manual purchase and drive finished.");
    await page.evaluate(() => window.__citySave.cloud.flush());
    const before = await page.evaluate(() =>
      structuredClone(window.__citySave.getGame().jobCity.profiles.chichi),
    );
    await page.reload();
    await page.waitForFunction(
      () => window.__citySave?.cloud.editable && window.__cityQA,
    );
    assert.equal(aiCalls, 1);
    const after = await page.evaluate(
      () => window.__citySave.getGame().jobCity.profiles.chichi,
    );
    assert.equal(after.coins, before.coins);
    assert.equal(after.profession, before.profession);
    assert.deepEqual(after.inventory, before.inventory);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      window.__cityQA.focus("jobcity");
      window.__cityQA.islandOverview();
    });
    await page.waitForTimeout(1500);
    await page.locator("#jobcity-open").click();
    await page.screenshot({ path: review + "/jobcity-phone-wallet.png" });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
    await page.locator("#jobcity-dialog .close").click();
    await page.screenshot({ path: review + "/jobcity-phone.png" });
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      review + "/jobcity.json",
      JSON.stringify(
        {
          ...report,
          aiCalls,
          checks: [
            "six real buildings",
            "all professions actually working",
            "safe API fallback",
            "one batch per day",
            "private purchase",
            "manual road tap",
            "car arrives and exits",
            "SQLite/reload inventory and career",
            "mobile layout",
          ],
          errors,
        },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify({
        workers: report.workers.length,
        aiCalls,
        review,
        errors,
      }),
    );
  } finally {
    await browser?.close();
    local.stop();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
