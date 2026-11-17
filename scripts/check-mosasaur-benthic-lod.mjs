// Isolated native colour/shadow parity: regroup original rocks, then let their
// existing LODs select detail at the actual gardens. No production save is used.
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.CHICHI_PLAYWRIGHT_MODULE||'playwright');
const folder=resolve(process.env.CHICHI_WATER_REVIEW||'/tmp/chichi-benthic-lod');await mkdir(folder,{recursive:true});
const source=`import * as T from 'three';
import {mosaRockReefSteps} from './public/mosasaur-rock-reefs.js';
import {MOSA_BENTHIC_ROCKS} from './public/mosasaur-benthic-data.js';
import {prepareMosaReefs} from './public/mosasaur-reef-cache.js';
import {prepareMosaRockSurfaces} from './public/mosasaur-rock-surfaces.js';
import {prepareWaterField} from './public/water-field.js';
import {runSceneSteps} from './public/scene-tasks.js';
await Promise.all([prepareMosaReefs(),prepareMosaRockSurfaces(),prepareWaterField()]);
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.toneMapping=T.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.setSize(600,440);document.body.style='margin:0';document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x1286ad);scene.fog=new T.FogExp2(0x1286ad,.0045);scene.add(new T.HemisphereLight(0xffe9db,0x8b9e85,1.2));
const sun=new T.DirectionalLight(0xffd8b7,2.2);sun.position.set(-140,350,200);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-350,right:350,top:350,bottom:-350,near:1,far:850});sun.shadow.bias=-.0007;scene.add(sun);
const rim=new T.DirectionalLight(0xb8b7ec,.9);rim.position.set(20,16,-30);scene.add(rim);
const roots=[false,true].map(spatialBenthic=>runSceneSteps(mosaRockReefSteps({spatialBenthic})));scene.add(...roots);
const camera=new T.PerspectiveCamera(38,600/440,.1,1800),gl=renderer.getContext();
const floor=new T.Mesh(new T.PlaneGeometry(800,800),new T.MeshStandardMaterial({color:0x8eaaa2,roughness:.9}));floor.rotation.x=-Math.PI/2;floor.position.set(0,-190.4,164);floor.receiveShadow=true;scene.add(floor);
window.setView=name=>{const phone=name==='phone';renderer.setPixelRatio(phone?2:1);renderer.setSize(phone?390:600,phone?600:440);camera.aspect=(phone?390:600)/(phone?600:440);camera.updateProjectionMatrix();
 if(name==='surface'){camera.position.set(18,14,35);camera.lookAt(-8,.155,-12);}else if(name==='near'){const p=MOSA_BENTHIC_ROCKS[32];camera.position.set(p.x+5,p.top+3,p.z+7);camera.lookAt(p.x,p.top-1,p.z);}else{camera.position.set(25,-158,170);camera.lookAt(105,-185,176);}
};
window.drawRock=(which,level)=>{roots.forEach((r,i)=>{r.visible=which===i;r.userData.update(7,true);r.traverse(o=>{if(o.isLOD){o.autoUpdate=level===null;if(level!==null)o.levels.forEach((l,j)=>l.object.visible=j===(o.userData.benthicFarSelector?0:level));}});});renderer.render(scene,camera);renderer.render(scene,camera);};
window.parity=async(name,level)=>{setView(name);const pixels=[],rows=[];for(let i=0;i<2;i++){drawRock(i,level);await renderer.compileAsync(scene,camera);drawRock(i,level);const b=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,b);pixels.push(b);rows.push({spatialBenthic:!!i,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles});}let changed=0,maxDelta=0;for(let k=0;k<pixels[0].length;k++){const d=Math.abs(pixels[0][k]-pixels[1][k]);if(d)changed++;maxDelta=Math.max(maxDelta,d);}return{name,level,changedChannels:changed,maxDelta,rows,contextLost:gl.isContextLost()};};
window.automatic=name=>{setView(name);return [0,1].map(i=>{drawRock(i,null);const lodCounts=[0,0,0];let far=false;roots[i].traverse(lod=>{if(lod.userData.benthicFarSelector&&lod.getCurrentLevel()===1)far=true;if(lod.isLOD&&lod.userData.benthicRockIds)lodCounts[lod.getCurrentLevel()]+=lod.userData.benthicRockIds.length;});return{spatialBenthic:!!i,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,lodCounts:far?[0,0,64]:lodCounts,dpr:renderer.getPixelRatio(),contextLost:gl.isContextLost()};});};window.ready=true;`;
const out=await build({stdin:{contents:source,resolveDir:resolve('.'),loader:'js'},bundle:true,format:'esm',write:false});await writeFile(resolve(folder,'qa.mjs'),out.outputFiles[0].contents);
await writeFile(resolve(folder,'source-HEAD.patch'),execFileSync('git',['diff','HEAD','--binary']));await writeFile(resolve(folder,'source-cached.patch'),execFileSync('git',['diff','--cached','--binary']));
const assets={};const server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;if(p==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<script type="module">'+out.outputFiles[0].text+'</script>');return;}if(p==='/favicon.ico'){res.writeHead(204);res.end();return;}const file=resolve('public','.'+p);if(!file.startsWith(resolve('public')+'/'))throw Error('path');const data=await readFile(file);assets[p]={bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')};res.writeHead(200,{'Content-Type':extname(file)==='.png'?'image/png':extname(file)==='.jpg'?'image/jpeg':'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;const results=[],errors=[];
try{browser=await chromium.launch({executablePath:process.env.CHICHI_CHROMIUM,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:600,height:440}});page.setDefaultTimeout(240000);page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready);
 for(const view of ['near','forecourt','phone']){for(const level of [0,1,2]){const row=await page.evaluate(({view,level})=>parity(view,level),{view,level});results.push(row);await writeFile(resolve(folder,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(row));assert.equal(row.changedChannels,0,'same-detail native colour/shadow pixels '+view+' level'+level);assert.equal(row.contextLost,false);}
  const work=await page.evaluate(view=>automatic(view),view);results.push({view,automatic:work});console.log(view,JSON.stringify(work));assert.ok(work.every(r=>!r.contextLost));if(view!=='near')assert.ok(work[1].triangles<work[0].triangles*.75,'real spatial LOD must remove meaningful distant work');await page.setViewportSize({width:view==='phone'?390:600,height:view==='phone'?600:440});await page.screenshot({path:resolve(folder,view+'.png')});
 }const farWork=await page.evaluate(()=>automatic('surface'));results.push({view:'surface',automatic:farWork});assert.equal(farWork[0].calls,farWork[1].calls,'distant/surface view retains original submission count');assert.equal(farWork[0].triangles,farWork[1].triangles);console.log('surface',JSON.stringify(farWork));assert.deepEqual(errors,[]);await writeFile(resolve(folder,'results.json'),JSON.stringify(results,null,2));
}finally{await browser?.close();await new Promise(r=>server.close(r));await writeFile(resolve(folder,'manifest.json'),JSON.stringify({sourceSHA:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceOverlay:'source-HEAD.patch',node:process.version,bundleSHA256:createHash('sha256').update(out.outputFiles[0].contents).digest('hex'),settings:'actual native maps/geometry, PCF1024 shadows, DPR1 desktop/DPR2 phone; diagnostic work counts, not device FPS',assets,errors},null,2));}
