// Real-browser family UI/native interaction and private SQLite save check.
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  net = require("node:net"),
  crypto = require("node:crypto"),
  assert = require("node:assert/strict"),
  { spawn } = require("node:child_process");
const { chromium } = require(
  process.env.CHICHI_PLAYWRIGHT_MODULE || "playwright",
);
const root = path.resolve(__dirname, ".."),
  review =
    process.env.CHICHI_REVIEW_DIR ||
    path.join(os.tmpdir(), "chichi-family-review");
fs.mkdirSync(review, { recursive: true });
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
  fs.cpSync(path.join(root, "public"), path.join(temp, "public"), { recursive: true });
  fs.writeFileSync(
    config,
    JSON.stringify({
      name: "chichi-housing-local",
      main: path.join(temp, "worker.mjs"),
      compatibility_date: "2026-10-13",
      assets: {
        directory: path.join(temp, "public"),
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
    const { newGame } = await import(root + "/public/economy.js");
    const { ensureJobCity, localJobPlan, applyJobPlan } = await import(
      root + "/public/jobcity-system.js"
    );
    const { buyCatHome } = await import(root + "/public/housing-system.js");
    const { ADOPTION_CATS } = await import(root + "/public/cat-breeds.js");
    const { catSex } = await import(root + "/public/cat-sex.js");
    const now = Date.now();
    let g = newGame(now);
    g.unlocked = ["moon", "water", "bikini", "jobcity", "cat-homes"];
    g.coins = 10000;
    g.progression.xp = 10000;
    g.adoption.cats = ADOPTION_CATS.filter((c) =>
      ["adopt-nimbus", "adopt-cloudberry"].includes(c.id),
    ).map((c) => ({
      id: c.id,
      adoptedAt: now,
      homeBiome: "moon",
      centerId: "",
    }));
    g = ensureJobCity(g, now);
    g = applyJobPlan(
      g,
      localJobPlan(Object.values(g.jobCity.profiles), 27),
      27,
    );
    for (const p of Object.values(g.jobCity.profiles)) {
      p.coins = 10000;
      p.careerAIPending = false;
    }
    g = buyCatHome(g, "chichi", "home-sage", "buy-chichi-1");
    g.family.lastReviewDay = 27; // Released save consumed two empty reviews.
    g.jobCity.epoch = now - (27 * 1440 + 450) * 1000;
    g.jobCity.plan = null;
    g.jobCity.requestedDay = -1;
    const token = crypto.randomBytes(32).toString("hex"),
      headers = {
        "Content-Type": "application/json",
        "X-Chichi-Save-Token": token,
      };
    const stored = await (
      await fetch(local.base + "/api/save", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          expectedRevision: 0,
          mutationId: crypto.randomUUID(),
          game: g,
        }),
      })
    ).json();
    assert.equal(stored.revision, 1, JSON.stringify(stored));
    const output = await build({
      entryPoints: [root + "/public/app.js"],
      bundle: true,
      format: "esm",
      write: false,
      plugins: [
        {
          name: "private-family-qa",
          setup(b) {
            b.onLoad({ filter: /\/public\/world\.js$/ }, () => ({
              loader: "js",
              contents: fs
                .readFileSync(root + "/public/world.js", "utf8")
                .replace(
                  "  return {\n    perform,",
                  `  window.__familyQA={leisure,jobs,housingLife,court,spa,npcs,cat,chichiCarrier,itemGroups,islands,camera,scene,renderer,desiredLook,
      cancel:id=>id==='chichi'?cancelHeroActivity():cancelResident(id),
      trace:[],nativeStep:seconds=>{const states=new Map();for(let i=0;i<seconds*30;i++){const t=performance.now()/1000+i/30;stepLeisure(1/30,t,performance.now());court.step(1/30,t);for(const[id,n]of npcs){const v=court.get(id),f=leisure.frame(id);if(v){const b=byBiome(v.biome);n.carrier.position.set(b.center[0]+v.position.x,v.position.y,b.center[1]+v.position.z);}else if(f)n.carrier.position.set(f.position.x,f.position.y,f.position.z);}for(const id of ['luna','moti']){const p=game.jobCity.profiles[id],v=leisure.get(id),c=court.get(id),j=jobs.get(id),key=JSON.stringify([v?.phase,c?.phase,p.leisureProgress]);if(states.get(id)!==key){states.set(id,key);window.__familyQA.trace.push({id,second:i/30,visit:v?.phase,court:c?.phase,progress:p.leisureProgress,schedule:p.schedule,clock:cityClock(game.jobCity),job:j?.phase,manual:npcs.get(id)?.manualUntil,canSimulate:callbacks.canSimulateLeisure?.(),saveState:document.getElementById('save-state')?.textContent});}}}},
      homeStep:seconds=>{for(let i=0;i<seconds*30;i++)housingLife.step(game,[{id:'chichi',radius:spaRadius(cat)},...[...npcs].map(([id,n])=>({id,radius:spaRadius(n.model)}))],1/30,i/30,{night:true});},
      capture:()=>{gpuFrames.clear();look.copy(desiredLook);distance=desiredDistance;camera.position.set(look.x+Math.sin(azimuth)*Math.cos(elevation)*distance,look.y+Math.sin(elevation)*distance,look.z+Math.cos(azimuth)*Math.cos(elevation)*distance);camera.lookAt(look);renderer.render(scene,camera);renderer.getContext().finish();}};\n  return {\n    perform,`,
                ),
            }));
            b.onLoad({ filter: /\/public\/app\.js$/ }, () => ({
              loader: "js",
              contents: fs
                .readFileSync(root + "/public/app.js", "utf8")
                .replace(
                  "persist();\nrenderGame();",
                  `window.__familySave={getGame:()=>game,commit,world,cloud,open:()=>cityUI.open(),setClock:minute=>{const n=structuredClone(game);n.jobCity.epoch=Date.now()-(27*1440+minute-720)*1000;commit(n);}};\npersist();\nrenderGame();`,
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
    page.on("pageerror", (e) => {
      errors.push(e.message);
      console.log("PAGE ERROR", e.message);
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
    let aiCalls = 0, receiptReads = 0, receiptEvent = null;
    const lostAck = !!process.env.CHICHI_FAMILY_LOST_ACK;
    let allowRecovery = !lostAck;
    await page.route("**/api/jobcity/status", r => {
      receiptReads++;
      return r.fulfill({ json: { epoch: receiptEvent?.epoch ?? null, events: allowRecovery && receiptEvent ? [receiptEvent] : [] } });
    });
    await page.route("**/api/jobcity/plan", (r) => {
      aiCalls++;
      const s = JSON.parse(r.request().postData());
      assert.equal(s.familyReview.due, true);
      const assignments = localJobPlan(
        s.cats.map((c) => ({ ...c, inventory: {} })),
        s.day,
      );
      for (const a of assignments) {
        a.job = "rest";
        a.evening = "walk";
        a.outings = ["luna", "moti"].includes(a.id) ? ["bikini-krusty"] : [];
      }
      assignments.find(a => a.id === "peach").house = { type: "home-sage", roommate: null };
      const body = {
          day: s.day,
          phase: s.phase,
          assignments,
          families: [
            {
              male: "adopt-nimbus",
              female: "chichi",
              reason: "Люблять затишок і пригоди",
            },
            {
              male: "luna",
              female: "moti",
              reason: "Разом веселіше досліджувати острови",
            },
          ],
        };
      receiptEvent = { epoch:s.epoch, phase:s.phase, day:s.day, status:200, pending:false, body };
      return lostAck ? r.abort("connectionreset") : r.fulfill({ json:body });
    });
    await page.goto(local.base);
    if (lostAck) {
      await page.waitForFunction(() => window.__familySave?.getGame().jobCity.eveningAIRequestedDay >= 0 && window.__familySave.cloud.editable);
      assert.equal(aiCalls, 1);
      assert.equal(await page.evaluate(() => Object.keys(__familySave.getGame().family.couples).length), 0);
      await page.evaluate(() => __familySave.cloud.flush());
      allowRecovery = true;
      await page.reload();
    }
    await page.waitForFunction(
      () =>
        window.__familyQA &&
        window.__familySave?.cloud.editable &&
        Object.keys(window.__familySave.getGame().family?.couples || {})
          .length === 2,
    );
    assert.equal(aiCalls, 1);
    console.log(
      lostAck ? "Reload recovered cached AI families after a lost ACK; no second inference." : "Real app applied one mocked daily AI response, two permanent pairs and shared itinerary.",
    );
    await page.evaluate(() => window.__familySave.open());
    const dialog = page.locator("#jobcity-dialog");
    await dialog.waitFor({ state: "visible" });
    await page.selectOption("#jobcity-cat", "chichi");
    await page.waitForSelector(".cat-family-couple");
    assert.equal(
      await dialog.locator(".cat-family-couple .cat-profile-card").count(),
      2,
    );
    assert.equal(await dialog.locator(".cat-family-heart").textContent(), "♥");
    assert.ok((await dialog.innerText()).includes("День 28"));
    assert.ok((await dialog.innerText()).includes("Наш спільний дім"));
    await dialog.getByRole("button", { name: "Сім’я", exact: true }).click();
    await page
      .waitForFunction(
        () =>
          [...document.querySelectorAll(".cat-profile-photo img")].every(
            (i) => i.complete && i.naturalWidth,
          ),
        null,
        { timeout: 15000 },
      )
      .catch(async (error) => {
        console.log(
          await dialog.locator("img").evaluateAll((imgs) =>
            imgs.map((i) => ({
              src: i.src,
              complete: i.complete,
              width: i.naturalWidth,
            })),
          ),
        );
        throw error;
      });
    assert.equal(
      await dialog
        .locator(".cat-profile-photo img")
        .evaluateAll(
          (images) =>
            images.filter((i) => !i.complete || !i.naturalWidth).length,
        ),
      0,
    );
    await dialog.getByRole("button", { name: "Сім’я", exact: true }).click();
    await page
      .locator("#cat-life-family")
      .evaluate((el) =>
        el.scrollIntoView({ behavior: "instant", block: "start" }),
      );
    await page.screenshot({ path: path.join(review, "family-desktop.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    await dialog.getByRole("button", { name: "Сім’я", exact: true }).click();
    await page
      .locator("#cat-life-family")
      .evaluate((el) =>
        el.scrollIntoView({ behavior: "instant", block: "start" }),
      );
    await page.screenshot({ path: path.join(review, "family-phone.png") });
    const layout = await dialog.evaluate((d) => ({
      width: d.clientWidth,
      scroll: d.scrollWidth,
      window: innerWidth,
    }));
    assert.ok(layout.scroll <= layout.width + 1, JSON.stringify(layout));
    assert.ok(layout.width < 390);
    await dialog.getByRole("button", { name: "Інвентар", exact: true }).click();
    await dialog
      .getByRole("button", { name: "Нерухомість", exact: true })
      .click();
    await page.selectOption("#jobcity-cat", "luna");
    await dialog.getByRole("button", { name: "Нерухомість", exact: true }).click();
    const housingStatus = await dialog.locator(".housing-ai-status").innerText();
    assert.match(housingStatus, /Вечірній вибір збережено/);
    assert.match(housingStatus, /Покупка залишається добровільною/);
    await page.locator("#cat-life-property").evaluate(el =>
      el.scrollIntoView({ behavior: "instant", block: "start" }),
    );
    await page.screenshot({ path: path.join(review, "housing-status-phone.png") });
    await dialog.getByRole("button", { name: "Сім’я", exact: true }).click();
    assert.equal(
      await dialog.locator(".cat-family-couple .cat-profile-card").count(),
      2,
    );
    await dialog.getByRole("button", { name: "Закрити Cat Job City" }).click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => window.__familySave.world.focus("bikini"));
    await page.waitForFunction(
      () => window.__familyQA.itemGroups.get("bikini-krusty")?.userData.built,
    );
    // Slow software-GPU preparation and card screenshots can advance the real
    // clock past the 22:00 curfew. Exercise the evening visit at its authored
    // time; the separate home check below explicitly advances to 23:00.
    await page.evaluate(() => {
      window.__familySave.setClock(19 * 60 + 30);
      window.__familyQA.nativeStep(250);
    });
    const outings = await page.evaluate(() =>
      ["luna", "moti"].map((id) => ({
        id,
        progress:
          window.__familySave.getGame().jobCity.profiles[id].leisureProgress,
        visit: window.__familyQA.leisure.get(id)?.phase,
        court: window.__familyQA.court.get(id)?.phase,
      })),
    );
    if (!outings.every((c) => c.progress?.done === 1)) {
      const trace = await page.evaluate(() => __familyQA.trace);
      fs.writeFileSync(
        path.join(review, "leisure-debug.json"),
        JSON.stringify(trace, null, 2),
      );
      console.log("LEISURE_DEBUG", JSON.stringify(trace.slice(-12)));
    }
    assert.ok(
      outings.every((c) => c.progress?.done === 1),
      JSON.stringify(outings),
    );
    console.log(
      "Both partners completed the real native Krusty Krab queue, order, meal and departure.",
    );
    const before = await page.evaluate(() => ({
      family: structuredClone(window.__familySave.getGame().family),
      housing: structuredClone(window.__familySave.getGame().housing),
      profiles: structuredClone(window.__familySave.getGame().jobCity.profiles),
    }));
    await page.evaluate(() => window.__familySave.cloud.flush());
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await page.waitForFunction(
        () => window.__familyQA && window.__familySave?.cloud.editable,
      );
      const after = await page.evaluate(() => ({
        family: window.__familySave.getGame().family,
        housing: window.__familySave.getGame().housing,
        coins: window.__familySave.getGame().jobCity.profiles.chichi.coins,
      }));
      assert.deepEqual(after.family, before.family);
      assert.deepEqual(after.housing, before.housing);
      assert.equal(after.coins, before.profiles.chichi.coins);
      assert.equal(aiCalls, 1);
    }
    console.log(
      "Three reloads preserved couples, calendar, exact homes/private balances and completed outings without another AI call.",
    );
    const sharedHome = await page.evaluate(
      () => window.__familySave.getGame().housing.residences.chichi,
    );
    const aiHome = await page.evaluate(() => {
      const g=__familySave.getGame(), homes=Object.values(g.housing.homes);
      if(homes.length!==2)throw Error('The evening purchase did not produce a second home');
      const h=homes.find(h=>h.owner==='peach');
      if(!h || h.source!=='ai')throw Error('Missing AI purchase receipt');
      if(g.jobCity.profiles.peach.coins!==8400)throw Error('AI home charged more than once');
      return h.id;
    });
    await page.evaluate(id=>__familySave.world.showCatHome(id),aiHome);
    await page.waitForFunction(id=>__familyQA.islands.get('cat-homes').userData.houses.has(id),aiHome);
    console.log('AI-purchased native Chill house rendered after three reloads, charged exactly once.');
    await page.evaluate(
      (id) => window.__familySave.world.showCatHome(id),
      sharedHome,
    );
    await page.waitForFunction(
      (id) =>
        window.__familyQA.islands.get("cat-homes").userData.houses.has(id),
      sharedHome,
    );
    await page.evaluate(() => {
      window.__familySave.setClock(23 * 60);
      window.__familyQA.homeStep(250);
    });
    const sleeping = await page.evaluate(() =>
      ["chichi", "adopt-nimbus"].map((id) => {
        const v = window.__familyQA.housingLife.get(id);
        return { id, phase: v?.phase, seat: v?.seat, radius: v?.radius };
      }),
    );
    assert.ok(
      sleeping.every((v) => v.phase === "relax"),
      JSON.stringify(sleeping),
    );
    const [owner, spouse] = sleeping;
    assert.ok(
      Math.hypot(owner.seat.x - spouse.seat.x, owner.seat.z - spouse.seat.z) >
        owner.radius + spouse.radius,
    );
    await page.evaluate(() => window.__familySave.open());
    await page.selectOption("#jobcity-cat", "chichi");
    await page
      .getByRole("button", { name: "Наш спільний дім", exact: false })
      .click();
    await page.evaluate(() => window.__familyQA.capture());
    await page.screenshot({ path: path.join(review, "family-home.png") });
    // A second private SQLite world exercises real cooperative writes and
    // lost acknowledgements, with a cached client that does not know families.
    const snapshot = await page.evaluate(() =>
      structuredClone(window.__familySave.getGame()),
    );
    const storageHeaders = {
      ...headers,
      "X-Chichi-Save-Token": crypto.randomBytes(32).toString("hex"),
    };
    const receipt = crypto.randomUUID(),
      payload = { expectedRevision: 0, mutationId: receipt, game: snapshot };
    for (let i = 0; i < 5; i++) {
      const response = await fetch(local.base + "/api/save", {
        method: "PUT",
        headers: storageHeaders,
        body: JSON.stringify(payload),
      });
      const saved = await response.json();
      assert.equal(response.status, 200, JSON.stringify(saved));
      assert.equal(saved.revision, 1);
      const recovered = await (
        await fetch(local.base + "/api/save", { headers: storageHeaders })
      ).json();
      assert.deepEqual(recovered.game.family, snapshot.family);
    }
    const a = structuredClone(snapshot),
      b = structuredClone(snapshot);
    a.cat.happiness = Math.max(0, a.cat.happiness - 1);
    b.cat.energy = Math.max(0, b.cat.energy - 1);
    delete b.family;
    const writes = await Promise.all(
      [a, b].map(async (game, i) => {
        const response = await fetch(local.base + "/api/save", {
          method: "PUT",
          headers: storageHeaders,
          body: JSON.stringify({
            expectedRevision: 1,
            mutationId: crypto.randomUUID(),
            cooperative: true,
            clientId: "family-phone-" + i,
            sequence: 1,
            baseGame: snapshot,
            game,
          }),
        });
        const data = await response.json();
        assert.equal(response.status, 200, JSON.stringify(data));
        return data;
      }),
    );
    const storedFamily = await (
      await fetch(local.base + "/api/save", { headers: storageHeaders })
    ).json();
    assert.equal(storedFamily.revision, 3);
    assert.deepEqual(storedFamily.game.family, snapshot.family);
    assert.deepEqual(storedFamily.game.housing, snapshot.housing);
    console.log(
      "SQLite: five identical retries and concurrent phone writes (including an older client) preserved every family and shared home.",
    );
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(review, "family.json"),
      JSON.stringify(
        {
          aiCalls,
          couples: before.family.couples,
          layout,
          housingStatus,
          outings,
          sleeping,
          errors,
        },
        null,
        2,
      ),
    );
    console.log(
      "Shared home has two separate sleeping positions, phone cards fit, no browser errors. Review:",
      review,
    );
  } finally {
    await browser?.close();
    local.stop();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
