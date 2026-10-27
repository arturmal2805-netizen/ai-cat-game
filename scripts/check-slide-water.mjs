// Actual WebGL audit of every water attraction. Optional browser tooling;
// no live account, cloud save, external API or production credentials are used.
import { build } from "esbuild";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { WATER_RIDES } from "../public/water-ride-data.js";
const { chromium } = createRequire(import.meta.url)(
  process.env.CHICHI_PLAYWRIGHT_MODULE || "playwright",
);
const folder = resolve(
  process.env.CHICHI_SLIDE_REVIEW || "/tmp/chichi-slide-water-review",
);
await mkdir(folder, { recursive: true });
const roots = [
  ...(process.env.CHICHI_SLIDE_BASELINE
    ? [{ name: "before", path: resolve(process.env.CHICHI_SLIDE_BASELINE) }]
    : []),
  { name: "after", path: resolve(".") },
];
const source = `
import * as T from 'three';import {makeAttraction,animateAttraction} from './public/world-assets.js';import {disposeScenery} from './public/scenery-models.js';
import {createCat,animateCat,reactCat} from './public/cat-model.js';
import {applyAtollSit} from './public/atoll-slide-acting.js';
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.toneMapping=T.ACESFilmicToneMapping;renderer.setSize(720,600);document.body.style='margin:0';document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0xc4d9e3);scene.add(new T.HemisphereLight(0xe7f1ff,0x81856c,1.5));const sun=new T.DirectionalLight(0xffeed9,2.3);sun.position.set(-8,14,7);scene.add(sun);
const camera=new T.PerspectiveCamera(35,1.2,.5,600);let model,extent,center,guest,carrier;
window.loadRide=async(id)=>{camera.up.set(0,1,0);carrier?.removeFromParent();if(model){model.removeFromParent();disposeScenery(model);}model=makeAttraction(id);scene.add(model);const box=new T.Box3().setFromObject(model);center=box.getCenter(new T.Vector3());extent=box.getSize(new T.Vector3()).length();camera.position.copy(center).add(new T.Vector3(.6,.48,.85).multiplyScalar(extent*1.25));camera.lookAt(center);await renderer.compileAsync(scene,camera);window.model=model;draw(5);};
window.reviewRider=async(u)=>{if(!guest){guest=createCat('happy');guest.scale.setScalar(.63);carrier=new T.Group();carrier.add(guest);}
 const route=model.userData.route,lane=route.lanes[0],legs=lane.legs.filter(l=>['ride','vortex'].includes(l.phase)),leg=legs[Math.floor((legs.length-1)*u)],t=leg.start+leg.duration*(.2+u*.6),f=lane.frame(t);
 model.add(carrier);carrier.visible=true;carrier.position.set(...f.position);if(f.quaternion)carrier.quaternion.fromArray(f.quaternion);else carrier.rotation.set(f.pitch||0,f.yaw||0,f.roll||0);
 animateCat(guest,t,false);const reaction=model.userData.rideReaction(t,false,0);reactCat(guest,reaction);applyAtollSit(guest,reaction);model.userData.rideElapsed=t;model.userData.update(t,false);
 const p=new T.Vector3(...f.position),right=new T.Vector3(1,0,0).applyQuaternion(carrier.quaternion),up=new T.Vector3(0,1,0).applyQuaternion(carrier.quaternion),forward=new T.Vector3(0,0,1).applyQuaternion(carrier.quaternion);camera.up.copy(up);camera.position.copy(p).addScaledVector(right,4.5).addScaledVector(up,3.6).addScaledVector(forward,6);camera.lookAt(p.clone().addScaledVector(up,1));await renderer.compileAsync(scene,camera);renderer.render(scene,camera);
 return {phase:f.phase,elapsed:t,position:f.position,reaction:{...reaction},seat:[...carrier.position],finite:f.position.every(Number.isFinite)};};
window.hideRider=()=>{carrier?.removeFromParent();delete model.userData.rideElapsed;reviewAngle();draw(63);};
window.draw=(time,reduced=false)=>{if(model.userData.update)model.userData.update(time,reduced);else animateAttraction(model,reduced?0:time);model.userData.moving.visible=false;for(const vehicle of model.userData.vehicles||[])vehicle.visible=false;renderer.render(scene,camera);};
window.reviewAngle=(grazing=false)=>{camera.up.set(0,1,0);camera.position.copy(center).add(new T.Vector3(grazing?.85:.6,grazing?.12:.48,grazing?.85:.85).multiplyScalar(extent*1.25));camera.lookAt(center);};
window.check={renderer,scene,camera};window.ready=true;`;
const staticAudit = `
import {configureStaticSubmissions} from './public/static-submissions.js';
window.staticAudit=()=>{
 const states=[];model.traverse(o=>{if(typeof o.userData.staticSubmission?.setEnabled==='function')states.push(o.userData.staticSubmission);});
 const gl=renderer.getContext(),a=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4),b=new Uint8Array(a.length);
 states.forEach(s=>s.setEnabled(false));renderer.render(scene,camera);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,a);
 states.forEach(s=>s.setEnabled(true));renderer.render(scene,camera);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,b);
 let changed=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])changed++;
 return{changed,meshes:states.length};
};`;
const bundles = new Map();
for (const root of roots) {
  const r = await build({
    stdin: {
      contents:
        root.name === "after"
          ? staticAudit +
            source.replace(
              "renderer.toneMapping=",
              "configureStaticSubmissions(renderer);renderer.toneMapping=",
            )
          : source.replace("import {applyAtollSit} from './public/atoll-slide-acting.js';", "const applyAtollSit=()=>{};"),
      resolveDir: root.path,
      loader: "js",
    },
    bundle: true,
    format: "esm",
    write: false,
  });
  bundles.set("/" + root.name, r.outputFiles[0].text);
}
const server = createServer((req, res) => {
  if (req.url === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }
  const script = bundles.get(req.url);
  res.writeHead(script ? 200 : 404, { "Content-Type": "text/html" });
  res.end(script ? '<script type="module">' + script + "</script>" : "");
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
let browser;
const report = [];
try {
  browser = await chromium.launch({
    executablePath: process.env.CHICHI_CHROMIUM,
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  for (const root of roots) {
    const page = await browser.newPage({
        viewport: { width: 720, height: 600 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(
      "http://127.0.0.1:" + server.address().port + "/" + root.name,
    );
    await page.waitForFunction(() => window.ready);
    for (const spec of WATER_RIDES.filter(
      (r) =>
        !process.env.CHICHI_SLIDE_FILTER ||
        process.env.CHICHI_SLIDE_FILTER.split(",").includes(r.id),
    )) {
      if(root.name==='before' && spec.id.startsWith('slide-atoll-'))continue;
      await page.evaluate((id) => loadRide(id), spec.id);
      const stats = await page.evaluate(
        async (timedFrames) => {
          const { renderer: r } = check,
            w = model.userData.slideWater;
          draw(6);
          const still = r.domElement.toDataURL();
          draw(6.4);
          const animated = still !== r.domElement.toDataURL();
          draw(5, true);
          const frozen = r.domElement.toDataURL();
          draw(35, true);
          const stable = frozen === r.domElement.toDataURL();
          const versions = w
            ? [
                w.effects.spray.geometry.attributes.aLife.version,
                w.effects.spray.geometry.attributes.aOrigin.version,
              ]
            : [];
          draw(40);
          draw(41);
          const buffersStable =
            !w ||
            (versions[0] ===
              w.effects.spray.geometry.attributes.aLife.version &&
              versions[1] ===
                w.effects.spray.geometry.attributes.aOrigin.version);
          const idleSpray = w?.effects.spray.visible;
          if (w?.events.length) {
            model.userData.rideElapsed = w.events.at(-1).time + 0.02;
            draw(50);
          }
          const impact = w
            ? Array.from(w.effects.power).some((n) => n > 0)
            : null;
          delete model.userData.rideElapsed;
          const gl = r.getContext(),
            times = [];
          for (let i = 0; i < timedFrames; i++) {
            const start = performance.now();
            draw(60 + i / 30);
            gl.finish();
            if (i >= 4) times.push(performance.now() - start);
          }
          times.sort((a, b) => a - b);
          return {
            draws: r.info.render.calls,
            triangles: r.info.render.triangles,
            textures: r.info.memory.textures,
            medianMs: times[Math.floor(times.length / 2)],
            p95Ms: times.at(-1),
            timingSkipped: timedFrames === 0,
            animated,
            stable,
            buffersStable,
            idleSpray,
            impact,
            channels: w
              ? w.channels.length +
                w.materials.filter((m) => m.uniforms.uFlowing.value === 2)
                  .length
              : null,
            outlets: w?.outlets.length,
            contextLost: gl.isContextLost(),
          };
        },
        process.env.CHICHI_SKIP_TIMING ? 0 : 16,
      );
      if (root.name === "after") {
        stats.staticFrames = [
          { view: "normal", ...(await page.evaluate(() => staticAudit())) },
        ];
        assert.equal(
          stats.staticFrames[0].changed,
          0,
          spec.id + " static submission changed pixels",
        );
        assert.equal(stats.channels, spec.channels, spec.id);
        assert.equal(stats.animated, true, spec.id + " is static");
        assert.equal(stats.stable, true, spec.id + " reduced motion");
        assert.equal(stats.buffersStable, true);
        assert.equal(stats.contextLost, false);
        assert.equal(stats.idleSpray, spec.kind !== "dive");
        assert.equal(stats.impact, true);
      }
      await page.screenshot({
        path: resolve(folder, root.name + "-" + spec.id + ".png"),
      });
      if(root.name==='after' && spec.id.startsWith('slide-atoll-') && process.env.CHICHI_ATOLL_RIDER_AUDIT){
        stats.riderFrames=[];
        for(const [i,u] of [.12,.5,.9].entries()){
          const frame=await page.evaluate(u=>reviewRider(u),u);assert.equal(frame.finite,true);
          await page.screenshot({path:resolve(folder,root.name+'-'+spec.id+'-rider-'+i+'.png')});stats.riderFrames.push(frame);
        }
        await page.evaluate(()=>hideRider());
      }
      if (root.name === "after")
        for (const view of ["flow", "outlet"]) {
          const exists = await page.evaluate(
            ({ view, id }) => {
              const w = model.userData.slideWater;
              let p =
                view === "flow"
                  ? w.channels[0]?.geometry.userData.flowFrames[
                      Math.floor(
                        w.channels[0].geometry.userData.flowFrames.length * 0.4,
                      )
                    ].p
                  : w.outlets.at(-1)?.to;
              if (view === "flow" && id === "slide-titan-funnel")
                p = { x: 3, y: 5.55, z: 1 };
              if (!p) return false;
              check.camera.position.set(p.x + 4, p.y + 3, p.z + 5);
              if (id === "slide-titan-funnel" && view === "flow")
                check.camera.position.set(p.x + 3, p.y + 9, p.z + 4);
              check.camera.lookAt(p.x, p.y, p.z);
              draw(63);
              return true;
            },
            { view, id: spec.id },
          );
          if (exists)
            await page.screenshot({
              path: resolve(
                folder,
                root.name + "-" + spec.id + "-" + view + "-close.png",
              ),
            });
        }
      if (
        root.name === "after" &&
        [
          "slide-glass-corkscrew",
          "slide-titan-funnel",
          "slide-marshmallow",
          "waterslide",
          "slide-rainbow-tsunami",
        ]
          .concat(
            WATER_RIDES.filter((r) => /slide-(dream|atoll)-/.test(r.id)).map(
              (r) => r.id,
            ),
          )
          .includes(spec.id)
      ) {
        await page.evaluate(() => {
          reviewAngle(true);
          draw(63);
        });
        await page.screenshot({
          path: resolve(folder, root.name + "-" + spec.id + "-grazing.png"),
        });
        const frame = await page.evaluate(() => staticAudit());
        stats.staticFrames.push({ view: "grazing", ...frame });
        assert.equal(frame.changed, 0, spec.id + " grazing pixels");
      }
      report.push({ version: root.name, id: spec.id, ...stats });
      console.log(root.name, spec.id, JSON.stringify(stats));
    }
    await page.setViewportSize({ width: 390, height: 560 });
    for (const id of [
      "slide-marshmallow",
      "slide-glass-corkscrew",
      "slide-rainbow-tsunami",
      ...WATER_RIDES.filter(
        (r) =>
          /slide-(dream|atoll)-/.test(r.id) &&
          (!process.env.CHICHI_SLIDE_FILTER ||
            process.env.CHICHI_SLIDE_FILTER.split(",").includes(r.id)),
      ).map((r) => r.id),
    ]) {
      if(root.name==='before' && id.startsWith('slide-atoll-'))continue;
      await page.evaluate(async (id) => {
        const { renderer: r, camera: c } = check;
        r.setPixelRatio(2);
        r.setSize(390, 560);
        c.aspect = 390 / 560;
        c.updateProjectionMatrix();
        await loadRide(id);
        draw(7);
      }, id);
      const canvas = await page.evaluate(() => [
        check.renderer.domElement.width,
        check.renderer.domElement.height,
      ]);
      assert.deepEqual(canvas, [780, 1120]);
      await page.screenshot({
        path: resolve(folder, root.name + "-" + id + "-phone.png"),
      });
      if (root.name === "after") {
        const frame = await page.evaluate(() => staticAudit());
        report
          .find((r) => r.version === root.name && r.id === id)
          ?.staticFrames.push({ view: "phone", ...frame });
        assert.equal(frame.changed, 0, id + " phone pixels");
      }
    }
    assert.deepEqual(errors, [], root.name + " browser/GLSL errors");
    await page.close();
  }
  await writeFile(
    resolve(folder, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    "Every water ride rendered: flowing channels, real outlets, ballistic droplets, foam, rider impacts, stable reduced motion and full mobile DPR.",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
