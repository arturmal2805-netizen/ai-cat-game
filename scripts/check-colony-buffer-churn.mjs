// Native WebKit regression: camera visibility crosses the shared-draw threshold.
// Reuse the real models/renderer and compare exact pixels; never a player save.
import {build} from "esbuild";
import {createServer} from "node:http";
import fs from "node:fs/promises";
import {createRequire} from "node:module";
import assert from "node:assert/strict";
const {webkit}=createRequire(import.meta.url)(process.env.CHICHI_PLAYWRIGHT_MODULE||"playwright");
const dir=process.env.CHICHI_REVIEW_DIR||"/tmp/chichi-colony-churn";await fs.mkdir(dir,{recursive:true});
const source=`
import * as T from 'three';
import {createCat,animateCat} from './public/cat-model.js';
import {enableCatRenderBatch} from './public/cat-render-batch.js';
import {createCatPoseAtlas} from './public/cat-pose-atlas.js';
import {createColonyRenderBatch} from './public/colony-render-batch.js';
import {createGeometryResidency} from './public/geometry-residency.js';
import {createGpuFrameQueue} from './public/gpu-frame-queue.js';
const r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setPixelRatio(2);r.setSize(600,450);r.shadowMap.enabled=true;r.shadowMap.type=T.PCFShadowMap;document.body.style='margin:0';document.body.append(r.domElement);
const s=new T.Scene();s.background=new T.Color(0xb5bfdc);s.add(new T.HemisphereLight(0xffe9db,0x8b9e85,1.2));const sun=new T.DirectionalLight(0xffd8b7,2.2);sun.position.set(-5,12,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);s.add(sun);s.add(sun.target);
const ground=new T.Mesh(new T.PlaneGeometry(30,30),new T.MeshStandardMaterial({color:0xaabb88}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;s.add(ground);
const c=new T.PerspectiveCamera(40,600/450,.1,100);c.position.set(0,9,16);c.lookAt(0,.7,0);
const a=createCatPoseAtlas(s,sun,{minimumCats:7}),b=createColonyRenderBatch(s,r,c,a,{minimumCats:8}),residency=createGeometryResidency(r,{budget:${process.env.CHICHI_CHURN_PRESSURE ? 0 : 192*1024*1024}});
// Reproduce the released eager deletion in QA only; production delegates this
// entirely to the residency controller. Same source geometry and draw modes.
let retain=false;const before=s.onBeforeRender;s.onBeforeRender=function(...args){before.apply(this,args);if(!retain&&b.stats.active)a.forEachCat(cat=>{if(a.relevant(cat))for(const m of cat.userData.renderBatches.batches)if(m.layers.isEnabled(29)&&m.visible)m.userData.releaseDrawBuffers?.();});};
const cats=[],release=new Map();for(let i=0;i<8;i++){const cat=createCat('happy',{detail:'npc',breed:'british',color:0xa9adb7,build:'plush'});cat.scale.setScalar(.63);cat.position.set((i%4-1.5)*2.3,.16,Math.floor(i/4)*3-1.5);s.add(cat);enableCatRenderBatch(cat,a);cats.push(cat);for(const m of cat.userData.renderBatches.batches)release.set(m,m.userData.releaseDrawBuffers);}
const gl=r.getContext(),queue=createGpuFrameQueue(gl),upload=gl.bufferData.bind(gl);let uploads=0,bytes=0;
gl.bufferData=(...args)=>{uploads++;bytes+=typeof args[1]==='number'?args[1]:args[1]?.byteLength||0;return upload(...args);};
function draw(count=8,t=3){cats.forEach((cat,i)=>{cat.visible=i<count;animateCat(cat,t,false,false);});r.render(s,c);residency.sweep();}
window.ready=(async()=>{draw();b.sync();while(!b.stats.ready)await new Promise(requestAnimationFrame);for(let i=0;i<4;i++){draw(6);draw(8);}window.q={r,s,c,a,b,cats,residency,release,draw,gl,queue,reset:()=>{uploads=bytes=0;},counts:()=>({uploads,bytes}),retain:value=>{retain=value;}};return true;})();
`;
const bundle=await build({stdin:{contents:source,resolveDir:process.cwd()},bundle:true,format:"esm",write:false});
const server=createServer((req,res)=>{res.setHeader("Content-Type","text/html");res.end('<script type="module">'+bundle.outputFiles[0].text+'</script>');});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const browser=await webkit.launch({env:{...process.env,LIBGL_ALWAYS_SOFTWARE:"1"}});
try{
 const page=await browser.newPage({viewport:{width:600,height:450},deviceScaleFactor:2});page.setDefaultTimeout(240000);const errors=[];page.on("pageerror",e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>!!window.q);
 const rows=[];for(const retain of [false,true,true,false]){
  const row=await page.evaluate(retain=>{const q=window.q;q.retain(retain);q.draw(6);q.draw(8);q.reset();const start=performance.now();for(let i=0;i<6;i++){q.draw(6);q.draw(8);}return{retain,ms:performance.now()-start,...q.counts(),draw:{...q.r.info.render},memory:{...q.r.info.memory},residency:{...q.residency.stats},dpr:q.r.getPixelRatio()};},retain);rows.push(row);console.log("COLONY_CHURN",JSON.stringify(row));
 }
 const pixels=await page.evaluate(()=>{const q=window.q,gl=q.gl,before=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4),after=new Uint8Array(before.length);q.retain(false);q.draw(6);q.draw(8);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,before);q.retain(true);q.draw(6);q.draw(8);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,after);let changed=0;for(let i=0;i<before.length;i++)if(before[i]!==after[i])changed++;return{changed,error:gl.getError(),contextLost:gl.isContextLost()};});
 const native=[];
 if(process.env.CHICHI_CHURN_NATIVE)for(const retain of [false,true,true,false]){
   const row=await page.evaluate(({retain,ms})=>new Promise(resolve=>{
     const q=window.q;q.retain(retain);q.queue.clear();q.reset();
     const start=performance.now(),frames=[];let previousMode=-1;
     const loop=now=>{
       if(now-start>=ms){q.queue.ready();const gaps=frames.slice(1).map((f,i)=>f[0]-frames[i][0]).sort((a,b)=>a-b);resolve({retain,elapsed:now-start,frames:frames.length,completed:frames.length-q.queue.pending,...q.counts(),gapMedian:gaps[Math.floor(gaps.length*.5)],gapP95:gaps[Math.floor(gaps.length*.95)],gapMax:gaps.at(-1),renderMax:Math.max(0,...frames.map(f=>f[1]))});return;}
       if(q.queue.ready()){
         const at=performance.now(),t=(at-start)/1000,mode=Math.floor(t*2)%2;
         q.c.position.set(Math.sin(t*.1)*16,9,Math.cos(t*.1)*16);q.c.lookAt(0,.7,0);
         q.draw(mode?6:8,t);q.queue.submitted();frames.push([at,performance.now()-at]);previousMode=mode;
       }
       requestAnimationFrame(loop);
     };requestAnimationFrame(loop);
   }),{retain,ms:Number(process.env.CHICHI_NATIVE_SAMPLE_MS||16000)});
   native.push(row);console.log("COLONY_NATIVE",JSON.stringify(row));
 }
 const returned=await page.evaluate(()=>{
   const q=window.q,gl=q.gl;q.retain(true);q.draw(8);const registration={...q.a.stats},pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4),after=new Uint8Array(pixels.length);
   gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   const evicted=q.residency.stats.evicted,now=performance.now()+11000;
   for(let i=0;i<10;i++)q.residency.sweep(now+i*1001);
   const released=q.residency.stats.evicted-evicted;
   q.draw(8);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,after);
   let changed=0;for(let i=0;i<pixels.length;i++)if(pixels[i]!==after[i])changed++;
   return{released,changed,catsBefore:registration.cats,catsAfter:q.a.stats.cats,jointsBefore:registration.entries,jointsAfter:q.a.stats.entries,error:gl.getError()};
 });
 await fs.writeFile(dir+'/result.json',JSON.stringify({rows,pixels,native,returned,errors},null,2));assert.deepEqual(errors,[]);assert.equal(pixels.changed,0);assert.equal(pixels.error,0);assert.equal(pixels.contextLost,false);
 assert.equal(returned.changed,0);assert.equal(returned.catsBefore,returned.catsAfter);assert.equal(returned.jointsBefore,returned.jointsAfter);assert.equal(returned.error,0);
 if(process.env.CHICHI_CHURN_PRESSURE)assert.ok(returned.released>0,"long-idle buffers still retire under pressure");
 assert.ok(rows.filter(r=>r.retain).every(r=>r.uploads===0),"unchanged fallback buffers must survive visibility switches");
 assert.ok(rows.filter(r=>!r.retain).every(r=>r.uploads>0),"the test must reproduce the old deletion/upload cycle");
}finally{await browser.close();await new Promise(r=>server.close(r));}
