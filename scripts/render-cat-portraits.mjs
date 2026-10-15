import fs from "node:fs";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { build } from "esbuild";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
(async () => {
  const root = fileURLToPath(new URL("../", import.meta.url)).replace(
    /\/$/,
    "",
  );
  const out = await build({
    stdin: {
      contents: `
import{BUSINESSES}from'./public/business-data.js';import{makeAttraction}from'./public/world-assets.js';import{disposeScenery}from'./public/scenery-models.js';import*as T from'three';import{createCat,disposeCat}from'./public/cat-model.js';import{ADOPTION_CATS,catAppearance}from'./public/cat-breeds.js';
const r=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});r.setSize(400,400);r.setPixelRatio(1);r.toneMapping=T.ACESFilmicToneMapping;document.body.append(r.domElement);const scene=new T.Scene();scene.add(new T.HemisphereLight(0xf2f4ff,0x777b7f,1.8));const sun=new T.DirectionalLight(0xffffff,2.5);sun.position.set(-3,5,5);scene.add(sun);const fill=new T.DirectionalLight(0xc6d0f7,.7);fill.position.set(4,2,-2);scene.add(fill);const c=new T.PerspectiveCamera(32,1,.1,30);c.position.set(-1.5,2.6,4.5);c.lookAt(0,1.05,0);
window.profiles=ADOPTION_CATS;window.renderCat=async(id,mood='happy')=>{const p=ADOPTION_CATS.find(p=>p.id===id);const cat=createCat(mood,p?{...catAppearance(p),detail:'npc'}:{});scene.add(cat);await r.compileAsync(scene,c);r.render(scene,c);let stats={calls:r.info.render.calls,tris:r.info.render.triangles};const url=r.domElement.toDataURL('image/png');scene.remove(cat);disposeCat(cat);return {url,stats};};window.venueIds=[...BUSINESSES.map(b=>b.id),'adoption-center','cat-barista'];
window.renderVenue=async id=>{
const scene=new T.Scene();scene.add(new T.HemisphereLight(0xfff1eb,0xc1b3d7,1.6));const light=new T.DirectionalLight(0xffe9df,2.5);light.position.set(-3,7,5);scene.add(light);
const object=makeAttraction(id);scene.add(object);const box=new T.Box3().setFromObject(object),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),radius=Math.max(size.x,size.y,size.z,1.4);
const camera=new T.PerspectiveCamera(34,1.5,.1,180);camera.position.copy(center).add(new T.Vector3(.95,.65,1.25).normalize().multiplyScalar(radius*1.75));camera.lookAt(center);
r.setSize(300,200);r.toneMappingExposure=.95;await r.compileAsync(scene,camera);r.render(scene,camera);const data=r.domElement.toDataURL('image/png');disposeScenery(object);return data;};
window.ready=true;`,
      resolveDir: root,
      loader: "js",
    },
    bundle: true,
    format: "esm",
    write: false,
  });
  const server = http.createServer((q, r) => {
    r.setHeader("Content-Type", "text/html");
    r.end('<script type="module">' + out.outputFiles[0].text + "</script>");
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  try {
    const p = await browser.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto("http://127.0.0.1:" + server.address().port);
    await p.waitForFunction(() => window.ready);
    fs.mkdirSync(root + "/public/art/cats", { recursive: true });
    const manifest = {};
    for (const profile of await p.evaluate(() => profiles)) {
      const { url, stats } = await p.evaluate(
        (id) => renderCat(id),
        profile.id,
      );
      fs.writeFileSync(
        root + "/public/art/cats/" + profile.id + ".png",
        Buffer.from(url.split(",")[1], "base64"),
      );
      manifest[profile.id] = "./art/cats/" + profile.id + ".png";
      console.log(profile.id, stats);
    }
    for (const mood of ["sleep", "crazy hungry", "happy"]) {
      const { url } = await p.evaluate((m) => renderCat(null, m), mood);
      fs.writeFileSync(
        root + "/public/art/cats/chichi-" + mood.replace(" ", "-") + ".png",
        Buffer.from(url.split(",")[1], "base64"),
      );
    }
    fs.writeFileSync(
      root + "/public/cat-portrait-manifest.js",
      "// Offline renders of the actual animated rigs. Keep menu opening free of GPU model builds.\nexport const CAT_PORTRAITS=" +
        JSON.stringify(manifest, null, 2) +
        ";\nexport const CHICHI_PORTRAITS=" +
        JSON.stringify(
          Object.fromEntries(
            ["sleep", "crazy hungry", "happy"].map((m) => [
              m,
              "./art/cats/chichi-" + m.replace(" ", "-") + ".png",
            ]),
          ),
          null,
          2,
        ) +
        ";\n",
    );
    // Version image URLs by content so an update cannot reuse an old portrait.
    const path = root + "/public/cat-portrait-manifest.js";
    let text = fs.readFileSync(path, "utf8");
    text = text.replace(
      /\.\/art\/cats\/[^"?]+\.png/g,
      (url) =>
        url +
        "?v=" +
        createHash("sha256")
          .update(fs.readFileSync(root + "/public/" + url.slice(2)))
          .digest("hex")
          .slice(0, 12),
    );
    if (errors.length) throw new Error(errors.join("\n"));
    fs.writeFileSync(path, text);
    if (process.argv.includes("--venues")) {
      for (const id of await p.evaluate(() => venueIds)) {
        const data = await p.evaluate((id) => renderVenue(id), id);
        fs.writeFileSync(
          root + "/public/art/previews/" + id + ".png",
          Buffer.from(data.split(",")[1], "base64"),
        );
      }
      const file = root + "/public/art/previews/catalog.json",
        catalog = JSON.parse(fs.readFileSync(file, "utf8")),
        hash = createHash("sha256");
      for (const id of catalog.items)
        hash
          .update(id)
          .update(
            fs.readFileSync(root + "/public/art/previews/" + id + ".png"),
          );
      catalog.version = hash.digest("hex").slice(0, 12);
      fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + "\n");
    }
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
