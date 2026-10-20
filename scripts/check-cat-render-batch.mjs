// Same model, pose, light, shadows and resolution; compare original draws to
// the live GPU palette. No production world or account is accessed.
import { build } from "esbuild";
import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)(
  process.env.CHICHI_PLAYWRIGHT_MODULE || "playwright",
);
const output =
  process.env.CHICHI_CAT_BATCH_REVIEW || "/tmp/chichi-cat-batching";
await mkdir(output, { recursive: true });
const native = !!process.env.CHICHI_NATIVE_SKIN_CHECK;
const atlasCheck = !!process.env.CHICHI_CAT_ATLAS_CHECK;
const colonyCheck = !!process.env.CHICHI_COLONY_CHECK;
let source = `
import * as T from 'three';
import {createCat,animateCat,reactCat,setCatMood,disposeCat} from './public/cat-model.js';
import {enableCatRenderBatch,CAT_PICK_LAYER} from './public/cat-render-batch.js';
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(2);renderer.setSize(390,560);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;
document.body.style='margin:0';document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0xcbd7e0);scene.add(new T.HemisphereLight(0xffeedb,0x8b9e85,1.2));const sun=new T.DirectionalLight(0xffd8b7,2.2);sun.position.set(-4,8,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=sun.shadow.camera.bottom=-5;sun.shadow.camera.right=sun.shadow.camera.top=5;sun.shadow.bias=-.0005;scene.add(sun);const rim=new T.DirectionalLight(0xb8b7ec,.9);rim.position.set(4,5,-8);scene.add(rim);
const ground=new T.Mesh(new T.PlaneGeometry(20,20),new T.MeshStandardMaterial({color:0xaac58f,roughness:.9}));ground.rotation.x=-Math.PI/2;ground.position.y=-.02;ground.receiveShadow=true;scene.add(ground);
const camera=new T.PerspectiveCamera(40,390/560,.1,100);camera.position.set(2.1,2.3,5.2);camera.lookAt(0,.8,0);let cat;
window.load=async(options)=>{if(cat){cat.removeFromParent();disposeCat(cat);}cat=createCat('happy',options);cat.scale.setScalar(.7);scene.add(cat);enableCatRenderBatch(cat);await renderer.compileAsync(scene,camera);};
window.compare=(mood,time,walking,reaction)=>{
 setCatMood(cat,mood,{immediate:true});animateCat(cat,time,walking);reactCat(cat,reaction);scene.updateMatrixWorld(true);cat.userData.renderBatches.update();
 const b=cat.userData.renderBatches,gl=renderer.getContext(),before=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4),after=new Uint8Array(before.length);
 function mode(batched){b.setEnabled(batched);}
 mode(false);renderer.render(scene,camera);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,before);const old={...renderer.info.render};
 mode(true);renderer.render(scene,camera);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,after);const current={...renderer.info.render};
 let changed=0,large=0,error=0,max=0;for(let i=0;i<before.length;i++){const d=Math.abs(before[i]-after[i]);if(d){changed++;error+=d;max=Math.max(max,d);if(d>8)large++;}}
 return {mood,time,walking,old,current,changed,large,max,mean:error/before.length,pixels:before.length/4};
};window.ready=true;`;
if (native)
  source = source
    .replace(
      "import * as T from 'three';",
      "import * as T from 'three';import {skipUnusedSkinJoints} from './public/native-skinning.js';let nativeMaterials;",
    )
    .replace(
      "enableCatRenderBatch(cat);",
      "nativeMaterials=new Map();cat.traverse(m=>{if(m.isSkinnedMesh&&!nativeMaterials.has(m.material))nativeMaterials.set(m.material,[m.material.onBeforeCompile,m.material.customProgramCacheKey]);});",
    )
    .replace(
      "cat.userData.renderBatches.update();",
      "cat.userData.renderBatches?.update();",
    )
    .replace(
      "function mode(batched){b.setEnabled(batched);}",
      "function mode(optimized){if(optimized)skipUnusedSkinJoints(cat);else for(const [m,[compile,key]] of nativeMaterials){m.onBeforeCompile=compile;m.customProgramCacheKey=key;delete m.userData.skipUnusedSkinJoints;m.needsUpdate=true;}}",
    );
if (atlasCheck)
  source = source
    .replace(
      "import * as T from 'three';",
      "import * as T from 'three';import {createCatPoseAtlas} from './public/cat-pose-atlas.js';",
    )
    .replace(
      "const camera=",
      "const atlas=createCatPoseAtlas(scene);const camera=",
    )
    .replace(
      "enableCatRenderBatch(cat);",
      "enableCatRenderBatch(cat,atlas);cat.userData.renderBatches.palettes.forEach(p=>p.textureMode=true);",
    )
    .replace(
      "function mode(batched){b.setEnabled(batched);}",
      "function mode(batched){atlas.setEnabled(batched);}",
    );
if (colonyCheck)
  source = source
    .replace(
      "import * as T from 'three';",
      "import * as T from 'three';import {createCatPoseAtlas} from './public/cat-pose-atlas.js';import {createColonyRenderBatch} from './public/colony-render-batch.js';",
    )
    .replace(
      "let cat;",
      "let cat;let crowd=[];const atlas=createCatPoseAtlas(scene),colony=createColonyRenderBatch(scene,renderer,camera,atlas,{minimumCats:1});",
    )
    .replace(
      "if(cat){cat.removeFromParent();disposeCat(cat);}",
      "for(const c of crowd){c.removeFromParent();disposeCat(c);}crowd=[];",
    )
    .replace(
      "enableCatRenderBatch(cat);await renderer.compileAsync(scene,camera);",
      `enableCatRenderBatch(cat,atlas);crowd.push(cat);cat.position.x=-1.4;
      for(let i=1;i<3;i++){const c=createCat('happy',{...options,color:new T.Color(options.color).multiplyScalar(.7+i*.2).getHex()});c.scale.setScalar(.7);c.position.x=-1.4+i*1.4;scene.add(c);enableCatRenderBatch(c,atlas);crowd.push(c);}
      scene.updateMatrixWorld(true);colony.sync();while(!colony.stats.ready)await new Promise(requestAnimationFrame);await renderer.compileAsync(scene,camera);`,
    )
    .replace(
      "setCatMood(cat,mood,{immediate:true});animateCat(cat,time,walking);reactCat(cat,reaction);scene.updateMatrixWorld(true);cat.userData.renderBatches.update();",
      "for(const c of crowd){setCatMood(c,mood,{immediate:true});animateCat(c,time,walking);reactCat(c,reaction);}scene.updateMatrixWorld(true);for(const c of crowd)c.userData.renderBatches.update();",
    )
    .replace(
      "function mode(batched){b.setEnabled(batched);}",
      "function mode(batched){atlas.setEnabled(batched);}",
    );
const bundle = await build({
  stdin: { contents: source, resolveDir: process.cwd(), loader: "js" },
  bundle: true,
  format: "esm",
  write: false,
});
const server = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end('<script type="module">' + bundle.outputFiles[0].text + "</script>");
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  executablePath: process.env.CHICHI_CHROMIUM,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 560 } }),
    errors = [],
    report = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("http://127.0.0.1:" + server.address().port);
  await page.waitForFunction(() => window.ready);
  for (const [name, options] of native
    ? [["chichi", {}]]
    : [
        ["plush", { breed: "british", color: 0xa9adb7, build: "plush" }],
        ["bare", { breed: "sphynx", color: 0xd7b5b0 }],
        ["long", { breed: "maine", color: 0xb9a692, build: "giant" }],
      ]) {
    await page.evaluate((o) => load(o), options);
    for (const pose of [
      ["happy", 3, true, {}],
      ["sleep", 8, false, {}],
      ["crazy hungry", 12, true, { paw: 0.8, surprise: 1 }],
      ["happy", 15, false, { crouch: 0.7, headPitch: 0.3 }],
    ]) {
      const r = await page.evaluate((p) => compare(...p), pose);
      report.push({ name, ...r });
      console.log(name, r);
      await page.screenshot({
        path: output + "/" + name + "-" + r.mood.replaceAll(" ", "-") + ".png",
      });
      assert.ok(
        r.mean < 0.02 && r.large < r.pixels * 0.0002,
        JSON.stringify(r),
      );
      if (native || atlasCheck) assert.equal(r.current.calls, r.old.calls);
      else assert.ok(r.current.calls < r.old.calls, JSON.stringify(r));
    }
  }
  assert.deepEqual(errors, []);
  await writeFile(
    output + "/comparison.json",
    JSON.stringify({ report, errors }, null, 2),
  );
} finally {
  await browser.close();
  server.close();
}
