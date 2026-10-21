// Private graphics-only browser check: no player world, API key or inference.
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { sculptCacheVersion } from "./sculpt-cache-version.mjs";
const root=fileURLToPath(new URL("../",import.meta.url)),require=createRequire(import.meta.url);
const {chromium,webkit}=require(process.env.CHICHI_PLAYWRIGHT_MODULE||"playwright");
const review=process.env.CHICHI_REVIEW_DIR||path.join(os.tmpdir(),"chichi-sculpt-release-review");
await fs.mkdir(review,{recursive:true});
const version=await sculptCacheVersion(),variants=new Map(),crowd=Number(process.env.CHICHI_SCULPT_CROWD||0);
const baseline=execFileSync('git',['show',(process.env.CHICHI_SCULPT_BASELINE||'329d295')+':public/sculpt-cache.js'],{cwd:root,encoding:'utf8'});
const oldSculpt=execFileSync('git',['show',(process.env.CHICHI_SCULPT_BASELINE||'329d295')+':public/chichi-sculpt.js'],{cwd:root,encoding:'utf8'});
for(const mode of ['control','stable','changed']){
 const source=`import * as T from './public/../node_modules/three/build/three.module.js';
 import {createCat,disposeCat} from './public/cat-model.js';
 import {catAppearance,ADOPTION_CATS} from './public/cat-breeds.js';
 import {restoreSculptCache,storeSculptCache} from './public/sculpt-cache.js';
 import {kittenCacheSnapshot} from './public/chichi-sculpt.js';
 const started=performance.now(),restored=await restoreSculptCache(),restoreMs=performance.now()-started;
 const options=[null,...['adopt-nimbus','adopt-cloudberry','adopt-dumpling',ADOPTION_CATS.find(c=>c.breed==='sphynx').id].map(id=>({...catAppearance(ADOPTION_CATS.find(c=>c.id===id)),detail:'npc'}))];
 const t=performance.now(),models=options.map(o=>createCat('happy',o||{})),constructMs=performance.now()-t;
 const parts=[];let geometryBytes=0,triangles=0;
 for(const model of models)model.traverse(o=>{if(!o.isMesh)return;const g=o.geometry;for(const a of [g.index,...Object.values(g.attributes)])if(a){const bytes=new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength);parts.push(bytes);geometryBytes+=bytes.byteLength;}triangles+=(g.index?.count||g.attributes.position.count)/3;});
 const bytes=new Uint8Array(geometryBytes);let at=0;for(const p of parts){bytes.set(p,at);at+=p.byteLength;}
 const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
 const geometryDigest=await digest(bytes),crowdStart=performance.now();
 for(const profile of ADOPTION_CATS.slice(0,${crowd})){const c=createCat('happy',{...catAppearance(profile),detail:'npc'});disposeCat(c);}
 const crowdMs=performance.now()-crowdStart,stored=await storeSculptCache(),snapshot=kittenCacheSnapshot();
 const record=await new Promise((resolve,reject)=>{const request=indexedDB.open('chichi-graphics',1);request.onsuccess=()=>{const db=request.result,get=db.transaction('sculpt').objectStore('sculpt').get('active');get.onsuccess=()=>{db.close();resolve(get.result);};get.onerror=()=>reject(Error('Private cache read failed'));};});
 const storedCounts={surfaces:record.snapshot.surfaces.length,fur:record.snapshot.fur.length};
 const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(2);renderer.setSize(390,500);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.setClearColor(0xb5bfdc);document.body.append(renderer.domElement);
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xfff6e9,0x8796a4,2.2));const sun=new T.DirectionalLight(0xfff4de,2.8);sun.position.set(-6,12,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-7;sun.shadow.camera.right=7;sun.shadow.camera.top=7;sun.shadow.camera.bottom=-7;scene.add(sun);
 const floor=new T.Mesh(new T.PlaneGeometry(24,24),new T.MeshStandardMaterial({color:0xdfd7e5}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
 models.forEach((m,i)=>{m.position.set((i-2)*1.8,0,0);scene.add(m);});const camera=new T.PerspectiveCamera(40,390/500,.5,100);camera.position.set(1.5,6,16);camera.lookAt(0,.8,0);renderer.render(scene,camera);const gl=renderer.getContext(),pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
 window.__sculptReview={restored,restoreMs,constructMs,crowdMs,storedCounts,geometryBytes,triangles,geometryDigest,pixelDigest:await digest(pixels),stored,surfaces:snapshot.surfaces.length,fur:snapshot.fur.length,dpr:renderer.getPixelRatio(),error:gl.getError(),contextLost:gl.isContextLost(),dispose:()=>{for(const m of models)disposeCat(m);renderer.dispose();}};
 window.__sculptReady=true;`;
 const output=await build({stdin:{contents:source,resolveDir:root,sourcefile:'private-sculpt-release.js'},bundle:true,format:'esm',target:'es2022',write:false,
 define:mode==='control'?{}:{__CHICHI_SCULPT_VERSION__:JSON.stringify(version+(mode==='changed'?'-changed':''))},
 plugins:mode==='control'?[{name:'old-cache',setup(b){b.onLoad({filter:/\/public\/sculpt-cache\.js$/},()=>({loader:'js',contents:baseline}));b.onLoad({filter:/\/public\/chichi-sculpt\.js$/},()=>({loader:'js',contents:oldSculpt}));}}]:[]});
 variants.set(mode,output.outputFiles[0].text);
}
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname.endsWith('.js')){res.setHeader('Content-Type','text/javascript');res.end(variants.get(url.pathname.split('/')[1].replace(/\.js$/, '')));}else{res.setHeader('Content-Type','text/html');res.end('<!doctype html><style>body{margin:0}canvas{display:block}</style><script type="module" src="'+url.pathname+'.js'+url.search+'"></script>');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const rows=[];let browser;
try{
 const engine=process.env.CHICHI_BROWSER==='webkit'?webkit:chromium;
 browser=await engine.launch(process.env.CHICHI_BROWSER==='webkit'?{env:{...process.env,LIBGL_ALWAYS_SOFTWARE:'1'}}:{executablePath:process.env.CHICHI_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const mode of ['control','stable']){
  const context=await browser.newContext({viewport:{width:390,height:500},deviceScaleFactor:2}),errors=[];
  for(const release of ['first','ui-update','warm-return']){
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{assert.ok(!r.url().includes('/api/'),'graphics cache must never call AI or player APIs');});
   await page.addInitScript(()=>{for(const key of ['chichi-world-v2','chichi-cloud-pending','chichi-cloud-save'])if(!localStorage.getItem(key))localStorage.setItem(key,'untouched private sentinel');});
   await page.goto(base+'/'+mode+'?v='+(release==='first'?'old-app':'new-app'));
   await page.waitForFunction(()=>window.__sculptReady,null,{timeout:120000});
   const row=await page.evaluate(()=>{const {dispose,...r}=window.__sculptReview;for(const key of ['chichi-world-v2','chichi-cloud-pending','chichi-cloud-save'])if(localStorage.getItem(key)!=='untouched private sentinel')throw Error('Save touched');return r;});
   rows.push({mode,release,...row});console.log('SCULPT_RELEASE',JSON.stringify(rows.at(-1)));await fs.writeFile(path.join(review,'releases.json'),JSON.stringify({engine:process.env.CHICHI_BROWSER||'chromium',version,rows},null,2));
   assert.equal(row.restored,release==='warm-return'&&!crowd||mode==='stable'&&release!=='first');assert.equal(row.stored,true);assert.equal(row.error,0);assert.equal(row.contextLost,false);assert.equal(row.dpr,2);
   assert.equal(row.geometryDigest,rows[0].geometryDigest);assert.equal(row.pixelDigest,rows[0].pixelDigest);
   if(release==='ui-update')await page.screenshot({path:path.join(review,mode+'-approved-models.png')});
   await page.evaluate(()=>window.__sculptReview.dispose());await page.close();
  }
  // A true model-version change must reject even a valid old graphics record.
  if(mode==='stable'){
   const page=await context.newPage();await page.goto(base+'/changed?v=model-update');await page.waitForFunction(()=>window.__sculptReady,null,{timeout:120000});const r=await page.evaluate(()=>{const {dispose,...r}=__sculptReview;return r;});
   assert.equal(r.restored,false);assert.equal(r.geometryDigest,rows[0].geometryDigest);assert.equal(r.pixelDigest,rows[0].pixelDigest);rows.push({mode:'changed',release:'model-update',...r});
   await page.evaluate(()=>window.__sculptReview.dispose());await page.close();
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 await fs.writeFile(path.join(review,'releases.json'),JSON.stringify({engine:process.env.CHICHI_BROWSER||'chromium',version,rows},null,2));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
