import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { build } from "esbuild";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const root = fileURLToPath(new URL("../", import.meta.url)),
  review = process.env.CHICHI_CAT_REVIEW || "/tmp/chichi-breed-review";
const fixture = `
import * as T from 'three';
import {createCat,animateCat,setCatMood,disposeCat} from './public/cat-model.js';
import {ADOPTION_CATS,catAppearance} from './public/cat-breeds.js';
const renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setSize(520,520); renderer.toneMapping=T.ACESFilmicToneMapping;
document.body.append(renderer.domElement);
const scene=new T.Scene();scene.add(new T.HemisphereLight(0xf2f4ff,0x777b7f,1.8));
const sun=new T.DirectionalLight(0xffffff,2.5);sun.position.set(-3,5,5);scene.add(sun);
const fill=new T.DirectionalLight(0xc6d0f7,.7);fill.position.set(4,2,-2);scene.add(fill);
const camera=new T.PerspectiveCamera(32,1,.1,50);
const profile=id=>ADOPTION_CATS.find(p=>p.id===id);
const make=id=>createCat('happy',id?{...catAppearance(profile(id)),detail:'npc'}:{});
let current=null,currentId;
const clear=()=>{if(current){scene.remove(current);disposeCat(current);current=null;currentId=undefined;}};
window.profiles=ADOPTION_CATS;
window.renderCat=async(id,mood,angle=0)=>{
 renderer.setPixelRatio(1);renderer.setSize(520,520);
 if(!current||currentId!==id){clear();current=make(id);currentId=id;scene.add(current);}
 const cat=current;setCatMood(cat,mood,{immediate:true});
 if(angle===3)animateCat(cat,.15,true);
 camera.aspect=1;camera.updateProjectionMatrix();
 camera.position.set(Math.sin(angle)*4.7,2.4,Math.cos(angle)*4.7);camera.lookAt(0,1.05,0);
 await renderer.compileAsync(scene,camera); renderer.render(scene,camera);
 const data=renderer.domElement.toDataURL(), stats={calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
 return {data,stats};
};
window.stress=async()=>{
 clear();
 const cats=['mist','juniper','fig','cloudberry','curls','cloud'].map((id,i)=>{
   const cat=make('adopt-'+id);cat.scale.setScalar(.8);
   cat.position.set((i%3-1)*2.2,0,Math.floor(i/3)*2.3);scene.add(cat);return cat;
 });
 renderer.setSize(390,560);renderer.setPixelRatio(2);
 camera.aspect=390/560;camera.updateProjectionMatrix();camera.position.set(0,6,12);camera.lookAt(0,1,1);
 await renderer.compileAsync(scene,camera);
 const times=[];
 for(let i=0;i<19;i++){
   const start=performance.now();cats.forEach(c=>animateCat(c,1+i/60,true));renderer.render(scene,camera);
   // readPixels finishes GPU work; the measurement is a software-browser diagnostic.
   const pixels=new Uint8Array(4);renderer.getContext().readPixels(0,0,1,1,renderer.getContext().RGBA,renderer.getContext().UNSIGNED_BYTE,pixels);
   if(i>3)times.push(performance.now()-start);
 }
 times.sort((a,b)=>a-b);
 const result={median:times[Math.floor(times.length/2)],p95:times.at(-1),calls:renderer.info.render.calls,
   triangles:renderer.info.render.triangles,pixelRatio:renderer.getPixelRatio(),canvas:[renderer.domElement.width,renderer.domElement.height]};
 cats.forEach(c=>{scene.remove(c);disposeCat(c)});return result;
};window.ready=true;
`;
const variants = process.env.CHICHI_CAT_BASELINE
  ? [
      ["before", process.env.CHICHI_CAT_BASELINE],
      ["after", root],
    ]
  : [["after", root]];
const bundles = new Map();
for (const [name, directory] of variants) {
  const result = await build({
    stdin: { contents: fixture, resolveDir: directory },
    bundle: true,
    format: "esm",
    write: false,
  });
  bundles.set("/" + name, result.outputFiles[0].text);
}
const server = http.createServer((request, response) => {
  response.setHeader("Content-Type", "text/html");
  response.end(
    '<body style="margin:0"><script type="module">' +
      bundles.get(request.url) +
      "</script>",
  );
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  await fs.mkdir(review, { recursive: true });
  let hero = null;
  for (const [name] of variants) {
    const page = await browser.newPage(),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("http://127.0.0.1:" + server.address().port + "/" + name);
    await page.waitForFunction(() => window.ready);
    const heroRender = await page.evaluate(() => renderCat(null, "happy"));
    if (hero)
      assert.equal(heroRender.data, hero, "The approved hero render changed");
    hero = heroRender.data;
    // Both versions receive the same warm-up before timing. The full catalogue
    // review runs afterwards so shader disposal/GC cannot bias one variant.
    console.log(name, await page.evaluate(() => stress()));
    if (name === "after") {
      const profiles = await page.evaluate(() => window.profiles);
      const featured = new Set([
        "adopt-fig",
        "adopt-juniper",
        "adopt-cloudberry",
        "adopt-mooncake",
        "adopt-pretzel",
        "adopt-marzipan",
        "adopt-plushkin",
        "adopt-doughnut",
        "adopt-marshmallow",
      ]);
      for (const profile of profiles) {
        for (const mood of ["happy", "sleep", "crazy hungry"]) {
          const result = await page.evaluate(
            ({ id, mood }) => renderCat(id, mood, -0.3),
            { id: profile.id, mood },
          );
          assert.ok(
            result.stats.calls <= 20 && result.stats.triangles <= 18500,
            profile.id + " / " + mood + ": " + JSON.stringify(result.stats),
          );
          if (mood === "happy" && featured.has(profile.id))
            await fs.writeFile(
              path.join(review, profile.id + ".png"),
              Buffer.from(result.data.split(",")[1], "base64"),
            );
        }
        if (featured.has(profile.id))
          for (const angle of [1.5, 3]) {
            const result = await page.evaluate(
              ({ id, angle }) => renderCat(id, "happy", angle),
              { id: profile.id, angle },
            );
            await fs.writeFile(
              path.join(review, profile.id + "-" + angle + ".png"),
              Buffer.from(result.data.split(",")[1], "base64"),
            );
          }
        console.log("Verified", profile.id);
      }
      console.log(
        "All",
        profiles.length,
        "cats rendered in three moods; side/back/walking views saved.",
      );
    }
    assert.deepEqual(errors, [], "WebGL/browser errors");
    await page.close();
  }
  console.log("Approved Chichi pixels unchanged. No shader errors.");
} finally {
  await browser.close();
  server.close();
}
