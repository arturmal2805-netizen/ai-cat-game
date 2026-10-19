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
    path.join(os.tmpdir(), "chichi-housing-review");
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
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "chichi-housing-"));
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
      name: "chichi-housing-local",
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
async function verifyHousingStorage(local, headers, seed, example) {
  // A second isolated SQLite world exercises the chunked storage path with
  // a genuine large permanent house ledger, not a fake renderer snapshot.
  const large = structuredClone(seed);

  large.housing = {
    version: 1,
    homes: {},
    residences: { chichi: "house-chichi-1" },
  };
  for (let i = 1; i <= 2500; i++) {
    const id = "house-chichi-" + i;
    large.housing.homes[id] = {
      ...example,
      id,
      sequence: i,
      purchaseId: "buy-chichi-" + i,
      plot: i - 1,
      roommate: null,
    };
  }
  large.unlocked = [...new Set([...large.unlocked, "cat-homes"])];
  large.jobCity.profiles.chichi.purchaseCount = 2500;
  large.jobCity.profiles.chichi.spentTotal = 2500 * example.price;
  large.jobCity.profiles.chichi.coins =
    9000000 - large.jobCity.profiles.chichi.spentTotal;
  const largeHeaders = {
    ...headers,
    "X-Chichi-Save-Token": crypto.randomBytes(32).toString("hex"),
  };
  const mutation = crypto.randomUUID(),
    body = JSON.stringify({
      expectedRevision: 0,
      mutationId: mutation,
      game: large,
    });
  assert.ok(Buffer.byteLength(body) > 512 * 1024);
  for (let i = 0; i < 5; i++) {
    const result = await (
      await fetch(local.base + "/api/save", {
        method: "PUT",
        headers: largeHeaders,
        body,
      })
    ).json();
    assert.equal(result.revision, 1, JSON.stringify(result));
    const recovered = await (
      await fetch(local.base + "/api/save", { headers: largeHeaders })
    ).json();
    assert.deepEqual(recovered.game.housing, large.housing);
    assert.equal(
      recovered.game.jobCity.profiles.chichi.coins,
      large.jobCity.profiles.chichi.coins,
    );
  }
  console.log(
    "2,500 homes survived chunked SQLite storage and five lost-acknowledgement retries.",
  );
  const { buyCatHome } = await import(root + "/public/housing-system.js");
  const other = Object.keys(large.jobCity.profiles).find(
    (id) => id !== "chichi",
  );
  const a = buyCatHome(large, "chichi", example.type, "buy-chichi-2501");
  const b = buyCatHome(large, other, example.type, "buy-" + other + "-1");
  const write = (game, clientId) => ({
    expectedRevision: 1,
    mutationId: crypto.randomUUID(),
    cooperative: true,
    clientId,
    sequence: 1,
    baseGame: large,
    game,
  });
  const wa = write(a, "qa-housing-phone-a"),
    wb = write(b, "qa-housing-phone-b");
  const send = async (value) => {
    const response = await fetch(local.base + "/api/save", {
      method: "PUT",
      headers: largeHeaders,
      body: JSON.stringify(value),
    });
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    return result;
  };
  await Promise.all([send(wa), send(wb)]);
  const late = await send(wa);
  assert.equal(late.revision, 3);
  const cached = structuredClone(large);
  delete cached.housing;
  cached.unlocked = cached.unlocked.filter((id) => id !== "cat-homes");
  cached.cat.happiness = 80;
  const legacy = await send(write(cached, "qa-housing-cached-phone"));
  assert.equal(legacy.revision, 4);
  assert.equal(Object.keys(legacy.game.housing.homes).length, 2502);
  assert.equal(
    new Set(Object.values(legacy.game.housing.homes).map((h) => h.plot)).size,
    2502,
  );
  assert.equal(
    legacy.game.jobCity.profiles.chichi.coins,
    a.jobCity.profiles.chichi.coins,
  );
  assert.equal(
    legacy.game.jobCity.profiles[other].coins,
    b.jobCity.profiles[other].coins,
  );
  for (const [id, h] of Object.entries(large.housing.homes))
    assert.deepEqual(legacy.game.housing.homes[id], h);
  console.log(
    "Concurrent phone purchases, a delayed retry and a cached client preserved all 2,502 homes and exact private balances in SQLite.",
  );
}
(async () => {
  const local = await localWorker();
  let browser;
  try {
    const { build } = require(root + "/node_modules/esbuild");
    const { newGame } = await import(root + "/public/economy.js");
    const { ensureJobCity, localJobPlan } = await import(
      root + "/public/jobcity-system.js"
    );
    const { HOUSE_TYPES } = await import(root + "/public/housing-data.js");
    const { xpForLevel, gameDay } = await import(
      root + "/public/progression.js"
    );
    const now = Date.now();
    let g = newGame(now);
    g.unlocked.push("jobcity");
    g = ensureJobCity(g, now);
    g.progression.xp = xpForLevel(14);
    g.lastVisit = gameDay(now);
    g.progression.lastVisitDay = gameDay(now);
    g.catPosition = { biome: "jobcity", x: 0, z: 55 };
    for (const p of Object.values(g.jobCity.profiles)) {
      p.coins = 100000;
      p.lastEveningDay = 0;
      p.lastPaidDay = 0;
    }
    const token = crypto.randomBytes(32).toString("hex"),
      headers = {
        "Content-Type": "application/json",
        "X-Chichi-Save-Token": token,
      };
    const initial = await fetch(local.base + "/api/save", {
      method: "PUT",
      headers,
      body: JSON.stringify({
        expectedRevision: 0,
        mutationId: crypto.randomUUID(),
        game: g,
      }),
    });
    const saved = await initial.json();
    assert.equal(saved.revision, 1, JSON.stringify(saved));
    if (process.env.CHICHI_HOUSING_STORAGE_ONLY === "1") {
      const { buyCatHome } = await import(root + "/public/housing-system.js");
      const example = Object.values(
        buyCatHome(g, "chichi", HOUSE_TYPES[0].id, "buy-chichi-1").housing
          .homes,
      )[0];
      await verifyHousingStorage(local, headers, g, example);
      return;
    }
    const output = await build({
      entryPoints: [root + "/public/app.js"],
      bundle: true,
      format: "esm",
      write: false,
      plugins: [
        {
          name: "private-housing-qa",
          setup(b) {
            b.onLoad({ filter: /\/public\/world\.js$/ }, () => ({
              loader: "js",
              contents: fs
                .readFileSync(root + "/public/world.js", "utf8")
                .replace(
                  "  return {\n    perform,",
                  `  window.__housingQA={housingLife,islands,camera,renderer,scene,npcs,cat,chichiCarrier,desiredLook,focus,
          step:seconds=>{const s=window.__housingSave.getGame();for(let i=0;i<seconds*30;i++)housingLife.step(s,[{id:'chichi',radius:spaRadius(cat)},...[...npcs].map(([id,n])=>({id,radius:spaRadius(n.model)}))],1/30,i/30,{night:true});},
          capture:()=>{gpuFrames.clear();look.copy(desiredLook);distance=desiredDistance;camera.position.set(look.x+Math.sin(azimuth)*Math.cos(elevation)*distance,look.y+Math.sin(elevation)*distance,look.z+Math.cos(azimuth)*Math.cos(elevation)*distance);camera.lookAt(look);renderer.render(scene,camera);renderer.getContext().finish();}};\n  return {\n    perform,`,
                ),
            }));
            b.onLoad({ filter: /\/public\/app\.js$/ }, () => ({
              loader: "js",
              contents: fs
                .readFileSync(root + "/public/app.js", "utf8")
                .replace(
                  "persist();\nrenderGame();",
                  "window.__housingSave={getGame:()=>game,commit,world,cloud,replay:()=>commit(applyJobPlan(game,game.jobCity.plan.assignments,game.jobCity.plan.day,'ai'))};\npersist();\nrenderGame();",
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
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
    });
    page.setDefaultTimeout(120000);
    const errors = [];
    page.on(
      "pageerror",
      (e) => (errors.push(e.message), console.log("PAGE ERROR", e.message)),
    );
    page.on("console", (m) => {
      if (m.type() === "error") console.log("BROWSER", m.text());
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
      { g, token },
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
    let aiCalls = 0;
    await page.route("**/api/jobcity/plan", (r) => {
      aiCalls++;
      const state = JSON.parse(r.request().postData());
      assert.equal(state.housingOffers.length, 7);
      const assignments = localJobPlan(
        state.cats.map((c) => ({ ...c, inventory: {} })),
        state.day,
      );
      assignments.find((a) => a.id === "chichi").house = {
        type: HOUSE_TYPES[1].id,
        roommate: "luna",
      };
      return r.fulfill({ json: { day: state.day, assignments } });
    });
    await page.goto(local.base);
    await page.waitForFunction(
      () =>
        window.__housingQA &&
        window.__housingSave?.cloud.editable &&
        window.__housingSave.getGame().housing,
    );
    assert.equal(aiCalls, 1);
    let homes = await page.evaluate(() =>
      Object.values(window.__housingSave.getGame().housing.homes),
    );
    assert.equal(homes.length, 1);
    assert.equal(homes[0].source, "ai");
    const firstHome = homes[0].id;
    console.log("Daily AI bought a permanent house automatically.");
    await page.locator("#jobcity-open").click();
    await page.locator("#jobcity-cat").selectOption("chichi");
    await page
      .getByLabel("Категорія покупки", { exact: true })
      .selectOption("property");
    for (let i = 0; i < 12; i++)
      await page
        .getByRole("button", { name: "Купити", exact: true })
        .nth(i % 7)
        .click();
    homes = await page.evaluate(() =>
      Object.values(window.__housingSave.getGame().housing.homes),
    );
    assert.equal(homes.length, 13);
    const activeHome = await page.evaluate(
      () => window.__housingSave.getGame().housing.residences.chichi,
    );
    assert.equal(activeHome, firstHome);
    assert.equal(new Set(homes.map((h) => h.plot)).size, 13);
    assert.equal(
      await page
        .locator("#jobcity-dialog")
        .getByText("Нерухомість", { exact: true })
        .count(),
      1,
    );
    const propertyButton = page
      .locator(".housing-item button")
      .filter({ hasText: "№13" });
    await propertyButton.click();
    await page.waitForFunction(
      (id) =>
        window.__housingQA.islands.get("cat-homes").userData.houses.has(id),
      homes.at(-1).id,
    );
    const desired = await page.evaluate(() =>
      window.__housingQA.desiredLook.toArray(),
    );
    assert.ok(
      desired[0] < -680,
      "inventory focuses the exact house in the second section",
    );
    await page.waitForTimeout(1200);
    await page.evaluate(() => window.__housingQA.capture());
    await page.screenshot({ path: review + "/housing-expansion.png" });
    await page.evaluate((id) => {
      const s = window.__housingSave,
        g = structuredClone(s.getGame());
      g.jobCity.epoch = Date.now() - 610000;
      g.jobCity.profiles.chichi.name = "Чічі Квіточка";
      s.commit(g);
      s.world.showCatHome(id);
      window.__housingQA.step(170);
    }, firstHome);
    await page.waitForFunction(
      (id) =>
        window.__housingQA.islands.get("cat-homes").userData.houses.has(id),
      firstHome,
    );
    await page.waitForTimeout(1500);
    const residents = await page.evaluate(() =>
      [...window.__housingQA.housingLife.visits.values()].map((v) => ({
        id: v.catId,
        phase: v.phase,
        home: v.objectId,
        x: v.position.x,
        z: v.position.z,
      })),
    );
    const owner = residents.find((v) => v.id === "chichi"),
      roommate = residents.find((v) => v.id === "luna");
    assert.equal(owner.phase, "relax");
    assert.equal(roommate.phase, "relax");
    assert.equal(owner.home, roommate.home);
    assert.ok(Math.hypot(owner.x - roommate.x, owner.z - roommate.z) >= 3);
    assert.equal(
      await page.evaluate(
        (id) =>
          window.__housingQA.islands.get("cat-homes").userData.houses.get(id)
            .userData.ownerName,
        firstHome,
      ),
      "Чічі Квіточка",
    );
    await page.evaluate(() => window.__housingQA.capture());
    await page.screenshot({ path: review + "/housing-couple.png" });
    const before = await page.evaluate(() => ({
      homes: structuredClone(window.__housingSave.getGame().housing),
      coins: window.__housingSave.getGame().jobCity.profiles.chichi.coins,
    }));
    await page.evaluate(() => window.__housingSave.replay());
    assert.equal(
      await page.evaluate(
        () => Object.keys(window.__housingSave.getGame().housing.homes).length,
      ),
      13,
    );
    await page.evaluate(() => window.__housingSave.cloud.flush());
    const remote = await (
      await fetch(local.base + "/api/save", { headers })
    ).json();
    assert.deepEqual(remote.game.housing, before.homes);
    assert.equal(remote.game.jobCity.profiles.chichi.coins, before.coins);
    await page.reload();
    await page.waitForFunction(
      () => window.__housingSave?.cloud.editable && window.__housingQA,
    );
    assert.equal(aiCalls, 1);
    assert.deepEqual(
      await page.evaluate(() => window.__housingSave.getGame().housing),
      before.homes,
    );
    assert.equal(
      await page.evaluate(
        () => window.__housingSave.getGame().jobCity.profiles.chichi.coins,
      ),
      before.coins,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#jobcity-open").click();
    await page.screenshot({ path: review + "/housing-phone-inventory.png" });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.locator("#jobcity-dialog .close").click();
    await page.evaluate(
      (id) => window.__housingSave.world.showCatHome(id),
      firstHome,
    );
    await page.waitForTimeout(1500);
    await page.screenshot({ path: review + "/housing-phone.png" });
    await verifyHousingStorage(local, headers, g, homes[0]);
    assert.deepEqual(errors, []);
    const report = {
      houses: 13,
      sections: 2,
      aiCalls,
      residents,
      checks: [
        "automatic daily AI purchase",
        "twelve manual purchases",
        "exact house camera",
        "Chill models",
        "owner name update",
        "two separate sleeping cats",
        "duplicate plan replay",
        "SQLite read-back",
        "reload without charges or duplicates",
        "390px phone layout",
      ],
      errors,
    };
    fs.writeFileSync(review + "/housing.json", JSON.stringify(report, null, 2));
    console.log(
      JSON.stringify({ houses: 13, sections: 2, aiCalls, errors, review }),
    );
  } finally {
    if (browser) await browser.close();
    local.stop();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
