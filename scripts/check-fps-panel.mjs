// Isolated real WebGL/RAF check; never opens a player save or calls an AI API.
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.CHICHI_PLAYWRIGHT_MODULE||'playwright');
const bundle=await build({stdin:{contents:`
 import * as T from 'three';import {createFrameProfile} from './public/frame-profile.js';
 const r=new T.WebGLRenderer();r.setSize(200,160);document.body.append(r.domElement);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,1.25,.1,20);
 camera.position.z=4;scene.add(new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial({color:0xf0b7dd})));
 const p=createFrameProfile(r);window.fixture={p,frames:0,copied:null};
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{fixture.copied=JSON.parse(text);}}});
 function frame(at){p.raf(at);p.beginFrame();p.beginRender();r.render(scene,camera);p.endRender();
 fixture.frames++;p.frame({at,cpu:1,render:1,biome:'fixture',calls:r.info.render.calls,dpr:1,targetFps:60});requestAnimationFrame(frame);}requestAnimationFrame(frame);
 `,resolveDir:process.cwd(),loader:'js'},bundle:true,format:'esm',write:false});
const server=createServer((req,res)=>{res.writeHead(200,{'content-type':req.url?.startsWith('/app')?'text/javascript':'text/html'});res.end(req.url?.startsWith('/app')?bundle.outputFiles[0].contents:'<script type="module" src="/app"></script>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHICHI_CHROMIUM,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/?profile=1&pauseAfter=5`);
 await page.waitForFunction(()=>window.fixture?.frames>10);
 assert.equal(await page.locator('#frame-profile button').count(),1);
 assert.equal(await page.locator('[data-profile-pause]').count(),0);
 const before=await page.evaluate(()=>fixture.frames);
 // Intentionally exceed the five-second deadline from an old diagnostic URL.
 await page.waitForTimeout(6200);
 assert.ok(await page.evaluate(n=>fixture.frames>n+40&&!fixture.p.suspended,before));
 await page.locator('[data-profile-copy]').click();
 const report=await page.evaluate(()=>fixture.copied);assert.equal(report.suspended,false);assert.equal(report.automaticPauseSeconds,0);assert.ok(report.samples>40);
 await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw Error('Clipboard unavailable');};});
 await page.locator('[data-profile-copy]').click();
 assert.equal(await page.locator('#frame-profile textarea').isVisible(),true);
 const fallback=JSON.parse(await page.locator('#frame-profile textarea').inputValue());assert.equal(fallback.suspended,false);
 await page.evaluate(()=>fixture.p.dispose());assert.equal(await page.locator('#frame-profile').count(),0);
 assert.deepEqual(errors,[]);
 const folder=process.env.CHICHI_FPS_PANEL_REVIEW||'/tmp/chichi-fps-copy-only';await mkdir(folder,{recursive:true});
 await writeFile(folder+'/browser.json',JSON.stringify({oneCopyButton:true,noPauseButton:true,legacyPauseDeadlineIgnored:true,framesContinue:true,clipboard:true,clipboardFallback:true,dispose:true,errors,report},null,2)+'\n');
 console.log('Copy-only FPS panel: continuous WebGL/RAF past legacy deadline; clipboard, fallback and disposal passed.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
