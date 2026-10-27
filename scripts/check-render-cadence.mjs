// Isolated cadence regression: actual RAF + complete fixed WebGL frames and
// the normal nonblocking GPU queue. The clock-stress cases add +/-1.5 ms to
// RAF timestamps; this is not a whole-game or physical M2 FPS benchmark.
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.CHICHI_PLAYWRIGHT_MODULE||'playwright');
const review=process.env.CHICHI_REVIEW_DIR||'/tmp/chichi-render-cadence';await mkdir(review,{recursive:true});
const legacy=execFileSync('git',['show','fdcae79:public/render-pacer.js'],{encoding:'utf8'})
 .replace('export function createRenderPacer','function legacyRenderPacer');
const source=`import * as T from 'three';import{createRenderPacer}from'./public/render-pacer.js';import{createGpuFrameQueue}from'./public/gpu-frame-queue.js';
${legacy}
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(2);renderer.setSize(64,64);document.body.append(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(45,1,.1,20);camera.position.z=4;
scene.add(new T.Mesh(new T.BoxGeometry(),new T.MeshNormalMaterial()));const gl=renderer.getContext(),queue=createGpuFrameQueue(gl),pixels=new Uint8Array(128*128*4),reference=new Uint8Array(pixels.length);
renderer.render(scene,camera);gl.readPixels(0,0,128,128,gl.RGBA,gl.UNSIGNED_BYTE,reference);
window.run=async()=>{
 const rows=[];
 for(const mode of ['legacy-idle','current-idle','legacy-jitter','current-jitter']){
  const old=mode.startsWith('legacy'),jitter=mode.endsWith('jitter'),due=(old?legacyRenderPacer:createRenderPacer)(),target=mode==='legacy-idle'?30:60;
  queue.clear();let start=0,callbacks=0,frames=0,blocked=0,firstClock=0,lastClock=0,maxPending=0;
  const elapsed=await new Promise(resolve=>{
   const step=now=>{
    if(!start)start=now;callbacks++;
    const at=now+(jitter?(callbacks%2?1.5:-1.5):0);
    if(!queue.ready())blocked++;
    else if(due(at,1000/target)){
     renderer.render(scene,camera);queue.submitted();frames++;if(!firstClock)firstClock=now;lastClock=now;maxPending=Math.max(maxPending,queue.pending);
    }
    if(now-start>=3000)resolve(now-start);else requestAnimationFrame(step);
   };requestAnimationFrame(step);
  });
  gl.readPixels(0,0,128,128,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let changed=0;for(let i=0;i<pixels.length;i++)if(pixels[i]!==reference[i])changed++;
  rows.push({mode,clockStressMs:jitter?1.5:0,target,callbacks,frames,blocked,maxPending,elapsed,submittedFps:(frames-1)*1000/(lastClock-firstClock),changed,draw:{...renderer.info.render}});
 }
 queue.clear();return {rows,dpr:renderer.getPixelRatio(),error:gl.getError(),contextLost:gl.isContextLost(),gpu:gl.getParameter(gl.RENDERER)};
};window.ready=true;`;
const output=await build({stdin:{contents:source,resolveDir:process.cwd(),loader:'js'},bundle:true,write:false,format:'esm'});
const server=createServer((_,res)=>{res.setHeader('Content-Type','text/html');res.end('<script type="module">'+output.outputFiles[0].text+'</script>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHICHI_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready);
 const result=await page.evaluate(()=>run());assert.deepEqual(errors,[]);assert.equal(result.error,0);assert.equal(result.contextLost,false);assert.equal(result.dpr,2);
 assert.ok(result.rows.every(r=>r.changed===0&&r.maxPending<=2&&r.frames>0));
 assert.ok(result.rows.every(r=>r.draw.calls===result.rows[0].draw.calls&&r.draw.triangles===result.rows[0].draw.triangles));
 await writeFile(review+'/render-cadence.json',JSON.stringify({...result,errors},null,2));console.log(JSON.stringify(result));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
