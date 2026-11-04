// Actual WebGL audit of every water attraction. Optional browser tooling;
// no live account, cloud save, external API or production credentials are used.
import { build } from "esbuild";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { WATER_RIDES } from "../public/water-ride-data.js";
import {SHOWCASE_SURFACE_ASSETS} from '../public/showcase-surface-assets.js';
import {SHOWCASE_WATER_PROBES} from '../public/showcase-probe-assets.js';
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
const selectedRides=WATER_RIDES.filter(r=>(!process.env.CHICHI_SLIDE_OLD_ONLY||!r.id.startsWith('ride-water-'))&&(!process.env.CHICHI_SLIDE_FILTER||process.env.CHICHI_SLIDE_FILTER.split(",").includes(r.id)));
const source = `
import * as T from 'three';import {makeAttraction,animateAttraction} from './public/world-assets.js';import {disposeScenery} from './public/scenery-models.js';
import {createCat,animateCat,reactCat} from './public/cat-model.js';
import {applyAtollSit} from './public/atoll-slide-acting.js';
import {prepareShowcaseSurfaces} from './public/showcase-surface-details.js';
import {prepareShowcaseWaterProbe} from './public/showcase-water-probes.js';
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.toneMapping=T.ACESFilmicToneMapping;renderer.setSize(720,600);document.body.style='margin:0';document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0xc4d9e3);scene.add(new T.HemisphereLight(0xe7f1ff,0x81856c,1.5));const sun=new T.DirectionalLight(0xffeed9,2.3);sun.position.set(-8,14,7);scene.add(sun);
const camera=new T.PerspectiveCamera(35,1.2,.5,600);let model,extent,center,guest,carrier;
window.loadRide=async(id)=>{if(id.startsWith('ride-water-'))await Promise.all([prepareShowcaseSurfaces(),prepareShowcaseWaterProbe(id)]);camera.up.set(0,1,0);carrier?.removeFromParent();if(model){model.removeFromParent();disposeScenery(model);}model=makeAttraction(id);scene.add(model);const box=new T.Box3().setFromObject(model);center=box.getCenter(new T.Vector3());extent=box.getSize(new T.Vector3()).length();window.nativeFrame={center:center.toArray(),extent};camera.position.copy(center).add(new T.Vector3(.6,.48,.85).multiplyScalar(extent*1.25));camera.lookAt(center);await renderer.compileAsync(scene,camera);window.model=model;draw(5);};
window.reviewRider=async(input)=>{const u=typeof input==='number'?input:input.u??.5,laneIndex=input?.lane||0;if(!guest){guest=createCat('happy');guest.scale.setScalar(.63);carrier=new T.Group();carrier.add(guest);}
 const d=model.userData,route=d.route,lane=route?.lanes?.[laneIndex]||route||{frame:d.rideFrame,duration:d.duration},wet=lane.legs?.filter(l=>['ride','vortex','slide','rafting','drop','boost','flight','skim','surf','float','carousel','swing'].includes(l.phase)),legs=wet?.length?wet:lane.legs?.filter(l=>l.phase==='flight')||[{start:0,duration:lane.duration}],leg=legs[Math.floor((legs.length-1)*u)],t=Number.isFinite(input?.time)?input.time:u===1?(lane.legs?.find(l=>l.phase==='splash')?.start??d.slideWater.events.at(-1)?.time??lane.duration*.9)+.12:leg.start+leg.duration*(.2+u*.6),f=lane.frame(t);
 model.add(carrier);carrier.visible=true;carrier.position.set(...f.position);if(f.quaternion)carrier.quaternion.fromArray(f.quaternion);else carrier.rotation.set(f.pitch||0,f.yaw||0,f.roll||0);
 animateCat(guest,t,false,false);const reaction=model.userData.rideReaction?.(t,false,laneIndex)||{};reactCat(guest,reaction);applyAtollSit(guest,reaction);model.userData.rideElapsed=t;model.userData.update(t,false);
 const p=new T.Vector3(...f.position),right=new T.Vector3(1,0,0).applyQuaternion(carrier.quaternion),up=new T.Vector3(0,1,0).applyQuaternion(carrier.quaternion),forward=new T.Vector3(0,0,1).applyQuaternion(carrier.quaternion);camera.up.copy(up);camera.position.copy(p).addScaledVector(right,4.5).addScaledVector(up,3.6).addScaledVector(forward,6);camera.lookAt(p.clone().addScaledVector(up,1));await renderer.compileAsync(scene,camera);renderer.render(scene,camera);
 return {phase:f.phase,elapsed:t,position:f.position,reaction:{...reaction},seat:[...carrier.position],nativeJoints:{head:guest.userData.head.rotation.toArray().slice(0,3),paws:guest.userData.legs.map(l=>l.rotation.toArray().slice(0,3))},finite:f.position.every(Number.isFinite)};};
window.hideRider=()=>{carrier?.removeFromParent();delete model.userData.rideElapsed;reviewAngle();draw(63);};
window.draw=(time,reduced=false)=>{if(model.userData.update)model.userData.update(time,reduced);else animateAttraction(model,reduced?0:time);model.userData.moving.visible=false;for(const vehicle of model.userData.vehicles||[])vehicle.visible=false;renderer.render(scene,camera);};
window.reviewAngle=(grazing=false)=>{camera.up.set(0,1,0);camera.position.copy(center).add(new T.Vector3(grazing?.85:.6,grazing?.12:.48,grazing?.85:.85).multiplyScalar(extent*1.25));camera.lookAt(center);};
window.viewFrame=frame=>{if(frame){center.fromArray(frame.center);extent=frame.extent;reviewAngle();draw(5);}return {center:center.toArray(),extent};};
window.reviewCascade=()=>{let chosen,height=0;model.traverse(o=>{if(!o.children.some(c=>c.geometry?.attributes?.aFallPhase))return;const sheet=o.children.find(c=>c.material?.uniforms?.uFall?.value===1),h=sheet?.material.uniforms.uScale.value.y||0;if(h>height){chosen=sheet;height=h;}});if(!chosen)return null;const box=new T.Box3().setFromObject(chosen),p=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),q=chosen.getWorldQuaternion(new T.Quaternion()),direction=new T.Vector3(.18,.03,1).normalize().applyQuaternion(q);camera.up.set(0,1,0);camera.position.copy(p).addScaledVector(direction,Math.max(size.x,size.y)*1.9);camera.lookAt(p);draw(63);return {height,position:p.toArray(),size:size.toArray()};};
window.reviewBanks=()=>{const r=model.userData.route;if(!['canyon-rafting','lazy-river'].includes(model.userData.id?.replace('ride-water-','')))return false;const river=r.geometry[0].river,p=new T.Vector3(0,river?8:22,river?-3:-5);camera.up.set(0,1,0);camera.position.copy(p).add(new T.Vector3(river?60:40,river?100:65,river?95:65));camera.lookAt(p);draw(63);return true;};
window.check={renderer,scene,camera,THREE:T};window.ready=true;`;
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
  const hasSit=await access(resolve(root.path,'public/atoll-slide-acting.js')).then(()=>true,()=>false);
  const hasSurfaces=(await readFile(resolve(root.path,'public/showcase-surface-details.js'),'utf8').catch(()=>'' )).includes('export function prepareShowcaseSurfaces');
  let rootSource=hasSurfaces?source:source.replace("import {prepareShowcaseSurfaces} from './public/showcase-surface-details.js';","const prepareShowcaseSurfaces=()=>Promise.resolve(false);");
  if(!await access(resolve(root.path,'public/showcase-water-probes.js')).then(()=>true,()=>false))rootSource=rootSource.replace("import {prepareShowcaseWaterProbe} from './public/showcase-water-probes.js';","const prepareShowcaseWaterProbe=()=>Promise.resolve(false);");
  if(process.env.CHICHI_SLIDE_BEAUTY)rootSource=rootSource.replace('scene.add(sun);','scene.add(sun); scene.children[0].color.set(0xffe9db);scene.children[0].groundColor.set(0x8b9e85);scene.children[0].intensity=1.2;renderer.shadowMap.enabled=true; renderer.shadowMap.type=T.PCFShadowMap; sun.color.set(0xffd8b7);sun.intensity=2.2;sun.position.set(-70,175,100);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-85,right:85,top:85,bottom:-85,near:1,far:400});sun.shadow.bias=-.0005;const rim=new T.DirectionalLight(0xb8b7ec,.9);rim.position.set(20,16,-30);scene.add(rim);');
  const hasStatic=await access(resolve(root.path,'public/static-submissions.js')).then(()=>true,()=>false),beforeSource=hasStatic?"import {configureStaticSubmissions} from './public/static-submissions.js';\n"+rootSource.replace('renderer.toneMapping=','configureStaticSubmissions(renderer);renderer.toneMapping='):rootSource;
  const r = await build({
    stdin: {
      contents:
        root.name === "after"
          ? staticAudit +
            rootSource.replace(
              "renderer.toneMapping=",
              "configureStaticSubmissions(renderer);renderer.toneMapping=",
            )
          : hasSit?beforeSource:beforeSource.replace("import {applyAtollSit} from './public/atoll-slide-acting.js';", "const applyAtollSit=()=>{};"),
      resolveDir: root.path,
      loader: "js",
    },
    bundle: true,
    format: "esm",
    write: false,
  });
  bundles.set("/" + root.name, r.outputFiles[0].text);
}
const surfaceAssets=new Map();for(const roles of Object.values(SHOWCASE_SURFACE_ASSETS))for(const url of Object.values(roles))surfaceAssets.set(url.slice(1),await readFile(resolve('public',url)));
for(const url of Object.values(SHOWCASE_WATER_PROBES))surfaceAssets.set(url.slice(1),await readFile(resolve('public',url)));
// Serve each checkout's own content-hashed charts/probes. A baseline must not
// silently fall back to old procedural maps after the candidate replaces a PNG.
for(const root of roots){
 const chartText=await readFile(resolve(root.path,'public/showcase-surface-assets.js'),'utf8').catch(()=>''),probeText=await readFile(resolve(root.path,'public/showcase-probe-assets.js'),'utf8').catch(()=>'');
 const charts=JSON.parse(chartText.match(/SHOWCASE_SURFACE_ASSETS=(\{[\s\S]*?\});/)?.[1]||'{}'),probes=JSON.parse(probeText.match(/SHOWCASE_WATER_PROBES=(\{[\s\S]*?\});/)?.[1]||'{}');
 for(const url of [...Object.values(charts).flatMap(Object.values),...Object.values(probes)])surfaceAssets.set(url.slice(1),await readFile(resolve(root.path,'public',url)));
}

const server = createServer((req, res) => {
  if(surfaceAssets.has(req.url)){res.writeHead(200,{'Content-Type':'image/png'});res.end(surfaceAssets.get(req.url));return;}
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
const report = process.env.CHICHI_SLIDE_RESUME?await readFile(resolve(folder,"report.json"),"utf8").then(JSON.parse,()=>[]):[];
const comparisonFrames=new Map(process.env.CHICHI_SLIDE_FRAME_FILE?Object.entries(JSON.parse(await readFile(resolve(process.env.CHICHI_SLIDE_FRAME_FILE),'utf8'))):[]);
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
    page.setDefaultTimeout(120000);
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(
      "http://127.0.0.1:" + server.address().port + "/" + root.name,
    );
    await page.waitForFunction(() => window.ready);
    for (const spec of selectedRides) {
      const completed=report.find(r=>r.version===root.name&&r.id===spec.id);
      if(completed&&process.env.CHICHI_SLIDE_SEAMS_ONLY){
        await page.evaluate(id=>loadRide(id),spec.id);completed.banks=await page.evaluate(()=>reviewBanks());
        if(completed.banks)await page.screenshot({path:resolve(folder,root.name+'-'+spec.id+'-banks.png')});
        await writeFile(resolve(folder,'report.json'),JSON.stringify(report,null,2));continue;
      }
      if(completed&&process.env.CHICHI_SLIDE_CASCADES_ONLY){
        await page.evaluate(id=>loadRide(id),spec.id);completed.cascade=await page.evaluate(()=>reviewCascade());
        if(completed.cascade)await page.screenshot({path:resolve(folder,root.name+'-'+spec.id+'-cascade-close.png')});
        await writeFile(resolve(folder,'report.json'),JSON.stringify(report,null,2));continue;
      }
      if(completed&&process.env.CHICHI_SLIDE_RIDERS_ONLY){
        await page.evaluate(id=>loadRide(id),spec.id);completed.riderFrames=[];
        for(const [i,u] of [.12,.5,.9,1].entries()){
          const frame=await page.evaluate(u=>reviewRider(u),u);assert.equal(frame.finite,true);
          await page.screenshot({path:resolve(folder,root.name+'-'+spec.id+'-rider-'+i+'.png')});completed.riderFrames.push(frame);
        }
        if(process.env.CHICHI_SLIDE_PERFORMANCE_AUDIT && spec.id.startsWith('ride-water-')){
          const times=await page.evaluate(()=>{const r=model.userData.route,leg=r.legs.filter(l=>['ride','rafting','drop','flight','surf','float','carousel','swing'].includes(l.phase)).sort((a,b)=>b.duration-a.duration)[0];return [.08,.13,.27,.40,.52,.65,.73,.86,.94].map(u=>leg.start+leg.duration*u);});completed.performanceFrames=[];
          for(const [i,time]of times.entries()){const frame=await page.evaluate(time=>reviewRider({time}),time);assert.equal(frame.finite,true);await page.screenshot({path:resolve(folder,root.name+'-'+spec.id+'-performance-'+String(i).padStart(2,'0')+'.png')});completed.performanceFrames.push(frame);}
        }
        if(process.env.CHICHI_SLIDE_LANDING_AUDIT && spec.id.startsWith('ride-water-')){
          const time=await page.evaluate(()=>model.userData.route.legs.find(l=>l.phase==='exit').start-.08);completed.dismountFrame=await page.evaluate(time=>reviewRider({time}),time);assert.equal(completed.dismountFrame.finite,true);await page.screenshot({path:resolve(folder,root.name+'-'+spec.id+'-dismount-support.png')});
        }
        await page.evaluate(()=>hideRider());await writeFile(resolve(folder,'report.json'),JSON.stringify(report,null,2));console.log('Seated native pose',spec.id);continue;
      }
      if(completed){if(root.name==='before'){await page.evaluate(id=>loadRide(id),spec.id);comparisonFrames.set(spec.id,await page.evaluate(()=>viewFrame()));}continue;}
      await page.evaluate((id) => loadRide(id), spec.id);
      const nativeFrame=await page.evaluate(()=>window.nativeFrame);
      if(process.env.CHICHI_SLIDE_FRAME_FILE&&comparisonFrames.has(spec.id)){
        const expected=comparisonFrames.get(spec.id);
        assert.ok(Math.abs(nativeFrame.extent-expected.extent)<.0001,spec.id+' comparison extent');
        assert.ok(nativeFrame.center.every((v,i)=>Math.abs(v-expected.center[i])<.0001),spec.id+' comparison centre');
      }
      if(root.name==='before')comparisonFrames.set(spec.id,await page.evaluate(()=>viewFrame()));
      else if(comparisonFrames.has(spec.id))await page.evaluate(frame=>viewFrame(frame),comparisonFrames.get(spec.id));
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
            waterProbes:(()=>{const names=new Set();model.traverse(o=>{if(o.isMesh&&o.material.uniforms?.uWaterEnvironment)names.add(o.material.uniforms.uWaterEnvironment.value.name);});return [...names];})(),
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
      if(root.name==='after' && (process.env.CHICHI_SLIDE_RIDER_AUDIT||spec.id.startsWith('slide-atoll-') && process.env.CHICHI_ATOLL_RIDER_AUDIT)){
        stats.riderFrames=[];
        for(const [i,u] of [.12,.5,.9,1].entries()){
          const frame=await page.evaluate(u=>reviewRider(u),u);assert.equal(frame.finite,true);
          await page.screenshot({path:resolve(folder,root.name+'-'+spec.id+'-rider-'+i+'.png')});stats.riderFrames.push(frame);
        }
        await page.evaluate(()=>hideRider());
      }
      if(process.env.CHICHI_SLIDE_PERFORMANCE_AUDIT && spec.id.startsWith('ride-water-')){
        const times=await page.evaluate(()=>{const r=model.userData.route,leg=r.legs.filter(l=>['ride','rafting','drop','flight','surf','float','carousel','swing'].includes(l.phase)).sort((a,b)=>b.duration-a.duration)[0];return [.08,.13,.27,.40,.52,.65,.73,.86,.94].map(u=>leg.start+leg.duration*u);});
        stats.performanceFrames=[];
        for(const [i,time]of times.entries()){
          const frame=await page.evaluate(time=>reviewRider({time}),time);assert.equal(frame.finite,true);
          await page.screenshot({path:resolve(folder,root.name+'-'+spec.id+'-performance-'+String(i).padStart(2,'0')+'.png')});stats.performanceFrames.push(frame);
        }
        await page.evaluate(()=>hideRider());
      }
      if(process.env.CHICHI_SLIDE_BANK_VIEWS && await page.evaluate(()=>reviewBanks())){
        stats.banks=true;await page.screenshot({path:resolve(folder,root.name+'-'+spec.id+'-banks.png')});
      }
      if(process.env.CHICHI_SLIDE_LANDING_AUDIT && root.name==='after' && spec.id.startsWith('ride-water-')){
        const time=await page.evaluate(()=>model.userData.route.legs.find(l=>l.phase==='exit').start-.08);stats.dismountFrame=await page.evaluate(time=>reviewRider({time}),time);assert.equal(stats.dismountFrame.finite,true);await page.screenshot({path:resolve(folder,root.name+'-'+spec.id+'-dismount-support.png')});await page.evaluate(()=>hideRider());
      }
      for (const view of ["flow", "outlet", "basin", "basin-grazing", ...(process.env.CHICHI_SLIDE_OPTICS_AUDIT?["basin-sun","cascade"]:[]), "garden"]) {
          const exists = await page.evaluate(
            ({ view, id }) => {
              const w = model.userData.slideWater;
              check.camera.up.set(0,1,0);
              if(view==='cascade')return !!reviewCascade();
              if(view==='garden'){const beds=model.userData.gardenPatches;if(!beds?.length)return false;const p=[...beds].sort((a,b)=>(b.z+.15*b.x)-(a.z+.15*a.x))[0];check.camera.position.set(p.x+8,6.5,p.z+10);check.camera.lookAt(p.x,1.2,p.z);draw(63);return true;}
              if(view.startsWith('basin')){const pool=w.pool,p=pool.localToWorld(check.camera.position.clone().set(0,.155,0)),rx=pool.userData.rx,rz=pool.userData.rz,r=Math.max(rx,rz);
                const direction=view==='basin-sun'?new check.THREE.Vector3(14,35,-20).normalize().multiplyScalar(2.5):new check.THREE.Vector3(.25,view==='basin'?1.7:.55,1.9);
                check.camera.position.copy(p).add(direction.multiplyScalar(r));check.camera.lookAt(p);draw(63);return true;}
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
      if(process.env.CHICHI_SLIDE_OPTICS_AUDIT){
        for(const mode of ['isolated','bed-only']){
          await page.evaluate(mode=>{
            const pool=model.userData.slideWater.pool,{rx,rz}=pool.userData,r=Math.max(rx,rz),p=pool.localToWorld(new check.THREE.Vector3(0,.155,0));
            window.savedOpticsVisibility=[];model.traverse(o=>{savedOpticsVisibility.push([o,o.visible]);});
            for(const c of model.children)if(c!==pool)c.visible=false;
            if(mode==='bed-only')for(const s of pool.userData.slideBasinOptics?.surfaces||[])s.visible=false;
            check.camera.up.set(0,1,0);check.camera.position.copy(p).add(new check.THREE.Vector3(.25,.55,1.9).multiplyScalar(r));check.camera.lookAt(p);draw(63);
          },mode);
          await page.screenshot({path:resolve(folder,root.name+'-'+spec.id+'-basin-'+mode+'.png')});
          await page.evaluate(()=>{for(const [o,visible]of savedOpticsVisibility)o.visible=visible;delete window.savedOpticsVisibility;});
        }
      }
      if (root.name === "after") {
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
      report.push({ version: root.name, id: spec.id, nativeFrame, ...stats });
      await writeFile(resolve(folder,"report.json"),JSON.stringify(report,null,2));
      console.log(root.name, spec.id, JSON.stringify(stats));
    }
    await page.setViewportSize({ width: 390, height: 560 });
    for (const {id} of process.env.CHICHI_SLIDE_RIDERS_ONLY||process.env.CHICHI_SLIDE_CASCADES_ONLY||process.env.CHICHI_SLIDE_SEAMS_ONLY?[]:selectedRides) {
      await page.evaluate(async ({id,framing}) => {
        const { renderer: r, camera: c } = check;
        r.setPixelRatio(2);
        r.setSize(390, 560);
        c.aspect = 390 / 560;
        c.updateProjectionMatrix();
        await loadRide(id);if(framing)viewFrame(framing);
        draw(7);
      }, {id,framing:root.name==='after'?comparisonFrames.get(id):null});
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
