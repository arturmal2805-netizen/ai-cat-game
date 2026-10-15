import fs from "node:fs/promises";
import http from "node:http";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { build } from "esbuild";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const root = fileURLToPath(new URL("../", import.meta.url)),
  bundles = new Map();
let original = "";
if (process.env.CHICHI_SCROLL_BASELINE) {
  const source = await fs.readFile(
      process.env.CHICHI_SCROLL_BASELINE + "/public/world.js",
      "utf8",
    ),
    start = source.indexOf("  let renderWidth = 0,"),
    marker = "  resize.observe(container);",
    end = source.indexOf(marker, start);
  assert.ok(
    start >= 0 && end > start,
    "Baseline must contain the old ResizeObserver path",
  );
  original = source.slice(start, end + marker.length);
}
for (const variant of original ? ["before", "after"] : ["after"]) {
  const contents = `
 import * as THREE from 'three';import{watchWorldViewport}from'./public/world-viewport.js';
 const container=document.getElementById('map'),renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
 renderer.setPixelRatio(2);renderer.setClearColor(0xb5bfdc,1);container.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,.1,100);
 camera.position.z=4;scene.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial({color:0xa7c79b})));
 ${variant === "before" ? original : "const viewport=watchWorldViewport(container);"}
 let last=0;
 const loop=time=>{
  if(${variant === "after" ? "viewport.pending||" : ""}time-last>=33){
    ${variant === "after" ? "viewport.apply(renderer,camera);" : ""}
    renderer.render(scene,camera);last=time;
  }requestAnimationFrame(loop);
 };requestAnimationFrame(loop);
 window.resizeAndRead=height=>new Promise(resolve=>{
  const observer=new MutationObserver(()=>{
   observer.disconnect();const gl=renderer.getContext(),p=new Uint8Array(4);
   gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);
   resolve({height,pixel:Array.from(p),width:renderer.domElement.width,bufferHeight:renderer.domElement.height});
  });observer.observe(renderer.domElement,{attributes:true,attributeFilter:['width','height']});
  container.style.height=height+'px';
 });window.ready=true;`;
  const bundle = await build({
    stdin: { contents, resolveDir: root },
    bundle: true,
    format: "esm",
    write: false,
  });
  bundles.set("/" + variant, bundle.outputFiles[0].text);
}
const server = http.createServer((q, r) => {
  r.setHeader("Content-Type", "text/html");
  r.end(
    '<style>body{margin:0}#map{width:390px;height:600px}canvas{width:100%;height:100%;display:block}</style><div id="map"></div><script type="module">' +
      bundles.get(q.url) +
      "</script>",
  );
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
  const results = {};
  for (const variant of bundles.keys()) {
    const page = await browser.newPage({
        viewport: { width: 430, height: 900 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto("http://127.0.0.1:" + server.address().port + variant);
    await page.waitForFunction(() => window.ready);
    const frames = [];
    for (const height of [
      680, 700, 645, 732, 560, 580, 625, 700, 610, 732, 620, 680,
    ]) {
      frames.push(
        await page.evaluate((height) => resizeAndRead(height), height),
      );
    }
    const black = frames.filter((f) =>
      f.pixel.slice(0, 3).every((v) => v === 0),
    ).length;
    results[variant] = { blackFrames: black, total: frames.length, frames };
    if (variant === "/after")
      assert.equal(black, 0, "Resize exposed a cleared buffer");
    else
      assert.ok(
        black > 0,
        "The reported cleared-buffer regression was not reproduced",
      );
    assert.ok(
      frames.every((f) => f.width === 780 && f.bufferHeight === f.height * 2),
      "Full DPR2 drawing resolution retained",
    );
    assert.deepEqual(errors, []);
    console.log(
      variant,
      black + " empty frames / " + frames.length + " resize transitions",
    );
    await page.close();
  }
  await fs.writeFile(
    "/tmp/chichi-scroll-pixels.json",
    JSON.stringify(results, null, 2),
  );
  console.log(
    "Actual WebGL resize regression passed, with full resolution and no shader errors.",
  );
} finally {
  await browser.close();
  server.close();
}
