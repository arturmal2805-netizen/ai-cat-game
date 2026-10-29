// Optional browser/SQLite integration check. No production save or AI key is used.
const fs = require("node:fs"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto"),
  path = require("node:path"),
  os = require("node:os"),
  net = require("node:net"),
  { spawn } = require("node:child_process");
const { chromium, webkit } = require(
  process.env.CHICHI_PLAYWRIGHT_MODULE || "playwright",
);
const capture = process.env.CHICHI_MOSA_CAPTURE !== "0";
const auditGpuBuffers = require("./gpu-buffer-audit.cjs");
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
if (process.env.CHICHI_COMPARE_SCENERY_BLEND &&
    !readPublic("scenery-models.js").includes('./scenery-blending.js'))
  throw Error("Alpha-one comparison requires experiment/alpha-one-scenery-20261027 (585b2f1); the production branch keeps the released paint.");
if(process.env.CHICHI_COMPILE_VIEW_AUDIT && !readPublic("colony-render-batch.js").includes("createCompileLighting(scene)"))
  throw Error("Compile-view comparison requires experiment/colony-compile-lighting-20261027; production retains its original shader preparation.");

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
  // A build also rewrites the public entry/cache keys. Keep Wrangler's asset
  // watcher from reloading this private test server halfway through a probe.
  const assets = path.join(temp, "assets");
  fs.cpSync(path.join(root, "public"), assets, { recursive: true });
  // Wrangler's extra development ProxyWorker intermittently loses its upstream
  // connection during long harvest probes (POST/PUT are not retried by that
  // proxy). Use the same real workerd/SQLite/asset router directly for this
  // audit; keep the production Worker and browser save client unmodified.
  if(process.env.CHICHI_GATHER_AUDIT||process.env.CHICHI_ZOO_AUDIT||process.env.CHICHI_MAGIC_BED_AUDIT||process.env.CHICHI_MAGIC_FARM_AUDIT||process.env.CHICHI_FARM_WITHDRAWAL_AUDIT||process.env.CHICHI_OWNERSHIP_AUDIT){
    const {Miniflare,Log,LogLevel,convertV4MiniflareOptions}=require(root+'/node_modules/miniflare');
    const mf=new Miniflare(convertV4MiniflareOptions({name:'chichi-farm-local',rootPath:temp,host:'127.0.0.1',port,modules:true,
      scriptPath:path.join(temp,'worker.mjs'),compatibilityDate:'2026-10-13',
      bindings:{GAME_RELEASE:'development'},durableObjects:{SAVE_VAULT:{className:'SaveVault',useSQLite:true}},
      durableObjectsPersist:path.join(temp,'sqlite'),
      assets:{directory:assets,binding:'ASSETS',run_worker_first:['/api/*'],routerConfig:{has_user_worker:true}},log:new Log(LogLevel.ERROR)}));
    try{
      const url=await mf.ready;
      const check=await fetch(new URL('/api/save',url),{headers:{'X-Chichi-Save-Token':'0'.repeat(64)}});
      if(!check.ok)throw Error('Direct local Worker startup: '+check.status+' '+(await check.text()).slice(0,700));
      return {base:url.origin,stop:()=>{fs.closeSync(log);return mf.dispose();},env:process.env,logPath:path.join(temp,'worker.log')};
    }catch(error){await mf.dispose();fs.closeSync(log);throw error;}
  }
  fs.writeFileSync(
    config,
    JSON.stringify({
      name: "chichi-aquarium-local",
      main: path.join(temp, "worker.mjs"),
      compatibility_date: "2026-10-13",
      assets: {
        directory: assets,
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
        return { base, stop, env: localEnv, logPath: path.join(temp, "worker.log") };
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
    if(process.env.CHICHI_ATOLL_AUDIT){
      const {ATOLL_SLIDES,ATOLL_PARK_ID}=await import(root+'/public/atoll-slide-data.js');
      g.unlocked=['moon',ATOLL_PARK_ID];g.placements=g.placements.filter(p=>p.id.startsWith('welcome-'));
      g.progression.xp=xpForLevel(30);g.adoption.cats=[{id:'adopt-crumb',homeBiome:ATOLL_PARK_ID},{id:'adopt-marshmallow',homeBiome:ATOLL_PARK_ID}];
      for(const s of ATOLL_SLIDES.slice(0,19)){g.coins=10000000;Object.assign(g,purchase(g,s.id,now));const p=findSpace(g,s.id,ATOLL_PARK_ID);Object.assign(g,placeItem(g,s.id,ATOLL_PARK_ID,p.x,p.z,0,now));g.placements.at(-1).readyAt=0;}
      g.coins=8000000;g.catPosition={biome:ATOLL_PARK_ID,x:-305,z:0};g.catDestinations={};
    }
    if(process.env.CHICHI_ATOLL_LOADING_AUDIT){
      g.unlocked=['moon','homestead'];g.placements=g.placements.filter(p=>p.id.startsWith('welcome-'));g.progression.xp=xpForLevel(30);g.coins=800000;
      g.placements.push({id:'mega-cold',item:'slide-atoll-mega-loops',biome:'homestead',x:-90,z:-90,rotation:0,readyAt:0},{id:'mega-finishes',item:'slide-atoll-mega-loops',biome:'homestead',x:90,z:90,rotation:0,startedAt:now,readyAt:now+3600000},{id:'mega-cold-ride',item:'slide-atoll-mega-loops',biome:'homestead',x:-90,z:90,rotation:0,readyAt:0});
      g.catPosition={biome:'homestead',x:100,z:100};g.catDestinations={luna:'homestead',moti:'homestead'};
    }
    if(process.env.CHICHI_MAGIC_FARM_AUDIT){
      g.unlocked=['moon'];g.placements=g.placements.filter(p=>p.id.startsWith('welcome-'));g.progression.xp=xpForLevel(30);g.coins=1000000;g.catPosition={biome:'moon',x:0,z:0};g.catDestinations={};
      g.adoption.cats=[{id:'adopt-crumb',homeBiome:'moon'},{id:'adopt-marshmallow',homeBiome:'moon'}];
    }
    if(process.env.CHICHI_MAGIC_BED_AUDIT){
      g.unlocked=['moon','homestead'];g.placements=g.placements.filter(p=>p.id.startsWith('welcome-'));g.progression.xp=xpForLevel(30);g.coins=1000000;g.catPosition={biome:'homestead',x:0,z:15};g.catDestinations={luna:'homestead',moti:'homestead'};g.adoption.cats=[{id:'adopt-crumb',homeBiome:'homestead'},{id:'adopt-marshmallow',homeBiome:'homestead'}];
    }
    if(process.env.CHICHI_FARM_WITHDRAWAL_AUDIT){
      const {MAGIC_FARMS}=await import(root+'/public/magic-farms-data.js'),{newOrchard}=await import(root+'/public/magic-farm-state.js');
      g.worldRevision=4;g.unlocked=['moon','homestead',...MAGIC_FARMS.map(f=>f.id)];g.coins=290000;g.placements=g.placements.filter(p=>p.id.startsWith('welcome-'));g.catPosition={biome:'moon',x:0,z:0};g.catDestinations={luna:MAGIC_FARMS[1].id};g.farm.stock.starberry=7;g.farm.orchards=Object.fromEntries(MAGIC_FARMS.map(f=>[f.id,newOrchard(f.id,now)]));
      g.placements.push({id:'paid-farm-mouse',item:'mouse',biome:MAGIC_FARMS[0].id,x:2,z:3,rotation:0,readyAt:0},{id:'owned-mega-loops',item:'slide-atoll-mega-loops',biome:'homestead',x:-90,z:-90,rotation:0,readyAt:0});
    }
    if(process.env.CHICHI_GATHER_AUDIT){
      g.unlocked=['moon','homestead','atoll-park'];g.coins=300000;g.progression.xp=xpForLevel(30);g.catPosition={biome:'moon',x:0,z:0};g.placements=g.placements.filter(p=>p.id.startsWith('welcome-'));g.catDestinations={luna:'moon',moti:'moon'};
      g.adoption.cats=['adopt-crumb','adopt-marshmallow','adopt-magic-dragon'].map(id=>({id,homeBiome:'moon',adoptedAt:now}));
    }
    if(process.env.CHICHI_ZOO_AUDIT){
      g.unlocked=['moon'];g.coins=300000;g.progression.xp=xpForLevel(30);g.catPosition={biome:'moon',x:0,z:0};g.placements=g.placements.filter(p=>p.id.startsWith('welcome-'));g.catDestinations={luna:'moon',moti:'moon'};
      g.adoption.cats=[{id:'adopt-crumb',homeBiome:'moon',adoptedAt:now},{id:'adopt-marshmallow',homeBiome:'moon',adoptedAt:now}];
    }
    if(process.env.CHICHI_OWNERSHIP_AUDIT){
      g.unlocked=['moon','homestead'];g.coins=750000;g.progression.xp=xpForLevel(30);g.progression.discoveries.push('slide-atoll-mega-loops');g.catPosition={biome:'moon',x:0,z:0};g.catDestinations={luna:'moon',moti:'moon'};g.placements=g.placements.filter(p=>p.id.startsWith('welcome-'));
      g.placements.push({id:'paid-legacy-mega',item:'slide-atoll-mega-loops',biome:'homestead',x:1000,z:0,rotation:0,readyAt:0});
    }
    if (process.env.CHICHI_SCENE_STRESS) {
      const { ADOPTION_CATS } = await import(root + "/public/cat-breeds.js");
      const {REFERENCE_SLIDES}=await import(root+"/public/reference-slide-data.js");
      g.progression.xp = xpForLevel(30);
      g.coins = 8_000_000;
      for (const item of [
        "slide-glass-corkscrew",
        "slide-titan-funnel",
        "slide-sky-cannon",
        "slide-rainbow-tsunami",
        ...(process.env.CHICHI_ALL_SLIDE_STRESS ? REFERENCE_SLIDES.map(s=>s.id) : []),
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
    if (process.env.CHICHI_LIFE_STRESS || process.env.CHICHI_MAP_CHECK) {
      const { ADOPTION_CATS } = await import(root + "/public/cat-breeds.js");
      const { ensureJobCity } = await import(
        root + "/public/jobcity-system.js"
      );
      const { BIOMES } = await import(root + "/public/game-data.js");
      g.unlocked = BIOMES.map((b) => b.id);
      const roster = process.env.CHICHI_QA_ROSTER
        ? ADOPTION_CATS.slice(0, Number(process.env.CHICHI_QA_ROSTER))
        : ADOPTION_CATS;
      g.adoption.cats = roster.map((c) => ({
        id: c.id,
        adoptedAt: now,
        homeBiome: "homestead",
        centerId: "",
      }));
      for (const c of roster) g.catDestinations[c.id] = "homestead";
      Object.assign(g, ensureJobCity(g, now));
      if (process.env.CHICHI_MAP_CHECK) {
        const { localJobPlan, applyJobPlan, cityClock } = await import(
          root + "/public/jobcity-system.js"
        );
        const day = cityClock(g.jobCity, now).day;
        Object.assign(
          g,
          applyJobPlan(
            g,
            localJobPlan(Object.values(g.jobCity.profiles), day),
            day,
            "local",
            [],
            now,
          ),
        );
        g.jobCity.requestedDay = day;
        g.jobCity.eveningAIRequestedDay = day;
        for (const profile of Object.values(g.jobCity.profiles))
          profile.careerAIPending = false;
      }
    }
    if (process.env.CHICHI_QA_HOMES) {
      const {buyCatHome} = await import(root + "/public/housing-system.js");
      const {HOUSE_TYPES} = await import(root + "/public/housing-data.js");
      const owners = Object.keys(g.jobCity.profiles);
      for (const p of Object.values(g.jobCity.profiles)) p.coins = 1000000;
      for (let i=0;i<Number(process.env.CHICHI_QA_HOMES);i++) {
        const id=owners[i%owners.length], p=g.jobCity.profiles[id];
        Object.assign(g, buyCatHome(g,id,HOUSE_TYPES[i%HOUSE_TYPES.length].id,"buy-"+id+"-"+(p.purchaseCount+1)));
      }
    }
    if (process.env.CHICHI_CITY_MINIMAL) {
      g.unlocked = ["moon", "jobcity"];
      g.catPosition = { biome: "jobcity", x: 0, z: 20 };
      for (const p of g.adoption.cats) p.homeBiome = "jobcity";
      for (const id of Object.keys(g.catDestinations)) g.catDestinations[id] = "jobcity";
    }
    if(process.env.CHICHI_CAT_LOCATION_AUDIT){
      const {captureCatLocations}=await import(root+'/public/cat-locations.js'),
        {activeCats}=await import(root+'/public/cat-roster.js'),
        {byBiome}=await import(root+'/public/game-data.js'),b=byBiome('homestead'),
        ids=['chichi',...activeCats(g).slice(0,4).map(c=>c.id)];
      Object.assign(g,captureCatLocations(g,g,ids.map((id,i)=>({id,
        position:{x:b.center[0]+195,y:.16,z:b.center[1]-20+i*4},yaw:i*.3})),now));
    }
    if(process.env.CHICHI_PHONE_CAMERA_AUDIT){
      const {ensureJobCity}=await import(root+'/public/jobcity-system.js');
      const id='adopt-magic-dragon';
      g.adoption.cats.push({id,adoptedAt:now,homeBiome:'homestead',centerId:''});
      g.catDestinations[id]='homestead';
      Object.assign(g,ensureJobCity(g,now));
      for(const p of Object.values(g.jobCity.profiles)){p.manualUntil=now+3600000;p.careerAIPending=false;}
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
            if (process.env.CHICHI_COMPARE_COMPACT_RANGES)
              b.onLoad({ filter: /\/public\/static-submissions\.js$/ }, () => ({
                contents: 'import {compactIndexRanges as qaCompactRanges} from "../scripts/compact-index-ranges.mjs";\n'+readPublic("static-submissions.js").replace(
                  "    mesh._multiDrawCount = commands;",
                  "    stats.originalCommands=commands;stats.extraIndices=0;\n    if(globalThis.__qaCompactRanges){commands=qaCompactRanges(starts,counts,commands,bytes);let next=0;for(let i=0;i<commands;i++)next+=counts[i];stats.extraIndices=next-submitted;submitted=next;}\n    mesh._multiDrawCount = commands;",
                ),
                loader: "js",
              }));
            if (process.env.CHICHI_COMPARE_SCENERY_BLEND)
              b.onLoad({ filter: /\/public\/scenery-blending\.js$/ }, () => ({
                contents: readPublic("scenery-blending.js").replace(
                  "opacity === 1 ? THREE.NoBlending", "!globalThis.__qaLegacySceneryBlend && opacity === 1 ? THREE.NoBlending",
                ),
                loader: "js",
              }));
            if (process.env.CHICHI_PREVIEW_LOAD_AUDIT)
              b.onLoad({ filter: /\/public\/catalog-previews\.js$/ }, () => ({
                contents: readPublic("catalog-previews.js")
                  .replace("keys = null", 'keys = ["bed","slide-titan-funnel","biome-summer","biome-aquarium","biome-jobcity"]')
                  .replace("    renderer = new THREE.WebGLRenderer({", "    globalThis.__previewRendererCount=(globalThis.__previewRendererCount||0)+1;\n    renderer = new THREE.WebGLRenderer({")
                  .replace("renderer.render(scene, camera);", "globalThis.__previewDraws=(globalThis.__previewDraws||0)+1;renderer.render(scene, camera);"),
                loader: "js",
              }));
            if (process.env.CHICHI_COMPARE_STATIC_REUSE)
              b.onLoad({ filter: /\/public\/static-draw-batch\.js$/ }, () => ({
                contents: readPublic("static-draw-batch.js").replace(
                  "  return {\n    stats,", "  return {\n    qaEntries: () => entries,\n    stats,"),
                loader: "js",
              }));
            if (process.env.CHICHI_COMPARE_STATIC_REUSE)
              b.onLoad({ filter: /\/public\/static-vertex-reuse\.js$/ }, () => ({
                contents: readPublic("static-vertex-reuse.js")
                  .replace("  const index = geometry.index.array;", "  const index = geometry.index.array, qaOriginal = index.slice();")
                  .replace("  aliases.delete(geometry);", "  (globalThis.__qaStaticIndices ||= new Map()).set(geometry, {native:qaOriginal, fast:index.slice(), current:true});\n  aliases.delete(geometry);"),
                loader: "js",
              }));
            if (process.env.CHICHI_NATIVE_MAP_AUDIT || process.env.CHICHI_PHONE_CAMERA_AUDIT)
              b.onLoad({ filter: /\/public\/jobcity-system\.js$/ }, () => ({
                contents: readPublic("jobcity-system.js").replace(
                  "export function cityClock(state, now = Date.now()) {",
                  "export function cityClock(state, now = Date.now()) {\n  now = state?.epoch ?? now;",
                ),
                loader: "js",
              }));
            if (process.env.CHICHI_COMPARE_COLONY_MODE || process.env.CHICHI_COLONY_PREP_AUDIT || process.env.CHICHI_COMPILE_VIEW_AUDIT)
              b.onLoad({ filter: /\/public\/colony-render-batch\.js$/ }, () => {
                let contents = readPublic("colony-render-batch.js");
                if(process.env.CHICHI_COMPILE_VIEW_AUDIT) contents=contents
                  .replace("const lighting = createCompileLighting(scene);", "const lighting = globalThis.__qaLegacyCompileView ? scene : createCompileLighting(scene);")
                  .replace("    stats,\n    sync() {", "    stats,\n    rebuildCompileForQA(legacy){globalThis.__qaLegacyCompileView=legacy;requested=[];this.sync();},\n    sync() {");
                if (process.env.CHICHI_COMPARE_COLONY_MODE) {
                  const marker=contents.includes("sharingEnabled && atlas.enabled")
                    ? "const enabled =\n      sharingEnabled && atlas.enabled &&"
                    : "const enabled =\n      atlas.enabled &&";
                  assert.ok(contents.includes(marker));
                  contents=contents.replace(marker,marker.replace("atlas.enabled", "!globalThis.__qaIndividualCats && atlas.enabled"));
                }
                if (process.env.CHICHI_COLONY_PREP_AUDIT) {
                  assert.ok(contents.includes("g = new THREE.BufferGeometry(),"));
                  assert.ok(contents.includes("    stats,\n    sync() {"));
                  contents=contents
                  .replace("g = new THREE.BufferGeometry(),", "g = globalThis.__qaCloneStaging ? source.geometry.clone() : new THREE.BufferGeometry(),")
                  .replace("          g.setIndex(sourceGeometry.index);", "          if (!globalThis.__qaCloneStaging) {\n          g.setIndex(sourceGeometry.index);")
                  .replace("          g.boundingBox = sourceGeometry.boundingBox;", "          g.boundingBox = sourceGeometry.boundingBox;\n          }")
                  .replace("    stats,\n    sync() {", "    stats,\n    rebuildForQA(legacy) { globalThis.__qaCloneStaging=legacy;requested=[];this.sync(); },\n    sync() {");
                }
                return { contents, loader: "js" };
              });
            b.onLoad({ filter: /\/public\/world\.js$/ }, () => {
              let source = 'import {trackProfileUploads as qaTrackUploads,trackProfileGlCalls as qaTrackGl} from "./frame-profile.js";\n'+readPublic("world.js");
              if(process.env.CHICHI_FORCE_INDIVIDUAL_CATS){
                const marker='if(frameProfile?.catRenderer === "individual")colonyDraws.setEnabled(false);';
                assert.ok(source.includes(marker),'Expected released diagnostic draw switch in the comparison checkout');
                source=source.replace(marker,'colonyDraws.setEnabled(false);');
              }
              if(process.env.CHICHI_POSE_UPLOAD_AUDIT) source='import {uploadPoseTextureRows as qaUploadPoseRows} from "./pose-texture-upload.js";\n'+source;
              const marker = "  return {\n    perform,";
              // Observe CPU work at the shared render boundary, including the
              // opt-in profiled renderer path. Keep older baseline support.
              const cpuBoundary=source.includes('      const profileRender =')
                ? '      const profileRender =' : '      renderer.render(scene, camera);';
              source=source.replace(cpuBoundary,
                '      if(window.__lagoonQA?.measure)window.__lagoonQA.cpu.push(performance.now()-qaFrameStart);\n'+cpuBoundary);
              if(process.env.CHICHI_ACTOR_SCOPE_AUDIT)
                source='import {courtPath as qaScopePath,courtNavigationStats as qaScopeStats,courtSegment as qaScopeSegment} from "./foodcourt-navigation.js";\n'+source.replace(
                  "  function syncActors() {",
                  "  globalThis.__actorScopeNav=()=>({builderObstacles,courtBlockers,bikiniBlockers,aquariumBlockers,spaObstacles,chillObstacles,path:qaScopePath,stats:qaScopeStats,segment:qaScopeSegment});\n  function syncActors() {",
                );
              assert.ok(source.includes(marker));
              return {
                contents: source
                  .replace(
                    "worldVisible && !document.querySelector(\"dialog[open]\") && !frameProfile?.suspended,",
                    "(globalThis.__qaWarmupCovered || (worldVisible && !document.querySelector(\"dialog[open]\") && !frameProfile?.suspended)),",
                  )
                  .replace("if (key === sceneKey) {", "if (key === sceneKey && !(globalThis.__legacyActorStaticSync && actorKey !== nextActorsKey)) {")
                  .replace(
                    "  const gpuFrames =",
                    "  const qaGpuBuffers=(" +
                      auditGpuBuffers.toString() +
                      ")(renderer);\n  const gpuFrames =",
                  )
                  .replace(
                    "  function loop(now) {",
                    "  function loop(now) {\n    if(window.__lagoonQA?.manualFrames&&!window.__lagoonQA?.manualStepping){requestAnimationFrame(loop);return;}\n    if(window.__lagoonQA?.cpuOnly)worldVisible=true;",
                  )
                  .replace(
                    "!gpuFrames.ready()",
                    "(!window.__lagoonQA?.drawPaused && !gpuFrames.ready())",
                  )
                  .replace(
                    "      gpuFrames.submitted();",
                    "      if(!window.__lagoonQA?.drawPaused)gpuFrames.submitted();",
                  )
                  .replace(
                    "manualFriendDrop && chooseSocialRide()",
                    "manualFriendDrop && chooseSocialRide(()=>window.__lagoonQA?.socialRoll ?? Math.random())",
                  )
                  .replace(
                    "const residentPlay = createResidentPlay({",
                    "const residentPlay = createResidentPlay({random:()=>window.__lagoonQA?.socialRoll ?? Math.random(),",
                  )
                  .replace("const harvesters=[...itemGroups.values()]", "const harvesters=(window.__lagoonQA?.pauseHarvestAutonomy?[]:[...itemGroups.values()])")
                  .replace(
                    "    const time = now / 1000;",
                    "    if(window.__lagoonQA?.freeze){requestAnimationFrame(loop);return;}\n    if(window.__lagoonQA?.pinnedRide !== undefined && operation?.stage === 'activity') operation.activityStart=now-window.__lagoonQA.pinnedRide*1000;\n    for(const p of window.__lagoonQA?.atollPinnedResidents||[]){const v=residentPlay.get(p.id);if(v?.phase==='activity')v.activityStart=now-p.time*1000;}\n    if(window.__lagoonQA?.pinnedSocial){const p=window.__lagoonQA.pinnedSocial,v=p.heroMeeting?operation:residentPlay.get(p.actorId);if(v)v.activityStart=now-p.time*1000;}\n    const time = now / 1000;",
                  )
                  .replace(
                    "    const dt = Math.min((now - previousTime) / 1000, 0.1);",
                    "    const qaFrameStart=performance.now();\n    const dt = Math.min((now - previousTime) / 1000, 0.1);",
                  )
                  .replace(
                    "    const elapsed = (now - previousTime) / 1000;",
                    "    const qaFrameStart=performance.now();\n    const elapsed = (now - previousTime) / 1000;",
                  )
                  .replace(
                    "    const cameraBlend =",
                    "    if(window.__lagoonQA?.orbit){const o=window.__lagoonQA.orbit;desiredLook.set(o.x+Math.sin(time*.8)*12,0,o.z+Math.cos(time*.8)*12);}\n    const cameraBlend =",
                  )
                  .replace(
                    "  const reduced =",
                    "  const qaStart=performance.now();\n  const reduced =",
                  )
                  .replaceAll(
                    "requestAnimationFrame(loop);",
                    "if(!window.__lagoonQA?.manualStepping)requestAnimationFrame(loop);",
                  )
                  .replace(
                    marker,
                    `  const qa=window.__lagoonQA={step:loop,gpuFrames,trackUploads:qaTrackUploads,geometryResidencyFactory:createGeometryResidency,shadowDepth:typeof shadowDepth==='undefined'?null:shadowDepth,geometryResidency:typeof geometryResidency==='undefined'?null:geometryResidency,makeGeometryResidency:options=>createGeometryResidency(renderer,options),gpuBuffers:qaGpuBuffers,matrixCache:typeof matrixCache==='undefined'?null:matrixCache,shaderWarmup:typeof shaderWarmup==='undefined'?null:shaderWarmup,colonyDraws:typeof colonyDraws==='undefined'?null:colonyDraws,animateCat,setCatMood,poseAtlas:typeof poseAtlas==='undefined'?null:poseAtlas,staticDraws:typeof staticDraws==='undefined'?null:staticDraws,camera,look,desiredLook,renderer,islands,cat,npcs,chichiCarrier,itemGroups,jobs,cityCars,updateCityCar,THREE,scene,pickDrop,pointer,raycaster,ground,viewport,sync,perform,performResident,faceCamera,spa,chill,court,cinema,courtFoods,bikiniLife,enterCourt,exitCourt,getCourtCamera:()=>courtCamera,residentPlay,callbacks,showCatHome,getDragging:()=>draggingCat?.catId,reviewView:(x,z,d)=>{desiredLook.set(x,0,z);desiredDistance=d;azimuth=.15;},pauseHarvestAutonomy:${!!process.env.CHICHI_MAGIC_BED_AUDIT},constructorMs:performance.now()-qaStart,focused:()=>focused,getOperation:()=>operation,isVisible:()=>worldVisible,getDistance:()=>distance,getDesiredDistance:()=>desiredDistance,freeze:${!!process.env.CHICHI_CAT_LOCATION_AUDIT||!!process.env.CHICHI_GATHER_AUDIT},frames:0,resizes:0,black:[],audit:false,measure:false,cpu:[]};
  const draw=renderer.render.bind(renderer);qa.drawFrame=()=>draw(scene,camera);renderer.render=(...args)=>{if(qa.drawPaused&&!qa.commandOnly)return;const started=performance.now();draw(...args);qa.frames++;if(qa.liveFrames)qa.liveFrames.push([started,performance.now()-started,renderer.info.render.calls,renderer.info.render.triangles]);};
  qa.settleJobs=seconds=>{const actors=Object.keys(game.jobCity?.profiles||{}).map(id=>({id,local:jobs.get(id)?.position||{x:0,y:.32,z:-10.3},biome:'jobcity'}));for(let i=0;i<seconds*30;i++)jobs.step(game,actors,1/30,i/30);for(const a of actors){const v=jobs.get(a.id),carrier=a.id==='chichi'?chichiCarrier:npcs.get(a.id)?.carrier;if(v&&carrier)carrier.position.set(JOB_CITY_CENTER[0]+v.position.x,v.position.y+.8,JOB_CITY_CENTER[1]+v.position.z);}};
  const size=renderer.setSize.bind(renderer);renderer.setSize=(...args)=>{qa.resizes++;return size(...args);};
  const audit=new MutationObserver(()=>{if(!qa.audit)return;const gl=renderer.getContext(),p=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);if(p[0]+p[1]+p[2]===0)qa.black.push(Array.from(p));});audit.observe(renderer.domElement,{attributes:true,attributeFilter:['width','height']});
  return {\n    perform,`,
                  ).replace("step:loop,gpuFrames,",process.env.CHICHI_POSE_UPLOAD_AUDIT?"uploadPoseRows:qaUploadPoseRows,trackGl:qaTrackGl,step:loop,gpuFrames,":"trackGl:qaTrackGl,step:loop,gpuFrames,"),
                loader: "js",
              };
            });
            if(process.env.CHICHI_POSE_UPLOAD_AUDIT || process.env.CHICHI_COMPARE_POSE_UPLOADS)
              b.onLoad({filter:/\/public\/cat-pose-atlas\.js$/},()=>({
                contents:readPublic("cat-pose-atlas.js").replace("    flush,","    flush,\n    dirtyRowsForQA(){dirty.fill(1);},"),loader:"js",
              }));
            if(process.env.CHICHI_HUD_TEXT_AUDIT)
              b.onLoad({filter:/\/public\/dom-text\.js$/},()=>({
                contents:readPublic("dom-text.js").replace("if (node.textContent === text &&", "if (!globalThis.__qaLegacyTextWrites && node.textContent === text &&"),loader:"js",
              }));
            b.onLoad({ filter: /\/public\/app\.js$/ }, () => ({
              contents: (
                "import {placeItem as qaPlace,findSpace as qaSpace} from './economy.js'; window.__diamondQA={placeItem:qaPlace,findSpace:qaSpace};\n" +
                "import {storeSculptCache as qaStoreGraphics} from './sculpt-cache.js';\n" +
                readPublic("app.js")
              )
                .replace(
                  "const event = nextCityAIEvent(game);",
                  process.env.CHICHI_VISUAL_IDLE_AUDIT ? "const event = null; // Private visual fixture: no AI networking." : "const event = nextCityAIEvent(game);",
                )
                .replace(
                  "await restoreSculptCache();",
                  "window.__graphicsRestored=await restoreSculptCache();window.__storeGraphics=qaStoreGraphics;",
                )
                .replace(
                  "persist();\nrenderGame();",
                  "window.__lagoonSaveQA={cloud,getGame:()=>game,getWorld:()=>world,commit,renderHUD:renderGame};\npersist();\nrenderGame();",
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

    browser = process.env.CHICHI_BROWSER === "webkit"
      ? await webkit.launch({ env: { ...local.env, LIBGL_ALWAYS_SOFTWARE: "1" } })
      : await chromium.launch({
      env: local.env,
      executablePath: process.env.CHICHI_CHROMIUM || undefined,
      args: [
        "--no-sandbox",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    });
    const desktop = !!process.env.CHICHI_DESKTOP;
    const context = await browser.newContext({
      viewport: process.env.CHICHI_QA_WIDTH ? {width:Number(process.env.CHICHI_QA_WIDTH),height:Number(process.env.CHICHI_QA_HEIGHT||812)}
        : desktop ? { width: 1100, height: 800 } : { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: !desktop,
      hasTouch: !desktop,
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
    const routeOwner=process.env.CHICHI_VISUAL_IDLE_AUDIT ? context : page;
    await routeOwner.route("**/dist/app.js?*", (r) =>
      r.fulfill({
        contentType: "text/javascript",
        body: output.outputFiles[0].text,
      }),
    );
    await routeOwner.route("**/api/status", (r) =>
      r.fulfill({
        json: {
          configured: true,
          cloudSave: true,
          revision: "development",
          protocol: "living-cat-world-v4",
        },
      }),
    );
    if (process.env.CHICHI_NATIVE_MAP_AUDIT) {
      const {localCryptoForecast} = await import(root + "/public/crypto-trading.js");
      await routeOwner.route("**/api/crypto/forecast", r => {
        const request=r.request().postDataJSON();
        return r.fulfill({json:{attemptId:request.attemptId,forecast:localCryptoForecast(request.attemptId),source:"local"}});
      });
    }
    await page.goto(base + (process.env.CHICHI_PROFILE_QUERY ? "?"+process.env.CHICHI_PROFILE_QUERY : process.env.CHICHI_DEVICE_PROFILE_AUDIT || process.env.CHICHI_VISUAL_IDLE_AUDIT ? "?profile=1" : ""));
    await page.waitForFunction(
      () => window.__lagoonQA && window.__lagoonSaveQA?.cloud.editable,
    );

    if (process.env.CHICHI_DEVICE_PROFILE_AUDIT) {
      if(process.env.CHICHI_POSE_UPLOAD_AUDIT){
        const {checkPoseTextureUpload}=await import("./check-pose-texture-upload.mjs");
        await checkPoseTextureUpload(page,review);
      }
      const {checkFrameProfile}=await import("./check-frame-profile.mjs");
      await checkFrameProfile(page,review);
      fs.writeFileSync(path.join(review,"browser-errors.json"),JSON.stringify({errors,httpErrors},null,2));
      assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);return;
    }
    if(process.env.CHICHI_ATOLL_AUDIT){
      const {checkAtollApp}=await import('./check-atoll-app.mjs');await checkAtollApp(page,review);
      fs.writeFileSync(path.join(review,'browser-errors.json'),JSON.stringify({errors,httpErrors},null,2));
      assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);return;
    }
    if(process.env.CHICHI_ATOLL_LOADING_AUDIT){
      const {checkAtollLoading}=await import('./check-atoll-loading.mjs');await checkAtollLoading(page,review);
      fs.writeFileSync(path.join(review,'browser-errors.json'),JSON.stringify({errors,httpErrors},null,2));assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);return;
    }
    if(process.env.CHICHI_GATHER_AUDIT){
      const {checkGatherApp}=await import('./check-gather-app.mjs');await checkGatherApp(page,review);
      fs.writeFileSync(path.join(review,'browser-errors.json'),JSON.stringify({errors,httpErrors},null,2));assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);return;
    }
    if(process.env.CHICHI_ZOO_AUDIT){
      const {checkZooApp}=await import('./check-zoo-app.mjs');await checkZooApp(page,review);
      fs.writeFileSync(path.join(review,'browser-errors.json'),JSON.stringify({errors,httpErrors},null,2));assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);return;
    }
    if(process.env.CHICHI_MAGIC_BED_AUDIT){
      const {checkMagicBed}=await import('./check-magic-bed.mjs');await checkMagicBed(page,review);
      fs.writeFileSync(path.join(review,'browser-errors.json'),JSON.stringify({errors,httpErrors},null,2));assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);return;
    }
    if(process.env.CHICHI_MAGIC_FARM_AUDIT){
      const {checkMagicFarms}=await import('./check-magic-farms.mjs');await checkMagicFarms(page,review);
      fs.writeFileSync(path.join(review,'browser-errors.json'),JSON.stringify({errors,httpErrors},null,2));assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);return;
    }
    if(process.env.CHICHI_FARM_WITHDRAWAL_AUDIT){
      const snapshot=()=>page.evaluate(()=>{const g=__lagoonSaveQA.getGame();return {coins:g.coins,islands:[...__lagoonQA.islands.keys()],owned:g.withdrawnMagicFarms,stock:g.farm.stock.starberry,orchards:g.farm.orchards,placements:g.placements};});
      const initial=await snapshot();assert.equal(initial.islands.length,18);assert.ok(initial.islands.every(id=>!id.startsWith('farm-')));assert.equal(initial.owned.length,4);assert.equal(initial.stock,7);assert.equal(initial.coins,290000);assert.equal(initial.placements.find(p=>p.id==='paid-farm-mouse').biome,'homestead');assert.ok(initial.placements.some(p=>p.id==='owned-mega-loops'));
      await page.locator('#shop-open').tap();assert.equal(await page.getByRole('tab',{name:/Магічні ферми/}).count(),0);await page.getByRole('tab',{name:/Биомы/}).tap();assert.equal(await page.locator('[data-product^="farm-"]').count(),0);await page.screenshot({path:path.join(review,'withdrawn-farms-shop.png')});await page.locator('[data-close="shop-dialog"]').tap();
      for(let i=0;i<2;i++){await page.evaluate(()=>__lagoonSaveQA.cloud.releaseEditor());await page.reload();await page.waitForFunction(()=>window.__lagoonQA&&__lagoonSaveQA.cloud.editable);assert.deepEqual(await snapshot(),initial);}
      fs.writeFileSync(path.join(review,'withdrawal.json'),JSON.stringify({initial,reloads:2,errors,httpErrors},null,2));assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);console.log('Four farm islands and shop removed; paid objects, Mega Loops, crops, coins and two SQLite reloads retained.');return;
    }
    if(process.env.CHICHI_OWNERSHIP_AUDIT){
      if(process.env.CHICHI_ZOO_FIXED_DRAWS)await page.evaluate(()=>{__lagoonQA.cpuOnly=true;__lagoonQA.drawPaused=true;});
      const summary=()=>page.evaluate(()=>{const g=__lagoonSaveQA.getGame(),id='slide-atoll-mega-loops';return {coins:g.coins,bag:g.inventory[id]||0,built:g.builtInventory[id]||0,receipt:g.referenceOwnership[id],placements:g.placements.filter(p=>p.item===id)};});
      const recovered=await summary();assert.equal(recovered.bag,1);assert.equal(recovered.built,1);assert.equal(recovered.coins,750000);
      await page.locator('#shop-open').tap();await page.getByRole('tab',{name:/сумка/i}).tap();await page.locator('[data-product="slide-atoll-mega-loops"]').getByRole('button',{name:/^Разместить/}).tap();await page.locator('#build-biome').selectOption('homestead');await page.locator('#build-confirm').tap();
      const placed=await summary();assert.equal(placed.coins,recovered.coins);assert.equal(placed.bag,0);assert.equal(placed.placements.length,1);assert.equal(placed.placements[0].readyAt,0);assert.equal(placed.receipt.count,1);assert.equal(placed.receipt.built,1);
      await page.waitForFunction(id=>__lagoonQA.itemGroups.get(id)?.userData.built,placed.placements[0].id,{timeout:240000});if(process.env.CHICHI_ZOO_FIXED_DRAWS)await page.evaluate(()=>__lagoonQA.drawFrame());await page.screenshot({path:path.join(review,'restored-mega-loops.png')});await page.evaluate(()=>__lagoonSaveQA.cloud.flush());await page.waitForFunction(()=>!__lagoonSaveQA.cloud.pending&&!__lagoonSaveQA.cloud.retryEntry&&!__lagoonSaveQA.cloud.dirty);
      for(let i=0;i<2;i++){await page.evaluate(()=>__lagoonSaveQA.cloud.releaseEditor());await page.reload();await page.waitForFunction(()=>window.__lagoonQA&&__lagoonSaveQA.cloud.editable);assert.deepEqual(await summary(),placed);}
      fs.writeFileSync(path.join(review,'ownership.json'),JSON.stringify({recovered,placed,reloads:2,errors,httpErrors},null,2));assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);console.log('Mega Loops recovered to bag, re-placed fully built for zero charge, real model prepared and two SQLite reloads retained exactly one copy.');return;
    }
    if(process.env.CHICHI_HUD_TEXT_AUDIT){
      const {checkHudText}=await import("./check-hud-text.mjs");
      await checkHudText(page,review);
      fs.writeFileSync(path.join(review,"browser-errors.json"),JSON.stringify({errors,httpErrors},null,2));
      assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);return;
    }
    if (process.env.CHICHI_VISUAL_IDLE_AUDIT) {
      const {checkVisualIdle}=await import("./check-visual-idle.mjs");
      await checkVisualIdle(page,review,base);
      fs.writeFileSync(path.join(review,"browser-errors.json"),JSON.stringify({errors,httpErrors},null,2));
      assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);return;
    }
    if (process.env.CHICHI_ACTOR_SCOPE_AUDIT) {
      const {checkActorSyncScope}=await import("./check-actor-sync-scope.mjs");
      await checkActorSyncScope(page,review);
      fs.writeFileSync(path.join(review,"browser-errors.json"),JSON.stringify({errors,httpErrors},null,2));
      assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);return;
    }
    if (process.env.CHICHI_COLONY_PREP_AUDIT) {
      const {checkColonyPreparationImages}=await import("./check-colony-preparation-images.mjs");
      await checkColonyPreparationImages(page,review);
      fs.writeFileSync(path.join(review,"browser-errors.json"),JSON.stringify({errors,httpErrors},null,2));
      assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);return;
    }
    if(process.env.CHICHI_COMPILE_VIEW_AUDIT){
      const {checkCompileView}=await import("./check-compile-view.mjs");
      await checkCompileView(page,review);
      fs.writeFileSync(path.join(review,"browser-errors.json"),JSON.stringify({errors,httpErrors},null,2));
      assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);return;
    }

    if (process.env.CHICHI_NATIVE_MAP_AUDIT && process.env.CHICHI_PREVIEW_LOAD_AUDIT) {
      const { checkPreviewLoad } = await import("./check-preview-load.mjs");
      await checkPreviewLoad(page, review);
      fs.writeFileSync(path.join(review, "browser-errors.json"), JSON.stringify({ errors, httpErrors }, null, 2));
      assert.deepEqual(httpErrors.filter(e => !(e.path.endsWith("/art/previews/catalog.json") && e.status === 503)), []);
      assert.deepEqual(errors.filter(e => !/Failed to load resource: the server responded with a status of 503/.test(e)), []);
      return;
    }

    if(process.env.CHICHI_CAT_LOCATION_AUDIT){
      const {checkCatLocations}=await import('./check-cat-locations.mjs');
      await checkCatLocations(page,review);
      assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);return;
    }
    if(process.env.CHICHI_PHONE_CAMERA_AUDIT){
      const {checkPhoneCameraTransitions}=await import('./check-phone-camera-transitions.mjs');
      await checkPhoneCameraTransitions(page,review);
      assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);return;
    }
    if (process.env.CHICHI_CONSOLIDATED_CAMERA_AUDIT) {
      const {checkConsolidatedCamera}=await import('./check-consolidated-camera.mjs');
      await checkConsolidatedCamera(page,review);
      assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);return;
    }
    if (process.env.CHICHI_PLACEMENT_CAT_AUDIT) {
      const {checkPlacementCats}=await import('./check-placement-cat-positions.mjs');
      await checkPlacementCats(page,review);
      assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);return;
    }
    if (process.env.CHICHI_CAR_INVENTORY_AUDIT) {
      const { checkCarInventory } = await import("./check-car-inventory.mjs");
      await checkCarInventory(page, review);
      assert.deepEqual(errors, []); assert.deepEqual(httpErrors, []);
      return;
    }
    if (process.env.CHICHI_FRAME_BOTTLENECK_AUDIT) {
      const { checkFrameBottlenecks } = await import("./check-frame-bottlenecks.mjs");
      await checkFrameBottlenecks(page, context, review);
      fs.writeFileSync(path.join(review,"browser-errors.json"),JSON.stringify({errors,httpErrors},null,2));
      assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);return;
    }
    if (process.env.CHICHI_NATIVE_MAP_AUDIT) {
      if(process.env.CHICHI_POSE_UPLOAD_AUDIT){
        const {checkPoseTextureUpload}=await import("./check-pose-texture-upload.mjs");
        await checkPoseTextureUpload(page,review);
      }
      if(process.env.CHICHI_REFAULT_CACHE_AUDIT){
        const {checkRefaultCache}=await import("./check-refault-cache.mjs");
        await checkRefaultCache(page,review);
      }
      if (process.env.CHICHI_CITY_STALL_AUDIT) {
        const { checkCityStalls } = await import("./check-city-stalls.mjs");
        await checkCityStalls(page, review);
        assert.deepEqual(errors, []); assert.deepEqual(httpErrors, []);
        return;
      }
      const { checkNativeMapFrames } = await import("./check-native-map-frames.mjs");
      await checkNativeMapFrames(page, review);
      fs.writeFileSync(path.join(review, "browser-errors.json"), JSON.stringify({ errors, httpErrors }, null, 2));
      assert.deepEqual(errors, []); assert.deepEqual(httpErrors, []);
      return;
    }
    if (process.env.CHICHI_RENDER_REGRESSION_AUDIT) {
      const { checkLiveRenderRegressions } = await import("./check-live-render-regressions.mjs");
      await checkLiveRenderRegressions(page, review);
      assert.deepEqual(errors, []);
      assert.deepEqual(httpErrors, []);
      return;
    }
    if (process.env.CHICHI_LIVE_FRAME_AUDIT) {
      const { auditLiveFrames } = await import("./live-frame-audit.mjs");
      await auditLiveFrames(page, review);
      if (errors.length || httpErrors.length)
        console.log("LIVE_BROWSER_ERRORS",JSON.stringify({errors,httpErrors}));
      assert.deepEqual(errors, []);
      assert.deepEqual(httpErrors, []);
      return;
    }

    await page.locator('[data-biome="aquarium"]')[desktop ? "click" : "tap"]();
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
    if (
      process.env.CHICHI_SHADOW_PROOF ||
      process.env.CHICHI_STATIC_PROOF ||
      process.env.CHICHI_PROP_PROOF ||
      process.env.CHICHI_POSE_PROOF
    ) {
      const stress = !!process.env.CHICHI_SCENE_STRESS;
      const proofBiome = process.env.CHICHI_PROOF_BIOME || (stress ? "homestead" : "aquarium");
      if (proofBiome !== "aquarium") await page.locator(`[data-biome="${proofBiome}"]`)[desktop ? "click" : "tap"]();
      await page.waitForFunction(id => !__lagoonQA.islands.get(id).userData.lowOnly, proofBiome);
      const proofCenter = await page.evaluate(id => {const p=__lagoonQA.islands.get(id).position;return [p.x,p.z];}, proofBiome);
      await page.evaluate(
        center => __lagoonQA.reviewView(center[0], center[1], 85),
        proofCenter,
      );
      await page.waitForFunction(
        () =>
          Math.abs(__lagoonQA.getDistance() - 85) < 0.1 &&
          __lagoonQA.look.distanceTo(__lagoonQA.desiredLook) < 0.01,
      );
      if (process.env.CHICHI_POSE_PROOF)
        await page.waitForFunction(() => __lagoonQA.colonyDraws?.stats.ready);
      const proof = await page.evaluate(
        ({ stress, timing, diagnose, repeats, props, poses, shadows, proofCenter }) => {
          const q = __lagoonQA,
            renderer = q.renderer,
            gl = renderer.getContext(),
            states = [];
          q.freeze = true;
          q.drawPaused = true;
          q.scene.traverse((o) => {
            if (typeof o.userData.staticSubmission?.setEnabled === "function")
              states.push(o.userData.staticSubmission);
          });
          if (props) {
            states.length = 0;
            if (q.staticDraws) states.push(q.staticDraws);
          }
          if (poses) {
            states.length = 0;
            if (q.poseAtlas) states.push(q.poseAtlas);
          }
          if (shadows) {
            states.length = 0;
            if (q.shadowDepth) states.push(q.shadowDepth);
          }
          const diagnostic = [];
          const center = proofCenter,
            a = new Uint8Array(
              gl.drawingBufferWidth * gl.drawingBufferHeight * 4,
            ),
            b = new Uint8Array(a.length),
            rows = [];
          const draw = (pixels) => {
            const start = performance.now();
            q.drawFrame();
            gl.readPixels(
              0,
              0,
              gl.drawingBufferWidth,
              gl.drawingBufferHeight,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              pixels,
            );
            return timing ? performance.now() - start : null;
          };
          for (const [offset, target] of [
            [
              [30, 45, 72],
              [0, 3, 0],
            ],
            [
              [0, 9, 26],
              [0, 6, 0],
            ],
            [
              [25, 14, 5],
              [0, 6, 0],
            ],
            [
              [0, 95, 0.01],
              [0, 0, 0],
            ],
          ]) {
            q.camera.position.set(
              center[0] + offset[0],
              offset[1],
              center[1] + offset[2],
            );
            q.camera.lookAt(
              center[0] + target[0],
              target[1],
              center[1] + target[2],
            );
            q.camera.updateMatrixWorld(true);
            if (diagnose && rows.length) break;
            const compare = (label, first, second) => {
              let changed = 0,
                max = 0,
                error = 0;
              for (let i = 0; i < first.length; i++) {
                const d = Math.abs(first[i] - second[i]);
                if (d) {
                  changed++;
                  max = Math.max(max, d);
                  error += d;
                }
              }
              diagnostic.push({
                label,
                changed,
                max,
                mean: error / first.length,
              });
            };
            const png = (pixels) => {
              const canvas = document.createElement("canvas");
              canvas.width = gl.drawingBufferWidth;
              canvas.height = gl.drawingBufferHeight;
              const context = canvas.getContext("2d");
              context.putImageData(
                new ImageData(
                  new Uint8ClampedArray(pixels),
                  canvas.width,
                  canvas.height,
                ),
                0,
                0,
              );
              return canvas.toDataURL("image/png").split(",")[1];
            };
            states.forEach((s) => s.setEnabled(false));
            draw(a);
            const beforeMs = draw(a),
              before = { ...renderer.info.render };
            if (diagnose) {
              draw(b);
              compare("native-repeat", a, b);
            }
            states.forEach((s) => s.setEnabled(true));
            if (shadows) for (let i=0;i<4;i++) draw(b);
            draw(b);
            const afterMs = draw(b),
              after = { ...renderer.info.render };
            let changed = 0,
              max = 0,
              error = 0,
              large = 0;
            for (let i = 0; i < a.length; i++) {
              const d = Math.abs(a[i] - b[i]);
              if (d) {
                changed++;
                max = Math.max(max, d);
                error += d;
                if (d > 8) large++;
              }
            }
            const samples = { native: [beforeMs], spatial: [afterMs] };
            if (timing)
              for (let repeat = 1; repeat < repeats; repeat++) {
                for (const enabled of repeat % 2
                  ? [true, false]
                  : [false, true]) {
                  states.forEach((s) => s.setEnabled(enabled));
                  draw(enabled ? b : a); // Warm restored/native GPU buffers before timing.
                  samples[enabled ? "spatial" : "native"].push(
                    draw(enabled ? b : a),
                  );
                }
              }
            if (diagnose) {
              const reference = a.slice(),
                optimized = b.slice();
              const all = [];
              q.scene.traverse((o) => {
                if (
                  typeof o.userData.staticSubmission?.setEnabled === "function"
                ) {
                  all.push([o, o.onBeforeRender, o.onBeforeShadow]);
                  const c = o.userData.staticSubmission.cull;
                  o.onBeforeRender = (r, s, camera) => c(camera, true);
                  o.onBeforeShadow = (r, obj, camera, shadowCamera) =>
                    c(shadowCamera, true);
                }
              });
              draw(b);
              draw(b);
              compare("native-vs-all-ranges", reference, b);
              all.forEach(([o, r, s]) => {
                o.onBeforeRender = r;
                o.onBeforeShadow = s;
              });
              draw(a);
              draw(b);
              compare("optimized-repeat", a, b);
              renderer.shadowMap.enabled = false;
              states.forEach((s) => s.setEnabled(false));
              draw(a);
              draw(a);
              states.forEach((s) => s.setEnabled(true));
              draw(b);
              draw(b);
              compare("without-shadows", a, b);
              diagnostic.push({
                nativePNG: png(reference),
                optimizedPNG: png(optimized),
                noShadowNativePNG: png(a),
                noShadowOptimizedPNG: png(b),
              });
              const referenceNoShadow = a.slice();
              let candidates = states.slice();
              while (candidates.length > 1) {
                states.forEach((s) => s.setEnabled(false));
                const half = candidates.slice(
                  0,
                  Math.ceil(candidates.length / 2),
                );
                half.forEach((s) => s.setEnabled(true));
                draw(b);
                draw(b);
                const differs = b.some((v, i) => v !== referenceNoShadow[i]);
                candidates = differs ? half : candidates.slice(half.length);
              }
              const culprit = [];
              q.scene.traverse((o) => {
                if (candidates.includes(o.userData.staticSubmission)) {
                  const chain = [];
                  for (let p = o; p; p = p.parent)
                    chain.push({
                      name: p.name,
                      id: p.userData.id,
                      placement: p.userData.placement?.item,
                    });
                  culprit.push({
                    chain,
                    material: {
                      type: o.material.type,
                      color: o.material.color?.getHexString(),
                      custom: o.material.customProgramCacheKey(),
                      userDataKeys: Object.keys(o.material.userData),
                    },
                    indices: o.geometry.index.count,
                  });
                }
              });
              diagnostic.push({ culprit });
            }
            rows.push({
              offset,
              before,
              after,
              beforeMs,
              afterMs,
              samples,
              ...(shadows ? { shadowStats: { ...q.shadowDepth.stats } } : {}),
              changed,
              max,
              large,
              mean: error / a.length,
              ...(props || poses || shadows
                ? { nativePNG: png(a), optimizedPNG: png(b) }
                : {}),
            });
          }
          return {
            rows,
            diagnostic,
            meshes: states.length,
            buffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
            fish: [...q.itemGroups.values()]
              .filter((g) => g.userData.aquarium === true)
              .reduce((n, g) => n + g.userData.tank.fish, 0),
            contextLost: gl.isContextLost(),
            ...(poses
              ? {
                  shaderErrors: renderer.info.programs
                    .filter((p) => p.diagnostics?.runnable === false)
                    .map((p) => ({
                      key: p.cacheKey,
                      vertex: gl.getShaderSource(p.vertexShader),
                    })),
                }
              : {}),
          };
        },
        {
          stress,
          shadows: !!process.env.CHICHI_SHADOW_PROOF,
          proofCenter,
          timing: process.env.CHICHI_SKIP_TIMING !== "1",
          diagnose: !!process.env.CHICHI_STATIC_DIAGNOSE,
          repeats: Number(process.env.CHICHI_STATIC_TIMING_REPEATS || 1),
          props: !!process.env.CHICHI_PROP_PROOF,
          poses: !!process.env.CHICHI_POSE_PROOF,
        },
      );
      for (const [i, row] of proof.rows.entries()) {
        for (const name of ["nativePNG", "optimizedPNG"])
          if (row[name]) {
            fs.writeFileSync(
              path.join(review, `${i}-${name}.png`),
              Buffer.from(row[name], "base64"),
            );
            delete row[name];
          }
      }
      fs.writeFileSync(
        path.join(review, "static-proof.json"),
        JSON.stringify(proof, null, 2),
      );
      for (const d of proof.diagnostic ?? [])
        for (const key of Object.keys(d))
          if (key.endsWith("PNG")) {
            fs.writeFileSync(
              path.join(review, key + ".png"),
              Buffer.from(d[key], "base64"),
            );
            delete d[key];
          }
      console.log(JSON.stringify(proof, null, 2));
      assert.ok(
        proof.meshes >
          (process.env.CHICHI_SHADOW_PROOF || process.env.CHICHI_PROP_PROOF || process.env.CHICHI_POSE_PROOF
            ? 0
            : 10),
      );
      for (const r of proof.rows) {
        // Instanced world transforms introduce subpixel float rounding at a
        // few antialiased edges, as with the existing exact cat palette check.
        assert.ok(
          process.env.CHICHI_PROP_PROOF || process.env.CHICHI_POSE_PROOF
            ? r.mean < 0.002 &&
                r.large < proof.buffer[0] * proof.buffer[1] * 0.0001
            : r.mean < 0.00001 && r.large === 0,
          JSON.stringify(r),
        );
        if (process.env.CHICHI_SHADOW_PROOF) assert.equal(r.changed, 0, JSON.stringify(r));
        assert.ok(r.after.triangles <= r.before.triangles);
      }
      assert.equal(proof.contextLost, false);
      assert.equal(proof.fish, 50);
      assert.deepEqual(errors, []);
      return;
    }
    if (process.env.CHICHI_STYLE_AUDIT) {
      const filters = await page.evaluate(() =>
        [...document.querySelectorAll("*")].flatMap((e) => {
          const s = getComputedStyle(e),
            r = e.getBoundingClientRect();
          return r.width &&
            r.height &&
            (s.backdropFilter !== "none" || s.filter !== "none")
            ? [
                {
                  tag: e.tagName,
                  id: e.id,
                  cls: e.className,
                  backdrop: s.backdropFilter,
                  filter: s.filter,
                  rect: [r.x, r.y, r.width, r.height],
                },
              ]
            : [];
        }),
      );
      console.log(JSON.stringify(filters, null, 2));
      return;
    }
    if (process.env.CHICHI_GESTURE_AUDIT) {
      const { auditCameraGestures } = await import(
        "./camera-gesture-audit.mjs"
      );
      await auditCameraGestures(page, context, review);
      assert.deepEqual(errors, []);
      assert.deepEqual(httpErrors, []);
      return;
    }
    if (process.env.CHICHI_GESTURE_ALL) {
      const { checkAllCameraGestures } = await import(
        "./check-all-camera-gestures.mjs"
      );
      await checkAllCameraGestures(page, context, review);
      assert.deepEqual(errors, []);
      assert.deepEqual(httpErrors, []);
      return;
    }
    if (process.env.CHICHI_FULL_FRAME_AUDIT) {
      const { auditFullFrames } = await import("./full-frame-audit.mjs");
      await auditFullFrames(page, context, review);
      assert.deepEqual(errors, []);
      assert.deepEqual(httpErrors, []);
      return;
    }
    if (process.env.CHICHI_FRAME_AUDIT) {
      const { auditWorldRender } = await import("./world-render-audit.mjs");
      await auditWorldRender(page, context, review);
      return;
    }
    if (process.env.CHICHI_GPU_ABLATE) {
      await page.evaluate(() => __lagoonQA.reviewView(-335, 95, 90));
      await page.waitForFunction(
        () =>
          Math.abs(__lagoonQA.getDistance() - 90) < 0.1 &&
          __lagoonQA.look.distanceTo(__lagoonQA.desiredLook) < 0.01,
      );
      const audit = await page.evaluate(() => {
        const q = __lagoonQA,
          renderer = q.renderer,
          gl = renderer.getContext();
        q.freeze = true;
        q.drawPaused = true;
        const water = [],
          cats = [
            q.chichiCarrier,
            ...[...q.npcs.values()].map((n) => n.carrier),
          ],
          tanks = [...q.itemGroups.values()].filter(
            (g) => g.userData.aquarium === true,
          ),
          fish = tanks.map((g) => g.userData.shoal);
        q.scene.traverse((o) => {
          if (
            o.isMesh &&
            (o.material.uniforms?.uWaterField ||
              /water|waterfall|lagoon/i.test(o.material.name))
          )
            water.push(o);
        });
        const pixels = new Uint8Array(
            gl.drawingBufferWidth * gl.drawingBufferHeight * 4,
          ),
          rows = [];
        const draw = () => {
          const t = performance.now();
          q.drawFrame();
          gl.readPixels(
            0,
            0,
            gl.drawingBufferWidth,
            gl.drawingBufferHeight,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            pixels,
          );
          return performance.now() - t;
        };
        for (const [name, hidden, shadows] of [
          ["full", [], true],
          ["fish-hidden", fish, true],
          ["cats-hidden", cats, true],
          ["water-hidden", water, true],
          ["tanks-hidden", tanks, true],
          ["shadow-disabled", [], false],
          ["full-repeat", [], true],
        ]) {
          const shown = hidden.map((o) => o.visible);
          hidden.forEach((o) => (o.visible = false));
          renderer.shadowMap.enabled = shadows;
          draw();
          const times = [draw(), draw()];
          rows.push({ name, times, render: { ...renderer.info.render } });
          hidden.forEach((o, i) => (o.visible = shown[i]));
          renderer.shadowMap.enabled = true;
        }
        return {
          rows,
          buffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
          textures: renderer.info.memory.textures,
          geometries: renderer.info.memory.geometries,
          programs: renderer.info.programs.length,
          renderer: gl.getParameter(gl.RENDERER),
        };
      });
      fs.writeFileSync(
        path.join(review, "gpu-ablation.json"),
        JSON.stringify(audit, null, 2),
      );
      console.log(JSON.stringify(audit, null, 2));
      return;
    }
    if (process.env.CHICHI_PICK_AUDIT) {
      await page.evaluate(() => {
        __lagoonQA.reviewView(-335, 95, 90);
      });
      await page.waitForFunction(
        () => Math.abs(__lagoonQA.getDistance() - 90) < 0.1,
      );
      const audit = await page.evaluate(() => {
        const q = __lagoonQA;
        q.drawPaused = true;
        const rows = [],
          pointer = new q.THREE.Vector2();
        for (const y of [-0.6, 0, 0.6])
          for (const x of [-0.6, 0, 0.6]) {
            pointer.set(x, y);
            q.raycaster.setFromCamera(pointer, q.camera);
            const start = performance.now();
            const hits = q.raycaster.intersectObjects(
              [...q.itemGroups.values()],
              true,
            );
            const itemMs = performance.now() - start;
            const cats = [
              q.cat,
              ...[...q.npcs.values()]
                .filter((n) => n.carrier.visible)
                .map((n) => n.model),
            ];
            const parts = cats
              .flatMap((cat) => [
                cat.userData.body,
                cat.getObjectByName("Face"),
                cat.getObjectByName("TailCoat"),
                ...cat.userData.legs.map((l) => l.getObjectByName("Shin")),
              ])
              .filter(Boolean);
            const catStart = performance.now();
            const catHits = q.raycaster.intersectObjects(parts, false);
            rows.push({
              x,
              y,
              itemMs,
              catMs: performance.now() - catStart,
              hits: hits.length,
              catHits: catHits.length,
            });
          }
        return {
          rows,
          renderer: { ...q.renderer.info.render },
          look: q.look.toArray(),
        };
      });
      fs.writeFileSync(
        path.join(review, "pick-audit.json"),
        JSON.stringify(audit, null, 2),
      );
      console.log(JSON.stringify(audit, null, 2));
      return;
    }
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
      const perfBiome = process.env.CHICHI_PERF_BIOME || "aquarium";
      if (perfBiome !== "aquarium") {
        await page.locator(`[data-biome="${perfBiome}"]`).tap();
        await page.waitForFunction(
          (id) => !__lagoonQA.islands.get(id)?.userData.lowOnly,
          perfBiome,
        );
      }
      await page.evaluate((id) => {
        const q = __lagoonQA;
        const island = q.islands.get(id);
        q.reviewView(
          island.position.x,
          island.position.z,
          id === "homestead" ? 140 : 130,
        );
        q.drawPaused = false;
      }, perfBiome);
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
      const renderProfile = await cdp.send("Profiler.stop");
      fs.writeFileSync(
        path.join(review, "render-cpu-profile.json"),
        JSON.stringify(renderProfile),
      );
      await page.evaluate(() => {
        const q = __lagoonQA;
        q.drawPaused = true;
        q.renderer.getContext().finish();
        q.cpuOnly = true;
        q.cpu = [];
      });
      if (process.env.CHICHI_PERF_ORBIT)
        await page.evaluate(() => {
          const q = __lagoonQA;
          q.orbit = { x: q.look.x, z: q.look.z };
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
          { ...report, perfBiome, perf, gpuPhase, errors, httpErrors },
          null,
          2,
        ),
      );
      console.log(JSON.stringify({ perf, gpuPhase }, null, 2));
      await page.evaluate(() => __lagoonQA.drawFrame());
      await page.screenshot({ path: path.join(review, "aquarium-phone.png") });
      return;
    }
    if (process.env.CHICHI_MAP_CHECK) {
      await page.evaluate(() => {
        __lagoonQA.drawPaused = true;
      });
      const ids = await page
        .locator("[data-biome]")
        .evaluateAll((nodes) => nodes.map((n) => n.dataset.biome));
      const mapRows = [];
      for (const id of [...new Set(ids)]) {
        await page.locator(`[data-biome="${id}"]`).tap();
        await page.waitForFunction(
          (id) => !__lagoonQA.islands.get(id).userData.lowOnly,
          id,
        );
        await page.evaluate((id) => {
          const q = __lagoonQA,
            island = q.islands.get(id);
          q.cpu = [];
          q.measure = true;
          q.reviewView(island.position.x + 7, island.position.z - 4, 85);
        }, id);
        await page.waitForTimeout(800);
        const row = await page.evaluate((id) => {
          const q = __lagoonQA,
            gl = q.renderer.getContext();
          q.measure = false;
          const a = q.cpu.sort((a, b) => a - b);
          q.drawFrame();
          gl.finish();
          let staticPicks = 0;
          const oldRay = q.raycaster.ray.clone(),
            oldFar = q.raycaster.far,
            oldNear = q.raycaster.near;
          for (const root of q.itemGroups.values())
            if (root.visible && root.userData.placement?.biome === id) {
              root.traverse((m) => {
                if (staticPicks >= 3 || !m.isMesh || !m.layers.isEnabled(30))
                  return;
                const g = m.geometry,
                  at = (i) =>
                    new q.THREE.Vector3().fromBufferAttribute(
                      g.attributes.position,
                      g.index.getX(i),
                    );
                const a = at(0),
                  b = at(1),
                  c = at(2),
                  normal = b
                    .clone()
                    .sub(a)
                    .cross(c.clone().sub(a))
                    .normalize()
                    .applyNormalMatrix(
                      new q.THREE.Matrix3().getNormalMatrix(m.matrixWorld),
                    );
                const center = a
                  .add(b)
                  .add(c)
                  .multiplyScalar(1 / 3)
                  .applyMatrix4(m.matrixWorld);
                q.raycaster.ray.set(
                  center.clone().addScaledVector(normal, 0.2),
                  normal.clone().negate(),
                );
                q.raycaster.near = 0;
                q.raycaster.far = 1;
                if (q.raycaster.intersectObject(m, false).length) staticPicks++;
              });
            }
          q.raycaster.ray.copy(oldRay);
          q.raycaster.far = oldFar;
          q.raycaster.near = oldNear;
          return {
            id,
            samples: a.length,
            median: a[Math.floor(a.length * 0.5)],
            p95: a[Math.floor(a.length * 0.95)],
            draw: { ...q.renderer.info.render },
            staticProps: q.staticDraws?.stats,
            colony: q.colonyDraws?.stats,
            poses: q.poseAtlas?.stats,
            memory: { ...q.renderer.info.memory },
            cats: q.npcs.size,
            dpr: q.renderer.getPixelRatio(),
            contextLost: gl.isContextLost(),
            staticPicks,
          };
        }, id);
        mapRows.push(row);
        console.log("MAP", JSON.stringify(row));
        assert.ok(
          row.samples > 0 && row.draw.calls > 0 && !row.contextLost,
          id,
        );
        if (
          ["homestead", "aquarium", "jobcity", "cat-homes", "moon"].includes(id)
        )
          await page.screenshot({ path: path.join(review, `map-${id}.png`) });
      }
      const dom = await page.evaluate(() => {
        const before = [...document.querySelectorAll(".neighbor")];
        const rows = [...document.querySelectorAll(".friend-list-row")];
        const game = structuredClone(__lagoonSaveQA.getGame());
        game.coins++;
        __lagoonSaveQA.commit(game, false);
        const after = [...document.querySelectorAll(".neighbor")];
        const currentRows = [...document.querySelectorAll(".friend-list-row")];
        const id = currentRows.find((r) => !r.classList.contains("locked"))
          .dataset.friend;
        const next = structuredClone(__lagoonSaveQA.getGame());
        next.care.residents[id].hunger = 37;
        next.social.relationships[id].points = 83;
        __lagoonSaveQA.commit(next, false);
        const updated = document.querySelector(`[data-friend="${id}"]`);
        return {
          cards: before.length,
          unchanged: before.every((n, i) => n === after[i]),
          rowsUnchanged: rows.every((n, i) => n === currentRows[i]),
          valuesUpdated:
            updated.querySelector(".neighbor-hunger").value === 37 &&
            updated.querySelector(".friend-meter i").style.width === "83%",
        };
      });
      if (!baseline)
        assert.ok(
          dom.unchanged && dom.rowsUnchanged && dom.valuesUpdated,
          JSON.stringify(dom),
        );
      if (!baseline)
        assert.ok(mapRows.find((r) => r.id === "homestead").staticPicks > 0);
      const result = { mapRows, dom, errors, httpErrors };
      fs.writeFileSync(
        path.join(review, "map.json"),
        JSON.stringify(result, null, 2),
      );
      assert.deepEqual(errors, []);
      assert.deepEqual(
        httpErrors.filter((e) => e.path !== "/api/jobcity/plan"),
        [],
      );
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
        undefined,
      );
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ ...points[0], x: points[0].x + 8, id: 1 }],
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
        ({ actorId, heroMeeting }) => {
          const q = __lagoonQA,
            v = heroMeeting ? q.getOperation() : q.residentPlay.get(actorId);
          if (v?.stage !== "activity" && v?.phase !== "activity") return false;
          // Keep the real encounter at its inspection time while software GPU
          // readback/screenshots run. Wall time must not end it between checks.
          q.pinnedSocial = { actorId, heroMeeting, time: 8 };
          return true;
        },
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
          if (!v) throw Error("Pinned encounter ended before inspection");
          delete q.pinnedSocial;
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
    await local.stop();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
