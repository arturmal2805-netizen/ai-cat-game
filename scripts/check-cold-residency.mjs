// Actual WebGL resource comparison against the released policy. This isolated
// 64px fixture measures uploads and exact pixels, never physical-device FPS.
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.CHICHI_PLAYWRIGHT_MODULE||'playwright');
const review=process.env.CHICHI_REVIEW_DIR||'/tmp/chichi-cold-residency';await mkdir(review,{recursive:true});
const old=execFileSync('git',['show','edd3edf:public/geometry-residency.js'],{encoding:'utf8'})
 .replace(/export /g,'').replace('function createGeometryResidency(','function legacyResidency(');
const source=`import * as T from 'three';import{createGeometryResidency as currentResidency}from'./public/geometry-residency.js';
${old}
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(64,64);document.body.append(renderer.domElement);
window.run=()=>{
 const gl=renderer.getContext(),native=gl.bufferData,rows=[],pixels=new Uint8Array(64*64*4),reference=new Uint8Array(pixels.length);
 let bytes=0,calls=0;gl.bufferData=function(...args){calls++;bytes+=typeof args[1]==='number'?args[1]:args[1].byteLength;return native.apply(this,args);};
 try{
  for(const legacy of [true,false]){
   const result={legacy,returnBytes:0,returnCalls:0,changed:0,rows:[]};
   for(let repeat=0;repeat<10;repeat++){
    const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,1,.1,30);camera.position.set(0,0,6);camera.lookAt(0,0,0);
    const meshes=Array.from({length:5},()=>new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial({color:0xe4b3dc}))),
     g=meshes[0].geometry,size=[g.index,...Object.values(g.attributes)].reduce((n,a)=>n+a.array.byteLength,0);
    scene.add(...meshes);let time=0;
    const cache=(legacy?legacyResidency:currentResidency)(renderer,{budget:size*3,refaultBudget:size,clock:()=>time});
    const render=(visible,at)=>{time=at;meshes.forEach((m,i)=>m.visible=visible.includes(i));renderer.render(scene,camera);};
    render([0,1,2,3],0);render([1,2,3],40);render([1,2,3],80);render([1,2,3],200);cache.sweep(time);
    render([0],240);gl.readPixels(0,0,64,64,gl.RGBA,gl.UNSIGNED_BYTE,reference);
    render([1,2,3,4],280);render([],320);render([],360);render([],400);cache.sweep(time);
    const afterPressure=cache.stats.bytes;bytes=calls=0;render([0],440);
    const returnBytes=bytes,returnCalls=calls;gl.readPixels(0,0,64,64,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    let changed=0;for(let i=0;i<pixels.length;i++)if(pixels[i]!==reference[i])changed++;
    result.returnBytes+=returnBytes;result.returnCalls+=returnCalls;result.changed+=changed;
    result.rows.push({returnBytes,returnCalls,changed,afterPressure,budget:size*3,stats:{...cache.stats}});
    cache.dispose();for(const mesh of meshes){mesh.geometry.dispose();mesh.material.dispose();}
   }
   rows.push(result);
  }
  return {rows,error:gl.getError(),contextLost:gl.isContextLost()};
 }finally{gl.bufferData=native;renderer.dispose();}
};window.ready=true;`;
const output=await build({stdin:{contents:source,resolveDir:process.cwd(),loader:'js'},bundle:true,write:false,format:'esm'});
const server=createServer((_,res)=>{res.setHeader('Content-Type','text/html');res.end('<script type="module">'+output.outputFiles[0].text+'</script>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHICHI_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready);
 const result=await page.evaluate(()=>run());assert.deepEqual(errors,[]);assert.equal(result.error,0);assert.equal(result.contextLost,false);
 const [before,after]=result.rows;assert.ok(before.returnBytes>0);assert.equal(after.returnBytes,0);assert.equal(before.changed,0);assert.equal(after.changed,0);
 assert.ok(after.rows.every(r=>r.afterPressure<=r.budget));
 await writeFile(review+'/cold-residency.json',JSON.stringify({...result,errors},null,2));console.log(JSON.stringify(result));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
